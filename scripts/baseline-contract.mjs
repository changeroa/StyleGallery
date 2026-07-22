import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { parseStrictJson } from "./strict-json.mjs";

export const BASELINE_ENVIRONMENT = {
  architecture: "amd64",
  browser_revision: "1228",
  browser_version: "149.0.7827.55",
  container_image: "mcr.microsoft.com/playwright:v1.61.0-noble@sha256:57b65fdc9ceabe0ef613124c7bbe2babcf9362c4d85e382fe3b03604e84b428a",
  node: "22",
  os: "Ubuntu 24.04",
  platform: "linux/amd64",
  playwright: "1.61.0",
  viewport: { height: 768, width: 1024 },
};

export const BASELINE_REFERENCE = {
  baseline: { path: "tests/snapshots/consumer-reference-card-grid.png", sha256: "5528358e957a6115793155e501f62716f7db31dc1c86856d9e1234868d672837" },
  source: { path: "tests/helpers/render-consumer-reference.mjs", sha256: "88802a948909d5e40470be6b5481766ce2de498e59c053ac68af370b46e72ca9" },
};

export const BASELINE_METADATA_SHA256 = sha256(JSON.stringify({ environment: BASELINE_ENVIRONMENT, reference: BASELINE_REFERENCE }));
export const CALIBRATION_CANONICAL_REPOSITORY = "changeroa/StyleGallery";
export const CALIBRATION_EXECUTION_REPOSITORIES = Object.freeze(["ark-jo/StyleGallery", CALIBRATION_CANONICAL_REPOSITORY]);
export const CALIBRATION_EXTERNAL_VERIFICATION = {
  artifact: {
    api_digest: "sha256:3f11a517b447e1b5a1da17d9ee66ba2dd947fc8a0a482c447556ef00652e6074",
    expires_at: "2026-07-27T15:01:36Z",
    id: "8283099324",
    name: "chromium-sentinel-calibration-29260372260-18229be570766d3b42f5600955120bfcba690b76",
    size_in_bytes: 70310,
  },
  repository_relationship: {
    execution_is_fork: true,
    parent: CALIBRATION_CANONICAL_REPOSITORY,
    source: CALIBRATION_CANONICAL_REPOSITORY,
  },
  source: "https://github.com/ark-jo/StyleGallery/actions/runs/29260372260",
  verified_at: "2026-07-13T15:04:41Z",
};

