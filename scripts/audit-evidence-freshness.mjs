#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { addDateTimeFormat, isRfc3339DateTime } from "./json-schema-formats.mjs";
import { parseStrictJson } from "./strict-json.mjs";
import { validateCalibration } from "./baseline-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const calibrationSchemaPath = path.join(repositoryRoot, "consumer-reference", "schema", "calibration-record.schema.json");
const defaultPageSchemaPath = path.join(repositoryRoot, "consumer-reference", "schema", "page-evidence-manifest.schema.json");
const PAGE_RECORD_KIND = "page_evidence_manifest";
// This is an advisory warning window only. It never changes an explicit expiry or adds a TTL.
const DEFAULT_EXPIRING_WINDOW_DAYS = 7;

function failure(code, sourcePath, message, details = undefined) {
  return details === undefined ? { code, message, path: sourcePath } : { code, message, path: sourcePath, details };
}

function warning(code, sourcePath, status, thresholdDate, asOf, message) {
  return { asOf, code, message, source_path: sourcePath, status, threshold_date: thresholdDate };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseDateTime(value) {
  return isRfc3339DateTime(value) ? Date.parse(value) : NaN;
}

function isInside(base, target) {
  const relative = path.relative(path.resolve(base), path.resolve(target));
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function displayPath(file, root) {
  const absolute = path.resolve(file);
  if (isInside(root, absolute)) return path.relative(root, absolute).split(path.sep).join("/") || ".";
  return absolute;
}

function readRecord(file, root, failures) {
  const sourcePath = displayPath(file, root);
  let stat;
  try {
    stat = fs.lstatSync(file);
  } catch (error) {
    failures.push(failure("freshness_record_unreadable", sourcePath, `record cannot be read: ${error instanceof Error ? error.message : String(error)}`));
    return undefined;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    failures.push(failure("freshness_record_unreadable", sourcePath, "record must be a regular non-symlink file"));
    return undefined;
  }
  if (stat.size > 1024 * 1024) {
    failures.push(failure("freshness_record_unreadable", sourcePath, "record must not exceed 1 MiB"));
    return undefined;
  }
  try {
    return { sourcePath, value: parseStrictJson(fs.readFileSync(file, "utf8")) };
  } catch (error) {
    failures.push(failure("freshness_record_invalid", sourcePath, error instanceof Error ? error.message : String(error)));
    return undefined;
  }
}

function readSchema(schemaPath, sourcePath, failures) {
  let stat;
  try {
    stat = fs.lstatSync(schemaPath);
  } catch (error) {
    failures.push(failure("freshness_schema_missing", sourcePath, `schema cannot be read: ${error instanceof Error ? error.message : String(error)}`));
    return undefined;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    failures.push(failure("freshness_schema_invalid", sourcePath, "schema must be a regular non-symlink file"));
    return undefined;
  }
  try {
    return parseStrictJson(fs.readFileSync(schemaPath, "utf8"));
  } catch (error) {
    failures.push(failure("freshness_schema_invalid", sourcePath, error instanceof Error ? error.message : String(error)));
    return undefined;
  }
}

function compileSchema(schema, schemaPath, sourcePath, failures, { strict = true } = {}) {
  if (!isRecord(schema)) {
    failures.push(failure("freshness_schema_invalid", sourcePath, "schema must be a JSON object"));
    return undefined;
  }
  try {
    const ajv = new Ajv2020({ allErrors: true, strict });
    addDateTimeFormat(ajv);
    const schemaDirectory = path.dirname(defaultPageSchemaPath);
    if (path.resolve(schemaPath) === path.resolve(defaultPageSchemaPath) && fs.existsSync(schemaDirectory)) {
      for (const entry of fs.readdirSync(schemaDirectory, { withFileTypes: true }).filter((item) => item.isFile() && item.name.endsWith(".schema.json"))) {
        const dependencyPath = path.join(schemaDirectory, entry.name);
        if (path.resolve(dependencyPath) === path.resolve(schemaPath)) continue;
        try {
          const dependency = parseStrictJson(fs.readFileSync(dependencyPath, "utf8"));
          if (dependency?.$id) ajv.addSchema(dependency, dependency.$id);
        } catch {
          // Only schemas reachable from the selected page schema affect this compile.
        }
      }
    }
    if (schema.$id) ajv.addSchema(schema, schema.$id);
    else ajv.addSchema(schema, schemaPath);
    return ajv.getSchema(schema.$id ?? schemaPath) ?? ajv.compile(schema);
  } catch (error) {
    failures.push(failure("freshness_schema_invalid", sourcePath, error instanceof Error ? error.message : String(error)));
    return undefined;
  }
}

function schemaFailures(validate, value, sourcePath) {
  if (validate(value)) return [];
  return (validate.errors ?? []).map((error) => failure(
    "freshness_record_invalid",
    sourcePath,
    `${error.instancePath || "/"} ${error.message}`,
  ));
}

function validateCalibrationRecord(value, sourcePath, failures) {
  const schema = readSchema(calibrationSchemaPath, sourcePath, failures);
  const validate = schema === undefined ? undefined : compileSchema(schema, calibrationSchemaPath, sourcePath, failures, { strict: false });
  if (validate) failures.push(...schemaFailures(validate, value, sourcePath));
  for (const finding of validateCalibration(value, sourcePath)) {
    failures.push(failure("freshness_record_invalid", sourcePath, finding.message, { code: finding.code }));
  }
  if (!isRecord(value)) return undefined;
  const external = value.committed_ci?.external_verification;
  if (external === null || external === undefined) return { thresholdDate: null, verifiedAt: null };
  if (!isRecord(external) || !isRecord(external.artifact)) {
    failures.push(failure("freshness_record_invalid", sourcePath, "calibration external verification must contain artifact metadata"));
    return undefined;
  }
  const thresholdDate = external.artifact.expires_at;
  const verifiedAt = external.verified_at;
  if (!Number.isFinite(parseDateTime(thresholdDate)) || !Number.isFinite(parseDateTime(verifiedAt))) {
    failures.push(failure("freshness_record_invalid", sourcePath, "calibration expiry and verification dates must be RFC 3339 date-time values"));
    return undefined;
  }
  return { thresholdDate, verifiedAt };
}

function validatePageRecord(value, sourcePath, pageSchemaPath, failures) {
  const schema = readSchema(pageSchemaPath, sourcePath, failures);
  if (schema === undefined) return undefined;
  const validate = compileSchema(schema, pageSchemaPath, sourcePath, failures, { strict: true });
  if (validate) failures.push(...schemaFailures(validate, value, sourcePath));
  if (!isRecord(value) || value.record_kind !== PAGE_RECORD_KIND) return undefined;
  const thresholdDate = value.review_by;
  if (!Number.isFinite(parseDateTime(thresholdDate))) {
    failures.push(failure("freshness_record_invalid", sourcePath, "page evidence review_by must be an RFC 3339 date-time value"));
    return undefined;
  }
  return { thresholdDate, verifiedAt: null };
}

function classify(entry, asOfMs, windowMs) {
  if (entry.thresholdDate === null) return "fresh";
  const thresholdMs = Date.parse(entry.thresholdDate);
  if (entry.kind === PAGE_RECORD_KIND) {
    if (asOfMs >= thresholdMs) return "review_due";
    return thresholdMs - asOfMs <= windowMs ? "expiring" : "fresh";
  }
  if (asOfMs >= thresholdMs) return "expired";
  return thresholdMs - asOfMs <= windowMs ? "expiring" : "fresh";
}

function isBlockingStatus(status) {
  return status === "expired" || status === "review_due";
}

function auditOne({ file, asOf, asOfMs, mode, root, pageSchemaPath, expiringWindowMs }) {
  const failures = [];
  const sourcePath = displayPath(file, root);
  const loaded = readRecord(file, root, failures);
  if (!loaded) return { failures, warnings: [], record: null };
  const { value } = loaded;
  if (!isRecord(value)) {
    failures.push(failure("freshness_record_invalid", sourcePath, "record must be a JSON object"));
    return { failures, warnings: [], record: null };
  }
  let kind;
  let dates;
  if (value.record_kind === PAGE_RECORD_KIND) {
    kind = PAGE_RECORD_KIND;
    dates = validatePageRecord(value, sourcePath, pageSchemaPath, failures);
  } else if (value.committed_ci !== undefined || value.required_runs !== undefined || value.runs !== undefined) {
    kind = "calibration_record";
    dates = validateCalibrationRecord(value, sourcePath, failures);
  } else {
    failures.push(failure("freshness_record_invalid", sourcePath, "record_kind is not a supported evidence record"));
    return { failures, warnings: [], record: null };
  }
  if (dates === undefined || failures.length > 0) return { failures, warnings: [], record: null };
  const entry = { asOf, kind, source_path: sourcePath, threshold_date: dates.thresholdDate, verified_at: dates.verifiedAt };
  const status = classify({ kind, thresholdDate: dates.thresholdDate }, asOfMs, expiringWindowMs);
  const result = { ...entry, status };
  const warnings = [];
  if (status !== "fresh") {
    const code = status === "expiring" ? "evidence_expiring" : status === "expired" ? "evidence_expired" : "evidence_review_due";
    const message = status === "expiring"
      ? `evidence expiry is within the advisory window (${dates.thresholdDate})`
      : status === "expired"
        ? `evidence expired at ${dates.thresholdDate}`
        : `evidence review is due at ${dates.thresholdDate}`;
    warnings.push(warning(code, sourcePath, status, dates.thresholdDate, asOf, message));
    if (mode === "blocking" && isBlockingStatus(status)) failures.push(failure(code, sourcePath, message, { asOf, threshold_date: dates.thresholdDate }));
  }
  return { failures, record: result, warnings };
}

export function parseArguments(argv = process.argv.slice(2)) {
  const options = { asOf: null, expiringWindowDays: DEFAULT_EXPIRING_WINDOW_DAYS, json: false, mode: "advisory", pageSchema: defaultPageSchemaPath, records: [] };
  const failures = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      options.json = true;
      continue;
    }
    if (["--record", "--as-of", "--mode", "--page-schema", "--expiring-within-days"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        failures.push(failure("argument_value_required", "<cli>", `${argument} requires a value`));
        continue;
      }
      index += 1;
      if (argument === "--record") options.records.push(value);
      else if (argument === "--as-of") options.asOf = value;
      else if (argument === "--mode") options.mode = value;
      else if (argument === "--page-schema") options.pageSchema = path.resolve(process.cwd(), value);
      else options.expiringWindowDays = Number(value);
      continue;
    }
    failures.push(failure("argument_unknown", "<cli>", `unsupported argument ${argument}`));
  }
  if (options.records.length === 0) failures.push(failure("record_required", "<cli>", "at least one --record is required"));
  if (options.asOf === null) failures.push(failure("as_of_required", "<cli>", "--as-of is required for deterministic freshness auditing"));
  else if (!Number.isFinite(parseDateTime(options.asOf))) failures.push(failure("as_of_invalid", "<cli>", "--as-of must be an RFC 3339 date-time value"));
  if (!["advisory", "blocking"].includes(options.mode)) failures.push(failure("mode_invalid", "<cli>", "--mode must be advisory or blocking"));
  if (!Number.isFinite(options.expiringWindowDays) || options.expiringWindowDays < 0 || options.expiringWindowDays > 3650) failures.push(failure("expiring_window_invalid", "<cli>", "--expiring-within-days must be a number from 0 through 3650"));
  return { failures, options };
}

