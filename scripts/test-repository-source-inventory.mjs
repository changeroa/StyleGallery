#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventoryScript = path.join(repositoryRoot, "scripts", "repository-source-inventory.mjs");
const packagePath = path.join(repositoryRoot, "package.json");
const workflowPath = path.join(repositoryRoot, ".github", "workflows", "validate.yml");
const temporaryRoots = new Set();

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    timeout: 30_000,
    ...options,
  });
}

function git(root, args) {
  const result = run("git", ["-C", root, ...args]);
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result;
}

function write(root, relative, content) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function createRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-source-inventory-"));
  temporaryRoots.add(root);
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "inventory@example.invalid"]);
  git(root, ["config", "user.name", "Inventory Harness"]);
  write(root, "base.mjs", "export const base = true;\n");
  write(root, "base.json", "{\"base\":true}\n");
  git(root, ["add", "--", "base.mjs", "base.json"]);
  git(root, ["commit", "--quiet", "-m", "base"]);
  return root;
}

function track(root, relative, content) {
  write(root, relative, content);
  git(root, ["add", "--", relative]);
}

function invoke(root, extraArgs = []) {
  const result = run(process.execPath, [inventoryScript, "--root", root, "--json", ...extraArgs], {
    cwd: repositoryRoot,
  });
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    assert.fail(`inventory output was not JSON (status ${result.status}): ${result.stdout}\n${result.stderr}`);
  }
  return { ...result, report };
}

function expectedTrackedSources(root) {
  const result = run("git", ["-C", root, "ls-files", "-z", "--", "*.mjs", "*.json"], { encoding: "buffer" });
  assert.equal(result.status, 0, result.stderr?.toString("utf8"));
  return result.stdout
    .subarray(0, Math.max(0, result.stdout.length - (result.stdout.at(-1) === 0 ? 1 : 0)))
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
}

function failureCodes(report) {
  return report.failures.map((failure) => failure.code);
}

test.after(() => {
  for (const root of temporaryRoots) fs.rmSync(root, { force: true, recursive: true });
});

test("discovers new tracked MJS and JSON with spaces and exactly matches git ls-files", () => {
  const root = createRepository();
  track(root, "new source file.mjs", "export const discovered = true;\n");
  track(root, "new data file.json", "{\"discovered\":true}\n");
  write(root, ".omo/untracked-invalid.mjs", "export const = ;\n");

  const { status, report } = invoke(root);
  const expected = expectedTrackedSources(root);
  assert.equal(status, 0);
  assert.equal(report.ok, true);
  assert.deepEqual(report.sources.all, expected);
  assert.deepEqual([...report.sources.mjs, ...report.sources.json].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))), expected);
  assert.equal(report.sources.all.includes(".omo/untracked-invalid.mjs"), false);
});

test("rejects malformed tracked MJS with a space without shell interpolation or source execution", () => {
  const root = createRepository();
  const marker = path.join(root, "PWNED");
  track(root, "bad; touch PWNED # file.mjs", `import fs from "node:fs"; fs.writeFileSync(${JSON.stringify(marker)}, "executed"); export const = ;\n`);

  const { status, report } = invoke(root);
  assert.notEqual(status, 0);
  assert.deepEqual(failureCodes(report), ["source_syntax_invalid"]);
  assert.equal(report.failures[0].path, "bad; touch PWNED # file.mjs");
  assert.equal(fs.existsSync(marker), false);
});

test("rejects malformed tracked JSON with a space from the dirty worktree", () => {
  const root = createRepository();
  track(root, "bad data file.json", "{\"valid\":true}\n");
  git(root, ["commit", "--quiet", "-m", "track json"]);
  write(root, "bad data file.json", "{ malformed json\n");

  const { status, report } = invoke(root);
  assert.notEqual(status, 0);
  assert.deepEqual(failureCodes(report), ["source_json_invalid"]);
  assert.equal(report.failures[0].path, "bad data file.json");
});

test("uses ordinary JSON.parse semantics", () => {
  const root = createRepository();
  track(root, "duplicate.json", "{\"value\":1,\"value\":2}\n");
  const { status, report } = invoke(root);
  assert.equal(status, 0);
  assert.equal(report.ok, true);
});

