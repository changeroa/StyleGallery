import { canonicalize, cloneAndFreeze, hashCanonical } from "../../canonical-json.mjs";

const TERMINAL = new Set(["RUN_FINISHED", "RUN_ERROR"]);
const EVENT_TYPES = new Set([
  "RUN_STARTED", "RUN_FINISHED", "RUN_ERROR",
  "TEXT_MESSAGE_START", "TEXT_MESSAGE_CONTENT", "TEXT_MESSAGE_END",
  "TOOL_CALL_START", "TOOL_CALL_ARGS", "TOOL_CALL_ARGUMENTS", "TOOL_CALL_END",
  "STATE_SNAPSHOT", "STATE_DELTA",
]);

export class AgUiProjectionError extends TypeError {
  constructor(code, message, path = "") {
    super(message);
    this.name = "AgUiProjectionError";
    this.code = code;
    if (path) this.path = path;
  }
}

function pick(value, ...keys) {
  if (!value || typeof value !== "object") return undefined;
  for (const key of keys) if (Object.hasOwn(value, key) && value[key] !== undefined) return value[key];
  return undefined;
}

function text(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function domainId(value, ...keys) {
  return text(pick(value, ...keys, "stable_ref", "stableRef", "id"), "unknown");
}

function bindingIds(binding, task, run) {
  const bindingId = text(pick(binding, "binding_id", "bindingId", "protocol_binding_id", "protocolBindingId"), "sg:binding/agui");
  const taskId = domainId(task, "task_id", "taskId");
  const runId = domainId(run, "run_id", "runId");
  const taskProtocolId = text(
    pick(binding, "agui_task_id", "aguiTaskId", "protocol_task_id", "protocolTaskId", "protocolTask"),
    `agui-task-${hashCanonical({ bindingId, taskId }).slice(7, 23)}`,
  );
  const runProtocolId = text(
    pick(binding, "agui_run_id", "aguiRunId", "protocol_run_id", "protocolRunId", "protocolRun"),
    `agui-run-${hashCanonical({ bindingId, runId }).slice(7, 23)}`,
  );
  const threadId = text(pick(binding, "thread_id", "threadId", "agui_thread_id", "aguiThreadId"), taskProtocolId);
  return { bindingId, domainTaskId: taskId, domainRunId: runId, taskProtocolId, runProtocolId, threadId };
}

function eventType(event) {
  return String(pick(event, "type", "eventType", "event_type", "name") ?? "")
    .trim().toUpperCase().replaceAll("-", "_");
}

function asEvents(input) {
  if (Array.isArray(input)) return input;
  return pick(input, "events", "items") ?? null;
}

function failure(code, message, path) {
  return path ? { code, message, path } : { code, message };
}

/** Validate an AG-UI event sequence before it crosses the protocol boundary. */
export function validateAgUiTransitions(input) {
  const events = asEvents(input);
  const failures = [];
  if (!Array.isArray(events)) return { ok: false, valid: false, failures: [failure("agui_events_required", "events must be an array", "events")] };
  if (events.length === 0) failures.push(failure("agui_events_empty", "AG-UI event sequence cannot be empty", "events"));
  let started = false;
  let ended = false;
  let openTextId = null;
  let openToolId = null;
  let runId = null;
  let terminalCount = 0;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const type = eventType(event);
    const path = `/events/${index}`;
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      failures.push(failure("agui_event_invalid", "event must be an object", path));
      continue;
    }
    if (!EVENT_TYPES.has(type)) failures.push(failure("agui_event_type_invalid", `unsupported AG-UI event type ${type || "<empty>"}`, `${path}/type`));
    const eventRunId = pick(event, "runId", "run_id");
    if (eventRunId !== undefined && runId !== null && eventRunId !== runId) failures.push(failure("agui_run_id_mismatch", "all events must use one protocol run ID", `${path}/runId`));
    if (eventRunId !== undefined) runId = eventRunId;
    if (ended) failures.push(failure("agui_event_after_terminal", "no event may follow a terminal event", path));
    if (type === "RUN_STARTED") {
      if (started) failures.push(failure("agui_run_started_duplicate", "RUN_STARTED may occur only once", path));
      if (index !== 0) failures.push(failure("agui_run_started_not_first", "RUN_STARTED must be the first event", path));
      started = true;
      continue;
    }
    if (!started) failures.push(failure("agui_run_not_started", "event cannot precede RUN_STARTED", path));
    if (TERMINAL.has(type)) {
      terminalCount += 1;
      ended = true;
      if (openTextId !== null) failures.push(failure("agui_text_message_open", "terminal event closed an open text message", path));
      if (openToolId !== null) failures.push(failure("agui_tool_call_open", "terminal event closed an open tool call", path));
      continue;
    }
    if (type === "TEXT_MESSAGE_START") {
      const current = pick(event, "messageId", "message_id");
      if (typeof current !== "string" || current.length === 0) failures.push(failure("agui_message_id_required", "TEXT_MESSAGE_START requires messageId", `${path}/messageId`));
      if (openTextId !== null) failures.push(failure("agui_text_message_nested", "text messages cannot be nested", path));
      openTextId = current ?? null;
    } else if (type === "TEXT_MESSAGE_CONTENT") {
      const current = pick(event, "messageId", "message_id");
      if (openTextId === null || current !== openTextId) failures.push(failure("agui_text_message_not_open", "TEXT_MESSAGE_CONTENT must target an open message", path));
    } else if (type === "TEXT_MESSAGE_END") {
      const current = pick(event, "messageId", "message_id");
      if (openTextId === null || current !== openTextId) failures.push(failure("agui_text_message_not_open", "TEXT_MESSAGE_END must target an open message", path));
      openTextId = null;
    } else if (type === "TOOL_CALL_START") {
      const current = pick(event, "toolCallId", "tool_call_id");
      if (typeof current !== "string" || current.length === 0) failures.push(failure("agui_tool_call_id_required", "TOOL_CALL_START requires toolCallId", `${path}/toolCallId`));
      if (openToolId !== null) failures.push(failure("agui_tool_call_nested", "tool calls cannot be nested", path));
      openToolId = current ?? null;
    } else if (type === "TOOL_CALL_ARGS" || type === "TOOL_CALL_ARGUMENTS") {
      const current = pick(event, "toolCallId", "tool_call_id");
      if (openToolId === null || current !== openToolId) failures.push(failure("agui_tool_call_not_open", "TOOL_CALL_ARGS must target an open tool call", path));
    } else if (type === "TOOL_CALL_END") {
      const current = pick(event, "toolCallId", "tool_call_id");
      if (openToolId === null || current !== openToolId) failures.push(failure("agui_tool_call_not_open", "TOOL_CALL_END must target an open tool call", path));
      openToolId = null;
    }
  }
  if (!started) failures.push(failure("agui_run_started_required", "sequence must contain RUN_STARTED", "events"));
  if (terminalCount !== 1) failures.push(failure("agui_terminal_count_invalid", "sequence must contain exactly one terminal event", "events"));
  if (terminalCount === 1 && !TERMINAL.has(eventType(events.at(-1)))) failures.push(failure("agui_terminal_not_last", "terminal event must be last", `/events/${events.length - 1}`));
  if (openTextId !== null) failures.push(failure("agui_text_message_unclosed", "text message did not receive TEXT_MESSAGE_END", "events"));
  if (openToolId !== null) failures.push(failure("agui_tool_call_unclosed", "tool call did not receive TOOL_CALL_END", "events"));
  return { ok: failures.length === 0, valid: failures.length === 0, failures };
}

