import { hashCanonical, canonicalize, deepFreeze } from "../canonical-json.mjs";
import { materialAdmissionPolicy } from "./material-admission.mjs";
import {
  captureMaterialQuerySnapshot,
  MATERIAL_GET_MAX_BYTES,
  materialGet,
  materialSearch,
  rethrowMaterialQuerySnapshotError,
  verifyMaterialQuerySnapshot,
} from "./material-queries.mjs";

export const MATERIAL_CONTEXT_DEFAULT_TOKENS = 8192;
export const MATERIAL_CONTEXT_MIN_TOKENS = 256;
export const MATERIAL_CONTEXT_MAX_TOKENS = 32768;
export const MATERIAL_CONTEXT_OPERATION_VERSION = "material-context@1";
export const MATERIAL_CONTEXT_TOKEN_CONTRACT = "ceil(canonical UTF-8 response bytes / 4)";
export const MATERIAL_CONTEXT_CACHE_CONTRACT = "material-context-cache@1";

const TRUST_INPUTS = new Set([
  "claim", "claims", "evidence", "evidence_links", "governance", "governance_decisions",
  "merge", "merge_flags", "merge_trust", "policy_dispositions", "trust_records", "validations",
]);
const PATH_INPUTS = new Set(["path", "repository_path", "repository_paths", "repository_root"]);
const MANIFEST_INPUTS = new Set(["manifest", "manifest_head", "manifest_override", "manifest_version_id"]);

export class MaterialContextError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = "MaterialContextError";
    this.code = code;
  }
}

function fail(code, message) { throw new MaterialContextError(code, message); }
function unsafeInput() { fail("material_context_input_unsafe", "material context input must be plain JSON data"); }
function snapshotOwnData(value, seen = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) unsafeInput();
    return value;
  }
  if (!value || typeof value !== "object" || seen.has(value)) unsafeInput();
  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== (array ? Array.prototype : Object.prototype) && prototype !== null) unsafeInput();
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string" || key === "__proto__" || key === "prototype" || key === "constructor")) unsafeInput();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (keys.some((key) => !Object.hasOwn(descriptors[key], "value") || (descriptors[key].enumerable !== true && !(array && key === "length")))) unsafeInput();
  if (array && (keys.some((key) => key !== "length" && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length))
    || descriptors.length?.enumerable !== false)) unsafeInput();
  seen.add(value);
  const clone = array ? [] : Object.create(null);
  for (const key of keys) {
    if (array && key === "length") continue;
    clone[key] = snapshotOwnData(descriptors[key].value, seen);
  }
  seen.delete(value);
  return clone;
}
function assertInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("material_input_invalid", "input must be an object");
  const snapshot = snapshotOwnData(input);
  const keys = Object.keys(snapshot);
  if (keys.some((key) => TRUST_INPUTS.has(key) || /^(claim|evidence|governance|policy|trust|validation)(?:_|$)/.test(key) || key.includes("merge"))) {
    fail("material_context_trust_merge_forbidden", "trust records cannot be merged into material retrieval");
  }
  if (keys.some((key) => PATH_INPUTS.has(key) || /^(repository|source)_paths?$/.test(key))) {
    fail("material_context_repository_path_forbidden", "repository paths are not caller inputs");
  }
  if (keys.some((key) => MANIFEST_INPUTS.has(key) || key.startsWith("manifest_"))) {
    fail("material_context_manifest_override_forbidden", "the material manifest cannot be overridden");
  }
  if (keys.some((key) => key !== "query" && key !== "budget_tokens")) fail("material_input_unknown", "input contains an unsupported field");
  const budgetTokens = snapshot.budget_tokens ?? MATERIAL_CONTEXT_DEFAULT_TOKENS;
  if (!Number.isInteger(budgetTokens) || budgetTokens < MATERIAL_CONTEXT_MIN_TOKENS || budgetTokens > MATERIAL_CONTEXT_MAX_TOKENS) {
    fail("material_context_budget_invalid", "budget_tokens must be an integer from 256 to 32768");
  }
  return { budgetTokens, query: snapshot.query };
}

function withoutCacheKey(context) {
  const value = structuredClone(context);
  delete value.cache_key;
  return value;
}

/** Recompute the canonical cache key. The key binds every output field except itself. */
export function materialContextCacheKey(context) {
  return hashCanonical({ contract: MATERIAL_CONTEXT_CACHE_CONTRACT, output: withoutCacheKey(context) });
}

/** Count the complete successful operation response, not only excerpt bodies. */
export function countMaterialContextTokens(context) {
  const response = { ok: true, operation: "material-context", result: context };
  return Math.ceil(Buffer.byteLength(canonicalize(response), "utf8") / 4);
}

function finalizeContext(value) {
  const context = structuredClone(value);
  context.cache_key = "sha256:" + "0".repeat(64);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    context.cache_key = materialContextCacheKey(context);
    const count = countMaterialContextTokens(context);
    if (context.budget.used_tokens === count) {
      context.cache_key = materialContextCacheKey(context);
      return deepFreeze(context);
    }
    context.budget.used_tokens = count;
  }
  fail("material_context_accounting_failed", "material context accounting did not converge");
}

