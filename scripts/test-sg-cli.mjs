#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { agentNativeFixture } from "./agent-native/fixture.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repositoryRoot, "scripts", "sg.mjs");
const profileRef = "sg:profile/editorial-reference-profile";
const versionRef = agentNativeFixture.records.find(({ stable_ref }) => stable_ref === profileRef)?.version_id;

const successCases = [
  { command: "discover", baseArgs: ["discover"] },
  { command: "resolve", baseArgs: ["resolve", profileRef] },
  { command: "resolve", baseArgs: ["resolve", versionRef], name: "resolve_version_id" },
  { command: "claims", baseArgs: ["claims", profileRef] },
  { command: "context", baseArgs: ["context", profileRef] },
  { command: "ops", baseArgs: ["ops"] },
];

const failureCases = [
  { args: ["--format", "json"], code: "argument_value_required", name: "missing_command" },
  { args: ["resolve", "--format", "json"], code: "argument_value_required", name: "resolve_missing_stable_ref" },
  { args: ["claims", "--format", "json"], code: "argument_value_required", name: "claims_missing_stable_ref" },
  { args: ["resolve", "not-a-stable-ref", "--format", "json"], code: "stable_ref_malformed", name: "malformed_stable_ref" },
  { args: ["resolve", "sg:profile/unknown-profile", "--format", "json"], code: "stable_ref_unknown", name: "unknown_stable_ref" },
  { args: ["unknown-command", "--format", "json"], code: "command_unknown", name: "unknown_command" },
  { args: ["discover", "--unknown", "--format", "json"], code: "argument_unknown", name: "unknown_option" },
  { args: ["--format", "json", "discover", "--format"], code: "argument_value_required", name: "format_missing_value" },
  { args: ["--format", "json", "discover", "--format", "yaml"], code: "format_unsupported", name: "unsupported_format" },
];

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

function parseJson(child) {
  if (typeof child.stdout !== "string" || child.stdout.length === 0) return null;
  try {
    return JSON.parse(child.stdout);
  } catch {
    return null;
  }
}

function summarize(child, report) {
  return {
    report,
    signal: child.signal,
    status: child.status,
    stderr: child.stderr,
    stdout: child.stdout,
  };
}

function hasSuccessContract(child, report, command) {
  return child.status === 0
    && child.signal === null
    && child.stderr.length === 0
    && report !== null
    && report.ok === true
    && report.operation === command
    && report.result !== null
    && typeof report.result === "object";
}

function formatVariants(baseArgs) {
  const command = baseArgs[0];
  const operands = baseArgs.slice(1);
  return [
    [...baseArgs, "--format", "json"],
    ["--format", "json", ...baseArgs],
    [command, "--format", "json", ...operands],
  ];
}

function runSuccessCase(testCase) {
  const variants = formatVariants(testCase.baseArgs);
  const runs = variants.map((args) => {
    const child = run(args);
    return { args, child, report: parseJson(child) };
  });
  const reference = runs[0];
  const equivalent = runs.every(({ child, report }) => (
    hasSuccessContract(child, report, testCase.command)
      && child.stdout === reference.child.stdout
  ));
  const repeated = run(testCase.baseArgs.concat(["--format", "json"]));
  const repeatedReport = parseJson(repeated);
  const deterministic = hasSuccessContract(repeated, repeatedReport, testCase.command)
    && repeated.stdout === reference.child.stdout;
  return {
    actual: runs.map(({ args, child, report }) => ({ args, ...summarize(child, report) })),
    expected: "all --format json positions produce one stdout-only success JSON document with identical bytes",
    name: `${testCase.name ?? testCase.command}_format_order_and_stdout_contract`,
    ok: equivalent && deterministic,
  };
}

function runFailureCase(testCase) {
  const child = run(testCase.args);
  const report = parseJson(child);
  const codes = Array.isArray(report?.failures)
    ? report.failures.map((failure) => failure?.code)
    : [];
  return {
    actual: { codes, ...summarize(child, report) },
    expected: `nonzero stdout-only JSON failure containing stable code ${testCase.code}`,
    name: testCase.name,
    ok: child.status !== 0
      && child.signal === null
      && child.stderr.length === 0
      && report?.ok === false
      && codes.length > 0
      && codes.includes(testCase.code),
  };
}

const results = [
  ...successCases.map(runSuccessCase),
  ...failureCases.map(runFailureCase),
];
const report = { ok: results.every((result) => result.ok), results };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.ok ? 0 : 1;
