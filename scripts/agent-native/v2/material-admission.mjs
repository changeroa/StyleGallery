import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

import { canonicalize, deepFreeze } from "../canonical-json.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const v2Directory = path.resolve(moduleDirectory, "../../../consumer-reference/agent-native/v2");
const policyPath = path.join(v2Directory, "admission-policy.json");
const policySchemaPath = path.join(v2Directory, "schema/admission-policy.schema.json");
const recordSchemaPath = path.join(v2Directory, "schema/material-record.schema.json");
const manifestSchemaPath = path.join(v2Directory, "schema/material-manifest.schema.json");
const MANIFEST_REF = "sg:manifest/material-admission-v2";
const MATERIAL_REF_PATTERN = /^sg:material\/path-sha256-[a-f0-9]{64}$/;
const MATERIAL_VERSION_PATTERN = /^sg:material\/path-sha256-[a-f0-9]{64}@sha256:[a-f0-9]{64}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const DOMAINS = new Set(["layout", "motion", "design-engineering", "game-ui", "platform-guides", "shared"]);
const LIFECYCLES = new Set(["draft", "stable", "deprecated", "experimental", "generated"]);
const RECORD_KEYS = new Set(["schema_version", "record_kind", "stable_ref", "version_id", "repository_path", "media_type", "source_sha256", "byte_length", "lifecycle", "domain"]);
const MANIFEST_KEYS = new Set(["schema_version", "record_kind", "stable_ref", "version_id", "admission_policy_ref", "admission_policy_version_id", "materials"]);

export class MaterialAdmissionError extends TypeError {
  constructor(code, message, sourcePath) {
    super(message);
    this.name = "MaterialAdmissionError";
    this.code = code;
    if (sourcePath !== undefined) this.path = sourcePath;
  }
}

function parseJsonFile(sourcePath) { return JSON.parse(fs.readFileSync(sourcePath, "utf8")); }
function failure(code, message, sourcePath) { return { code, message, ...(sourcePath === undefined ? {} : { path: sourcePath }) }; }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function canonicalVersionId(stableRef, value) {
  const payload = { ...value };
  delete payload.version_id;
  return `${stableRef}@sha256:${sha256(Buffer.from(canonicalize(payload), "utf8"))}`;
}
function bytewiseCompare(left, right) { return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")); }

const policySchema = parseJsonFile(policySchemaPath);
const recordSchema = parseJsonFile(recordSchemaPath);
const manifestSchema = parseJsonFile(manifestSchemaPath);
const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(policySchema);
ajv.addSchema(recordSchema);
ajv.addSchema(manifestSchema);
const validatePolicySchema = ajv.getSchema(policySchema.$id);
const validateRecordSchema = ajv.getSchema(recordSchema.$id);
const validateManifestSchema = ajv.getSchema(manifestSchema.$id);

export function validateMaterialAdmissionPolicy(policy) {
  const failures = [];
  if (!validatePolicySchema(policy)) failures.push(failure("material_policy_schema_invalid", "admission policy does not satisfy its closed schema"));
  if (failures.length === 0) {
    const paths = policy.allowed_materials.map(({ repository_path }) => repository_path);
    if (new Set(paths).size !== paths.length) failures.push(failure("material_policy_path_duplicate", "admission policy paths must be unique"));
    if (paths.some((entry, index) => index > 0 && bytewiseCompare(paths[index - 1], entry) >= 0)) failures.push(failure("material_policy_order_invalid", "admission policy paths must be bytewise sorted"));
    const exclusions = policy.exclusions.map(({ kind, value }) => `${kind}\0${value}`);
    if (new Set(exclusions).size !== exclusions.length) failures.push(failure("material_policy_exclusion_duplicate", "admission policy exclusions must be unique"));
    if (policy.version_id !== canonicalVersionId(policy.stable_ref, policy)) failures.push(failure("material_policy_version_invalid", "admission policy VersionID does not bind canonical policy content"));
  }
  return deepFreeze({ ok: failures.length === 0, failures });
}

const loadedPolicy = parseJsonFile(policyPath);
const loadedPolicyResult = validateMaterialAdmissionPolicy(loadedPolicy);
if (!loadedPolicyResult.ok) throw new MaterialAdmissionError(loadedPolicyResult.failures[0].code, loadedPolicyResult.failures[0].message);
export const materialAdmissionPolicy = deepFreeze(loadedPolicy);
const allowedRoutes = new Map(materialAdmissionPolicy.allowed_materials.map((entry) => [entry.repository_path, entry]));

function normalizedPathFailure(repositoryPath) {
  if (typeof repositoryPath !== "string" || repositoryPath.length === 0 || repositoryPath.includes("\0")
    || /(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF])/.test(repositoryPath)) {
    return failure("material_path_invalid", "repository_path must be a non-empty valid Unicode string", repositoryPath);
  }
  if (path.posix.isAbsolute(repositoryPath) || path.win32.isAbsolute(repositoryPath)
    || /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(repositoryPath)) {
    return failure("material_path_absolute", "repository_path must be repository-relative and not a URI", repositoryPath);
  }
  const components = repositoryPath.split("/");
  if (repositoryPath.includes("\\") || components.some((component) => component === "" || component === ".")) {
    return failure("material_path_not_normalized", "repository_path must use normalized forward-slash components", repositoryPath);
  }
  if (components.includes("..")) return failure("material_path_escape", "repository_path must not contain parent components", repositoryPath);
  if (path.posix.normalize(repositoryPath) !== repositoryPath) return failure("material_path_not_normalized", "repository_path must be normalized", repositoryPath);
  return null;
}

