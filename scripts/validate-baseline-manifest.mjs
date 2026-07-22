#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { readJson, validateCalibration, validateManifest } from "./baseline-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = { calibration: "consumer-reference/baselines/calibration.json", json: false, manifest: "consumer-reference/baselines/manifest.json" };
const failures = [];
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") options.json = true;
  else if (argument === "--manifest" || argument === "--calibration") {
    const value = process.argv[index + 1];
    if (!value) failures.push({ code: "argument_value_required", message: `${argument} requires a value`, path: "<cli>" });
    else {
      options[argument.slice(2)] = value;
      index += 1;
    }
  } else failures.push({ code: "argument_unknown", message: `unsupported argument ${argument}`, path: "<cli>" });
}

const manifestPath = path.resolve(repositoryRoot, options.manifest);
const calibrationPath = path.resolve(repositoryRoot, options.calibration);
const manifestSchemaPath = path.join(repositoryRoot, "consumer-reference/schema/baseline-manifest.schema.json");
const calibrationSchemaPath = path.join(repositoryRoot, "consumer-reference/schema/calibration-record.schema.json");
const manifest = readJson(manifestPath, failures);
const calibration = readJson(calibrationPath, failures);
const manifestSchema = readJson(manifestSchemaPath, failures);
const calibrationSchema = readJson(calibrationSchemaPath, failures);
const ajv = new Ajv2020({ allErrors: true, strict: false });
for (const [kind, value, schema, file] of [["manifest", manifest, manifestSchema, manifestPath], ["calibration", calibration, calibrationSchema, calibrationPath]]) {
  if (value === undefined || schema === undefined) continue;
  const validate = ajv.compile(schema);
  if (!validate(value)) for (const error of validate.errors ?? []) failures.push({ code: `baseline_${kind}_schema_invalid`, message: `${error.instancePath || "/"} ${error.message}`, path: file });
}
if (manifest !== undefined) failures.push(...validateManifest(manifest, manifestPath, repositoryRoot));
if (calibration !== undefined) failures.push(...validateCalibration(calibration, calibrationPath));
const uniqueFailures = [...new Map(failures.map((failure) => [`${failure.code}:${failure.path}:${failure.message}`, failure])).values()];
const result = { failures: uniqueFailures, ok: uniqueFailures.length === 0, warnings: [] };
if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else if (!result.ok) process.stderr.write(`${result.failures.map((failure) => `${failure.code}: ${failure.message}`).join("\n")}\n`);
if (!result.ok) process.exitCode = 1;
