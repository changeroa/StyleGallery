#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { isPlainObject } from "./consumer-reference-schema.mjs";
import { validateGovernedProfileInventory } from "./governed-profile-registry.mjs";
import { validatePromotionAttestations } from "./promotion-attestation-contract.mjs";
import { loadPromotionFixtureInventory, resolvePromotionJsonFile } from "./promotion-fixture-inventory.mjs";
import { parseStrictJson } from "./strict-json.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = {
  files: [],
  fixtureRoot: path.join(repositoryRoot, "consumer-reference/fixtures/promotion"),
  json: false,
  policies: [],
  profileRepositoryRoot: repositoryRoot,
  profileRepositoryRootExplicit: false,
};
const argumentFailures = [];

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") options.json = true;
  else if (argument === "--file") {
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) argumentFailures.push({ code: "argument_value_required", message: "--file requires a JSON path", path: "<cli>" });
    else {
      options.files.push(path.resolve(process.cwd(), value));
      index += 1;
    }
  } else if (argument === "--policy") {
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) argumentFailures.push({ code: "argument_value_required", message: "--policy requires a JSON path", path: "<cli>" });
    else {
      options.policies.push(path.resolve(process.cwd(), value));
      index += 1;
    }
  } else if (argument === "--profile-repository-root") {
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) argumentFailures.push({ code: "argument_value_required", message: "--profile-repository-root requires a repository path", path: "<cli>" });
    else {
      options.profileRepositoryRoot = path.resolve(process.cwd(), value);
      options.profileRepositoryRootExplicit = true;
      index += 1;
    }
  } else if (argument === "--promotion-fixture-root") {
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) argumentFailures.push({ code: "argument_value_required", message: "--promotion-fixture-root requires a repository path", path: "<cli>" });
    else {
      options.fixtureRoot = path.resolve(process.cwd(), value);
      index += 1;
    }
  } else argumentFailures.push({ code: "argument_unknown", message: `unsupported argument ${argument}`, path: "<cli>" });
}

const failures = [...argumentFailures];
const warnings = [];
const fixtureInventory = loadPromotionFixtureInventory({ fixtureRoot: options.fixtureRoot, repositoryRoot });
failures.push(...fixtureInventory.failures);
let validateSchema = () => false;
try {
  if (fixtureInventory.schema) validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(fixtureInventory.schema);
} catch (error) {
  failures.push({ code: "promotion_fixture_inventory_invalid", message: error instanceof Error ? error.message : String(error), path: "consumer-reference/schema/promotion-rfc.schema.json" });
}
const files = options.files.length > 0
  ? options.files
  : options.policies.length > 0
    ? []
    : fixtureInventory.validFiles;
const policies = options.files.length === 0 && options.policies.length === 0
  ? [fixtureInventory.policyFile].filter(Boolean)
  : options.policies;

function finding(code, message, recordPath) {
  return { code, message, path: recordPath };
}

function sameStringSet(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((item) => typeof item === "string") && new Set(actual).size === expected.length && expected.every((item) => actual.includes(item));
}