export function materialStableRefForPath(repositoryPath) {
  const pathFailure = normalizedPathFailure(repositoryPath);
  if (pathFailure) throw new MaterialAdmissionError(pathFailure.code, pathFailure.message, repositoryPath);
  return `sg:material/path-sha256-${sha256(Buffer.from(repositoryPath, "utf8"))}`;
}

export function materialVersionIdForSource(stableRef, sourceSha256) {
  if (!MATERIAL_REF_PATTERN.test(stableRef ?? "") || !HASH_PATTERN.test(sourceSha256 ?? "")) {
    throw new MaterialAdmissionError("material_identity_input_invalid", "source VersionID requires a v2 material StableRef and lowercase SHA-256");
  }
  return `${stableRef}@sha256:${sourceSha256}`;
}

function exclusionFor(repositoryPath) {
  const segments = repositoryPath.split("/");
  for (const exclusion of materialAdmissionPolicy.exclusions) {
    if (exclusion.kind === "path_prefix" && repositoryPath.startsWith(exclusion.value)) return exclusion;
    if (exclusion.kind === "path_segment" && segments.includes(exclusion.value)) return exclusion;
  }
  return null;
}

function classifyPath(repositoryPath) {
  const pathFailure = normalizedPathFailure(repositoryPath);
  if (pathFailure) return { failure: pathFailure };
  const exclusion = exclusionFor(repositoryPath);
  if (exclusion) return { failure: failure(exclusion.code, "material path is explicitly excluded", repositoryPath) };
  if (!repositoryPath.endsWith(".md")) return { failure: failure("material_type_not_markdown", "only Markdown material may be admitted", repositoryPath) };
  const route = allowedRoutes.get(repositoryPath);
  if (!route) return { failure: failure("material_path_unapproved", "material path is absent from the sealed allow-set", repositoryPath) };
  return { route };
}

export function createMaterialManifest(materials) {
  if (!Array.isArray(materials)) throw new MaterialAdmissionError("material_manifest_materials_invalid", "materials must be an array");
  const sorted = materials.map((record) => structuredClone(record)).sort((left, right) => bytewiseCompare(left.stable_ref ?? "", right.stable_ref ?? ""));
  const base = {
    schema_version: "2.0", record_kind: "material_manifest", stable_ref: MANIFEST_REF,
    admission_policy_ref: materialAdmissionPolicy.stable_ref,
    admission_policy_version_id: materialAdmissionPolicy.version_id,
    materials: sorted,
  };
  return deepFreeze({ ...base, version_id: canonicalVersionId(MANIFEST_REF, base) });
}

