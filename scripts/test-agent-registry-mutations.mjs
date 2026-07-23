#!/usr/bin/env node

import { agentNativeRegistry as registry } from "./agent-native/registry.mjs";

function result(name, expected, actual, ok) {
  return { actual, expected, name, ok };
}

function invoke(name, input) {
  const response = registry.invoke(name, input);
  return { name, response };
}

const claim = registry.fixture.records.find((record) => record.stable_ref === "sg:claim/editorial-profile-addressable");
const proposal = invoke("proposal.create", {
  changes: [{ op: "replace", path: "/rank", value: 1 }],
  claim,
  evidence: [{
    independence_group: "registry-proposal-source",
    polarity: "SUPPORT",
    source_ref: "sg:artifact/editorial-profile-source",
    stable_ref: "sg:evidence/registry-proposal-source",
  }],
  proposer: "agent:registry-proposer",
  stable_ref: "sg:proposal/registry-invocation-fixture",
  validation: { status: "PASS", validator: "validator:proposal", validator_version: "1" },
});
const verification = invoke("proposal.verify", {
  evidence: [{
    independence_group: "registry-independent-source",
    polarity: "SUPPORT",
    source_ref: "sg:artifact/editorial-profile-source",
    stable_ref: "sg:evidence/registry-independent-source",
  }],
  proposal: proposal.response.result,
  validation: { status: "PASS", validator: "validator:independent", validator_version: "1" },
  verifier: "agent:registry-verifier",
});
const decision = invoke("proposal.decide", {
  governance_decision: {
    actor: "governor:stylegallery",
    decided_at: "2026-07-23T00:00:00.000Z",
    decision: "ACCEPT",
  },
  proposal: proposal.response.result,
  verification: verification.response.result,
});
const promotion = invoke("proposal.promote", {
  governance_decision: decision.response.result,
  proposal: proposal.response.result,
  target_stable_ref: "sg:profile/editorial-reference-profile",
  verification: verification.response.result,
});

const task = invoke("task.create", {
  intent: { operation: "resolve" },
  required_result: { ok: true },
  stable_ref: "sg:task/registry-invocation-fixture",
});
const run = invoke("run.start", {
  input: { reference: "sg:profile/editorial-reference-profile" },
  stable_ref: "sg:run/registry-invocation-fixture",
  task: task.response.result,
});
const effect = invoke("effect.record", {
  effect_class: "EXTERNAL",
  run_id: run.response.result?.run_id,
  stable_ref: "sg:effect/registry-invocation-fixture",
  task_id: task.response.result?.task_id,
});
const reconciliation = invoke("effect.reconcile", {
  effect: effect.response.result,
  observations: [{ connector_receipt: "sg:receipt/connector-fixture", status: "COMMITTED" }],
});

const mutations = [proposal, verification, decision, promotion, task, run, effect, reconciliation];
const results = [
  result(
    "governed_learning_chain_is_invokable_from_common_registry",
    "PROPOSED -> VERIFIED -> ACCEPT -> PROMOTED",
    mutations.slice(0, 4).map(({ name, response }) => ({ name, ok: response.ok, status: response.result?.status })),
    proposal.response.ok && verification.response.ok && decision.response.ok && promotion.response.ok
      && proposal.response.result.status === "PROPOSED"
      && verification.response.result.status === "VERIFIED"
      && decision.response.result.status === "ACCEPT"
      && promotion.response.result.status === "PROMOTED",
  ),
  result(
    "task_run_effect_reconciliation_is_invokable_from_common_registry",
    "SUBMITTED -> RUNNING -> UNCERTAIN -> COMMITTED",
    mutations.slice(4).map(({ name, response }) => ({ name, ok: response.ok, state: response.result?.state })),
    task.response.ok && run.response.ok && effect.response.ok && reconciliation.response.ok
      && task.response.result.state === "SUBMITTED"
      && run.response.result.state === "RUNNING"
      && effect.response.result.state === "UNCERTAIN"
      && reconciliation.response.result.state === "COMMITTED",
  ),
  result(
    "invokable_mutations_remain_internal",
    "all eight invoked operations declare read_only:false and omit MCP adapter exposure",
    registry.operations.filter((operation) => mutations.some((item) => item.name === operation.name))
      .map((operation) => ({ adapters: operation.adapters, name: operation.name, read_only: operation.read_only })),
    registry.operations.filter((operation) => mutations.some((item) => item.name === operation.name))
      .every((operation) => operation.read_only === false && !operation.adapters.includes("mcp")),
  ),
];

const report = { ok: results.every((item) => item.ok), results };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.ok ? 0 : 1;
