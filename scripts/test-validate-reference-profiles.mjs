#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(repositoryRoot, "scripts", "validate-consumer-reference.mjs");
const profilePath = "design-engineering/reference-profiles/governed-local/editorial/profile.json";
const terminalProfilePath = "design-engineering/reference-profiles/governed-local/terminal/profile.json";
const aliasProfilePath = "design-engineering/reference-profiles/governed-local/alias/profile.json";
const layoutSha = "775430bbaf4ee208a642220f440f6926d79c90a3";

const baseProfile = {
  artifact_mode: "governed_local",
  component_records: ["components/button.component.json"],
  default: false,
  environment_assumptions: {
    reset: { body_margin: "0", box_sizing: "border-box", figure_margin: "0" },
    user_agent_styles: "Preserve browser defaults except for the declared reset.",
  },
  example_only: true,
  evidence_records: ["evidence/button.evidence.json"],
  fixture_records: ["fixtures/button.fixture.json"],
  fixture_independence: "related",
  handoff: { record: profilePath, status: "declared" },
  generated_records: ["generated/evidence-coverage.md", "generated/keyboard-matrix.md", "generated/state-matrix.md"],
  id: "editorial-reference-profile",
  layout_source_sha: layoutSha,
  local_foundations: "local-foundations.json",
  maturity: "experimental",
  owner: { enforcement: "placeholder", name: "Design Engineering owner" },
  profile_kind: "governed_local",
  related_fixture_set_id: "layout-identity-adversarial-pair",
  review_independence: "single_account",
  schema_version: "1.0",
  selection: { method: "profile_path", required: true },
  state_records: ["states/button.states.json"],
  support: { status: "active" },
  tokens: "tokens.dtcg.json",
};

const tokens = {
  color: {
    $type: "color",
    accent: { $value: { alpha: 1, colorSpace: "srgb", components: [0.55, 0.18, 0.1] } },
  },
  space: { $type: "dimension", page: { $value: { unit: "rem", value: 1.5 } } },
};
const terminalTokens = {
  color: {
    $type: "color",
    accent: { $value: { alpha: 1, colorSpace: "srgb", components: [0.1, 0.9, 0.5] } },
  },
  space: { $type: "dimension", page: { $value: { unit: "rem", value: 1 } } },
};
const editorialFoundations = { bindings: { accent: "{color.accent}" }, identity: "Warm editorial", profile_id: "editorial-reference-profile" };
const terminalFoundations = { bindings: { accent: "{color.accent}" }, identity: "Dark terminal", profile_id: "terminal-reference-profile" };

const cases = [
  { name: "valid_governed_local_profile" },
  { expect: "profile_artifact_mode_governed_local", name: "local_as_external", mutate: (item) => { item.artifact_mode = "external_consumer"; } },
  { expect: "profile_default_forbidden", name: "implicit_default", mutate: (item) => { item.default = true; } },
  { expect: "profile_layout_source_sha_required", name: "missing_layout_sha", mutate: (item) => { delete item.layout_source_sha; } },
  { expect: "profile_ua_assumption_required", name: "missing_ua_assumption", mutate: (item) => { delete item.environment_assumptions.user_agent_styles; } },
  { expect: "profile_reset_assumptions_required", name: "missing_reset_assumptions", mutate: (item) => { delete item.environment_assumptions.reset; } },
  { expect: "profile_explicit_selection_required", name: "implicit_selection", mutate: (item) => { item.selection.required = false; } },
  { expect: "fixture_independence_related", name: "independence_independent", mutate: (item) => { item.fixture_independence = "independent"; } },
  { expect: "reverse_import", name: "reverse_profile_import", patternData: "export const related_fixture_set_id = 'layout-identity-adversarial-pair';\n" },
  { expect: "external_adaptation_record_forbidden", externalRecord: true, name: "durable_external_adopter" },
  { equalTokens: true, expect: "profile_tokens_not_distinct", name: "single_profile_equal_pair_tokens" },
  { equalFoundations: true, expect: "profile_foundations_not_distinct", name: "single_profile_equal_pair_foundations" },
  { equalIdentity: true, expect: "profile_identity_not_distinct", name: "single_profile_equal_pair_identity" },
  { expect: "profile_related_set_mismatch", name: "single_profile_related_set_mismatch", mutateTerminal: (item) => { item.related_fixture_set_id = "unrelated-terminal-set"; } },
  { expect: "profile_tokens_symlink_escape", linkedArtifact: "tokens", name: "linked_outside_tokens" },
  { expect: "profile_foundations_symlink_escape", linkedArtifact: "foundations", name: "linked_outside_foundations" },
  { expect: "profile_environment_property_unknown", name: "unknown_environment_field", mutate: (item) => { item.environment_assumptions.viewport = "wide"; } },
  { expect: "profile_reset_property_unknown", name: "unknown_reset_field", mutate: (item) => { item.environment_assumptions.reset.list_margin = "0"; } },
  { expect: "profile_selection_property_unknown", name: "unknown_selection_field", mutate: (item) => { item.selection.fallback = "editorial"; } },
  { expect: "item_property_unknown", name: "unknown_profile_top_level", mutate: (item) => { item.profile_fallback = true; } },
  {
    equalTokens: true,
    expect: "profile_tokens_not_distinct",
    name: "normalized_equivalent_selector_loads_pair",
    selector: "design-engineering/reference-profiles/governed-local/editorial/../editorial/profile.json",
  },
  { absoluteSelector: true, expect: "item_unresolved", name: "absolute_profile_selector_rejected" },
  { expect: "item_unresolved", name: "scheme_profile_selector_rejected", selector: "https://example.com/editorial/profile.json" },
  { expect: "item_unresolved", name: "network_profile_selector_rejected", selector: "//server/editorial/profile.json" },
  { expect: "item_unresolved", name: "escaping_profile_selector_rejected", selector: "../editorial/profile.json" },
  { aliasSelector: true, expect: "item_redirect", name: "symlink_alias_profile_selector_rejected" },
];

