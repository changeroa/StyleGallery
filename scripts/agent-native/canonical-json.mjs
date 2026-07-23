import { createHash } from "node:crypto";

/**
 * Errors from the identity kernel carry a stable machine-readable code.  The
 * callers use these errors at protocol boundaries, so do not rely on the
 * wording of `message` for branching.
 */
export class CanonicalJsonError extends TypeError {
  constructor(code, message, path = "") {
    super(message);
    this.name = "CanonicalJsonError";
    this.code = code;
    if (path) this.path = path;
  }
}

function fail(code, message, path) {
  throw new CanonicalJsonError(code, message, path);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function encode(value, path, stack) {
  if (value === null) return "null";
  switch (typeof value) {
    case "string": return JSON.stringify(value);
    case "boolean": return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) fail("canonical_number_invalid", "numbers must be finite", path);
      return Object.is(value, -0) ? "0" : JSON.stringify(value);
    case "bigint": fail("canonical_type_unsupported", "bigint is not JSON data", path);
    case "undefined": fail("canonical_value_undefined", "undefined is not JSON data", path);
    case "function": fail("canonical_type_unsupported", "functions are not JSON data", path);
    case "symbol": fail("canonical_type_unsupported", "symbols are not JSON data", path);
    default: break;
  }

  if (stack.has(value)) fail("canonical_cycle", "cyclic values cannot be canonicalized", path);
  stack.add(value);
  let result;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) fail("canonical_array_hole", "sparse arrays are not canonical JSON", `${path}/${index}`);
    }
    for (const key of Object.keys(value)) {
      if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length) fail("canonical_array_property", "arrays may contain only indexed JSON values", `${path}/${key}`);
    }
    result = `[${value.map((item, index) => encode(item, `${path}/${index}`, stack)).join(",")}]`;
  } else if (isPlainObject(value)) {
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string")) fail("canonical_symbol_key", "object keys must be strings", path);
    const properties = Object.getOwnPropertyDescriptors(value);
    const parts = keys.sort().map((key) => {
      const descriptor = properties[key];
      if (!descriptor || !Object.hasOwn(descriptor, "value")) fail("canonical_accessor", `accessor property ${key} is not canonical data`, `${path}/${key}`);
      return `${JSON.stringify(key)}:${encode(descriptor.value, `${path}/${key}`, stack)}`;
    });
    result = `{${parts.join(",")}}`;
  } else {
    fail("canonical_type_unsupported", `unsupported value type ${Object.prototype.toString.call(value)}`, path);
  }
  stack.delete(value);
  return result;
}

/** Return recursively key-sorted, whitespace-free UTF-8 JSON text. */
export function canonicalize(value) {
  return encode(value, "", new WeakSet());
}

export const canonicalJson = canonicalize;
export const stringifyCanonical = canonicalize;

/** Return the SHA-256 digest of canonical JSON bytes, with an explicit suite. */
export function hashCanonical(value) {
  const bytes = canonicalize(value);
  return `sha256:${createHash("sha256").update(Buffer.from(bytes, "utf8")).digest("hex")}`;
}

/** Hash already-canonical UTF-8 JSON bytes when a caller has the bytes. */
export function hashCanonicalBytes(bytes) {
  if (typeof bytes !== "string" && !(bytes instanceof Uint8Array)) throw new CanonicalJsonError("canonical_bytes_required", "canonical bytes must be text or Uint8Array");
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export const sha256Canonical = hashCanonical;
export const digestCanonical = hashCanonical;

/** Deep-freeze canonical records before they cross an append-only boundary. */
export function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
  return Object.freeze(value);
}

export function cloneAndFreeze(value) {
  let clone;
  try {
    clone = structuredClone(value);
  } catch (error) {
    throw new CanonicalJsonError("canonical_clone_failed", error instanceof Error ? error.message : String(error));
  }
  return deepFreeze(clone);
}
