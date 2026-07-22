import fs from "node:fs";
import path from "node:path";
import { parseStrictJson } from "./strict-json.mjs";

const validRecords = Object.freeze(["valid-deferred-example.json", "valid-normative-bypass.json"]);
const invalidRecords = Object.freeze([
  ["invalid-blocking-evidence.json", "promotion_blocking_evidence_failed"],
  ["invalid-count-only.json", "promotion_count_only_forbidden"],
  ["invalid-missing-owner-migration.json", "promotion_owner_migration_required"],
  ["invalid-normative-bypass-no-regression.json", "promotion_normative_regression_required"],
  ["invalid-related-counted-independent.json", "promotion_related_consumer_counted"],
  ["invalid-stable-ended-support.json", "stable_support_ended"],
]);
const policyRecord = "consumer-reference/policies/shared-experimental.json";
const schemaRecord = "consumer-reference/schema/promotion-rfc.schema.json";

function finding(code, message, recordPath) {
  return { code, message, path: recordPath };
}

function isInside(base, target) {
  const relative = path.relative(base, target);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function resolveContained({ code, expectedType, repositoryRoot, target }, failures) {
  const root = path.resolve(repositoryRoot);
  const resolved = path.resolve(target);
  const recordPath = path.relative(root, resolved) || resolved;
  if (!isInside(root, resolved) || !fs.existsSync(resolved)) {
    failures.push(finding(code, "promotion input must exist inside the repository", recordPath));
    return undefined;
  }
  if (fs.realpathSync(root) !== root) {
    failures.push(finding(code, "repository root must not be a filesystem redirect", recordPath));
    return undefined;
  }
  let current = root;
  for (const segment of path.relative(root, resolved).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (fs.lstatSync(current).isSymbolicLink()) {
      failures.push(finding(code, "promotion input must not traverse a symlink", recordPath));
      return undefined;
    }
  }
  const metadata = fs.lstatSync(resolved);
  if ((expectedType === "file" && !metadata.isFile()) || (expectedType === "directory" && !metadata.isDirectory()) || fs.realpathSync(resolved) !== resolved) {
    failures.push(finding(code, `promotion input must be a contained regular ${expectedType}`, recordPath));
    return undefined;
  }
  return resolved;
}

export function resolvePromotionJsonFile({ file, repositoryRoot }, failures) {
  const recordPath = path.relative(repositoryRoot, path.resolve(file)) || file;
  if (path.extname(file) !== ".json") {
    failures.push(finding("promotion_json_path_required", "promotion records must use the .json extension", recordPath));
    return undefined;
  }
  return resolveContained({ code: "promotion_input_path_invalid", expectedType: "file", repositoryRoot, target: file }, failures);
}

function sameSet(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && new Set(actual).size === expected.length && expected.every((entry) => actual.includes(entry));
}

function validManifest(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const keys = ["id", "invalid_records", "policy_record", "schema_record", "schema_version", "valid_records"];
  if (!sameSet(Object.keys(value), keys) || value.id !== "promotion-fixture-inventory" || value.schema_version !== "1.0" || value.policy_record !== policyRecord || value.schema_record !== schemaRecord || !sameSet(value.valid_records, validRecords)) return false;
  if (!Array.isArray(value.invalid_records) || value.invalid_records.length !== invalidRecords.length) return false;
  const encoded = value.invalid_records.map((entry) => typeof entry === "object" && entry !== null && !Array.isArray(entry) && sameSet(Object.keys(entry), ["expected_code", "file"]) ? `${entry.file}:${entry.expected_code}` : "");
  return sameSet(encoded, invalidRecords.map(([file, code]) => `${file}:${code}`));
}

export function loadPromotionFixtureInventory({ fixtureRoot, repositoryRoot }) {
  const failures = [];
  const root = resolveContained({ code: "promotion_fixture_inventory_invalid", expectedType: "directory", repositoryRoot, target: fixtureRoot }, failures);
  if (!root) return { failures, invalidRecords: [], policyFile: undefined, schema: undefined, validFiles: [] };
  const manifestFile = resolveContained({ code: "promotion_fixture_inventory_invalid", expectedType: "file", repositoryRoot, target: path.join(root, "manifest.json") }, failures);
  let manifest;
  try {
    if (manifestFile) manifest = parseStrictJson(fs.readFileSync(manifestFile, "utf8"));
  } catch (error) {
    failures.push(finding("promotion_fixture_inventory_invalid", error instanceof Error ? error.message : String(error), path.relative(repositoryRoot, manifestFile)));
  }
  if (!validManifest(manifest)) failures.push(finding("promotion_fixture_inventory_invalid", "promotion manifest must match the canonical closed inventory", path.relative(repositoryRoot, manifestFile ?? root)));
  const expectedFiles = ["manifest.json", ...validRecords, ...invalidRecords.map(([file]) => file)];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  if (!sameSet(entries.map((entry) => entry.name), expectedFiles) || entries.some((entry) => !entry.isFile() || path.extname(entry.name) !== ".json")) {
    failures.push(finding("promotion_fixture_inventory_invalid", "promotion fixture directory must contain only the declared JSON closed set", path.relative(repositoryRoot, root)));
  }
  for (const file of expectedFiles) resolveContained({ code: "promotion_fixture_inventory_invalid", expectedType: "file", repositoryRoot, target: path.join(root, file) }, failures);
  const policyFile = resolveContained({ code: "promotion_fixture_inventory_invalid", expectedType: "file", repositoryRoot, target: path.join(repositoryRoot, policyRecord) }, failures);
  const schemaFile = resolveContained({ code: "promotion_fixture_inventory_invalid", expectedType: "file", repositoryRoot, target: path.join(repositoryRoot, schemaRecord) }, failures);
  let schema;
  try {
    if (schemaFile) schema = parseStrictJson(fs.readFileSync(schemaFile, "utf8"));
  } catch (error) {
    failures.push(finding("promotion_fixture_inventory_invalid", error instanceof Error ? error.message : String(error), schemaRecord));
  }
  return {
    failures: [...new Map(failures.map((issue) => [`${issue.code}:${issue.path}:${issue.message}`, issue])).values()],
    invalidRecords: invalidRecords.map(([file, expectedCode]) => ({ expectedCode, file: path.join(root, file) })),
    policyFile,
    schema,
    validFiles: validRecords.map((file) => path.join(root, file)),
  };
}
