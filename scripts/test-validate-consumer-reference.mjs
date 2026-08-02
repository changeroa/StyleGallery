#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  cleanupCompletedConsumer,
  initializeCompletedConsumer,
} from "../consumer-reference/fixtures/consumer-conformance/e2e-fixture.mjs";
import { makeConsumerReferenceCaseRunner } from "./consumer-reference-case-runner.mjs";
import { writeJsonOutput } from "./json-output.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(repositoryRoot, "scripts", "validate-consumer-reference.mjs");
const itemPath = "consumer-reference/fixtures/item.json";
const schema = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "consumer-reference", "schema", "item.schema.json"), "utf8"));
const conformanceTemplate = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "consumer-reference", "fixtures", "consumer-conformance", "valid-migration.json"), "utf8"));

const baseItem = {
  artifact_mode: "schema_only",
  fixture_independence: "related",
  handoff: {
    record: itemPath,
    status: "declared",
  },
  id: "receiver-contract-fixture",
  maturity: "experimental",
  owner: {
    enforcement: "placeholder",
    name: "Repository governance owner",
  },
  review_independence: "single_account",
  schema_version: "1.0",
  support: {
    status: "active",
  },
};

function applyGovernedProfile(item) {
  Object.assign(item, {
    artifact_mode: "governed_local",
    component_records: ["components/button.component.json"],
    default: false,
    environment_assumptions: { reset: { body_margin: "0", box_sizing: "border-box", figure_margin: "0" }, user_agent_styles: "Preserve declared browser defaults." },
    evidence_records: ["evidence/button.evidence.json"],
    example_only: true,
    fixture_records: ["fixtures/button.fixture.json"],
    generated_records: ["generated/evidence-coverage.md", "generated/keyboard-matrix.md", "generated/state-matrix.md"],
    layout_source_sha: "775430bbaf4ee208a642220f440f6926d79c90a3",
    local_foundations: "local-foundations.json",
    profile_kind: "governed_local",
    related_fixture_set_id: "layout-identity-adversarial-pair",
    selection: { method: "profile_path", required: true },
    state_records: ["states/button.states.json"],
    tokens: "tokens.dtcg.json",
  });
}

