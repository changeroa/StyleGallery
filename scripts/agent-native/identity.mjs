import { deepFreeze, hashCanonical } from "./canonical-json.mjs";

export class IdentityError extends TypeError {
  constructor(code, message, path = "") {
    super(message);
    this.name = "IdentityError";
    this.code = code;
    if (path) this.path = path;
  }
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const STABLE_REF_KINDS = Object.freeze([
  "profile", "artifact", "claim", "evidence", "validation", "governance", "operation", "task", "proposal", "view",
  "agent", "validator", "observer", "governor", "capability", "receipt", "run", "effect", "context", "manifest", "policy", "connector", "event", "snapshot", "source", "skill",
]);
const KIND_SET = new Set(STABLE_REF_KINDS);

function fail(code, message, path) {
  throw new IdentityError(code, message, path);
}

function inputValue(input, names) {
  if (typeof input === "string") return input;
  if (!input || typeof input !== "object") return undefined;
  for (const name of names) if (Object.hasOwn(input, name)) return input[name];
  return undefined;
}

function requireRef(value, path = "stable_ref") {
  if (typeof value !== "string") fail("stable_ref_required", "StableRef must be a string", path);
  const match = /^sg:([a-z0-9-]+)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(value);
  if (!match || !KIND_SET.has(match[1])) fail("stable_ref_invalid", "StableRef must match the governed sg:<kind>/<kebab-id> grammar", path);
  return { stable_ref: value, kind: match[1], id: match[2] };
}

export function createStableRef(input) {
  const value = typeof input === "string" ? input : undefined;
  if (value) return requireRef(value).stable_ref;
  const kind = inputValue(input, ["kind", "namespace", "type"]);
  const id = inputValue(input, ["id", "opaque_id", "opaqueId"]);
  if (typeof kind !== "string" || typeof id !== "string") fail("stable_ref_parts_required", "createStableRef requires kind and id");
  if (!KIND_SET.has(kind) || !KEBAB.test(kind)) fail("stable_ref_kind_invalid", `unsupported StableRef kind ${kind}`, "kind");
  if (!KEBAB.test(id)) fail("stable_ref_id_invalid", `StableRef id must be kebab-case: ${id}`, "id");
  return `sg:${kind}/${id}`;
}

export const stableRef = createStableRef;

export function parseStableRef(input) {
  const value = inputValue(input, ["stable_ref", "stableRef", "ref", "value"]);
  const parsed = requireRef(value, "stable_ref");
  return deepFreeze({ ...parsed, stableRef: parsed.stable_ref, opaque_id: parsed.id, opaqueId: parsed.id });
}

export const parseRef = parseStableRef;

function payloadOf(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  if (Object.hasOwn(input, "payload")) return input.payload;
  if (Object.hasOwn(input, "version_payload")) return input.version_payload;
  if (Object.hasOwn(input, "versionPayload")) return input.versionPayload;
  return input;
}

function versionContent(stable_ref, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { stable_ref, content: payload };
  }
  const copy = { ...payload };
  delete copy.stable_ref;
  delete copy.stableRef;
  delete copy.ref;
  delete copy.version_id;
  delete copy.versionId;
  return { stable_ref, ...copy };
}

function digestPayload(stable_ref, payload) {
  return hashCanonical(versionContent(stable_ref, payload)).replace(/^sha256:/, "");
}

export function createVersionId(input) {
  const payload = payloadOf(input);
  const ref = inputValue(input, ["stable_ref", "stableRef", "ref"]) ?? (payload && typeof payload === "object" ? inputValue(payload, ["stable_ref", "stableRef", "ref"]) : undefined);
  const stable_ref = createStableRef(ref);
  return `${stable_ref}@sha256:${digestPayload(stable_ref, payload)}`;
}

export const versionId = createVersionId;

const VERSION_RE = /^(sg:[a-z0-9-]+\/[a-z0-9]+(?:-[a-z0-9]+)*)@sha256:([a-f0-9]{64})$/;

export function parseVersionId(input) {
  const value = inputValue(input, ["version_id", "versionId", "id", "value"]);
  if (typeof value !== "string") fail("version_id_required", "VersionID must be a string", "version_id");
  const match = VERSION_RE.exec(value);
  if (!match) fail("version_id_invalid", "VersionID must be StableRef@sha256:<64 lowercase hex>", "version_id");
  const parsedRef = requireRef(match[1]);
  const expectedRef = typeof input === "string" ? undefined : inputValue(input, ["stable_ref", "stableRef", "ref"]);
  if (expectedRef !== undefined && createStableRef(expectedRef) !== parsedRef.stable_ref) fail("version_ref_mismatch", "VersionID StableRef does not match the supplied StableRef");
  const payload = input && typeof input === "object" ? (Object.hasOwn(input, "payload") ? input.payload : Object.hasOwn(input, "version_payload") ? input.version_payload : undefined) : undefined;
  if (payload !== undefined && digestPayload(parsedRef.stable_ref, payload) !== match[2]) fail("version_digest_mismatch", "VersionID digest does not match the supplied payload", "version_id");
  return deepFreeze({ version_id: value, versionId: value, stable_ref: parsedRef.stable_ref, stableRef: parsedRef.stable_ref, digest: match[2], hash_suite: "sha256" });
}

export const parseVersion = parseVersionId;

