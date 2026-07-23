import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const modulePaths = {
  execution: path.join(repositoryRoot, "scripts", "agent-native", "execution.mjs"),
  events: path.join(repositoryRoot, "scripts", "agent-native", "events.mjs"),
  retrieval: path.join(repositoryRoot, "scripts", "agent-native", "retrieval.mjs"),
  learning: path.join(repositoryRoot, "scripts", "agent-native", "learning.mjs"),
};

export const fixedNow = "2026-01-02T03:04:05.000Z";
export const fixedExpiry = "2030-01-01T00:00:00.000Z";

function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]));
}

export function bytes(value) {
  return JSON.stringify(sorted(value));
}

export function pick(value, keys) {
  if (!value || typeof value !== "object") return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(value, key) && value[key] !== undefined) return value[key];
  }
  return undefined;
}

export function hasText(value, keys, expected) {
  const actual = pick(value, keys);
  return typeof actual === "string" && actual === expected;
}

export function hasAnyText(value, keys, expectedValues) {
  const actual = pick(value, keys);
  return expectedValues.includes(actual);
}

export function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function payload(value) {
  if (isObject(value) && value.ok === true && Object.prototype.hasOwnProperty.call(value, "result")) {
    return value.result;
  }
  return value;
}

export async function loadKernelModule(name) {
  try {
    const module = await import(pathToFileURL(modulePaths[name]).href);
    return { ok: true, module };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "kernel_unavailable",
        module: name,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function callExport(loaded, moduleName, exportName, input) {
  if (!loaded?.ok) return { ok: false, error: loaded?.error ?? { code: "kernel_unavailable", module: moduleName } };
  const fn = loaded.module?.[exportName];
  if (typeof fn !== "function") {
    return {
      ok: false,
      error: { code: "kernel_unavailable", module: moduleName, export: exportName, message: "missing export" },
    };
  }
  try {
    return { ok: true, value: await fn(input) };
  } catch (error) {
    return {
      ok: false,
      error: { code: "contract_error", module: moduleName, export: exportName, message: error instanceof Error ? error.message : String(error) },
    };
  }
}

export function result(name, expected, actual, ok, details = undefined) {
  const record = { actual, expected, name, ok };
  if (details !== undefined) record.details = details;
  return record;
}

export function failFromCall(name, expected, call) {
  return result(name, expected, call.error, false);
}

export function idOf(value, fallback = undefined) {
  return pick(value, ["versionId", "version_id", "stableRef", "stable_ref", "taskId", "task_id", "runId", "run_id", "effectId", "effect_id", "id"]) ?? fallback;
}

export function stateOf(value) {
  return pick(value, ["state", "status", "effectState", "effect_state", "disposition"]);
}

export function operationInput() {
  return {
    adapters: ["cli", "mcp"],
    effect: "NONE",
    effectClass: "NONE",
    idempotent: true,
    inputSchema: {
      additionalProperties: false,
      properties: { stableRef: { type: "string" } },
      required: ["stableRef"],
      type: "object",
    },
    name: "resolve",
    operation: "resolve",
    outputSchema: { type: "object" },
    requiredCapability: "wiki.read",
    stableRef: "sg:operation/resolve",
    version: "v1",
  };
}

export function grantInput() {
  return {
    capability: "wiki.read",
    expiresAt: fixedExpiry,
    limits: { calls: 3, maxCalls: 3 },
    operation: "resolve",
    operations: ["resolve", "sg:operation/resolve"],
    resourceScope: ["sg:profile/*", "sg:claim/*"],
    resources: ["sg:profile/*", "sg:claim/*"],
    stableRef: "sg:capability/wiki-read",
    subject: "agent:test",
  };
}
