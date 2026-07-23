import {
  callExport,
  failFromCall,
  hasAnyText,
  isObject,
  payload,
  pick,
  result,
} from "./test-agent-execution-fixtures.mjs";

export async function exerciseExecutionEffects(modules, state) {
  const rows = [];
  const effectCall = await callExport(modules.execution, "execution", "recordEffectAttempt", {
    attempt: "external-call",
    connector: "fixture-connector",
    connectorReceipt: null,
    effect: "sg:effect/execution-fixture",
    effectClass: "EXTERNAL",
    effectId: "sg:effect/execution-fixture",
    idempotencyKey: "idem:execution-fixture",
    operation: state.operation,
    run: state.run,
    state: "UNCERTAIN",
    task: state.task,
  });
  const uncertain = effectCall.ok ? payload(effectCall.value) : null;
  rows.push(effectCall.ok
    ? result(
      "external_effect_without_receipt_is_uncertain",
      "an external attempt without durable connector receipt is UNCERTAIN",
      uncertain,
      isObject(uncertain) && hasAnyText(uncertain, ["state", "status", "effectState", "effect_state"], ["UNCERTAIN", "uncertain"]),
    )
    : failFromCall("external_effect_without_receipt_is_uncertain", "an external attempt without durable connector receipt is UNCERTAIN", effectCall));

  const recoveredCall = await callExport(modules.execution, "execution", "reconcileEffect", {
    effect: uncertain,
    observation: { connectorReceipt: "sg:connector-receipt/recovered", status: "COMMITTED" },
    observations: [{ connectorReceipt: "sg:connector-receipt/recovered", status: "COMMITTED" }],
    strategy: "reconcile",
  });
  const recovered = recoveredCall.ok ? payload(recoveredCall.value) : null;
  rows.push(recoveredCall.ok
    ? result(
      "uncertain_effect_reconciles_from_positive_observation",
      "positive connector observation yields COMMITTED and preserves receipt",
      recovered,
      isObject(recovered)
        && hasAnyText(recovered, ["state", "status", "effectState", "effect_state"], ["COMMITTED", "committed"])
        && typeof pick(recovered, ["connectorReceipt", "connector_receipt", "receiptId", "receipt_id"]) === "string",
    )
    : failFromCall("uncertain_effect_reconciles_from_positive_observation", "positive connector observation yields COMMITTED and preserves receipt", recoveredCall));

  const compensatedCall = await callExport(modules.execution, "execution", "reconcileEffect", {
    effect: uncertain,
    observation: { status: "ABSENT" },
    observations: [{ status: "ABSENT" }],
    strategy: "compensate",
  });
  const compensated = compensatedCall.ok ? payload(compensatedCall.value) : null;
  rows.push(compensatedCall.ok
    ? result(
      "uncertain_effect_can_be_compensated",
      "negative connector observation with explicit compensation yields COMPENSATED",
      compensated,
      isObject(compensated) && hasAnyText(compensated, ["state", "status", "effectState", "effect_state"], ["COMPENSATED", "compensated"]),
    )
    : failFromCall("uncertain_effect_can_be_compensated", "negative connector observation with explicit compensation yields COMPENSATED", compensatedCall));

  const conflictCall = await callExport(modules.execution, "execution", "reconcileEffect", {
    effect: uncertain,
    observation: { status: "COMMITTED" },
    observations: [{ status: "COMMITTED" }, { status: "ABSENT" }],
    strategy: "reconcile",
  });
  const conflict = conflictCall.ok ? payload(conflictCall.value) : null;
  rows.push(conflictCall.ok
    ? result(
      "conflicting_reconciliation_stays_uncertain",
      "conflicting observations never silently commit or compensate",
      conflict,
      isObject(conflict) && hasAnyText(conflict, ["state", "status", "effectState", "effect_state"], ["UNCERTAIN", "uncertain"]),
    )
    : failFromCall("conflicting_reconciliation_stays_uncertain", "conflicting observations never silently commit or compensate", conflictCall));

  const receiptCall = await callExport(modules.execution, "execution", "createReceipt", {
    causalParents: ["sg:event/effect-reconciled"],
    effect: recovered,
    effects: [recovered],
    input: { stableRef: "sg:profile/editorial-reference-profile" },
    operation: state.operation,
    output: { stableRef: "sg:profile/editorial-reference-profile", resolved: true },
    policyDecision: pick(state.authorized, ["decision", "policyDecision", "policy_decision"]) ?? state.authorized,
    run: state.run,
    task: state.task,
  });
  const receipt = receiptCall.ok ? payload(receiptCall.value) : null;
  rows.push(receiptCall.ok
    ? result(
      "invocation_receipt_binds_operation_task_run_and_effect",
      "receipt records operation, task/run IDs, normalized input/output digests, policy, effects, and causal parents",
      receipt,
      isObject(receipt)
        && typeof pick(receipt, ["inputDigest", "input_digest", "normalizedInputDigest", "normalized_input_digest"]) === "string"
        && typeof pick(receipt, ["outputDigest", "output_digest", "normalizedOutputDigest", "normalized_output_digest"]) === "string"
        && typeof pick(receipt, ["taskId", "task_id"]) === "string"
        && typeof pick(receipt, ["runId", "run_id"]) === "string"
        && Array.isArray(pick(receipt, ["effects", "effectIds", "effect_ids"]))
        && Array.isArray(pick(receipt, ["causalParents", "causal_parents", "parents"])),
    )
    : failFromCall("invocation_receipt_binds_operation_task_run_and_effect", "receipt records operation, task/run IDs, normalized input/output digests, policy, effects, and causal parents", receiptCall));

  return { rows, uncertain, recovered, receipt };
}
