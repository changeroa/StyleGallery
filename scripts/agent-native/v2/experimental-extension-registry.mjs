import { types as utilTypes } from "node:util";

import { A2A_EXPERIMENTAL_EXTENSION } from "./extensions/a2a-projection.mjs";
import { AG_UI_EXPERIMENTAL_EXTENSION } from "./extensions/agui-projection.mjs";

const SUPPORTED = Object.freeze({ a2a: "1.0", "ag-ui": "0.0.57" });
const CANONICAL = new Map([
  ["a2a\u00001.0", A2A_EXPERIMENTAL_EXTENSION],
  ["ag-ui\u00000.0.57", AG_UI_EXPERIMENTAL_EXTENSION],
]);
const SENSITIVE_FIELDS = new Set(["body", "prose", "repository_path", "repository_root", "source", "source_body", "source_path"]);
const SENSITIVE_INPUT_FIELDS = new Set([...SENSITIVE_FIELDS, "path"]);
const DESCRIPTOR_KEYS = new Set(["operations", "protocol", "version"]);
const REQUEST_KEYS = new Set(["input", "operation", "protocol", "version"]);

export class ExperimentalExtensionError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = "ExperimentalExtensionError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new ExperimentalExtensionError(code, message);
}
function unsafe() {
  fail("experimental_extension_input_unsafe", "experimental extension input must contain only own plain data");
}
function descriptorsOf(value, allowedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value) || utilTypes.isProxy(value)) unsafe();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) unsafe();
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string" || (allowedKeys && !allowedKeys.has(key)))) unsafe();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (keys.some((key) => !Object.hasOwn(descriptors[key], "value") || descriptors[key].enumerable !== true)) unsafe();
  return descriptors;
}
function snapshotJson(value, seen = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) unsafe();
    return value;
  }
  if (!value || typeof value !== "object" || utilTypes.isProxy(value) || seen.has(value)) unsafe();
  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== (array ? Array.prototype : Object.prototype) && prototype !== null) unsafe();
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string" || key === "__proto__" || key === "prototype" || key === "constructor")) unsafe();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (keys.some((key) => !Object.hasOwn(descriptors[key], "value") || (descriptors[key].enumerable !== true && !(array && key === "length")))) unsafe();
  if (array && keys.some((key) => key !== "length" && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length))) unsafe();
  seen.add(value);
  const copy = array ? [] : {};
  for (const key of keys) {
    if (array && key === "length") continue;
    copy[key] = snapshotJson(descriptors[key].value, seen);
  }
  seen.delete(value);
  return copy;
}
function extensionKey(protocol, version) {
  return `${protocol}\u0000${version}`;
}
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
function assertNoSensitiveFields(value, forbidden = SENSITIVE_FIELDS) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key.toLowerCase())) {
      fail("experimental_extension_sensitive_field_forbidden", "sensitive path or body fields cannot cross the experimental extension boundary");
    }
    assertNoSensitiveFields(child, forbidden);
  }
}
function validateProtocol(protocol, version) {
  if (typeof protocol !== "string" || !Object.hasOwn(SUPPORTED, protocol)) {
    fail("experimental_extension_protocol_unknown", "experimental extension protocol is not supported");
  }
  if (typeof version !== "string" || SUPPORTED[protocol] !== version) {
    fail("experimental_extension_version_unknown", "experimental extension version is not supported");
  }
}
function snapshotDescriptor(descriptor) {
  const fields = descriptorsOf(descriptor, DESCRIPTOR_KEYS);
  if (!fields.protocol || !fields.version || !fields.operations) {
    fail("experimental_extension_registration_invalid", "protocol, version, and operations are required");
  }
  const protocol = fields.protocol.value;
  const version = fields.version.value;
  validateProtocol(protocol, version);
  const operationFields = descriptorsOf(fields.operations.value);
  const names = Object.keys(operationFields).sort();
  if (names.length === 0 || names.some((name) => name.length === 0 || typeof operationFields[name].value !== "function")) {
    fail("experimental_extension_registration_invalid", "operations must be a non-empty own function map");
  }
  const canonical = CANONICAL.get(extensionKey(protocol, version));
  const canonicalNames = Object.keys(canonical.operations).sort();
  if (JSON.stringify(names) !== JSON.stringify(canonicalNames)) {
    fail("experimental_extension_catalog_invalid", "experimental extension operation catalog does not match the governed catalog");
  }
  if (names.some((name) => operationFields[name].value !== canonical.operations[name])) {
    fail("experimental_extension_implementation_invalid", "experimental extension implementation does not match the governed projection");
  }
  return { names, operations: new Map(names.map((name) => [name, operationFields[name].value])), protocol, version };
}

/** Create an empty registry. Protocol extensions are never imported or registered by v1 core. */
export function createExperimentalExtensionRegistry() {
  const extensions = new Map();
  const register = (descriptor) => {
    const snapshot = snapshotDescriptor(descriptor);
    const key = extensionKey(snapshot.protocol, snapshot.version);
    if (extensions.has(key)) fail("experimental_extension_duplicate", "experimental extension is already registered");
    extensions.set(key, snapshot);
    return Object.freeze({ operations: Object.freeze([...snapshot.names]), protocol: snapshot.protocol, version: snapshot.version });
  };
  const list = () => Object.freeze([...extensions.values()]
    .map(({ names, protocol, version }) => Object.freeze({ operations: Object.freeze([...names]), protocol, version }))
    .sort((left, right) => left.protocol.localeCompare(right.protocol) || left.version.localeCompare(right.version)));
  const project = (request) => {
    const fields = descriptorsOf(request, REQUEST_KEYS);
    const snapshot = snapshotJson(Object.fromEntries(Object.entries(fields).map(([key, descriptor]) => [key, descriptor.value])));
    validateProtocol(snapshot.protocol, snapshot.version);
    assertNoSensitiveFields(snapshot.input, SENSITIVE_INPUT_FIELDS);
    const extension = extensions.get(extensionKey(snapshot.protocol, snapshot.version));
    if (!extension) fail("experimental_extension_protocol_unknown", "experimental extension is not registered");
    if (typeof snapshot.operation !== "string" || !extension.operations.has(snapshot.operation)) {
      fail("experimental_extension_operation_unknown", "experimental extension operation is not registered");
    }
    const result = snapshotJson(extension.operations.get(snapshot.operation)(snapshot.input));
    assertNoSensitiveFields(result);
    return deepFreeze(result);
  };
  return Object.freeze({ list, project, register });
}

export const experimentalExtensionVersions = SUPPORTED;
