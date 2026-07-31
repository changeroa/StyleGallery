#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { canonicalSourceManifest } from "./capture-session-contract.mjs";
import { compileSchemas } from "./component-state-contract.mjs";
import { parseStrictJson } from "./strict-json.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSchemaRoot = path.join(repositoryRoot, "consumer-reference/schema");
const schemaRoot = path.resolve(process.argv[2] ?? defaultSchemaRoot);
const profileRoot = path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local");

const specifications = [
  {
    legacy: "component-state.schema.json",
    named: "governed-button-component-state.schema.json",
    id: "https://stylegallery.local/consumer-reference/schema/governed-button-component-state.schema.json",
    title: "Governed button component and compound-state records",
  },
  {
    legacy: "fixture-manifest.schema.json",
    named: "governed-button-runtime-fixture.schema.json",
    id: "https://stylegallery.local/consumer-reference/schema/governed-button-runtime-fixture.schema.json",
    title: "Governed button runtime fixture manifest",
  },
  {
    legacy: "item.schema.json",
    named: "governed-button-profile.schema.json",
    id: "https://stylegallery.local/consumer-reference/schema/governed-button-profile.schema.json",
    title: "Governed button reference profile",
  },
];

function readJson(file) {
  return parseStrictJson(fs.readFileSync(file, "utf8"));
}

