#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { isPlainObject, validateItemSchema } from "./consumer-reference-schema.mjs";
import { canonicalGovernedProfilePaths } from "./governed-profile-registry.mjs";
import { validateReferenceProfile, validateReferenceProfileSet } from "./reference-profile-contract.mjs";

const root = process.cwd();
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const conformanceValidator = path.join(repositoryRoot, "scripts", "validate-consumer-conformance.mjs");
const schema = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "consumer-reference", "schema", "item.schema.json"), "utf8"));
const validateFullItemSchema = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
const failures = [];
const warnings = [];
const canonicalProfilePaths = canonicalGovernedProfilePaths;
const defaultItems = [
  "consumer-reference/fixtures/valid-experimental.json",
  "consumer-reference/fixtures/valid-deprecated.json",
  ...canonicalProfilePaths,
];
const reverseMarkers = ["consumerreference", "designengineeringreferenceprofiles", "profilejson", "tokensdtcgjson", "relatedfixturesetid"];
const profileSummaries = [];
let checkedMigrationRecords = 0;

function addFailure(code, relative, message) {
  failures.push({ code, message, path: relative });
}

function canonicalProfileIdentity(selected) {
  if (selected.startsWith("//")
    || selected.startsWith("\\\\")
    || path.posix.isAbsolute(selected)
    || path.win32.isAbsolute(selected)
    || /^[A-Za-z][A-Za-z\d+.-]*:/.test(selected)
    || selected.includes("\\")
    || selected.includes("?")
    || selected.includes("#")) return null;
  const normalized = path.posix.normalize(selected);
  if (normalized === ".." || normalized.startsWith("../") || !isInside(root, path.resolve(root, normalized))) return null;
  return canonicalProfilePaths.includes(normalized) ? normalized : null;
}

