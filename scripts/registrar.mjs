#!/usr/bin/env node

// The Registrar keeps the gallery's claim register. Markdown claim records under
// quality/claim-records/ are the source of truth; the Registrar checks the machine-readable fields of
// each "## Claim Record" section against the template in quality/claims.md, the evidence-family
// glossary, the referenced files, the other records, and the Conservator's exhibit list. It cannot
// prove the semantics of a claim, only that its record is complete, well-formed, internally
// consistent, and points at evidence that exists.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exhibitSlugs } from "./conservator-exhibits.mjs";
import { structuralMarkdown } from "./markdown-structure.mjs";

const galleryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RECORD_DIR = "quality/claim-records";
const TEMPLATE_DOC = "quality/claims.md";
const FAMILY_DOC = "quality/evidence/families.md";
const RECORD_INDEX = `${RECORD_DIR}/index.md`;
const VERDICTS = new Set(["auto", "human", "mixed"]);
const DECISIONS = new Set(["pass", "review_required", "blocked"]);
const NA = "not applicable";

// Every field of the claims.md template, in template order. The template-sync rule fails when the
// template and this list drift apart.
export const RECORD_FIELDS = Object.freeze([
  "Principle", "Claim", "Context", "Use case", "Warrant", "Evidence family", "Verification protocol",
  "Implementation handoff", "Consumer reference", "Consumer reference reason", "Boundary or limitation",
  "Debt or escalation", "Decision", "Evidence refs", "Verified by", "Reviewed at", "Review by",
  "Source revision", "Conflicts with",
]);
// Fields that must state something; the rest may say "not applicable".
const STATEMENT_FIELDS = ["Principle", "Claim", "Context", "Warrant", "Evidence family", "Verification protocol", "Boundary or limitation", "Debt or escalation"];
// Human-outcome terms from quality/claims.md that automation alone cannot certify.
const HUMAN_OUTCOME_TERMS = ["good", "better", "best", "harmonious", "harmony", "usable", "usability", "accessible", "readable", "credible", "clear"];

export const REGISTRAR_RULES = Object.freeze([
  "records-present", "record-title-format", "record-number-unique", "record-title-unique",
  "template-sync", "field-present", "field-not-repeated", "statement-not-empty",
  "decision-value", "verified-by-value", "reviewed-at-date", "reviewed-at-not-future",
  "review-by-value", "review-by-after-reviewed-at", "review-by-overdue",
  "source-revision-format", "external-source-review-by",
  "conflicts-with-format", "conflicts-with-resolves", "conflicts-with-reciprocal",
  "evidence-refs-present", "evidence-refs-backticked", "evidence-ref-kind", "evidence-ref-exists", "conservator-ref-resolves",
  "evidence-family-known", "consumer-reference-format", "consumer-reference-reason",
  "auto-pass-only", "auto-executable-refs", "auto-validator-family", "auto-no-human-outcome-terms",
  "human-review-artifact", "record-file-indexed", "conservator-exhibit-recorded",
]);

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isNa = (value) => value?.toLowerCase() === NA;
export const validDate = (value) => /^20\d\d-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const ticked = (value) => [...(value ?? "").matchAll(/`([^`]+)`/g)].map((match) => match[1].trim());

function listRecordFiles(root) {
  const dir = path.join(root, RECORD_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => `${RECORD_DIR}/${entry.name}`)
    .sort();
}

function splitRecords(content) {
  const records = [];
  let current = null;
  for (const line of content.split("\n")) {
    const heading = line.match(/^## (Claim Record\b.*?)\s*$/);
    if (heading) {
      if (current) records.push(current);
      current = { title: heading[1], body: [] };
    } else if (line.startsWith("## ")) {
      if (current) records.push(current);
      current = null;
    } else if (current) current.body.push(line);
  }
  if (current) records.push(current);
  return records.map((record) => ({ title: record.title, body: record.body.join("\n") }));
}

function fieldValues(body, key) {
  return [...body.matchAll(new RegExp(`^${escape(key)}:[ \\t]*(.*)$`, "gm"))].map((match) => match[1].trim());
}

export function templateFields(root) {
  const file = path.join(root, TEMPLATE_DOC);
  if (!fs.existsSync(file)) return null;
  const section = fs.readFileSync(file, "utf8").split(/^## Claim Record Template\s*$/m)[1];
  const block = section?.match(/^```txt\n([\s\S]*?)^```/m)?.[1];
  return block ? [...block.matchAll(/^([A-Z][^:\n]*):/gm)].map((match) => match[1]) : null;
}

export function evidenceFamilies(root) {
  const file = path.join(root, FAMILY_DOC);
  if (!fs.existsSync(file)) return new Set();
  return new Set([...structuralMarkdown(fs.readFileSync(file, "utf8")).matchAll(/^## `([a-z-]+)`\s*$/gm)].map((match) => match[1]));
}

function classifyRef(ref) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(ref)) return "id";
  if (ref.includes("/")) return "path";
  if (/^[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+$/.test(ref)) return "id";
  return "invalid";
}

function resolvesInside(root, ref) {
  if (/[\\]/.test(ref) || ref.startsWith("/")) return null;
  const target = path.resolve(root, ref.split(/[?#]/)[0]);
  return target.startsWith(`${path.resolve(root)}${path.sep}`) ? target : null;
}

const isFile = (target) => Boolean(target) && fs.existsSync(target) && fs.statSync(target).isFile();

// An installed package ships only its declared files; a repository checkout ships everything. A ref
// to a repository-only file is a warning in an installed package and a failure in a checkout.
function packagedFiles(root) {
  if (fs.existsSync(path.join(root, ".git"))) return null;
  try {
    const files = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).files;
    return Array.isArray(files) ? new Set(files) : null;
  } catch { return null; }
}

export function recordAnchor(file, number) {
  return `${file}#claim-record-${number}`;
}

