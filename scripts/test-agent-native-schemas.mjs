#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { agentNativeFixture } from "./agent-native/fixture.mjs";
import {
  authorizeOperation,
  createReceipt,
  createTask,
  defineOperation,
  recordEffectAttempt,
  startRun,
} from "./agent-native/execution.mjs";
import { appendEvent } from "./agent-native/events.mjs";
import {
  createClaim,
  createEvidenceLink,
  createGovernanceDecision,
  createValidationReport,
} from "./agent-native/knowledge.mjs";
import {
  createProposal,
  decideProposal,
  promoteProposal,
  verifyProposal,
} from "./agent-native/learning.mjs";
import { buildContextPackage, buildViewSnapshot } from "./agent-native/retrieval.mjs";
import { createAgentCard } from "./agent-native/a2a-projection.mjs";
import { projectAgUiEvents } from "./agent-native/agui-projection.mjs";
import { agentNativeRegistry } from "./agent-native/registry.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaDirectory = path.join(root, "consumer-reference", "agent-native", "schema");
const rootSchema = JSON.parse(fs.readFileSync(path.join(schemaDirectory, "agent-native.schema.json"), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
ajv.addSchema(rootSchema);

const wrapperNames = ["identity", "manifest", "epistemic", "operation", "execution", "protocol-binding", "retrieval", "learning"];
for (const name of wrapperNames) {
  const schema = JSON.parse(fs.readFileSync(path.join(schemaDirectory, `${name}.schema.json`), "utf8"));
  ajv.addSchema(schema);
}

const rows = [];
function validator(name) {
  const fn = ajv.getSchema(`${rootSchema.$id}#/$defs/${name}`);
  assert.equal(typeof fn, "function", `missing validator for ${name}`);
  return fn;
}

function valid(name, schemaName, value) {
  const fn = validator(schemaName);
  const ok = fn(value);
  rows.push({ name, schema: schemaName, ok, errors: ok ? [] : fn.errors });
  assert.equal(ok, true, `${name} did not satisfy ${schemaName}: ${JSON.stringify(fn.errors)}`);
}

function invalid(name, schemaName, value) {
  const fn = validator(schemaName);
  const ok = fn(value);
  rows.push({ name, schema: schemaName, ok: !ok, errors: ok ? [] : fn.errors });
  assert.equal(ok, false, `${name} unexpectedly satisfied ${schemaName}`);
}

function fixtureSchema(recordKind) {
  return {
    artifact_projection: "artifactProjection",
    executable_fixture: "executableFixture",
    profile_projection: "profileProjection",
    agent_description: "agentDescription",
    validator: "validator",
    execution_receipt: "executionReceipt",
    conformance_profile: "conformanceProfile",
    claim: "claim",
    evidence_link: "evidenceLink",
    validation_report: "validationReport",
    governance_decision: "governanceDecision",
    policy_disposition: "policyDisposition",
    operation: "operationSpec",
  }[recordKind];
}

function buildSamples() {
  const claim = createClaim({
    actor: "sg:agent/schema-fixture",
    stable_ref: "sg:claim/schema-fixture",
    statement: "Closed schemas reject undeclared fields.",
    subject_ref: "sg:profile/editorial-reference-profile",
  });
  const evidence = createEvidenceLink({
    claim_ref: claim.stable_ref,
    claim_version: claim.version_id,
    independence_group: "schema-fixture",
    polarity: "SUPPORT",
    source_ref: "sg:artifact/schema-fixture",
    stable_ref: "sg:evidence/schema-fixture",
  });
  const validation = createValidationReport({
    claim_ref: claim.stable_ref,
    claim_version: claim.version_id,
    stable_ref: "sg:validation/schema-fixture",
    status: "PASS",
    suite: "schema-fixture",
    validator_ref: "sg:validator/schema-fixture",
    validator_version: "schema-validator@1",
  });
  const governance = createGovernanceDecision({
    actor: "sg:governor/schema-fixture",
    claim_ref: claim.stable_ref,
    claim_version: claim.version_id,
    decision: "ACCEPT",
    policy_version: "schema-policy@1",
    stable_ref: "sg:governance/schema-fixture",
  });
  const operation = defineOperation({
    adapters: ["cli", "mcp"],
    description: "Schema fixture operation.",
    effect_class: "NONE",
    input_schema: { additionalProperties: false, type: "object" },
    name: "schema-fixture",
    output_schema: { type: "object" },
    required_capability: null,
    stable_ref: "sg:operation/schema-fixture",
  });
  const grant = {
    capability: "wiki.read",
    operations: ["schema-fixture"],
    resource_scope: ["sg:profile/*"],
    subject: "agent:schema-fixture",
  };
  const authorization = authorizeOperation({
    grant,
    now: "2099-01-01T00:00:00.000Z",
    operation,
    resource: "sg:profile/editorial-reference-profile",
    subject: "agent:schema-fixture",
  });
  const task = createTask({ intent: { operation: operation.name }, required_result: {}, stable_ref: "sg:task/schema-fixture" });
  const run = startRun({ input: {}, run_id: "sg:run/schema-fixture", task });
  const effect = recordEffectAttempt({ effect_class: "LOCAL", effect_id: "sg:effect/schema-fixture", run, task });
  const receipt = createReceipt({ effects: [effect], input: {}, operation, output: {}, run, task, policy_decision: authorization.decision });
  const event = appendEvent({ event: { event_id: "sg:event/schema-fixture", parents: [], payload: { task_id: task.task_id }, type: "task.created" }, events: [] })[0];
  const snapshot = buildViewSnapshot({ heads: [event.event_id], members: [claim], snapshot_ref: "sg:view/schema-fixture", view_spec: { query: "schema" } });
  const context = buildContextPackage({ budget: { tokens: 128 }, members: [claim], query: "schema", snapshot });
  const proposal = createProposal({
    changes: [{ path: "claim.statement", value: "A governed change." }],
    claim: { stable_ref: claim.stable_ref, statement: claim.statement },
    evidence: [evidence],
    proposer: "agent:proposer",
    stable_ref: "sg:proposal/schema-fixture",
    validation: { status: "PASS", validator: "agent:validator" },
  });
  const proposalEvidence = proposal.evidence.map(({ version_id: _version_id, ...item }) => item);
  const proposalValidation = (({ version_id: _version_id, ...item }) => item)(proposal.validation);
  const verification = verifyProposal({ evidence: proposalEvidence, proposal, validation: proposalValidation, verifier: "agent:verifier" });
  const decision = decideProposal({ decision: "ACCEPT", governance_decision: { actor: "agent:governor", decision: "ACCEPT" }, proposal, verification });
  const promotion = promoteProposal({ decision, proposal, verification });
  return { claim, evidence, validation, governance, operation, grant, authorization, task, run, effect, receipt, event, snapshot, context, proposal, verification, decision, promotion, card: createAgentCard(), agui: projectAgUiEvents({ task, run, text: "schema", toolCall: { id: "schema-tool", name: operation.name }, state: snapshot }) };
}

function run() {
  valid("fixture manifest is closed", "manifest", agentNativeFixture.manifest);
  for (const record of agentNativeFixture.records) {
    const schemaName = fixtureSchema(record.record_kind);
    assert.ok(schemaName, `fixture record kind ${record.record_kind} has no closed schema`);
    valid(`fixture ${record.stable_ref}`, schemaName, record);
  }
  const sample = buildSamples();
  const wrapperSamples = {
    identity: sample.claim.stable_ref,
    manifest: agentNativeFixture.manifest,
    epistemic: sample.claim,
    operation: sample.operation,
    execution: sample.task,
    "protocol-binding": { protocol: "a2a", protocolBindingId: "sg:binding/schema-fixture" },
    retrieval: sample.snapshot,
    learning: sample.proposal,
  };
  for (const name of wrapperNames) {
    const fn = ajv.getSchema(`https://stylegallery.local/consumer-reference/agent-native/schema/${name}.schema.json`);
    assert.equal(typeof fn, "function", `missing wrapper validator ${name}`);
    const ok = fn(wrapperSamples[name]);
    rows.push({ name: `wrapper ${name}`, schema: `${name}.schema.json`, ok, errors: ok ? [] : fn.errors });
    assert.equal(ok, true, `wrapper ${name} rejected its representative value: ${JSON.stringify(fn.errors)}`);
  }
  for (const [name, schemaName] of Object.entries({ claim: "claim", evidence: "evidenceLink", validation: "validationReport", governance: "governanceDecision", operation: "operationSpec", grant: "capabilityGrant", authorization: "authorizationResult", task: "task", run: "run", effect: "effect", receipt: "invocationReceipt", event: "event", snapshot: "viewSnapshot", context: "contextPackage", proposal: "learningProposal", verification: "learningVerification", decision: "governanceDecision", promotionVersion: "governedVersion", promotionReceipt: "promotionReceipt", card: "agentCard", agui: "aguiProjection" })) valid(`generated ${name}`, schemaName, name === "promotionVersion" ? sample.promotion.version : name === "promotionReceipt" ? sample.promotion.receipt : sample[name]);
  valid("generated A2A binding", "protocolBinding", sample.card ? { protocol: "a2a", protocolBindingId: "sg:binding/schema-fixture" } : {});
  valid("generated self-description", "selfDescription", agentNativeRegistry.selfDescription);
  invalid("manifest unknown property is rejected", "manifest", { ...agentNativeFixture.manifest, unexpected: true });
  invalid("claim unknown property is rejected", "claim", { ...sample.claim, unexpected: true });
  invalid("malformed StableRef is rejected", "claim", { ...sample.claim, stable_ref: "claim/schema-fixture" });
  invalid("malformed VersionID is rejected", "claim", { ...sample.claim, version_id: `${sample.claim.stable_ref}@sha256:${"0".repeat(63)}z` });
  return rows;
}

if (process.argv.slice(2).some((arg) => arg !== "--json")) {
  process.stdout.write(`${JSON.stringify({ ok: false, status: "RED", failures: [{ code: "argument_unknown" }], results: [] }, null, 2)}\n`);
  process.exitCode = 1;
} else {
  try {
    const results = run();
    const report = { contract: "agent-native-closed-schemas", ok: true, results };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    const report = { contract: "agent-native-closed-schemas", ok: false, results: rows, failure: { message: error instanceof Error ? error.message : String(error) } };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = 1;
  }
}
