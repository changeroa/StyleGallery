#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCalibrationRun } from "./calibration-raw-contract.mjs";
import { cloneCalibrationBase, createCalibrationBase, mutateJson, treeDigest } from "./calibration-test-fixture.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-calibration-raw-"));
const base = createCalibrationBase(path.join(tempRoot, "base"), repositoryRoot, 1);
const baseDigest = treeDigest(base);

const cases = [
  ["valid_run", undefined, []],
  ["missing_exit", (root) => fs.rmSync(path.join(root, "exit.json")), ["calibration_raw_file_missing", "calibration_exit_missing", "calibration_exit_invalid"]],
  ["nonzero_exit", (root) => mutateJson(path.join(root, "exit.json"), (value) => ({ ...value, exit_code: 1 })), ["calibration_exit_unsuccessful"]],
  ["unknown_exit_property", (root) => mutateJson(path.join(root, "exit.json"), (value) => ({ ...value, extra: true })), ["calibration_exit_property_unknown"]],
  ["fake_playwright", (root) => fs.writeFileSync(path.join(root, "playwright.json"), "{}\n"), ["calibration_playwright_identity", "calibration_playwright_incomplete"]],
  ["invalid_playwright", (root) => fs.writeFileSync(path.join(root, "playwright.json"), "null\n"), ["calibration_playwright_result_invalid"]],
  ["missing_playwright", (root) => fs.rmSync(path.join(root, "playwright.json")), ["calibration_raw_file_missing", "calibration_playwright_missing", "calibration_playwright_result_invalid"]],
  ["duplicate_metadata", (root) => fs.copyFileSync(path.join(root, "metadata.json"), path.join(root, "metadata-copy.json")), ["calibration_raw_file_unknown"]],
  ["unknown_metadata", (root) => mutateJson(path.join(root, "metadata.json"), (value) => ({ ...value, completed: true })), ["calibration_metadata_property_unknown"]],
  ["metadata_mismatch", (root) => mutateJson(path.join(root, "metadata.json"), (value) => ({ ...value, architecture: "arm64" })), ["calibration_metadata_mismatch"]],
  ["duplicate_metadata_property", (root) => {
    const file = path.join(root, "metadata.json");
    fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace('"schema_version": "1.0"', '"schema_version": "1.0",\n  "schema_version": "1.0"'));
  }, ["calibration_metadata_missing_invalid", "calibration_metadata_invalid", "calibration_artifact_hash_mismatch", "calibration_artifact_hash_mismatch", "calibration_artifact_hash_mismatch", "calibration_comparison_mismatch"]],
  ["missing_comparison", (root) => fs.rmSync(path.join(root, "comparison.json")), ["calibration_raw_file_missing", "calibration_comparison_missing", "calibration_comparison_invalid"]],
  ["unknown_comparison_property", (root) => mutateJson(path.join(root, "comparison.json"), (value) => ({ ...value, extra: true })), ["calibration_comparison_property_unknown"]],
  ["relaxed_comparison_threshold", (root) => mutateJson(path.join(root, "comparison.json"), (value) => ({ ...value, threshold: 0.1 })), ["calibration_comparison_mismatch"]],
  ["artifact_directory", (root) => {
    fs.rmSync(path.join(root, "actual.png"));
    fs.mkdirSync(path.join(root, "actual.png"));
  }, ["calibration_raw_file_unknown", "calibration_raw_file_missing", "calibration_artifact_hash_mismatch"]],
  ["corrupt_artifact_hash", (root) => fs.appendFileSync(path.join(root, "actual.png"), "corrupt"), ["calibration_artifact_hash_mismatch"]],
  ["oversized_metadata", (root) => fs.appendFileSync(path.join(root, "metadata.json"), " ".repeat(1024 * 1024)), ["calibration_raw_file_oversized", "calibration_metadata_missing_invalid", "calibration_metadata_invalid", "calibration_artifact_hash_mismatch", "calibration_artifact_hash_mismatch", "calibration_artifact_hash_mismatch", "calibration_comparison_mismatch"]],
  ["oversized_png", (root) => fs.appendFileSync(path.join(root, "actual.png"), Buffer.alloc(5 * 1024 * 1024)), ["calibration_raw_file_oversized", "calibration_artifact_hash_mismatch"]],
];

const results = [];
try {
  for (const [name, mutate, expectedCodes] of cases) {
    const root = path.join(cloneCalibrationBase(base, path.join(tempRoot, name)), "run-01");
    mutate?.(root);
    const failures = [];
    const parsed = parseCalibrationRun(root, 1, failures);
    const codes = failures.map((failure) => failure.code);
    const validShape = parsed && Object.keys(parsed).sort().join(",") === "architecture,ax_sha256,completed,dom_sha256,metadata_sha256,png_sha256,run,screenshot_diff_pixels"
      && parsed.run === 1 && parsed.completed === true && parsed.architecture === "amd64" && parsed.screenshot_diff_pixels === 0;
    const ok = JSON.stringify(codes) === JSON.stringify(expectedCodes) && (expectedCodes.length > 0 || validShape);
    results.push({ actual: { codes, parsed: Boolean(parsed) }, expected: expectedCodes, name, ok });
  }
  const coveredCodes = new Set(results.flatMap((result) => result.actual.codes));
  const requiredCodes = [
    "calibration_artifact_hash_mismatch", "calibration_comparison_invalid", "calibration_comparison_mismatch", "calibration_comparison_missing",
    "calibration_comparison_property_unknown", "calibration_exit_invalid", "calibration_exit_missing", "calibration_exit_property_unknown",
    "calibration_exit_unsuccessful", "calibration_metadata_invalid", "calibration_metadata_mismatch", "calibration_metadata_missing_invalid",
    "calibration_metadata_property_unknown", "calibration_playwright_identity", "calibration_playwright_incomplete", "calibration_playwright_missing",
    "calibration_playwright_result_invalid", "calibration_raw_file_missing", "calibration_raw_file_oversized", "calibration_raw_file_unknown",
  ];
  const missingCodes = requiredCodes.filter((code) => !coveredCodes.has(code));
  const failures = results.filter((result) => !result.ok).map((result) => `raw_vector_mismatch:${result.name}`);
  if (missingCodes.length > 0) failures.push(`raw_codes_missing:${missingCodes.join(",")}`);
  if (treeDigest(base) !== baseDigest) failures.push("immutable_base_mutated");
  const report = {
    failures,
    immutableBase: { digest: baseDigest, preserved: treeDigest(base) === baseDigest },
    metrics: { directParserCalls: cases.length, envelopeProcessInvocations: 0 },
    ok: failures.length === 0,
    requiredCodes,
    results,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}
