#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseStrictJson } from "./strict-json.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const defaultRecordPath = "platform-guides/hig-universal-principles.json";
export const defaultMarkdownPath = "platform-guides/hig-universal-principles.md";

export const PRINCIPLE_CLASSES = ["universal", "adapt", "apple-specific"];
const DISPOSITIONS = ["extracted", "covered", "excluded"];
const SECTIONS = ["foundations", "patterns", "components", "inputs", "technologies"];
const HIG_BASE = "https://developer.apple.com/design/human-interface-guidelines/";
const PRINCIPLE_FIELDS = ["id", "section", "page", "statement", "source_url", "class", "class_reason", "wcag", "material3", "apg", "verification_question", "reviewed_on"];
const TOP_FIELDS = ["schema_version", "record_kind", "title", "platform", "source_index", "sections", "out_of_scope_sections", "reviewed_on", "review_by", "text_policy", "classes", "wcag", "material3", "apg", "source_pages", "principles"];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isRealDate(value) {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function checkReferenceDictionary(record, key, keyPattern, urlPrefix, fail) {
  const dictionary = record[key];
  if (!isRecord(dictionary)) return;
  for (const [entryKey, entry] of Object.entries(dictionary)) {
    const where = `${key}.${entryKey}`;
    if (!keyPattern.test(entryKey)) fail("reference_key_invalid", where, `${key} key ${entryKey} is malformed`);
    if (!isRecord(entry) || !isNonEmptyString(entry.title) || typeof entry.url !== "string" || !entry.url.startsWith(urlPrefix)) {
      fail("reference_entry_invalid", where, `${key} entry needs a title and a ${urlPrefix} url`);
    }
  }
}

export function validateHigPrinciples(record, { markdown = null } = {}) {
  const failures = [];
  const fail = (code, where, message) => failures.push({ code, message, path: where });

  if (!isRecord(record)) {
    fail("record_invalid", "/", "record must be a JSON object");
    return { failures, ok: false };
  }
  for (const field of TOP_FIELDS) if (!Object.hasOwn(record, field)) fail("field_missing", field, `record is missing ${field}`);
  for (const field of Object.keys(record)) if (!TOP_FIELDS.includes(field)) fail("field_unknown", field, `record has unknown field ${field}`);
  if (record.schema_version !== "1.0") fail("schema_version_invalid", "schema_version", "schema_version must be 1.0");
  if (record.record_kind !== "platform_principle_extraction") fail("record_kind_invalid", "record_kind", "record_kind must be platform_principle_extraction");
  if (record.text_policy !== "paraphrase_and_link_only") fail("text_policy_invalid", "text_policy", "text_policy must be paraphrase_and_link_only");
  if (!isRealDate(record.reviewed_on)) fail("date_invalid", "reviewed_on", "reviewed_on must be a real YYYY-MM-DD date");
  if (typeof record.review_by !== "string" || !DATE_TIME.test(record.review_by) || Number.isNaN(Date.parse(record.review_by))) {
    fail("date_invalid", "review_by", "review_by must be an RFC 3339 UTC date-time");
  } else if (isRealDate(record.reviewed_on) && Date.parse(record.review_by) <= Date.parse(`${record.reviewed_on}T00:00:00Z`)) {
    fail("review_window_invalid", "review_by", "review_by must be later than reviewed_on");
  }
  if (!isRecord(record.classes) || PRINCIPLE_CLASSES.some((name) => !isNonEmptyString(record.classes[name])) || Object.keys(record.classes).some((name) => !PRINCIPLE_CLASSES.includes(name))) {
    fail("classes_invalid", "classes", `classes must define exactly ${PRINCIPLE_CLASSES.join(", ")}`);
  }
  if (!Array.isArray(record.sections) || record.sections.map((item) => item?.id).join() !== SECTIONS.join()) {
    fail("sections_invalid", "sections", `sections must list ${SECTIONS.join(", ")} in order`);
  }
  checkReferenceDictionary(record, "wcag", /^[1-4]\.\d{1,2}\.\d{1,2}$/, "https://www.w3.org/TR/WCAG22/#", fail);
  checkReferenceDictionary(record, "material3", SLUG, "https://m3.material.io/", fail);
  checkReferenceDictionary(record, "apg", SLUG, "https://www.w3.org/WAI/ARIA/apg/", fail);

  const pages = new Map();
  for (const [index, page] of (Array.isArray(record.source_pages) ? record.source_pages : []).entries()) {
    const where = `source_pages[${index}]`;
    if (!isRecord(page)) {
      fail("inventory_entry_invalid", where, "inventory entry must be an object");
      continue;
    }
    for (const field of ["page", "section", "title", "source_url", "disposition"]) if (!Object.hasOwn(page, field)) fail("field_missing", `${where}.${field}`, `inventory entry is missing ${field}`);
    if (pages.has(page.page)) fail("inventory_duplicate", where, `inventory lists ${page.page} more than once`);
    pages.set(page.page, page);
    if (!SECTIONS.includes(page.section)) fail("section_unknown", `${where}.section`, `unknown section ${page.section}`);
    if (page.source_url !== `${HIG_BASE}${page.page}`) fail("source_url_mismatch", `${where}.source_url`, `source_url must be ${HIG_BASE}${page.page}`);
    if (!DISPOSITIONS.includes(page.disposition)) fail("disposition_unknown", `${where}.disposition`, `unknown disposition ${page.disposition}`);
    if (page.disposition !== "extracted" && !isNonEmptyString(page.reason)) fail("field_missing", `${where}.reason`, `${page.disposition} inventory entry needs a reason`);
  }
  if (!Array.isArray(record.source_pages) || pages.size === 0) fail("inventory_empty", "source_pages", "source_pages must list the walked HIG pages");

  const ids = new Set();
  const principlesByPage = new Map();
  for (const [index, principle] of (Array.isArray(record.principles) ? record.principles : []).entries()) {
    const where = isRecord(principle) && typeof principle.id === "string" ? principle.id : `principles[${index}]`;
    if (!isRecord(principle)) {
      fail("principle_invalid", where, "principle must be an object");
      continue;
    }
    for (const field of PRINCIPLE_FIELDS) if (!Object.hasOwn(principle, field)) fail("field_missing", `${where}.${field}`, `principle is missing ${field}`);
    for (const field of Object.keys(principle)) if (!PRINCIPLE_FIELDS.includes(field)) fail("field_unknown", `${where}.${field}`, `principle has unknown field ${field}`);
    for (const field of ["statement", "class_reason", "verification_question"]) {
      if (Object.hasOwn(principle, field) && !isNonEmptyString(principle[field])) fail("field_empty", `${where}.${field}`, `${field} must be a non-empty string`);
    }
    if (isNonEmptyString(principle.statement) && principle.statement.length > 320) fail("statement_too_long", `${where}.statement`, "statement must stay a short paraphrase (320 characters or fewer)");
    if (isNonEmptyString(principle.verification_question) && !principle.verification_question.trim().endsWith("?")) fail("question_invalid", `${where}.verification_question`, "verification_question must end with a question mark");
    if (Object.hasOwn(principle, "class") && !PRINCIPLE_CLASSES.includes(principle.class)) fail("class_unknown", `${where}.class`, `unknown class ${principle.class}; expected ${PRINCIPLE_CLASSES.join(", ")}`);
    if (typeof principle.id === "string") {
      if (ids.has(principle.id)) fail("id_duplicate", where, `duplicate principle id ${principle.id}`);
      ids.add(principle.id);
      const parts = principle.id.split(".");
      if (parts.length !== 4 || parts[0] !== "hig" || parts[1] !== principle.section || parts[2] !== principle.page || !SLUG.test(parts[3] ?? "")) {
        fail("id_malformed", where, "id must be hig.<section>.<page>.<slug> matching the section and page fields");
      }
    }
    if (Object.hasOwn(principle, "section") && !SECTIONS.includes(principle.section)) fail("section_unknown", `${where}.section`, `unknown section ${principle.section}`);
    if (Object.hasOwn(principle, "page")) {
      const page = pages.get(principle.page);
      if (!page) fail("inventory_missing_page", `${where}.page`, `page ${principle.page} is not in source_pages`);
      else if (page.section !== principle.section) fail("section_mismatch", `${where}.section`, `page ${principle.page} belongs to ${page.section}`);
      principlesByPage.set(principle.page, (principlesByPage.get(principle.page) ?? 0) + 1);
    }
    if (Object.hasOwn(principle, "source_url") && principle.source_url !== `${HIG_BASE}${principle.page}`) fail("source_url_mismatch", `${where}.source_url`, `source_url must be ${HIG_BASE}${principle.page}`);
    if (Object.hasOwn(principle, "reviewed_on")) {
      if (!isRealDate(principle.reviewed_on)) fail("date_invalid", `${where}.reviewed_on`, "reviewed_on must be a real YYYY-MM-DD date");
      else if (isRealDate(record.reviewed_on) && principle.reviewed_on > record.reviewed_on) fail("date_invalid", `${where}.reviewed_on`, "principle reviewed_on must not be later than the record reviewed_on");
    }
    if (Object.hasOwn(principle, "wcag")) {
      if (!Array.isArray(principle.wcag)) fail("field_type", `${where}.wcag`, "wcag must be an array of success criterion numbers");
      else {
        if (new Set(principle.wcag).size !== principle.wcag.length) fail("reference_duplicate", `${where}.wcag`, "wcag lists a criterion twice");
        for (const sc of principle.wcag) if (!isRecord(record.wcag) || !Object.hasOwn(record.wcag, sc)) fail("reference_unknown", `${where}.wcag`, `unknown WCAG criterion ${sc}`);
      }
    }
    for (const key of ["material3", "apg"]) {
      if (!Object.hasOwn(principle, key) || principle[key] === null) continue;
      if (typeof principle[key] !== "string" || !isRecord(record[key]) || !Object.hasOwn(record[key], principle[key])) fail("reference_unknown", `${where}.${key}`, `unknown ${key} reference ${principle[key]}`);
    }
  }
  if (!Array.isArray(record.principles) || ids.size === 0) fail("principles_empty", "principles", "principles must be a non-empty array");

  for (const [slug, page] of pages) {
    const count = principlesByPage.get(slug) ?? 0;
    if (page.disposition === "extracted" && count === 0) fail("inventory_unextracted", `source_pages.${slug}`, `extracted page ${slug} has no principle`);
    if (page.disposition !== "extracted" && count > 0) fail("inventory_disposition_conflict", `source_pages.${slug}`, `${page.disposition} page ${slug} must not have principles`);
    if (page.disposition === "covered" && !ids.has(page.covered_by)) fail("covered_by_unknown", `source_pages.${slug}.covered_by`, `covered_by ${page.covered_by} is not a principle id`);
  }

  for (const key of ["wcag", "material3", "apg"]) {
    if (!isRecord(record[key])) continue;
    const used = new Set((record.principles ?? []).flatMap((item) => (key === "wcag" ? item?.wcag ?? [] : [item?.[key]])));
    for (const entryKey of Object.keys(record[key])) if (!used.has(entryKey)) fail("reference_unused", `${key}.${entryKey}`, `${key} entry ${entryKey} is not referenced by any principle`);
  }

  if (markdown !== null) {
    for (const id of ids) if (!markdown.includes(`\`${id}\``)) fail("markdown_missing_id", defaultMarkdownPath, `Markdown guide does not list ${id}`);
    if (!markdown.includes("](hig-universal-principles.json)")) fail("markdown_missing_record_link", defaultMarkdownPath, "Markdown guide must link the JSON record");
  }

  const classes = Object.fromEntries(PRINCIPLE_CLASSES.map((name) => [name, (record.principles ?? []).filter((item) => item?.class === name).length]));
  return { classes, failures, ok: failures.length === 0, pages: pages.size, principles: ids.size };
}

export function runCli(argv = process.argv.slice(2), root = repositoryRoot) {
  let recordPath = defaultRecordPath;
  let markdownPath = defaultMarkdownPath;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") continue;
    if (argument === "--skip-markdown") markdownPath = null;
    else if (argument === "--record" || argument === "--markdown") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) return { failures: [{ code: "argument_value_required", message: `${argument} requires a value`, path: "<cli>" }], ok: false };
      index += 1;
      if (argument === "--record") recordPath = value;
      else markdownPath = value;
    } else return { failures: [{ code: "argument_unknown", message: `unsupported argument ${argument}`, path: "<cli>" }], ok: false };
  }
  let record;
  try {
    record = parseStrictJson(fs.readFileSync(path.resolve(root, recordPath), "utf8"));
  } catch (error) {
    return { failures: [{ code: "record_unreadable", message: error instanceof Error ? error.message : String(error), path: recordPath }], ok: false };
  }
  let markdown = null;
  if (markdownPath !== null) {
    try {
      markdown = fs.readFileSync(path.resolve(root, markdownPath), "utf8");
    } catch (error) {
      return { failures: [{ code: "markdown_unreadable", message: error instanceof Error ? error.message : String(error), path: markdownPath }], ok: false };
    }
  }
  return validateHigPrinciples(record, { markdown });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = runCli();
  if (process.argv.includes("--json")) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else if (report.ok) process.stdout.write(`ok: ${report.principles} HIG principles across ${report.pages} source pages\n`);
  else process.stderr.write(`${report.failures.map((item) => `${item.code}: ${item.path}: ${item.message}`).join("\n")}\n`);
  process.exitCode = report.ok ? 0 : 1;
}