export function finding(code, file, message) {
  return { code, message, path: file };
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function readJson(file, failures) {
  if (!fs.existsSync(file)) {
    failures.push(finding("baseline_file_missing", file, "required baseline record is missing"));
    return undefined;
  }
  try {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 1024 * 1024) throw new Error("JSON input must be a regular file no larger than 1 MiB");
    return parseStrictJson(fs.readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(finding("baseline_json_invalid", file, error instanceof Error ? error.message : String(error)));
    return undefined;
  }
}

function sameValue(left, right) {
  return isDeepStrictEqual(left, right);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function rejectUnknown(value, allowed, code, file, failures) {
  if (!isRecord(value)) return;
  for (const key of Object.keys(value).filter((key) => !allowed.has(key))) {
    failures.push(finding(code, file, `unsupported property ${key}`));
  }
}

function isHash(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

export function validateEnvironment(environment, file) {
  return sameValue(environment, BASELINE_ENVIRONMENT)
    ? []
    : [finding("calibration_environment_mismatch", file, "environment must match the immutable linux/amd64 calibration image")];
}

export function validateCalibration(record, file) {
  const failures = [];
  if (!isRecord(record)) return [finding("calibration_record_invalid", file, "calibration record must be an object")];
  const allowed = new Set(["baseline_owner_approval", "committed_ci", "environment", "reference", "required_runs", "runs", "schema_version", "status"]);
  rejectUnknown(record, allowed, "calibration_property_unknown", file, failures);
  if (record.schema_version !== "1.0") failures.push(finding("calibration_schema_version", file, "schema_version must be 1.0"));
  if (record.baseline_owner_approval !== "pending") failures.push(finding("baseline_owner_approval_invalid", file, "baseline owner approval must remain pending"));
  if (record.required_runs !== 20) failures.push(finding("calibration_required_runs", file, "required_runs must equal 20"));
  failures.push(...validateEnvironment(record.environment, file));
  if (!sameValue(record.reference, BASELINE_REFERENCE)) failures.push(finding("calibration_reference_mismatch", file, "source and baseline hashes must match the proposed reference"));
  if (!Array.isArray(record.runs)) return [...failures, finding("calibration_runs_invalid", file, "runs must be an array")];
  if (record.status === "awaiting_committed_ci") {
    if (record.runs.length !== 0 || record.committed_ci !== null) failures.push(finding("calibration_pending_evidence_forbidden", file, "pending calibration cannot claim runs or committed CI"));
    return failures;
  }
  if (!["awaiting_external_verification", "completed"].includes(record.status)) return [...failures, finding("calibration_status_invalid", file, "status must be awaiting_committed_ci, awaiting_external_verification, or completed")];
  if (!isRecord(record.committed_ci)) failures.push(finding("calibration_committed_ci_missing", file, "calibrated record requires committed CI metadata"));
  else {
    rejectUnknown(record.committed_ci, new Set(["artifact_name", "checkout_sha", "execution_repository", "external_verification", "head_sha", "raw_evidence_sha256", "repository", "run_attempt", "run_id", "sha", "workflow"]), "calibration_committed_ci_property_unknown", file, failures);
    const expectedArtifact = `chromium-sentinel-calibration-${record.committed_ci.run_id}-${record.committed_ci.sha}`;
    if (!/^[0-9]+$/.test(record.committed_ci.run_id ?? "")
      || !/^[0-9]+$/.test(record.committed_ci.run_attempt ?? "")
      || !/^[0-9a-f]{40}$/.test(record.committed_ci.sha ?? "")
      || !/^[0-9a-f]{40}$/.test(record.committed_ci.head_sha ?? "")
      || record.committed_ci.checkout_sha !== record.committed_ci.sha
      || !CALIBRATION_EXECUTION_REPOSITORIES.includes(record.committed_ci.execution_repository)
      || !/^[0-9a-f]{64}$/.test(record.committed_ci.raw_evidence_sha256 ?? "")
      || record.committed_ci.repository !== CALIBRATION_CANONICAL_REPOSITORY
      || record.committed_ci.workflow !== ".github/workflows/validate.yml"
      || record.committed_ci.artifact_name !== expectedArtifact) {
      failures.push(finding("calibration_committed_ci_invalid", file, "canonical and execution repositories, workflow, run, attempt, SHAs, raw evidence, and artifact name must have the canonical identity"));
    }
    if (record.status === "awaiting_external_verification" && record.committed_ci.external_verification !== null) {
      failures.push(finding("calibration_external_verification_preclaim", file, "awaiting calibration must not claim uploaded artifact verification"));
    }
    if (record.status === "completed") {
      if (!("external_verification" in record.committed_ci) || record.committed_ci.external_verification === null) {
        failures.push(finding("calibration_external_verification_missing", file, "completed calibration requires independently checked run and artifact metadata"));
      } else {
        const external = record.committed_ci.external_verification;
        const expectedSource = `https://github.com/${record.committed_ci.execution_repository}/actions/runs/${record.committed_ci.run_id}`;
        if (!sameValue(external, CALIBRATION_EXTERNAL_VERIFICATION)
          || external?.source !== expectedSource
          || external?.artifact?.name !== record.committed_ci.artifact_name
          || external?.artifact?.api_digest === `sha256:${record.committed_ci.raw_evidence_sha256}`) {
          failures.push(finding("calibration_external_verification_invalid", file, "external verification must equal the independently checked GitHub Actions run, fork relationship, and artifact API identity"));
        }
      }
    }
  }
  if (record.runs.length !== 20) failures.push(finding("calibration_run_count", file, "calibrated record requires exactly 20 runs"));
  const runAllowed = new Set(["architecture", "ax_sha256", "completed", "dom_sha256", "metadata_sha256", "png_sha256", "run", "screenshot_diff_pixels"]);
  for (const run of record.runs) {
    if (!isRecord(run)) {
      failures.push(finding("calibration_run_invalid", file, "every run must be an object"));
      continue;
    }
    rejectUnknown(run, runAllowed, "calibration_run_property_unknown", file, failures);
    if (!Number.isInteger(run.run) || run.run < 1 || run.run > 20) failures.push(finding("calibration_run_number_invalid", file, "run must be an integer from 1 through 20"));
    if (run.completed !== true) failures.push(finding("calibration_run_incomplete", file, "every calibration run must complete"));
    if (run.architecture !== "amd64") failures.push(finding("calibration_architecture_variance", file, "every run must record architecture amd64"));
    if (![run.ax_sha256, run.dom_sha256, run.metadata_sha256, run.png_sha256].every(isHash)) failures.push(finding("calibration_hash_invalid", file, "every artifact hash must be 64 lowercase hexadecimal characters"));
    if (run.png_sha256 !== BASELINE_REFERENCE.baseline.sha256) failures.push(finding("calibration_baseline_hash_mismatch", file, "every completed PNG must equal the proposed baseline hash"));
    if (run.metadata_sha256 !== BASELINE_METADATA_SHA256) failures.push(finding("calibration_metadata_hash_mismatch", file, "every completed metadata hash must equal the canonical environment and reference hash"));
    if (run.screenshot_diff_pixels !== 0) failures.push(finding("calibration_diff_nonzero", file, "every screenshot diff must equal zero"));
  }
  const runNumbers = record.runs.map((run) => run?.run);
  if (new Set(runNumbers).size !== runNumbers.length) failures.push(finding("calibration_run_duplicate", file, "calibration run numbers must be unique"));
  if (!sameValue([...runNumbers].sort((left, right) => left - right), Array.from({ length: 20 }, (_, index) => index + 1))) failures.push(finding("calibration_run_set", file, "calibration runs must be the complete range 1 through 20"));
  const architectures = new Set(record.runs.map((run) => run?.architecture));
  if (architectures.size !== 1 || !architectures.has("amd64")) failures.push(finding("calibration_architecture_variance", file, "every run must record architecture amd64"));
  if (["png_sha256", "dom_sha256", "ax_sha256"].some((field) => new Set(record.runs.map((run) => run?.[field])).size !== 1)) failures.push(finding("calibration_hash_variance", file, "PNG, DOM, and AX hashes must each be identical across runs"));
  if (new Set(record.runs.map((run) => run?.metadata_sha256)).size !== 1) failures.push(finding("calibration_metadata_variance", file, "stable environment metadata must be identical across runs"));
  return failures;
}

export function validateManifest(manifest, file, root) {
  const failures = [];
  if (!isRecord(manifest)) return [finding("baseline_manifest_invalid", file, "baseline manifest must be an object")];
  const allowed = new Set(["architecture", "baseline", "baseline_owner_approval", "browser_revision", "browser_version", "calibration", "container_image", "node", "os", "platform", "playwright", "schema_version", "source", "status", "viewport"]);
  rejectUnknown(manifest, allowed, "baseline_manifest_property_unknown", file, failures);
  if (manifest.schema_version !== "1.0" || manifest.status !== "proposed") failures.push(finding("baseline_manifest_state", file, "manifest must be proposed schema 1.0"));
  if (manifest.baseline_owner_approval !== "pending") failures.push(finding("baseline_owner_approval_invalid", file, "baseline owner approval must remain pending"));
  for (const [key, value] of Object.entries(BASELINE_ENVIRONMENT)) if (!sameValue(manifest[key], value)) failures.push(finding("baseline_environment_mismatch", file, `${key} differs from the immutable environment`));
  rejectUnknown(manifest.calibration, new Set(["record", "required_runs", "workflow_artifact_name"]), "baseline_calibration_property_unknown", file, failures);
  if (!isRecord(manifest.calibration) || manifest.calibration.required_runs !== 20 || manifest.calibration.record !== "consumer-reference/baselines/calibration.json") failures.push(finding("baseline_calibration_route", file, "manifest must route to the 20-run calibration record"));
  if (manifest.calibration?.workflow_artifact_name !== "chromium-sentinel-calibration-${run_id}-${sha}") failures.push(finding("baseline_artifact_name", file, "workflow artifact name template is immutable"));
  for (const [kind, entry] of [["source", manifest.source], ["baseline", manifest.baseline]]) {
    rejectUnknown(entry, new Set(["path", "sha256"]), `baseline_${kind}_property_unknown`, file, failures);
    if (!sameValue(entry, BASELINE_REFERENCE[kind])) failures.push(finding(`baseline_${kind}_reference_mismatch`, file, `${kind} identity must equal the proposed reference`));
    const target = typeof entry?.path === "string" ? path.resolve(root, entry.path) : "";
    if (!isRecord(entry) || !isHash(entry.sha256)) failures.push(finding(`baseline_${kind}_invalid`, file, `${kind} requires an exact path and 64-character hash`));
    if (!target || !target.startsWith(`${root}${path.sep}`) || !fs.existsSync(target)) failures.push(finding(`baseline_${kind}_missing`, file, `${kind} path must resolve inside the repository`));
    else if (fs.lstatSync(target).isSymbolicLink() || !fs.lstatSync(target).isFile() || !fs.realpathSync(target).startsWith(`${fs.realpathSync(root)}${path.sep}`)) failures.push(finding(`baseline_${kind}_file_invalid`, file, `${kind} must be a regular repository file, not a directory or symlink`));
    else if (entry.sha256 !== sha256(fs.readFileSync(target))) failures.push(finding(`baseline_${kind}_hash_mismatch`, file, `${kind} hash differs from repository bytes`));
  }
  return failures;
}
