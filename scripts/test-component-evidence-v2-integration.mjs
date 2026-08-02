#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalSourceManifest } from "./capture-session-contract.mjs";
import { compileSchemas } from "./component-state-contract.mjs";
import { resolveSharedEvidenceCapture } from "./evidence-capture-contract.mjs";
import { normalizeEvidenceV1 } from "./evidence-version-projection.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaRoot = path.join(repositoryRoot, "consumer-reference/schema");
const fixtureRoot = path.join(repositoryRoot, "consumer-reference/fixtures/component-evidence-v1");
const profileRoot = path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local");
const profiles = ["editorial", "terminal"];
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const schemas = compileSchemas(schemaRoot);
const v1 = profiles.map((profile) => readJson(path.join(fixtureRoot, `${profile}.button.evidence.json`)));
const current = profiles.map((profile) => readJson(path.join(profileRoot, profile, "evidence/button.evidence.json")));
const packet = normalizeEvidenceV1(v1);

assert.equal(typeof schemas.evidenceByVersion?.["1.0"], "function", "v1 evidence reader must remain available");
assert.equal(typeof schemas.evidenceByVersion?.["2.0"], "function", "v2 evidence reader must be dispatched by schema_version");
assert.equal(typeof schemas.runtimeByVersion?.["1.0"], "function", "v1 runtime reader must remain available");
assert.equal(typeof schemas.runtimeByVersion?.["2.0"], "function", "v2 runtime reader must be dispatched by schema_version");
assert.equal(schemas.schemaFiles?.component, "governed-button-component-state.schema.json");
assert.equal(schemas.schemaFiles?.fixture, "governed-button-runtime-fixture.schema.json");
assert.equal(schemas.schemaFiles?.profile, "governed-button-profile.schema.json");
assert.equal(packet.captures.length, 1, "normalization must produce one shared capture record");
assert.equal(packet.manifest.records.length, 2);
assert(packet.manifest.records.every((record) => record.capture.capture_id === packet.captures[0].record.capture_id));
assert(packet.manifest.records.every((record) => record.passes.every((pass) => !["environment", "run", "session", "capture_ref"].some((field) => field in pass))));
assert.equal(schemas.runtime(packet.manifest), true, JSON.stringify(schemas.runtime.errors));
assert(packet.manifest.records.every((record) => schemas.evidence(record)), JSON.stringify(schemas.evidence.errors));

const currentVersions = [...new Set(current.map((record) => record.schema_version))];
assert.deepEqual(currentVersions, [current[0].schema_version], "current canonical evidence must use one version");
assert(current.every((record) => schemas.evidence(record)), JSON.stringify(schemas.evidence.errors));
let captureJoined = false;
if (current[0].schema_version === "2.0") {
  const consumers = current.map((record, index) => ({ capture_id: record.capture.capture_id, owner: `${profiles[index]}-reference-profile`, reference: record.capture }));
  consumers.push({ capture_id: current[0].capture.capture_id, owner: "runtime-manifest", reference: current[0].capture });
  const resolved = resolveSharedEvidenceCapture({
    artifactCaptureIds: current.map((record) => record.capture.capture_id),
    consumers,
    expectedSource: canonicalSourceManifest(repositoryRoot, profileRoot),
    repositoryRoot,
  });
  assert.equal(resolved.capture.capture_id, current[0].capture.capture_id);
  assert.deepEqual(resolved.consumers, ["editorial-reference-profile", "terminal-reference-profile", "runtime-manifest"]);
  captureJoined = true;
} else {
  assert.equal(current[0].schema_version, "1.0", "current canonical evidence version must be supported");
  assert.deepEqual(current, v1, "Commit-A canonical v1 must match archived compatibility fixtures");
}

process.stdout.write(`${JSON.stringify({ capture_joined: captureJoined, captures: packet.captures.length, current_version: current[0].schema_version, named_schemas: schemas.schemaFiles, ok: true, profiles: packet.manifest.records.length }, null, 2)}\n`);