function protocolEvent(type, ids, fields = {}) {
  return { type, runId: ids.runProtocolId, ...fields };
}

/** Project a domain Task/Run outcome to one deterministic AG-UI 0.0.57 stream. */
export function projectAgUiEvents(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AgUiProjectionError("agui_input_invalid", "projectAgUiEvents expects an object");
  const ids = bindingIds(pick(input, "protocolBinding", "protocol_binding") ?? {}, input.task ?? {}, input.run ?? {});
  const textValue = String(pick(input, "text", "message") ?? "");
  const messageValue = pick(input, "messageId", "message_id") ?? `${ids.runProtocolId}:message`;
  const tool = pick(input, "toolCall", "tool_call") ?? {};
  const toolId = text(pick(tool, "id", "toolCallId", "tool_call_id"), `${ids.runProtocolId}:tool`);
  const toolName = text(pick(tool, "name", "toolName", "tool_name"), "operation");
  const toolArgs = pick(tool, "args", "arguments") ?? {};
  const state = pick(input, "state", "snapshot") ?? {};
  const outcome = String(pick(input, "outcome", "status") ?? pick(input.run, "state", "status") ?? pick(input.task, "state", "status") ?? "COMPLETED").toUpperCase();
  const success = new Set(["COMPLETED", "SUCCEEDED", "SUCCESS", "OK", "PASS", "PASSED"]).has(outcome);
  const correlation = { protocolBindingId: ids.bindingId, domainTaskId: ids.domainTaskId, domainRunId: ids.domainRunId };
  const events = [
    protocolEvent("RUN_STARTED", ids, { threadId: ids.threadId, input: pick(input.task, "intent", "request") ?? {}, metadata: correlation }),
    protocolEvent("TEXT_MESSAGE_START", ids, { messageId: messageValue, role: "assistant" }),
    protocolEvent("TEXT_MESSAGE_CONTENT", ids, { messageId: messageValue, delta: textValue }),
    protocolEvent("TEXT_MESSAGE_END", ids, { messageId: messageValue }),
    protocolEvent("TOOL_CALL_START", ids, { toolCallId: toolId, toolCallName: toolName }),
    protocolEvent("TOOL_CALL_ARGS", ids, { toolCallId: toolId, delta: typeof toolArgs === "string" ? toolArgs : canonicalize(toolArgs) }),
    protocolEvent("TOOL_CALL_END", ids, { toolCallId: toolId }),
    protocolEvent("STATE_SNAPSHOT", ids, { snapshot: state }),
    success
      ? protocolEvent("RUN_FINISHED", ids, { threadId: ids.threadId, result: pick(input, "result", "output") ?? { status: outcome } })
      : protocolEvent("RUN_ERROR", ids, { threadId: ids.threadId, message: text(pick(input, "error", "errorMessage"), outcome) }),
  ];
  const validation = validateAgUiTransitions(events);
  if (!validation.ok) throw new AgUiProjectionError("agui_projection_invalid", "generated event sequence failed transition validation");
  return cloneAndFreeze({ ok: true, events, protocolBinding: { ...correlation, protocol: "ag-ui" }, protocolIds: { threadId: ids.threadId, taskId: ids.taskProtocolId, runId: ids.runProtocolId } });
}

export const projectAGUIEvents = projectAgUiEvents;
export const projectAguiEvents = projectAgUiEvents;
export const createAgUiEvents = projectAgUiEvents;
export const validateAGUITransitions = validateAgUiTransitions;
export const assertAgUiTransitions = validateAgUiTransitions;
export const validateEventSequence = validateAgUiTransitions;

export const AG_UI_EXPERIMENTAL_EXTENSION = Object.freeze({
  protocol: "ag-ui",
  version: "0.0.57",
  operations: Object.freeze({
    "events.project": projectAgUiEvents,
    "events.validate": validateAgUiTransitions,
  }),
});

export function registerAgUiExtension(registry) {
  return registry.register(AG_UI_EXPERIMENTAL_EXTENSION);
}
