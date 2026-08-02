#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STABLE_REF_KINDS } from "../identity.mjs";
import { agentNativeRegistry } from "../registry.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const expectedFiles = Object.freeze({
  "consumer-reference/agent-native/README.md": "959509d4539f4b7bb7d193bfdfb949b4cf25ab53317e072aaad7657f04b8779e",
  "consumer-reference/agent-native/registry.json": "70107a28225ee893b0d32df8e2a3c69bed747992bf7e92a0ca5431df4605d8b0",
  "consumer-reference/agent-native/schema/agent-native.schema.json": "0675d61d57a8d12c724f6a97160f6bc4cf2f8abf91663adae0593e7a5a221871",
  "consumer-reference/agent-native/schema/epistemic.schema.json": "ddfdd88692897b4cc17057fc7b0cb6222f69d078956ffb0344d288025cbab9d2",
  "consumer-reference/agent-native/schema/execution.schema.json": "629dccc992fe166be3d1361ca8a2df5e4212f2c1b49ed18a1f153bcdf751725e",
  "consumer-reference/agent-native/schema/identity.schema.json": "aeaa315790cd7b8349203e945d81e92b4939db7be990b82a996f9a85feb84340",
  "consumer-reference/agent-native/schema/learning.schema.json": "98dfeb26a61929d3d0931641e0abfdb1e13d1b1776919c7f714f28e151e674cb",
  "consumer-reference/agent-native/schema/manifest.schema.json": "47c4db495aa76c818d5cacab8cbe855e67717be96f264c234b518101709d41a7",
  "consumer-reference/agent-native/schema/operation.schema.json": "7d41fbfbcb22ed591496a71b177321e5ea76f126d8b580f12b6ba2963498106d",
  "consumer-reference/agent-native/schema/protocol-binding.schema.json": "b91987e0401be6d41937f370c9789483f0b08cde84841f5dc616e82fd6515ef6",
  "consumer-reference/agent-native/schema/retrieval.schema.json": "8f17fbf5df6f730faa2eda83b00bac5868c4f1819c35808f28b46b2f9f4e7379",
  "scripts/agent-native/cli-adapter.mjs": "ee7cafedb4fba3718b89f72116a0add6107304a436217a391050c1ed25fb911e",
  "scripts/agent-native/fixture.mjs": "db0baa676773de4e2a163c753791ef29d3a0b47a88963d7fb0b0703b275bb629",
  "scripts/agent-native/identity.mjs": "377c673a9ecd1fe7fb6a3b17774309b7415d9bf85c123595b0ff05ddb36f6638",
  "scripts/agent-native/mcp-adapter.mjs": "5a981972c65e9006c4b172f8976966280da4a687c4e313862f4eda6d65c2dc77",
  "scripts/agent-native/queries.mjs": "394cbe2ffb3eb6448d3fa10d79ff5ed9f910ff12805a7ec30d4eaa7fb17c3a3f",
  "scripts/agent-native/registry.mjs": "209b3584604bd8bc4de8d27bf95dac50a13317096fcafb2bd86615e6b1bdfd03",
  "scripts/agent-native/retrieval.mjs": "822c2347e4be7d63bed6365f0f896c42e75c20c40b9ec8ae0c23fbfa4690a756",
  "scripts/sg-mcp.mjs": "c14ba4b922822a71c536f684848b161203a9f5ffb1c4d17c75ae647314fea4ab",
  "scripts/sg.mjs": "fa213e57b9cafcc98f4ded3e884fbe40f77f628b2df8e0149f50cd9b338b4980",
  "scripts/test-agent-mcp.mjs": "8ee6726f2ad811e32b9c7304ef3e2ab5755e261a68fffbc3c03f872355fe5740",
  "scripts/test-sg-cli.mjs": "a120d23ae0a244b0694f1ef24068e7a629bfd400eb83031447b76a82067fb67f",
});
const expectedCli = Object.freeze([
  ["discover", ["discover", "--format", "json"], 12748, "a8980754604d800a979bfdd7ae9bb78f755405989df4152e8f7293854e409719"],
  ["resolve", ["resolve", "sg:profile/editorial-reference-profile", "--format", "json"], 668, "8d34b81a31fdc1df5c73e1f7e012eb00b0ab9c90816e951323afedca0566fb4e"],
  ["resolve-version", ["resolve", "sg:profile/editorial-reference-profile@sha256:119814927a7f060bb3d27414f4e28269eae0f1b92f90af98cabf0b93ede8b0d6", "--format", "json"], 668, "8d34b81a31fdc1df5c73e1f7e012eb00b0ab9c90816e951323afedca0566fb4e"],
  ["claims", ["claims", "sg:profile/editorial-reference-profile", "--format", "json"], 4533, "6ec7481d3e797597049c765057c69c132bf9f497dac76d701816420648741b1b"],
  ["context", ["context", "sg:profile/editorial-reference-profile", "--format", "json"], 7390, "2a647406c0b17e0f6b7a2a25a909e3704b75704827ce4fc0e560256b53c320c9"],
  ["ops", ["ops", "--format", "json"], 15452, "01f42acd39eb059f835f7d20f4bf41a903c61597fa692dc80cc6e47d7a3e1d5e"],
]);
const expectedKinds = ["profile", "artifact", "claim", "evidence", "validation", "governance", "operation", "task", "proposal", "view", "agent", "validator", "observer", "governor", "capability", "receipt", "run", "effect", "context", "manifest", "policy", "connector", "event", "snapshot", "source", "skill"];
const expectedOperations = ["claims", "context", "discover", "effect.reconcile", "effect.record", "ops", "proposal.create", "proposal.decide", "proposal.promote", "proposal.verify", "resolve", "retrieve", "run.start", "task.create"];
const expectedV1Tools = ["claims", "context", "discover", "ops", "resolve", "retrieve"];
const requiredLegacyContextFields = ["budget", "cache_key", "member_manifest", "member_refs", "members", "query", "schema_version", "snapshot"];

