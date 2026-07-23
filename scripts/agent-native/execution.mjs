import { deepFreeze, hashCanonical } from "./canonical-json.mjs";
import { createVersionId } from "./identity.mjs";

const CONTROL = new Set(["schema_version", "record_kind", "version_id", "versionId"]);
const EFFECTS = new Set(["NONE", "LOCAL", "EXTERNAL"]);

function sourceObject(input, name) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError(`${name} expects an object parameter`);
  return input;
}

function value(input, ...keys) {
  if (input === null || input === undefined) return undefined;
  for (const key of keys) if (Object.hasOwn(input, key) && input[key] !== undefined) return input[key];
  return undefined;
}

function copy(input) {
  return input === undefined ? undefined : structuredClone(input);
}

function refOf(input, prefixes, name) {
  const ref = value(input, "stable_ref", "stableRef", "id", ...prefixes);
  if (typeof ref !== "string" || ref.length === 0) throw new TypeError(`${name} stable reference is required`);
  return ref.includes("@sha256:") ? ref.slice(0, ref.indexOf("@sha256:")) : ref;
}

function versionId(stableRef, payload) {
  return createVersionId({ stableRef, payload });
}

function record(stableRef, recordKind, payload) {
  const body = { schema_version: "1.0", record_kind: recordKind, stable_ref: stableRef, ...payload };
  return deepFreeze({ ...body, version_id: versionId(stableRef, body) });
}

function normalizedFields(input, omit = []) {
  const ignored = new Set([...CONTROL, "stable_ref", "stableRef", "id", ...omit]);
  return Object.fromEntries(Object.entries(input).filter(([key, item]) => !ignored.has(key) && item !== undefined).map(([key, item]) => [key, copy(item)]));
}

function upper(input, fallback) {
  return typeof input === "string" ? input.toUpperCase() : fallback;
}

function operationNames(operation) {
  if (!operation || typeof operation !== "object") return [];
  return [value(operation, "operation", "name"), value(operation, "stable_ref", "stableRef")].filter((item) => typeof item === "string");
}

function wildcardMatch(pattern, candidate) {
  if (typeof pattern !== "string" || typeof candidate !== "string") return false;
  if (pattern === "*") return true;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
  return new RegExp(`^${escaped}$`).test(candidate);
}

/** Define a deterministic, immutable operation specification. */
export function defineOperation(input) {
  const source = sourceObject(input, "defineOperation");
  const stableRef = refOf(source, ["operation"], "defineOperation");
  const effectClass = upper(value(source, "effect_class", "effectClass", "effect"), "NONE");
  if (!EFFECTS.has(effectClass)) throw new TypeError("defineOperation.effect_class must be NONE, LOCAL, or EXTERNAL");
  const operationName = value(source, "operation", "name") ?? stableRef.slice(stableRef.lastIndexOf("/") + 1);
  const payload = {
    ...normalizedFields(source, ["operation", "name", "effect", "effectClass", "effect_class", "idempotent", "isIdempotent", "requiredCapability", "capability", "inputSchema", "outputSchema"]),
    adapters: [...new Set((value(source, "adapters", "adapter_exposure", "adapterExposure") ?? []).filter((item) => typeof item === "string"))].sort(),
    effect_class: effectClass,
    idempotent: value(source, "idempotent", "isIdempotent") !== false,
    input_schema: copy(value(source, "input_schema", "inputSchema") ?? { type: "object" }),
    name: operationName,
    operation: operationName,
    output_schema: copy(value(source, "output_schema", "outputSchema") ?? { type: "object" }),
    required_capability: value(source, "required_capability", "requiredCapability", "capability") ?? null,
  };
  return record(stableRef, "operation", payload);
}

function grantFor(input) {
  return value(input, "grant", "capability");
}

function connectorReceiptId(input) {
  const receipt = value(input, "connector_receipt", "connectorReceipt", "receiptId", "receipt_id");
  return typeof receipt === "string" && receipt.trim().length > 0 ? receipt : null;
}