function writeFixture(testCase) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `stylegallery-reference-profile-${testCase.name}-`));
  const profile = structuredClone(baseProfile);
  const terminalProfile = structuredClone(baseProfile);
  terminalProfile.handoff.record = terminalProfilePath;
  terminalProfile.id = "terminal-reference-profile";
  testCase.mutate?.(profile);
  testCase.mutateTerminal?.(terminalProfile);
  const terminalFoundation = structuredClone(terminalFoundations);
  if (testCase.equalIdentity) terminalFoundation.identity = editorialFoundations.identity;
  const files = {
    "CATALOG.md": "# Catalog\n",
    [profilePath]: `${JSON.stringify(profile, null, 2)}\n`,
    "design-engineering/reference-profiles/governed-local/editorial/local-foundations.json": `${JSON.stringify(editorialFoundations)}\n`,
    "design-engineering/reference-profiles/governed-local/editorial/tokens.dtcg.json": `${JSON.stringify(tokens, null, 2)}\n`,
    [terminalProfilePath]: `${JSON.stringify(terminalProfile, null, 2)}\n`,
    "design-engineering/reference-profiles/governed-local/terminal/local-foundations.json": `${JSON.stringify(testCase.equalFoundations ? editorialFoundations : terminalFoundation)}\n`,
    "design-engineering/reference-profiles/governed-local/terminal/tokens.dtcg.json": `${JSON.stringify(testCase.equalTokens ? tokens : terminalTokens, null, 2)}\n`,
    "layout/index.md": "# Layout\n",
    "patterns/index.md": "# Patterns\n",
    "quality/handoff.md": "Implementation handoff:\nConsumer reference: not_applicable\nConsumer reference reason: This fixture has no consumer-specific reference record.\n",
    "scripts/pattern-data.mjs": testCase.patternData ?? "export const patterns = [];\n",
  };
  if (testCase.externalRecord) files["design-engineering/reference-profiles/external-adaptation/adopter.json"] = "{}\n";
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  let externalRoot;
  if (testCase.linkedArtifact) {
    externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-reference-profile-outside-"));
    const filename = testCase.linkedArtifact === "tokens" ? "tokens.dtcg.json" : "local-foundations.json";
    const target = path.join(root, path.posix.dirname(profilePath), filename);
    const external = path.join(externalRoot, filename);
    fs.writeFileSync(external, files[path.posix.join(path.posix.dirname(profilePath), filename)]);
    fs.rmSync(target);
    fs.symlinkSync(external, target);
  }
  let selector = testCase.selector ?? profilePath;
  if (testCase.absoluteSelector) selector = path.join(root, profilePath);
  if (testCase.aliasSelector) {
    const alias = path.join(root, aliasProfilePath);
    fs.mkdirSync(path.dirname(alias), { recursive: true });
    fs.symlinkSync(path.join(root, profilePath), alias);
    selector = aliasProfilePath;
  }
  return { externalRoot, root, selector };
}

function runCase(testCase) {
  const fixture = writeFixture(testCase);
  try {
    const child = spawnSync(process.execPath, [validator, "--profile", fixture.selector, "--json"], { cwd: fixture.root, encoding: "utf8" });
    const output = JSON.parse(child.stdout);
    const codes = Array.isArray(output.failures) ? output.failures.map((failure) => failure.code) : [];
    const accepted = child.status === 0 && output.ok === true && output.scaffold !== true;
    const rejected = child.status !== 0 && output.ok === false && codes.includes(testCase.expect);
    return {
      actual: { codes, ok: output.ok, status: child.status },
      expected: testCase.expect ?? "ok:true and exit:0",
      name: testCase.name,
      ok: testCase.expect ? rejected : accepted,
    };
  } finally {
    fs.rmSync(fixture.root, { force: true, recursive: true });
    if (fixture.externalRoot) fs.rmSync(fixture.externalRoot, { force: true, recursive: true });
  }
}

const results = cases.map(runCase);
const failures = results.filter((result) => !result.ok).map((result) => `missing_semantic:${result.name}:${result.expected}`);
const report = { failures, ok: failures.length === 0, results };
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;