function isInside(base, target) {
  const relative = path.relative(base, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function parseArguments() {
  const items = [];
  let json = false;
  for (let index = 2; index < process.argv.length; index += 1) {
    const argument = process.argv[index];
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--item" || argument === "--profile") {
      const value = process.argv[index + 1];
      if (!value || value.startsWith("--")) {
        addFailure("argument_value_required", "<cli>", `${argument} requires a repository-relative JSON path`);
      } else {
        items.push(value);
        index += 1;
      }
      continue;
    }
    addFailure("argument_unknown", "<cli>", `unsupported argument ${argument}`);
  }
  const selected = items.length > 0 ? items : defaultItems;
  const canonicalized = selected.map((item) => canonicalProfileIdentity(item) ?? item);
  const requiresCanonicalPair = canonicalized.some((item) => canonicalProfilePaths.includes(item));
  return { items: requiresCanonicalPair ? [...new Set([...canonicalized, ...canonicalProfilePaths])] : canonicalized, json };
}

function validateRecordPath(record, itemPath, prefix = "record") {
  const reject = (suffix, message) => addFailure(`${prefix}_${suffix}`, itemPath, message);
  if (typeof record !== "string" || record.length === 0) {
    reject("required", "declared handoff requires record");
    return undefined;
  }
  if (record.startsWith("//") || record.startsWith("\\\\")) {
    reject("network_path", "record must not use a network path");
    return undefined;
  }
  if (path.posix.isAbsolute(record) || path.win32.isAbsolute(record)) {
    reject("absolute", "record must be repository-relative");
    return undefined;
  }
  if (/^[A-Za-z][A-Za-z\d+.-]*:/.test(record)) {
    reject("uri_scheme", "record must not use a URI scheme");
    return undefined;
  }
  if (record.split(/[\\/]/).includes("..")) {
    reject("parent_segment", "record must not contain a parent segment");
    return undefined;
  }
  if (record.includes("\\") || record.includes("?") || record.includes("#") || path.posix.normalize(record) !== record || record.startsWith("./")) {
    reject("not_normalized", "record must be a normalized POSIX repository path");
    return undefined;
  }
  if (!record.endsWith(".json")) {
    reject("not_json", "record must target a JSON file");
    return undefined;
  }
  const target = path.resolve(root, record);
  if (!isInside(root, target)) {
    reject("escape", "record resolves outside the repository root");
    return undefined;
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    reject("unresolved", `record does not resolve: ${record}`);
    return undefined;
  }
  const realRoot = fs.realpathSync(root);
  const realTarget = fs.realpathSync(target);
  if (!isInside(realRoot, realTarget)) {
    reject("symlink_escape", "record resolves through a symlink outside the repository root");
    return undefined;
  }
  if (realTarget !== path.join(realRoot, record)) {
    reject("redirect", "record must not resolve through a filesystem redirect");
    return undefined;
  }
  try {
    return { record, value: JSON.parse(fs.readFileSync(realTarget, "utf8")) };
  } catch (error) {
    if (error instanceof SyntaxError) {
      reject("invalid_json", `record is not valid JSON: ${record}`);
      return undefined;
    }
    throw error;
  }
}

function runMigrationConformance(packet, relative) {
  const args = [conformanceValidator, "--root", root, "--record", packet.record];
  const manifest = packet.value?.page_evidence?.status === "applicable" ? packet.value.page_evidence.manifest : undefined;
  if (typeof manifest === "string") args.push("--artifact-root", path.posix.dirname(manifest));
  args.push("--json");
  checkedMigrationRecords += 1;
  const child = spawnSync(process.execPath, args, { cwd: repositoryRoot, encoding: "utf8" });
  let report;
  try { report = JSON.parse(child.stdout); }
  catch (error) {
    addFailure("migration_conformance_validator_output_invalid", relative, error instanceof Error ? error.message : String(error));
    return;
  }
  const childFailures = Array.isArray(report.failures) ? report.failures : [];
  for (const failure of childFailures) {
    addFailure(
      typeof failure?.code === "string" ? failure.code : "migration_conformance_validator_output_invalid",
      typeof failure?.path === "string" ? failure.path : relative,
      typeof failure?.message === "string" ? failure.message : "consumer conformance validator returned a malformed finding",
    );
  }
  if (child.status !== 0 && childFailures.length === 0) addFailure("migration_conformance_validator_failed", relative, "consumer conformance validator exited without a finding");
  if (child.status === 0 && report.ok !== true) addFailure("migration_conformance_validator_output_invalid", relative, "consumer conformance validator exited zero without ok:true");
}

function validateHandoff(item, relative) {
  if (isPlainObject(item.handoff) && item.handoff.status === "declared") validateRecordPath(item.handoff.record, relative);
}

function validateItem(relative) {
  const absolute = path.resolve(root, relative);
  if (path.isAbsolute(relative) || path.win32.isAbsolute(relative) || !isInside(root, absolute) || !relative.endsWith(".json") || !fs.existsSync(absolute)) {
    addFailure("item_unresolved", relative, "item must be an existing repository-relative JSON file");
    return;
  }
  const realRoot = fs.realpathSync(root);
  const realAbsolute = fs.realpathSync(absolute);
  if (!isInside(realRoot, realAbsolute)) {
    addFailure("item_symlink_escape", relative, "item resolves through a symlink outside the repository root");
    return;
  }
  if (realAbsolute !== path.join(realRoot, relative)) {
    addFailure("item_redirect", relative, "item must not resolve through a filesystem redirect");
    return;
  }
  let item;
  try {
    item = JSON.parse(fs.readFileSync(realAbsolute, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      addFailure("item_invalid_json", relative, "item must contain valid JSON");
      return;
    }
    throw error;
  }
  if (!validateFullItemSchema(item)) {
    for (const error of validateFullItemSchema.errors ?? []) addFailure("item_schema_invalid", relative, `${error.instancePath || "/"} ${error.message}`);
  }
  for (const finding of validateItemSchema(item, schema)) addFailure(finding.code, relative, finding.message);
  if (!isPlainObject(item)) return;
  validateHandoff(item, relative);
  if (/^design-engineering\/reference-profiles\/governed-local\/[^/]+\/profile\.json$/.test(relative)) {
    const result = validateReferenceProfile({ item, relative, root });
    for (const finding of result.failures) addFailure(finding.code, finding.path, finding.message);
    if (result.summary) profileSummaries.push(result.summary);
  }
}

function walkFiles(relative) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return [];
  if (fs.statSync(absolute).isFile()) return [relative];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", ".omo", "node_modules"].includes(entry.name)) return [];
    return walkFiles(path.join(relative, entry.name));
  });
}

