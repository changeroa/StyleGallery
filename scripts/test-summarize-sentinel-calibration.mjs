#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { BASELINE_ENVIRONMENT, BASELINE_REFERENCE, sha256 } from "./baseline-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const summarizer = path.join(repositoryRoot, "scripts", "summarize-sentinel-calibration.mjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-pr4-summary-"));
const png = fs.readFileSync(path.join(repositoryRoot, BASELINE_REFERENCE.baseline.path));
const dom = Buffer.from("<section class=card_grid></section>\n");
const ax = Buffer.from("- region \"Project cards\"\n");
const pngHash = sha256(png);
const metadataHash = sha256(JSON.stringify({ environment: BASELINE_ENVIRONMENT, reference: BASELINE_REFERENCE }));

function playwrightReport() {
  return {
    config: { projects: [{ id: "chromium", name: "chromium" }], version: "1.61.0", workers: 1 },
    errors: [],
    stats: { expected: 1, flaky: 0, skipped: 0, unexpected: 0 },
    suites: [{
      file: "consumer-reference-sentinels.spec.mjs",
      specs: [{
        ok: true,
        tests: [{
          expectedStatus: "passed",
          projectId: "chromium",
          projectName: "chromium",
          results: [{ errors: [], status: "passed" }],
          status: "expected",
        }],
        title: "canonical consumer reference preserves computed layout before its locator screenshot",
      }],
    }],
  };
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeRun(root, run) {
  const runRoot = path.join(root, `run-${String(run).padStart(2, "0")}`);
  fs.mkdirSync(runRoot, { recursive: true });
  fs.writeFileSync(path.join(runRoot, "actual.png"), png);
  fs.writeFileSync(path.join(runRoot, "dom.html"), dom);
  fs.writeFileSync(path.join(runRoot, "ax.txt"), ax);
  writeJson(path.join(runRoot, "playwright.json"), playwrightReport());
  writeJson(path.join(runRoot, "exit.json"), { exit_code: 0, run, schema_version: "1.0" });
  writeJson(path.join(runRoot, "comparison.json"), {
    actual_sha256: pngHash,
    assertion: "visual_geometry_matches_proposed_baseline",
    diff_pixels: 0,
    expected_sha256: BASELINE_REFERENCE.baseline.sha256,
    max_diff_pixels: 0,
    run,
    schema_version: "1.0",
    status: "passed",
    threshold: 0,
  });
  writeJson(path.join(runRoot, "metadata.json"), {
    architecture: "amd64",
    ax_sha256: sha256(ax),
    dom_sha256: sha256(dom),
    environment: BASELINE_ENVIRONMENT,
    metadata_sha256: metadataHash,
    png_sha256: pngHash,
    reference: BASELINE_REFERENCE,
    run,
    schema_version: "1.0",
  });
  return runRoot;
}

function invoke(name, mutate, identity = {}) {
  const input = path.join(tempRoot, name, "raw");
  const outputFile = path.join(input, "calibration.json");
  for (let run = 1; run <= 20; run += 1) writeRun(input, run);
  mutate?.(path.join(input, "run-01"));
  const sha = identity.sha ?? "0".repeat(40);
  const checkoutSha = identity.checkoutSha ?? sha;
  const executionRepository = identity.executionRepository ?? "changeroa/StyleGallery";
  const headSha = identity.headSha ?? "1".repeat(40);
  const repository = identity.repository ?? "changeroa/StyleGallery";
  const runId = identity.runId ?? "123";
  const artifactName = identity.artifactName ?? `chromium-sentinel-calibration-${runId}-${sha}`;
  const child = spawnSync(process.execPath, [
    summarizer,
    "--input", input,
    "--output", outputFile,
    "--repository", repository,
    "--execution-repository", executionRepository,
    "--workflow", ".github/workflows/validate.yml",
    "--run-id", runId,
    "--run-attempt", "1",
    "--sha", sha,
    "--checkout-sha", checkoutSha,
    "--head-sha", headSha,
    "--artifact-name", artifactName,
    "--json",
  ], { cwd: repositoryRoot, encoding: "utf8" });
  return {
    output: fs.existsSync(outputFile) && fs.lstatSync(outputFile).isFile() ? JSON.parse(fs.readFileSync(outputFile, "utf8")) : null,
    report: JSON.parse(child.stdout),
    status: child.status,
  };
}

const results = [];
try {
  const valid = invoke("valid");
  results.push({
    actual: { outputRuns: valid.output?.runs.length, report: valid.report, status: valid.status },
    expected: "20 truth-derived stable runs and zero diff statistics",
    name: "valid_raw_calibration",
    ok: valid.status === 0 && valid.report.ok === true && valid.report.status === "completed"
      && valid.output?.runs.length === 20 && new Set(valid.output.runs.map((run) => run.png_sha256)).size === 1,
  });
  const pullRequestMergeSha = "11f4668fe5988720c27e88ec7203ecd1685a40df";
  const pullRequestHeadSha = "8b8eaed41094286138973157b581a1d9ab9957a8";
  const validFork = invoke("valid_explicit_fork", undefined, {
    executionRepository: "ark-jo/StyleGallery",
    headSha: pullRequestHeadSha,
    runId: "29258810962",
    sha: pullRequestMergeSha,
  });
  results.push({
    actual: { committedCi: validFork.output?.committed_ci, report: validFork.report, status: validFork.status },
    expected: "canonical upstream plus explicit execution fork with distinct merge/head SHAs",
    name: "valid_explicit_fork_pull_request_identity",
    ok: validFork.status === 0 && validFork.report.ok === true
      && validFork.output?.committed_ci.repository === "changeroa/StyleGallery"
      && validFork.output?.committed_ci.execution_repository === "ark-jo/StyleGallery"
      && validFork.output?.committed_ci.sha === pullRequestMergeSha
      && validFork.output?.committed_ci.checkout_sha === pullRequestMergeSha
      && validFork.output?.committed_ci.head_sha === pullRequestHeadSha,
  });
  const invalidCases = [
    ["missing_exit", (root) => fs.rmSync(path.join(root, "exit.json")), "calibration_raw_file_missing"],
    ["nonzero_exit", (root) => writeJson(path.join(root, "exit.json"), { exit_code: 1, run: 1, schema_version: "1.0" }), "calibration_exit_unsuccessful"],
    ["fake_playwright", (root) => writeJson(path.join(root, "playwright.json"), {}), "calibration_playwright_identity"],
    ["duplicate_metadata", (root) => fs.copyFileSync(path.join(root, "metadata.json"), path.join(root, "metadata-copy.json")), "calibration_raw_file_unknown"],
    ["unknown_metadata", (root) => {
      const file = path.join(root, "metadata.json");
      const metadata = JSON.parse(fs.readFileSync(file, "utf8"));
      writeJson(file, { ...metadata, completed: true });
    }, "calibration_metadata_property_unknown"],
    ["duplicate_metadata_property", (root) => {
      const file = path.join(root, "metadata.json");
      const metadata = fs.readFileSync(file, "utf8").replace('"schema_version": "1.0"', '"schema_version": "1.0",\n  "schema_version": "1.0"');
      fs.writeFileSync(file, metadata);
    }, "calibration_metadata_missing_invalid"],
    ["missing_comparison", (root) => fs.rmSync(path.join(root, "comparison.json")), "calibration_raw_file_missing"],
    ["relaxed_comparison_threshold", (root) => {
      const file = path.join(root, "comparison.json");
      const comparison = JSON.parse(fs.readFileSync(file, "utf8"));
      writeJson(file, { ...comparison, threshold: 0.1 });
    }, "calibration_comparison_mismatch"],
    ["invalid_run_directory", (root) => {
      fs.rmSync(root, { recursive: true });
      fs.writeFileSync(root, "not a directory\n");
    }, "calibration_run_directory_invalid"],
    ["invalid_input_file", (root) => {
      const input = path.dirname(root);
      fs.rmSync(input, { recursive: true });
      fs.writeFileSync(input, "not a directory\n");
    }, "calibration_input_invalid"],
    ["symlinked_input_directory", (root) => {
      const input = path.dirname(root);
      const external = path.join(tempRoot, "external-input");
      fs.cpSync(input, external, { recursive: true });
      fs.rmSync(input, { recursive: true });
      fs.symlinkSync(external, input);
    }, "calibration_input_invalid"],
    ["invalid_output_directory", (root) => fs.mkdirSync(path.join(path.dirname(root), "calibration.json")), "calibration_output_invalid"],
    ["unknown_root_file", (root) => fs.writeFileSync(path.join(path.dirname(root), "forged.json"), "{}\n"), "calibration_run_directory_unknown"],
    ["symlinked_run_directory", (root) => {
      const external = path.join(tempRoot, "external-run");
      fs.cpSync(path.join(path.dirname(root), "run-02"), external, { recursive: true });
      fs.rmSync(root, { recursive: true });
      fs.symlinkSync(external, root);
    }, "calibration_run_directory_invalid"],
    ["artifact_directory", (root) => {
      fs.rmSync(path.join(root, "actual.png"));
      fs.mkdirSync(path.join(root, "actual.png"));
    }, "calibration_artifact_hash_mismatch"],
    ["oversized_metadata", (root) => fs.appendFileSync(path.join(root, "metadata.json"), " ".repeat(1024 * 1024)), "calibration_raw_file_oversized"],
    ["oversized_png", (root) => fs.appendFileSync(path.join(root, "actual.png"), Buffer.alloc(5 * 1024 * 1024)), "calibration_raw_file_oversized"],
  ];
  for (const [name, mutate, expected] of invalidCases) {
    const actual = invoke(name, mutate);
    const codes = actual.report.failures.map((failure) => failure.code);
    results.push({ actual: { codes, outputExists: actual.output !== null, status: actual.status }, expected, name, ok: actual.status !== 0 && actual.output === null && actual.report.status === "incomplete" && codes.includes(expected) });
  }
  const identityCases = [
    ["checkout_sha_not_tested_sha", { checkoutSha: "1".repeat(40) }],
    ["artifact_bound_to_head_sha", { artifactName: `chromium-sentinel-calibration-123-${"1".repeat(40)}` }],
    ["unrecognized_execution_repository", { executionRepository: "untrusted/StyleGallery" }],
    ["swapped_canonical_and_execution_repository", { executionRepository: "changeroa/StyleGallery", repository: "ark-jo/StyleGallery" }],
  ];
  for (const [name, identity] of identityCases) {
    const actual = invoke(name, undefined, identity);
    const codes = actual.report.failures.map((failure) => failure.code);
    results.push({
      actual: { codes, outputExists: actual.output !== null, status: actual.status },
      expected: "calibration_committed_ci_invalid",
      name,
      ok: actual.status !== 0 && actual.output === null && codes.includes("calibration_committed_ci_invalid"),
    });
  }
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

const failures = results.filter((result) => !result.ok).map((result) => `missing_semantic:${result.name}:${result.expected}`);
const report = { failures, ok: failures.length === 0, results };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
