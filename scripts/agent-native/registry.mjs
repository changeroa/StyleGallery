import { deepFreeze } from "./canonical-json.mjs";
import {
  createTask,
  reconcileEffect,
  recordEffectAttempt,
  startRun,
} from "./execution.mjs";
import { agentNativeFixture } from "./fixture.mjs";
import {
  createProposal,
  decideProposal,
  promoteProposal,
  verifyProposal,
} from "./learning.mjs";
import {
  queryClaims,
  queryContext,
  queryDiscover,
  queryOperations,
  queryRetrieve,
  resolveRecord,
} from "./queries.mjs";
import { createSelfDescription } from "./self-description.mjs";

export class RegistryError extends TypeError {
  constructor(code, message, recordPath = "") {
    super(message);
    this.name = "RegistryError";
    this.code = code;
    if (recordPath) this.path = recordPath;
  }
}

function failure(code, message, recordPath = "") {
  return recordPath ? { code, message, path: recordPath } : { code, message };
}

function compareFailures(left, right) {
  const leftKey = `${left.code}\u0000${left.path ?? ""}\u0000${left.message}`;
  const rightKey = `${right.code}\u0000${right.path ?? ""}\u0000${right.message}`;
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function failed(operation, failures) {
  return deepFreeze({ failures: [...failures].sort(compareFailures), ok: false, operation });
}

function succeeded(operation, result) {
  return deepFreeze({ ok: true, operation, result });
}

function validateValue(schema, value, recordPath) {
  if (schema.type === "string" && typeof value !== "string") return failure("operation_input_invalid", `${recordPath} must be a string`, recordPath);
  if (schema.type === "integer" && !Number.isInteger(value)) return failure("operation_input_invalid", `${recordPath} must be an integer`, recordPath);
  if (typeof schema.minimum === "number" && value < schema.minimum) return failure("operation_input_invalid", `${recordPath} must be at least ${schema.minimum}`, recordPath);
  return undefined;
}

function validateInput(spec, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return [failure("operation_input_invalid", "operation input must be an object")];
  }
  const schema = spec.input_schema ?? { type: "object" };
  const properties = schema.properties ?? {};
  const failures = [];
  for (const key of schema.required ?? []) {
    if (!Object.hasOwn(input, key)) failures.push(failure("operation_input_required", `${key} is required`, key));
  }
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(input)) if (!Object.hasOwn(properties, key)) {
      failures.push(failure("operation_input_unknown", `${key} is not accepted by ${spec.name}`, key));
    }
  }
  for (const [key, value] of Object.entries(input)) {
    if (!Object.hasOwn(properties, key)) continue;
    const issue = validateValue(properties[key], value, key);
    if (issue) failures.push(issue);
  }
  return failures;
}

function handlers(fixture, operations, selfDescription) {
  return new Map([
    ["claims", (input) => queryClaims(fixture, input)],
    ["context", (input) => queryContext(fixture, input)],
    ["discover", () => queryDiscover(selfDescription)],
    ["effect.record", (input) => recordEffectAttempt(input)],
    ["effect.reconcile", (input) => reconcileEffect(input)],
    ["ops", () => queryOperations(operations)],
    ["proposal.create", (input) => createProposal(input)],
    ["proposal.decide", (input) => decideProposal(input)],
    ["proposal.promote", (input) => promoteProposal(input)],
    ["proposal.verify", (input) => verifyProposal(input)],
    ["resolve", (input) => resolveRecord(fixture, input)],
    ["retrieve", (input) => queryRetrieve(fixture, input)],
    ["run.start", (input) => startRun(input)],
    ["task.create", (input) => createTask(input)],
  ]);
}

function assertOperationMetadata(operations, operationHandlers) {
  for (const operation of operations) {
    if (typeof operation.read_only !== "boolean") {
      throw new RegistryError("operation_read_only_required", `${operation.name} must declare read_only`);
    }
    if (operation.read_only && operation.effect_class !== "NONE") {
      throw new RegistryError("operation_read_only_effect_invalid", `${operation.name} cannot be read-only with ${operation.effect_class} effects`);
    }
    if (!operationHandlers.has(operation.name)) {
      throw new RegistryError("operation_handler_missing", `${operation.name} has no common-registry handler`);
    }
  }
}

export function createOperationRegistry({ fixture = agentNativeFixture } = {}) {
  const operations = fixture.records
    .filter((record) => record.record_kind === "operation")
    .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  if (new Set(operations.map((operation) => operation.name)).size !== operations.length) {
    throw new RegistryError("operation_name_duplicate", "operation names must be unique");
  }
  const selfDescription = createSelfDescription({ fixture, operations });
  const operationByName = new Map(operations.map((operation) => [operation.name, operation]));
  const operationHandlers = handlers(fixture, operations, selfDescription);
  assertOperationMetadata(operations, operationHandlers);
  const invoke = (operation, input = {}) => {
    if (typeof operation !== "string" || operation.length === 0) {
      return failed(null, [failure("operation_required", "operation name is required")]);
    }
    const spec = operationByName.get(operation);
    if (!spec || !operationHandlers.has(operation)) {
      return failed(operation, [failure("operation_unknown", `unknown operation ${operation}`, "operation")]);
    }
    const inputFailures = validateInput(spec, input);
    if (inputFailures.length > 0) return failed(operation, inputFailures);
    try { return succeeded(operation, operationHandlers.get(operation)(input)); } catch (error) {
      return failed(operation, [failure(error?.code ?? "operation_failed", error instanceof Error ? error.message : String(error), error?.path)]);
    }
  };
  return Object.freeze({ fixture, invoke, operations: deepFreeze([...operations]), selfDescription });
}

export const agentNativeRegistry = createOperationRegistry();
export const readOnlyOperationNames = deepFreeze(agentNativeRegistry.operations
  .filter((operation) => operation.read_only)
  .map((operation) => operation.name));

export function invokeOperation(operation, input = {}, registry = agentNativeRegistry) {
  if (!registry || typeof registry.invoke !== "function") throw new RegistryError("registry_invalid", "registry must expose invoke");
  return registry.invoke(operation, input);
}

export const invokeRegistryOperation = invokeOperation;
export const operationRegistry = agentNativeRegistry;
