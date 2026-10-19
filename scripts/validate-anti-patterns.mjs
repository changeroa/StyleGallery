#!/usr/bin/env node
// Validates expression/anti-patterns.json, the machine-readable AI-slop catalog,
// and its agreement with expression/anti-patterns.md.
//   node scripts/validate-anti-patterns.mjs [--catalog <file>] [--json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = "expression/anti-patterns.json";
const ID_PATTERN = /^slop\.[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOP_KEYS = ["schema_version", "record_kind", "title", "companion_document", "lifecycle", "description", "measurement_context", "entries"];
const ENTRY_FIELDS = ["id", "title", "definition", "detectable", "severity", "rationale", "sources"];
const DETECTION_FIELDS = ["scope", "measure", "threshold", "violation"];
const BENCHMARK_SOURCES = ["expression/measured-benchmarks.md", "showcase/QA.md"];
// The catalog must keep covering the anti-patterns P3 was commissioned to name.
export const REQUIRED_IDS = [
  "slop.headline-only-gradient-screen",
  "slop.unanchored-violet-gradient",
  "slop.soft-shadow-excess",
  "slop.emoji-icons",
  "slop.repeated-card-triplet",
  "slop.static-interactive",
  "slop.dishonest-cta",
  "slop.oversized-display",
];

const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

export function validateAntiPatterns({ catalog, root = repositoryRoot, companion } = {}) {
  const failures = [];
  const fail = (code, message, at) => failures.push({ code, message, path: at });
  if (catalog === null || typeof catalog !== "object" || Array.isArray(catalog)) {
    fail("catalog_not_object", "catalog must be a JSON object", "$");
    return { ok: false, entries: 0, failures };
  }
  for (const key of TOP_KEYS) if (!(key in catalog)) fail("catalog_field_missing", `catalog is missing ${key}`, `$.${key}`);
  if (catalog.record_kind !== undefined && catalog.record_kind !== "expression_anti_pattern_catalog") fail("catalog_kind_invalid", "record_kind must be expression_anti_pattern_catalog", "$.record_kind");
  if (!Array.isArray(catalog.entries) || catalog.entries.length === 0) {
    fail("entries_missing", "entries must be a non-empty array", "$.entries");
    return { ok: false, entries: 0, failures };
  }

  const seen = new Set();
  catalog.entries.forEach((entry, index) => {
    const at = `$.entries[${index}]`;
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) return fail("entry_not_object", "entry must be an object", at);
    for (const field of ENTRY_FIELDS) {
      const value = entry[field];
      const present = field === "sources" ? Array.isArray(value) && value.length > 0 : nonEmpty(value);
      if (!present) fail("entry_field_missing", `${entry.id ?? at} is missing ${field}`, `${at}.${field}`);
    }
    if (nonEmpty(entry.id)) {
      if (!ID_PATTERN.test(entry.id)) fail("entry_id_invalid", `${entry.id} must match slop.<kebab-case>`, `${at}.id`);
      if (seen.has(entry.id)) fail("entry_id_duplicate", `${entry.id} appears more than once`, `${at}.id`);
      seen.add(entry.id);
    }
    if (entry.detectable === "machine") {
      if (entry.severity !== "error") fail("machine_severity_invalid", `${entry.id} is machine-detectable and must have severity error`, `${at}.severity`);
      const detection = entry.detection;
      if (detection === null || typeof detection !== "object" || Array.isArray(detection)) {
        fail("machine_rule_missing", `${entry.id} is machine-detectable but has no detection rule`, `${at}.detection`);
      } else {
        for (const field of DETECTION_FIELDS) if (!nonEmpty(detection[field])) fail("machine_rule_incomplete", `${entry.id} detection is missing ${field}`, `${at}.detection.${field}`);
        if (nonEmpty(detection.threshold) && !/\d/.test(detection.threshold)) fail("machine_threshold_not_numeric", `${entry.id} threshold must state a number`, `${at}.detection.threshold`);
      }
      if ("review_question" in entry) fail("machine_review_question", `${entry.id} is machine-detectable and must not carry a review_question`, `${at}.review_question`);
    } else if (entry.detectable === "review") {
      if (entry.severity !== "review") fail("review_severity_invalid", `${entry.id} is review-only and must have severity review, never error`, `${at}.severity`);
      if (!nonEmpty(entry.review_question) || !entry.review_question.trim().endsWith("?")) fail("review_question_missing", `${entry.id} needs a review_question ending in ?`, `${at}.review_question`);
      if ("detection" in entry) fail("review_rule_present", `${entry.id} is review-only and must not carry a detection rule`, `${at}.detection`);
    } else if (entry.detectable !== undefined) {
      fail("entry_detectable_invalid", `${entry.id} detectable must be machine or review`, `${at}.detectable`);
    }
    if (Array.isArray(entry.sources)) {
      for (const source of entry.sources) {
        if (!nonEmpty(source) || path.isAbsolute(source) || source.split("/").includes("..") || !fs.existsSync(path.join(root, source))) fail("entry_source_missing", `${entry.id} cites a missing source ${source}`, `${at}.sources`);
      }
      if (!entry.sources.some((source) => BENCHMARK_SOURCES.includes(source))) fail("entry_benchmark_uncited", `${entry.id} must cite ${BENCHMARK_SOURCES.join(" or ")}`, `${at}.sources`);
    }
  });

  for (const id of REQUIRED_IDS) if (!seen.has(id)) fail("required_entry_missing", `catalog must define ${id}`, "$.entries");

  const companionText = companion ?? (nonEmpty(catalog.companion_document) && fs.existsSync(path.join(root, catalog.companion_document)) ? fs.readFileSync(path.join(root, catalog.companion_document), "utf8") : null);
  if (companionText === null) fail("companion_missing", "companion_document must name an existing Markdown page", "$.companion_document");
  else {
    for (const id of seen) if (!companionText.includes(`\`${id}\``)) fail("companion_id_missing", `${id} is not listed in the companion page`, "$.companion_document");
    for (const [match] of companionText.matchAll(/`slop\.[a-z0-9-]+`/g)) if (!seen.has(match.slice(1, -1))) fail("companion_id_unknown", `companion page lists ${match} which the catalog does not define`, "$.companion_document");
  }
  return { ok: failures.length === 0, entries: catalog.entries.length, failures };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const flag = process.argv.indexOf("--catalog");
  const file = flag === -1 ? path.join(repositoryRoot, CATALOG) : path.resolve(process.argv[flag + 1] ?? "");
  let result;
  try {
    result = validateAntiPatterns({ catalog: JSON.parse(fs.readFileSync(file, "utf8")) });
  } catch (error) {
    result = { ok: false, entries: 0, failures: [{ code: "catalog_unreadable", message: error.message, path: file }] };
  }
  if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else if (result.ok) console.log(`ok: ${result.entries} anti-pattern entries`);
  else console.error(result.failures.map(({ code, message }) => `${code}: ${message}`).join("\n"));
  process.exitCode = result.ok ? 0 : 1;
}
