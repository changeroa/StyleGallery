#!/usr/bin/env node

import { createExperimentalExtensionRegistry } from "./agent-native/v2/experimental-extension-registry.mjs";
import { registerA2AExtension } from "./agent-native/v2/extensions/a2a-projection.mjs";
import { registerAgUiExtension } from "./agent-native/v2/extensions/agui-projection.mjs";

const domainTask = Object.freeze({
  stableRef: "sg:task/projection-fixture",
  taskId: "sg:task/projection-fixture",
  state: "RUNNING",
  runId: "sg:run/projection-fixture",
  intent: { operation: "resolve", stableRef: "sg:profile/editorial-reference-profile" },
  requiredResult: { type: "profile" },
});
const domainRun = Object.freeze({ runId: "sg:run/projection-fixture", taskId: domainTask.taskId, state: "RUNNING" });
const protocolBinding = Object.freeze({
  bindingId: "sg:binding/a2a-projection-fixture",
  protocolBindingId: "sg:binding/a2a-projection-fixture",
  protocol: "a2a",
  taskId: domainTask.taskId,
  runId: domainRun.runId,
});
const message = Object.freeze({
  messageId: "a2a-message-projection-fixture",
  role: "user",
  parts: [{ kind: "text", text: "Resolve the editorial profile." }],
});

function pick(value, ...keys) {
  if (!value || typeof value !== "object") return undefined;
  for (const key of keys) if (Object.hasOwn(value, key)) return value[key];
  return undefined;
}

