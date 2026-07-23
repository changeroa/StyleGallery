import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseStrictJson } from "../strict-json.mjs";
import { deepFreeze, hashCanonical } from "./canonical-json.mjs";
import { defineOperation } from "./execution.mjs";
import { createManifest, createStableRef, createVersionId } from "./identity.mjs";
import {
  createClaim,
  createEvidenceLink,
  createGovernanceDecision,
  createPolicyDisposition,
  createValidationReport,
} from "./knowledge.mjs";

export const EDITORIAL_PROFILE_REF = "sg:profile/editorial-reference-profile";
export const FIXTURE_MANIFEST_REF = "sg:manifest/agent-native-fixture";
export const REGISTRY_SOURCE_URL = new URL("../../consumer-reference/agent-native/registry.json", import.meta.url);

export class FixtureError extends TypeError {
  constructor(code, message, recordPath = "") {
    super(message);
    this.name = "FixtureError";
    this.code = code;
    if (recordPath) this.path = recordPath;
  }
}

function fail(code, message, recordPath = "") {
  throw new FixtureError(code, message, recordPath);
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function repositoryRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

function safeRepositoryFile(relative) {
  if (typeof relative !== "string" || relative.length === 0 || path.isAbsolute(relative)) {
    fail("fixture_source_path_invalid", "repository_path must be a non-empty relative path", "repository_path");
  }
  const root = repositoryRoot();
  const target = path.resolve(root, relative);
  const local = path.relative(root, target);
  if (local !== relative || local.startsWith(`..${path.sep}`)) {
    fail("fixture_source_path_invalid", "repository_path must remain normalized inside the repository", relative);
  }
  let current = root;
  for (const segment of relative.split("/")) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) fail("fixture_source_missing", "fixture source does not exist", relative);
    if (fs.lstatSync(current).isSymbolicLink()) fail("fixture_source_symlink", "fixture source must not traverse a symlink", relative);
  }
  if (!fs.lstatSync(target).isFile()) fail("fixture_source_type_invalid", "fixture source must be a regular file", relative);
  return target;
}

function verifyProjectedSource(seed) {
  if (!Object.hasOwn(seed, "repository_path")) return;
  const expected = seed.canonical_sha256;
  if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) {
    fail("fixture_source_digest_invalid", "canonical_sha256 must be 64 lowercase hex characters", seed.stable_ref);
  }
  const file = safeRepositoryFile(seed.repository_path);
  let value;
  try {
    value = parseStrictJson(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail("fixture_source_json_invalid", error instanceof Error ? error.message : String(error), seed.repository_path);
  }
  const actual = hashCanonical(value).slice("sha256:".length);
  if (actual !== expected) fail("fixture_source_digest_mismatch", "projected source changed; create a new registry version", seed.repository_path);
}

function versionedGeneric(seed) {
  const payload = structuredClone(seed);
  payload.schema_version ??= "1.0";
  delete payload.version_id;
  delete payload.versionId;
  const stableRef = createStableRef(payload.stable_ref);
  return deepFreeze({ ...payload, version_id: createVersionId({ stableRef, payload }) });
}

function materialize(seed, sourceRecords = new Map()) {
  verifyProjectedSource(seed);
  switch (seed.record_kind) {
    case "claim": return createClaim(seed);
    case "evidence_link": return createEvidenceLink(seed);
    case "validation_report": return createValidationReport(seed);
    case "governance_decision": return createGovernanceDecision(seed);
    case "policy_disposition": return createPolicyDisposition(seed);
    case "operation": return defineOperation(seed);
    case "execution_receipt": {
      const source = sourceRecords.get(seed.fixture_record_ref);
      if (!source || source.record_kind !== "executable_fixture") {
        fail("fixture_receipt_source_missing", "execution receipt must reference an executable fixture", seed.stable_ref);
      }
      if (seed.fixture_version_id !== undefined && seed.fixture_version_id !== source.version_id) {
        fail("fixture_receipt_version_mismatch", "execution receipt fixture_version_id must match the executable fixture VersionID", seed.stable_ref);
      }
      return versionedGeneric({ ...seed, fixture_version_id: source.version_id });
    }
    default: return versionedGeneric(seed);
  }
}

function validateSeed(seed) {
  if (!plainObject(seed)) fail("fixture_registry_invalid", "registry source must contain an object");
  if (seed.schema_version !== "1.0") fail("fixture_schema_version_unsupported", "registry schema_version must be 1.0", "schema_version");
  if (seed.fixture_ref !== FIXTURE_MANIFEST_REF) fail("fixture_manifest_ref_invalid", `fixture_ref must be ${FIXTURE_MANIFEST_REF}`, "fixture_ref");
  if (!Array.isArray(seed.records)) fail("fixture_records_required", "registry records must be an array", "records");
  const refs = seed.records.map((record, index) => {
    if (!plainObject(record)) fail("fixture_record_invalid", "registry records must be objects", `records/${index}`);
    try { return createStableRef(record.stable_ref); } catch (error) {
      fail(error.code ?? "fixture_stable_ref_invalid", error.message, `records/${index}/stable_ref`);
    }
  });
  if (new Set(refs).size !== refs.length) fail("fixture_stable_ref_duplicate", "fixture StableRefs must be unique", "records");
  if (!refs.includes(EDITORIAL_PROFILE_REF)) fail("fixture_editorial_profile_missing", `fixture must contain ${EDITORIAL_PROFILE_REF}`, "records");
}

export function loadRegistrySeed(source = REGISTRY_SOURCE_URL) {
  const file = source instanceof URL ? fileURLToPath(source) : path.resolve(String(source));
  if (!fs.existsSync(file) || fs.lstatSync(file).isSymbolicLink() || !fs.lstatSync(file).isFile()) {
    fail("fixture_registry_file_invalid", "registry source must be a regular non-symlink file", file);
  }
  let seed;
  try { seed = parseStrictJson(fs.readFileSync(file, "utf8")); } catch (error) {
    fail("fixture_registry_json_invalid", error instanceof Error ? error.message : String(error), file);
  }
  validateSeed(seed);
  return deepFreeze(seed);
}

export function createAgentNativeFixture(input = {}) {
  const seed = input.seed ?? loadRegistrySeed(input.source);
  validateSeed(seed);
  const materializedSources = new Map(seed.records
    .filter((record) => record.record_kind !== "execution_receipt")
    .map((record) => materialize(record))
    .map((record) => [record.stable_ref, record]));
  const records = seed.records.map((record) => record.record_kind === "execution_receipt"
    ? materialize(record, materializedSources)
    : materializedSources.get(record.stable_ref)).sort((left, right) => (
    left.stable_ref < right.stable_ref ? -1 : left.stable_ref > right.stable_ref ? 1 : 0
  ));
  const entries = records.map((record) => ({
    content_sha256: hashCanonical(record).slice("sha256:".length),
    stable_ref: record.stable_ref,
    version_id: record.version_id,
  }));
  const manifest = createManifest({ manifest_ref: seed.fixture_ref, entries, schema_version: seed.schema_version });
  return deepFreeze({ fixture_ref: seed.fixture_ref, manifest, records, schema_version: seed.schema_version });
}

export const agentNativeFixture = createAgentNativeFixture();
