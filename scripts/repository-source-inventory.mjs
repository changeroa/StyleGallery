#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CHILD_TIMEOUT_MS = 30_000;
const MAX_CHILD_OUTPUT_BYTES = 16 * 1024 * 1024;

function failure(code, message, sourcePath) {
  return {
    code,
    message,
    ...(sourcePath === undefined ? {} : { path: sourcePath }),
  };
}

function runBounded(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: MAX_CHILD_OUTPUT_BYTES,
    timeout: CHILD_TIMEOUT_MS,
    ...options,
  });
}

function parseArguments(argv) {
  const options = {
    json: argv.includes("--json"),
    root: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") continue;
    if (argument === "--root") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        return { failure: failure("argument_value_required", "--root requires a path value") };
      }
      options.root = path.resolve(value);
      index += 1;
      continue;
    }
    return { failure: failure("argument_unknown", `unknown argument: ${argument}`) };
  }

  return { options };
}

function splitNulPaths(output) {
  const paths = [];
  let start = 0;
  for (let index = 0; index < output.length; index += 1) {
    if (output[index] !== 0) continue;
    if (index > start) paths.push(output.subarray(start, index));
    start = index + 1;
  }
  if (start < output.length) paths.push(output.subarray(start));
  return paths;
}

export function discoverRepositorySources(root) {
  const result = runBounded("git", ["-C", root, "ls-files", "-z", "--", "*.mjs", "*.json"], {
    encoding: "buffer",
  });
  if (result.status !== 0) {
    const detail = result.error?.message ?? result.stderr?.toString("utf8").trim() ?? "git ls-files failed";
    return { failure: failure("source_inventory_failed", detail) };
  }

  const encodedPaths = splitNulPaths(result.stdout).sort(Buffer.compare);
  const all = encodedPaths.map((entry) => entry.toString("utf8"));
  return {
    sources: {
      all,
      json: all.filter((sourcePath) => sourcePath.endsWith(".json")),
      mjs: all.filter((sourcePath) => sourcePath.endsWith(".mjs")),
    },
  };
}

function validatePath(root, sourcePath) {
  const resolvedRoot = path.resolve(root);
  const components = sourcePath.split("/");
  const target = path.resolve(resolvedRoot, ...components);
  if (components.some((component) => component === "" || component === "." || component === "..")
    || (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}${path.sep}`))) {
    return failure("source_path_invalid", "tracked source escapes the repository root", sourcePath);
  }

  let canonicalRoot;
  try {
    const rootStats = fs.lstatSync(resolvedRoot);
    if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
      return failure("source_path_invalid", "repository root must be a regular non-symlink directory", sourcePath);
    }
    canonicalRoot = fs.realpathSync.native(resolvedRoot);
  } catch (error) {
    return failure("source_path_invalid", `repository root is unavailable: ${error.message}`, sourcePath);
  }

  let current = resolvedRoot;
  let stats;
  try {
    for (const component of components) {
      current = path.join(current, component);
      stats = fs.lstatSync(current);
      if (stats.isSymbolicLink()) {
        return failure("source_path_invalid", "tracked source path components must not be symlinks", sourcePath);
      }
    }
    const canonicalTarget = fs.realpathSync.native(target);
    const expectedTarget = path.resolve(canonicalRoot, ...components);
    if (canonicalTarget !== expectedTarget
      || (canonicalTarget !== canonicalRoot && !canonicalTarget.startsWith(`${canonicalRoot}${path.sep}`))) {
      return failure("source_path_invalid", "tracked source canonical path escapes the repository root", sourcePath);
    }
  } catch (error) {
    return failure("source_path_invalid", `tracked source is unavailable: ${error.message}`, sourcePath);
  }
  if (!stats.isFile()) {
    return failure("source_path_invalid", "tracked source must be a regular non-symlink file", sourcePath);
  }
  return null;
}

function validateMjsSyntax(root, sourcePath) {
  const pathFailure = validatePath(root, sourcePath);
  if (pathFailure) return pathFailure;
  const target = path.join(root, sourcePath);
  const result = runBounded(process.execPath, ["--check", target], { cwd: root });
  if (result.status === 0) return null;
  const detail = result.error?.message ?? (result.stderr.trim() || "node --check failed");
  return failure("source_syntax_invalid", detail, sourcePath);
}

function validateJsonSyntax(root, sourcePath) {
  const pathFailure = validatePath(root, sourcePath);
  if (pathFailure) return pathFailure;
  try {
    JSON.parse(fs.readFileSync(path.join(root, sourcePath), "utf8"));
    return null;
  } catch (error) {
    return failure("source_json_invalid", error.message, sourcePath);
  }
}

export function validateRepositorySources({ root }) {
  const discovery = discoverRepositorySources(root);
  if (discovery.failure) {
    return {
      counts: { json: 0, mjs: 0, total: 0 },
      failures: [discovery.failure],
      ok: false,
      sources: { all: [], json: [], mjs: [] },
    };
  }

  const { sources } = discovery;
  const counts = {
    json: sources.json.length,
    mjs: sources.mjs.length,
    total: sources.all.length,
  };
  for (const sourcePath of sources.all) {
    const pathFailure = validatePath(root, sourcePath);
    if (pathFailure) return { counts, failures: [pathFailure], ok: false, sources };
    const syntaxFailure = sourcePath.endsWith(".mjs")
      ? validateMjsSyntax(root, sourcePath)
      : validateJsonSyntax(root, sourcePath);
    if (syntaxFailure) return { counts, failures: [syntaxFailure], ok: false, sources };
  }

  return { counts, failures: [], ok: true, sources };
}

function writeReport(report, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (report.ok) {
    process.stdout.write(`ok: ${report.counts.mjs} MJS and ${report.counts.json} JSON tracked sources\n`);
  } else {
    const first = report.failures[0];
    process.stderr.write(`${first.code}${first.path ? ` (${first.path})` : ""}: ${first.message}\n`);
  }
}

function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed.failure) {
    const report = {
      counts: { json: 0, mjs: 0, total: 0 },
      failures: [parsed.failure],
      ok: false,
      sources: { all: [], json: [], mjs: [] },
    };
    writeReport(report, process.argv.includes("--json"));
    process.exitCode = 1;
    return;
  }

  const report = validateRepositorySources(parsed.options);
  writeReport(report, parsed.options.json);
  process.exitCode = report.ok ? 0 : 1;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