export function runRegistrar({ root = galleryRoot, now = new Date(), exhibitList = exhibitSlugs } = {}) {
  const failures = [];
  const warnings = [];
  const fail = (rule, where, message) => failures.push(`${where}: ${message} [${rule}]`);
  const warn = (rule, where, message) => warnings.push(`${where}: ${message} [${rule}]`);
  const today = now.toISOString().slice(0, 10);
  const files = listRecordFiles(root);
  const families = evidenceFamilies(root);
  const packaged = packagedFiles(root);
  const exhibits = new Set(exhibitList);
  const register = [];

  const template = templateFields(root);
  if (!template) fail("template-sync", TEMPLATE_DOC, "has no ```txt block under ## Claim Record Template");
  else if (template.join("|") !== RECORD_FIELDS.join("|")) {
    fail("template-sync", TEMPLATE_DOC, `template fields [${template.join(", ")}] differ from the Registrar's [${RECORD_FIELDS.join(", ")}]`);
  }

  const indexText = fs.existsSync(path.join(root, RECORD_INDEX)) ? structuralMarkdown(fs.readFileSync(path.join(root, RECORD_INDEX), "utf8")) : "";
  const titles = new Map();

  for (const relative of files) {
    const records = splitRecords(structuralMarkdown(fs.readFileSync(path.join(root, relative), "utf8")));
    if (records.length > 0 && !new RegExp(`\\]\\(${escape(path.posix.basename(relative))}\\)`).test(indexText)) {
      fail("record-file-indexed", relative, `holds claim records but is not linked from ${RECORD_INDEX}`);
    }
    const numbers = new Set();
    for (const record of records) {
      const where = `${relative}: ${record.title}`;
      const heading = record.title.match(/^Claim Record (\d+) - (\S.*)$/);
      if (!heading) fail("record-title-format", where, 'title must read "Claim Record <number> - <title>"');
      const number = heading ? Number(heading[1]) : null;
      if (number !== null) {
        if (numbers.has(number)) fail("record-number-unique", where, `record number ${number} is used twice in ${relative}`);
        numbers.add(number);
        const key = heading[2].toLowerCase();
        if (titles.has(key)) fail("record-title-unique", where, `title duplicates ${titles.get(key)}`);
        else titles.set(key, where);
      }

      const values = {};
      for (const key of RECORD_FIELDS) {
        const found = fieldValues(record.body, key);
        if (found.length > 1) fail("field-not-repeated", where, `${key} appears ${found.length} times`);
        values[key] = found[0] ?? null;
        if (values[key] === null) fail("field-present", where, `${key} field is missing`);
        else if (values[key] === "") fail("field-present", where, `${key} must be a value or "${NA}"`);
      }
      for (const key of STATEMENT_FIELDS) {
        if (values[key] && isNa(values[key])) fail("statement-not-empty", where, `${key.toLowerCase()} must be a non-empty statement`);
      }

      const decision = values.Decision?.match(/^([a-z_]+)\b/)?.[1] ?? null;
      if (values.Decision !== null && (!decision || !DECISIONS.has(decision))) fail("decision-value", where, "decision must begin with pass, review_required, or blocked");
      const verifiedBy = values["Verified by"];
      if (verifiedBy !== null && !VERDICTS.has(verifiedBy)) fail("verified-by-value", where, "verified by must be auto, human, or mixed");

      const reviewedAt = values["Reviewed at"];
      const reviewedOk = Boolean(reviewedAt) && validDate(reviewedAt);
      if (reviewedAt !== null && !reviewedOk) fail("reviewed-at-date", where, "reviewed at must be a real YYYY-MM-DD date");
      if (reviewedOk && reviewedAt > today) fail("reviewed-at-not-future", where, `reviewed at ${reviewedAt} is after today ${today}`);

      const reviewBy = values["Review by"];
      const reviewByDate = reviewBy && !isNa(reviewBy) && validDate(reviewBy) ? reviewBy : null;
      if (reviewBy && !isNa(reviewBy) && !reviewByDate) fail("review-by-value", where, `review by must be a real YYYY-MM-DD date or "${NA}"`);
      if (reviewByDate && reviewedOk && reviewByDate < reviewedAt) fail("review-by-after-reviewed-at", where, `review by ${reviewByDate} is before reviewed at ${reviewedAt}`);
      const overdue = Boolean(reviewByDate && reviewByDate < today);
      if (overdue) warn("review-by-overdue", where, `review by ${reviewByDate} has passed; re-review the claim`);

      const revision = values["Source revision"];
      if (revision && !isNa(revision) && !/^[0-9a-f]{7,40}$/.test(revision) && !/^https:\/\/\S+$/.test(revision)) {
        fail("source-revision-format", where, `source revision must be a 7-40 character lowercase commit SHA, an https URL, or "${NA}"`);
      }
      if (revision && !isNa(revision) && !reviewByDate) fail("external-source-review-by", where, "a claim bound to an external source revision needs a review by date");

      const conflicts = values["Conflicts with"];
      const conflictRefs = conflicts && !isNa(conflicts) ? ticked(conflicts) : [];
      if (conflicts && !isNa(conflicts) && conflictRefs.length === 0) fail("conflicts-with-format", where, `conflicts with must be backticked record refs or "${NA}"`);
      for (const ref of conflictRefs) {
        if (!/^quality\/claim-records\/[a-z0-9-]+\.md#claim-record-\d+$/.test(ref)) fail("conflicts-with-format", where, `conflict ref ${ref} must read quality/claim-records/<file>.md#claim-record-<number>`);
      }

      const evidence = values["Evidence refs"];
      let evidenceRefs = [];
      if (evidence !== null && (!evidence || isNa(evidence))) fail("evidence-refs-present", where, "evidence refs must name at least one backticked ref");
      else if (evidence) {
        evidenceRefs = ticked(evidence);
        if (evidenceRefs.length === 0) fail("evidence-refs-backticked", where, "evidence refs must be wrapped in backticks");
        for (const ref of evidenceRefs) {
          const kind = classifyRef(ref);
          if (kind === "invalid") fail("evidence-ref-kind", where, `evidence ref ${ref} is neither a repository path nor a StableRef id`);
          else if (kind === "path" && !isFile(resolvesInside(root, ref))) {
            const inside = resolvesInside(root, ref);
            if (inside && packaged && !packaged.has(ref.split(/[?#]/)[0])) warn("evidence-ref-exists", where, `evidence ref ${ref} is repository-only and not shipped in this package`);
            else fail("evidence-ref-exists", where, `evidence ref ${ref} does not resolve to an existing repository file`);
          }
          const exhibit = ref.match(/^sg:\/\/conservator\/(.+)$/)?.[1];
          if (exhibit !== undefined && !exhibits.has(exhibit)) fail("conservator-ref-resolves", where, `evidence ref ${ref} names no Conservator exhibit`);
        }
      }

      const familyValues = values["Evidence family"] && !isNa(values["Evidence family"]) ? ticked(values["Evidence family"]) : [];
      if (values["Evidence family"] && !isNa(values["Evidence family"]) && familyValues.length === 0) fail("evidence-family-known", where, "evidence family must list backticked family names");
      for (const family of familyValues) {
        if (!families.has(family)) fail("evidence-family-known", where, `evidence family ${family} is not defined in ${FAMILY_DOC}`);
      }

      const consumer = values["Consumer reference"];
      if (consumer && consumer !== "not_applicable") {
        const target = ticked(consumer)[0] ?? consumer;
        if (!/^[a-z0-9][a-z0-9._/-]*\.json$/.test(target) || target.includes("..") || !isFile(resolvesInside(root, target))) {
          fail("consumer-reference-format", where, "consumer reference must be not_applicable or one existing repository-relative JSON record");
        }
      }
      const reason = values["Consumer reference reason"];
      if (consumer === "not_applicable" && reason !== null && !/^[A-Z].*\S[.!?]$/.test(reason)) {
        fail("consumer-reference-reason", where, "a not_applicable consumer reference needs a one-sentence reason");
      }

      if (verifiedBy === "auto") {
        if (decision && decision !== "pass") fail("auto-pass-only", where, `auto verification is not allowed for a ${decision} decision`);
        for (const ref of evidenceRefs) {
          const executable = classifyRef(ref) === "id" || ref.startsWith("scripts/") || ref.startsWith("tests/");
          if (!executable) fail("auto-executable-refs", where, `auto verification requires executable evidence refs (scripts/, tests/, or a StableRef id), not ${ref}`);
        }
        if (values["Evidence family"] && !familyValues.includes("validator")) fail("auto-validator-family", where, "auto verification requires the validator evidence family");
        const term = HUMAN_OUTCOME_TERMS.find((word) => new RegExp(`\\b${word}\\b`, "i").test(values.Claim ?? ""));
        if (term) fail("auto-no-human-outcome-terms", where, `auto verification cannot certify the human-outcome term "${term}" in the claim`);
      } else if (verifiedBy === "human" || verifiedBy === "mixed") {
        if (!evidenceRefs.some((ref) => ref.startsWith("quality/evidence/") || ref.startsWith("quality/gates/"))) {
          fail("human-review-artifact", where, `${verifiedBy} verification requires a human-review evidence ref under quality/evidence/ or quality/gates/`);
        }
      }

      register.push({
        anchor: number === null ? null : recordAnchor(relative, number), file: relative, title: record.title,
        decision, verified_by: verifiedBy, reviewed_at: reviewedAt, review_by: reviewBy, overdue, conflicts: conflictRefs,
        exhibits: evidenceRefs.map((ref) => ref.match(/^sg:\/\/conservator\/(.+)$/)?.[1]).filter(Boolean),
      });
    }
  }

  const anchors = new Map(register.filter(({ anchor }) => anchor).map((entry) => [entry.anchor, entry]));
  for (const entry of register) {
    const where = `${entry.file}: ${entry.title}`;
    for (const ref of entry.conflicts) {
      const other = anchors.get(ref);
      if (!other || other === entry) fail("conflicts-with-resolves", where, `conflict ref ${ref} names no other claim record`);
      else if (!other.conflicts.includes(entry.anchor)) fail("conflicts-with-reciprocal", where, `conflict with ${ref} is not recorded on that record`);
    }
  }
  for (const slug of exhibitList) {
    const owners = register.filter((entry) => entry.exhibits.includes(slug));
    if (owners.length !== 1) fail("conservator-exhibit-recorded", `sg://conservator/${slug}`, `Conservator exhibit needs exactly one claim record citing it, found ${owners.length}`);
  }
  if (register.length === 0) fail("records-present", RECORD_DIR, "no claim records found");

  return {
    ok: failures.length === 0, files: files.length, records: register.length, rules: REGISTRAR_RULES.length,
    failures: [...new Set(failures)], warnings: [...new Set(warnings)], register,
  };
}

// Query views of the register for agents and reviewers (R6): records past their review date, and
// records whose verdict is not fully automated.
export function registrarView(result, { stale = false, unverified = false } = {}) {
  let register = result.register;
  if (stale) register = register.filter((entry) => entry.overdue);
  if (unverified) register = register.filter((entry) => entry.verified_by !== "auto");
  return { ...result, register };
}

export function parseRegistrarArgs(argv) {
  const options = { stale: false, unverified: false, root: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--stale" || flag === "--unverified") options[flag.slice(2)] = true;
    else if (flag === "--root" && argv[index + 1] && !argv[index + 1].startsWith("--")) options.root = path.resolve(argv[++index]);
    else if (flag === "--json") continue;
    else throw Object.assign(new Error(`Unknown or incomplete registrar argument: ${flag}`), { code: "argument_invalid" });
  }
  return options;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const options = parseRegistrarArgs(argv);
  const result = registrarView(runRegistrar({ root: options.root }), options);
  if (argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else if (result.ok) console.log(`ok: ${result.records} claim records in ${result.files} files pass ${result.rules} Registrar rules${result.warnings.length ? `\n${result.warnings.join("\n")}` : ""}`);
  else console.error(result.failures.join("\n"));
  process.exitCode = result.ok ? 0 : 1;
}