function validateSemantics({ canonicalExample, value, recordPath, failures, warnings }) {
  if (!isPlainObject(value)) return;
  if (canonicalExample && (value.decision !== "deferred" || !Array.isArray(value.attestations) || value.attestations.length !== 0)) {
    failures.push(finding("promotion_canonical_example_invalid", "canonical examples must remain deferred with zero attestations", recordPath));
  }
  if (typeof value.review_independence === "boolean") failures.push(finding("review_independence_boolean", "review_independence must use the canonical single_account enum", recordPath));
  if (!isPlainObject(value.owner) || typeof value.owner.migration !== "string" || !isPlainObject(value.migration)) {
    failures.push(finding("promotion_owner_migration_required", "promotion proposals require migration ownership and a migration plan", recordPath));
  }
  if (value.compatibility?.breaking === true && value.migration?.required !== true) {
    failures.push(finding("promotion_migration_required", "breaking compatibility changes require an enabled migration plan", recordPath));
  }
  if (value.eligibility_basis === "consumer_count_only") failures.push(finding("promotion_count_only_forbidden", "consumer count cannot replace evidence and lifecycle duties", recordPath));
  if (isPlainObject(value.support) && value.transition?.to === "stable" && value.support.status === "ended") {
    failures.push(finding("stable_support_ended", "stable promotion requires active support", recordPath));
  }
  if (value.support?.status !== "active" || value.support?.capacity !== "committed") {
    failures.push(finding("promotion_support_required", "promotion eligibility requires active, affirmative support capacity", recordPath));
  }
  if (value.transition?.from === "stable" && value.transition?.to === "shared_experimental") {
    failures.push(finding("promotion_stable_relabel_forbidden", "a stable contract must be maintained, rolled back, or deprecated with migration", recordPath));
  }
  const transition = `${value.transition?.from ?? ""}->${value.transition?.to ?? ""}`;
  if (!["consumer_local->shared_experimental", "shared_experimental->stable", "stable->shared_experimental"].includes(transition)) {
    failures.push(finding("promotion_transition_invalid", `${transition} is not a governed promotion transition`, recordPath));
  }
  const evidence = Array.isArray(value.evidence) ? value.evidence.filter(isPlainObject) : [];
  const evidenceIds = evidence.map((entry) => entry.id).filter((id) => typeof id === "string");
  if (new Set(evidenceIds).size !== evidenceIds.length) failures.push(finding("promotion_evidence_duplicate", "evidence IDs must be unique", recordPath));
  if (evidence.some((entry) => entry.kind === "blocking" && entry.status === "failed")) {
    failures.push(finding("promotion_blocking_evidence_failed", "failed blocking evidence prevents eligibility", recordPath));
  }
  const regressionPassed = evidence.some((entry) => entry.kind === "regression" && entry.status === "passed");
  const claimScopedPassed = evidence.some((entry) => entry.kind === "claim_scoped" && entry.status === "passed");
  if (value.normative_bypass === "normative_correctness" && !regressionPassed) {
    failures.push(finding("promotion_normative_regression_required", "normative bypass waives adoption count only and requires passing regression evidence", recordPath));
  }
  if (value.normative_bypass === "normative_correctness" && value.scope?.kind !== "normative_correctness") {
    failures.push(finding("promotion_normative_scope_required", "normative bypass requires a normative correctness scope", recordPath));
  }
  if (value.transition?.to === "stable" && (!claimScopedPassed || !regressionPassed)) {
    failures.push(finding("promotion_stable_evidence_required", "stable requires passing claim-scoped and regression evidence", recordPath));
  }
  const attestationResult = validatePromotionAttestations({ inventory: governedProfileInventory, profileRoot: options.profileRepositoryRoot, recordPath, value });
  failures.push(...attestationResult.failures);
  const counted = attestationResult.eligibleCount;
  if (value.transition?.from === "consumer_local" && value.transition?.to === "shared_experimental" && value.normative_bypass === "none" && counted < 2) {
    warnings.push(finding("promotion_consumer_count_below_gateway", "deferred proposal has fewer than two independent consumers", recordPath));
  }
  if (value.transition?.to === "stable" && (value.stable_scope_decision !== true || value.provenance?.debt_resolved !== true)) {
    failures.push(finding("promotion_stable_readiness_required", "stable requires explicit scope decision and resolved provenance debt; no numeric count substitutes", recordPath));
  }
}