test("rejects a tracked symlink", () => {
  const root = createRepository();
  write(root, "target.json", "{}\n");
  fs.symlinkSync("target.json", path.join(root, "linked.json"));
  git(root, ["add", "--", "linked.json"]);

  const { status, report } = invoke(root);
  assert.notEqual(status, 0);
  assert.deepEqual(failureCodes(report), ["source_path_invalid"]);
  assert.equal(report.failures[0].path, "linked.json");
});

test("rejects a tracked source whose parent directory is replaced by a symlink", () => {
  const root = createRepository();
  track(root, "tracked parent/file.json", "{\"inside\":true}\n");
  const external = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-source-inventory-external-"));
  temporaryRoots.add(external);
  write(external, "file.json", "{\"external\":true}\n");
  fs.rmSync(path.join(root, "tracked parent"), { recursive: true });
  fs.symlinkSync(external, path.join(root, "tracked parent"));

  const { status, report } = invoke(root);
  assert.notEqual(status, 0);
  assert.deepEqual(failureCodes(report), ["source_path_invalid"]);
  assert.equal(report.failures[0].path, "tracked parent/file.json");
});

test("rejects a tracked non-regular path before reading it", { skip: process.platform === "win32" }, () => {
  const root = createRepository();
  track(root, "pipe.json", "{}\n");
  fs.rmSync(path.join(root, "pipe.json"));
  const fifo = run("mkfifo", [path.join(root, "pipe.json")]);
  assert.equal(fifo.status, 0, fifo.stderr);

  const { status, report } = invoke(root);
  assert.notEqual(status, 0);
  assert.deepEqual(failureCodes(report), ["source_path_invalid"]);
  assert.equal(report.failures[0].path, "pipe.json");
});

test("rejects a stale index path missing from the worktree", () => {
  const root = createRepository();
  track(root, "stale.json", "{}\n");
  fs.rmSync(path.join(root, "stale.json"));

  const { status, report } = invoke(root);
  assert.notEqual(status, 0);
  assert.deepEqual(failureCodes(report), ["source_path_invalid"]);
  assert.equal(report.failures[0].path, "stale.json");
});

test("reports only the deterministic first invalid source in bytewise path order", () => {
  const root = createRepository();
  track(root, "a invalid.json", "{ invalid\n");
  track(root, "b invalid.mjs", "export const = ;\n");

  const first = invoke(root);
  const second = invoke(root);
  assert.notEqual(first.status, 0);
  assert.deepEqual(first.report.failures, second.report.failures);
  assert.deepEqual(failureCodes(first.report), ["source_json_invalid"]);
  assert.equal(first.report.failures[0].path, "a invalid.json");
});

test("wires the RFC3339 format suite immediately after source inventory without disturbing calibration order", () => {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const inventoryCommand = "node scripts/repository-source-inventory.mjs --json";
  const formatCommand = "npm run test:json-schema-formats";
  const whitespaceCommand = "git diff --check";
  const directCalibrationCommand = "node scripts/test-calibration-raw-contract.mjs";
  const envelopeCalibrationCommand = "node scripts/test-summarize-sentinel-calibration.mjs";

  assert.equal(packageJson.scripts["test:json-schema-formats"], "node --test scripts/test-json-schema-formats.mjs");
  assert.equal(workflow.split(formatCommand).length - 1, 1);
  assert.ok(workflow.indexOf(inventoryCommand) < workflow.indexOf(formatCommand));
  assert.ok(workflow.indexOf(formatCommand) < workflow.indexOf(whitespaceCommand));
  assert.ok(workflow.indexOf(directCalibrationCommand) < workflow.indexOf(envelopeCalibrationCommand));
});

test("rejects unknown arguments", () => {
  const result = run(process.execPath, [inventoryScript, "--json", "--unknown"]);
  assert.notEqual(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(failureCodes(report), ["argument_unknown"]);
});

test("rejects a missing --root value", () => {
  const result = run(process.execPath, [inventoryScript, "--json", "--root"]);
  assert.notEqual(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(failureCodes(report), ["argument_value_required"]);
});
