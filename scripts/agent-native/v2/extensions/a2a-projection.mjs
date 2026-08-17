import { cloneAndFreeze, hashCanonical } from "../../canonical-json.mjs";

const STATE_MAP = Object.freeze({
  PENDING: "submitted", CREATED: "submitted", QUEUED: "submitted", SUBMITTED: "submitted",
  RUNNING: "working", STARTED: "working", IN_PROGRESS: "working", WORKING: "working",
  COMPLETED: "completed", SUCCEEDED: "completed", SUCCESS: "completed", DONE: "completed",
  FAILED: "failed", ERROR: "failed", ERRORED: "failed",
  CANCELED: "canceled", CANCELLED: "canceled", ABORTED: "canceled",
  REJECTED: "rejected", AUTH_REQUIRED: "auth-required", AUTHENTICATION_REQUIRED: "auth-required",
});

const TERMINAL_STATES = new Set(["completed", "failed", "canceled", "rejected", "auth-required"]);

export class A2AProjectionError extends TypeError {
  constructor(code, message, path = "") {
    super(message);
    this.name = "A2AProjectionError";
    this.code = code;
    if (path) this.path = path;
  }
}

function fail(code, message, path) {
  throw new A2AProjectionError(code, message, path);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pick(value, ...keys) {
  if (!object(value)) return undefined;
  for (const key of keys) if (Object.hasOwn(value, key) && value[key] !== undefined) return value[key];
  return undefined;
}

function copy(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function freeze(value) {
  return cloneAndFreeze(value);
}

function digest(value) {
  return hashCanonical(value).slice("sha256:".length);
}

function idOf(value, ...keys) {
  const id = pick(value, ...keys, "stableRef", "stable_ref", "id");
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

function domainTaskId(source, task) {
  const explicit = idOf(source, "domainTaskId", "domain_task_id");
  const taskRef = idOf(task, "taskId", "task_id", "stableRef", "stable_ref");
  const generic = !pick(source, "domainTask", "domain_task") ? idOf(source, "taskId", "task_id") : undefined;
  return explicit
    ?? taskRef
    ?? generic
    ?? `sg:task/a2a-${digest({ task, message: pick(source, "message") }).slice(0, 20)}`;
}

function domainRunId(source, run, taskId) {
  const explicit = idOf(source, "domainRunId", "domain_run_id");
  const runRef = idOf(run, "runId", "run_id", "stableRef", "stable_ref");
  const generic = !pick(source, "domainRun", "domain_run") ? idOf(source, "runId", "run_id") : undefined;
  return explicit
    ?? runRef
    ?? generic
    ?? `sg:run/a2a-${digest({ run, taskId }).slice(0, 20)}`;
}

function protocolIds(source, task, binding, taskId, runId) {
  const protocolTaskId = pick(source, "protocolTaskId", "protocol_task_id", "a2aTaskId", "a2a_task_id")
    ?? pick(binding, "protocolTaskId", "protocol_task_id", "a2aTaskId", "a2a_task_id")
    ?? pick(task, "protocolTaskId", "protocol_task_id", "a2aTaskId", "a2a_task_id")
    ?? `a2a-task-${digest({ taskId, runId, message: pick(source, "message"), binding }).slice(0, 24)}`;
  const protocolContextId = pick(source, "protocolContextId", "protocol_context_id", "a2aContextId", "a2a_context_id")
    ?? pick(binding, "protocolContextId", "protocol_context_id", "a2aContextId", "a2a_context_id")
    ?? pick(task, "contextId", "context_id")
    ?? `a2a-context-${digest({ taskId, runId }).slice(0, 24)}`;
  if (protocolTaskId === taskId || protocolTaskId === runId) fail("protocol_task_id_conflict", "A2A task ID must not equal a domain Task or Run ID", "protocolTaskId");
  if (protocolContextId === taskId || protocolContextId === runId || protocolContextId === protocolTaskId) fail("protocol_context_id_conflict", "A2A context ID must remain distinct from domain and task IDs", "protocolContextId");
  return { protocolTaskId: String(protocolTaskId), protocolContextId: String(protocolContextId) };
}

function makeBinding(binding, taskId, runId, protocolTaskId, protocolContextId) {
  const supplied = object(binding) ? copy(binding) : {};
  const bindingId = pick(supplied, "bindingId", "binding_id", "protocolBindingId", "protocol_binding_id")
    ?? `sg:binding/a2a-${digest({ taskId, runId, protocolTaskId, protocolContextId }).slice(0, 24)}`;
  if (typeof bindingId !== "string" || bindingId.length === 0) fail("protocol_binding_required", "ProtocolBinding requires a non-empty binding ID", "protocolBindingId");
  if (bindingId === taskId || bindingId === runId || bindingId === protocolTaskId || bindingId === protocolContextId) fail("protocol_binding_id_conflict", "ProtocolBinding ID must remain distinct from every correlated ID", "protocolBindingId");
  return freeze({
    ...supplied,
    bindingId,
    domainRunId: runId,
    domainTaskId: taskId,
    protocol: "a2a",
    protocolBindingId: bindingId,
    protocolContextId,
    protocolTaskId,
    runId,
    taskId,
  });
}

function taskFrom(input) {
  const source = object(input) ? input : {};
  const task = object(source.task) ? source.task : source;
  return object(task.task) && !pick(task, "status", "id", "contextId") ? task.task : task;
}

function bindingFrom(input, task) {
  return pick(input, "protocolBinding", "protocol_binding", "binding")
    ?? pick(task, "protocolBinding", "protocol_binding", "binding")
    ?? {};
}

function domainState(input, task) {
  const source = object(input) ? input : {};
  const domainTask = pick(source, "domainTask", "domain_task");
  return pick(domainTask, "state", "status", "taskState", "task_state")
    ?? pick(task, "domainState", "domain_state")
    ?? pick(task, "state", "taskState", "task_state")
    ?? pick(pick(task, "status"), "state", "status")
    ?? "UNKNOWN";
}

function taskStatus(task, state) {
  const status = object(pick(task, "status")) ? copy(task.status) : {};
  return { ...status, state };
}

function responseFor(task) {
  const { protocolBinding: _binding, ...nested } = task;
  return freeze({ ...task, task: nested });
}

function projectTask(input, state, mode = "project") {
  const source = object(input) ? input : {};
  const task = taskFrom(source);
  const domainTask = object(pick(source, "domainTask", "domain_task")) ? pick(source, "domainTask", "domain_task") : task;
  const run = pick(source, "run", "domainRun", "domain_run");
  const taskId = domainTaskId(source, domainTask);
  const runId = domainRunId(source, run, taskId);
  const suppliedBinding = bindingFrom(source, task);
  const { protocolTaskId, protocolContextId } = protocolIds(source, task, suppliedBinding, taskId, runId);
  const binding = makeBinding(suppliedBinding, taskId, runId, protocolTaskId, protocolContextId);
  const requestedTaskId = pick(source, "taskId", "task_id");
  const existingProtocolId = pick(task, "id", "protocolTaskId", "protocol_task_id")
    ?? (object(pick(task, "status")) ? pick(task, "taskId", "task_id") : undefined);
  const currentProtocolId = mode === "send" ? protocolTaskId : existingProtocolId ?? protocolTaskId;
  if (requestedTaskId !== undefined && requestedTaskId !== currentProtocolId && requestedTaskId !== protocolTaskId) fail("protocol_task_mismatch", "requested A2A task ID does not match the correlated task", "taskId");
  const message = pick(source, "message");
  const history = Array.isArray(pick(task, "history")) ? copy(task.history) : (message ? [copy(message)] : []);
  const artifacts = Array.isArray(pick(task, "artifacts")) ? copy(task.artifacts) : [];
  const projected = {
    artifacts,
    contextId: protocolContextId,
    history,
    id: currentProtocolId,
    kind: "task",
    metadata: {
      ...(object(pick(task, "metadata")) ? copy(task.metadata) : {}),
      stylegallery: { domainRunId: runId, domainTaskId: taskId, protocolBindingId: binding.protocolBindingId },
    },
    protocolBinding: binding,
    status: taskStatus(task, state),
  };
  if (mode === "send") projected.history = message ? [copy(message)] : history;
  return freeze(projected);
}

/** Map every domain lifecycle state to an official A2A TaskState value. */
export function mapTaskState(value) {
  const raw = typeof value === "string" ? value : pick(value, "state", "status", "taskState", "task_state");
  const normalized = String(raw ?? "UNKNOWN").trim().toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
  return STATE_MAP[normalized] ?? "unknown";
}

/** Return the deterministic, v1-shaped Agent Card for StyleGallery. */
export function createAgentCard(input = {}) {
  const source = object(input) ? input : {};
  const skills = [
    ["discover", "Discover StyleGallery capabilities and immutable manifest."],
    ["resolve", "Resolve a StableRef or VersionID to its immutable object."],
    ["claims", "Inspect claims, evidence, validation, and governance disposition."],
    ["context", "Build a bounded retrieval context package with provenance."],
    ["ops", "List read-only operation specifications and schemas."],
    ["retrieve", "Retrieve ranked governed knowledge without mutation."],
  ].map(([id, description]) => ({ description, examples: [], id, inputModes: ["text", "data"], name: id, outputModes: ["text", "data"], tags: ["stylegallery", "knowledge"] }));
  return freeze({
    capabilities: { pushNotifications: false, stateTransitionHistory: true, streaming: false },
    defaultInputModes: ["text", "data"],
    defaultOutputModes: ["text", "data"],
    description: typeof source.description === "string" ? source.description : "Evidence-preserving, agent-native StyleGallery knowledge operations.",
    name: typeof source.name === "string" ? source.name : "StyleGallery Agent",
    protocolVersion: "1.0",
    skills,
    supportsAuthenticatedExtendedCard: false,
    url: typeof source.url === "string" ? source.url : "https://stylegallery.local/agent",
    version: typeof source.version === "string" ? source.version : "1.0.0",
  });
}

/** Project an A2A SendMessage request into a new submitted protocol task. */
export function sendMessage(input) {
  const source = object(input) ? input : fail("send_message_input_required", "sendMessage expects an object");
  const message = pick(source, "message");
  if (!object(message)) fail("message_required", "SendMessage requires a message object", "message");
  const task = projectTask({ ...source, message }, "submitted", "send");
  return responseFor(task);
}

/** Project current domain Task/Run state while preserving the A2A task ID. */
export function getTask(input) {
  const source = object(input) ? input : fail("get_task_input_required", "getTask expects an object");
  const task = taskFrom(source);
  const taskId = pick(source, "taskId", "task_id");
  if (taskId === undefined && !idOf(task, "id", "taskId", "task_id", "protocolTaskId", "protocol_task_id")) fail("protocol_task_required", "GetTask requires an A2A task ID", "taskId");
  const state = mapTaskState(domainState(source, task));
  const projected = projectTask(source, state);
  return responseFor(projected);
}

/** Request cancellation; terminal non-canceled states reject invalid transitions. */
export function cancelTask(input) {
  const source = object(input) ? input : fail("cancel_task_input_required", "cancelTask expects an object");
  const task = taskFrom(source);
  const current = mapTaskState(domainState(source, task));
  if (TERMINAL_STATES.has(current) && current !== "canceled") fail("cancellation_not_allowed", `cannot cancel a ${current} A2A task`, "task");
  if (current === "unknown") fail("invalid_task_transition", "cannot cancel an unknown A2A task state", "task");
  const projected = projectTask(source, "canceled");
  return responseFor(projected);
}

export const buildAgentCard = createAgentCard;
export const projectAgentCard = createAgentCard;
export const agentCard = createAgentCard;
export const projectSendMessage = sendMessage;
export const handleSendMessage = sendMessage;
export const projectGetTask = getTask;
export const handleGetTask = getTask;
export const projectCancelTask = cancelTask;
export const handleCancelTask = cancelTask;
export const projectTaskState = mapTaskState;
export const toA2ATaskState = mapTaskState;

export const A2A_EXPERIMENTAL_EXTENSION = Object.freeze({
  protocol: "a2a",
  version: "1.0",
  operations: Object.freeze({
    "agent-card.create": createAgentCard,
    "message.send": sendMessage,
    "task.cancel": cancelTask,
    "task.get": getTask,
    "task.state": mapTaskState,
  }),
});

export function registerA2AExtension(registry) {
  return registry.register(A2A_EXPERIMENTAL_EXTENSION);
}