function sha(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function checkSnapshot(snapshot) {
  const failures = [];
  const add = (condition, code) => { if (!condition) failures.push(code); };
  add(snapshot.registrySha === expectedFiles["consumer-reference/agent-native/registry.json"], "v1_registry_bytes_changed");
  add(snapshot.recordCount === 29 && snapshot.fixtureRef === "sg:manifest/agent-native-fixture", "v1_fixture_manifest_changed");
  add(JSON.stringify(snapshot.kinds) === JSON.stringify(expectedKinds), "v1_stable_ref_meaning_changed");
  add(JSON.stringify(snapshot.operations) === JSON.stringify(expectedOperations), "v1_operation_registry_changed");
  add(JSON.stringify(snapshot.tools) === JSON.stringify(expectedV1Tools), "v1_mcp_tool_catalog_changed");
  add(snapshot.resources === 31 && snapshot.objectTemplate === "sg://object/{reference}", "v1_mcp_resource_catalog_changed");
  add(snapshot.cliCommands.join("\0") === "claims\0context\0discover\0ops\0resolve", "v1_cli_command_set_changed");
  add(requiredLegacyContextFields.every((field) => snapshot.contextFields.includes(field)), "v1_context_legacy_fields_changed");
  add(snapshot.legacyExtensionPaths, "experimental_extension_legacy_path_missing");
  return failures.sort();
}

const registryBytes = fs.readFileSync(path.join(root, "consumer-reference/agent-native/registry.json"));
const context = agentNativeRegistry.invoke("context", { reference: "sg:profile/editorial-reference-profile" }).result;
const snapshot = {
  registrySha: sha(registryBytes), recordCount: agentNativeRegistry.fixture.records.length,
  fixtureRef: agentNativeRegistry.fixture.manifest.manifest_ref, kinds: [...STABLE_REF_KINDS],
  operations: agentNativeRegistry.operations.map(({ name }) => name),
  tools: agentNativeRegistry.operations.filter(({ read_only }) => read_only).map(({ name }) => name),
  resources: agentNativeRegistry.fixture.records.length + 2, objectTemplate: "sg://object/{reference}",
  cliCommands: agentNativeRegistry.selfDescription.protocol_surfaces.cli.commands,
  contextFields: Object.keys(context),
  legacyExtensionPaths: fs.existsSync(path.join(root, "scripts/agent-native/a2a-projection.mjs"))
    && fs.existsSync(path.join(root, "scripts/agent-native/agui-projection.mjs")),
};
assert.deepEqual(checkSnapshot(snapshot), []);

for (const [file, digest] of Object.entries(expectedFiles)) assert.equal(sha(fs.readFileSync(path.join(root, file))), digest, `${file} changed from Todo2`);
for (const file of ["fixture.mjs", "identity.mjs", "queries.mjs", "registry.mjs", "cli-adapter.mjs", "mcp-adapter.mjs", "self-description.mjs"]) {
  const source = fs.readFileSync(path.join(root, "scripts/agent-native", file), "utf8");
  assert.doesNotMatch(source, /(?:from|import\s*\()[^\n]*(?:extensions\/|a2a-projection|agui-projection|material-)/, `v1 core imports an extension/material plane: ${file}`);
}
assert.equal(agentNativeRegistry.fixture.records.some((record) => record.record_kind?.startsWith("material") || record.schema_version === "2.0"), false);

const parsed = [];
for (const [name, args, bytes, digest] of expectedCli) {
  const result = spawnSync(process.execPath, [path.join(root, "scripts/sg.mjs"), ...args], { cwd: root, encoding: null });
  assert.equal(result.status, 0, `${name}: ${result.stderr.toString()}`);
  assert.equal(result.stderr.byteLength, 0);
  assert.equal(result.stdout.byteLength, bytes, `${name} byte length changed`);
  assert.equal(sha(result.stdout), digest, `${name} Todo2 golden changed`);
  const envelope = JSON.parse(result.stdout.toString("utf8"));
  assert.equal(envelope.ok, true);
  assert.equal(typeof envelope.operation, "string");
  assert.ok(Object.hasOwn(envelope, "result"));
  parsed.push(name);
}
for (const operation of ["material-search", "events.project", "task.state"]) {
  const result = spawnSync(process.execPath, [path.join(root, "scripts/sg.mjs"), operation], { cwd: root, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.equal(result.stderr, "");
  const failure = JSON.parse(result.stdout);
  assert.equal(failure.failures[0].code, "command_unknown");
  assert.doesNotMatch(result.stdout, /Users\/|repository_path|source body/i);
}

const perturbations = [
  [{ ...snapshot, registrySha: "0".repeat(64) }, "v1_registry_bytes_changed"],
  [{ ...snapshot, operations: [...snapshot.operations, "material-search"] }, "v1_operation_registry_changed"],
  [{ ...snapshot, contextFields: snapshot.contextFields.filter((field) => field !== "member_refs") }, "v1_context_legacy_fields_changed"],
  [{ ...snapshot, legacyExtensionPaths: false }, "experimental_extension_legacy_path_missing"],
  [{ ...snapshot, tools: [...snapshot.tools, "events.project"] }, "v1_mcp_tool_catalog_changed"],
];
for (const [changed, code] of perturbations) assert.ok(checkSnapshot(changed).includes(code), `perturbation did not fail ${code}`);

process.stdout.write(`${JSON.stringify({
  ok: true,
  todo2_source_digests: Object.keys(expectedFiles).length,
  frozen_cli_goldens: parsed,
  fixture_records: snapshot.recordCount,
  stable_ref_kinds: snapshot.kinds.length,
  v1_tools: snapshot.tools,
  v1_resources: snapshot.resources,
  perturbations: perturbations.length,
}, null, 2)}\n`);
