#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { BASELINE_METADATA_SHA256, BASELINE_REFERENCE, sha256 } from "./baseline-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const validator = path.join(repositoryRoot, "scripts", "validate-baseline-manifest.mjs");
const canonical = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "consumer-reference", "baselines", "calibration.json"), "utf8"));
const canonicalManifest = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "consumer-reference", "baselines", "manifest.json"), "utf8"));
const schema = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "consumer-reference", "schema", "calibration-record.schema.json"), "utf8"));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-pr4-calibration-"));
const executionRepositories = ["ark-jo/StyleGallery", "changeroa/StyleGallery"];
const completedEvidence = {
  artifactId: "8283099324",
  artifactName: "chromium-sentinel-calibration-29260372260-18229be570766d3b42f5600955120bfcba690b76",
  artifactApiDigest: "sha256:3f11a517b447e1b5a1da17d9ee66ba2dd947fc8a0a482c447556ef00652e6074",
  artifactExpiresAt: "2026-07-27T15:01:36Z",
  artifactSize: 70310,
  checkoutSha: "18229be570766d3b42f5600955120bfcba690b76",
  headSha: "3bfdd25ec9a2df4ca84e19541365d48842a73f59",
  rawEvidenceSha256: "1f125d5b321063b364e19283897c78c126d73eb1b3368d14686c494b1296dfab",
  runId: "29260372260",
  source: "https://github.com/ark-jo/StyleGallery/actions/runs/29260372260",
  verifiedAt: "2026-07-13T15:04:41Z",
};

function externalVerification() {
  return {
    artifact: {
      api_digest: completedEvidence.artifactApiDigest,
      expires_at: completedEvidence.artifactExpiresAt,
      id: completedEvidence.artifactId,
      name: completedEvidence.artifactName,
      size_in_bytes: completedEvidence.artifactSize,
    },
    repository_relationship: {
      execution_is_fork: true,
      parent: "changeroa/StyleGallery",
      source: "changeroa/StyleGallery",
    },
    source: completedEvidence.source,
    verified_at: completedEvidence.verifiedAt,
  };
}

function completeRecord(committedCi = {}) {
  const runs = Array.from({ length: 20 }, (_, index) => ({
    architecture: "amd64",
    ax_sha256: "a".repeat(64),
    completed: true,
    dom_sha256: "b".repeat(64),
    metadata_sha256: BASELINE_METADATA_SHA256,
    png_sha256: BASELINE_REFERENCE.baseline.sha256,
    run: index + 1,
    screenshot_diff_pixels: 0,
  }));
  return {
    ...canonical,
    committed_ci: {
      artifact_name: completedEvidence.artifactName,
      checkout_sha: completedEvidence.checkoutSha,
      execution_repository: "ark-jo/StyleGallery",
      external_verification: externalVerification(),
      head_sha: completedEvidence.headSha,
      raw_evidence_sha256: completedEvidence.rawEvidenceSha256,
      repository: "changeroa/StyleGallery",
      run_attempt: "1",
      run_id: completedEvidence.runId,
      sha: completedEvidence.checkoutSha,
      workflow: ".github/workflows/validate.yml",
      ...committedCi,
    },
    status: "completed",
    runs,
  };
}

