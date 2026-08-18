import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { TextDecoder } from "node:util";

import { canonicalize, deepFreeze } from "../canonical-json.mjs";
import {
  materialAdmissionPolicy,
  materialStableRefForPath,
  materialVersionIdForSource,
} from "./material-admission.mjs";
import { parseMaterialStableRef, materialIdentityForRecord } from "./material-identity.mjs";
import { MATERIAL_REGISTRY_PATH } from "./material-registry.mjs";

export const MATERIAL_QUERY_MAX_BYTES = 4096;
export const MATERIAL_GET_MAX_BYTES = 64 * 1024;
export const MATERIAL_SEARCH_WEIGHTS = deepFreeze({ title: 16, path: 8, body: 1 });
const utf8Fatal = new TextDecoder("utf-8", { fatal: true });
const RECORD_KEYS = ["byte_length", "domain", "lifecycle", "media_type", "record_kind", "repository_path", "schema_version", "source_sha256", "stable_ref", "version_id"];
const MANIFEST_KEYS = ["admission_policy_ref", "admission_policy_version_id", "materials", "record_kind", "schema_version", "stable_ref", "version_id"];
const MANIFEST_REF = "sg:manifest/material-admission-v2";
const HASH = /^[a-f0-9]{64}$/;
const QUERY_SNAPSHOTS = new WeakMap();
const SNAPSHOT_DRIFT_CODES = new Set([
  "material_byte_length_mismatch", "material_git_mode_invalid", "material_inventory_failed",
  "material_path_escape", "material_path_not_regular", "material_path_symlink", "material_path_unavailable",
  "material_path_untracked", "material_read_failed", "material_read_invalid", "material_source_hash_mismatch",
  "material_source_race", "material_source_utf8_invalid",
]);

export class MaterialQueryError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = "MaterialQueryError";
    this.code = code;
  }
}

function fail(code, message) { throw new MaterialQueryError(code, message); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function compare(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function realpath(fileSystem, target) {
  const implementation = fileSystem.realpathSync.native ?? fileSystem.realpathSync;
  return implementation.call(fileSystem.realpathSync, target);
}
function assertObject(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("material_input_invalid", "input must be an object");
}
function assertOnly(input, allowed) {
  if (Object.keys(input).some((key) => !allowed.has(key))) fail("material_input_unknown", "input contains an unsupported field");
}
function hasUnpairedSurrogate(value) {
  return /(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF])/.test(value);
}

/**
 * Validate scalar Unicode, NFKC-normalize, apply ECMAScript's
 * locale-independent Unicode lowercase mapping, and return maximal words that
 * begin with Letter/Number and retain subsequent Letter/Number/Mark code
 * points. Standalone marks delimit and are ignored.
 */
export function tokenizeMaterialText(value, { query = false } = {}) {
  if (typeof value !== "string" || hasUnpairedSurrogate(value)) {
    if (query) fail("material_query_invalid", "query must be a valid Unicode string");
    return [];
  }
  return value.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu) ?? [];
}

function validateQueryInput(input) {
  assertObject(input);
  assertOnly(input, new Set(["query", "limit", "paths_only"]));
  if (typeof input.query !== "string" || hasUnpairedSurrogate(input.query)) fail("material_query_invalid", "query must be a valid Unicode string");
  const queryBytes = Buffer.byteLength(input.query, "utf8");
  if (queryBytes > MATERIAL_QUERY_MAX_BYTES) fail("material_query_oversized", "query exceeds 4096 UTF-8 bytes");
  const tokens = tokenizeMaterialText(input.query, { query: true });
  if (queryBytes === 0 || tokens.length === 0) fail("material_query_empty", "query must contain an alphanumeric token");
  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) fail("material_search_limit_invalid", "limit must be an integer from 1 to 100");
  if (input.paths_only !== undefined && typeof input.paths_only !== "boolean") fail("material_paths_only_invalid", "paths_only must be a boolean");
  return { query: input.query, limit, pathsOnly: input.paths_only === true, tokens, scoringTokens: [...new Set(tokens)] };
}