/** Evaluate capability, subject, resource, expiry, and call-limit policy. */
export function authorizeOperation(input) {
  const source = sourceObject(input, "authorizeOperation");
  const operation = value(source, "operation", "operationSpec");
  const grant = grantFor(source);
  const subject = value(source, "subject", "principal");
  const resource = value(source, "resource", "resourceRef", "stable_ref", "stableRef");
  const now = value(source, "now", "evaluated_at", "evaluatedAt") ?? "1970-01-01T00:00:00.000Z";
  const names = operationNames(operation);
  const required = value(operation ?? {}, "required_capability", "requiredCapability", "capability");
  const grantedCapability = value(grant ?? {}, "capability", "name");
  const operationGrant = value(grant ?? {}, "operations", "operation");
  const operations = Array.isArray(operationGrant) ? operationGrant : operationGrant ? [operationGrant] : [];
  const scopeGrant = value(grant ?? {}, "resource_scope", "resourceScope", "resources");
  const scopes = Array.isArray(scopeGrant) ? scopeGrant : scopeGrant ? [scopeGrant] : [];
  const expiresAt = value(grant ?? {}, "expires_at", "expiresAt", "expiry");
  const used = Number(value(grant ?? {}, "used", "used_calls", "usedCalls", "calls_used", "callsUsed") ?? 0);
  const limits = value(grant ?? {}, "limits") ?? {};
  const maxCalls = Number(value(grant ?? {}, "max_calls", "maxCalls") ?? value(limits, "maxCalls", "calls") ?? Number.POSITIVE_INFINITY);
  const failures = [];
  if (!grant || typeof grant !== "object") failures.push("capability_missing");
  if (typeof subject !== "string" || subject !== value(grant ?? {}, "subject", "principal")) failures.push("subject_denied");
  if (required && grantedCapability !== required) failures.push("capability_denied");
  if (operations.length === 0 || !names.some((name) => operations.includes(name))) failures.push("operation_denied");
  if (scopes.length > 0 && !scopes.some((scope) => wildcardMatch(scope, resource))) failures.push("resource_denied");
  if (expiresAt && String(now) >= String(expiresAt)) failures.push("grant_expired");
  if (Number.isFinite(maxCalls) && used >= maxCalls) failures.push("grant_limit_exceeded");
  const allowed = failures.length === 0;
  const decision = {
    allowed,
    capability: grantedCapability ?? null,
    evaluated_at: String(now),
    operation: names[0] ?? null,
    reason: allowed ? "allowed" : failures[0],
    resource: resource ?? null,
    subject: subject ?? null,
  };
  return deepFreeze({ allowed, decision, policy_decision: decision, failures });
}

/** Re-check policy immediately before a potentially effectful attempt. */
export function authorizeEffect(input) {
  const source = sourceObject(input, "authorizeEffect");
  return authorizeOperation({ ...source, operation: value(source, "operation", "operationSpec") });
}

export function createTask(input) {
  const source = sourceObject(input, "createTask");
  const stableRef = refOf(source, ["taskId", "task_id"], "createTask");
  return record(stableRef, "task", {
    ...normalizedFields(source, ["taskId", "task_id", "intent", "request", "requiredResult", "required_result", "result", "state", "status"]),
    intent: copy(value(source, "intent", "request") ?? {}),
    required_result: copy(value(source, "required_result", "requiredResult", "result") ?? {}),
    state: upper(value(source, "state", "status"), "SUBMITTED"),
    task_id: stableRef,
  });
}

export function startRun(input) {
  const source = sourceObject(input, "startRun");
  const task = value(source, "task");
  const taskId = value(task ?? {}, "task_id", "taskId", "stable_ref", "stableRef") ?? value(source, "task_id", "taskId");
  if (typeof taskId !== "string" || taskId.length === 0) throw new TypeError("startRun.task_id is required");
  const stableRef = refOf(source, ["runId", "run_id"], "startRun");
  return record(stableRef, "run", {
    ...normalizedFields(source, ["runId", "run_id", "task", "taskId", "task_id", "state", "status"]),
    input: copy(value(source, "input", "arguments") ?? {}),
    run_id: stableRef,
    state: upper(value(source, "state", "status"), "RUNNING"),
    task_id: taskId,
  });
}

export function recordEffectAttempt(input) {
  const source = sourceObject(input, "recordEffectAttempt");
  const stableRef = refOf(source, ["effectId", "effect_id", "effect"], "recordEffectAttempt");
  const effectClass = upper(value(source, "effect_class", "effectClass", "class"), "EXTERNAL");
  const connectorReceipt = connectorReceiptId(source);
  const suppliedState = upper(value(source, "state", "status", "effect_state", "effectState"), undefined);
  const state = effectClass === "EXTERNAL"
    ? (connectorReceipt ? "COMMITTED" : "UNCERTAIN")
    : (suppliedState ?? "PLANNED");
  return record(stableRef, "effect", {
    ...normalizedFields(source, ["effectId", "effect_id", "effect", "effect_class", "effectClass", "class", "connector_receipt", "connectorReceipt", "receiptId", "receipt_id", "state", "status", "effect_state", "effectState"]),
    attempt: value(source, "attempt") ?? null,
    connector_receipt: connectorReceipt,
    effect_class: effectClass,
    effect_id: stableRef,
    idempotency_key: value(source, "idempotency_key", "idempotencyKey") ?? null,
    run_id: value(source, "run_id", "runId") ?? value(value(source, "run"), "run_id", "runId") ?? null,
    state,
    task_id: value(source, "task_id", "taskId") ?? value(value(source, "task"), "task_id", "taskId") ?? null,
  });
}

