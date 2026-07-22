#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import StyleDictionary from "style-dictionary";
import { adapter, createStyleDictionaryConfig } from "../consumer-reference/adapters/style-dictionary.config.mjs";
import { inspectArtifactPath } from "./reference-artifact-path-contract.mjs";
import { validatePortableTokens } from "./reference-token-contract.mjs";
import { parseStrictJson } from "./strict-json.mjs";

const root = process.cwd();
const defaults = {
  adapter: "style-dictionary",
  manifest: "consumer-reference/generated/manifest.json",
  output: "consumer-reference/generated/tokens.css",
  source: "consumer-reference/fixtures/token-portability/valid-reference.json",
};

function parseArguments() {
  const options = { ...defaults, failOnWarning: false, json: false };
  for (let index = 2; index < process.argv.length; index += 1) {
    const argument = process.argv[index];
    if (argument === "--json") options.json = true;
    else if (argument === "--fail-on-warning") options.failOnWarning = true;
    else if (["--adapter", "--manifest", "--output", "--source"].includes(argument)) {
      const value = process.argv[index + 1];
      if (!value) return { failure: { code: "argument_value_required", message: `${argument} requires a value`, path: "<cli>" }, options };
      options[argument.slice(2)] = value;
      index += 1;
    } else return { failure: { code: "argument_unknown", message: `unsupported argument ${argument}`, path: "<cli>" }, options };
  }
  return { options };
}

function hash(content) {
  return `sha256:${crypto.createHash("sha256").update(content).digest("hex")}`;
}

function declarations(css) {
  return [...css.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);\s*$/gm)].map((match) => ({ name: match[1], value: match[2].trim() }));
}

function emit(report, json) {
  const text = json ? JSON.stringify(report, null, 2) : report.ok ? `ok: ${report.outputCount} token declarations` : report.failures.map((item) => `${item.code}: ${item.message}`).join("\n");
  (json || report.ok ? console.log : console.error)(text);
}

const parsed = parseArguments();
const options = parsed.options;
const source = path.resolve(root, options.source);
const output = path.resolve(root, options.output);
const manifestPath = path.resolve(root, options.manifest);
const failures = parsed.failure ? [parsed.failure] : [];
const warnings = [];
if (!parsed.failure) {
  for (const [code, target] of [
    ["token_source_untrusted", source],
    ["artifact_output_untrusted", output],
    ["artifact_manifest_untrusted", manifestPath],
  ]) {
    const inspection = inspectArtifactPath(root, target, code !== "token_source_untrusted");
    if (!inspection.ok) failures.push({ code, message: `${target} must be a contained regular non-symlink file`, path: path.relative(root, target) || "." });
  }
}
let sourceBytes;
let document;
if (failures.length === 0) {
  try {
    sourceBytes = fs.readFileSync(source);
    document = parseStrictJson(sourceBytes.toString("utf8"));
  } catch (error) {
    const code = error instanceof SyntaxError ? "token_json_invalid" : "token_source_unresolved";
    failures.push({ code, message: error instanceof Error ? error.message : String(error), path: options.source });
  }
}
let contract = { failures: [], tokens: [] };
if (document !== undefined) {
  contract = validatePortableTokens(document);
  failures.push(...contract.failures);
}
if (options.adapter !== adapter.name) failures.push({ code: "adapter_unsupported", message: `adapter must be ${adapter.name}`, path: "<cli>" });
if (failures.length === 0) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const dictionary = new StyleDictionary(createStyleDictionaryConfig(source, output), { verbosity: "silent", warnings: options.failOnWarning ? "error" : "warn" });
  try {
    await dictionary.buildAllPlatforms();
  } catch (error) {
    failures.push({ code: "adapter_build_failed", message: error instanceof Error ? error.message : String(error), path: options.source });
  }
}
let css = "";
if (failures.length === 0 && !fs.existsSync(output)) failures.push({ code: "artifact_output_missing", message: "adapter produced no CSS output", path: options.output });
if (failures.length === 0) {
  css = fs.readFileSync(output, "utf8");
  const emitted = declarations(css);
  const expected = contract.tokens.map((token) => `--${token.path.replaceAll(".", "-")}`);
  const names = emitted.map((item) => item.name);
  if (emitted.length === 0) failures.push({ code: "artifact_zero_count", message: "adapter produced zero declarations", path: options.output });
  if (new Set(names).size !== names.length) failures.push({ code: "artifact_declaration_duplicate", message: "adapter produced a duplicate declaration", path: options.output });
  for (const name of expected.filter((name) => !names.includes(name))) failures.push({ code: "artifact_declaration_missing", message: `adapter omitted ${name}`, path: options.output });
  if (css.includes("[object Object]")) failures.push({ code: "artifact_object_sentinel", message: "adapter emitted [object Object]", path: options.output });
  if (/\{[a-z0-9.-]+\}|\b(?:null|undefined)\b/.test(css)) failures.push({ code: "artifact_unresolved_value", message: "adapter emitted an unresolved value", path: options.output });
  if (contract.tokens.length !== emitted.length) failures.push({ code: "artifact_count_mismatch", message: "source and output token counts differ", path: options.output });
  if (warnings.length > 0 && options.failOnWarning) failures.push({ code: "adapter_warning", message: "adapter emitted a warning", path: options.output });
  if (failures.length === 0) {
    const manifest = {
      adapter,
      declarations: emitted,
      inputHash: hash(sourceBytes),
      outputCount: emitted.length,
      outputFile: path.relative(path.dirname(manifestPath), output).replaceAll(path.sep, "/"),
      outputHash: hash(css),
      schemaVersion: "1.0",
      sourceCount: contract.tokens.length,
      sourceFile: path.relative(path.dirname(manifestPath), source).replaceAll(path.sep, "/"),
      warnings,
    };
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}
const report = parsed.failure
  ? { failures: [parsed.failure], ok: false, warnings }
  : { adapter, failures, manifest: options.manifest, ok: failures.length === 0, output: options.output, outputCount: failures.length === 0 ? contract.tokens.length : 0, warnings };
emit(report, options.json);
process.exitCode = report.ok ? 0 : 1;