function inspectRoot(repositoryRoot, fileSystem) {
  if (typeof repositoryRoot !== "string" || repositoryRoot.length === 0) fail("material_repository_invalid", "repository root is required");
  const resolvedRoot = path.resolve(repositoryRoot);
  let stats;
  try { stats = fileSystem.lstatSync(resolvedRoot); } catch { fail("material_repository_invalid", "repository root is unavailable"); }
  if (!stats.isDirectory() || stats.isSymbolicLink()) fail("material_repository_invalid", "repository root must be a non-symlink directory");
  return { resolvedRoot, canonicalRoot: realpath(fileSystem, resolvedRoot) };
}

function inspectBoundPath(root, repositoryPath, fileSystem, unavailableCode = "material_path_unavailable") {
  let target = root.resolvedRoot;
  let stats;
  try {
    for (const component of repositoryPath.split("/")) {
      target = path.join(target, component);
      stats = fileSystem.lstatSync(target);
      if (stats.isSymbolicLink()) fail("material_path_symlink", "manifest-bound path components must not be symlinks");
    }
  } catch (error) {
    if (error instanceof MaterialQueryError) throw error;
    fail(unavailableCode, "manifest-bound file is unavailable");
  }
  if (!stats.isFile()) fail("material_path_not_regular", "manifest-bound path must be a regular file");
  const canonicalTarget = realpath(fileSystem, target);
  const expected = path.resolve(root.canonicalRoot, ...repositoryPath.split("/"));
  if (canonicalTarget !== expected || !canonicalTarget.startsWith(`${root.canonicalRoot}${path.sep}`)) fail("material_path_escape", "manifest-bound path escapes repository containment");
  return { target, canonicalTarget, dev: stats.dev, ino: stats.ino };
}

function identityUnchanged(inspection, fileSystem) {
  try {
    const stats = fileSystem.lstatSync(inspection.target);
    return stats.isFile() && !stats.isSymbolicLink() && stats.dev === inspection.dev && stats.ino === inspection.ino
      && realpath(fileSystem, inspection.target) === inspection.canonicalTarget;
  } catch { return false; }
}

function descriptorUnchanged(descriptor, inspection, fileSystem) {
  try {
    const stats = fileSystem.fstatSync(descriptor);
    return stats.isFile() && stats.dev === inspection.dev && stats.ino === inspection.ino && identityUnchanged(inspection, fileSystem);
  } catch { return false; }
}

