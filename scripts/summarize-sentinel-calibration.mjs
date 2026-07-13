#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { BASELINE_ENVIRONMENT, BASELINE_REFERENCE, finding, sha256, validateCalibration } from "./baseline-contract.mjs";
import { parseCalibrationRun } from "./calibration-raw-contract.mjs";

const options = { artifactName: "", checkoutSha: "", executionRepository: "", headSha: "", input: "", json: false, output: "", repository: "", runAttempt: "", runId: "", sha: "", workflow: "" };
const valueOptions = new Map([
  ["--artifact-name", "artifactName"], ["--checkout-sha", "checkoutSha"], ["--execution-repository", "executionRepository"], ["--head-sha", "headSha"],
  ["--input", "input"], ["--output", "output"], ["--repository", "repository"],
  ["--run-attempt", "runAttempt"], ["--run-id", "runId"], ["--sha", "sha"], ["--workflow", "workflow"],
]);
const failures = [];
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") options.json = true;
  else if (valueOptions.has(argument)) {
    const value = process.argv[index + 1];
    if (!value) failures.push(finding("argument_value_required", "<cli>", `${argument} requires a value`));
    else {
      options[valueOptions.get(argument)] = value;
      index += 1;
    }
  } else failures.push(finding("argument_unknown", "<cli>", `unsupported argument ${argument}`));
}

if (!options.input || !options.output) failures.push(finding("calibration_path_required", "<cli>", "--input and --output are required"));
const inputIsDirectory = Boolean(options.input && fs.existsSync(options.input) && !fs.lstatSync(options.input).isSymbolicLink() && fs.lstatSync(options.input).isDirectory());
if (options.input && fs.existsSync(options.input) && !inputIsDirectory) failures.push(finding("calibration_input_invalid", options.input, "input must be a regular raw calibration directory, not a file or symlink"));
const expectedOutput = options.input ? path.join(path.resolve(options.input), "calibration.json") : "";
if (options.output && path.resolve(options.output) !== expectedOutput) failures.push(finding("calibration_output_route", options.output, "output must be calibration.json directly inside the raw input directory"));
if (inputIsDirectory && options.output && path.resolve(options.output) === expectedOutput && fs.existsSync(options.output)) {
  if (fs.lstatSync(options.output).isDirectory()) failures.push(finding("calibration_output_invalid", options.output, "output path must not be a directory"));
  else fs.rmSync(options.output);
}
const runs = [];
if (options.input && fs.existsSync(options.input)) {
  if (inputIsDirectory) {
    const directories = fs.readdirSync(options.input, { withFileTypes: true });
    const expectedDirectories = Array.from({ length: 20 }, (_, index) => `run-${String(index + 1).padStart(2, "0")}`);
    for (const directory of directories.filter((entry) => !entry.isDirectory() || !expectedDirectories.includes(entry.name))) {
      failures.push(finding("calibration_run_directory_unknown", path.join(options.input, directory.name), "raw input may contain only run-01 through run-20 directories"));
    }
    for (let run = 1; run <= 20; run += 1) {
      const name = expectedDirectories[run - 1];
      const root = path.join(options.input, name);
      if (!fs.existsSync(root)) failures.push(finding("calibration_run_directory_missing", root, `${name} is required`));
      else if (fs.lstatSync(root).isSymbolicLink() || !fs.lstatSync(root).isDirectory() || !fs.realpathSync(root).startsWith(`${fs.realpathSync(options.input)}${path.sep}`)) failures.push(finding("calibration_run_directory_invalid", root, `${name} must be a contained regular directory, not a file or symlink`));
      else {
        const parsed = parseCalibrationRun(root, run, failures);
        if (parsed) runs.push(parsed);
      }
    }
  }
} else if (options.input) failures.push(finding("calibration_input_missing", options.input, "input artifact directory does not exist"));

const rawEvidence = failures.length === 0 ? sha256(Array.from({ length: 20 }, (_, index) => path.join(options.input, `run-${String(index + 1).padStart(2, "0")}`))
  .flatMap((root) => fs.readdirSync(root).sort().map((name) => {
    const file = path.join(root, name);
    return `${path.relative(options.input, file)}:${sha256(fs.readFileSync(file))}`;
  })).join("\n")) : "";

const record = {
  baseline_owner_approval: "pending",
  committed_ci: {
    artifact_name: options.artifactName,
    checkout_sha: options.checkoutSha,
    execution_repository: options.executionRepository,
    head_sha: options.headSha,
    raw_evidence_sha256: rawEvidence,
    repository: options.repository,
    run_attempt: options.runAttempt,
    run_id: options.runId,
    sha: options.sha,
    workflow: options.workflow,
  },
  environment: BASELINE_ENVIRONMENT,
  required_runs: 20,
  reference: BASELINE_REFERENCE,
  runs,
  schema_version: "1.0",
  status: "completed",
};
failures.push(...validateCalibration(record, options.output || "<output>"));
if (failures.length === 0) {
  const temporaryOutput = `${options.output}.tmp`;
  fs.writeFileSync(temporaryOutput, `${JSON.stringify(record, null, 2)}\n`);
  fs.renameSync(temporaryOutput, options.output);
}
const diffs = runs.map((run) => run.screenshot_diff_pixels).sort((left, right) => left - right);
const stats = diffs.length === 20 ? { max: diffs[19], mean: diffs.reduce((sum, value) => sum + value, 0) / 20, min: diffs[0], p95: diffs[18] } : null;
const uniqueFailures = [...new Map(failures.map((failure) => [`${failure.code}:${failure.path}:${failure.message}`, failure])).values()];
const result = { failures: uniqueFailures, ok: uniqueFailures.length === 0, runs: runs.length, stats, status: uniqueFailures.length === 0 ? "completed" : "incomplete", warnings: [] };
if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else if (!result.ok) process.stderr.write(`${result.failures.map((failure) => `${failure.code}: ${failure.message}`).join("\n")}\n`);
if (!result.ok) process.exitCode = 1;
