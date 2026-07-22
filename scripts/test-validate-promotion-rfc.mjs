#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { copyTreeNoSymlinks, testPromotionBoundaries } from "./promotion-boundary-test-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(repositoryRoot, "consumer-reference/fixtures/promotion");
const validator = path.join(repositoryRoot, "scripts/validate-promotion-rfc.mjs");

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(fixtureRoot, relative), "utf8"));
}

function runArguments(args) {
  const child = spawnSync(process.execPath, [validator, ...args], { cwd: repositoryRoot, encoding: "utf8" });
  let report = { failures: [], ok: false, parse_error: true };
  try {
    report = JSON.parse(child.stdout);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    report = { failures: [], ok: false, parse_error: true };
  }
  return { report, status: child.status };
}

function run(file, profileRepositoryRoot) {
  const args = ["--file", file, "--json"];
  if (profileRepositoryRoot) args.push("--profile-repository-root", profileRepositoryRoot);
  return runArguments(args);
}

function runPolicy(file) {
  return runArguments(["--policy", file, "--json"]);
}

function writeMutation(name, source, mutate) {
  const value = structuredClone(readJson(source));
  mutate(value);
  const file = path.join(tempRoot, `${name}.json`);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  return file;
}

function writePolicyMutation(root, name, mutate) {
  const value = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "consumer-reference/policies/shared-experimental.json"), "utf8"));
  mutate(value);
  const file = path.join(root, `${name}.json`);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  return file;
}

function copyProfileRepository(name) {
  const root = path.join(tempRoot, name);
  const source = path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local");
  const target = path.join(root, "design-engineering/reference-profiles/governed-local");
  copyTreeNoSymlinks(source, target);
  return root;
}

function editProfileJson(root, relative, mutate) {
  const file = path.join(root, relative);
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  mutate(value);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

const fixtureManifest = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "manifest.json"), "utf8"));
const invalidCases = fixtureManifest.invalid_records.map((entry) => [entry.file.replace(/\.json$/, ""), entry.file, entry.expected_code]);

