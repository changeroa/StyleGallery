#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { expandEvidenceV2, normalizeEvidenceV1 } from "./evidence-version-projection.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaRoot = path.join(repositoryRoot, "consumer-reference/schema");
const fixtureRoot = path.join(repositoryRoot, "consumer-reference/fixtures/component-evidence-v1");
const profileRoot = path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local");
const profiles = ["editorial", "terminal"];
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const canonical = (value) => JSON.stringify(sortKeys(value));
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
}
function errorCode(action) { try { action(); } catch (error) { return error?.code; } return undefined; }
function generator(root) { return spawnSync(process.execPath, [path.join(repositoryRoot, "scripts/generate-consumer-reference-evidence.mjs"), "--root", root, "--json"], { cwd: repositoryRoot, encoding: "utf8" }); }
const sessionLinkFields = ["session_id", "nonce", "receipt_sha256", "started_at", "revision", "branch", "attempt", "environment", "source"];
function expectedV1Projection(records, capture) {
  const session = Object.fromEntries(sessionLinkFields.map((field) => [field, structuredClone(capture.session[field])]));
  return records.map((record) => ({
    claim_boundary: structuredClone(record.claim_boundary),
    component_id: structuredClone(record.component_id),
    passes: record.passes.map((pass) => ({
      artifact: structuredClone(pass.artifact),
      channel: structuredClone(pass.channel),
      environment: structuredClone(capture.environment),
      id: structuredClone(pass.id),
      recorded_at: structuredClone(pass.recorded_at),
      result: structuredClone(pass.result),
      run: structuredClone(capture.run),
      scenario_id: structuredClone(pass.scenario_id),
      session: structuredClone(session),
      scope: structuredClone(pass.scope),
    })),
    profile_id: structuredClone(record.profile_id),
    schema_version: "1.0",
  }));
}
function recordBodies(records) {
  return records.map(({ capture: _capture, ...record }) => record);
}

const v1Files = profiles.map((profile) => path.join(fixtureRoot, `${profile}.button.evidence.json`));
const currentFiles = profiles.map((profile) => path.join(profileRoot, profile, "evidence/button.evidence.json"));
const v1Bytes = v1Files.map((file) => fs.readFileSync(file));
const currentBytes = currentFiles.map((file) => fs.readFileSync(file));
const v1 = v1Files.map(readJson);
const current = currentFiles.map(readJson);
const packet = normalizeEvidenceV1(v1);
const roundtrip = expandEvidenceV2(packet);
const v2 = packet.manifest;
assert.equal(canonical(roundtrip), canonical(v1), "v1 -> v2 -> v1 must preserve exact semantics and array ordering");
assert.equal(canonical(normalizeEvidenceV1(v1)), canonical(packet), "normalization must be deterministic");
assert.deepEqual(roundtrip.map((record) => record.profile_id), ["editorial-reference-profile", "terminal-reference-profile"]);
assert.deepEqual(roundtrip.flatMap((record) => record.passes.map((pass) => `${pass.scenario_id}:${pass.channel}`)), v1.flatMap((record) => record.passes.map((pass) => `${pass.scenario_id}:${pass.channel}`)));
const misleadingEquality = structuredClone(roundtrip); misleadingEquality[0].passes[0].artifact.path = "runtime/misleading-success.png";
assert.notEqual(canonical(misleadingEquality), canonical(v1));
assert.equal(v2.records.length, 2);
assert.equal(packet.captures.length, 1, "one runtime/editorial/terminal capture must be shared");
assert.equal(v2.records.reduce((count, record) => count + record.passes.length, 0), 30);
assert.equal(new Set(v2.records.flatMap((record) => record.passes.map((pass) => pass.artifact.path))).size, 30);
assert(v2.records.every((record) => canonical(record.capture) === canonical(v2.capture)));
assert(v2.records.every((record) => record.passes.every((pass) => !["environment", "run", "session", "capture_ref"].some((field) => field in pass))));
const runtimeInventory = v1.flatMap((record) => record.passes.flatMap((pass) => pass.channel === "visual" ? [pass.artifact.path, pass.artifact.path.replace(/\.png$/, ".visual.json")] : [pass.artifact.path]));
assert.equal(runtimeInventory.length, 40);

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
for (const name of ["capture-session.schema.json", "evidence-record.schema.json", "runtime-evidence-manifest.schema.json", "component-capture-record.v2.schema.json", "component-evidence-record.v2.schema.json", "component-runtime-manifest.v2.schema.json"]) ajv.addSchema(readJson(path.join(schemaRoot, name)));
const validateV2 = ajv.getSchema("https://stylegallery.local/consumer-reference/schema/component-runtime-manifest.v2.schema.json");
assert.equal(validateV2(v2), true, JSON.stringify(validateV2.errors));
assert.equal(ajv.getSchema("https://stylegallery.local/consumer-reference/schema/component-capture-record.v2.schema.json")(packet.captures[0].record), true);
for (const record of roundtrip) assert.equal(ajv.getSchema("https://stylegallery.local/consumer-reference/schema/evidence-record.schema.json")(record), true);

