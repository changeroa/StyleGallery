import { deepFreeze } from "./canonical-json.mjs";
import { agentNativeRegistry } from "./registry.mjs";

const COMMANDS = new Set(["claims", "context", "discover", "ops", "resolve"]);
const TARGET_COMMANDS = new Set(["claims", "context", "resolve"]);

function issue(code, message, recordPath = "") {
  return recordPath ? { code, message, path: recordPath } : { code, message };
}

function failed(operation, failure) {
  return deepFreeze({ failures: [failure], ok: false, operation });
}

export function parseCliArguments(args) {
  if (!Array.isArray(args)) return failed(null, issue("argument_list_invalid", "CLI arguments must be an array"));
  let command;
  let format = "json";
  const operands = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--format") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        return failed(command ?? null, issue("argument_value_required", "--format requires a value", "--format"));
      }
      if (value !== "json") return failed(command ?? null, issue("format_unsupported", `unsupported format ${value}`, "--format"));
      format = value;
      index += 1;
      continue;
    }
    if (typeof argument !== "string" || argument.startsWith("--")) {
      return failed(command ?? null, issue("argument_unknown", `unknown argument ${String(argument)}`, String(argument)));
    }
    if (command === undefined) command = argument;
    else operands.push(argument);
  }
  if (command === undefined) return failed(null, issue("argument_value_required", "a command is required", "command"));
  if (!COMMANDS.has(command)) return failed(command, issue("command_unknown", `unknown command ${command}`, "command"));
  const required = TARGET_COMMANDS.has(command);
  if (required && operands.length === 0) {
    return failed(command, issue("argument_value_required", `${command} requires a StableRef or VersionID`, "reference"));
  }
  if ((!required && operands.length > 0) || operands.length > 1) {
    return failed(command, issue("argument_unknown", `unexpected positional argument ${operands[required ? 1 : 0]}`, "argument"));
  }
  return deepFreeze({ command, format, input: required ? { reference: operands[0] } : {}, ok: true });
}

export function executeCli(args, registry = agentNativeRegistry) {
  const parsed = parseCliArguments(args);
  if (!parsed.ok) return parsed;
  if (!registry || typeof registry.invoke !== "function") {
    return failed(parsed.command, issue("registry_invalid", "CLI registry must expose invoke"));
  }
  return registry.invoke(parsed.command, parsed.input);
}

export function serializeCliReport(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function runCli(args, registry = agentNativeRegistry) {
  const report = executeCli(args, registry);
  return deepFreeze({ exitCode: report.ok ? 0 : 1, output: serializeCliReport(report), report });
}

export const invokeCli = executeCli;