function readInspected(inspection, fileSystem, sourceReader, raceCode) {
  let descriptor;
  try {
    descriptor = fileSystem.openSync(inspection.target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    if (!descriptorUnchanged(descriptor, inspection, fileSystem)) fail(raceCode, "manifest-bound file identity changed during read");
    const bytes = sourceReader ? sourceReader(descriptor) : fileSystem.readFileSync(descriptor);
    if (!(bytes instanceof Uint8Array)) fail("material_read_invalid", "source reader did not return bytes");
    if (!descriptorUnchanged(descriptor, inspection, fileSystem)) fail(raceCode, "manifest-bound file identity changed during read");
    return Buffer.from(bytes);
  } catch (error) {
    if (error instanceof MaterialQueryError) throw error;
    if (error?.code === "ELOOP" || error?.code === "ENOENT") fail(raceCode, "manifest-bound file identity changed during read");
    fail("material_read_failed", "manifest-bound file could not be read");
  } finally { if (descriptor !== undefined) fileSystem.closeSync(descriptor); }
}

function canonicalVersionId(stableRef, value) {
  const payload = { ...value };
  delete payload.version_id;
  return `${stableRef}@sha256:${sha256(Buffer.from(canonicalize(payload), "utf8"))}`;
}

function validateMetadata(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)
    || canonicalize(Object.keys(manifest).sort()) !== canonicalize(MANIFEST_KEYS)
    || manifest.schema_version !== "2.0" || manifest.record_kind !== "material_manifest" || manifest.stable_ref !== MANIFEST_REF
    || manifest.admission_policy_ref !== materialAdmissionPolicy.stable_ref
    || manifest.admission_policy_version_id !== materialAdmissionPolicy.version_id
    || !Array.isArray(manifest.materials)) fail("material_manifest_invalid", "material manifest metadata is invalid");
  if (manifest.version_id !== canonicalVersionId(MANIFEST_REF, manifest)) fail("material_manifest_version_invalid", "material manifest identity is invalid");
  const policyRoutes = new Map(materialAdmissionPolicy.allowed_materials.map((route) => [route.repository_path, route]));
  if (manifest.materials.length !== policyRoutes.size) fail("material_manifest_cardinality_invalid", "material manifest member set is invalid");
  const refs = new Set();
  const paths = new Set();
  let previous = "";
  for (const record of manifest.materials) {
    if (!record || typeof record !== "object" || Array.isArray(record)
      || canonicalize(Object.keys(record).sort()) !== canonicalize(RECORD_KEYS)
      || record.schema_version !== "2.0" || record.record_kind !== "material" || record.media_type !== "text/markdown"
      || !HASH.test(record.source_sha256 ?? "") || !Number.isSafeInteger(record.byte_length) || record.byte_length < 0) {
      fail("material_record_invalid", "material manifest member metadata is invalid");
    }
    const route = policyRoutes.get(record.repository_path);
    if (!route || record.domain !== route.domain || record.lifecycle !== route.lifecycle
      || record.stable_ref !== materialStableRefForPath(record.repository_path)
      || record.version_id !== materialVersionIdForSource(record.stable_ref, record.source_sha256)) {
      fail("material_record_binding_invalid", "material manifest member binding is invalid");
    }
    if (previous && compare(previous, record.stable_ref) >= 0) fail("material_manifest_order_invalid", "material manifest member order is invalid");
    if (refs.has(record.stable_ref) || paths.has(record.repository_path)) fail("material_manifest_duplicate", "material manifest members must be unique");
    previous = record.stable_ref;
    refs.add(record.stable_ref);
    paths.add(record.repository_path);
  }
  if ([...policyRoutes.keys()].some((entry) => !paths.has(entry))) fail("material_manifest_path_set_invalid", "material manifest member set is invalid");
  return manifest;
}

function loadMetadata(repositoryRoot, fileSystem = fs) {
  const root = inspectRoot(repositoryRoot, fileSystem);
  const inspection = inspectBoundPath(root, MATERIAL_REGISTRY_PATH, fileSystem, "material_registry_file_invalid");
  const bytes = readInspected(inspection, fileSystem, undefined, "material_registry_race");
  let manifest;
  try { manifest = JSON.parse(bytes.toString("utf8")); } catch { fail("material_registry_json_invalid", "material registry JSON is invalid"); }
  if (canonicalize(manifest) !== bytes.toString("utf8")) fail("material_registry_canonical_invalid", "material registry is not canonical JSON");
  return { root, manifest: deepFreeze(validateMetadata(manifest)), manifestBytes: bytes };
}

function trackedInventory(repositoryRoot, gitRunner = spawnSync, repositoryPath) {
  const args = ["-C", repositoryRoot, "ls-files", "-s", "-z", "--", ...(repositoryPath ? [repositoryPath] : [])];
  const result = gitRunner("git", args, { encoding: "buffer", timeout: 30_000, maxBuffer: 16 * 1024 * 1024 });
  if (!result || result.status !== 0) fail("material_inventory_failed", "tracked source identity is unavailable");
  const inventory = new Map();
  for (const text of Buffer.from(result.stdout ?? []).toString("utf8").replace(/\0$/, "").split("\0").filter(Boolean)) {
    const tab = text.indexOf("\t");
    const metadata = tab < 0 ? [] : text.slice(0, tab).split(" ");
    if (metadata.length !== 3) fail("material_inventory_failed", "tracked source identity is unavailable");
    inventory.set(text.slice(tab + 1), { mode: metadata[0], object_id: metadata[1], stage: metadata[2] });
  }
  return inventory;
}
function assertTracked(record, inventory) {
  const metadata = inventory.get(record.repository_path);
  if (!metadata) fail("material_path_untracked", "material source is not tracked");
  if (!new Set(["100644", "100755"]).has(metadata.mode) || metadata.stage !== "0") fail("material_git_mode_invalid", "material source Git mode is invalid");
}

