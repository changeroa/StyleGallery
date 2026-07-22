#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local");
const generator = path.join(repositoryRoot, "scripts/generate-consumer-reference-evidence.mjs");

function run(root, check = false, environment = {}) {
  const args = [generator, "--root", root, "--json"];
  if (check) args.push("--check");
  const child = spawnSync(process.execPath, args, { cwd: repositoryRoot, encoding: "utf8", env: { ...process.env, ...environment } });
  let report = { failures: [], ok: false, parse_error: true };
  try { report = JSON.parse(child.stdout); } catch { report = { failures: [], ok: false, parse_error: true }; }
  return { report, status: child.status };
}

function editJson(file, mutate) {
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  mutate(value);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-pr5-generator-"));
const results = [];

function freshRoot(name) {
  const root = path.join(tempRoot, name);
  fs.cpSync(sourceRoot, root, { recursive: true });
  return root;
}

function expectFailure(name, expected, root) {
  const child = run(root, true);
  results.push({ expected, name, ok: child.status > 0 && child.report.failures.some((failure) => failure.code === expected) });
}

function mutateGenerated(name, expected, mutate) {
  const root = freshRoot(name);
  run(root);
  const file = path.join(root, "editorial/generated/state-matrix.md");
  const lines = fs.readFileSync(file, "utf8").split("\n");
  mutate(lines);
  fs.writeFileSync(file, lines.join("\n"));
  expectFailure(name, expected, root);
}

try {
  const canonicalRoot = freshRoot("canonical");
  const generated = run(canonicalRoot);
  results.push({ expected: "canonical_generation", name: "canonical", ok: generated.status === 0 && generated.report.ok && generated.report.scaffold !== true });
  const checked = run(canonicalRoot, true);
  results.push({ expected: "deterministic_zero_drift", name: "check", ok: checked.status === 0 && checked.report.ok && checked.report.scaffold !== true });

  mutateGenerated("stale", "generated_stale", (lines) => { lines.push("stale"); });
  mutateGenerated("generated_unsorted", "generated_unsorted", (lines) => {
    const first = lines.findIndex((line) => line.startsWith("| <code>"));
    [lines[first], lines[first + 1]] = [lines[first + 1], lines[first]];
  });
  mutateGenerated("generated_duplicate", "generated_duplicate_row", (lines) => {
    const first = lines.findIndex((line) => line.startsWith("| <code>"));
    lines.splice(first + 1, 0, lines[first]);
  });
  mutateGenerated("generated_missing", "generated_missing_row", (lines) => {
    const first = lines.findIndex((line) => line.startsWith("| <code>"));
    lines.splice(first, 1);
  });
  mutateGenerated("source_count", "generated_source_count_mismatch", (lines) => {
    const first = lines.findIndex((line) => line.startsWith("| <code>"));
    lines.splice(first, 1);
  });

  const unsortedRoot = freshRoot("source_unsorted");
  editJson(path.join(unsortedRoot, "editorial/states/button.states.json"), (value) => { value.scenarios.reverse(); });
  expectFailure("source_unsorted", "source_unsorted", unsortedRoot);

  const duplicateRoot = freshRoot("scenario_duplicate");
  editJson(path.join(duplicateRoot, "editorial/states/button.states.json"), (value) => { value.scenarios.push({ ...value.scenarios[0] }); });
  expectFailure("scenario_duplicate", "scenario_duplicate", duplicateRoot);

  const missingRoot = freshRoot("fixture_scenario_missing");
  editJson(path.join(missingRoot, "editorial/states/button.states.json"), (value) => { value.scenarios = value.scenarios.filter((scenario) => scenario.id !== "action-focused"); });
  expectFailure("fixture_scenario_missing", "fixture_scenario_missing", missingRoot);

  const injectionRoot = freshRoot("markdown_injection");
  editJson(path.join(injectionRoot, "editorial/components/button.component.json"), (value) => { value.semantic_modes[0].element = "<script>alert(1)</script>|`\nnext"; });
  const injection = run(injectionRoot);
  const injectionOutput = fs.readFileSync(path.join(injectionRoot, "editorial/generated/keyboard-matrix.md"), "utf8");
  results.push({
    expected: "escaped_markdown_injection",
    name: "markdown_injection",
    ok: injection.status === 0
      && injectionOutput.includes("&lt;script&gt;alert(1)&lt;/script&gt;&#124;&#96;<br>next")
      && !injectionOutput.includes("<script>alert(1)</script>"),
  });

  const referenceRoot = freshRoot("canonical_reference_discovery");
  fs.copyFileSync(path.join(referenceRoot, "editorial/components/button.component.json"), path.join(referenceRoot, "editorial/components/alternate.component.json"));
  editJson(path.join(referenceRoot, "editorial/components/alternate.component.json"), (value) => { value.semantic_modes[0].element = "canonical alternate element"; });
  editJson(path.join(referenceRoot, "editorial/profile.json"), (value) => { value.component_records = ["components/alternate.component.json"]; });
  editJson(path.join(referenceRoot, "editorial/fixtures/button.fixture.json"), (value) => { value.component_record = "../components/alternate.component.json"; });
  const reference = run(referenceRoot);
  const referenceOutput = fs.readFileSync(path.join(referenceRoot, "editorial/generated/keyboard-matrix.md"), "utf8");
  results.push({ expected: "canonical_profile_reference", name: "canonical_reference_discovery", ok: reference.status === 0 && referenceOutput.includes("canonical alternate element") });

  const localeRoot = freshRoot("locale_determinism");
  const firstLocale = run(localeRoot, false, { LANG: "C", LC_ALL: "C" });
  const firstBytes = fs.readFileSync(path.join(localeRoot, "editorial/generated/state-matrix.md"));
  const secondLocale = run(localeRoot, false, { LANG: "tr_TR.UTF-8", LC_ALL: "tr_TR.UTF-8" });
  const secondBytes = fs.readFileSync(path.join(localeRoot, "editorial/generated/state-matrix.md"));
  results.push({ expected: "locale_independent_bytes", name: "locale_determinism", ok: firstLocale.status === 0 && secondLocale.status === 0 && firstBytes.equals(secondBytes) });
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

const failures = results.filter((result) => !result.ok).map((result) => `missing_semantic:${result.name}:${result.expected}`);
const report = { failures, ok: failures.length === 0, results };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
assert.equal(report.ok, true);
