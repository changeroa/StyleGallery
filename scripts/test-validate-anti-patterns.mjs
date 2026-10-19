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
  { name: "missing first_seen", mutate: (c) => { delete c.entries[0].first_seen; }, expected: "entry_field_missing" },
  { name: "missing evidence_grade", mutate: (c) => { delete c.entries[0].evidence_grade; }, expected: "entry_field_missing" },
  { name: "invalid date format", mutate: (c) => { c.entries[0].first_seen = "19 October 2026"; }, expected: "entry_date_invalid" },
  { name: "impossible calendar date", mutate: (c) => { c.entries[0].first_seen = "2026-02-30"; }, expected: "entry_date_invalid" },
  { name: "unknown evidence grade", mutate: (c) => { c.entries[0].evidence_grade = "measured"; }, expected: "entry_grade_invalid" },
  { name: "owner taste cannot gate", mutate: (c) => { c.entries[0].evidence_grade = "owner-taste"; }, expected: "opinion_must_be_review" },
  { name: "consensus opinion cannot gate", mutate: (c) => { c.entries[0].evidence_grade = "consensus-opinion"; }, expected: "opinion_must_be_review" },
  { name: "missing rejected list", mutate: (c) => { delete c.reviewed_and_rejected; }, expected: "catalog_field_missing" },
  { name: "rejected list not array", mutate: (c) => { c.reviewed_and_rejected = {}; }, expected: "rejected_list_invalid" },
  { name: "rejected item not object", mutate: (c) => { c.reviewed_and_rejected.push(null); }, expected: "rejected_item_invalid" },
  { name: "rejected item missing reason", mutate: (c) => { delete c.reviewed_and_rejected[0].reason; }, expected: "rejected_item_invalid" },
  { name: "rejected item unknown field", mutate: (c) => { c.reviewed_and_rejected[0].extra = true; }, expected: "rejected_item_invalid" },
  { name: "rejected item invalid id", mutate: (c) => { c.reviewed_and_rejected[0].id = "not an id"; }, expected: "rejected_id_invalid" },
  { name: "rejected item short revision", mutate: (c) => { c.reviewed_and_rejected[0].source_revision = "b9ca2fd"; }, expected: "rejected_revision_invalid" },
  { name: "rejected item invalid repository", mutate: (c) => { c.reviewed_and_rejected[0].source_repository = "https://github.com/owner/repo"; }, expected: "rejected_source_invalid" },
  { name: "rejected item escaping path", mutate: (c) => { c.reviewed_and_rejected[0].source_path = "../outside.md"; }, expected: "rejected_source_invalid" },
  { name: "rejected item duplicate id", mutate: (c) => { c.reviewed_and_rejected.push(structuredClone(c.reviewed_and_rejected[0])); }, expected: "rejected_id_duplicate" },
  { name: "rejected id is active", mutate: (c) => { c.reviewed_and_rejected[0].id = c.entries[0].id; }, expected: "rejected_id_collision" },
  { name: "unqualified rejected id is active", mutate: (c) => { c.reviewed_and_rejected[0].id = c.entries[0].id.replace(/^slop\./, ""); }, expected: "rejected_id_collision" },
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