function requireSnapshot(snapshot) {
  const state = snapshot && QUERY_SNAPSHOTS.get(snapshot);
  if (!state) fail("material_context_transaction_drift", "material context transaction changed");
  return state;
}

/** Capture one authenticated manifest byte image and Git inventory for a context transaction. */
export function captureMaterialQuerySnapshot({ repositoryRoot, fileSystem = fs, gitRunner }) {
  const metadata = loadMetadata(repositoryRoot, fileSystem);
  const inventory = trackedInventory(repositoryRoot, gitRunner);
  for (const record of metadata.manifest.materials) assertTracked(record, inventory);
  const snapshot = Object.freeze(Object.create(null));
  QUERY_SNAPSHOTS.set(snapshot, Object.freeze({
    root: metadata.root,
    manifest: metadata.manifest,
    manifestBytes: metadata.manifestBytes.toString("utf8"),
    manifestSha256: sha256(metadata.manifestBytes),
    inventory,
  }));
  return snapshot;
}

function snapshotManifestIsLive(state, fileSystem) {
  const inspection = inspectBoundPath(state.root, MATERIAL_REGISTRY_PATH, fileSystem, "material_registry_file_invalid");
  const bytes = readInspected(inspection, fileSystem, undefined, "material_registry_race");
  return sha256(bytes) === state.manifestSha256 && bytes.toString("utf8") === state.manifestBytes;
}

/** Normalize only post-authentication drift when the pinned manifest itself transitioned. */
export function rethrowMaterialQuerySnapshotError({ snapshot, error, fileSystem = fs }) {
  if (error?.code === "material_context_transaction_drift") throw error;
  if (!SNAPSHOT_DRIFT_CODES.has(error?.code)) throw error;
  const state = requireSnapshot(snapshot);
  try {
    if (!snapshotManifestIsLive(state, fileSystem)) fail("material_context_transaction_drift", "material context manifest changed");
  } catch (manifestError) {
    if (manifestError?.code === "material_context_transaction_drift") throw manifestError;
    fail("material_context_transaction_drift", "material context manifest changed");
  }
  throw error;
}

function assertSnapshotManifestLive(state, fileSystem) {
  try {
    if (!snapshotManifestIsLive(state, fileSystem)) fail("material_context_transaction_drift", "material context manifest changed");
  } catch (error) {
    if (error?.code === "material_context_transaction_drift") throw error;
    fail("material_context_transaction_drift", "material context manifest changed");
  }
}

/** Recheck the live manifest and selected source descriptors immediately before context emission. */
export function verifyMaterialQuerySnapshot({ repositoryRoot, snapshot, selectedSourceRefs, fileSystem = fs, sourceReader, gitRunner }) {
  const state = requireSnapshot(snapshot);
  assertSnapshotManifestLive(state, fileSystem);
  let liveInventory;
  try { liveInventory = trackedInventory(repositoryRoot, gitRunner); }
  catch (error) { rethrowMaterialQuerySnapshotError({ snapshot, error, fileSystem }); }
  const selected = new Set(selectedSourceRefs);
  for (const record of state.manifest.materials) {
    if (!selected.has(record.stable_ref)) continue;
    try {
      assertTracked(record, liveInventory);
      if (canonicalize(liveInventory.get(record.repository_path)) !== canonicalize(state.inventory.get(record.repository_path))) {
        fail("material_source_race", "material source tracking changed during context verification");
      }
      readRecord({ repositoryRoot, root: state.root, record, fileSystem, sourceReader, gitRunner, inventory: liveInventory });
    } catch (error) { rethrowMaterialQuerySnapshotError({ snapshot, error, fileSystem }); }
  }
  assertSnapshotManifestLive(state, fileSystem);
}

