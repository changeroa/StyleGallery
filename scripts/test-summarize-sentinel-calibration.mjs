#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { cloneCalibrationBase, createCalibrationBase, treeDigest } from "./calibration-test-fixture.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const summarizer = path.join(repositoryRoot, "scripts", "summarize-sentinel-calibration.mjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-calibration-envelope-"));
const base = createCalibrationBase(path.join(tempRoot, "base"), repositoryRoot);
const baseDigest = treeDigest(base);
let envelopeProcessInvocations = 0;

function objectCount(root) {
  if (!fs.existsSync(root)) return 0;
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) return 1;
  return 1 + fs.readdirSync(root).reduce((sum, name) => sum + objectCount(path.join(root, name)), 0);
}

function defaultArguments(input, output, identity = {}) {
  const sha = identity.sha ?? "0".repeat(40);
  const runId = identity.runId ?? "123";
  return [
    summarizer,
    "--input", input,
    "--output", output,
    "--repository", identity.repository ?? "changeroa/StyleGallery",
    "--execution-repository", identity.executionRepository ?? "changeroa/StyleGallery",
    "--workflow", ".github/workflows/validate.yml",
    "--run-id", runId,
    "--run-attempt", "1",
    "--sha", sha,
    "--checkout-sha", identity.checkoutSha ?? sha,
    "--head-sha", identity.headSha ?? "1".repeat(40),
    "--artifact-name", identity.artifactName ?? `chromium-sentinel-calibration-${runId}-${sha}`,
    "--json",
  ];
}

function invoke(name, { argumentsFor, identity, mutate } = {}) {
  const caseRoot = path.join(tempRoot, name);
  const input = cloneCalibrationBase(base, path.join(caseRoot, "raw"));
  let output = path.join(input, "calibration.json");
  const context = { caseRoot, input, output, run01: path.join(input, "run-01") };
  const changed = mutate?.(context);
  if (changed?.input) context.input = changed.input;
  if (changed?.output) output = changed.output;
  else output = context.output;
  const args = argumentsFor ? argumentsFor({ ...context, output }) : defaultArguments(context.input, output, identity);
  envelopeProcessInvocations += 1;
  const child = spawnSync(process.execPath, args, { cwd: repositoryRoot, encoding: "utf8" });
  let report = null;
  try { report = JSON.parse(child.stdout); } catch {}
  const aggregate = path.join(context.input, "calibration.json");
  const outputExists = fs.existsSync(aggregate) && fs.lstatSync(aggregate).isFile();
  return {
    output: outputExists ? JSON.parse(fs.readFileSync(aggregate, "utf8")) : null,
    outputExists,
    report,
    status: child.status,
  };
}

function failureResult(name, actual, expected) {
  const codes = actual.report?.failures?.map((failure) => failure.code) ?? [];
  return {
    actual: { codes, outputExists: actual.outputExists, status: actual.status },
    expected,
    name,
    ok: actual.status !== 0 && actual.report?.status === "incomplete" && !actual.outputExists && codes.includes(expected),
  };
}