export function auditEvidenceFreshness({ records, asOf, mode = "advisory", root = repositoryRoot, pageSchema = defaultPageSchemaPath, expiringWindowDays = DEFAULT_EXPIRING_WINDOW_DAYS }) {
  const asOfMs = parseDateTime(asOf);
  const failures = [];
  const warnings = [];
  const entries = [];
  if (!Number.isFinite(asOfMs)) failures.push(failure("as_of_invalid", "<cli>", "asOf must be an RFC 3339 date-time value"));
  for (const record of records) {
    const file = path.resolve(root, record);
    const result = auditOne({ asOf, asOfMs, expiringWindowMs: expiringWindowDays * 24 * 60 * 60 * 1000, file, mode, pageSchemaPath: pageSchema, root });
    failures.push(...result.failures);
    warnings.push(...result.warnings);
    if (result.record) entries.push(result.record);
  }
  const uniqueFailures = [...new Map(failures.map((item) => [`${item.code}:${item.path}:${item.message}`, item])).values()];
  const uniqueWarnings = [...new Map(warnings.map((item) => [`${item.code}:${item.source_path}:${item.threshold_date}`, item])).values()];
  return {
    asOf,
    expiring_window_days: expiringWindowDays,
    failures: uniqueFailures,
    mode,
    ok: uniqueFailures.length === 0,
    records: entries,
    warnings: uniqueWarnings,
  };
}

export function runCli(argv = process.argv.slice(2), root = repositoryRoot) {
  const parsed = parseArguments(argv);
  if (parsed.failures.length > 0) return { asOf: parsed.options.asOf, failures: parsed.failures, mode: parsed.options.mode, ok: false, records: [], warnings: [] };
  return auditEvidenceFreshness({
    asOf: parsed.options.asOf,
    expiringWindowDays: parsed.options.expiringWindowDays,
    mode: parsed.options.mode,
    pageSchema: parsed.options.pageSchema,
    records: parsed.options.records,
    root,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const parsed = parseArguments();
    const report = parsed.failures.length > 0
      ? { asOf: parsed.options.asOf, failures: parsed.failures, mode: parsed.options.mode, ok: false, records: [], warnings: [] }
      : runCli();
    if (parsed.options.json || parsed.failures.length > 0) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    else if (report.ok) process.stdout.write(`ok: audited ${report.records.length} evidence record(s)\n`);
    else process.stderr.write(`${report.failures.map((item) => `${item.code}: ${item.message}`).join("\n")}\n`);
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    const report = { failures: [failure("freshness_tool_error", "<tool>", error instanceof Error ? error.message : String(error))], ok: false, records: [], warnings: [] };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = 1;
  }
}
