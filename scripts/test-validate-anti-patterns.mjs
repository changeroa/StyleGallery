#!/usr/bin/env node
// Proves scripts/validate-anti-patterns.mjs accepts the committed catalog and
// fails, with the targeted code, on catalogs built to violate each invariant.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateAntiPatterns } from "./validate-anti-patterns.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(root, "scripts", "validate-anti-patterns.mjs");
const committed = JSON.parse(fs.readFileSync(path.join(root, "expression", "anti-patterns.json"), "utf8"));
const clone = () => structuredClone(committed);
const entry = (catalog, id) => {
  const found = catalog.entries.find((candidate) => candidate.id === id);
  assert.ok(found, `fixture target missing: ${id}`);
  return found;
};

const cases = [
  { name: "committed catalog", mutate: () => {}, expected: null },
  { name: "duplicate id", mutate: (c) => c.entries.push(structuredClone(entry(c, "slop.emoji-icons"))), expected: "entry_id_duplicate" },
  { name: "id outside slop namespace", mutate: (c) => { entry(c, "slop.generic-copy").id = "generic_copy"; }, expected: "entry_id_invalid" },
  { name: "missing definition", mutate: (c) => { delete entry(c, "slop.emoji-icons").definition; }, expected: "entry_field_missing" },
  { name: "empty sources", mutate: (c) => { entry(c, "slop.emoji-icons").sources = []; }, expected: "entry_field_missing" },
  { name: "unknown detectable", mutate: (c) => { entry(c, "slop.emoji-icons").detectable = "maybe"; }, expected: "entry_detectable_invalid" },
  { name: "machine entry without rule", mutate: (c) => { delete entry(c, "slop.soft-shadow-excess").detection; }, expected: "machine_rule_missing" },
  { name: "machine rule without threshold", mutate: (c) => { delete entry(c, "slop.soft-shadow-excess").detection.threshold; }, expected: "machine_rule_incomplete" },
  { name: "machine threshold without a number", mutate: (c) => { entry(c, "slop.soft-shadow-excess").detection.threshold = "too many shadows"; }, expected: "machine_threshold_not_numeric" },
  { name: "machine entry not error", mutate: (c) => { entry(c, "slop.oversized-display").severity = "warning"; }, expected: "machine_severity_invalid" },
  { name: "review entry gating as error", mutate: (c) => { entry(c, "slop.generic-copy").severity = "error"; }, expected: "review_severity_invalid" },
  { name: "review entry without question", mutate: (c) => { delete entry(c, "slop.generic-copy").review_question; }, expected: "review_question_missing" },
  { name: "review entry with machine rule", mutate: (c) => { entry(c, "slop.generic-copy").detection = structuredClone(entry(c, "slop.emoji-icons").detection); }, expected: "review_rule_present" },
  { name: "missing cited source", mutate: (c) => { entry(c, "slop.emoji-icons").sources.push("expression/does-not-exist.md"); }, expected: "entry_source_missing" },
  { name: "no benchmark citation", mutate: (c) => { entry(c, "slop.gradient-text-everywhere").sources = ["expression/techniques/display-type-calibration.md"]; }, expected: "entry_benchmark_uncited" },
  { name: "required entry removed", mutate: (c) => { c.entries = c.entries.filter(({ id }) => id !== "slop.dishonest-cta"); }, expected: "required_entry_missing" },
  { name: "entry absent from companion page", mutate: (c) => c.entries.push({ ...structuredClone(entry(c, "slop.generic-copy")), id: "slop.unlisted-entry" }), expected: "companion_id_missing" },
  { name: "empty entries", mutate: (c) => { c.entries = []; }, expected: "entries_missing" },
  { name: "profile missing", mutate: (c) => { delete c.profiles.content; }, expected: "profile_missing" },
  { name: "profile without rationale", mutate: (c) => { delete c.profiles.app.rationale; }, expected: "profile_field_missing" },
  { name: "profile relaxes unknown id", mutate: (c) => { c.profiles.content.relaxed.push("slop.not-a-rule"); }, expected: "profile_relaxed_unknown" },
  { name: "profile relaxes a review entry", mutate: (c) => { c.profiles.content.relaxed.push("slop.generic-copy"); }, expected: "profile_relaxed_unknown" },
  { name: "landing relaxes a rule", mutate: (c) => { c.profiles.landing.relaxed.push("slop.empty-screen"); }, expected: "profile_landing_relaxed" },
  { name: "unknown profile", mutate: (c) => { c.profiles.kiosk = structuredClone(c.profiles.app); }, expected: "profile_unknown" },
];

const results = [];
for (const { name, mutate, expected } of cases) {
  const catalog = clone();
  mutate(catalog);
  const result = validateAntiPatterns({ catalog });
  const codes = result.failures.map(({ code }) => code);
  if (expected === null) assert.deepEqual(result.failures, [], `${name} must pass`);
  else {
    assert.equal(result.ok, false, `${name} must fail`);
    assert.ok(codes.includes(expected), `${name} must fail with ${expected}; got ${codes.join(", ")}`);
  }
  results.push({ name, ok: result.ok, codes });
}

// Companion drift: a page listing an id the catalog does not define fails.
const drift = validateAntiPatterns({ catalog: clone(), companion: `${fs.readFileSync(path.join(root, "expression", "anti-patterns.md"), "utf8")}\n\`slop.ghost-entry\`\n` });
assert.ok(drift.failures.some(({ code }) => code === "companion_id_unknown"), "companion page with an unknown id must fail");
results.push({ name: "companion lists unknown id", ok: drift.ok, codes: drift.failures.map(({ code }) => code) });

// The CLI exits non-zero on a bad fixture file and zero on the committed catalog.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sg-anti-patterns-"));
try {
  const bad = clone();
  delete entry(bad, "slop.static-interactive").detection;
  const badFile = path.join(directory, "bad.json");
  fs.writeFileSync(badFile, JSON.stringify(bad));
  const failing = spawnSync(process.execPath, [validator, "--catalog", badFile, "--json"], { cwd: root, encoding: "utf8", timeout: 30_000 });
  assert.equal(failing.status, 1, failing.stderr);
  assert.ok(JSON.parse(failing.stdout).failures.some(({ code }) => code === "machine_rule_missing"));
  const passing = spawnSync(process.execPath, [validator, "--json"], { cwd: root, encoding: "utf8", timeout: 30_000 });
  assert.equal(passing.status, 0, passing.stdout + passing.stderr);
  results.push({ name: "cli exit codes", ok: true, codes: [] });
} finally {
  fs.rmSync(directory, { force: true, recursive: true });
}

console.log(JSON.stringify({ ok: true, cases: results.length, results }, null, 2));