function readRecord({ repositoryRoot, root, record, fileSystem = fs, sourceReader, gitRunner, inventory }) {
  const suppliedInventory = inventory !== undefined;
  const before = inventory ?? trackedInventory(repositoryRoot, gitRunner, record.repository_path);
  assertTracked(record, before);
  const inspection = inspectBoundPath(root, record.repository_path, fileSystem);
  const bytes = readInspected(inspection, fileSystem, sourceReader, "material_source_race");
  if (!suppliedInventory) {
    const after = trackedInventory(repositoryRoot, gitRunner, record.repository_path);
    assertTracked(record, after);
    if (canonicalize(before.get(record.repository_path)) !== canonicalize(after.get(record.repository_path))) fail("material_source_race", "material source tracking changed during read");
  }
  if (sha256(bytes) !== record.source_sha256) fail("material_source_hash_mismatch", "material source hash does not match the manifest");
  if (bytes.byteLength !== record.byte_length) fail("material_byte_length_mismatch", "material source length does not match the manifest");
  return bytes;
}

function titleOf(text) {
  const frontmatter = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text);
  if (frontmatter) {
    const title = /^title:\s*(.+?)\s*$/m.exec(frontmatter[1]);
    if (title) return title[1].replace(/^(["'])(.*)\1$/, "$2");
  }
  return /^#{1,6}\s+(.+?)\s*$/m.exec(text)?.[1] ?? "";
}
function fieldMembership(fieldTokens, queryTokens) {
  const members = new Set(fieldTokens);
  let count = 0;
  for (const token of queryTokens) if (members.has(token)) count += 1;
  return count;
}
function sourceIdentity(record) {
  return { stable_ref: record.stable_ref, version_id: record.version_id, source_sha256: record.source_sha256, byte_length: record.byte_length };
}

export function materialDiscover({ repositoryRoot, fileSystem = fs }) {
  const { manifest } = loadMetadata(repositoryRoot, fileSystem);
  const domains = manifest.materials.map((record) => ({ record, identity: materialIdentityForRecord(record) }))
    .filter(({ identity }) => identity.kind === "domain")
    .map(({ record, identity }) => ({ identity, source: sourceIdentity(record), lifecycle: record.lifecycle }))
    .sort((left, right) => compare(left.identity.stable_ref, right.identity.stable_ref));
  if (domains.length !== 5) fail("material_domain_set_invalid", "material manifest does not contain the five governed domains");
  return deepFreeze({ schema_version: "2.0", manifest_version_id: manifest.version_id, domains });
}

export function materialSearch({ repositoryRoot, input, fileSystem = fs, sourceReader, gitRunner, snapshot }) {
  const normalized = validateQueryInput(input);
  const state = snapshot ? requireSnapshot(snapshot) : loadMetadata(repositoryRoot, fileSystem);
  const { root, manifest } = state;
  const beforeInventory = snapshot ? state.inventory : trackedInventory(repositoryRoot, gitRunner);
  const ranked = [];
  for (const record of manifest.materials) {
    const bytes = readRecord({ repositoryRoot, root, record, fileSystem, sourceReader, gitRunner, inventory: beforeInventory });
    let body;
    try { body = utf8Fatal.decode(bytes); } catch { fail("material_source_utf8_invalid", "material source is not valid UTF-8"); }
    const title = titleOf(body);
    const titleCount = fieldMembership(tokenizeMaterialText(title), normalized.scoringTokens);
    const pathCount = fieldMembership(tokenizeMaterialText(record.repository_path), normalized.scoringTokens);
    const bodyCount = fieldMembership(tokenizeMaterialText(body), normalized.scoringTokens);
    const score = titleCount * MATERIAL_SEARCH_WEIGHTS.title + pathCount * MATERIAL_SEARCH_WEIGHTS.path + bodyCount * MATERIAL_SEARCH_WEIGHTS.body;
    if (score === 0) continue;
    ranked.push({
      repositoryPath: record.repository_path,
      result: { identity: materialIdentityForRecord(record), source: sourceIdentity(record), title, score, match_counts: { title: titleCount, path: pathCount, body: bodyCount } },
    });
  }
  const afterInventory = trackedInventory(repositoryRoot, gitRunner);
  for (const record of manifest.materials) {
    assertTracked(record, afterInventory);
    if (canonicalize(beforeInventory.get(record.repository_path)) !== canonicalize(afterInventory.get(record.repository_path))) fail("material_source_race", "material source tracking changed during read");
  }
  ranked.sort((left, right) => right.result.score - left.result.score || compare(left.result.identity.stable_ref, right.result.identity.stable_ref));
  const selected = ranked.slice(0, normalized.limit);
  const envelope = {
    schema_version: "2.0", manifest_version_id: manifest.version_id,
    normalization: "Unicode NFKC; ECMAScript locale-independent lowercase; Letter/Number-led Unicode words retaining attached Marks; unique query-token field membership",
    query: normalized.query.normalize("NFKC").toLowerCase(), tokens: normalized.tokens,
    scoring_tokens: normalized.scoringTokens, weights: MATERIAL_SEARCH_WEIGHTS,
  };
  if (normalized.pathsOnly) return deepFreeze({ ...envelope, paths_only: true, paths: selected.map(({ repositoryPath }) => repositoryPath), total_matches: ranked.length });
  return deepFreeze({ ...envelope, results: selected.map(({ result }) => result), total_matches: ranked.length });
}

function validateGetInput(input) {
  assertObject(input);
  assertOnly(input, new Set(["reference", "offset", "length"]));
  let parsed;
  try { parsed = parseMaterialStableRef(input.reference); } catch { fail("material_reference_invalid", "reference must be a v2 material StableRef"); }
  const offset = input.offset ?? 0;
  const length = input.length ?? MATERIAL_GET_MAX_BYTES;
  if (!Number.isSafeInteger(offset) || offset < 0) fail("material_offset_invalid", "offset must be a non-negative safe integer");
  if (!Number.isSafeInteger(length) || length < 1 || length > MATERIAL_GET_MAX_BYTES) fail("material_length_invalid", "length must be an integer from 1 to 65536");
  if (!Number.isSafeInteger(offset + length)) fail("material_range_overflow", "offset plus length exceeds the safe integer range");
  return { parsed, offset, length };
}

export function materialGet({ repositoryRoot, input, fileSystem = fs, sourceReader, gitRunner, snapshot, contextUtf8SafeEnd = false }) {
  const normalized = validateGetInput(input);
  const state = snapshot ? requireSnapshot(snapshot) : loadMetadata(repositoryRoot, fileSystem);
  const { root, manifest } = state;
  const match = manifest.materials.map((record) => ({ record, identity: materialIdentityForRecord(record) }))
    .find(({ record, identity }) => normalized.parsed.stable_ref === record.stable_ref || normalized.parsed.stable_ref === identity.stable_ref);
  if (!match) fail("material_reference_not_found", "v2 material StableRef is absent from the manifest");
  const bytes = readRecord({ repositoryRoot, root, record: match.record, fileSystem, sourceReader, gitRunner, inventory: snapshot ? state.inventory : undefined });
  if (normalized.offset > bytes.byteLength) fail("material_offset_past_end", "offset is past the end of the material");
  let end = Math.min(bytes.byteLength, normalized.offset + normalized.length);
  if (normalized.offset < bytes.byteLength && (bytes[normalized.offset] & 0xc0) === 0x80) fail("material_utf8_split_start", "offset splits a UTF-8 code point");
  if (contextUtf8SafeEnd) while (end > normalized.offset && end < bytes.byteLength && (bytes[end] & 0xc0) === 0x80) end -= 1;
  else if (end < bytes.byteLength && (bytes[end] & 0xc0) === 0x80) fail("material_utf8_split_end", "page end splits a UTF-8 code point");
  const page = bytes.subarray(normalized.offset, end);
  let content;
  try { content = utf8Fatal.decode(page); } catch { fail("material_source_utf8_invalid", "material source page is not valid UTF-8"); }
  return deepFreeze({
    schema_version: "2.0", identity: match.identity, source: sourceIdentity(match.record),
    offset: normalized.offset, length: page.byteLength, next_offset: end < bytes.byteLength ? end : null,
    complete: normalized.offset === 0 && end === bytes.byteLength, content, bytes_base64: page.toString("base64"),
  });
}