const currentVersions = [...new Set(current.map((record) => record.schema_version))];
assert.deepEqual(currentVersions, [current[0].schema_version], "canonical profiles must migrate atomically");
const currentSchema = current[0].schema_version === "1.0"
  ? ajv.getSchema("https://stylegallery.local/consumer-reference/schema/evidence-record.schema.json")
  : ajv.getSchema("https://stylegallery.local/consumer-reference/schema/component-evidence-record.v2.schema.json");
assert(currentSchema, `canonical schema version ${current[0].schema_version} must be dispatched`);
for (const record of current) assert.equal(currentSchema(record), true, JSON.stringify(currentSchema.errors));
if (current[0].schema_version === "1.0") {
  assert.equal(canonical(current), canonical(v1), "Commit-A canonical v1 must match the archived compatibility fixtures");
} else {
  assert.equal(current[0].schema_version, "2.0", "canonical evidence version must be supported");
  const reference = current[0].capture;
  assert(current.every((record) => canonical(record.capture) === canonical(reference)), "canonical v2 records must share one capture");
  const captureFile = path.join(repositoryRoot, reference.path);
  const captureRecord = readJson(captureFile);
  const currentPacket = {
    captures: [{ record: captureRecord, reference }],
    manifest: {
      schema_version: "2.0",
      record_kind: "component_runtime_manifest",
      claim_boundary: current[0].claim_boundary,
      recorded_at: current.flatMap((record) => record.passes.map((pass) => pass.recorded_at)).sort().at(-1),
      capture: reference,
      records: current,
    },
  };
  const expandedCurrent = expandEvidenceV2(currentPacket);
  const expectedCurrent = expectedV1Projection(current, captureRecord);
  assert.equal(canonical(expandedCurrent), canonical(expectedCurrent), "canonical v2 must project every v1-representable field from its own capture");
  const renormalizedCurrent = normalizeEvidenceV1(expandedCurrent);
  assert.equal(canonical(expandEvidenceV2(renormalizedCurrent)), canonical(expandedCurrent), "fresh v2 projection must be a fixed point on the v1-representable surface");
  assert.equal(canonical(recordBodies(renormalizedCurrent.manifest.records)), canonical(recordBodies(current)), "fresh v2 record bodies must survive expand then normalize");
  assert(renormalizedCurrent.manifest.records.every((record) => canonical(record.capture) === canonical(renormalizedCurrent.manifest.capture)));
  assert.equal(canonical(captureRecord.environment), canonical(captureRecord.session.environment), "capture environment must match its session");
  assert.equal(captureRecord.run.id, captureRecord.session.session_id, "capture run and session must share identity");
  assert.equal(captureRecord.run.revision, captureRecord.session.revision, "capture run and session must share revision");

  const missingCurrent = structuredClone(currentPacket); delete missingCurrent.manifest.records[0].passes[0].artifact;
  assert.equal(errorCode(() => expandEvidenceV2(missingCurrent)), "evidence_v2_required_field_missing");
  const alteredCurrentHash = structuredClone(currentPacket); alteredCurrentHash.captures[0].reference.sha256 = `sha256:${"0".repeat(64)}`;
  assert.equal(errorCode(() => expandEvidenceV2(alteredCurrentHash)), "evidence_v2_capture_hash_mismatch");
  const currentPerPassIdentity = structuredClone(currentPacket); currentPerPassIdentity.manifest.records[0].passes[0].environment = structuredClone(captureRecord.environment);
  assert.equal(validateV2(currentPerPassIdentity.manifest), false);
  assert.equal(errorCode(() => expandEvidenceV2(currentPerPassIdentity)), "evidence_v2_pass_capture_identity_forbidden");
  const mixedCurrent = structuredClone(currentPacket); mixedCurrent.manifest.records[1].capture.capture_id = `sha256:${"f".repeat(64)}`;
  assert.equal(errorCode(() => expandEvidenceV2(mixedCurrent)), "evidence_v2_capture_unknown");
  const wrongCurrentProjection = structuredClone(expectedCurrent); wrongCurrentProjection[0].passes[0].artifact.path = "runtime/wrong-projection.png";
  assert.notEqual(canonical(expandedCurrent), canonical(wrongCurrentProjection));
}

