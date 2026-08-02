import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import {
  validateComponentSemantics,
  validateEvidenceSemantics,
  validateFixtureSemantics,
  validateStateSemantics,
} from "./component-state-semantics.mjs";
import { validateEvidenceArtifacts as validateArtifactSet } from "./evidence-artifact-contract.mjs";
import { resolveProfileRecords } from "./profile-record-contract.mjs";
import { parseStrictJson } from "./strict-json.mjs";

function finding(code, file, message) {
  return { code, message, path: file };
}

export function readRecord(file, failures) {
  try {
    return parseStrictJson(fs.readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(finding(error instanceof SyntaxError ? "record_invalid_json" : "record_unreadable", file, error.message));
    return undefined;
  }
}

function readSchema(schemaRoot, name) {
  const file = path.join(schemaRoot, name);
  try {
    return parseStrictJson(fs.readFileSync(file, "utf8"));
  } catch (cause) {
    const error = new Error(`component schema is not strict JSON: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    error.code = "component_schema_json_invalid";
    error.path = file;
    throw error;
  }
}

function versionDispatch(validators) {
  const dispatch = (value) => {
    const validate = validators[value?.schema_version];
    if (!validate) {
      dispatch.errors = [{ instancePath: "/schema_version", message: "must be a supported schema version" }];
      return false;
    }
    const valid = validate(value);
    dispatch.errors = validate.errors;
    return valid;
  };
  dispatch.errors = null;
  return dispatch;
}

export function compileSchemas(schemaRoot) {
  const ajv = new Ajv2020({ allErrors: true, formats: { "date-time": true }, strict: false });
  const captureSchema = readSchema(schemaRoot, "capture-session.schema.json");
  const captureV2Schema = readSchema(schemaRoot, "component-capture-record.v2.schema.json");
  const evidenceV1Schema = readSchema(schemaRoot, "evidence-record.schema.json");
  const evidenceV2Schema = readSchema(schemaRoot, "component-evidence-record.v2.schema.json");
  const runtimeV1Schema = readSchema(schemaRoot, "runtime-evidence-manifest.schema.json");
  const runtimeV2Schema = readSchema(schemaRoot, "component-runtime-manifest.v2.schema.json");
  for (const schema of [captureSchema, captureV2Schema, evidenceV1Schema, evidenceV2Schema, runtimeV1Schema, runtimeV2Schema]) ajv.addSchema(schema);
  const evidenceByVersion = Object.freeze({
    "1.0": ajv.getSchema(evidenceV1Schema.$id),
    "2.0": ajv.getSchema(evidenceV2Schema.$id),
  });
  const runtimeByVersion = Object.freeze({
    "1.0": ajv.getSchema(runtimeV1Schema.$id),
    "2.0": ajv.getSchema(runtimeV2Schema.$id),
  });
  return {
    ax: ajv.compile(readSchema(schemaRoot, "ax-evidence.schema.json")),
    capture: ajv.getSchema(captureSchema.$id),
    captureV2: ajv.getSchema(captureV2Schema.$id),
    component: ajv.compile(readSchema(schemaRoot, "governed-button-component-state.schema.json")),
    dom: ajv.compile(readSchema(schemaRoot, "dom-evidence.schema.json")),
    evidence: versionDispatch(evidenceByVersion),
    evidenceByVersion,
    fixture: ajv.compile(readSchema(schemaRoot, "governed-button-runtime-fixture.schema.json")),
    item: ajv.compile(readSchema(schemaRoot, "governed-button-profile.schema.json")),
    runtime: versionDispatch(runtimeByVersion),
    runtimeByVersion,
    schemaFiles: Object.freeze({
      component: "governed-button-component-state.schema.json",
      fixture: "governed-button-runtime-fixture.schema.json",
      profile: "governed-button-profile.schema.json",
    }),
    visual: ajv.compile(readSchema(schemaRoot, "visual-evidence.schema.json")),
  };
}

function addSchemaFailures(validate, value, file, code, failures) {
  if (validate(value)) return;
  for (const error of validate.errors ?? []) failures.push(finding(code, file, `${error.instancePath || "/"} ${error.message}`));
}

function addVersionedSchemaFailures(validators, value, file, family, failures) {
  const validate = validators[value?.schema_version];
  if (!validate) {
    failures.push(finding(`${family}_schema_version_unknown`, file, `${value?.schema_version ?? "missing"} is not a supported ${family} schema version`));
    return;
  }
  addSchemaFailures(validate, value, file, `${family}_schema_invalid`, failures);
}

export function validateProfile(profileRoot, schemas) {
  const failures = [];
  const resolved = resolveProfileRecords(profileRoot, failures);
  if (!resolved) return failures;
  addSchemaFailures(schemas.item, resolved.profile, resolved.profileFile, "profile_schema_invalid", failures);
  const files = Object.fromEntries(["component", "evidence", "fixture", "states"].map((kind) => [kind, resolved.records[kind][0]?.path ?? resolved.profileFile]));
  const records = Object.fromEntries(["component", "evidence", "fixture", "states"].map((kind) => [kind, resolved.records[kind][0]?.value]));
  if (records.component) addSchemaFailures(schemas.component, records.component, files.component, "component_schema_invalid", failures);
  if (records.states) addSchemaFailures(schemas.component, records.states, files.states, "state_schema_invalid", failures);
  if (records.fixture) addSchemaFailures(schemas.fixture, records.fixture, files.fixture, "fixture_schema_invalid", failures);
  if (records.evidence) addVersionedSchemaFailures(schemas.evidenceByVersion, records.evidence, files.evidence, "evidence", failures);
  if (records.component) validateComponentSemantics(records.component, files.component, failures);
  if (records.states && records.component) validateStateSemantics(records.states, records.component, files.states, failures);
  if (records.fixture && records.states && records.component) validateFixtureSemantics(records.fixture, records.states, records.component, files.fixture, failures);
  if (records.fixture && records.states && records.evidence) validateEvidenceSemantics(records.evidence, records.fixture, records.states, files.evidence, failures);
  return failures;
}

export function validateEvidenceArtifacts(profileRoot, artifactRoot, evidenceOverride, schemas, captureIdentity) {
  const failures = [];
  const resolved = resolveProfileRecords(profileRoot, failures);
  const evidenceRecord = resolved?.records.evidence[0];
  const file = evidenceRecord?.path ?? resolved?.profileFile ?? path.join(profileRoot, "profile.json");
  const evidence = evidenceOverride ?? evidenceRecord?.value;
  const fixture = resolved?.records.fixture[0]?.value;
  const states = resolved?.records.states[0]?.value;
  if (evidence && fixture && states) {
    if (evidenceOverride) {
      addVersionedSchemaFailures(schemas.evidenceByVersion, evidence, file, "evidence", failures);
      validateEvidenceSemantics(evidence, fixture, states, file, failures, captureIdentity);
    }
    failures.push(...validateArtifactSet({ artifactRoot, capture: captureIdentity, evidence, evidenceFile: file, fixture, profileId: resolved.profile.id, schemas, states }));
  }
  return failures;
}
