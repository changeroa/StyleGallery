import { canonicalize, deepFreeze } from "./canonical-json.mjs";
import { parseStableRef, parseVersionId } from "./identity.mjs";
import { aggregateEvidence } from "./knowledge.mjs";
import { buildContextPackage, buildViewSnapshot } from "./retrieval.mjs";

export class QueryError extends TypeError {
  constructor(code, message, recordPath = "") {
    super(message);
    this.name = "QueryError";
    this.code = code;
    if (recordPath) this.path = recordPath;
  }
}

function fail(code, message, recordPath = "") {
  throw new QueryError(code, message, recordPath);
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function inputReference(input) {
  if (typeof input === "string") return input;
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  return input.reference ?? input.ref ?? input.stable_ref ?? input.stableRef ?? input.version_id ?? input.versionId;
}

function indexFixture(fixture) {
  if (!fixture || !Array.isArray(fixture.records)) fail("registry_fixture_invalid", "fixture.records must be an array");
  const records = [...fixture.records].sort((left, right) => compare(left.stable_ref, right.stable_ref) || compare(left.version_id, right.version_id));
  const byVersion = new Map(records.map((record) => [record.version_id, record]));
  const byStableRef = new Map();
  for (const record of records) byStableRef.set(record.stable_ref, record);
  return { byStableRef, byVersion, records };
}

function normalizeReference(input) {
  const reference = inputReference(input);
  if (typeof reference !== "string" || reference.length === 0) {
    fail("argument_value_required", "a StableRef or VersionID is required", "reference");
  }
  if (reference.includes("@")) {
    try { return { reference, version: true, stableRef: parseVersionId(reference).stable_ref }; } catch {
      fail("version_id_malformed", "reference must be StableRef@sha256:<64 lowercase hex>", "reference");
    }
  }
  try { return { reference, version: false, stableRef: parseStableRef(reference).stable_ref }; } catch {
    fail("stable_ref_malformed", "reference must match sg:<kind>/<kebab-id>", "reference");
  }
}

export function resolveRecord(fixture, input) {
  const normalized = normalizeReference(input);
  const index = indexFixture(fixture);
  const record = normalized.version ? index.byVersion.get(normalized.reference) : index.byStableRef.get(normalized.stableRef);
  if (!record) {
    const code = normalized.version ? "version_id_unknown" : "stable_ref_unknown";
    fail(code, `no immutable fixture record exists for ${normalized.reference}`, "reference");
  }
  return record;
}

function linked(records, kind, claimRef) {
  return records.filter((record) => record.record_kind === kind && record.claim_ref === claimRef);
}

function claimsFor(index, subject) {
  if (subject.record_kind === "claim") return [subject];
  const declared = new Set(Array.isArray(subject.claim_refs) ? subject.claim_refs : []);
  return index.records.filter((record) => record.record_kind === "claim"
    && (record.subject_ref === subject.stable_ref || declared.has(record.stable_ref)));
}

export function queryClaims(fixture, input) {
  const subject = resolveRecord(fixture, input);
  const index = indexFixture(fixture);
  const claims = claimsFor(index, subject).map((claim) => {
    const evidence = linked(index.records, "evidence_link", claim.stable_ref);
    const validations = linked(index.records, "validation_report", claim.stable_ref);
    const governance = linked(index.records, "governance_decision", claim.stable_ref);
    const policy = linked(index.records, "policy_disposition", claim.stable_ref);
    return {
      aggregate: aggregateEvidence({ claim, evidence_links: evidence }),
      claim,
      evidence,
      governance,
      policy_dispositions: policy,
      validations,
    };
  });
  return deepFreeze({ claims, subject_ref: subject.stable_ref, subject_version_id: subject.version_id });
}

function contextMembers(fixture, subject) {
  const graph = queryClaims(fixture, subject.stable_ref);
  const related = graph.claims.flatMap((entry) => [
    entry.claim,
    ...entry.evidence,
    ...entry.validations,
    ...entry.governance,
    ...entry.policy_dispositions,
  ]);
  const unique = new Map([subject, ...related].map((record) => [record.version_id, record]));
  return [...unique.values()];
}

function refSlug(stableRef) {
  return stableRef.replace(/^sg:/, "").replace("/", "-");
}

export function queryContext(fixture, input) {
  const subject = resolveRecord(fixture, input);
  const members = contextMembers(fixture, subject);
  const slug = refSlug(subject.stable_ref);
  const snapshot = buildViewSnapshot({
    heads: [fixture.manifest.version_id],
    max_members: 64,
    members,
    policy: "sg:policy/editorial-profile-read",
    snapshot_ref: `sg:view/${slug}-snapshot`,
    view_spec: { stable_ref: `sg:view/${slug}-snapshot`, subject_ref: subject.stable_ref },
  });
  return buildContextPackage({
    budget: { tokens: 32768 },
    context_ref: `sg:view/${slug}-context`,
    members,
    policy: "sg:policy/editorial-profile-read",
    query: subject.stable_ref,
    query_class: "stable_ref",
    retriever: "fixture-registry@1",
    snapshot,
  });
}

export function queryOperations(operationSpecs) {
  if (!Array.isArray(operationSpecs)) fail("registry_operations_invalid", "operation specs must be an array");
  const operations = [...operationSpecs].sort((left, right) => compare(left.name, right.name));
  return deepFreeze({ operations });
}

export function queryDiscover(description) {
  if (!description || typeof description !== "object" || Array.isArray(description)) {
    fail("self_description_invalid", "discover requires a self-description object");
  }
  return description;
}

export function queryRetrieve(fixture, input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("retrieve_input_invalid", "retrieve input must be an object");
  const query = input.query ?? "";
  if (typeof query !== "string") fail("retrieve_query_invalid", "retrieve query must be a string", "query");
  const limit = input.limit ?? 32;
  if (!Number.isInteger(limit) || limit < 0 || limit > 256) fail("retrieve_limit_invalid", "retrieve limit must be an integer from 0 to 256", "limit");
  const needle = query.toLowerCase();
  const members = indexFixture(fixture).records
    .filter((record) => needle.length === 0 || canonicalize(record).toLowerCase().includes(needle))
    .slice(0, limit);
  return buildViewSnapshot({
    heads: [fixture.manifest.version_id],
    max_members: limit,
    members,
    snapshot_ref: "sg:view/registry-retrieval",
    view_spec: { query, stable_ref: "sg:view/registry-retrieval" },
  });
}

export const resolve = resolveRecord;
export const claims = queryClaims;
export const context = queryContext;
export const ops = queryOperations;
export const discover = queryDiscover;
export const retrieve = queryRetrieve;