const behaviorCases = [
  { expect: null, name: "valid_declared_handoff" },
  { expect: "generic_receiver_governed_button_forbidden", mutate: applyGovernedProfile, name: "generic_receiver_rejects_governed_button_profile", schemaValid: true },
  { expect: null, mutate: (item) => { item.handoff = { reason: "This fixture has no consumer-specific reference requirement.", status: "not_applicable" }; }, name: "valid_not_applicable_handoff" },
  { expect: "handoff_required", mutate: (item) => { delete item.handoff; }, name: "missing_handoff" },
  { expect: "not_applicable_reason_sentence", mutate: (item) => { item.handoff = { reason: "none", status: "not_applicable" }; }, name: "missing_not_applicable_reason" },
  { expect: "stable_support_ended", mutate: (item) => { item.maturity = "stable"; item.support.status = "ended"; }, name: "stable_with_ended_support" },
  { expect: "review_independence_boolean", mutate: (item) => { item.review_independence = false; }, name: "boolean_review_independence" },
  { expect: "record_unresolved", mutate: (item) => { item.handoff.record = "consumer-reference/fixtures/missing.json"; }, name: "unresolved_record" },
  { expect: "record_parent_segment", mutate: (item) => { item.handoff.record = "../outside.json"; }, name: "escaping_record" },
  { expect: "record_absolute", mutate: (item) => { item.handoff.record = "/tmp/consumer-reference.json"; }, name: "absolute_record" },
  { expect: "record_uri_scheme", mutate: (item) => { item.handoff.record = "https://example.com/consumer-reference.json"; }, name: "scheme_record" },
  { expect: "record_network_path", mutate: (item) => { item.handoff.record = "//server/share/consumer-reference.json"; }, name: "network_record" },
  { expect: "record_not_normalized", mutate: (item) => { item.handoff.record = "./consumer-reference/fixtures/item.json"; }, name: "non_normalized_record" },
  { expect: "record_not_json", mutate: (item) => { item.handoff.record = "consumer-reference/fixtures/item.txt"; }, name: "non_json_record" },
  { expect: "record_invalid_json", extraFiles: { "consumer-reference/fixtures/malformed.json": "{not json}\n" }, mutate: (item) => { item.handoff.record = "consumer-reference/fixtures/malformed.json"; }, name: "malformed_json_record" },
  { expect: "record_redirect", link: "inside", mutate: (item) => { item.handoff.record = "consumer-reference/fixtures/redirect.json"; }, name: "filesystem_redirect" },
  { expect: "record_symlink_escape", link: "outside", mutate: (item) => { item.handoff.record = "consumer-reference/fixtures/redirect.json"; }, name: "symlink_escape" },
  { expect: "reverse_import", layout: "Import consumer-reference/fixtures/item.json from this Layout page.\n", name: "reverse_profile_import" },
  { expect: "item_property_unknown", mutate: (item) => { item.unknown = true; }, name: "schema_unknown_item_property" },
  { expect: "item_id_invalid", mutate: (item) => { item.id = "Invalid ID"; }, name: "schema_invalid_id" },
  { expect: "schema_version_invalid", mutate: (item) => { item.schema_version = "2.0"; }, name: "schema_wrong_version" },
  { expect: "owner_name_required", mutate: (item) => { delete item.owner.name; }, name: "schema_missing_owner_name" },
  { expect: "handoff_property_unknown", mutate: (item) => { item.handoff.extra = true; }, name: "schema_unknown_handoff_property" },
  { expect: "support_property_unknown", mutate: (item) => { item.support.extra = true; }, name: "schema_unknown_support_property" },
  { expect: "not_applicable_reason_sentence", mutate: (item) => { item.handoff = { reason: "A b c.", status: "not_applicable" }; }, name: "schema_short_reason" },
  { expect: "item_symlink_escape", itemLink: "outside", mutate: (item) => { item.handoff = { reason: "This linked item has no applicable consumer reference.", status: "not_applicable" }; }, name: "item_symlink_escape" },
  { expect: "item_redirect", itemLink: "inside", mutate: (item) => { item.handoff = { reason: "This linked item has no applicable consumer reference.", status: "not_applicable" }; }, name: "item_filesystem_redirect" },
  { expect: "reverse_import", name: "reverse_import_concatenation", patternData: "import(\"../consumer-\" + \"reference/fixtures/item.json\");\n" },
  { expect: "reverse_import", name: "reverse_import_template", patternData: "import(`../${\"consumer\"}-${\"reference\"}/fixtures/item.json`);\n" },
  { expect: "reverse_import", name: "reverse_import_path_join", patternData: "import(path.join(\"..\", \"consumer-\", \"reference\", \"fixtures\", \"item.json\"));\n" },
  { expect: "handoff_consumer_reference_required", extraFiles: { "quality/claim.md": "Implementation handoff:\nBoundary: none.\n" }, name: "repository_handoff_omission" },
];