function contextValue({ normalizedQuery, tokens, manifestVersionId, totalMatches, budgetTokens, excerpts }) {
  const truncated = excerpts.length < totalMatches || excerpts.some((excerpt) => excerpt.truncated);
  return finalizeContext({
    schema_version: "2.0",
    record_kind: "material_context",
    operation_version: MATERIAL_CONTEXT_OPERATION_VERSION,
    normalized_query: normalizedQuery,
    query_tokens: tokens,
    heads: {
      manifest_ref: "sg:manifest/material-admission-v2",
      manifest_version_id: manifestVersionId,
      policy_ref: materialAdmissionPolicy.stable_ref,
      policy_version_id: materialAdmissionPolicy.version_id,
    },
    member_manifest: excerpts.map(({ source }) => ({
      stable_ref: source.stable_ref,
      version_id: source.version_id,
      sha256: source.sha256,
    })),
    budget: {
      limit_tokens: budgetTokens,
      used_tokens: 0,
      token_count_contract: MATERIAL_CONTEXT_TOKEN_CONTRACT,
    },
    untrusted_retrieval: {
      classification: "untrusted_material_excerpts",
      retrieval_only: true,
      total_matches: totalMatches,
      truncated,
      excerpts,
    },
  });
}

function excerptOf(page, content) {
  const bytes = Buffer.from(content, "utf8");
  return {
    material_ref: page.identity.stable_ref,
    source: {
      stable_ref: page.source.stable_ref,
      version_id: page.source.version_id,
      sha256: page.source.source_sha256,
      byte_offset: page.offset,
      byte_length: bytes.byteLength,
    },
    truncated: page.offset + bytes.byteLength < page.source.byte_length,
    content,
  };
}

function codePointPrefixes(content) {
  const prefixes = [""];
  let current = "";
  for (const point of content) {
    current += point;
    prefixes.push(current);
  }
  return prefixes;
}

/** Build a closed, read-only v2 material retrieval package. No source body cache is retained. */
export function materialContext({ repositoryRoot, input, fileSystem, sourceReader, gitRunner }) {
  const { budgetTokens, query } = assertInput(input);
  const transaction = captureMaterialQuerySnapshot({ repositoryRoot, fileSystem, gitRunner });
  let search;
  try {
    search = materialSearch({
      repositoryRoot,
      input: { query, limit: 100 },
      fileSystem,
      sourceReader,
      gitRunner,
      snapshot: transaction,
    });
  } catch (error) {
    rethrowMaterialQuerySnapshotError({ snapshot: transaction, error, fileSystem });
  }
  const normalizedQuery = search.scoring_tokens.join(" ");
  const pages = [];
  let excerpts = [];

  // Membership is a maximal rank-ordered prefix at one code point per source.
  // It is therefore deterministic and monotonic as the caller budget grows.
  for (const result of search.results) {
    const current = contextValue({ normalizedQuery, tokens: search.scoring_tokens, manifestVersionId: search.manifest_version_id, totalMatches: search.total_matches, budgetTokens, excerpts });
    const remainingBytes = Math.max(4, (budgetTokens - current.budget.used_tokens) * 4);
    let page;
    try {
      page = materialGet({
        repositoryRoot,
        input: { reference: result.source.stable_ref, offset: 0, length: Math.min(result.source.byte_length, MATERIAL_GET_MAX_BYTES, remainingBytes) },
        fileSystem,
        sourceReader,
        gitRunner,
        snapshot: transaction,
        contextUtf8SafeEnd: true,
      });
    } catch (error) {
      rethrowMaterialQuerySnapshotError({ snapshot: transaction, error, fileSystem });
    }
    const prefixes = codePointPrefixes(page.content);
    const minimum = prefixes[Math.min(1, prefixes.length - 1)];
    const candidate = [...excerpts, excerptOf(page, minimum)];
    const packaged = contextValue({ normalizedQuery, tokens: search.scoring_tokens, manifestVersionId: search.manifest_version_id, totalMatches: search.total_matches, budgetTokens, excerpts: candidate });
    if (packaged.budget.used_tokens > budgetTokens) break;
    excerpts = candidate;
    pages.push({ result, page, prefixes });
  }

  // Spend remaining budget in rank order without changing membership.
  for (let index = 0; index < pages.length; index += 1) {
    const { page, prefixes } = pages[index];
    let low = 1;
    let high = prefixes.length - 1;
    let best = excerpts[index].content;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const candidateExcerpts = excerpts.slice();
      candidateExcerpts[index] = excerptOf(page, prefixes[middle]);
      const packaged = contextValue({ normalizedQuery, tokens: search.scoring_tokens, manifestVersionId: search.manifest_version_id, totalMatches: search.total_matches, budgetTokens, excerpts: candidateExcerpts });
      if (packaged.budget.used_tokens <= budgetTokens) { best = prefixes[middle]; low = middle + 1; }
      else high = middle - 1;
    }
    excerpts[index] = excerptOf(page, best);
  }

  const context = contextValue({ normalizedQuery, tokens: search.scoring_tokens, manifestVersionId: search.manifest_version_id, totalMatches: search.total_matches, budgetTokens, excerpts });
  if (context.budget.used_tokens > budgetTokens) fail("material_context_budget_too_small", "budget cannot contain the material context envelope");
  verifyMaterialQuerySnapshot({
    repositoryRoot,
    snapshot: transaction,
    selectedSourceRefs: excerpts.map((excerpt) => excerpt.source.stable_ref),
    fileSystem,
    sourceReader,
    gitRunner,
  });
  return context;
}
