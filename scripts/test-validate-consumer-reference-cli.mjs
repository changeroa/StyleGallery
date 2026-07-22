#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(repositoryRoot, "scripts", "validate-consumer-reference.mjs");
const validItem = "consumer-reference/fixtures/valid-experimental.json";
const errorCases = [
  { args: ["--item", "--json"], codes: ["argument_value_required"], name: "item_missing_value_before_json" },
  { args: ["--item", "--unknown", "--json"], codes: ["argument_value_required", "argument_unknown"], name: "item_missing_value_before_unknown" },
  { args: ["--profile", "--json"], codes: ["argument_value_required"], name: "profile_missing_value_before_json" },
  { args: ["--profile", "--unknown", "--json"], codes: ["argument_value_required", "argument_unknown"], name: "profile_missing_value_before_unknown" },
  { args: ["--json", "--item"], codes: ["argument_value_required"], name: "json_before_item_missing_value" },
  { args: ["--json", "--profile"], codes: ["argument_value_required"], name: "json_before_profile_missing_value" },
];

function run(args) {
  return spawnSync(process.execPath, [validator, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

function runErrorCase(testCase) {
  const child = run(testCase.args);
  let report;
  try {
    report = JSON.parse(child.stdout);
  } catch (error) {
    return {
      actual: { stderr: child.stderr.trim(), status: child.status, stdout: child.stdout },
      expected: `${testCase.codes.join(",")} in parseable JSON with nonzero exit`,
      name: testCase.name,
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  const codes = Array.isArray(report.failures) ? report.failures.map((failure) => failure.code) : [];
  return {
    actual: { codes, ok: report.ok, status: child.status, stderr: child.stderr.trim() },
    expected: `${testCase.codes.join(",")} in parseable JSON with nonzero exit`,
    name: testCase.name,
    ok: child.status !== 0
      && child.stderr.length === 0
      && report.ok === false
      && codes.length === testCase.codes.length
      && testCase.codes.every((code) => codes.includes(code)),
  };
}

const results = errorCases.map(runErrorCase);
const jsonLast = run(["--item", validItem, "--json"]);
const jsonFirst = run(["--json", "--item", validItem]);
results.push({
  actual: { firstStatus: jsonFirst.status, lastStatus: jsonLast.status, stderr: `${jsonFirst.stderr}${jsonLast.stderr}` },
  expected: "valid arguments produce byte-identical JSON regardless of --json position",
  name: "valid_json_option_order",
  ok: jsonFirst.status === 0
    && jsonLast.status === 0
    && jsonFirst.stderr.length === 0
    && jsonLast.stderr.length === 0
    && jsonFirst.stdout === jsonLast.stdout,
});

const report = { ok: results.every((result) => result.ok), results };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.ok ? 0 : 1;