function validatePolicy(value, recordPath, failures) {
  if (!isPlainObject(value)) {
    failures.push(finding("promotion_policy_shape_invalid", "promotion policy must be an object", recordPath));
    return;
  }
  const allowed = ["artifact_mode", "boundaries", "claims", "gateway", "id", "lifecycle", "normative_bypass", "owner", "review_independence", "schema_version", "status"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) failures.push(finding("promotion_policy_shape_invalid", "promotion policy contains an unknown field", recordPath));
  const nestedShapes = [
    [value.boundaries, ["excluded_content", "promoted_content"], "boundaries"],
    [value.claims, ["adopter_attestations", "promotion_occurred"], "claims"],
    [value.gateway, ["applies_to", "minimum_independent_consumers", "stable_numeric_threshold", "transition"], "gateway"],
    [value.gateway?.transition, ["from", "to"], "gateway.transition"],
    [value.lifecycle, ["failure_actions", "stable_relabel"], "lifecycle"],
    [value.normative_bypass, ["categories", "retains", "waives"], "normative_bypass"],
    [value.owner, ["enforcement", "name"], "owner"],
  ];
  for (const [candidate, keys, label] of nestedShapes) {
    if (!isPlainObject(candidate) || Object.keys(candidate).some((key) => !keys.includes(key))) failures.push(finding("promotion_policy_shape_invalid", `promotion policy ${label} shape is invalid`, recordPath));
  }
  if (value.review_independence !== "single_account") failures.push(finding(typeof value.review_independence === "boolean" ? "review_independence_boolean" : "promotion_policy_shape_invalid", "policy review_independence must be single_account", recordPath));
  if (value.gateway?.transition?.from !== "consumer_local" || value.gateway?.transition?.to !== "shared_experimental" || value.gateway?.applies_to !== "invariant_eligibility_only" || value.gateway?.minimum_independent_consumers !== 2) {
    failures.push(finding("promotion_gateway_invalid", "the >=2 gateway applies only to consumer-local invariant eligibility for shared-experimental", recordPath));
  }
  if (value.gateway?.stable_numeric_threshold !== null) failures.push(finding("promotion_stable_numeric_threshold_forbidden", "stable has no numeric adoption threshold", recordPath));
  const categories = ["accessibility", "correctness", "security", "standards"];
  const retained = ["compatibility", "deprecation", "migration", "owner_acceptance", "regression_proof", "rollback", "scope_control", "support_capacity"];
  if (!sameStringSet(value.normative_bypass?.categories, categories) || !sameStringSet(value.normative_bypass?.waives, ["adoption_count"]) || !sameStringSet(value.normative_bypass?.retains, retained)) {
    failures.push(finding("promotion_normative_bypass_overreach", "normative bypass may waive adoption count only", recordPath));
  }
  if (value.claims?.promotion_occurred !== false || value.claims?.adopter_attestations !== 0) failures.push(finding("promotion_claim_forbidden", "the policy records no promotion and zero adopter attestations", recordPath));
  if (value.status !== "active") failures.push(finding("promotion_claim_forbidden", "the policy status must remain active governance, not a promoted decision", recordPath));
  if (value.schema_version !== "1.0" || value.id !== "shared-experimental-policy" || value.artifact_mode !== "schema_only") failures.push(finding("promotion_policy_identity_invalid", "promotion policy identity and artifact mode are canonical", recordPath));
  if (value.owner?.enforcement !== "placeholder" || value.owner?.name !== "Repository governance owner") failures.push(finding("promotion_policy_owner_invalid", "promotion policy must preserve placeholder owner truth", recordPath));
  const excluded = ["component_skin", "imagery", "motion_character", "palette", "typography"];
  const promoted = ["claim_scoped_evidence", "invariant_behavior", "invariant_semantics"];
  if (!sameStringSet(value.boundaries?.excluded_content, excluded)) {
    failures.push(finding("promotion_aesthetic_boundary_required", "aesthetic identity must remain excluded from promotion", recordPath));
  }
  if (!sameStringSet(value.boundaries?.promoted_content, promoted)) failures.push(finding("promotion_aesthetic_boundary_required", "promoted content must be the invariant-only canonical set", recordPath));
  if (value.lifecycle?.stable_relabel !== "forbidden" || !sameStringSet(value.lifecycle?.failure_actions, ["deprecate_with_migration", "maintain", "restrict", "rollback"])) {
    failures.push(finding("promotion_lifecycle_invalid", "failed stable contracts require explicit lifecycle action and migration", recordPath));
  }
}

const governedProfileInventory = validateGovernedProfileInventory({ root: options.profileRepositoryRoot });
if (options.profileRepositoryRootExplicit && governedProfileInventory.failures.length > 0) {
  failures.push(finding("promotion_profile_registry_invalid", "explicit governed profile repository must fully validate", "<profile-repository-root>"));
}
let checked = 0;
for (const file of files) {
  const recordPath = path.relative(repositoryRoot, file) || file;
  const resolvedFile = resolvePromotionJsonFile({ file, repositoryRoot }, failures);
  if (!resolvedFile) continue;
  let value;
  try {
    value = parseStrictJson(fs.readFileSync(resolvedFile, "utf8"));
    checked += 1;
  } catch (error) {
    failures.push(finding("promotion_json_invalid", error instanceof Error ? error.message : "promotion JSON is invalid", recordPath));
    continue;
  }
  validateSemantics({ canonicalExample: fixtureInventory.validFiles.includes(resolvedFile), failures, recordPath, value, warnings });
  if (!validateSchema(value)) {
    for (const error of validateSchema.errors ?? []) failures.push(finding("promotion_schema_invalid", `${error.instancePath || "/"} ${error.message}`, recordPath));
  }
}
for (const file of policies) {
  const recordPath = path.relative(repositoryRoot, file) || file;
  const resolvedFile = resolvePromotionJsonFile({ file, repositoryRoot }, failures);
  if (!resolvedFile) continue;
  try {
    const value = parseStrictJson(fs.readFileSync(resolvedFile, "utf8"));
    checked += 1;
    validatePolicy(value, recordPath, failures);
  } catch (error) {
    failures.push(finding("promotion_json_invalid", error instanceof Error ? error.message : "promotion policy JSON is invalid", recordPath));
  }
}

const uniqueFailures = [...new Map(failures.map((entry) => [`${entry.code}:${entry.path}:${entry.message}`, entry])).values()];
const result = { checked, failures: uniqueFailures, ok: uniqueFailures.length === 0, warnings };
if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else if (result.ok) process.stdout.write(`ok: ${checked} promotion proposal records\n`);
else process.stderr.write(`${result.failures.map((entry) => `${entry.code}: ${entry.path}: ${entry.message}`).join("\n")}\n`);
if (!result.ok) process.exitCode = 1;
