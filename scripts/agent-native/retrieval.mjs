import { cloneAndFreeze, canonicalize, hashCanonical } from "./canonical-json.mjs";
import { createStableRef } from "./identity.mjs";

function pick(value, ...keys) {
  if (!value || typeof value !== "object") return undefined;
  for (const key of keys) if (Object.hasOwn(value, key)) return value[key];
  return undefined;
}

function objectInput(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} expects an object`);
  return value;
}

function copy(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function canonicalFreeze(value) {
  return cloneAndFreeze(JSON.parse(canonicalize(value)));
}

function refOf(value) {
  return pick(value, "stable_ref", "stableRef", "ref", "id") ?? "";
}

function versionOf(value) {
  return pick(value, "version_id", "versionId", "version") ?? "";
}

function memberReference(member) {
  const reference = {};
  const stableRef = refOf(member);
  const versionId = versionOf(member);
  const contentHash = pick(member, "content_sha256", "contentHash", "sha256");
  if (stableRef) reference.stable_ref = stableRef;
  if (versionId) reference.version_id = versionId;
  if (contentHash) reference.content_sha256 = contentHash;
  return reference;
}

function sortedUniqueStrings(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new TypeError("heads must be an array");
  return [...new Set(value.map((item) => {
    if (typeof item !== "string" || item.length === 0) throw new TypeError("head IDs must be non-empty strings");
    return item;
  }))].sort();
}

function normalizeMembers(value, maxMembers = 256) {
  const source = value ?? [];
  if (!Array.isArray(source)) throw new TypeError("members must be an array");
  if (!Number.isInteger(maxMembers) || maxMembers < 0) throw new TypeError("maxMembers must be a non-negative integer");
  const members = source.map((member) => {
    if (!member || typeof member !== "object" || Array.isArray(member)) throw new TypeError("members must contain objects");
    return copy(member);
  });
  members.sort((left, right) => {
    const leftRef = String(refOf(left));
    const rightRef = String(refOf(right));
    const byRef = leftRef < rightRef ? -1 : leftRef > rightRef ? 1 : 0;
    if (byRef) return byRef;
    const leftVersion = String(versionOf(left));
    const rightVersion = String(versionOf(right));
    const byVersion = leftVersion < rightVersion ? -1 : leftVersion > rightVersion ? 1 : 0;
    if (byVersion) return byVersion;
    const leftCanonical = canonicalize(left);
    const rightCanonical = canonicalize(right);
    return leftCanonical < rightCanonical ? -1 : leftCanonical > rightCanonical ? 1 : 0;
  });
  return { members: members.slice(0, maxMembers), truncated: members.length > maxMembers };
}

function snapshotIdentity(payload, stableRef, recordKind) {
  const versionPayload = {
    schema_version: "1.0",
    record_kind: recordKind,
    stable_ref: stableRef,
    ...payload,
  };
  const digest = hashCanonical(versionPayload);
  return {
    version_id: `${stableRef}@${digest}`,
    sha256: digest,
    cache_key: `${stableRef}@${digest}`,
  };
}

/** Build a bounded, immutable, source-preserving retrieval view. */
export function buildViewSnapshot(input) {
  const source = objectInput(input, "buildViewSnapshot");
  const rawView = pick(source, "view_spec", "viewSpec") ?? {};
  const viewSpec = copy(rawView);
  const stableRef = pick(source, "snapshot_ref", "snapshotRef")
    ?? pick(viewSpec, "stable_ref", "stableRef")
    ?? "sg:view/snapshot";
  const canonicalStableRef = createStableRef(stableRef);
  const requestedLimit = pick(source, "max_members", "maxMembers", "limit");
  const maxMembers = requestedLimit === undefined ? 256 : Number(requestedLimit);
  if (!Number.isInteger(maxMembers) || maxMembers < 0) throw new TypeError("maxMembers must be a non-negative integer");
  const normalized = normalizeMembers(pick(source, "members", "entries", "items"), maxMembers);
  const payload = {
    as_of: pick(source, "as_of", "asOf"),
    builder_version: pick(source, "builder_version", "builderVersion") ?? "retriever@1",
    heads: sortedUniqueStrings(pick(source, "heads", "event_heads", "eventHeads")),
    members: normalized.members,
    policy: copy(pick(source, "policy", "policy_ref", "policyRef")),
    snapshot_ref: canonicalStableRef,
    truncated: normalized.truncated,
    transaction_at: pick(source, "transaction_at", "transactionAt", "transaction_watermark", "transactionWatermark"),
    valid_at: pick(source, "valid_at", "validAt", "valid_watermark", "validWatermark"),
    view_spec: viewSpec,
  };
  for (const [key, value] of Object.entries(payload)) if (value === undefined) delete payload[key];
  const supplied = pick(source, "version_id", "versionId");
  const identity = snapshotIdentity(payload, canonicalStableRef, "view_snapshot");
  if (supplied !== undefined && supplied !== identity.version_id) throw new TypeError("snapshot version_id does not match content");
  return canonicalFreeze({ schema_version: "1.0", record_kind: "view_snapshot", stable_ref: canonicalStableRef, ...payload, ...identity });
}

export const createViewSnapshot = buildViewSnapshot;

function estimateTokens(member) {
  const text = pick(member, "content", "text", "summary") ?? canonicalize(member);
  return Math.max(1, Math.ceil(String(text).length / 4));
}

/** Build a deterministic, budget-bounded context package linked to a snapshot. */
export function buildContextPackage(input) {
  const source = objectInput(input, "buildContextPackage");
  const snapshot = pick(source, "snapshot");
  const view = snapshot && typeof snapshot === "object"
    ? snapshot
    : buildViewSnapshot({ ...source, viewSpec: { stableRef: "sg:view/context" } });
  const suppliedMembers = pick(source, "members", "entries", "items") ?? pick(view, "members", "entries", "items") ?? [];
  const normalized = normalizeMembers(suppliedMembers, Number(pick(source, "max_members", "maxMembers") ?? 256));
  const budgetInput = pick(source, "budget") ?? {};
  const tokenBudget = Number(typeof budgetInput === "number" ? budgetInput : pick(budgetInput, "tokens", "token_budget", "tokenBudget") ?? 0);
  if (!Number.isInteger(tokenBudget) || tokenBudget < 0) throw new TypeError("budget.tokens must be a non-negative integer");
  let usedTokens = 0;
  const members = [];
  for (const member of normalized.members) {
    const cost = estimateTokens(member);
    if (usedTokens + cost > tokenBudget) break;
    members.push(member);
    usedTokens += cost;
  }
  const payload = {
    budget: { tokens: tokenBudget, used_tokens: usedTokens, truncated: members.length < normalized.members.length },
    members,
    member_refs: members.map(memberReference).filter((member) => Object.keys(member).length > 0),
    member_manifest: members.map(memberReference).filter((member) => Object.keys(member).length > 0),
    policy: copy(pick(source, "policy", "policy_ref", "policyRef") ?? pick(view, "policy", "policy_ref", "policyRef")),
    query: pick(source, "query"),
    query_class: pick(source, "query_class", "queryClass"),
    retriever: pick(source, "retriever"),
    selectors: copy(pick(source, "selectors", "selector")),
    snapshot: pick(view, "version_id", "versionId") ?? pick(view, "snapshot_ref", "snapshotRef", "stable_ref", "stableRef"),
    snapshot_ref: pick(view, "snapshot_ref", "snapshotRef", "stable_ref", "stableRef"),
    snapshot_version_id: pick(view, "version_id", "versionId"),
    assembly_receipt: copy(pick(source, "assembly_receipt", "assemblyReceipt")),
  };
  for (const [key, value] of Object.entries(payload)) if (value === undefined) delete payload[key];
  const stableRef = pick(source, "context_ref", "contextRef") ?? "sg:view/context";
  const canonicalStableRef = createStableRef(stableRef);
  const identity = snapshotIdentity(payload, canonicalStableRef, "context_package");
  return canonicalFreeze({ schema_version: "1.0", record_kind: "context_package", stable_ref: canonicalStableRef, ...payload, ...identity });
}

export const createContextPackage = buildContextPackage;