function trackedInventory(repositoryRoot) {
  const result = spawnSync("git", ["-C", repositoryRoot, "ls-files", "-s", "-z", "--"], { encoding: "buffer", maxBuffer: 16 * 1024 * 1024, timeout: 30_000 });
  if (result.status !== 0) {
    const detail = result.error?.message ?? result.stderr.toString("utf8").trim() ?? "git ls-files failed";
    return { failure: failure("material_inventory_failed", detail) };
  }
  const entries = new Map();
  for (const encoded of result.stdout.subarray(0, result.stdout.length - (result.stdout.at(-1) === 0 ? 1 : 0)).toString("utf8").split("\0").filter(Boolean)) {
    const tab = encoded.indexOf("\t");
    const metadata = encoded.slice(0, tab).split(" ");
    const repositoryPath = encoded.slice(tab + 1);
    if (tab < 0 || metadata.length !== 3) return { failure: failure("material_inventory_failed", "Git inventory entry is malformed") };
    entries.set(repositoryPath, { mode: metadata[0], object_id: metadata[1], stage: metadata[2] });
  }
  return { entries };
}

function realpath(fileSystem, target) {
  const implementation = fileSystem.realpathSync.native ?? fileSystem.realpathSync;
  return implementation.call(fileSystem.realpathSync, target);
}

function inspectRepositoryRoot(repositoryRoot, fileSystem) {
  const resolvedRoot = path.resolve(repositoryRoot);
  try {
    const stats = fileSystem.lstatSync(resolvedRoot);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return { failure: failure("material_repository_invalid", "repository root must be a non-symlink directory") };
    return { resolvedRoot, canonicalRoot: realpath(fileSystem, resolvedRoot) };
  } catch (error) {
    return { failure: failure("material_repository_invalid", `repository root is unavailable: ${error.message}`) };
  }
}

function inspectWorktreePath(rootState, repositoryPath, fileSystem) {
  let current = rootState.resolvedRoot;
  let targetStats;
  try {
    for (const component of repositoryPath.split("/")) {
      current = path.join(current, component);
      targetStats = fileSystem.lstatSync(current);
      if (targetStats.isSymbolicLink()) return { failure: failure("material_path_symlink", "material path components must not be symlinks", repositoryPath) };
    }
    if (!targetStats.isFile()) return { failure: failure("material_path_not_regular", "material path must be a regular file", repositoryPath) };
    const canonicalTarget = realpath(fileSystem, current);
    const expectedTarget = path.resolve(rootState.canonicalRoot, ...repositoryPath.split("/"));
    if (canonicalTarget !== expectedTarget || !canonicalTarget.startsWith(`${rootState.canonicalRoot}${path.sep}`)) {
      return { failure: failure("material_path_escape", "material canonical path escapes the repository root", repositoryPath) };
    }
    return { target: current, canonicalTarget, dev: targetStats.dev, ino: targetStats.ino };
  } catch (error) {
    return { failure: failure("material_path_unavailable", `tracked material path is unavailable: ${error.message}`, repositoryPath) };
  }
}

function validateManifestEnvelope(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return [failure("material_manifest_invalid", "material manifest must be an object")];
  if (Object.keys(manifest).some((key) => !MANIFEST_KEYS.has(key))) return [failure("material_manifest_schema_invalid", "material manifest contains undeclared properties")];
  if (manifest.schema_version !== "2.0" || manifest.record_kind !== "material_manifest" || manifest.stable_ref !== MANIFEST_REF
    || !Array.isArray(manifest.materials) || manifest.materials.length === 0) return [failure("material_manifest_schema_invalid", "material manifest envelope is malformed")];
  if (manifest.admission_policy_ref !== materialAdmissionPolicy.stable_ref || manifest.admission_policy_version_id !== materialAdmissionPolicy.version_id) {
    return [failure("material_manifest_policy_mismatch", "material manifest does not bind the authoritative admission policy")];
  }
  if (manifest.version_id !== canonicalVersionId(MANIFEST_REF, manifest)) return [failure("material_manifest_version_invalid", "material manifest VersionID does not bind canonical manifest content")];
  return [];
}