function rejectReverseImports() {
  const guarded = ["layout", "patterns", "scripts/pattern-data.mjs", "CATALOG.md"];
  for (const relative of guarded.flatMap(walkFiles)) {
    const compact = fs.readFileSync(path.join(root, relative), "utf8").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (reverseMarkers.some((marker) => compact.includes(marker))) {
      addFailure("reverse_import", relative, "Layout and generated corpus must not import consumer reference artifacts");
    }
  }
}

function rejectExternalAdaptationRecords() {
  const directory = "design-engineering/reference-profiles/external-adaptation";
  for (const relative of walkFiles(directory).filter((file) => file.endsWith(".json"))) {
    addFailure("external_adaptation_record_forbidden", relative, "external adaptation has documentation and synthetic validator coverage only");
  }
}

function isSentence(reason) {
  const variants = schema.properties.handoff.oneOf;
  const definition = variants.find((candidate) => candidate.properties.status.const === "not_applicable").properties.reason;
  return reason.length >= definition.minLength && new RegExp(definition.pattern).test(reason);
}

function validateHandoffCoverage() {
  let checked = 0;
  for (const relative of walkFiles(".").filter((file) => file.endsWith(".md"))) {
    const lines = fs.readFileSync(path.join(root, relative), "utf8").split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      if (!/Implementation handoff:/i.test(lines[index])) continue;
      checked += 1;
      const window = lines.slice(index, index + 7).join("\n").replaceAll("`", "");
      const status = window.match(/Consumer reference:\s*(declared|not_applicable)/i)?.[1];
      if (!status) {
        addFailure("handoff_consumer_reference_required", relative, `implementation handoff at line ${index + 1} requires Consumer reference`);
      } else if (status === "not_applicable") {
        const reason = window.match(/Consumer reference reason:\s*([^\n]+)/i)?.[1]?.trim();
        if (!reason || !isSentence(reason)) addFailure("handoff_consumer_reason_sentence", relative, `not_applicable handoff at line ${index + 1} requires a sentence reason`);
      } else if (!/Consumer reference record:\s*\S+\.json/i.test(window)) {
        addFailure("handoff_consumer_record_required", relative, `declared handoff at line ${index + 1} requires one JSON record`);
      }
      const migrationDeclarations = [...window.matchAll(/^Consumer migration conformance:\s*(\S+)\s*$/gim)];
      const migrationRecords = [...window.matchAll(/^Consumer migration conformance record:\s*([^\n]+)\s*$/gim)];
      if (migrationDeclarations.length === 0 && migrationRecords.length > 0) {
        addFailure("migration_conformance_declaration_required", relative, `migration record at line ${index + 1} requires an exact declared conformance field`);
      } else if (migrationDeclarations.length > 0) {
        if (migrationDeclarations.length !== 1 || migrationDeclarations[0][1].toLowerCase() !== "declared") {
          addFailure("migration_conformance_status_invalid", relative, `migration handoff at line ${index + 1} accepts exactly one declared status`);
        } else if (migrationRecords.length !== 1) {
          addFailure("migration_conformance_record_required", relative, `declared migration handoff at line ${index + 1} requires exactly one JSON record`);
        } else {
          const packet = validateRecordPath(migrationRecords[0][1].trim(), relative, "migration_conformance_record");
          if (packet) runMigrationConformance(packet, relative);
        }
      }
    }
  }
  return checked;
}

const options = parseArguments();
for (const item of options.items) validateItem(item);
rejectReverseImports();
rejectExternalAdaptationRecords();
for (const finding of validateReferenceProfileSet(profileSummaries)) addFailure(finding.code, finding.path, finding.message);
const checkedHandoffs = validateHandoffCoverage();

const uniqueFailures = [...new Map(failures.map((failure) => [`${failure.code}:${failure.path}:${failure.message}`, failure])).values()];
const result = { checkedHandoffs, checkedItems: options.items.length, checkedMigrationRecords, failures: uniqueFailures, ok: uniqueFailures.length === 0, profiles: profileSummaries, warnings };
if (options.json) console.log(JSON.stringify(result, null, 2));
else if (result.ok) console.log(`ok: ${result.checkedItems} consumer reference items`);
else console.error(result.failures.map((failure) => `${failure.code}: ${failure.path}: ${failure.message}`).join("\n"));
process.exitCode = result.ok ? 0 : 1;
