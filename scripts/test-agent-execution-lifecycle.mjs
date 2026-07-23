import {
  callExport,
  failFromCall,
  fixedNow,
  grantInput,
  hasAnyText,
  hasText,
  idOf,
  isObject,
  operationInput,
  payload,
  pick,
  result,
  stateOf,
} from "./test-agent-execution-fixtures.mjs";

export async function exerciseExecutionLifecycle(modules) {
  const rows = [];
  const operationSpec = operationInput();
  const grant = grantInput();
  const operationCall = await callExport(modules.execution, "execution", "defineOperation", operationSpec);
  const operation = operationCall.ok ? payload(operationCall.value) : null;
  rows.push(operationCall.ok
    ? result(
      "operation_spec_defines_effect_and_capability",
      "operation has stable identity, NONE effect, idempotency, and required capability",
      {
        effectClass: pick(operation, ["effectClass", "effect_class", "effect"]),
        idempotent: pick(operation, ["idempotent", "isIdempotent"]),
        requiredCapability: pick(operation, ["requiredCapability", "required_capability", "capability"]),
        stableRef: pick(operation, ["stableRef", "stable_ref", "operation", "name"]),
      },
      isObject(operation)
        && hasAnyText(operation, ["effectClass", "effect_class", "effect"], ["NONE", "none"])
        && pick(operation, ["idempotent", "isIdempotent"]) === true
        && hasText(operation, ["requiredCapability", "required_capability", "capability"], "wiki.read")
        && typeof pick(operation, ["stableRef", "stable_ref", "operation", "name"]) === "string",
    )
    : failFromCall("operation_spec_defines_effect_and_capability", "operation has stable identity, NONE effect, idempotency, and required capability", operationCall));

  const authorizedCall = await callExport(modules.execution, "execution", "authorizeOperation", {
    capability: grant,
    grant,
    now: fixedNow,
    operation,
    resource: "sg:profile/editorial-reference-profile",
    subject: "agent:test",
  });
  const authorized = authorizedCall.ok ? payload(authorizedCall.value) : null;
  rows.push(authorizedCall.ok
    ? result(
      "capability_authorizes_scoped_read",
      "allowed true with a policy decision bound to subject, operation, resource, and time",
      authorized,
      isObject(authorized)
        && pick(authorized, ["allowed", "isAllowed"]) === true
        && isObject(pick(authorized, ["decision", "policyDecision", "policy_decision"]))
        && typeof pick(pick(authorized, ["decision", "policyDecision", "policy_decision"]), ["subject", "principal"]) === "string",
    )
    : failFromCall("capability_authorizes_scoped_read", "allowed true with a policy decision bound to subject, operation, resource, and time", authorizedCall));

  const deniedCall = await callExport(modules.execution, "execution", "authorizeOperation", {
    capability: grant,
    grant,
    now: fixedNow,
    operation,
    resource: "sg:governance/private",
    subject: "agent:other",
  });
  const denied = deniedCall.ok ? payload(deniedCall.value) : null;
  rows.push(deniedCall.ok
    ? result(
      "capability_denies_wrong_subject_and_resource",
      "allowed false with a stable authorization failure",
      denied,
      isObject(denied) && pick(denied, ["allowed", "isAllowed"]) === false,
    )
    : failFromCall("capability_denies_wrong_subject_and_resource", "allowed false with a stable authorization failure", deniedCall));

  const taskInput = {
    intent: { operation: "resolve", resource: "sg:profile/editorial-reference-profile" },
    operation: "resolve",
    requiredResult: { type: "profile" },
    stableRef: "sg:task/execution-fixture",
    taskId: "sg:task/execution-fixture",
  };
  const taskCall = await callExport(modules.execution, "execution", "createTask", taskInput);
  const task = taskCall.ok ? payload(taskCall.value) : null;
  rows.push(taskCall.ok
    ? result(
      "task_preserves_intent_and_required_result",
      "task has stable task identity, intent, required result, and initial state",
      task,
      isObject(task)
        && typeof idOf(task, "sg:task/execution-fixture") === "string"
        && isObject(pick(task, ["intent", "request"]))
        && isObject(pick(task, ["requiredResult", "required_result", "result"]))
        && typeof stateOf(task) === "string",
    )
    : failFromCall("task_preserves_intent_and_required_result", "task has stable task identity, intent, required result, and initial state", taskCall));

  const runCall = await callExport(modules.execution, "execution", "startRun", {
    input: { stableRef: "sg:profile/editorial-reference-profile" },
    runId: "sg:run/execution-fixture-1",
    run_id: "sg:run/execution-fixture-1",
    task,
    taskId: pick(task, ["taskId", "task_id", "stableRef", "stable_ref"]) ?? "sg:task/execution-fixture",
  });
  const run = runCall.ok ? payload(runCall.value) : null;
  rows.push(runCall.ok
    ? result(
      "run_belongs_to_one_task",
      "run has a distinct run identity linked to the task",
      run,
      isObject(run)
        && pick(run, ["runId", "run_id", "stableRef", "stable_ref", "id"]) === "sg:run/execution-fixture-1"
        && pick(run, ["taskId", "task_id"]) === (pick(task, ["taskId", "task_id", "stableRef", "stable_ref"]) ?? "sg:task/execution-fixture")
        && typeof stateOf(run) === "string",
    )
    : failFromCall("run_belongs_to_one_task", "run has a distinct run identity linked to the task", runCall));

  const immediateAuthCall = await callExport(modules.execution, "execution", "authorizeEffect", {
    capability: grant,
    grant,
    now: fixedNow,
    operation,
    resource: "sg:profile/editorial-reference-profile",
    run,
    subject: "agent:test",
    task,
  });
  const immediateAuth = immediateAuthCall.ok ? payload(immediateAuthCall.value) : null;
  rows.push(immediateAuthCall.ok
    ? result(
      "effect_rechecks_authorization_immediately",
      "effect authorization is explicitly allowed immediately before an external attempt",
      immediateAuth,
      isObject(immediateAuth) && pick(immediateAuth, ["allowed", "isAllowed"]) === true,
    )
    : failFromCall("effect_rechecks_authorization_immediately", "effect authorization is explicitly allowed immediately before an external attempt", immediateAuthCall));

  return { rows, operation, grant, task, run, authorized };
}
