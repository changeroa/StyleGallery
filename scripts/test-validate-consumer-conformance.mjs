#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseStrictJson } from "./strict-json.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(repositoryRoot, "consumer-reference", "fixtures", "consumer-conformance");
const validator = path.join(repositoryRoot, "scripts", "validate-consumer-conformance.mjs");
const expectedCases = Object.freeze([
  ["omitted-dimension", "migration_dimension_required"],
  ["applicable-without-scenario", "migration_dimension_scenario_required"],
  ["source-regex-runtime-proof", "runtime_evidence_method_invalid"],
  ["orphan-adoption-scenario", "adoption_scenario_unknown"],
  ["malformed-local-target", "adoption_consumer_target_invalid"],
  ["unpinned-stylegallery-revision", "adoption_stylegallery_revision_unpinned"],
  ["debt-without-lifecycle", "adoption_debt_incomplete"],
]);

function parseArguments(argv) {
  const options = { caseName: undefined, json: false };
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") options.json = true;
    else if (argument === "--case") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--case requires a case name");
      options.caseName = value;
      index += 1;
    } else throw new Error(`unsupported argument ${argument}`);
  }
  return options;
}

function sameSet(actual, expected) {
  return actual.length === expected.length && new Set(actual).size === expected.length && expected.every((entry) => actual.includes(entry));
}

function readJson(file) {
  return parseStrictJson(fs.readFileSync(file, "utf8"));
}

function validateInventory(manifest) {
  const expectedKeys = ["id", "invalid_cases", "schema_record", "schema_version", "valid_records"];
  const encodedCases = Array.isArray(manifest.invalid_cases)
    ? manifest.invalid_cases.map((entry) => Object.keys(entry).length === 2 ? `${entry.name}:${entry.expected_code}` : "")
    : [];
  const expectedEncoded = expectedCases.map(([name, code]) => `${name}:${code}`);
  const entries = fs.readdirSync(fixtureRoot, { withFileTypes: true });
  const closedFiles = entries.every((entry) => entry.isFile() && path.extname(entry.name) === ".json")
    && sameSet(entries.map((entry) => entry.name), ["manifest.json", "valid-migration.json"]);
  return Object.keys(manifest).length === expectedKeys.length
    && sameSet(Object.keys(manifest), expectedKeys)
    && manifest.id === "consumer-conformance-fixture-inventory"
    && manifest.schema_version === "1.0"
    && manifest.schema_record === "consumer-reference/schema/consumer-conformance-record.schema.json"
    && Array.isArray(manifest.valid_records)
    && sameSet(manifest.valid_records, ["valid-migration.json"])
    && sameSet(encodedCases, expectedEncoded)
    && closedFiles;
}

function mutatedRecord(name, source) {
  const value = structuredClone(source);
  if (name === "omitted-dimension") delete value.migration_dimensions.exact_time_boundary;
  else if (name === "applicable-without-scenario") value.migration_dimensions.route_parity = { scenario_ids: [], status: "applicable" };
  else if (name === "source-regex-runtime-proof") value.scenarios[0].evidence_method = "source_regex";
  else if (name === "orphan-adoption-scenario") value.adoption_mappings[0].scenario_ids = ["missing-scenario"];
  else if (name === "malformed-local-target") value.adoption_mappings[0].consumer_target = { identity: "app shell", kind: "selector" };
  else if (name === "unpinned-stylegallery-revision") value.adoption_mappings[0].stylegallery.revision = "abc123";
  else if (name === "debt-without-lifecycle") value.adoption_mappings[0].debt = [{ summary: "Replace the temporary spacing bridge." }];
  else throw new Error(`unknown fixture case ${name}`);
  return value;
}

function runValidator(root, record) {
  const child = spawnSync(process.execPath, [validator, "--root", root, "--record", record, "--json"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  let output;
  try {
    output = JSON.parse(child.stdout);
  } catch {
    output = { failures: [], parse_error: child.stderr || child.stdout };
  }
  return { output, status: child.status };
}

const options = parseArguments(process.argv);
const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-consumer-conformance-")));
const results = [];
try {
  const manifest = readJson(path.join(fixtureRoot, "manifest.json"));
  const inventoryOk = validateInventory(manifest) && fs.existsSync(path.join(repositoryRoot, manifest.schema_record));
  results.push({ actual: inventoryOk, expected: true, name: "closed-fixture-inventory", ok: inventoryOk });
  const valid = readJson(path.join(fixtureRoot, "valid-migration.json"));
  const selected = options.caseName ?? "all";
  if (selected === "all" || selected === "valid-migration") {
    const child = runValidator(repositoryRoot, "consumer-reference/fixtures/consumer-conformance/valid-migration.json");
    const ok = child.status === 0 && child.output.ok === true && child.output.checkedDimensions === 13 && child.output.checkedMappings === 1;
    results.push({ actual: { checkedDimensions: child.output.checkedDimensions, checkedMappings: child.output.checkedMappings, codes: child.output.failures?.map((entry) => entry.code) ?? [], status: child.status }, expected: "valid record, 13 dimensions, one mapping, exit:0", name: "valid-migration", ok });
  }
  for (const [name, expectedCode] of expectedCases) {
    if (selected !== "all" && selected !== name) continue;
    const record = path.join(tempRoot, `${name}.json`);
    fs.writeFileSync(record, `${JSON.stringify(mutatedRecord(name, valid), null, 2)}\n`);
    const child = runValidator(tempRoot, path.basename(record));
    const codes = child.output.failures?.map((entry) => entry.code) ?? [];
    const ok = child.status !== 0 && codes.includes(expectedCode);
    results.push({ actual: { codes, status: child.status }, expected: expectedCode, name, ok });
  }
  if (selected !== "all" && selected !== "valid-migration" && !expectedCases.some(([name]) => name === selected)) {
    results.push({ actual: selected, expected: "known case", name: "case-selection", ok: false });
  }
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

const result = { ok: results.every((entry) => entry.ok), results };
if (options.json) console.log(JSON.stringify(result, null, 2));
else if (result.ok) console.log(`ok: ${results.length} consumer conformance fixture cases`);
else console.error(results.filter((entry) => !entry.ok).map((entry) => `${entry.name}: expected ${entry.expected}`).join("\n"));
process.exitCode = result.ok ? 0 : 1;
