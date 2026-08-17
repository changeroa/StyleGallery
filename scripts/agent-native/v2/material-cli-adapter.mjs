import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { deepFreeze } from "../canonical-json.mjs";
import { createMaterialOperationRegistry } from "./material-operation-registry.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const operationForCommand = Object.freeze({
  context: "material-context",
  discover: "material-discover",
  get: "material-get",
  search: "material-search",
});
const optionSpecs = Object.freeze({
  "--budget-tokens": { commands: new Set(["context"]), field: "budget_tokens", integer: true },
  "--limit": { commands: new Set(["search"]), field: "limit", integer: true },
  "--limit-bytes": { commands: new Set(["get"]), field: "length", integer: true },
  "--offset": { commands: new Set(["get"]), field: "offset", integer: true },
  "--query": { commands: new Set(["context", "search"]), field: "query" },
  "--reference": { commands: new Set(["get"]), field: "reference" },
});
const requiredOptions = Object.freeze({ context: ["--query"], discover: [], get: ["--reference"], search: ["--query"] });
const inputOrder = Object.freeze({
  context: ["--query", "--budget-tokens"],
  discover: [],
  get: ["--reference", "--offset", "--limit-bytes"],
  search: ["--query", "--limit"],
});

function issue(code, message) { return { code, message }; }
function failed(operation, failure) { return deepFreeze({ failures: [failure], ok: false, operation }); }
function parseInteger(value) {
  if (!/^[0-9]+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseMaterialCliArguments(args) {
  if (!Array.isArray(args)) return failed(null, issue("argument_list_invalid", "CLI arguments must be an array"));
  let command;
  let help = false;
  const values = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (typeof argument !== "string") return failed(command ?? null, issue("argument_unknown", "unsupported CLI argument"));
    if (argument === "--help") {
      if (help) return failed(command ?? null, issue("argument_duplicate", "an option was supplied more than once"));
      help = true;
      continue;
    }
    if (argument.startsWith("--")) {
      const spec = optionSpecs[argument];
      if (!spec) return failed(command ?? null, issue("argument_unknown", "unknown option"));
      if (values.has(argument)) return failed(command ?? null, issue("argument_duplicate", "an option was supplied more than once"));
      const value = args[index + 1];
      if (value === undefined || typeof value !== "string" || value.startsWith("--")) {
        return failed(command ?? null, issue("argument_value_required", "an option value is required"));
      }
      values.set(argument, value);
      index += 1;
      continue;
    }
    if (command !== undefined) return failed(command, issue("argument_unknown", "positional operands are not supported"));
    command = argument;
  }
  if (help) {
    if (command !== undefined || values.size > 0) return failed(command ?? null, issue("argument_inapplicable", "help cannot be combined with commands or options"));
    return deepFreeze({ command: "help", input: {}, ok: true });
  }
  if (command === undefined) return failed(null, issue("argument_value_required", "a command is required"));
  if (!Object.hasOwn(operationForCommand, command)) return failed(command, issue("command_unknown", "unknown command"));
  for (const [option, value] of values) {
    const spec = optionSpecs[option];
    if (!spec.commands.has(command)) return failed(command, issue("argument_inapplicable", "option is not supported by this command"));
    if (spec.integer && parseInteger(value) === null) return failed(command, issue("argument_integer_invalid", "option value must be an unsigned decimal safe integer"));
  }
  if (requiredOptions[command].some((option) => !values.has(option))) {
    return failed(command, issue("argument_value_required", "a required option is missing"));
  }
  const input = {};
  for (const option of inputOrder[command]) {
    if (!values.has(option)) continue;
    const spec = optionSpecs[option];
    input[spec.field] = spec.integer ? parseInteger(values.get(option)) : values.get(option);
  }
  return deepFreeze({ command, input, ok: true });
}

const helpResult = deepFreeze({
  commands: [
    { name: "discover", options: [] },
    { name: "search", options: ["--query", "--limit"] },
    { name: "get", options: ["--reference", "--offset", "--limit-bytes"] },
    { name: "context", options: ["--query", "--budget-tokens"] },
  ],
  options: ["--query", "--reference", "--offset", "--limit-bytes", "--limit", "--budget-tokens", "--help"],
});

function packagedInventoryRunner(root) {
  const manifestPath = path.join(root, "consumer-reference", "agent-native", "v2", "material-registry.json");
  return () => {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const stdout = Buffer.from(manifest.materials.map((record) => `100644 ${record.source_sha256} 0\t${record.repository_path}\0`).join(""), "utf8");
      return { error: undefined, status: 0, stderr: Buffer.alloc(0), stdout };
    } catch {
      return { error: undefined, status: 1, stderr: Buffer.alloc(0), stdout: Buffer.alloc(0) };
    }
  };
}

function runtimeRegistry() {
  const hasGitMetadata = fs.existsSync(path.join(repositoryRoot, ".git"));
  return createMaterialOperationRegistry({
    repositoryRoot,
    ...(hasGitMetadata ? {} : { gitRunner: packagedInventoryRunner(repositoryRoot) }),
  });
}

export function executeMaterialCli(args, registry = runtimeRegistry()) {
  const parsed = parseMaterialCliArguments(args);
  if (!parsed.ok) return parsed;
  if (parsed.command === "help") return deepFreeze({ ok: true, operation: "help", result: helpResult });
  if (!registry || typeof registry.invoke !== "function") return failed(parsed.command, issue("material_registry_invalid", "v2 material registry is unavailable"));
  return registry.invoke(operationForCommand[parsed.command], parsed.input);
}

export function serializeMaterialCliReport(report) { return `${JSON.stringify(report, null, 2)}\n`; }

export function runMaterialCli(args, registry) {
  const report = executeMaterialCli(args, registry);
  return deepFreeze({ exitCode: report.ok ? 0 : 1, output: serializeMaterialCliReport(report), report });
}
