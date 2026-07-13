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

export function compileSchemas(schemaRoot) {
  const ajv = new Ajv2020({ allErrors: true, formats: { "date-time": true }, strict: false });
  const captureSchema = JSON.parse(fs.readFileSync(path.join(schemaRoot, "capture-session.schema.json"), "utf8"));
  ajv.addSchema(captureSchema);
  const evidenceSchema = JSON.parse(fs.readFileSync(path.join(schemaRoot, "evidence-record.schema.json"), "utf8"));
  const validateEvidence = ajv.compile(evidenceSchema);
  return {
    ax: ajv.compile(JSON.parse(fs.readFileSync(path.join(schemaRoot, "ax-evidence.schema.json"), "utf8"))),
    capture: ajv.getSchema(captureSchema.$id),
    component: ajv.compile(JSON.parse(fs.readFileSync(path.join(schemaRoot, "component-state.schema.json"), "utf8"))),
    dom: ajv.compile(JSON.parse(fs.readFileSync(path.join(schemaRoot, "dom-evidence.schema.json"), "utf8"))),
    evidence: validateEvidence,
    fixture: ajv.compile(JSON.parse(fs.readFileSync(path.join(schemaRoot, "fixture-manifest.schema.json"), "utf8"))),
    item: ajv.compile(JSON.parse(fs.readFileSync(path.join(schemaRoot, "item.schema.json"), "utf8"))),
    runtime: ajv.compile(JSON.parse(fs.readFileSync(path.join(schemaRoot, "runtime-evidence-manifest.schema.json"), "utf8"))),
    visual: ajv.compile(JSON.parse(fs.readFileSync(path.join(schemaRoot, "visual-evidence.schema.json"), "utf8"))),
  };
}

function addSchemaFailures(validate, value, file, code, failures) {
  if (validate(value)) return;
  for (const error of validate.errors ?? []) failures.push(finding(code, file, `${error.instancePath || "/"} ${error.message}`));
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
  if (records.evidence) {
    addSchemaFailures(schemas.evidence, records.evidence, files.evidence, "evidence_schema_invalid", failures);
  }
  if (records.component) validateComponentSemantics(records.component, files.component, failures);
  if (records.states && records.component) validateStateSemantics(records.states, records.component, files.states, failures);
  if (records.fixture && records.states && records.component) validateFixtureSemantics(records.fixture, records.states, records.component, files.fixture, failures);
  if (records.fixture && records.states && records.evidence) validateEvidenceSemantics(records.evidence, records.fixture, records.states, files.evidence, failures);
  return failures;
}

export function validateEvidenceArtifacts(profileRoot, artifactRoot, evidenceOverride, schemas, session) {
  const failures = [];
  const resolved = resolveProfileRecords(profileRoot, failures);
  const evidenceRecord = resolved?.records.evidence[0];
  const file = evidenceRecord?.path ?? resolved?.profileFile ?? path.join(profileRoot, "profile.json");
  const evidence = evidenceOverride ?? evidenceRecord?.value;
  const fixture = resolved?.records.fixture[0]?.value;
  const states = resolved?.records.states[0]?.value;
  if (evidence && fixture && states) {
    if (evidenceOverride) {
      addSchemaFailures(schemas.evidence, evidence, file, "evidence_schema_invalid", failures);
      validateEvidenceSemantics(evidence, fixture, states, file, failures);
    }
    failures.push(...validateArtifactSet({ artifactRoot, evidence, evidenceFile: file, fixture, profileId: resolved.profile.id, schemas, session, states }));
  }
  return failures;
}