function validateRecordShape(record, index) {
  const location = `/materials/${index}`;
  if (!record || typeof record !== "object" || Array.isArray(record)) return failure("material_record_invalid", "material record must be an object", location);
  if (Object.keys(record).some((key) => !RECORD_KEYS.has(key)) || record.schema_version !== "2.0" || record.record_kind !== "material") return failure("material_schema_invalid", "material record is not a closed v2 material", location);
  if (!MATERIAL_REF_PATTERN.test(record.stable_ref ?? "")) return failure("material_stable_ref_invalid", "material StableRef is malformed", `${location}/stable_ref`);
  if (!MATERIAL_VERSION_PATTERN.test(record.version_id ?? "") || !record.version_id.startsWith(`${record.stable_ref}@sha256:`)) return failure("material_version_invalid", "material VersionID is malformed or names another StableRef", `${location}/version_id`);
  if (record.media_type !== materialAdmissionPolicy.media_type) return failure("material_media_type_invalid", "material media type must be text/markdown", `${location}/media_type`);
  if (!HASH_PATTERN.test(record.source_sha256 ?? "")) return failure("material_hash_invalid", "material source_sha256 must be lowercase SHA-256", `${location}/source_sha256`);
  if (!Number.isSafeInteger(record.byte_length) || record.byte_length < 0) return failure("material_length_invalid", "material byte_length must be a non-negative safe integer", `${location}/byte_length`);
  if (!LIFECYCLES.has(record.lifecycle)) return failure("material_lifecycle_invalid", "material lifecycle is unsupported", `${location}/lifecycle`);
  if (!DOMAINS.has(record.domain)) return failure("material_domain_invalid", "material domain is unsupported", `${location}/domain`);
  const classified = classifyPath(record.repository_path);
  if (classified.failure) return classified.failure;
  if (record.stable_ref !== materialStableRefForPath(record.repository_path)) return failure("material_stable_ref_path_mismatch", "material StableRef does not derive from repository_path", `${location}/stable_ref`);
  if (record.domain !== classified.route.domain) return failure("material_domain_route_mismatch", "material domain does not match policy", `${location}/domain`);
  if (record.lifecycle !== classified.route.lifecycle) return failure("material_lifecycle_route_mismatch", "material lifecycle does not match policy", `${location}/lifecycle`);
  if (record.version_id !== materialVersionIdForSource(record.stable_ref, record.source_sha256)) return failure("material_version_invalid", "material VersionID does not bind exact source SHA-256", `${location}/version_id`);
  if (!validateRecordSchema(record)) return failure("material_schema_invalid", "material record does not satisfy the closed schema", location);
  return null;
}

