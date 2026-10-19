#!/usr/bin/env node
// Self-test for `stylegallery audit status`: the good fixture must pass, every bad fixture must fail
// with its expected failure code, and a principle list naming ids absent from the ledger must fail.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(repositoryRoot, "scripts", "sg-entry.mjs");
const fixtures = path.join(repositoryRoot, "tests", "fixtures", "audit-ledger");
const fixture = (name) => path.join(fixtures, name);

function audit(...args) {
  const result = spawnSync(process.execPath, [entry, "audit", ...args], { encoding: "utf8", timeout: 30_000 });
  return { status: result.status, stdout: result.stdout, json: args.includes("--json") ? JSON.parse(result.stdout) : null };
}

const BAD = {
  "bad-severity.json": "ledger_schema_invalid",
  "bad-verified-without-check.json": "ledger_schema_invalid",
  "bad-fixing-without-fix.json": "ledger_schema_invalid",
  "bad-status.json": "ledger_schema_invalid",
  "bad-principle-id.json": "ledger_schema_invalid",
  "bad-screenshot-path.json": "ledger_schema_invalid",
  "bad-unknown-field.json": "ledger_schema_invalid",
  "bad-duplicate-violation.json": "ledger_violation_duplicate",
};

test("every bad fixture on disk has an expected failure code", () => {
  const onDisk = fs.readdirSync(fixtures).filter((name) => name.startsWith("bad-")).sort();
  assert.deepEqual(onDisk, Object.keys(BAD).sort());
});

test("good ledger passes and reports progress", () => {
  const { status, json } = audit("status", fixture("good.json"), "--json");
  assert.equal(status, 0);
  assert.equal(json.ok, true);
  assert.deepEqual(json.summary.violations.by_status, { open: 1, fixing: 1, fixed: 0, verified: 1, wont_fix: 1 });
  assert.equal(json.summary.violations.actionable, 3);
  assert.equal(json.summary.percent_verified, 33.3);
  assert.deepEqual(json.summary.principles.without_violations, ["slop.gradient-headline-only"]);
  assert.equal(json.summary.principle_coverage, null);
});

test("text output names the counts", () => {
  const { status, stdout } = audit("status", fixture("good.json"));
  assert.equal(status, 0);
  assert.match(stdout, /Violations: 4 \(open 1, fixing 1, fixed 0, verified 1, wont_fix 1\)/);
  assert.match(stdout, /Verified: 33\.3% of 3 actionable/);
});

for (const [name, code] of Object.entries(BAD)) {
  test(`${name} fails with ${code}`, () => {
    const { status, json } = audit("status", fixture(name), "--json");
    assert.equal(status, 1);
    assert.equal(json.ok, false);
    assert.ok(json.failures.some((failure) => failure.code === code), JSON.stringify(json.failures));
    assert.equal(json.summary, undefined);
  });
}

test("complete principle list passes coverage", () => {
  const { status, json } = audit("status", fixture("good.json"), "--principles", fixture("principles.json"), "--json");
  assert.equal(status, 0);
  assert.deepEqual(json.summary.principle_coverage, { expected: 3, missing: [], unlisted: [] });
});

test("principle list with ids missing from the ledger fails", () => {
  const { status, json } = audit("status", fixture("good.json"), "--principles", fixture("principles-with-missing.json"), "--json");
  assert.equal(status, 1);
  assert.deepEqual(json.summary.principle_coverage.missing, ["hig.foundations.color", "slop.emoji-icons"]);
  assert.deepEqual(json.failures.map(({ code }) => code), ["audit_principles_missing"]);
});

test("unreadable ledger, bad principle list shape, and unknown subcommand fail", () => {
  assert.equal(audit("status", fixture("does-not-exist.json"), "--json").json.failures[0].code, "ledger_unreadable");
  const shapeless = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "sg-audit-")), "principles.json");
  fs.writeFileSync(shapeless, JSON.stringify({ ids: ["hig.foundations.color"] }));
  assert.equal(audit("status", fixture("good.json"), "--principles", shapeless, "--json").json.failures[0].code, "principles_shape_invalid");
  fs.rmSync(path.dirname(shapeless), { recursive: true, force: true });
  const unknown = audit("frobnicate");
  assert.equal(unknown.status, 1);
  assert.match(unknown.stdout, /unknown audit subcommand frobnicate/);
});