function normalize(schema, profile = false) {
  const value = structuredClone(schema);
  delete value.$id;
  delete value.title;
  if (profile) value.required = value.required.filter((entry) => entry !== "profile_kind");
  return value;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const failures = [];
const cases = [];
function check(name, condition, detail, code = "named_button_schema_scope_relaxed") {
  cases.push({ name, ok: Boolean(condition) });
  if (!condition) failures.push({ code, detail, name });
}

const schemas = new Map();
for (const specification of specifications) {
  for (const name of [specification.legacy, specification.named]) {
    const file = path.join(schemaRoot, name);
    try {
      schemas.set(name, readJson(file));
    } catch (error) {
      failures.push({ code: "named_button_schema_missing", detail: error instanceof Error ? error.message : String(error), name });
    }
  }
}

for (const specification of specifications) {
  const legacy = schemas.get(specification.legacy);
  const named = schemas.get(specification.named);
  if (!legacy || !named) continue;
  check(`${specification.named}:truthful_id`, named.$id === specification.id, `expected $id ${specification.id}`);
  check(`${specification.named}:truthful_title`, named.title === specification.title, `expected title ${specification.title}`);
  check(
    `${specification.named}:legacy_assertions_preserved`,
    sameJson(normalize(named, specification.named === "governed-button-profile.schema.json"), normalize(legacy)),
    `all legacy assertions other than identity and the profile scope requirement must remain exact`,
  );
}

const component = schemas.get("governed-button-component-state.schema.json");
const fixture = schemas.get("governed-button-runtime-fixture.schema.json");
const profile = schemas.get("governed-button-profile.schema.json");
if (component) {
  check("component_id_is_button", component.$defs?.component?.properties?.component_id?.const === "button" && component.$defs?.stateSet?.properties?.component_id?.const === "button", "component and state records must remain button-specific");
  check("playwright_is_pinned", component.$defs?.stateSet?.properties?.visual_environments?.items?.properties?.playwright?.const === "1.61.0", "Playwright must remain pinned to 1.61.0");
  check("viewport_is_pinned", component.$defs?.stateSet?.properties?.visual_environments?.items?.properties?.viewport?.const === "1024x768", "viewport must remain pinned to 1024x768");
  check("component_records_are_closed", component.$defs?.component?.additionalProperties === false && component.$defs?.stateSet?.additionalProperties === false, "component and state records must remain closed");
}
if (fixture) {
  check("fixture_component_is_button", fixture.properties?.component_id?.const === "button", "runtime fixture must remain button-specific");
  check("fixture_paths_are_exact", fixture.properties?.component_record?.const === "../components/button.component.json" && fixture.properties?.state_record?.const === "../states/button.states.json", "runtime fixture record paths must remain exact");
  check("fixture_is_closed", fixture.additionalProperties === false && fixture.properties?.scenarios?.items?.additionalProperties === false, "runtime fixture records must remain closed");
}
if (profile) {
  check("profile_scope_is_required", profile.required?.includes("profile_kind") && profile.properties?.profile_kind?.const === "governed_local", "named profile schema must require governed profile scope");
  check("profile_button_paths_are_exact", profile.properties?.component_records?.items?.const === "components/button.component.json" && profile.properties?.fixture_records?.items?.const === "fixtures/button.fixture.json" && profile.properties?.state_records?.items?.const === "states/button.states.json" && profile.properties?.evidence_records?.items?.const === "evidence/button.evidence.json", "profile record paths must remain button-specific and exact");
  check("profile_is_closed", profile.additionalProperties === false && profile.properties?.environment_assumptions?.additionalProperties === false, "profile records and environment assumptions must remain closed");
  check("profile_has_no_visual_defaults", !Object.hasOwn(profile.properties ?? {}, "visual_defaults") && !Object.hasOwn(profile.properties ?? {}, "visual_tokens"), "named profile schema must not introduce visual defaults");
}

if (failures.length === 0) {
  try {
    const production = compileSchemas(schemaRoot);
    check("component_validator_uses_named_button_schema", production.schemaFiles?.component === "governed-button-component-state.schema.json" && production.schemaFiles?.fixture === "governed-button-runtime-fixture.schema.json" && production.schemaFiles?.profile === "governed-button-profile.schema.json", "component validation must select all three named governed-button schemas", "named_button_schema_routing_invalid");
    const sourcePaths = canonicalSourceManifest(repositoryRoot, profileRoot).files.map((entry) => entry.path);
    for (const named of specifications.map((entry) => `consumer-reference/schema/${entry.named}`)) check(`capture_manifest_binds:${named}`, sourcePaths.includes(named), `${named} must be capture-bound`, "capture_source_named_schema_missing");
    for (const legacy of ["consumer-reference/schema/component-state.schema.json", "consumer-reference/schema/fixture-manifest.schema.json"]) check(`capture_manifest_excludes:${legacy}`, !sourcePaths.includes(legacy), `${legacy} must not shadow named governed routing`, "capture_source_legacy_schema_selected");
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    for (const specification of specifications) {
      ajv.addSchema(schemas.get(specification.legacy));
      ajv.addSchema(schemas.get(specification.named));
    }
    check("legacy_and_named_compile_together", specifications.every((entry) => typeof ajv.getSchema(entry.id) === "function" && typeof ajv.getSchema(schemas.get(entry.legacy).$id) === "function"), "all six schema IDs must resolve in one AJV instance", "schema_compile_failed");

    let validationChecks = 0;
    for (const profileName of ["editorial", "terminal"]) {
      const root = path.join(profileRoot, profileName);
      const records = {
        component: readJson(path.join(root, "components/button.component.json")),
        fixture: readJson(path.join(root, "fixtures/button.fixture.json")),
        profile: readJson(path.join(root, "profile.json")),
        states: readJson(path.join(root, "states/button.states.json")),
      };
      const validators = {
        component: ajv.getSchema(specifications[0].id),
        fixture: ajv.getSchema(specifications[1].id),
        profile: ajv.getSchema(specifications[2].id),
      };
      for (const [kind, value] of [["component", records.component], ["states", records.states], ["fixture", records.fixture], ["profile", records.profile]]) {
        const validator = kind === "states" ? validators.component : validators[kind];
        validationChecks += 1;
        check(`${profileName}:${kind}:canonical_valid`, validator(value), JSON.stringify(validator.errors ?? []), "schema_fixture_invalid");
      }

      const malformedProfile = structuredClone(records.profile);
      malformedProfile.component_records = ["../components/button.component.json"];
      validationChecks += 1;
      check(`${profileName}:malformed_reference_rejected`, !validators.profile(malformedProfile), "parent path reference must be rejected", "schema_negative_not_rejected");
      const unknownProfile = structuredClone(records.profile);
      unknownProfile.fixture_records = ["fixtures/unknown.fixture.json"];
      validationChecks += 1;
      check(`${profileName}:unknown_reference_rejected`, !validators.profile(unknownProfile), "unknown fixture reference must be rejected", "schema_negative_not_rejected");
      const openFixture = { ...records.fixture, unexpected: true };
      validationChecks += 1;
      check(`${profileName}:closed_fixture_rejected`, !validators.fixture(openFixture), "additional fixture property must be rejected", "schema_negative_not_rejected");
      const wrongComponent = { ...records.component, component_id: "link" };
      validationChecks += 1;
      check(`${profileName}:non_button_rejected`, !validators.component(wrongComponent), "non-button component must be rejected", "schema_negative_not_rejected");
    }
    cases.push({ name: "validation_check_count", ok: validationChecks === 16 });
  } catch (error) {
    failures.push({ code: "schema_compile_failed", detail: error instanceof Error ? error.message : String(error), name: "legacy_and_named_compile_together" });
  }
}

const report = { cases, failures, ok: failures.length === 0, schemaRoot };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