function writeReceiverFile(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function receiverHandoff(recordLine, declarationLine = "Consumer migration conformance: declared") {
  return [
    "Implementation handoff:",
    "Consumer reference: not_applicable",
    "Consumer reference reason: This fixture has no consumer-specific reference record.",
    declarationLine,
    recordLine,
    "",
  ].filter(Boolean).join("\n");
}

function runMigrationReceiverCase(testCase) {
  const fixture = initializeCompletedConsumer(conformanceTemplate);
  try {
    writeReceiverFile(fixture.root, itemPath, `${JSON.stringify(baseItem, null, 2)}\n`);
    writeReceiverFile(fixture.root, "CATALOG.md", "# Catalog\n");
    writeReceiverFile(fixture.root, "layout/index.md", "# Layout\n");
    writeReceiverFile(fixture.root, "patterns/index.md", "# Patterns\n");
    writeReceiverFile(fixture.root, "scripts/pattern-data.mjs", "export const patterns = [];\n");
    const handoff = testCase.handoff ?? receiverHandoff(`Consumer migration conformance record: ${fixture.recordReference}`);
    writeReceiverFile(fixture.root, "quality/handoff.md", handoff);
    testCase.mutate?.(fixture);
    const child = spawnSync(process.execPath, [validator, "--item", itemPath, "--json"], { cwd: fixture.root, encoding: "utf8" });
    const output = JSON.parse(child.stdout);
    const codes = output.failures?.map((failure) => failure.code) ?? [];
    const ok = testCase.expect === null
      ? child.status === 0 && output.ok === true
      : testCase.expect === "checkedMigrationRecords:1"
        ? child.status === 0 && output.ok === true && output.checkedMigrationRecords === 1
        : child.status !== 0 && output.ok === false && codes.includes(testCase.expect);
    return { actual: { checkedMigrationRecords: output.checkedMigrationRecords, codes, status: child.status }, expected: testCase.expect ?? "ok:true and exit:0", name: testCase.name, ok, rules: [] };
  } finally {
    cleanupCompletedConsumer(fixture);
  }
}

const migrationReceiverCases = [
  { expect: "checkedMigrationRecords:1", name: "migration_declared_record_executes" },
  {
    expect: "consumer_repository_mismatch",
    mutate: (fixture) => {
      const file = path.join(fixture.root, fixture.recordReference);
      const record = JSON.parse(fs.readFileSync(file, "utf8"));
      record.consumer.repository = "fabricated/consumer";
      fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
    },
    name: "migration_invalid_record_blocks_handoff",
  },
  { expect: "migration_conformance_record_unresolved", handoff: receiverHandoff("Consumer migration conformance record: records/missing.json"), name: "migration_missing_record_blocks_handoff" },
  { expect: "migration_conformance_declaration_required", handoff: receiverHandoff("Consumer migration conformance record: records/migration.json", ""), name: "migration_orphan_record_blocks_handoff" },
  {
    expect: null,
    handoff: ["Implementation handoff:", "Consumer reference: not_applicable", "Consumer reference reason: This ordinary handoff has no consumer-specific reference record.", ""].join("\n"),
    name: "ordinary_not_applicable_skips_migration_receiver",
  },
];

const requiredParityCases = schema.required.map((field) => ({
  expect: field === "handoff" ? "handoff_required" : "item_field_required",
  mutate: (item) => { delete item[field]; },
  name: `schema_required_${field}`,
  rules: [`item.required.${field}`],
  schemaValid: false,
}));
const validArtifactCases = schema.properties.artifact_mode.enum.map((mode) => ({
  expect: null,
  mutate: (item) => { item.artifact_mode = mode; },
  name: `schema_valid_artifact_mode_${mode}`,
  rules: ["artifact_mode.enum"],
  schemaValid: true,
}));
const parityCases = [
  { expect: "item_object_required", name: "schema_item_type", rules: ["item.type"], schemaValid: false, value: [] },
  { expect: "item_property_unknown", mutate: (item) => { item.extra = true; }, name: "schema_item_additional_properties", rules: ["item.additionalProperties"], schemaValid: false },
  { expect: "artifact_mode_invalid", mutate: (item) => { item.artifact_mode = "experimental"; }, name: "schema_artifact_mode_enum", rules: ["artifact_mode.enum"], schemaValid: false },
  { expect: "fixture_independence_related", mutate: (item) => { item.fixture_independence = "independent"; }, name: "schema_fixture_independence_const", rules: ["fixture_independence.const"], schemaValid: false },
  { expect: "handoff_object_required", mutate: (item) => { item.handoff = []; }, name: "schema_handoff_type", rules: ["handoff.oneOf", "handoff.type"], schemaValid: false },
  { expect: "handoff_status_invalid", mutate: (item) => { item.handoff.status = "unknown"; }, name: "schema_handoff_status_const", rules: ["handoff.status.const"], schemaValid: false },
  { expect: "handoff_property_unknown", mutate: (item) => { item.handoff.extra = true; }, name: "schema_declared_additional_properties", rules: ["handoff.declared.additionalProperties"], schemaValid: false },
  { expect: "record_required", mutate: (item) => { delete item.handoff.record; }, name: "schema_declared_required_record", rules: ["handoff.declared.required"], schemaValid: false },
  { expect: "record_schema_invalid", mutate: (item) => { item.handoff.record = 3; }, name: "schema_record_type", rules: ["handoff.record.type"], schemaValid: false },
  { expect: "record_schema_invalid", mutate: (item) => { item.handoff.record = "./consumer-reference//item.json"; }, name: "schema_record_pattern", rules: ["handoff.record.pattern"], schemaValid: false },
  { expect: "handoff_property_unknown", mutate: (item) => { item.handoff = { extra: true, reason: "This reason satisfies the schema sentence rule.", status: "not_applicable" }; }, name: "schema_not_applicable_additional_properties", rules: ["handoff.not_applicable.additionalProperties"], schemaValid: false },
  { expect: "not_applicable_reason_sentence", mutate: (item) => { item.handoff = { status: "not_applicable" }; }, name: "schema_not_applicable_required_reason", rules: ["handoff.not_applicable.required"], schemaValid: false },
  { expect: "not_applicable_reason_sentence", mutate: (item) => { item.handoff = { reason: 3, status: "not_applicable" }; }, name: "schema_reason_type", rules: ["handoff.reason.type"], schemaValid: false },
  { expect: "not_applicable_reason_sentence", mutate: (item) => { item.handoff = { reason: "A b c.", status: "not_applicable" }; }, name: "schema_reason_min_length", rules: ["handoff.reason.minLength"], schemaValid: false },
  { expect: "not_applicable_reason_sentence", mutate: (item) => { item.handoff = { reason: "😀 😀 😀 😀.", status: "not_applicable" }; }, name: "schema_reason_min_length_unicode_code_points_below_boundary", rules: ["handoff.reason.minLength"], schemaValid: false },
  { expect: null, mutate: (item) => { item.handoff = { reason: "😀 😀 😀 😀😀😀.", status: "not_applicable" }; }, name: "schema_reason_min_length_unicode_code_points_exact_boundary", rules: ["handoff.reason.minLength", "handoff.reason.pattern"], schemaValid: true },
  { expect: "not_applicable_reason_sentence", mutate: (item) => { item.handoff = { reason: "This reason lacks punctuation", status: "not_applicable" }; }, name: "schema_reason_pattern", rules: ["handoff.reason.pattern"], schemaValid: false },
  { expect: "item_id_invalid", mutate: (item) => { item.id = "Invalid ID"; }, name: "schema_id_pattern", rules: ["id.type", "id.pattern"], schemaValid: false },
  { expect: "maturity_invalid", mutate: (item) => { item.maturity = "generated"; }, name: "schema_maturity_enum", rules: ["maturity.enum"], schemaValid: false },
  { expect: "owner_object_required", mutate: (item) => { item.owner = []; }, name: "schema_owner_type", rules: ["owner.type"], schemaValid: false },
  { expect: "owner_property_unknown", mutate: (item) => { item.owner.extra = true; }, name: "schema_owner_additional_properties", rules: ["owner.additionalProperties"], schemaValid: false },
  { expect: "owner_enforcement_placeholder", mutate: (item) => { delete item.owner.enforcement; }, name: "schema_owner_required_enforcement", rules: ["owner.required.enforcement"], schemaValid: false },
  { expect: "owner_name_required", mutate: (item) => { delete item.owner.name; }, name: "schema_owner_required_name", rules: ["owner.required.name"], schemaValid: false },
  { expect: "owner_enforcement_placeholder", mutate: (item) => { item.owner.enforcement = "verified"; }, name: "schema_owner_enforcement_const", rules: ["owner.enforcement.const"], schemaValid: false },
  { expect: "owner_name_invalid", mutate: (item) => { item.owner.name = ""; }, name: "schema_owner_name_min_length", rules: ["owner.name.type", "owner.name.minLength"], schemaValid: false },
  { expect: "removal_trigger_invalid", mutate: (item) => { item.removal_trigger = ""; }, name: "schema_removal_trigger", rules: ["removal_trigger.type", "removal_trigger.minLength"], schemaValid: false },
  { expect: "replacement_invalid", mutate: (item) => { item.replacement = ""; }, name: "schema_replacement", rules: ["replacement.type", "replacement.minLength"], schemaValid: false },
  { expect: "review_independence_single_account", mutate: (item) => { item.review_independence = "independent"; }, name: "schema_review_independence_const", rules: ["review_independence.const"], schemaValid: false },
  { expect: "schema_version_invalid", mutate: (item) => { item.schema_version = "2.0"; }, name: "schema_version_const", rules: ["schema_version.const"], schemaValid: false },
  { expect: "support_object_required", mutate: (item) => { item.support = []; }, name: "schema_support_type", rules: ["support.type"], schemaValid: false },
  { expect: "support_property_unknown", mutate: (item) => { item.support.extra = true; }, name: "schema_support_additional_properties", rules: ["support.additionalProperties"], schemaValid: false },
  { expect: "support_status_required", mutate: (item) => { delete item.support.status; }, name: "schema_support_required_status", rules: ["support.required.status"], schemaValid: false },
  { expect: "support_status_invalid", mutate: (item) => { item.support.status = "paused"; }, name: "schema_support_status_enum", rules: ["support.status.enum"], schemaValid: false },
  { expect: "stable_support_ended", mutate: (item) => { item.maturity = "stable"; item.support.status = "ended"; }, name: "schema_stable_support_all_of", rules: ["allOf.stable_ended"], schemaValid: false },
  { expect: "deprecated_migration_required", mutate: (item) => { item.maturity = "deprecated"; }, name: "schema_deprecated_all_of", rules: ["allOf.deprecated_required"], schemaValid: false },
  ...["component_records", "evidence_records", "fixture_records", "generated_records", "state_records"].map((field) => ({
    expect: "profile_field_required",
    mutate: (item) => { applyGovernedProfile(item); delete item[field]; },
    name: `schema_governed_required_${field}`,
    rules: [`allOf.governed.required.${field}`],
    schemaValid: false,
  })),
  { expect: "profile_reference_array_invalid", mutate: (item) => { applyGovernedProfile(item); item.generated_records[2] = item.generated_records[1]; }, name: "schema_governed_generated_unique", rules: ["generated_records.uniqueItems"], schemaValid: false },
  { expect: null, mutate: (item) => { item.maturity = "stable"; }, name: "schema_valid_stable_active", rules: ["maturity.enum", "allOf.stable_ended"], schemaValid: true },
  { expect: null, mutate: (item) => { item.handoff = { reason: "This reference is intentionally not applicable.", status: "not_applicable" }; item.maturity = "deprecated"; item.removal_trigger = "Remove after migration completes."; item.replacement = "replacement-item"; item.support.status = "ended"; }, name: "schema_valid_deprecated", rules: ["handoff.not_applicable.required", "handoff.reason.type", "handoff.reason.minLength", "handoff.reason.pattern", "allOf.deprecated_required", "support.status.enum"], schemaValid: true },
  ...validArtifactCases,
  ...requiredParityCases,
];
const cases = [...behaviorCases, ...parityCases];
const expectedSchemaRuleNames = [
  "item.type", "item.additionalProperties", ...schema.required.map((field) => `item.required.${field}`),
  "artifact_mode.enum", "fixture_independence.const", "handoff.oneOf", "handoff.type", "handoff.status.const",
  "handoff.declared.additionalProperties", "handoff.declared.required", "handoff.record.type", "handoff.record.pattern",
  "handoff.not_applicable.additionalProperties", "handoff.not_applicable.required", "handoff.reason.type", "handoff.reason.minLength", "handoff.reason.pattern",
  "id.type", "id.pattern", "maturity.enum", "owner.type", "owner.additionalProperties", "owner.required.enforcement", "owner.required.name",
  "owner.enforcement.const", "owner.name.type", "owner.name.minLength", "removal_trigger.type", "removal_trigger.minLength",
  "replacement.type", "replacement.minLength", "review_independence.const", "schema_version.const", "support.type",
  "support.additionalProperties", "support.required.status", "support.status.enum", "allOf.stable_ended", "allOf.deprecated_required",
  ...["component_records", "evidence_records", "fixture_records", "generated_records", "state_records"].map((field) => `allOf.governed.required.${field}`),
  "generated_records.uniqueItems",
];

const runCase = makeConsumerReferenceCaseRunner({ baseItem, schema });
const results = [...cases.map(runCase), ...migrationReceiverCases.map(runMigrationReceiverCase)];
const failures = results
  .filter((result) => !result.ok)
  .map((result) => `missing_semantic:${result.name}:${result.expected}`);
const coveredSchemaRules = new Set(results.flatMap((result) => result.rules));
const expectedSchemaRules = new Set(expectedSchemaRuleNames);
const missingSchemaRules = [...expectedSchemaRules].filter((rule) => !coveredSchemaRules.has(rule));
failures.push(...missingSchemaRules.map((rule) => `missing_schema_rule:${rule}`));
const profileHarness = spawnSync(process.execPath, [path.join(repositoryRoot, "scripts", "test-validate-reference-profiles.mjs"), "--json"], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
const profileReport = JSON.parse(profileHarness.stdout);
if (profileHarness.status !== 0 || profileReport.ok !== true) failures.push("missing_semantic:governed_local_reference_profiles");
const cliHarness = spawnSync(process.execPath, [path.join(repositoryRoot, "scripts", "test-validate-consumer-reference-cli.mjs")], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
const cliReport = JSON.parse(cliHarness.stdout);
if (cliHarness.status !== 0 || cliReport.ok !== true) failures.push("missing_semantic:consumer_reference_cli_arguments");
const report = {
  cliReport,
  failures,
  ok: failures.length === 0,
  profileReport,
  results,
  schemaParity: { coveredRules: [...coveredSchemaRules].sort(), missingRules: missingSchemaRules },
};

await writeJsonOutput(report);
process.exitCode = report.ok ? 0 : 1;
