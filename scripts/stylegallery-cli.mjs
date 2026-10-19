// The single `stylegallery` command. search/read use search v3; context with
// --query uses material v2; retrieve uses the v1 registry; every other command
// (discover, resolve, claims, context <ref>, ops, registrar, conservator,
// compiler stages) goes to the existing governed CLI unchanged.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function packageVersion() {
  return JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")).version;
}

export const HELP_TEXT = `stylegallery - search and read the StyleGallery knowledge corpus, plus governed records and site compilation.

Usage: stylegallery <command> [options]

Find and read documents (offline, deterministic):
  search <query...>             Rank documents; prints JSON (schema 3.0).
      --query-en <text>         English rewrite of a non-English query. Agents: always pass one for Korean queries.
      --limit <n>               Results to return, 1-50 (default 5).
      --paths-only              Print repository-relative paths only.
      --detailed                Add scores, hash identities, and ranking terms.
  read <id|path>                Read one document by id (sg:layout/sticky-header), path, or StableRef.
      --outline                 List headings with section slugs instead of the content.
      --section <slug>          Read one section only.
  context --query <text>        Build a bounded, provenance-linked material context package.
      --budget-tokens <n>       Token budget, 256-32768 (default 8192).

Governed records:
  discover                      List interfaces, domains, and operations.
  resolve <ref>                 Read one governed record.
  claims <ref>                  List claims and evidence for a record.
  context <ref>                 Build a governed record context package.
  retrieve <query>              Search governed records (v1 registry).
  ops                           List operations.
  registrar | conservator       Check claim records | measure Layout patterns in Chromium.

Connect your agents:
  setup                         Install the search skill and register stylegallery-mcp for Claude Code and Codex.
      --agent <claude|codex|all> Agents to configure (default: the ones detected on this machine).
      --only <skill|mcp>        Configure only the skill or only the MCP server.
      --dry-run                 Print the planned changes without writing anything.
      --uninstall               Remove what setup installed.
      --force                   Replace or remove a different existing entry with the same name.

Site compilation: compile, timeline, transcribe, sale, gate, build, shots, probe, workflow (see stylegallery workflow).

  help, --help                  Show this help.
  version, --version            Show the package version.

Typical agent loop: stylegallery search "sticky header" -> stylegallery read <id> --outline -> stylegallery read <id> --section <slug>.
MCP server: stylegallery-mcp (tools: search, read, plus governed and compiler tools).
`;

function report(value) {
  return { report: value, exitCode: value.ok ? 0 : 1, output: `${JSON.stringify(value, null, 2)}\n` };
}
function failure(operation, code, message) { return report({ ok: false, operation, failures: [{ code, message }] }); }

function parseOptions(command, args, specs) {
  const values = {};
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) { positional.push(argument); continue; }
    const spec = specs[argument];
    if (!spec) return { error: failure(command, "argument_unknown", `unknown option ${argument}; run stylegallery help`) };
    if (Object.hasOwn(values, spec.field)) return { error: failure(command, "argument_duplicate", `${argument} was supplied more than once`) };
    if (spec.flag) { values[spec.field] = true; continue; }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) return { error: failure(command, "argument_value_required", `${argument} requires a value`) };
    if (spec.integer) {
      if (!/^[0-9]+$/.test(value)) return { error: failure(command, "argument_integer_invalid", `${argument} must be an unsigned integer`) };
      values[spec.field] = Number(value);
    } else values[spec.field] = value;
    index += 1;
  }
  return { values, positional };
}

async function runSearch(args) {
  const parsed = parseOptions("search", args, {
    "--query": { field: "query" }, "--query-en": { field: "query_en" }, "--limit": { field: "limit", integer: true },
    "--paths-only": { field: "paths_only", flag: true }, "--detailed": { field: "detailed", flag: true },
  });
  if (parsed.error) return parsed.error;
  const { values, positional } = parsed;
  if (values.query !== undefined && positional.length > 0) return failure("search", "argument_inapplicable", "give the query as words or --query, not both");
  const query = values.query ?? positional.join(" ");
  if (!query) return failure("search", "argument_value_required", "a query is required: stylegallery search \"sticky header\"");
  const { detailed, ...rest } = values;
  const input = { ...rest, query, ...(detailed ? { response_format: "detailed" } : {}) };
  const { invokeSearchOperation } = await import("./agent-native/v2/material-search-v3.mjs");
  const { materialRuntimeOptions } = await import("./agent-native/v2/material-cli-adapter.mjs");
  return report(invokeSearchOperation("search", input, materialRuntimeOptions()));
}

async function runRead(args) {
  const parsed = parseOptions("read", args, { "--section": { field: "section" }, "--outline": { field: "outline", flag: true } });
  if (parsed.error) return parsed.error;
  if (parsed.positional.length !== 1) return failure("read", "argument_value_required", "give exactly one id, path, or StableRef: stylegallery read sg:layout/sticky-header");
  const { invokeSearchOperation } = await import("./agent-native/v2/material-search-v3.mjs");
  const { materialRuntimeOptions } = await import("./agent-native/v2/material-cli-adapter.mjs");
  return report(invokeSearchOperation("read", { reference: parsed.positional[0], ...parsed.values }, materialRuntimeOptions()));
}

async function runRetrieve(args) {
  const parsed = parseOptions("retrieve", args, { "--query": { field: "query" }, "--limit": { field: "limit", integer: true }, "--format": { field: "format" } });
  if (parsed.error) return parsed.error;
  const { format, ...values } = parsed.values;
  if (format !== undefined && format !== "json") return failure("retrieve", "format_unsupported", "Only --format json is supported.");
  const query = values.query ?? parsed.positional.join(" ");
  if (!query) return failure("retrieve", "argument_value_required", "a query is required");
  const { agentNativeRegistry } = await import("./agent-native/registry.mjs");
  return report(agentNativeRegistry.invoke("retrieve", { ...values, query }));
}

export async function runStylegalleryCli(argv, config = {}) {
  const [command, ...rest] = argv;
  if (command === undefined || command === "help" || command === "--help" || command === "-h") {
    return { exitCode: 0, output: HELP_TEXT, report: { ok: true, operation: "help" } };
  }
  if (command === "version" || command === "--version" || command === "-v") {
    return { exitCode: 0, output: `${packageVersion()}\n`, report: { ok: true, operation: "version" } };
  }
  if (command === "setup" && !rest.includes("--help")) {
    const { runSetup } = await import("./stylegallery-setup.mjs");
    return report(runSetup(rest));
  }
  if (rest.includes("--help")) return { exitCode: 0, output: HELP_TEXT, report: { ok: true, operation: "help" } };
  if (command === "search") return runSearch(rest);
  if (command === "read") return runRead(rest);
  if (command === "retrieve") return runRetrieve(rest);
  if (command === "context" && rest.includes("--query")) {
    const { runMaterialCli } = await import("./agent-native/v2/material-cli-adapter.mjs");
    return runMaterialCli(["context", ...rest]);
  }
  const { runSgCli } = await import("./compiler/cli.mjs");
  return runSgCli(argv, config);
}