function normalizeEntry(entry, index) {
  const hasIdentity = entry && typeof entry === "object" && (Object.hasOwn(entry, "stable_ref") || Object.hasOwn(entry, "stableRef") || Object.hasOwn(entry, "ref"));
  const source = hasIdentity ? entry : entry?.object ?? entry?.record ?? entry?.value ?? entry;
  if (!source || typeof source !== "object") fail("manifest_entry_invalid", "manifest entries must be objects", `/entries/${index}`);
  const stable_ref = createStableRef(inputValue(source, ["stable_ref", "stableRef", "ref"]));
  const version_id = inputValue(source, ["version_id", "versionId"]);
  const hasContent = Object.hasOwn(source, "content");
  const content = hasContent ? source.content : undefined;
  if (hasContent && content && typeof content === "object" && !Array.isArray(content)) {
    const contentRef = inputValue(content, ["stable_ref", "stableRef", "ref"]);
    if (contentRef !== undefined && createStableRef(contentRef) !== stable_ref) {
      fail("manifest_content_ref_mismatch", "manifest entry StableRef does not match its supplied content", `/entries/${index}/content/stable_ref`);
    }
    const contentVersion = inputValue(content, ["version_id", "versionId"]);
    if (contentVersion !== undefined && contentVersion !== version_id) {
      fail("manifest_content_version_mismatch", "manifest entry VersionID does not match its supplied content", `/entries/${index}/content/version_id`);
    }
  }
  parseVersionId({ version_id, stable_ref, ...(hasContent ? { payload: content } : {}) });
  let content_sha256 = inputValue(source, ["content_sha256", "contentHash", "sha256"]);
  const expectedContentSha = hasContent ? hashCanonical(content).replace(/^sha256:/, "") : undefined;
  if (content_sha256 === undefined && hasContent) content_sha256 = expectedContentSha;
  if (typeof content_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(content_sha256)) fail("manifest_content_hash_invalid", "manifest entry content_sha256 must be 64 lowercase hex characters", `/entries/${index}/content_sha256`);
  if (hasContent && content_sha256 !== expectedContentSha) fail("manifest_content_digest_mismatch", "manifest entry content_sha256 does not match its supplied content", `/entries/${index}/content_sha256`);
  return { stable_ref, version_id, content_sha256, ...(hasContent ? { content: structuredClone(content) } : {}) };
}

function manifestBody(manifest, includeVersion) {
  const body = { schema_version: manifest.schema_version, manifest_ref: manifest.manifest_ref, entries: manifest.entries };
  if (includeVersion) body.version_id = manifest.version_id;
  return body;
}

export function createManifest(input = {}) {
  const manifest_ref = createStableRef(inputValue(input, ["manifest_ref", "manifestRef", "ref"]));
  const rawEntries = inputValue(input, ["entries", "objects", "records"]) ?? [];
  if (!Array.isArray(rawEntries)) fail("manifest_entries_required", "manifest entries must be an array", "entries");
  const entries = rawEntries.map(normalizeEntry).sort((left, right) => left.stable_ref < right.stable_ref ? -1 : left.stable_ref > right.stable_ref ? 1 : 0);
  if (new Set(entries.map((entry) => entry.stable_ref)).size !== entries.length) fail("manifest_entry_duplicate", "manifest entries must have unique StableRefs", "entries");
  const base = { schema_version: input.schema_version ?? input.schemaVersion ?? "1.0", manifest_ref, entries };
  const version_id = `${manifest_ref}@sha256:${hashCanonical(base).replace(/^sha256:/, "")}`;
  const sha256 = hashCanonical({ ...base, version_id }).replace(/^sha256:/, "");
  return deepFreeze({ ...base, version_id, sha256 });
}

export const makeManifest = createManifest;

export function verifyManifest(input) {
  const manifest = input?.manifest ?? input;
  const failures = [];
  if (!manifest || typeof manifest !== "object") return { ok: false, failures: [{ code: "manifest_required", message: "manifest must be an object" }] };
  let ref;
  try { ref = createStableRef(manifest.manifest_ref); } catch (error) { failures.push({ code: error.code ?? "manifest_ref_invalid", message: error.message, path: "manifest_ref" }); }
  const entries = manifest.entries;
  if (!Array.isArray(entries)) failures.push({ code: "manifest_entries_required", message: "manifest entries must be an array", path: "entries" });
  else {
    const refs = [];
    for (let index = 0; index < entries.length; index += 1) {
      for (const alias of ["stableRef", "ref", "versionId", "contentHash"]) {
        if (Object.hasOwn(entries[index] ?? {}, alias)) failures.push({ code: "manifest_alias_forbidden", message: `${alias} is not a canonical manifest entry key`, path: `/entries/${index}/${alias}` });
      }
      try { refs.push(normalizeEntry(entries[index], index).stable_ref); } catch (error) { failures.push({ code: error.code ?? "manifest_entry_invalid", message: error.message, path: error.path ?? `/entries/${index}` }); }
    }
    if (new Set(refs).size !== refs.length) failures.push({ code: "manifest_entry_duplicate", message: "manifest entries must be unique", path: "entries" });
    if (refs.some((entry, index) => index > 0 && refs[index - 1] > entry)) failures.push({ code: "manifest_entries_unsorted", message: "manifest entries must be sorted by StableRef", path: "entries" });
  }
  if (failures.length === 0) {
    const expectedVersion = `${ref}@sha256:${hashCanonical(manifestBody(manifest, false)).replace(/^sha256:/, "")}`;
    const expectedSha = hashCanonical(manifestBody({ ...manifest, version_id: expectedVersion }, true)).replace(/^sha256:/, "");
    if (manifest.version_id !== expectedVersion) failures.push({ code: "manifest_version_mismatch", message: "manifest VersionID does not match canonical entries", path: "version_id" });
    if (manifest.sha256 !== expectedSha) failures.push({ code: "manifest_digest_mismatch", message: "manifest sha256 does not match canonical bytes", path: "sha256" });
  }
  return deepFreeze({ ok: failures.length === 0, failures });
}

export const validateManifest = verifyManifest;
