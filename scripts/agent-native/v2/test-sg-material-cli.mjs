#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseMaterialCliArguments } from "./material-cli-adapter.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const cli = path.join(repositoryRoot, "scripts", "sg-material.mjs");
const manifest = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "consumer-reference/agent-native/v2/material-registry.json"), "utf8"));
const layout = manifest.materials.find(({ repository_path }) => repository_path === "layout/index.md");
assert(layout, "Layout material must exist");

function run(args, cwd = repositoryRoot) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
}

function reportOf(child) {
  assert.equal(child.signal, null);
  assert.equal(child.stderr, "");
  assert.ok(child.stdout.endsWith("\n"));
  assert.equal(child.stdout.trimEnd().split("\n").filter((line) => line.trim() === "").length, 0);
  return JSON.parse(child.stdout);
}

function success(args, operation, cwd) {
  const child = run(args, cwd);
  const report = reportOf(child);
  assert.equal(child.status, 0, child.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.operation, operation);
  return { child, report };
}

function failure(args, code) {
  const child = run(args);
  const report = reportOf(child);
  assert.notEqual(child.status, 0, child.stdout);
  assert.equal(report.ok, false);
  assert.deepEqual(report.failures.map((entry) => entry.code), [code]);
  assert.equal(child.stdout.includes(repositoryRoot), false);
  return { child, report };
}

const parserCases = [
  { args: ["discover"], ok: true, command: "discover", input: {} },
  { args: ["search", "--query", "Layout", "--limit", "5"], ok: true, command: "search", input: { query: "Layout", limit: 5 } },
  { args: ["--limit", "5", "--query", "Layout", "search"], ok: true, command: "search", input: { query: "Layout", limit: 5 } },
  { args: ["get", "--reference", layout.stable_ref, "--offset", "0", "--limit-bytes", "64"], ok: true, command: "get", input: { reference: layout.stable_ref, offset: 0, length: 64 } },
  { args: ["context", "--budget-tokens", "256", "--query", "Layout"], ok: true, command: "context", input: { query: "Layout", budget_tokens: 256 } },
  { args: ["--help"], ok: true, command: "help", input: {} },
];
for (const expected of parserCases) {
  const parsed = parseMaterialCliArguments(expected.args);
  assert.equal(parsed.ok, expected.ok);
  assert.equal(parsed.command, expected.command);
  assert.deepEqual(parsed.input, expected.input);
}

const parserFailures = [
  [[], "argument_value_required"],
  [["unknown"], "command_unknown"],
  [["discover", "operand"], "argument_unknown"],
  [["discover", "--query", "x"], "argument_inapplicable"],
  [["search"], "argument_value_required"],
  [["search", "--query"], "argument_value_required"],
  [["search", "--query", "x", "--query", "y"], "argument_duplicate"],
  [["search", "--wat", "x"], "argument_unknown"],
  [["search", "--query", "x", "--offset", "0"], "argument_inapplicable"],
  [["get"], "argument_value_required"],
  [["get", "--reference", layout.stable_ref, "--limit", "1"], "argument_inapplicable"],
  [["context", "--query", "x", "--limit", "1"], "argument_inapplicable"],
  [["discover", "--help"], "argument_inapplicable"],
];
for (const [args, code] of parserFailures) {
  const parsed = parseMaterialCliArguments(args);
  assert.equal(parsed.ok, false, JSON.stringify({ args, parsed }));
  assert.deepEqual(parsed.failures.map((entry) => entry.code), [code]);
}

for (const option of ["--offset", "--limit-bytes", "--limit", "--budget-tokens"]) {
  for (const value of ["", "+1", "-1", "1.0", "1e2", " 1", "1 ", "9007199254740992"]) {
    const command = option === "--offset" || option === "--limit-bytes" ? ["get", "--reference", layout.stable_ref]
      : option === "--limit" ? ["search", "--query", "Layout"]
        : ["context", "--query", "Layout"];
    const parsed = parseMaterialCliArguments([...command, option, value]);
    assert.equal(parsed.ok, false, JSON.stringify({ option, value, parsed }));
    assert.deepEqual(parsed.failures.map((entry) => entry.code), ["argument_integer_invalid"]);
  }
}

const help = success(["--help"], "help");
assert.deepEqual(help.report.result.commands.map(({ name }) => name), ["discover", "search", "get", "context"]);
assert.deepEqual(help.report.result.options, ["--query", "--reference", "--offset", "--limit-bytes", "--limit", "--budget-tokens", "--help"]);
for (const forbidden of ["resolve", "claims", "ops", "--format", "proposal", "path", "manifest", "head"]) {
  assert.equal(help.child.stdout.includes(forbidden), false, forbidden);
}

success(["discover"], "material-discover");
const searchA = success(["search", "--query", "Layout", "--limit", "5"], "material-search");
const searchB = success(["--limit", "5", "--query", "Layout", "search"], "material-search");
assert.equal(searchA.child.stdout, searchB.child.stdout);
assert.ok(searchA.report.result.results.some(({ source }) => source.stable_ref === layout.stable_ref));
const getA = success(["get", "--reference", layout.stable_ref, "--offset", "0", "--limit-bytes", "256"], "material-get");
const getB = success(["--limit-bytes", "256", "get", "--offset", "0", "--reference", layout.stable_ref], "material-get");
assert.equal(getA.child.stdout, getB.child.stdout);
assert.deepEqual(Buffer.from(getA.report.result.bytes_base64, "base64"), fs.readFileSync(path.join(repositoryRoot, layout.repository_path)).subarray(0, 256));
const contextA = success(["context", "--query", "Layout", "--budget-tokens", "256"], "material-context");
const contextB = success(["--budget-tokens", "256", "--query", "Layout", "context"], "material-context");
assert.equal(contextA.child.stdout, contextB.child.stdout);

failure(["search", "--query", ""], "material_query_empty");
failure(["search", "--query", "x".repeat(4097)], "material_query_oversized");
failure(["get", "--reference", "not-a-ref"], "material_reference_invalid");
failure(["get", "--reference", "/tmp/private/material.md"], "material_reference_invalid");
failure(["get", "--reference", layout.stable_ref, "--limit-bytes", "65537"], "material_length_invalid");
failure(["search", "--query", "Layout", "--limit", "101"], "material_search_limit_invalid");
failure(["context", "--query", "Layout", "--budget-tokens", "255"], "material_context_budget_invalid");

let splitMaterial;
let splitOffset = -1;
for (const material of manifest.materials) {
  const source = fs.readFileSync(path.join(repositoryRoot, material.repository_path));
  for (let index = 1; index < source.length; index += 1) {
    if ((source[index] & 0xc0) === 0x80) { splitMaterial = material; splitOffset = index; break; }
  }
  if (splitMaterial) break;
}
assert(splitMaterial, "admitted corpus must contain multibyte UTF-8");
failure(["get", "--reference", splitMaterial.stable_ref, "--offset", String(splitOffset)], "material_utf8_split_start");

const outside = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "sg material outside "));
try {
  const outsideRun = success(["search", "--query", "Layout", "--limit", "1"], "material-search", outside);
  assert.equal(outsideRun.child.stdout, success(["search", "--query", "Layout", "--limit", "1"], "material-search").child.stdout);
} finally { fs.rmSync(outside, { recursive: true, force: true }); }

const report = { ok: true, parser_cases: parserCases.length + parserFailures.length + 32, cli_successes: 10, cli_failures: 8 };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