function unwrap(value) {
  return value?.ok === true && Object.hasOwn(value, "result") ? value.result : value;
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stateOf(value) {
  const status = pick(value, "status");
  return String(pick(status, "state", "status") ?? pick(value, "state", "taskState", "task_state") ?? "").toLowerCase();
}

function idOf(value, ...keys) {
  return pick(value, ...keys, "id", "taskId", "task_id", "runId", "run_id", "stableRef", "stable_ref");
}

async function load(name) {
  try {
    const registry = createExperimentalExtensionRegistry();
    if (name === "a2a") registerA2AExtension(registry);
    else if (name === "agui") registerAgUiExtension(registry);
    else throw new Error(`unknown extension ${name}`);
    const invoke = (protocol, version, operation) => (input) => registry.project({ protocol, version, operation, input });
    return { ok: true, module: name === "a2a" ? {
      createAgentCard: invoke("a2a", "1.0", "agent-card.create"),
      mapTaskState: invoke("a2a", "1.0", "task.state"),
      sendMessage: invoke("a2a", "1.0", "message.send"),
      getTask: invoke("a2a", "1.0", "task.get"),
      cancelTask: invoke("a2a", "1.0", "task.cancel"),
    } : {
      projectAgUiEvents: invoke("ag-ui", "0.0.57", "events.project"),
      validateAgUiTransitions: invoke("ag-ui", "0.0.57", "events.validate"),
    } };
  } catch (error) {
    return { ok: false, error: { code: error?.code ?? "kernel_module_missing", module: name, message: error instanceof Error ? error.message : String(error) } };
  }
}

function findExport(loaded, names, moduleName) {
  if (!loaded.ok) throw Object.assign(new Error(loaded.error.message), loaded.error);
  for (const name of names) if (typeof loaded.module[name] === "function") return loaded.module[name];
  const error = new Error(`${moduleName} must export one of ${names.join(", ")}`);
  error.code = "kernel_export_missing";
  error.module = moduleName;
  throw error;
}

async function call(loaded, names, moduleName, input) {
  const fn = findExport(loaded, names, moduleName);
  return await fn(input);
}

function row(name, expected, actual, ok, details) {
  return { actual, expected, name, ok, ...(details ? { details } : {}) };
}

function failure(error) {
  return { code: error?.code ?? "projection_case_exception", message: error?.message ?? String(error), ...(error?.path ? { path: error.path } : {}) };
}

function taskProjection(value) {
  const result = unwrap(value);
  return pick(result, "task", "taskProjection", "task_projection") ?? result;
}

function bindingOf(value) {
  const result = unwrap(value);
  return pick(result, "protocolBinding", "protocol_binding", "binding") ?? {};
}

function protocolTaskId(value) {
  const task = taskProjection(value);
  return idOf(task, "id", "taskId", "task_id");
}

async function testA2A(loaded) {
  const rows = [];
  try {
    const card = unwrap(await call(loaded, ["createAgentCard", "buildAgentCard", "projectAgentCard", "agentCard"], "a2a", { fixture: true }));
    const capabilities = pick(card, "capabilities");
    rows.push(row(
      "a2a_agent_card_is_v1_shaped",
      "Agent Card has protocolVersion, identity, URL, capabilities, input/output modes, and skills",
      card,
      object(card)
        && typeof pick(card, "protocolVersion", "protocol_version") === "string"
        && typeof pick(card, "name") === "string"
        && typeof pick(card, "url") === "string"
        && object(capabilities)
        && Array.isArray(pick(card, "defaultInputModes", "default_input_modes"))
        && Array.isArray(pick(card, "defaultOutputModes", "default_output_modes"))
        && Array.isArray(pick(card, "skills")),
    ));

    const map = findExport(loaded, ["mapTaskState", "projectTaskState", "toA2ATaskState"], "a2a");
    const mappings = {
      PENDING: "submitted", RUNNING: "working", COMPLETED: "completed", FAILED: "failed",
      CANCELED: "canceled", REJECTED: "rejected", AUTH_REQUIRED: "auth-required", UNKNOWN: "unknown",
    };
    const actualMappings = Object.fromEntries(Object.entries(mappings).map(([input]) => [input, map(input)]));
    rows.push(row("a2a_task_state_mapping_is_total", "all domain terminal/intermediate states map to official A2A states", actualMappings, Object.entries(mappings).every(([input, expected]) => String(actualMappings[input]).toLowerCase() === expected)));

    const send = unwrap(await call(loaded, ["sendMessage", "projectSendMessage", "handleSendMessage"], "a2a", {
      message,
      task: domainTask,
      run: domainRun,
      protocolBinding,
    }));
    const sentTaskId = protocolTaskId(send);
    const sentBinding = bindingOf(send);
    const bindingId = idOf(sentBinding, "protocolBindingId", "protocol_binding_id", "bindingId", "binding_id");
    const boundTaskId = idOf(sentBinding, "taskId", "task_id", "domainTaskId", "domain_task_id");
    const boundRunId = idOf(sentBinding, "runId", "run_id", "domainRunId", "domain_run_id");
    rows.push(row(
      "a2a_send_message_creates_distinct_protocol_binding",
      "SendMessage returns a submitted A2A task and ProtocolBinding that does not replace domain Task/Run IDs",
      { taskId: sentTaskId, state: stateOf(send), bindingId, boundTaskId, boundRunId },
      object(send) && typeof sentTaskId === "string" && stateOf(send) === "submitted"
        && typeof bindingId === "string" && bindingId !== domainTask.taskId && bindingId !== domainRun.runId
        && boundTaskId === domainTask.taskId && boundRunId === domainRun.runId,
    ));

    const get = unwrap(await call(loaded, ["getTask", "projectGetTask", "handleGetTask"], "a2a", {
      task: send,
      domainTask,
      run: domainRun,
      protocolBinding: sentBinding,
      taskId: sentTaskId,
    }));
    rows.push(row("a2a_get_task_projects_current_domain_state", "GetTask preserves protocol task identity and maps RUNNING to working", { taskId: protocolTaskId(get), state: stateOf(get) }, protocolTaskId(get) === sentTaskId && stateOf(get) === "working"));

    const canceled = unwrap(await call(loaded, ["cancelTask", "projectCancelTask", "handleCancelTask"], "a2a", {
      task: get,
      domainTask: { ...domainTask, state: "CANCELED" },
      run: domainRun,
      protocolBinding: sentBinding,
      taskId: sentTaskId,
    }));
    rows.push(row("a2a_cancel_task_projects_canceled", "CancelTask returns the same protocol task in canceled state", { taskId: protocolTaskId(canceled), state: stateOf(canceled) }, protocolTaskId(canceled) === sentTaskId && stateOf(canceled) === "canceled"));
  } catch (error) {
    rows.push(row("a2a_projection_kernel_available", "A2A projection module exports the required pure functions", failure(error), false));
  }
  return rows;
}

function eventType(event) {
  return String(pick(event, "type", "eventType", "event_type", "name") ?? "").toUpperCase();
}

function eventList(value) {
  const result = unwrap(value);
  return Array.isArray(result) ? result : pick(result, "events", "items") ?? [];
}

async function testAGUI(loaded) {
  const rows = [];
  try {
    const project = findExport(loaded, ["projectAgUiEvents", "projectAGUIEvents", "projectAguiEvents", "createAgUiEvents"], "agui");
    const projection = await project({
      task: domainTask,
      run: domainRun,
      protocolBinding: { ...protocolBinding, protocol: "ag-ui", bindingId: "sg:binding/agui-projection-fixture" },
      text: "Editorial profile resolved.",
      toolCall: { id: "tool-call-projection-fixture", name: "resolve", args: { stableRef: "sg:profile/editorial-reference-profile" } },
      state: { stableRef: "sg:profile/editorial-reference-profile", status: "resolved" },
      outcome: "COMPLETED",
    });
    const events = eventList(projection);
    const types = events.map(eventType);
    const index = (names) => types.findIndex((type) => names.includes(type));
    const terminal = types.filter((type) => ["RUN_FINISHED", "RUN_ERROR"].includes(type));
    const ordered = index(["RUN_STARTED"]) >= 0
      && index(["TEXT_MESSAGE_START"]) > index(["RUN_STARTED"])
      && index(["TEXT_MESSAGE_CONTENT"]) > index(["TEXT_MESSAGE_START"])
      && index(["TEXT_MESSAGE_END"]) > index(["TEXT_MESSAGE_CONTENT"])
      && index(["TOOL_CALL_START"]) > index(["TEXT_MESSAGE_END"])
      && index(["TOOL_CALL_ARGS", "TOOL_CALL_ARGUMENTS"]) > index(["TOOL_CALL_START"])
      && index(["TOOL_CALL_END"]) > index(["TOOL_CALL_ARGS", "TOOL_CALL_ARGUMENTS"])
      && index(["STATE_SNAPSHOT", "STATE_DELTA"]) > index(["TOOL_CALL_END"])
      && terminal.length === 1
      && types.indexOf(terminal[0]) === types.length - 1;
    rows.push(row("agui_projection_has_ordered_v057_lifecycle", "RUN, text, tool, state, then exactly one terminal event", { types }, ordered));

    const validate = findExport(loaded, ["validateAgUiTransitions", "validateAGUITransitions", "assertAgUiTransitions", "validateEventSequence"], "agui");
    let rejected = false;
    let rejection;
    try {
      rejection = await validate({ events: [{ type: "RUN_FINISHED", runId: "protocol-run-fixture" }, { type: "RUN_STARTED", runId: "protocol-run-fixture" }] });
      rejected = rejection?.ok === false || rejection?.valid === false;
    } catch (error) {
      rejected = true;
      rejection = failure(error);
    }
    rows.push(row("agui_invalid_transition_is_rejected", "a terminal-before-start sequence is rejected before projection", rejection, rejected));
  } catch (error) {
    rows.push(row("agui_projection_kernel_available", "AG-UI projection module exports ordered event and transition validation functions", failure(error), false));
  }
  return rows;
}

async function main() {
  const unsupported = process.argv.slice(2).filter((argument) => argument !== "--json");
  if (unsupported.length > 0) {
    process.stdout.write(`${JSON.stringify({ ok: false, status: "RED", failures: [{ code: "argument_unknown", message: `unknown argument ${unsupported[0]}` }], results: [] }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  const modules = { a2a: await load("a2a"), agui: await load("agui") };
  const results = [...await testA2A(modules.a2a), ...await testAGUI(modules.agui)];
  const ok = results.every((result) => result.ok);
  process.stdout.write(`${JSON.stringify({ ok, status: ok ? "GREEN" : "RED", modules: Object.fromEntries(Object.entries(modules).map(([name, loaded]) => [name, loaded.ok ? { ok: true } : { ok: false, error: loaded.error }])), results }, null, 2)}\n`);
  process.exitCode = ok ? 0 : 1;
}

await main();
