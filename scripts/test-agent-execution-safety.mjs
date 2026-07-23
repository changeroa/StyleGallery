#!/usr/bin/env node

import {
  authorizeOperation,
  defineOperation,
  reconcileEffect,
  recordEffectAttempt,
} from "./agent-native/execution.mjs";

const cases = [];

function test(name, scenario) {
  try {
    scenario();
    cases.push({ name, ok: true });
  } catch (error) {
    cases.push({
      error: error instanceof Error ? error.message : String(error),
      name,
      ok: false,
    });
  }
}

function equal(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
}

function operation() {
  return defineOperation({
    effect_class: "EXTERNAL",
    name: "publish",
    required_capability: "wiki.publish",
    stable_ref: "sg:operation/publish",
  });
}

function grant(operations) {
  return {
    capability: "wiki.publish",
    operations,
    resource_scope: ["sg:profile/*"],
    subject: "agent:test",
  };
}

function authorization(operations) {
  return authorizeOperation({
    grant: grant(operations),
    operation: operation(),
    resource: "sg:profile/editorial-reference-profile",
    subject: "agent:test",
  });
}

function externalEffect(overrides = {}) {
  return recordEffectAttempt({
    effect_class: "EXTERNAL",
    effect_id: "sg:effect/publish-1",
    run_id: "sg:run/publish-1",
    task_id: "sg:task/publish-1",
    ...overrides,
  });
}

test("empty_operation_scope_denies_protected_operation", () => {
  // Given a capability with matching subject, resource, and capability but no operations.
  // When authorization evaluates the protected publish operation.
  const result = authorization([]);
  // Then omission is deny-by-default rather than a wildcard grant.
  equal(result.allowed, false, "allowed");
  equal(result.failures.includes("operation_denied"), true, "operation_denied");
});

test("explicit_operation_scope_authorizes_matching_operation", () => {
  // Given an explicitly scoped capability.
  // When the named operation is evaluated.
  const result = authorization(["publish"]);
  // Then the operation is authorized.
  equal(result.allowed, true, "allowed");
});

test("external_effect_ignores_forged_committed_state_without_receipt", () => {
  // Given an external attempt with no connector receipt and caller state COMMITTED.
  // When the attempt is recorded.
  const effect = externalEffect({ connector_receipt: null, state: "COMMITTED" });
  // Then the kernel derives UNCERTAIN.
  equal(effect.state, "UNCERTAIN", "state");
});

test("empty_connector_receipt_cannot_commit_external_effect", () => {
  // Given an external attempt with an empty receipt identifier.
  // When the caller requests COMMITTED.
  const effect = externalEffect({ connector_receipt: "", state: "COMMITTED" });
  // Then empty evidence is treated as absent.
  equal(effect.state, "UNCERTAIN", "state");
});

test("blank_connector_receipt_cannot_commit_external_effect", () => {
  // Given an external attempt with only whitespace as receipt evidence.
  // When the caller requests COMMITTED.
  const effect = externalEffect({ connector_receipt: "   ", state: "COMMITTED" });
  // Then blank evidence is treated as absent.
  equal(effect.state, "UNCERTAIN", "state");
});

test("durable_receipt_commits_external_effect", () => {
  // Given an external attempt backed by a durable connector receipt ID.
  // When the caller supplies a conflicting state.
  const effect = externalEffect({ connector_receipt: "sg:connector-receipt/publish-1", state: "UNCERTAIN" });
  // Then receipt evidence, not caller state, derives COMMITTED.
  equal(effect.state, "COMMITTED", "state");
});

test("positive_observation_without_receipt_stays_uncertain", () => {
  // Given an uncertain external effect and an unreceipted positive observation.
  // When reconciliation runs.
  const reconciled = reconcileEffect({
    effect: externalEffect(),
    observations: [{ status: "COMMITTED" }],
  });
  // Then status alone cannot commit the effect.
  equal(reconciled.state, "UNCERTAIN", "state");
});

test("positive_receipted_observation_commits", () => {
  // Given an uncertain effect and a positive durable receipt observation.
  // When reconciliation runs.
  const reconciled = reconcileEffect({
    effect: externalEffect(),
    observations: [{ connector_receipt: "sg:connector-receipt/recovered", status: "COMMITTED" }],
  });
  // Then the effect is committed and bound to that receipt.
  equal(reconciled.state, "COMMITTED", "state");
  equal(reconciled.connector_receipt, "sg:connector-receipt/recovered", "connector_receipt");
});

test("legacy_unreceipted_committed_effect_is_demoted", () => {
  // Given legacy data claiming COMMITTED without receipt evidence.
  // When it is reconciled without new observations.
  const reconciled = reconcileEffect({
    effect: {
      effect_class: "EXTERNAL",
      effect_id: "sg:effect/legacy",
      state: "COMMITTED",
    },
  });
  // Then reconciliation restores the safe UNCERTAIN state.
  equal(reconciled.state, "UNCERTAIN", "state");
});

const report = {
  contract: "agent-native-execution-safety",
  ok: cases.every((item) => item.ok),
  results: cases,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.ok ? 0 : 1;