const missing = structuredClone(v1); delete missing[0].passes[0].environment;
assert.equal(errorCode(() => normalizeEvidenceV1(missing)), "evidence_v1_required_field_missing");
const alteredHash = structuredClone(packet); alteredHash.captures[0].reference.sha256 = `sha256:${"0".repeat(64)}`;
assert.equal(errorCode(() => expandEvidenceV2(alteredHash)), "evidence_v2_capture_hash_mismatch");
const forbiddenIdentity = structuredClone(packet); forbiddenIdentity.manifest.records[0].passes[0].environment = structuredClone(v1[0].passes[0].environment);
assert.equal(validateV2(forbiddenIdentity.manifest), false);
assert.equal(errorCode(() => expandEvidenceV2(forbiddenIdentity)), "evidence_v2_pass_capture_identity_forbidden");
const mixed = structuredClone(v1); mixed[1].passes[0].run.id = "mixed-run";
assert.equal(errorCode(() => normalizeEvidenceV1(mixed)), "evidence_v1_mixed_profile_captures");
const duplicate = structuredClone(packet); duplicate.captures.push(structuredClone(duplicate.captures[0]));
assert.equal(errorCode(() => expandEvidenceV2(duplicate)), "evidence_v2_capture_duplicate");
const unknown = structuredClone(packet); unknown.manifest.records[0].capture.capture_id = `sha256:${"f".repeat(64)}`;
assert.equal(errorCode(() => expandEvidenceV2(unknown)), "evidence_v2_capture_unknown");
const missingCapture = structuredClone(packet); missingCapture.captures = [];
assert.equal(errorCode(() => expandEvidenceV2(missingCapture)), "evidence_v2_capture_missing");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-evidence-v2-"));
try {
  fs.cpSync(profileRoot, tempRoot, { recursive: true });
  const before = generator(tempRoot); assert.equal(before.status, 0, before.stderr);
  const coverageBefore = profiles.map((profile) => fs.readFileSync(path.join(tempRoot, profile, "generated/evidence-coverage.md")));
  roundtrip.forEach((record, index) => fs.writeFileSync(path.join(tempRoot, profiles[index], "evidence/button.evidence.json"), `${JSON.stringify(record, null, 2)}\n`));
  const after = generator(tempRoot); assert.equal(after.status, 0, after.stderr);
  profiles.forEach((profile, index) => assert(fs.readFileSync(path.join(tempRoot, profile, "generated/evidence-coverage.md")).equals(coverageBefore[index])));
} finally { fs.rmSync(tempRoot, { recursive: true, force: true }); }
assert.equal(fs.existsSync(tempRoot), false);
v1Files.forEach((file, index) => assert(fs.readFileSync(file).equals(v1Bytes[index]), `${file} changed`));
currentFiles.forEach((file, index) => assert(fs.readFileSync(file).equals(currentBytes[index]), `${file} changed`));
process.stdout.write(`${JSON.stringify({ captures: 1, current_version: current[0].schema_version, coverage_equal: true, negative_codes: ["evidence_v1_required_field_missing", "evidence_v2_capture_hash_mismatch", "evidence_v2_pass_capture_identity_forbidden", "evidence_v1_mixed_profile_captures", "evidence_v2_capture_duplicate", "evidence_v2_capture_unknown", "evidence_v2_capture_missing"], ok: true, passes: 30, profiles: 2, runtime_files: 40, roundtrip_equal: true, schemas_compiled: 6 }, null, 2)}\n`);