const cases = [
  ["nineteen_of_twenty", (record) => ({ ...record, runs: record.runs.slice(0, 19) }), "calibration_run_count"],
  ["duplicate_run", (record) => ({ ...record, runs: record.runs.map((run, index) => index === 19 ? { ...run, run: 19 } : run) }), "calibration_run_duplicate"],
  ["missing_run", (record) => ({ ...record, runs: record.runs.map((run, index) => index === 19 ? { ...run, run: 21 } : run) }), "calibration_run_set"],
  ["architecture_variance", (record) => ({ ...record, runs: record.runs.map((run, index) => index === 19 ? { ...run, architecture: "arm64" } : run) }), "calibration_architecture_variance"],
  ["environment_mismatch", (record) => ({ ...record, environment: { ...record.environment, architecture: "arm64" } }), "calibration_environment_mismatch"],
  ["hash_variance", (record) => ({ ...record, runs: record.runs.map((run, index) => index === 19 ? { ...run, png_sha256: "e".repeat(64) } : run) }), "calibration_hash_variance"],
  ["metadata_variance", (record) => ({ ...record, runs: record.runs.map((run, index) => index === 19 ? { ...run, metadata_sha256: "f".repeat(64) } : run) }), "calibration_metadata_variance"],
  ["incomplete_run", (record) => ({ ...record, runs: record.runs.map((run, index) => index === 19 ? { ...run, completed: false } : run) }), "calibration_run_incomplete"],
  ["nonzero_diff", (record) => ({ ...record, runs: record.runs.map((run, index) => index === 19 ? { ...run, screenshot_diff_pixels: 1 } : run) }), "calibration_diff_nonzero"],
  ["malformed_hash", (record) => ({ ...record, runs: record.runs.map((run, index) => index === 19 ? { ...run, png_sha256: "x" } : run) }), "calibration_hash_invalid"],
  ["wrong_stable_baseline_hash", (record) => ({ ...record, runs: record.runs.map((run) => ({ ...run, png_sha256: "d".repeat(64) })) }), "calibration_baseline_hash_mismatch"],
  ["wrong_stable_metadata_hash", (record) => ({ ...record, runs: record.runs.map((run) => ({ ...run, metadata_sha256: "c".repeat(64) })) }), "calibration_metadata_hash_mismatch"],
  ["unknown_run_property", (record) => ({ ...record, runs: record.runs.map((run, index) => index === 19 ? { ...run, forged: true } : run) }), "calibration_run_property_unknown"],
  ["checkout_sha_not_tested_sha", (record) => ({ ...record, committed_ci: { ...record.committed_ci, checkout_sha: record.committed_ci.head_sha } }), "calibration_committed_ci_invalid"],
  ["artifact_bound_to_head_sha", (record) => ({ ...record, committed_ci: { ...record.committed_ci, artifact_name: `chromium-sentinel-calibration-${record.committed_ci.run_id}-${record.committed_ci.head_sha}` } }), "calibration_committed_ci_invalid"],
  ["unrecognized_execution_repository", (record) => ({ ...record, committed_ci: { ...record.committed_ci, execution_repository: "untrusted/StyleGallery" } }), "calibration_committed_ci_invalid"],
  ["swapped_canonical_and_execution_repository", (record) => ({ ...record, committed_ci: { ...record.committed_ci, execution_repository: "changeroa/StyleGallery", repository: "ark-jo/StyleGallery" } }), "calibration_committed_ci_invalid"],
  ["missing_execution_repository", (record) => {
    const { execution_repository: omitted, ...committedCi } = record.committed_ci;
    return { ...record, committed_ci: committedCi };
  }, "calibration_committed_ci_invalid"],
  ["completed_missing_external_verification", (record) => {
    const { external_verification: omitted, ...committedCi } = record.committed_ci;
    return { ...record, committed_ci: committedCi };
  }, "calibration_external_verification_missing"],
  ["forged_external_artifact_id", (record) => ({ ...record, committed_ci: { ...record.committed_ci, external_verification: { ...record.committed_ci.external_verification, artifact: { ...record.committed_ci.external_verification.artifact, id: "8283099325" } } } }), "calibration_external_verification_invalid"],
  ["forged_external_artifact_digest", (record) => ({ ...record, committed_ci: { ...record.committed_ci, external_verification: { ...record.committed_ci.external_verification, artifact: { ...record.committed_ci.external_verification.artifact, api_digest: `sha256:${"f".repeat(64)}` } } } }), "calibration_external_verification_invalid"],
  ["raw_digest_substituted_for_artifact_digest", (record) => ({ ...record, committed_ci: { ...record.committed_ci, external_verification: { ...record.committed_ci.external_verification, artifact: { ...record.committed_ci.external_verification.artifact, api_digest: `sha256:${record.committed_ci.raw_evidence_sha256}` } } } }), "calibration_external_verification_invalid"],
  ["forged_external_source", (record) => ({ ...record, committed_ci: { ...record.committed_ci, external_verification: { ...record.committed_ci.external_verification, source: "https://github.com/ark-jo/StyleGallery/actions/runs/1" } } }), "calibration_external_verification_invalid"],
  ["forged_fork_parent_relationship", (record) => ({ ...record, committed_ci: { ...record.committed_ci, external_verification: { ...record.committed_ci.external_verification, repository_relationship: { ...record.committed_ci.external_verification.repository_relationship, parent: "untrusted/StyleGallery" } } } }), "calibration_external_verification_invalid"],
  ["invalid_committed_ci", (record) => ({ ...record, committed_ci: { artifact_name: "forged", extra: true, run_id: "abc", sha: "x" } }), "calibration_committed_ci_property_unknown"],
  ["owner_approval_preclaim", (record) => ({ ...record, baseline_owner_approval: "approved" }), "baseline_owner_approval_invalid"],
  ["pending_evidence_preclaim", (record) => ({ ...record, status: "awaiting_committed_ci" }), "calibration_pending_evidence_forbidden"],
];

