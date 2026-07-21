#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import {
  MIGRATION_DIMENSIONS,
  consumerConformanceSchemaFindings,
  isNormalizedRepositoryPath,
  validateConsumerConformanceSemantics,
} from "./consumer-conformance-contract.mjs";
import { parseStrictJson } from "./strict-json.mjs";
import { addDateTimeFormat } from "./json-schema-formats.mjs";

const styleGalleryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(styleGalleryRoot, "consumer-reference", "schema", "consumer-conformance-record.schema.json");

function finding(code, message, recordPath) {
  return { code, message, path: recordPath };
}

function parseArguments(argv) {
  const options = { json: false, record: undefined, root: process.cwd() };
  const failures = [];
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") options.json = true;
    else if (argument === "--record" || argument === "--root") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) failures.push(finding("argument_value_required", `${argument} requires a value`, "<cli>"));
      else {
        options[argument === "--record" ? "record" : "root"] = value;
        index += 1;
      }
    } else failures.push(finding("argument_unknown", `unsupported argument ${argument}`, "<cli>"));
  }
  if (!options.record) failures.push(finding("argument_value_required", "--record requires a normalized JSON path", "<cli>"));
  return { failures, options };
}

function containedRecord(rootArgument, recordArgument, failures) {
  const root = path.resolve(process.cwd(), rootArgument);
  if (!fs.existsSync(root) || !fs.lstatSync(root).isDirectory() || fs.realpathSync(root) !== root) {
    failures.push(finding("consumer_conformance_root_invalid", "consumer root must be a real directory without filesystem redirects", rootArgument));
    return undefined;
  }
  if (!isNormalizedRepositoryPath(recordArgument, { jsonOnly: true })) {
    failures.push(finding("consumer_conformance_record_path_invalid", "--record must be a normalized repository-relative JSON path", recordArgument));
    return undefined;
  }
  const resolved = path.resolve(root, recordArgument);
  const relative = path.relative(root, resolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || !fs.existsSync(resolved)) {
    failures.push(finding("consumer_conformance_record_path_invalid", "consumer conformance record must exist inside the consumer root", recordArgument));
    return undefined;
  }
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (fs.lstatSync(current).isSymbolicLink()) {
      failures.push(finding("consumer_conformance_record_path_invalid", "consumer conformance record must not traverse a symlink", recordArgument));
      return undefined;
    }
  }
  if (!fs.lstatSync(resolved).isFile() || fs.realpathSync(resolved) !== resolved) {
    failures.push(finding("consumer_conformance_record_path_invalid", "consumer conformance record must be a contained regular file", recordArgument));
    return undefined;
  }
  return { recordPath: relative.split(path.sep).join("/"), resolved };
}

function readStrictJson(file, code, displayPath, failures) {
  try {
    return parseStrictJson(fs.readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(finding(code, error instanceof Error ? error.message : String(error), displayPath));
    return undefined;
  }
}

function uniqueFindings(findings) {
  return [...new Map(findings.map((entry) => [`${entry.code}:${entry.path}:${entry.message}`, entry])).values()];
}

const { failures: argumentFailures, options } = parseArguments(process.argv);
const failures = [...argumentFailures];
const record = options.record ? containedRecord(options.root, options.record, failures) : undefined;
const schema = readStrictJson(schemaPath, "consumer_conformance_schema_invalid", "consumer-reference/schema/consumer-conformance-record.schema.json", failures);
const value = record ? readStrictJson(record.resolved, "consumer_conformance_json_invalid", record.recordPath, failures) : undefined;

if (schema && value !== undefined) {
  try {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addDateTimeFormat(ajv);
    const validate = ajv.compile(schema);
    if (!validate(value)) failures.push(...consumerConformanceSchemaFindings(validate.errors, record.recordPath));
    failures.push(...validateConsumerConformanceSemantics(value, record.recordPath));
  } catch (error) {
    failures.push(finding("consumer_conformance_schema_invalid", error instanceof Error ? error.message : String(error), "consumer-reference/schema/consumer-conformance-record.schema.json"));
  }
}

const uniqueFailures = uniqueFindings(failures);
const result = {
  checkedDimensions: value && typeof value.migration_dimensions === "object" && value.migration_dimensions !== null
    ? MIGRATION_DIMENSIONS.filter((name) => Object.hasOwn(value.migration_dimensions, name)).length
    : 0,
  checkedMappings: Array.isArray(value?.adoption_mappings) ? value.adoption_mappings.length : 0,
  checkedScenarios: Array.isArray(value?.scenarios) ? value.scenarios.length : 0,
  failures: uniqueFailures,
  ok: uniqueFailures.length === 0,
  record: record?.recordPath ?? options.record ?? null,
};
if (options.json) console.log(JSON.stringify(result, null, 2));
else if (result.ok) console.log(`ok: ${result.checkedDimensions} migration dimensions, ${result.checkedMappings} adoption mappings`);
else console.error(result.failures.map((entry) => `${entry.code}: ${entry.path}: ${entry.message}`).join("\n"));
process.exitCode = result.ok ? 0 : 1;
