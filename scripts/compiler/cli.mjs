import { runCli } from "../agent-native/cli-adapter.mjs";
import { compilerOperations, compilerToolDefinitions } from "./operations.mjs";
import { compilerDiscovery, executeCompiler, failure } from "./runtime.mjs";

export function withCompilerDiscovery(report, config = {}) {
  if (!report.ok || !["discover", "ops"].includes(report.operation)) return report;
  return { ...report, compiler: compilerDiscovery(config) };
}

// The Registrar and the Conservator check this gallery's own claim register and Layout patterns.
// They load lazily so knowledge and compiler commands never import a browser.
async function runQualityCommand(command, args) {
  try {
    if (command === "registrar") {
      const { parseRegistrarArgs, registrarView, runRegistrar } = await import("../registrar.mjs");
      const options = parseRegistrarArgs(args.filter((arg) => arg !== "--format" && arg !== "json"));
      return { operation: command, ...registrarView(runRegistrar(options.root ? { root: options.root } : {}), options) };
    }
    const { parseConservatorArgs, runConservator } = await import("../conservator.mjs");
    return { operation: command, ...await runConservator(parseConservatorArgs(args.filter((arg) => arg !== "--format" && arg !== "json"))) };
  } catch (error) {
    return failure(command, error.code ?? `${command}_failed`, error.message);
  }
}

export async function runSgCli(argv, config = {}) {
  const args = [...argv];
  if (args[0] === "registrar" || args[0] === "conservator") {
    const report = await runQualityCommand(args[0], args.slice(1));
    return { report, exitCode: report.ok ? 0 : 1, output: `${JSON.stringify(report, null, 2)}\n` };
  }
  const options = { ...config };
  let report;
  const rootIndex = args.indexOf("--compiler-root");
  if (rootIndex >= 0) {
    const root = args[rootIndex + 1];
    if (!root || root.startsWith("--") || args.lastIndexOf("--compiler-root") !== rootIndex) {
      report = failure(null, "argument_invalid", "--compiler-root requires one checkout path.");
    } else { options.compilerRoot = root; args.splice(rootIndex, 2); }
  }
  const command = args[0];
  if (!report && !Object.hasOwn(compilerOperations, command) && command !== "workflow") {
    report = withCompilerDiscovery(runCli(args).report, options);
  } else if (!report) {
    const definition = compilerToolDefinitions().find(({ name }) => name === command);
    const properties = definition.inputSchema.properties;
    const input = {};
    const seen = new Set();
    for (let i = 1; i < args.length; i += 1) {
      const flag = args[i];
      const key = flag.startsWith("--") ? flag.slice(2).replaceAll("-", "_") : "";
      if ((!Object.hasOwn(properties, key) && key !== "format") || seen.has(key)) {
        report = failure(command, "argument_invalid", `Unknown or repeated argument: ${flag}`);
        break;
      }
      seen.add(key);
      const type = key === "format" ? "string" : properties[key].type;
      if (type === "boolean") { input[key] = true; continue; }
      const value = args[++i];
      if (value === undefined || value.startsWith("--")) {
        report = failure(command, "argument_value_required", `${flag} requires a value.`);
        break;
      }
      if (key === "format") {
        if (value !== "json") { report = failure(command, "format_unsupported", "Only --format json is supported."); break; }
      } else input[key] = ["number", "integer"].includes(type) ? Number(value) : value;
    }
    report ??= await executeCompiler(command, input, options);
  }
  return { report, exitCode: report.ok ? 0 : 1, output: `${JSON.stringify(report, null, 2)}\n` };
}
