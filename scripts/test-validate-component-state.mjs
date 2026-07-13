#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local");
const validator = path.join(repositoryRoot, "scripts/validate-component-state.mjs");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function edit(root, profile, relative, mutate) {
  const file = path.join(root, profile, relative);
  const value = readJson(file);
  mutate(value);
  writeJson(file, value);
}

function scenario(value, id) {
  return value.scenarios.find((candidate) => candidate.id === id);
}

function pass(value, scenarioId, channel) {
  return value.passes.find((candidate) => candidate.scenario_id === scenarioId && candidate.channel === channel);
}

function run(root) {
  const child = spawnSync(process.execPath, [validator, "--root", root, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  let report = { failures: [], ok: false, parse_error: true };
  try { report = JSON.parse(child.stdout); } catch { report = { failures: [], ok: false, parse_error: true }; }
  return { report, status: child.status };
}

const cases = [
  ["unresolved_conditional", "conditional_unresolved", (root) => edit(root, "editorial", "components/button.component.json", (value) => { delete value.semantic_modes[0].aria_states[2].resolution; })],
  ["missing_applicability_reason", "applicability_reason_required", (root) => edit(root, "editorial", "components/button.component.json", (value) => { delete value.semantic_modes[0].aria_states[0].reason; })],
  ["missing_role_required_state", "role_required_aria_state", (root) => edit(root, "editorial", "components/button.component.json", (value) => { value.semantic_modes[1].aria_states = value.semantic_modes[1].aria_states.filter((state) => state.name !== "pressed"); })],
  ["switch_mixed", "switch_mixed_prohibited", (root) => edit(root, "editorial", "components/button.component.json", (value) => { value.semantic_modes[1] = { ...value.semantic_modes[1], aria_states: [{ name: "checked", status: "required", values: ["false", "mixed"] }], id: "switch", role: "switch" }; })],
  ["missing_environment", "evidence_schema_invalid", (root) => edit(root, "editorial", "evidence/button.evidence.json", (value) => { delete value.passes[0].environment; })],
  ["false_aggregate_pass", "aggregate_pass_forbidden", (root) => edit(root, "editorial", "evidence/button.evidence.json", (value) => { value.aggregate_pass = true; })],
  ["normative_conflict", "normative_activation_conflict", (root) => edit(root, "editorial", "states/button.states.json", (value) => { scenario(value, "action-focused").expected.activation = "suppressed"; })],
  ["preview_rolled_stable", "preview_rolled_stable", (root) => edit(root, "editorial", "components/button.component.json", (value) => { value.versions.delivery_channel = "stable"; })],
  ["expanded_surface", "expanded_surface_mismatch", (root) => edit(root, "editorial", "states/button.states.json", (value) => { scenario(value, "disclosure-expanded-loading").expected.ax.expanded = false; })],
  ["disabled_activation", "disabled_activation", (root) => edit(root, "editorial", "states/button.states.json", (value) => { scenario(value, "action-disabled-busy").expected.activation = "allowed"; })],
  ["loading_without_busy", "loading_busy_state_required", (root) => edit(root, "editorial", "states/button.states.json", (value) => { scenario(value, "action-loading-busy").states = ["focus", "loading"]; })],
  ["loading_as_disabled", "loading_disabled_conflated", (root) => edit(root, "editorial", "states/button.states.json", (value) => { scenario(value, "action-loading-busy").expected.visual.push("disabled"); })],
  ["required_channel", "required_channel_missing", (root) => edit(root, "editorial", "evidence/button.evidence.json", (value) => { value.passes = value.passes.filter((candidate) => !(candidate.scenario_id === "action-focused" && candidate.channel === "ax")); })],
  ["self_asserted_at", "at_evidence_unverified", (root) => edit(root, "editorial", "evidence/button.evidence.json", (value) => { value.passes[0].channel = "at"; value.passes[0].environment.kind = "assistive_technology"; })],
  ["duplicate_mode", "semantic_mode_duplicate", (root) => edit(root, "editorial", "components/button.component.json", (value) => { value.semantic_modes.push(structuredClone(value.semantic_modes[0])); })],
  ["duplicate_pass", "evidence_pass_duplicate", (root) => edit(root, "editorial", "evidence/button.evidence.json", (value) => { value.passes.push(structuredClone(value.passes[0])); })],
  ["duplicate_state_set", "state_set_duplicate", (root) => edit(root, "editorial", "states/button.states.json", (value) => { const copy = structuredClone(value.scenarios[0]); copy.id = "duplicate-disabled-busy"; copy.states.reverse(); value.scenarios.push(copy); })],
  ["pressed_surface", "pressed_surface_mismatch", (root) => edit(root, "editorial", "states/button.states.json", (value) => { scenario(value, "toggle-focused-pressed").expected.dom["aria-pressed"] = "false"; })],
  ["busy_surface", "busy_surface_mismatch", (root) => edit(root, "editorial", "states/button.states.json", (value) => { scenario(value, "action-loading-busy").expected.ax.busy = false; })],
  ["disabled_surface", "disabled_surface_mismatch", (root) => edit(root, "editorial", "states/button.states.json", (value) => { scenario(value, "action-disabled-busy").expected.dom.disabled = "false"; })],
  ["unknown_evidence_scenario", "evidence_scenario_unknown", (root) => edit(root, "editorial", "evidence/button.evidence.json", (value) => { value.passes[0].scenario_id = "unknown-scenario"; })],
  ["duplicate_channel", "evidence_channel_duplicate", (root) => edit(root, "editorial", "evidence/button.evidence.json", (value) => { const copy = structuredClone(value.passes[0]); copy.id = "unique-pass-id"; copy.artifact.path = "runtime/unique.png"; copy.artifact.sha256 = `sha256:${"1".repeat(64)}`; value.passes.push(copy); })],
  ["activation_key", "fixture_activation_key_invalid", (root) => edit(root, "editorial", "fixtures/button.fixture.json", (value) => { value.scenarios[1].activation_key = "Escape"; })],
  ["unexercised_scenario", "fixture_scenario_unexercised", (root) => edit(root, "editorial", "fixtures/button.fixture.json", (value) => { value.scenarios = value.scenarios.filter((candidate) => candidate.id !== "action-loading-busy"); })],
  ["profile_field_missing", "profile_reference_required", (root) => edit(root, "editorial", "profile.json", (value) => { delete value.component_records; })],
  ["profile_reference_duplicate", "profile_reference_duplicate", (root) => edit(root, "editorial", "profile.json", (value) => { value.component_records.push(value.component_records[0]); })],
  ["profile_reference_unknown", "profile_reference_unknown", (root) => edit(root, "editorial", "profile.json", (value) => { value.component_records[0] = "mystery/button.json"; })],
  ["profile_reference_outside", "profile_reference_outside", (root) => edit(root, "editorial", "profile.json", (value) => { value.component_records[0] = "../terminal/components/button.component.json"; })],
  ["profile_reference_missing", "profile_reference_missing", (root) => fs.rmSync(path.join(root, "editorial/components/button.component.json"))],
  ["profile_reference_symlink", "profile_reference_symlink", (root) => { const file = path.join(root, "editorial/components/button.component.json"); fs.rmSync(file); fs.symlinkSync(path.join(root, "terminal/components/button.component.json"), file); }],
  ["profile_reference_redirect", "profile_reference_redirect", (root) => { const directory = path.join(root, "editorial/components"); const actual = path.join(root, "editorial/components-real"); fs.renameSync(directory, actual); fs.symlinkSync(actual, directory); }],
  ["cross_profile_swap", "profile_identity_mismatch", (root) => fs.copyFileSync(path.join(root, "terminal/components/button.component.json"), path.join(root, "editorial/components/button.component.json"))],
  ["generated_reference_missing", "profile_reference_missing", (root) => fs.rmSync(path.join(root, "editorial/generated/state-matrix.md"))],
];

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-pr5-state-"));
const results = [];
try {
  for (const [name, expected, mutate] of cases) {
    const root = path.join(tempRoot, name);
    fs.cpSync(sourceRoot, root, { recursive: true });
    mutate(root);
    const child = run(root);
    const codes = child.report.failures.map((failure) => failure.code);
    results.push({ actual: { codes, scaffold: child.report.scaffold === true, status: child.status }, expected, name, ok: child.status > 0 && codes.includes(expected) && child.report.scaffold !== true });
  }
  const canonical = run(sourceRoot);
  results.push({ actual: { status: canonical.status }, expected: "canonical_valid", name: "canonical", ok: canonical.status === 0 && canonical.report.ok === true && canonical.report.scaffold !== true });
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

const failures = results.filter((result) => !result.ok).map((result) => `missing_semantic:${result.name}:${result.expected}`);
const report = { failures, ok: failures.length === 0, results };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
assert.equal(report.ok, true);
