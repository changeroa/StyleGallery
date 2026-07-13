#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { adapter } from "../consumer-reference/adapters/style-dictionary.config.mjs";
import { inspectArtifactPath } from "./reference-artifact-path-contract.mjs";
import { validatePortableTokens } from "./reference-token-contract.mjs";
import { parseStrictJson } from "./strict-json.mjs";

function hash(content) {
  return `sha256:${crypto.createHash("sha256").update(content).digest("hex")}`;
}

function cssDeclarations(css) {
  return [...css.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);\s*$/gm)].map((match) => ({ name: match[1], value: match[2].trim() }));
}

function parseArguments() {
  let json = false;
  let manifest = "consumer-reference/generated/manifest.json";
  const failures = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    const argument = process.argv[index];
    if (argument === "--json") json = true;
    else if (argument === "--manifest") {
      manifest = process.argv[index + 1];
      if (!manifest) failures.push({ code: "argument_value_required", message: "--manifest requires a value", path: "<cli>" });
      else index += 1;
    } else failures.push({ code: "argument_unknown", message: `unsupported argument ${argument}`, path: "<cli>" });
  }
  return { failures, json, manifest };
}

const options = parseArguments();
const failures = [...options.failures];
const warnings = [];
const trustRoot = process.cwd();
const manifestPath = path.resolve(trustRoot, options.manifest || "missing.json");
let manifest;
const manifestInspection = inspectArtifactPath(trustRoot, manifestPath, false);
if (!manifestInspection.ok && manifestInspection.reason === "missing") {
  failures.push({ code: "artifact_manifest_missing", message: "manifest does not exist", path: options.manifest });
  failures.push({ code: "artifact_output_missing", message: "output cannot be located without a manifest", path: options.manifest });
} else if (!manifestInspection.ok) {
  failures.push({ code: "artifact_manifest_untrusted", message: "manifest must be a contained regular non-symlink file", path: options.manifest });
} else {
  try {
    manifest = parseStrictJson(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    failures.push({ code: "artifact_manifest_invalid", message: error instanceof Error ? error.message : String(error), path: options.manifest });
  }
}
if (manifest !== undefined) {
  const allowedManifestProperties = new Set(["adapter", "declarations", "inputHash", "outputCount", "outputFile", "outputHash", "schemaVersion", "sourceCount", "sourceFile", "warnings"]);
  if (manifest.scaffold === true) failures.push({ code: "artifact_scaffold_forbidden", message: "manifest must not contain a scaffold success sentinel", path: options.manifest });
  for (const key of Object.keys(manifest).filter((key) => !allowedManifestProperties.has(key))) failures.push({ code: "artifact_manifest_property_unknown", message: `manifest contains unsupported property ${key}`, path: options.manifest });
  if (manifest.schemaVersion !== "1.0") failures.push({ code: "artifact_schema_version", message: "manifest schemaVersion must be 1.0", path: options.manifest });
  if (manifest.adapter?.name !== adapter.name || manifest.adapter?.version !== adapter.version) failures.push({ code: "artifact_adapter_mismatch", message: "manifest adapter pin is invalid", path: options.manifest });
  if (!Number.isInteger(manifest.sourceCount) || !Number.isInteger(manifest.outputCount) || manifest.sourceCount <= 0 || manifest.outputCount <= 0) failures.push({ code: "artifact_zero_count", message: "source and output counts must be positive integers", path: options.manifest });
  if (manifest.sourceCount !== manifest.outputCount) failures.push({ code: "artifact_count_mismatch", message: "source and output counts differ", path: options.manifest });
  if (!Array.isArray(manifest.warnings)) failures.push({ code: "artifact_warnings_invalid", message: "warnings must be an array", path: options.manifest });
  else if (manifest.warnings.length > 0) failures.push({ code: "artifact_warning", message: "manifest contains adapter warnings", path: options.manifest });
  const declared = Array.isArray(manifest.declarations) ? manifest.declarations : [];
  if (!Array.isArray(manifest.declarations)) failures.push({ code: "artifact_declarations_invalid", message: "declarations must be an array", path: options.manifest });
  const declarationNames = declared.map((item) => item?.name).filter((name) => typeof name === "string");
  if (new Set(declarationNames).size !== declarationNames.length) failures.push({ code: "artifact_declaration_duplicate", message: "manifest contains duplicate declarations", path: options.manifest });
  const sourcePath = typeof manifest.sourceFile === "string" ? path.resolve(path.dirname(manifestPath), manifest.sourceFile) : "";
  const outputPath = typeof manifest.outputFile === "string" ? path.resolve(path.dirname(manifestPath), manifest.outputFile) : "";
  const sourceInspection = sourcePath ? inspectArtifactPath(trustRoot, sourcePath, false) : { ok: false, reason: "missing" };
  const outputInspection = outputPath ? inspectArtifactPath(trustRoot, outputPath, false) : { ok: false, reason: "missing" };
  if (!sourceInspection.ok && sourceInspection.reason === "missing") failures.push({ code: "artifact_source_missing", message: "manifest source file does not exist", path: options.manifest });
  else if (!sourceInspection.ok) failures.push({ code: "token_source_untrusted", message: "manifest source must be a contained regular non-symlink file", path: options.manifest });
  else {
    const sourceBytes = fs.readFileSync(sourcePath);
    if (manifest.inputHash !== hash(sourceBytes)) failures.push({ code: "artifact_input_hash_mismatch", message: "input hash does not match source", path: options.manifest });
    try {
      const contract = validatePortableTokens(parseStrictJson(sourceBytes.toString("utf8")));
      failures.push(...contract.failures);
      if (contract.tokens.length !== manifest.sourceCount) failures.push({ code: "artifact_source_count_mismatch", message: "source count does not match canonical tokens", path: options.manifest });
      const expected = contract.tokens.map((token) => `--${token.path.replaceAll(".", "-")}`);
      for (const name of expected.filter((name) => !declarationNames.includes(name))) failures.push({ code: "artifact_declaration_missing", message: `manifest omitted ${name}`, path: options.manifest });
    } catch (error) {
      failures.push({ code: "artifact_source_invalid", message: error instanceof Error ? error.message : String(error), path: options.manifest });
    }
  }
  if (!outputInspection.ok && outputInspection.reason === "missing") failures.push({ code: "artifact_output_missing", message: "manifest output file does not exist", path: options.manifest });
  else if (!outputInspection.ok) failures.push({ code: "artifact_output_untrusted", message: "manifest output must be a contained regular non-symlink file", path: options.manifest });
  else {
    const css = fs.readFileSync(outputPath, "utf8");
    const emitted = cssDeclarations(css);
    const emittedNames = emitted.map((item) => item.name);
    if (manifest.outputHash !== hash(css)) failures.push({ code: "artifact_output_hash_mismatch", message: "output hash does not match CSS", path: options.manifest });
    if (emitted.length === 0) failures.push({ code: "artifact_zero_count", message: "CSS contains zero declarations", path: options.manifest });
    if (new Set(emittedNames).size !== emittedNames.length) failures.push({ code: "artifact_declaration_duplicate", message: "CSS contains duplicate declarations", path: options.manifest });
    for (const name of declarationNames.filter((name) => !emittedNames.includes(name))) failures.push({ code: "artifact_declaration_missing", message: `CSS omitted ${name}`, path: options.manifest });
    for (const declaration of declared) {
      const actual = emitted.find((item) => item.name === declaration?.name);
      if (actual && actual.value !== declaration.value) failures.push({ code: "artifact_declaration_mismatch", message: `CSS value for ${declaration.name} differs from the manifest`, path: options.manifest });
    }
    if (emitted.length !== manifest.outputCount || emitted.length !== declarationNames.length) failures.push({ code: "artifact_count_mismatch", message: "CSS, manifest count, and declarations differ", path: options.manifest });
    if (css.includes("[object Object]")) failures.push({ code: "artifact_object_sentinel", message: "CSS contains [object Object]", path: options.manifest });
    if (/\{[a-z0-9.-]+\}|\b(?:null|undefined)\b/.test(css)) failures.push({ code: "artifact_unresolved_value", message: "CSS contains an unresolved value", path: options.manifest });
    if (sourceInspection.ok) {
      const rebuildRoot = fs.mkdtempSync(path.join(trustRoot, ".tmp-stylegallery-reference-validation-"));
      try {
        const expectedOutput = path.join(rebuildRoot, "tokens.css");
        const expectedManifest = path.join(rebuildRoot, "manifest.json");
        const builder = path.join(path.dirname(fileURLToPath(import.meta.url)), "build-reference-artifacts.mjs");
        const child = spawnSync(process.execPath, [builder, "--source", sourcePath, "--output", expectedOutput, "--manifest", expectedManifest, "--adapter", "style-dictionary", "--fail-on-warning", "--json"], { cwd: process.cwd(), encoding: "utf8" });
        if (child.status !== 0 || !fs.existsSync(expectedOutput)) failures.push({ code: "artifact_canonical_rebuild_failed", message: "canonical source could not be rebuilt with the pinned adapter", path: options.manifest });
        else if (fs.readFileSync(expectedOutput, "utf8") !== css) failures.push({ code: "artifact_source_output_mismatch", message: "CSS differs from the pinned adapter output derived from canonical source", path: options.manifest });
      } finally {
        fs.rmSync(rebuildRoot, { force: true, recursive: true });
      }
    }
  }
}
const uniqueFailures = [...new Map(failures.map((item) => [`${item.code}:${item.path}:${item.message}`, item])).values()];
const report = { failures: uniqueFailures, manifest: options.manifest, ok: uniqueFailures.length === 0, warnings };
const text = options.json ? JSON.stringify(report, null, 2) : report.ok ? "ok: reference artifacts" : uniqueFailures.map((item) => `${item.code}: ${item.message}`).join("\n");
(options.json || report.ok ? console.log : console.error)(text);
process.exit(report.ok ? 0 : 1);
