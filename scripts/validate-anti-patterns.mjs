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
const TOP_KEYS = ["schema_version", "record_kind", "title", "companion_document", "lifecycle", "description", "measurement_context", "entries", "reviewed_and_rejected"];
const ENTRY_FIELDS = ["id", "first_seen", "evidence_grade", "title", "definition", "detectable", "severity", "rationale", "sources"];
const EVIDENCE_GRADES = ["measured-differential", "measured-baseline", "consensus-opinion", "owner-taste"];
const REJECTED_FIELDS = ["id", "title", "source_repository", "source_path", "source_revision", "reason"];
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

export const PROFILE_NAMES = ["landing", "app", "content"];
const AUDIT_CHECK_PATTERN = /^audit\.[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
    if (entry.first_seen !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(entry.first_seen) || !Number.isFinite(Date.parse(entry.first_seen)) || new Date(entry.first_seen).toISOString().slice(0, 10) !== entry.first_seen)) {
      fail("entry_date_invalid", `${entry.id} first_seen must be a real ISO calendar date`, `${at}.first_seen`);
    }
    if (entry.evidence_grade !== undefined && !EVIDENCE_GRADES.includes(entry.evidence_grade)) fail("entry_grade_invalid", `${entry.id} has an unknown evidence_grade`, `${at}.evidence_grade`);
    if (["owner-taste", "consensus-opinion"].includes(entry.evidence_grade) && entry.detectable !== "review") {
      fail("opinion_must_be_review", `${entry.id} opinion evidence must be detectable review, never a machine error`, `${at}.detectable`);
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

  // Page profiles relax landing-calibrated rules to warnings; each relaxation needs a rationale
  // and must name a real machine entry or a shared audit.* check.
  if (catalog.profiles !== undefined) {
    const profiles = catalog.profiles;
    if (profiles === null || typeof profiles !== "object" || Array.isArray(profiles)) fail("profiles_not_object", "profiles must be an object", "$.profiles");
    else {
      if (!nonEmpty(profiles.detection)) fail("profiles_detection_missing", "profiles must describe how a profile is detected", "$.profiles.detection");
      const machine = new Set(catalog.entries.filter((e) => e?.detectable === "machine").map((e) => e.id));
      for (const name of PROFILE_NAMES) {
        const profile = profiles[name];
        const at = `$.profiles.${name}`;
        if (profile === null || typeof profile !== "object" || Array.isArray(profile)) { fail("profile_missing", `profiles must define ${name}`, at); continue; }
        if (!nonEmpty(profile.description) || !nonEmpty(profile.rationale)) fail("profile_field_missing", `${name} needs a description and a rationale`, at);
        if (!Array.isArray(profile.relaxed)) { fail("profile_relaxed_invalid", `${name}.relaxed must be an array`, `${at}.relaxed`); continue; }
        for (const id of profile.relaxed) {
          if (!(machine.has(id) || AUDIT_CHECK_PATTERN.test(id))) fail("profile_relaxed_unknown", `${name} relaxes ${id}, which is neither a machine entry nor an audit.* check`, `${at}.relaxed`);
        }
        if (new Set(profile.relaxed).size !== profile.relaxed.length) fail("profile_relaxed_duplicate", `${name}.relaxed lists an id more than once`, `${at}.relaxed`);
      }
      if (Array.isArray(profiles.landing?.relaxed) && profiles.landing.relaxed.length) fail("profile_landing_relaxed", "landing is the calibration profile and relaxes nothing", "$.profiles.landing.relaxed");
      for (const key of Object.keys(profiles)) if (key !== "detection" && !PROFILE_NAMES.includes(key)) fail("profile_unknown", `unknown profile ${key}`, `$.profiles.${key}`);
    }
  }

  if (!Array.isArray(catalog.reviewed_and_rejected)) {
    fail("rejected_list_invalid", "reviewed_and_rejected must be an array", "$.reviewed_and_rejected");
  } else {
    const rejectedIds = new Set();
    catalog.reviewed_and_rejected.forEach((item, index) => {
      const at = `$.reviewed_and_rejected[${index}]`;
      if (item === null || typeof item !== "object" || Array.isArray(item)) return fail("rejected_item_invalid", "rejected item must be an object", at);
      if (Object.keys(item).length !== REJECTED_FIELDS.length || REJECTED_FIELDS.some((key) => !nonEmpty(item[key]))) fail("rejected_item_invalid", "rejected item must contain exactly id, title, source_repository, source_path, source_revision, and reason as non-empty strings", at);
      if (nonEmpty(item.id) && !/^(?:slop\.)?[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) fail("rejected_id_invalid", "rejected id must be kebab-case with an optional slop namespace", `${at}.id`);
      const normalizedId = item.id?.startsWith("slop.") ? item.id : `slop.${item.id}`;
      if (seen.has(normalizedId)) fail("rejected_id_collision", "rejected id must not name an active entry", `${at}.id`);
      if (rejectedIds.has(normalizedId)) fail("rejected_id_duplicate", "rejected ids must be unique", `${at}.id`);
      rejectedIds.add(normalizedId);
      if (nonEmpty(item.source_repository) && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(item.source_repository)) fail("rejected_source_invalid", "source_repository must be owner/repository", `${at}.source_repository`);
      if (nonEmpty(item.source_path) && (path.isAbsolute(item.source_path) || !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(item.source_path) || item.source_path.split("/").some((part) => part === "." || part === ".."))) fail("rejected_source_invalid", "source_path must be a normalized repository-relative path", `${at}.source_path`);
      if (!/^[a-f0-9]{40}$/.test(item.source_revision ?? "")) fail("rejected_revision_invalid", "source_revision must be a full lowercase Git SHA", `${at}.source_revision`);
    });
  }

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