const results = [];
try {
  const committedSchema = schema.properties.committed_ci.oneOf.find((entry) => entry.type === "object");
  const externalSchema = committedSchema.properties.external_verification?.oneOf?.find((entry) => entry.type === "object") ?? {};
  const artifactSchema = externalSchema.properties?.artifact ?? {};
  const relationshipSchema = externalSchema.properties?.repository_relationship ?? {};
  const runSchema = schema.properties.runs.items;
  const runContains = schema.allOf[0].else.properties.runs.allOf;
  const schemaParity = schema.additionalProperties === false
    && committedSchema.additionalProperties === false
    && schema.properties.environment.additionalProperties === false
    && Object.entries(canonical.environment).every(([key, value]) => key === "viewport"
      ? JSON.stringify(schema.properties.environment.properties.viewport.properties) === JSON.stringify({ width: { const: value.width }, height: { const: value.height } })
      : schema.properties.environment.properties[key].const === value)
    && schema.properties.reference.additionalProperties === false
    && schema.properties.reference.properties.source.additionalProperties === false
    && schema.properties.reference.properties.source.properties.sha256.const === BASELINE_REFERENCE.source.sha256
    && schema.properties.reference.properties.baseline.properties.sha256.const === BASELINE_REFERENCE.baseline.sha256
    && runSchema.additionalProperties === false
    && runSchema.properties.png_sha256.const === BASELINE_REFERENCE.baseline.sha256
    && runSchema.properties.metadata_sha256.const === BASELINE_METADATA_SHA256
    && committedSchema.properties.repository.const === "changeroa/StyleGallery"
    && JSON.stringify(committedSchema.properties.execution_repository?.enum ?? []) === JSON.stringify(executionRepositories)
    && externalSchema.additionalProperties === false
    && artifactSchema.additionalProperties === false
    && relationshipSchema.additionalProperties === false
    && artifactSchema.properties?.api_digest?.const === completedEvidence.artifactApiDigest
    && artifactSchema.properties?.id?.const === completedEvidence.artifactId
    && artifactSchema.properties?.name?.const === completedEvidence.artifactName
    && artifactSchema.properties?.size_in_bytes?.const === completedEvidence.artifactSize
    && artifactSchema.properties?.expires_at?.const === completedEvidence.artifactExpiresAt
    && externalSchema.properties?.source?.const === completedEvidence.source
    && externalSchema.properties?.verified_at?.const === completedEvidence.verifiedAt
    && JSON.stringify(runContains.map((entry) => entry.contains.properties.run.const).sort((left, right) => left - right)) === JSON.stringify(Array.from({ length: 20 }, (_, index) => index + 1))
    && runContains.every((entry) => entry.minContains === 1 && entry.maxContains === 1)
    && JSON.stringify([...committedSchema.required].sort()) === JSON.stringify(["artifact_name", "checkout_sha", "execution_repository", "external_verification", "head_sha", "raw_evidence_sha256", "repository", "run_attempt", "run_id", "sha", "workflow"].sort());
  results.push({ actual: { schemaParity }, expected: "recursive schema/runtime identity parity", name: "schema_runtime_parity", ok: schemaParity });
  const validFixture = path.join(tempRoot, "valid-completed.json");
  fs.writeFileSync(validFixture, `${JSON.stringify(completeRecord(), null, 2)}\n`);
  const validChild = spawnSync(process.execPath, [validator, "--calibration", validFixture, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  const validOutput = JSON.parse(validChild.stdout);
  results.push({ actual: { codes: validOutput.failures.map((failure) => failure.code), status: validChild.status }, expected: "completed calibration and exit:0", name: "valid_completed_calibration", ok: validChild.status === 0 && validOutput.ok === true });
  const awaitingExternalFixture = path.join(tempRoot, "valid-awaiting-external-verification.json");
  fs.writeFileSync(awaitingExternalFixture, `${JSON.stringify({
    ...completeRecord({ external_verification: null }),
    status: "awaiting_external_verification",
  }, null, 2)}\n`);
  const awaitingExternalChild = spawnSync(process.execPath, [validator, "--calibration", awaitingExternalFixture, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  const awaitingExternalOutput = JSON.parse(awaitingExternalChild.stdout);
  results.push({
    actual: { codes: awaitingExternalOutput.failures.map((failure) => failure.code), status: awaitingExternalChild.status },
    expected: "pre-upload calibration awaits external verification and exits 0",
    name: "valid_awaiting_external_verification",
    ok: awaitingExternalChild.status === 0 && awaitingExternalOutput.ok === true,
  });
  const pendingFixture = path.join(tempRoot, "valid-awaiting-committed-ci.json");
  fs.writeFileSync(pendingFixture, `${JSON.stringify({ ...canonical, committed_ci: null, runs: [], status: "awaiting_committed_ci" }, null, 2)}\n`);
  const pendingChild = spawnSync(process.execPath, [validator, "--calibration", pendingFixture, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  const pendingOutput = JSON.parse(pendingChild.stdout);
  results.push({
    actual: { codes: pendingOutput.failures.map((failure) => failure.code), status: pendingChild.status },
    expected: "initial pending record and exit:0",
    name: "valid_awaiting_committed_ci",
    ok: pendingChild.status === 0 && pendingOutput.ok === true,
  });
  const pullRequestFixture = path.join(tempRoot, "valid-pull-request-merge-head.json");
  const mergeSha = "11f4668fe5988720c27e88ec7203ecd1685a40df";
  const headSha = "8b8eaed41094286138973157b581a1d9ab9957a8";
  fs.writeFileSync(pullRequestFixture, `${JSON.stringify({
    ...completeRecord({
      artifact_name: `chromium-sentinel-calibration-29258810962-${mergeSha}`,
      checkout_sha: mergeSha,
      execution_repository: "ark-jo/StyleGallery",
      external_verification: null,
      head_sha: headSha,
      repository: "changeroa/StyleGallery",
      run_id: "29258810962",
      sha: mergeSha,
    }),
    status: "awaiting_external_verification",
  }, null, 2)}\n`);
  const pullRequestChild = spawnSync(process.execPath, [validator, "--calibration", pullRequestFixture, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  const pullRequestOutput = JSON.parse(pullRequestChild.stdout);
  results.push({
    actual: { codes: pullRequestOutput.failures.map((failure) => failure.code), status: pullRequestChild.status },
    expected: "distinct canonical pull-request merge checkout and head SHAs",
    name: "valid_pull_request_merge_and_head_identity",
    ok: pullRequestChild.status === 0 && pullRequestOutput.ok === true,
  });
  for (const [name, mutate, expected] of cases) {
    const fixture = path.join(tempRoot, `${name}.json`);
    fs.writeFileSync(fixture, `${JSON.stringify(mutate(completeRecord()), null, 2)}\n`);
    const child = spawnSync(process.execPath, [validator, "--calibration", fixture, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
    const output = JSON.parse(child.stdout);
    const codes = Array.isArray(output.failures) ? output.failures.map((failure) => failure.code) : [];
    results.push({ actual: { codes, status: child.status }, expected, name, ok: child.status !== 0 && codes.includes(expected) });
  }
  const manifestFixture = path.join(tempRoot, "unknown-manifest-nested.json");
  fs.writeFileSync(manifestFixture, `${JSON.stringify({
    ...canonicalManifest,
    calibration: { ...canonicalManifest.calibration, forged: true },
    source: { ...canonicalManifest.source, forged: true },
  }, null, 2)}\n`);
  const manifestChild = spawnSync(process.execPath, [validator, "--manifest", manifestFixture, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  const manifestOutput = JSON.parse(manifestChild.stdout);
  const manifestCodes = manifestOutput.failures.map((failure) => failure.code);
  results.push({
    actual: { codes: manifestCodes, status: manifestChild.status },
    expected: "baseline_calibration_property_unknown and baseline_source_property_unknown",
    name: "unknown_manifest_nested_properties",
    ok: manifestChild.status !== 0 && manifestCodes.includes("baseline_calibration_property_unknown") && manifestCodes.includes("baseline_source_property_unknown"),
  });
  const alternateFile = path.join(repositoryRoot, "package.json");
  const alternateManifestFixture = path.join(tempRoot, "alternate-baseline.json");
  fs.writeFileSync(alternateManifestFixture, `${JSON.stringify({
    ...canonicalManifest,
    baseline: { path: "package.json", sha256: sha256(fs.readFileSync(alternateFile)) },
  }, null, 2)}\n`);
  const alternateChild = spawnSync(process.execPath, [validator, "--manifest", alternateManifestFixture, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  const alternateOutput = JSON.parse(alternateChild.stdout);
  const alternateCodes = alternateOutput.failures.map((failure) => failure.code);
  results.push({
    actual: { codes: alternateCodes, status: alternateChild.status },
    expected: "baseline_baseline_reference_mismatch",
    name: "alternate_in_repo_baseline",
    ok: alternateChild.status !== 0 && alternateCodes.includes("baseline_baseline_reference_mismatch"),
  });
  const directoryManifestFixture = path.join(tempRoot, "directory-baseline.json");
  fs.writeFileSync(directoryManifestFixture, `${JSON.stringify({ ...canonicalManifest, baseline: { path: "tests", sha256: "a".repeat(64) } }, null, 2)}\n`);
  const directoryChild = spawnSync(process.execPath, [validator, "--manifest", directoryManifestFixture, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  const directoryOutput = JSON.parse(directoryChild.stdout);
  results.push({ actual: { codes: directoryOutput.failures.map((failure) => failure.code), status: directoryChild.status }, expected: "baseline_baseline_file_invalid", name: "directory_manifest_target", ok: directoryChild.status !== 0 && directoryOutput.failures.some((failure) => failure.code === "baseline_baseline_file_invalid") });
  for (const [name, content, expected] of [
    ["null_calibration", "null\n", "calibration_record_invalid"],
    ["duplicate_calibration_property", '{"schema_version":"1.0","schema_version":"1.0"}\n', "baseline_json_invalid"],
  ]) {
    const fixture = path.join(tempRoot, `${name}.json`);
    fs.writeFileSync(fixture, content);
    const child = spawnSync(process.execPath, [validator, "--calibration", fixture, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
    const output = JSON.parse(child.stdout);
    results.push({ actual: { codes: output.failures.map((failure) => failure.code), status: child.status }, expected, name, ok: child.status !== 0 && output.failures.some((failure) => failure.code === expected) });
  }
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

const failures = results.filter((result) => !result.ok).map((result) => `missing_semantic:${result.name}:${result.expected}`);
const report = { failures, ok: failures.length === 0, results };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