export function reconcileEffect(input) {
  const source = sourceObject(input, "reconcileEffect");
  const effect = source.effect && typeof source.effect === "object" ? source.effect : source;
  const observations = [...(Array.isArray(value(source, "observations")) ? value(source, "observations") : []), ...(value(source, "observation") ? [value(source, "observation")] : [])];
  const statuses = observations.map((item) => upper(value(item ?? {}, "status", "state", "effect_state", "effectState"), "UNKNOWN"));
  const positiveStatuses = new Set(["COMMITTED", "SUCCEEDED", "SUCCESS"]);
  const positive = statuses.some((status) => positiveStatuses.has(status));
  const negative = statuses.includes("ABSENT") || statuses.includes("FAILED") || statuses.includes("NOT_FOUND");
  const strategy = upper(value(source, "strategy"), "RECONCILE");
  let state = upper(value(effect, "state", "status", "effect_state", "effectState"), "UNCERTAIN");
  const receiptObservation = observations.find((item) => positiveStatuses.has(upper(value(item ?? {}, "status", "state", "effect_state", "effectState"), "UNKNOWN")) && connectorReceiptId(item));
  const connectorReceipt = connectorReceiptId(receiptObservation) ?? connectorReceiptId(effect);
  if (positive && negative) state = "UNCERTAIN";
  else if (positive) state = connectorReceipt ? "COMMITTED" : "UNCERTAIN";
  else if (negative && strategy === "COMPENSATE") state = "COMPENSATED";
  else if (negative) state = "FAILED";
  else if (state === "COMMITTED" && !connectorReceipt) state = "UNCERTAIN";
  const stableRef = refOf(effect, ["effect_id", "effectId", "effect"], "reconcileEffect");
  return record(stableRef, "effect", { ...normalizedFields(effect, ["version_id", "versionId", "state", "status", "effect_state", "effectState", "connector_receipt", "connectorReceipt"]), connector_receipt: connectorReceipt, state });
}

export function createReceipt(input) {
  const source = sourceObject(input, "createReceipt");
  const operation = value(source, "operation", "operationSpec");
  const task = value(source, "task");
  const run = value(source, "run");
  const effects = value(source, "effects") ?? (value(source, "effect") ? [value(source, "effect")] : []);
  const inputValue = value(source, "input", "normalized_input", "normalizedInput") ?? null;
  const outputValue = value(source, "output", "normalized_output", "normalizedOutput") ?? null;
  const taskId = value(source, "task_id", "taskId") ?? value(task ?? {}, "task_id", "taskId", "stable_ref", "stableRef") ?? null;
  const runId = value(source, "run_id", "runId") ?? value(run ?? {}, "run_id", "runId", "stable_ref", "stableRef") ?? null;
  const effectIds = effects.map((effect) => value(effect ?? {}, "effect_id", "effectId", "stable_ref", "stableRef", "id")).filter((id) => typeof id === "string");
  const base = { input_digest: hashCanonical(inputValue), operation: value(operation ?? {}, "operation", "name", "stable_ref", "stableRef") ?? null, output_digest: hashCanonical(outputValue), run_id: runId, task_id: taskId, effect_ids: [...new Set(effectIds)].sort() };
  const stableRef = value(source, "receipt_id", "receiptId", "stable_ref", "stableRef") ?? `sg:receipt/${hashCanonical(base).slice(7, 23)}`;
  return record(stableRef, "invocation_receipt", {
    ...base,
    causal_parents: [...new Set((value(source, "causal_parents", "causalParents", "parents") ?? []).filter((item) => typeof item === "string"))].sort(),
    effects: copy(effects),
    policy_decision: copy(value(source, "policy_decision", "policyDecision") ?? null),
  });
}

export const defineOperationSpec = defineOperation;
export const authorizeCapability = authorizeOperation;
export const createInvocationReceipt = createReceipt;
