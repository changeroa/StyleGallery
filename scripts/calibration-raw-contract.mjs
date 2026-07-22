import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { BASELINE_ENVIRONMENT, BASELINE_METADATA_SHA256, BASELINE_REFERENCE, finding, sha256 } from "./baseline-contract.mjs";
import { parseStrictJson } from "./strict-json.mjs";

const EXPECTED_TEST = "canonical consumer reference preserves computed layout before its locator screenshot";
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const REQUIRED_FILES = new Set(["actual.png", "ax.txt", "comparison.json", "dom.html", "exit.json", "metadata.json", "playwright.json"]);
const ALLOWED_FILES = new Set([...REQUIRED_FILES, "playwright.stderr"]);
const FILE_LIMITS = new Map([
  ["actual.png", 5 * 1024 * 1024], ["ax.txt", 1024 * 1024], ["comparison.json", 1024 * 1024],
  ["dom.html", 1024 * 1024], ["exit.json", 1024 * 1024], ["metadata.json", 1024 * 1024],
  ["playwright.json", 10 * 1024 * 1024], ["playwright.stderr", 1024 * 1024],
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readJson(file, code, failures) {
  if (!fs.existsSync(file)) {
    failures.push(finding(code, file, "required raw calibration JSON is missing"));
    return undefined;
  }
  try {
    const stat = fs.lstatSync(file);
    const limit = FILE_LIMITS.get(path.basename(file)) ?? 1024 * 1024;
    if (stat.isSymbolicLink() || !stat.isFile() || stat.size > limit) throw new Error(`JSON evidence must be a regular file no larger than ${limit} bytes`);
    return parseStrictJson(fs.readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(finding(`${code}_invalid`, file, error instanceof Error ? error.message : String(error)));
    return undefined;
  }
}

function rejectUnknown(value, allowed, code, file, failures) {
  if (!isRecord(value)) return;
  for (const key of Object.keys(value).filter((key) => !allowed.has(key))) {
    failures.push(finding(code, file, `unsupported property ${key}`));
  }
}

function validateExit(exit, expectedRun, file, failures) {
  if (!isRecord(exit)) {
    failures.push(finding("calibration_exit_invalid", file, "exit record must be an object"));
    return false;
  }
  rejectUnknown(exit, new Set(["exit_code", "run", "schema_version"]), "calibration_exit_property_unknown", file, failures);
  if (exit.schema_version !== "1.0" || exit.run !== expectedRun || exit.exit_code !== 0) {
    failures.push(finding("calibration_exit_unsuccessful", file, "exit record must identify this run with exit code zero"));
    return false;
  }
  return true;
}

function validatePlaywright(report, file, failures) {
  if (!isRecord(report)) {
    failures.push(finding("calibration_playwright_result_invalid", file, "Playwright result must be an object"));
    return false;
  }
  const project = report.config?.projects?.[0];
  const suite = report.suites?.[0];
  const spec = suite?.specs?.[0];
  const test = spec?.tests?.[0];
  const result = test?.results?.[0];
  const identityMatches = report.config?.version === "1.61.0"
    && report.config?.workers === 1
    && report.config?.projects?.length === 1
    && project?.id === "chromium"
    && project?.name === "chromium"
    && report.suites?.length === 1
    && suite?.file === "consumer-reference-sentinels.spec.mjs"
    && suite?.specs?.length === 1
    && spec?.title === EXPECTED_TEST
    && spec?.tests?.length === 1
    && test?.projectId === "chromium"
    && test?.projectName === "chromium";
  if (!identityMatches) failures.push(finding("calibration_playwright_identity", file, "result must contain exactly the canonical Chromium sentinel test"));
  const completionMatches = spec?.ok === true
    && test?.expectedStatus === "passed"
    && test?.status === "expected"
    && test?.results?.length === 1
    && result?.status === "passed"
    && Array.isArray(result?.errors)
    && result.errors.length === 0
    && Array.isArray(report.errors)
    && report.errors.length === 0
    && report.stats?.expected === 1
    && report.stats?.skipped === 0
    && report.stats?.unexpected === 0
    && report.stats?.flaky === 0;
  if (!completionMatches) failures.push(finding("calibration_playwright_incomplete", file, "canonical test must pass once with no skipped, flaky, interrupted, or unexpected result"));
  return identityMatches && completionMatches;
}

function validateMetadata(metadata, expectedRun, file, failures) {
  if (!isRecord(metadata)) {
    failures.push(finding("calibration_metadata_invalid", file, "metadata must be an object"));
    return false;
  }
  const allowed = new Set(["architecture", "ax_sha256", "dom_sha256", "environment", "metadata_sha256", "png_sha256", "reference", "run", "schema_version"]);
  rejectUnknown(metadata, allowed, "calibration_metadata_property_unknown", file, failures);
  const hashesValid = [metadata.ax_sha256, metadata.dom_sha256, metadata.metadata_sha256, metadata.png_sha256].every((value) => typeof value === "string" && HASH_PATTERN.test(value));
  const valid = metadata.schema_version === "1.0"
    && metadata.run === expectedRun
    && metadata.architecture === "amd64"
    && hashesValid
    && metadata.metadata_sha256 === BASELINE_METADATA_SHA256
    && isDeepStrictEqual(metadata.environment, BASELINE_ENVIRONMENT)
    && isDeepStrictEqual(metadata.reference, BASELINE_REFERENCE);
  if (!valid) failures.push(finding("calibration_metadata_mismatch", file, "metadata shape, identity, hashes, environment, and reference must be canonical"));
  return valid;
}

function validateComparison(comparison, expectedRun, actualHash, file, failures) {
  if (!isRecord(comparison)) {
    failures.push(finding("calibration_comparison_invalid", file, "comparison proof must be an object"));
    return false;
  }
  const allowed = new Set(["actual_sha256", "assertion", "diff_pixels", "expected_sha256", "max_diff_pixels", "run", "schema_version", "status", "threshold"]);
  rejectUnknown(comparison, allowed, "calibration_comparison_property_unknown", file, failures);
  const valid = comparison.schema_version === "1.0"
    && comparison.run === expectedRun
    && comparison.assertion === "visual_geometry_matches_proposed_baseline"
    && comparison.status === "passed"
    && comparison.threshold === 0
    && comparison.max_diff_pixels === 0
    && comparison.diff_pixels === 0
    && comparison.actual_sha256 === actualHash
    && comparison.expected_sha256 === BASELINE_REFERENCE.baseline.sha256
    && comparison.actual_sha256 === comparison.expected_sha256;
  if (!valid) failures.push(finding("calibration_comparison_mismatch", file, "comparison must prove the exact zero-diff baseline assertion"));
  return valid;
}

export function parseCalibrationRun(root, expectedRun, failures) {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !ALLOWED_FILES.has(entry.name)) failures.push(finding("calibration_raw_file_unknown", path.join(root, entry.name), "run directory contains unsupported or duplicate evidence"));
    else if (fs.lstatSync(path.join(root, entry.name)).size > FILE_LIMITS.get(entry.name)) failures.push(finding("calibration_raw_file_oversized", path.join(root, entry.name), `${entry.name} exceeds its calibration evidence byte limit`));
  }
  for (const name of REQUIRED_FILES) if (!entries.some((entry) => entry.isFile() && entry.name === name)) failures.push(finding("calibration_raw_file_missing", path.join(root, name), `${name} is required exactly once`));
  const metadata = readJson(path.join(root, "metadata.json"), "calibration_metadata_missing", failures);
  const exit = readJson(path.join(root, "exit.json"), "calibration_exit_missing", failures);
  const report = readJson(path.join(root, "playwright.json"), "calibration_playwright_missing", failures);
  const comparison = readJson(path.join(root, "comparison.json"), "calibration_comparison_missing", failures);
  const metadataValid = validateMetadata(metadata, expectedRun, path.join(root, "metadata.json"), failures);
  const exitValid = validateExit(exit, expectedRun, path.join(root, "exit.json"), failures);
  const reportValid = validatePlaywright(report, path.join(root, "playwright.json"), failures);
  const artifactFields = [["actual.png", "png_sha256"], ["dom.html", "dom_sha256"], ["ax.txt", "ax_sha256"]];
  let artifactsValid = metadataValid;
  for (const [name, field] of artifactFields) {
    const file = path.join(root, name);
    if (!fs.existsSync(file) || fs.lstatSync(file).isSymbolicLink() || !fs.lstatSync(file).isFile() || fs.lstatSync(file).size > FILE_LIMITS.get(name) || !metadata || sha256(fs.readFileSync(file)) !== metadata[field]) {
      failures.push(finding("calibration_artifact_hash_mismatch", file, `${field} differs from raw artifact bytes`));
      artifactsValid = false;
    }
  }
  const comparisonValid = validateComparison(comparison, expectedRun, metadata?.png_sha256, path.join(root, "comparison.json"), failures);
  if (!(metadataValid && exitValid && reportValid && artifactsValid && comparisonValid)) return undefined;
  return {
    architecture: metadata.architecture,
    ax_sha256: metadata.ax_sha256,
    completed: true,
    dom_sha256: metadata.dom_sha256,
    metadata_sha256: metadata.metadata_sha256,
    png_sha256: metadata.png_sha256,
    run: expectedRun,
    screenshot_diff_pixels: comparison.diff_pixels,
  };
}