export function validateMaterialManifest({ repositoryRoot, manifest, fileSystem = fs, readFile }) {
  const envelopeFailures = validateManifestEnvelope(manifest);
  if (envelopeFailures.length > 0) return deepFreeze({ ok: false, failures: envelopeFailures, materials: [] });
  const recordFailures = manifest.materials.map(validateRecordShape).filter(Boolean);
  if (recordFailures.length > 0) return deepFreeze({ ok: false, failures: recordFailures, materials: [] });
  if (!validateManifestSchema(manifest)) return deepFreeze({ ok: false, failures: [failure("material_manifest_schema_invalid", "manifest does not satisfy the closed schema")], materials: [] });

  const refs = manifest.materials.map(({ stable_ref }) => stable_ref);
  const paths = manifest.materials.map(({ repository_path }) => repository_path);
  const duplicateFailures = [];
  if (new Set(refs).size !== refs.length) duplicateFailures.push(failure("material_identity_duplicate", "material StableRefs must be unique"));
  if (new Set(paths).size !== paths.length) duplicateFailures.push(failure("material_path_duplicate", "material paths must be unique"));
  if (duplicateFailures.length > 0) return deepFreeze({ ok: false, failures: duplicateFailures, materials: [] });
  if (refs.some((entry, index) => index > 0 && bytewiseCompare(refs[index - 1], entry) >= 0)) return deepFreeze({ ok: false, failures: [failure("material_manifest_order_invalid", "materials must be bytewise sorted by StableRef")], materials: [] });

  const inventory = trackedInventory(repositoryRoot);
  if (inventory.failure) return deepFreeze({ ok: false, failures: [inventory.failure], materials: [] });
  for (const record of manifest.materials) {
    const indexEntry = inventory.entries.get(record.repository_path);
    if (!indexEntry) return deepFreeze({ ok: false, failures: [failure("material_path_untracked", "material path is absent from tracked Git inventory", record.repository_path)], materials: [] });
    if (!new Set(["100644", "100755"]).has(indexEntry.mode) || indexEntry.stage !== "0") return deepFreeze({ ok: false, failures: [failure("material_git_mode_invalid", "material Git index entry must be a stage-zero regular blob", record.repository_path)], materials: [] });
  }

  const rootState = inspectRepositoryRoot(repositoryRoot, fileSystem);
  if (rootState.failure) return deepFreeze({ ok: false, failures: [rootState.failure], materials: [] });
  const inspections = [];
  for (const record of manifest.materials) {
    const inspection = inspectWorktreePath(rootState, record.repository_path, fileSystem);
    if (inspection.failure) return deepFreeze({ ok: false, failures: [inspection.failure], materials: [] });
    inspections.push(inspection);
  }

  const reader = readFile ?? ((descriptor) => fileSystem.readFileSync(descriptor));
  const admitted = [];
  for (let index = 0; index < manifest.materials.length; index += 1) {
    const record = manifest.materials[index];
    const inspection = inspections[index];
    let descriptor;
    let bytes;
    try {
      descriptor = fileSystem.openSync(inspection.target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
      const descriptorStats = fileSystem.fstatSync(descriptor);
      const currentStats = fileSystem.lstatSync(inspection.target);
      const currentCanonical = realpath(fileSystem, inspection.target);
      if (!descriptorStats.isFile() || currentStats.isSymbolicLink() || !currentStats.isFile()
        || descriptorStats.dev !== inspection.dev || descriptorStats.ino !== inspection.ino
        || currentStats.dev !== inspection.dev || currentStats.ino !== inspection.ino
        || currentCanonical !== inspection.canonicalTarget) {
        return deepFreeze({ ok: false, failures: [failure("material_path_race", "material path identity changed after preflight", record.repository_path)], materials: [] });
      }
      bytes = reader(descriptor);
    } catch (error) {
      const code = error?.code === "ELOOP" || error?.code === "ENOENT" ? "material_path_race" : "material_read_failed";
      return deepFreeze({ ok: false, failures: [failure(code, `material could not be read safely: ${error.message}`, record.repository_path)], materials: [] });
    } finally {
      if (descriptor !== undefined) fileSystem.closeSync(descriptor);
    }
    if (!(bytes instanceof Uint8Array)) return deepFreeze({ ok: false, failures: [failure("material_read_invalid", "material reader must return bytes", record.repository_path)], materials: [] });
    if (sha256(bytes) !== record.source_sha256) return deepFreeze({ ok: false, failures: [failure("material_source_hash_mismatch", "material bytes do not match source_sha256", record.repository_path)], materials: [] });
    if (bytes.byteLength !== record.byte_length) return deepFreeze({ ok: false, failures: [failure("material_byte_length_mismatch", "material bytes do not match byte_length", record.repository_path)], materials: [] });
    admitted.push({ ...record });
  }
  return deepFreeze({ ok: true, failures: [], materials: admitted });
}

export function resolveMaterialRecord({ manifest, reference }) {
  if (!MATERIAL_REF_PATTERN.test(reference ?? "")) throw new MaterialAdmissionError("material_reference_invalid", "runtime material references must be v2 StableRefs");
  const record = manifest?.materials?.find(({ stable_ref }) => stable_ref === reference);
  if (!record) throw new MaterialAdmissionError("material_reference_not_found", "material StableRef is absent from the manifest");
  return deepFreeze(structuredClone(record));
}