const tempRoot = fs.mkdtempSync(path.join(repositoryRoot, ".tmp-pr6-promotion-"));
const repositoryTempRoot = fs.mkdtempSync(path.join(repositoryRoot, ".tmp-pr6-profile-"));
const results = [];
try {
  for (const [name, relative, expected] of invalidCases) {
    const child = run(path.join(fixtureRoot, relative));
    const codes = child.report.failures.map((failure) => failure.code);
    results.push({ actual: { codes, scaffold: child.report.scaffold === true, status: child.status }, expected, name, ok: child.status > 0 && codes.includes(expected) && child.report.scaffold !== true });
  }

  const editorial = writeMutation("editorial_counted", "valid-deferred-example.json", (value) => {
    value.attestations = [{ attested_by: "Synthetic owner", context_id: "editorial", consumer_id: "editorial-reference-profile", count_toward_gate: true, organization_id: "stylegallery", profile_record: "design-engineering/reference-profiles/governed-local/editorial/profile.json", relationship: "independent" }];
  });
  const terminal = writeMutation("terminal_counted", "valid-deferred-example.json", (value) => {
    value.attestations = [{ attested_by: "Synthetic owner", context_id: "terminal", consumer_id: "terminal-reference-profile", count_toward_gate: true, organization_id: "stylegallery", profile_record: "design-engineering/reference-profiles/governed-local/terminal/profile.json", relationship: "independent" }];
  });
  const booleanReview = writeMutation("boolean_review", "valid-deferred-example.json", (value) => { value.review_independence = false; });
  const fakeIndependence = writeMutation("fake_independence", "valid-deferred-example.json", (value) => {
    value.attestations = [
      { attested_by: "Synthetic owner", context_id: "one", consumer_id: "consumer-one", count_toward_gate: true, organization_id: "same-org", relationship: "independent" },
      { attested_by: "Synthetic owner", context_id: "two", consumer_id: "consumer-two", count_toward_gate: true, organization_id: "same-org", relationship: "independent" }
    ];
  });
  const duplicateIdentity = writeMutation("duplicate_identity", "valid-deferred-example.json", (value) => {
    const attestation = { attested_by: "Synthetic owner", context_id: "same", consumer_id: "same-consumer", count_toward_gate: true, organization_id: "same-org", relationship: "independent" };
    value.attestations = [attestation, structuredClone(attestation)];
  });
  const duplicateConsumer = writeMutation("duplicate_consumer", "valid-deferred-example.json", (value) => {
    value.attestations = [
      { attested_by: "Synthetic owner A", context_id: "one", consumer_id: "same-consumer", count_toward_gate: true, organization_id: "organization-a", relationship: "independent" },
      { attested_by: "Synthetic owner B", context_id: "two", consumer_id: "same-consumer", count_toward_gate: true, organization_id: "organization-b", relationship: "independent" }
    ];
  });
  const unknownConsumers = writeMutation("unknown_consumers", "valid-deferred-example.json", (value) => {
    value.attestations = [
      { attested_by: "Synthetic owner A", context_id: "one", consumer_id: "unknown-one", count_toward_gate: true, organization_id: "organization-a", relationship: "independent" },
      { attested_by: "Synthetic owner B", context_id: "two", consumer_id: "unknown-two", count_toward_gate: true, organization_id: "organization-b", relationship: "independent" }
    ];
  });
  const forgedOne = path.join(repositoryTempRoot, "forged-one.json");
  const forgedTwo = path.join(repositoryTempRoot, "forged-two.json");
  fs.writeFileSync(forgedOne, '{"fixture_independence":"independent","id":"forged-one"}\n');
  fs.writeFileSync(forgedTwo, '{"fixture_independence":"independent","id":"forged-two"}\n');
  const forgedProfiles = writeMutation("forged_profiles", "valid-deferred-example.json", (value) => {
    value.attestations = [
      { attested_by: "Synthetic owner A", context_id: "one", consumer_id: "forged-one", count_toward_gate: true, organization_id: "organization-a", profile_record: path.relative(repositoryRoot, forgedOne), relationship: "independent" },
      { attested_by: "Synthetic owner B", context_id: "two", consumer_id: "forged-two", count_toward_gate: true, organization_id: "organization-b", profile_record: path.relative(repositoryRoot, forgedTwo), relationship: "independent" }
    ];
  });
  const copiedProfileRoot = path.join(repositoryTempRoot, "copied");
  copyTreeNoSymlinks(path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local/editorial"), copiedProfileRoot);
  const copiedUnregistered = writeMutation("copied_unregistered", "valid-deferred-example.json", (value) => {
    value.attestations = [{ attested_by: "Synthetic owner", context_id: "copied", consumer_id: "editorial-reference-profile", count_toward_gate: true, organization_id: "copied-org", profile_record: path.relative(repositoryRoot, path.join(copiedProfileRoot, "profile.json")), relationship: "independent" }];
  });
  const invalidRegisteredRoot = copyProfileRepository("invalid-registered-root");
  editProfileJson(invalidRegisteredRoot, "design-engineering/reference-profiles/governed-local/editorial/profile.json", (value) => { delete value.owner; });
  const invalidRegistered = writeMutation("invalid_registered", "valid-deferred-example.json", (value) => {
    value.attestations = [{ attested_by: "Synthetic owner", context_id: "invalid", consumer_id: "editorial-reference-profile", count_toward_gate: true, organization_id: "invalid-org", profile_record: "design-engineering/reference-profiles/governed-local/editorial/profile.json", relationship: "independent" }];
  });
  const duplicateRegistryRoot = copyProfileRepository("duplicate-registry-root");
  editProfileJson(duplicateRegistryRoot, "design-engineering/reference-profiles/governed-local/terminal/profile.json", (value) => { value.id = "editorial-reference-profile"; });
  const duplicateRegistryIdentity = writeMutation("duplicate_registry_identity", "valid-deferred-example.json", (value) => {
    value.attestations = [{ attested_by: "Synthetic owner", context_id: "duplicate", consumer_id: "editorial-reference-profile", count_toward_gate: true, organization_id: "duplicate-org", profile_record: "design-engineering/reference-profiles/governed-local/editorial/profile.json", relationship: "independent" }];
  });
  const silentRelabel = writeMutation("silent_relabel", "valid-deferred-example.json", (value) => {
    value.transition = { from: "stable", to: "shared_experimental" };
  });
  const pathEscape = writeMutation("path_escape", "valid-deferred-example.json", (value) => {
    value.attestations = [{ attested_by: "Synthetic owner", context_id: "escape", consumer_id: "escape", count_toward_gate: true, organization_id: "escape", profile_record: "../outside.json", relationship: "independent" }];
  });
  const profileMismatch = writeMutation("profile_mismatch", "valid-deferred-example.json", (value) => {
    value.attestations = [{ attested_by: "Synthetic owner", context_id: "editorial", consumer_id: "different-profile", count_toward_gate: true, organization_id: "stylegallery", profile_record: "design-engineering/reference-profiles/governed-local/editorial/profile.json", relationship: "independent" }];
  });
  const profileLink = path.join(repositoryTempRoot, "profile.json");
  fs.symlinkSync(path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local/editorial/profile.json"), profileLink);
  const profileSymlink = writeMutation("profile_symlink", "valid-deferred-example.json", (value) => {
    value.attestations = [{ attested_by: "Synthetic owner", context_id: "editorial", consumer_id: "editorial-reference-profile", count_toward_gate: true, organization_id: "stylegallery", profile_record: path.relative(repositoryRoot, profileLink), relationship: "independent" }];
  });
  const schemaExtra = writeMutation("schema_extra", "valid-deferred-example.json", (value) => { value.unexpected_promotion = true; });
  const acceptedDecision = writeMutation("accepted_decision", "valid-deferred-example.json", (value) => { value.decision = "accepted"; });
  const aestheticPromotion = writeMutation("aesthetic_promotion", "valid-deferred-example.json", (value) => { value.scope.aesthetic = true; });
  const breakingWithoutMigration = writeMutation("breaking_without_migration", "valid-deferred-example.json", (value) => { value.compatibility.breaking = true; value.migration.required = false; });
  const normativeWithoutRollback = writeMutation("normative_without_rollback", "valid-normative-bypass.json", (value) => { delete value.rollback; });
  const normativeEndedSupport = writeMutation("normative_ended_support", "valid-normative-bypass.json", (value) => {
    value.support = { capacity: "No active support capacity", status: "ended" };
  });
  const normativeMissingSupport = writeMutation("normative_missing_support", "valid-normative-bypass.json", (value) => { delete value.support; });
  const normativeMissingCapacity = writeMutation("normative_missing_capacity", "valid-normative-bypass.json", (value) => { delete value.support.capacity; });
  const weakCapacityCases = ["0", "Not available", "Absent", "Lapsed", "Negative capacity"].map((capacity, index) => [
    `weak_capacity_${index + 1}`,
    writeMutation(`weak_capacity_${index + 1}`, "valid-deferred-example.json", (value) => { value.support.capacity = capacity; }),
    "promotion_support_required",
  ]);
  const stableWithoutCount = writeMutation("stable_without_count", "valid-deferred-example.json", (value) => {
    value.transition = { from: "shared_experimental", to: "stable" };
    value.stable_scope_decision = true;
    value.provenance.debt_resolved = true;
  });
  const stableWithoutEvidence = writeMutation("stable_without_evidence", "valid-deferred-example.json", (value) => {
    value.transition = { from: "shared_experimental", to: "stable" };
    value.stable_scope_decision = true;
    value.provenance.debt_resolved = true;
    value.evidence = [{ id: "regression", kind: "regression", reference: "synthetic-fixture:regression", status: "failed" }];
  });
  const duplicateKey = path.join(tempRoot, "duplicate_key.json");
  fs.writeFileSync(duplicateKey, fs.readFileSync(path.join(fixtureRoot, "valid-deferred-example.json"), "utf8").replace('"decision": "deferred",', '"decision": "deferred",\n  "decision": "rejected",'));
  for (const [name, file, expected, profileRepositoryRoot] of [
    ["editorial_counted", editorial, "promotion_related_consumer_counted"],
    ["terminal_counted", terminal, "promotion_related_consumer_counted"],
    ["boolean_review", booleanReview, "review_independence_boolean"],
    ["fake_independence", fakeIndependence, "promotion_independence_unproven"],
    ["duplicate_identity", duplicateIdentity, "promotion_attestation_duplicate"],
    ["duplicate_consumer", duplicateConsumer, "promotion_attestation_duplicate"],
    ["unknown_consumers", unknownConsumers, "promotion_independence_unproven"],
    ["forged_profiles", forgedProfiles, "promotion_independence_unproven"],
    ["copied_unregistered", copiedUnregistered, "promotion_independence_unproven"],
    ["invalid_registered", invalidRegistered, "promotion_independence_unproven", invalidRegisteredRoot],
    ["duplicate_registry_identity", duplicateRegistryIdentity, "promotion_independence_unproven", duplicateRegistryRoot],
    ["silent_relabel", silentRelabel, "promotion_stable_relabel_forbidden"],
    ["path_escape", pathEscape, "promotion_profile_path_invalid"],
    ["profile_mismatch", profileMismatch, "promotion_profile_identity_mismatch"],
    ["profile_symlink", profileSymlink, "promotion_profile_path_symlink"],
    ["schema_extra", schemaExtra, "promotion_schema_invalid"],
    ["accepted_decision", acceptedDecision, "promotion_schema_invalid"],
    ["aesthetic_promotion", aestheticPromotion, "promotion_schema_invalid"],
    ["breaking_without_migration", breakingWithoutMigration, "promotion_migration_required"],
    ["normative_without_rollback", normativeWithoutRollback, "promotion_schema_invalid"],
    ["normative_ended_support", normativeEndedSupport, "promotion_support_required"],
    ["normative_missing_support", normativeMissingSupport, "promotion_support_required"],
    ["normative_missing_capacity", normativeMissingCapacity, "promotion_support_required"],
    ["duplicate_key", duplicateKey, "promotion_json_invalid"],
    ["stable_without_evidence", stableWithoutEvidence, "promotion_stable_evidence_required"],
    ...weakCapacityCases,
  ]) {
    const child = run(file, profileRepositoryRoot);
    const codes = child.report.failures.map((failure) => failure.code);
    results.push({ actual: { codes, scaffold: child.report.scaffold === true, status: child.status }, expected, name, ok: child.status > 0 && codes.includes(expected) && child.report.scaffold !== true });
  }

  for (const relative of ["valid-deferred-example.json", "valid-normative-bypass.json"]) {
    const child = run(path.join(fixtureRoot, relative));
    results.push({ actual: { scaffold: child.report.scaffold === true, status: child.status }, expected: "ok:true", name: relative, ok: child.status === 0 && child.report.ok === true && child.report.scaffold !== true });
  }
  const stable = run(stableWithoutCount);
  results.push({ actual: { scaffold: stable.report.scaffold === true, status: stable.status }, expected: "stable_without_numeric_threshold", name: "stable_without_count", ok: stable.status === 0 && stable.report.ok === true && stable.report.scaffold !== true });
  const canonicalPolicy = runPolicy(path.join(repositoryRoot, "consumer-reference/policies/shared-experimental.json"));
  results.push({ actual: { status: canonicalPolicy.status }, expected: "canonical_policy_valid", name: "canonical_policy", ok: canonicalPolicy.status === 0 && canonicalPolicy.report.ok === true });
  results.push(...testPromotionBoundaries({ fixtureRoot, repositoryRoot, runArguments, tempRoot }));
  for (const [name, file, expected] of [
    ["stable_numeric_count", writePolicyMutation(tempRoot, "stable_numeric_count", (value) => { value.gateway.stable_numeric_threshold = 2; }), "promotion_stable_numeric_threshold_forbidden"],
    ["bypass_overreach", writePolicyMutation(tempRoot, "bypass_overreach", (value) => { value.normative_bypass.waives.push("regression_proof"); }), "promotion_normative_bypass_overreach"],
    ["fake_promotion_claim", writePolicyMutation(tempRoot, "fake_promotion_claim", (value) => { value.claims.promotion_occurred = true; }), "promotion_claim_forbidden"],
    ["policy_unknown_field", writePolicyMutation(tempRoot, "policy_unknown_field", (value) => { value.accepted = true; }), "promotion_policy_shape_invalid"],
    ["policy_nested_unknown", writePolicyMutation(tempRoot, "policy_nested_unknown", (value) => { value.gateway.stable_by_count = true; }), "promotion_policy_shape_invalid"],
    ["policy_promotes_palette", writePolicyMutation(tempRoot, "policy_promotes_palette", (value) => { value.boundaries.promoted_content.push("palette"); }), "promotion_aesthetic_boundary_required"],
    ["policy_promotes_alias", writePolicyMutation(tempRoot, "policy_promotes_alias", (value) => { value.boundaries.promoted_content.push("brand_identity"); }), "promotion_aesthetic_boundary_required"],
    ["policy_promoted_non_string", writePolicyMutation(tempRoot, "policy_promoted_non_string", (value) => { value.boundaries.promoted_content = [42]; }), "promotion_aesthetic_boundary_required"],
    ["policy_normative_aesthetic", writePolicyMutation(tempRoot, "policy_normative_aesthetic", (value) => { value.normative_bypass.categories = ["aesthetic"]; }), "promotion_normative_bypass_overreach"],
    ["policy_lifecycle_incomplete", writePolicyMutation(tempRoot, "policy_lifecycle_incomplete", (value) => { value.lifecycle.failure_actions = ["deprecate_with_migration"]; }), "promotion_lifecycle_invalid"],
    ["policy_excluded_non_string", writePolicyMutation(tempRoot, "policy_excluded_non_string", (value) => { value.boundaries.excluded_content.push(42); }), "promotion_aesthetic_boundary_required"],
    ["policy_retains_non_string", writePolicyMutation(tempRoot, "policy_retains_non_string", (value) => { value.normative_bypass.retains.push(42); }), "promotion_normative_bypass_overreach"],
    ["policy_verified_owner", writePolicyMutation(tempRoot, "policy_verified_owner", (value) => { value.owner.enforcement = "verified"; }), "promotion_policy_owner_invalid"],
    ["policy_promoted_status", writePolicyMutation(tempRoot, "policy_promoted_status", (value) => { value.status = "promoted"; }), "promotion_claim_forbidden"],
    ["policy_generated_mode", writePolicyMutation(tempRoot, "policy_generated_mode", (value) => { value.artifact_mode = "generated"; }), "promotion_policy_identity_invalid"],
  ]) {
    const child = runPolicy(file);
    const codes = child.report.failures.map((failure) => failure.code);
    results.push({ actual: { codes, status: child.status }, expected, name, ok: child.status > 0 && codes.includes(expected) });
  }
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
  fs.rmSync(repositoryTempRoot, { force: true, recursive: true });
}

const failures = results.filter((result) => !result.ok).map((result) => `missing_semantic:${result.name}:${result.expected}`);
const report = { failures, ok: failures.length === 0, results };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