const results = [];
try {
  const valid = invoke("valid");
  const expectedRunKeys = "architecture,ax_sha256,completed,dom_sha256,metadata_sha256,png_sha256,run,screenshot_diff_pixels";
  const normalizedRuns = valid.output?.runs.map((run) => ({ ...run, keys: Object.keys(run).sort().join(",") }));
  results.push({
    actual: { output: valid.output, report: valid.report, status: valid.status },
    expected: "schema 1.0 aggregate with exactly 20 normalized stable runs and zero-diff statistics",
    name: "valid_raw_calibration",
    ok: valid.status === 0 && valid.report?.ok === true && valid.report.status === "awaiting_external_verification"
      && JSON.stringify(valid.report.stats) === JSON.stringify({ max: 0, mean: 0, min: 0, p95: 0 })
      && valid.output?.schema_version === "1.0" && valid.output?.required_runs === 20
      && valid.output?.status === "awaiting_external_verification" && valid.output?.baseline_owner_approval === "pending"
      && valid.output?.committed_ci.external_verification === null && valid.output?.runs.length === 20
      && normalizedRuns?.every((run, index) => run.keys === expectedRunKeys && run.run === index + 1 && run.completed === true
        && run.architecture === "amd64" && run.screenshot_diff_pixels === 0)
      && new Set(valid.output?.runs.map((run) => run.png_sha256)).size === 1,
  });

  const pullRequestMergeSha = "11f4668fe5988720c27e88ec7203ecd1685a40df";
  const pullRequestHeadSha = "8b8eaed41094286138973157b581a1d9ab9957a8";
  const validFork = invoke("valid_explicit_fork", { identity: {
    executionRepository: "ark-jo/StyleGallery",
    headSha: pullRequestHeadSha,
    runId: "29258810962",
    sha: pullRequestMergeSha,
  } });
  results.push({
    actual: { committedCi: validFork.output?.committed_ci, report: validFork.report, status: validFork.status },
    expected: "canonical upstream plus explicit execution fork with distinct merge/head SHAs",
    name: "valid_explicit_fork_pull_request_identity",
    ok: validFork.status === 0 && validFork.output?.runs.length === 20
      && validFork.output?.committed_ci.repository === "changeroa/StyleGallery"
      && validFork.output?.committed_ci.execution_repository === "ark-jo/StyleGallery"
      && validFork.output?.committed_ci.sha === pullRequestMergeSha
      && validFork.output?.committed_ci.checkout_sha === pullRequestMergeSha
      && validFork.output?.committed_ci.head_sha === pullRequestHeadSha,
  });

  results.push(failureResult("corrupt_run_hash", invoke("corrupt_run_hash", {
    mutate: ({ run01 }) => fs.appendFileSync(path.join(run01, "actual.png"), "corrupt"),
  }), "calibration_artifact_hash_mismatch"));
  results.push(failureResult("duplicate_metadata_property", invoke("duplicate_metadata_property", {
    mutate: ({ run01 }) => {
      const file = path.join(run01, "metadata.json");
      fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace('"schema_version": "1.0"', '"schema_version": "1.0",\n  "schema_version": "1.0"'));
    },
  }), "calibration_metadata_missing_invalid"));
  results.push(failureResult("invalid_input_file", invoke("invalid_input_file", {
    mutate: ({ input }) => { fs.rmSync(input, { recursive: true }); fs.writeFileSync(input, "not a directory\n"); },
  }), "calibration_input_invalid"));
  results.push(failureResult("symlinked_input_directory", invoke("symlinked_input_directory", {
    mutate: ({ caseRoot, input }) => {
      const external = path.join(caseRoot, "external");
      fs.cpSync(input, external, { recursive: true });
      fs.rmSync(input, { recursive: true });
      fs.symlinkSync(external, input);
    },
  }), "calibration_input_invalid"));
  results.push(failureResult("invalid_output_directory", invoke("invalid_output_directory", {
    mutate: ({ output }) => fs.mkdirSync(output),
  }), "calibration_output_invalid"));
  results.push(failureResult("output_route_escape", invoke("output_route_escape", {
    mutate: ({ caseRoot }) => ({ output: path.join(caseRoot, "outside.json") }),
  }), "calibration_output_route"));
  results.push(failureResult("invalid_run_directory", invoke("invalid_run_directory", {
    mutate: ({ run01 }) => { fs.rmSync(run01, { recursive: true }); fs.writeFileSync(run01, "not a directory\n"); },
  }), "calibration_run_directory_invalid"));
  results.push(failureResult("unknown_root_file", invoke("unknown_root_file", {
    mutate: ({ input }) => fs.writeFileSync(path.join(input, "forged.json"), "{}\n"),
  }), "calibration_run_directory_unknown"));
  results.push(failureResult("symlinked_run_directory", invoke("symlinked_run_directory", {
    mutate: ({ caseRoot, input, run01 }) => {
      const external = path.join(caseRoot, "external-run");
      fs.cpSync(path.join(input, "run-02"), external, { recursive: true });
      fs.rmSync(run01, { recursive: true });
      fs.symlinkSync(external, run01);
    },
  }), "calibration_run_directory_invalid"));
  results.push(failureResult("missing_run_directory", invoke("missing_run_directory", {
    mutate: ({ run01 }) => fs.rmSync(run01, { recursive: true }),
  }), "calibration_run_directory_missing"));
  results.push(failureResult("argument_value_required", invoke("argument_value_required", {
    argumentsFor: ({ input }) => [summarizer, "--json", "--input", input, "--output"],
  }), "argument_value_required"));
  results.push(failureResult("argument_unknown", invoke("argument_unknown", {
    argumentsFor: ({ input, output }) => [...defaultArguments(input, output), "--unsupported"],
  }), "argument_unknown"));
  results.push(failureResult("calibration_path_required", invoke("calibration_path_required", {
    argumentsFor: () => [summarizer, "--json"],
  }), "calibration_path_required"));
  results.push(failureResult("committed_ci_identity_smoke", invoke("committed_ci_identity_smoke", {
    identity: { checkoutSha: "1".repeat(40) },
  }), "calibration_committed_ci_invalid"));

  const failures = results.filter((result) => !result.ok).map((result) => `envelope_vector_mismatch:${result.name}`);
  if (treeDigest(base) !== baseDigest) failures.push("immutable_base_mutated");
  const report = {
    failures,
    immutableBase: { digest: baseDigest, preserved: treeDigest(base) === baseDigest },
    metrics: {
      baseline: { envelopeProcessInvocations: 23, filesystemObjects: 3906 },
      candidate: {
        envelopeProcessInvocations,
        fixtureBaseObjects: objectCount(base),
        fixtureCloneMaterializations: envelopeProcessInvocations,
      },
      filesystemMetricQualification: "Candidate fixture counts are structural suite telemetry; authoritative total filesystem economics require the instrumented QA receipt.",
    },
    ok: failures.length === 0,
    results,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}
