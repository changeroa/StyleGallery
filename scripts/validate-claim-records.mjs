#!/usr/bin/env node

// Markdown claim records under quality/claim-records/ are the source of truth. This checks the
// machine-readable fields on each "## Claim Record" section; it cannot prove the semantics of a
// claim, only that its warrant, boundary, evidence references, verdict, and freshness fields are
// present, well-formed, internally consistent, and that each referenced path exists.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { structuralMarkdown } from "./markdown-structure.mjs";

const RECORD_DIR = "quality/claim-records";
const VERDICTS = new Set(["auto", "human", "mixed"]);
const DECISIONS = new Set(["pass", "review_required", "blocked"]);
const FIELD_KEYS = [
  "Warrant", "Boundary or limitation", "Decision",
  "Evidence refs", "Verified by", "Reviewed at", "Review by", "Source revision", "Conflicts with",
];

const validDate = (value) => /^20\d\d-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

function listRecordFiles(root) {
  const dir = path.join(root, RECORD_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(RECORD_DIR, entry.name))
    .sort();
}

// Split a file into record bodies keyed by their "## Claim Record ..." heading.
function splitRecords(content) {
  const lines = content.split("\n");
  const records = [];
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^## (Claim Record .+?)\s*$/);
    if (heading) {
      if (current) records.push(current);
      current = { title: heading[1], body: [] };
    } else if (line.startsWith("## ")) {
      if (current) records.push(current);
      current = null;
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) records.push(current);
  return records.map((record) => ({ title: record.title, body: record.body.join("\n") }));
}

function field(body, key) {
  const match = body.match(new RegExp(`^${key.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}:[ \\t]*(.*)$`, "m"));
  return match ? match[1].trim() : null;
}

function refs(value) {
  return [...value.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim());
}

function classifyRef(ref) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(ref)) return "id";
  if (ref.includes("/")) return "path";
  if (/^[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+$/.test(ref)) return "id";
  return "invalid";
}

function pathExists(root, ref) {
  if (/[\\]/.test(ref) || ref.startsWith("/")) return false;
  const target = path.resolve(root, ref.split(/[?#]/)[0]);
  return target.startsWith(`${path.resolve(root)}${path.sep}`) && fs.existsSync(target) && fs.statSync(target).isFile();
}

export function validateClaimRecords({ root = process.cwd() } = {}) {
  const failures = [];
  const files = listRecordFiles(root);
  let records = 0;

  for (const relative of files) {
    const content = structuralMarkdown(fs.readFileSync(path.join(root, relative), "utf8"));
    for (const record of splitRecords(content)) {
      records += 1;
      const where = `${relative}: ${record.title}`;
      const values = {};
      for (const key of FIELD_KEYS) values[key] = field(record.body, key);

      const warrant = values.Warrant;
      if (!warrant || warrant.toLowerCase() === "not applicable") failures.push(`${where}: warrant must be a non-empty statement`);
      const boundary = values["Boundary or limitation"];
      if (!boundary || boundary.toLowerCase() === "not applicable") failures.push(`${where}: boundary or limitation must be a non-empty statement`);

      const decisionRaw = values.Decision;
      const decision = decisionRaw?.match(/^([a-z_]+)\b/)?.[1] ?? null;
      if (!decision || !DECISIONS.has(decision)) failures.push(`${where}: decision must begin with pass, review_required, or blocked`);

      const verifiedBy = values["Verified by"];
      if (!verifiedBy || !VERDICTS.has(verifiedBy)) failures.push(`${where}: verified by must be auto, human, or mixed`);

      const reviewedAt = values["Reviewed at"];
      if (!reviewedAt || !validDate(reviewedAt)) failures.push(`${where}: reviewed at must be a real YYYY-MM-DD date`);

      for (const key of ["Review by", "Source revision", "Conflicts with"]) {
        if (values[key] === null || values[key] === "") failures.push(`${where}: ${key.toLowerCase()} must be a value or "not applicable"`);
      }
      if (values["Review by"] && values["Review by"].toLowerCase() !== "not applicable" && !validDate(values["Review by"])) {
        failures.push(`${where}: review by must be a real YYYY-MM-DD date or "not applicable"`);
      }

      const evidenceValue = values["Evidence refs"];
      let evidenceRefs = [];
      if (!evidenceValue || evidenceValue.toLowerCase() === "not applicable") {
        failures.push(`${where}: evidence refs must name at least one backticked ref`);
      } else {
        evidenceRefs = refs(evidenceValue);
        if (evidenceRefs.length === 0) failures.push(`${where}: evidence refs must be wrapped in backticks`);
        for (const ref of evidenceRefs) {
          const kind = classifyRef(ref);
          if (kind === "invalid") failures.push(`${where}: evidence ref ${ref} is neither a repository path nor a StableRef id`);
          else if (kind === "path" && !pathExists(root, ref)) failures.push(`${where}: evidence ref ${ref} does not resolve to an existing repository file`);
        }
      }

      // R5: automation certifies only machine-checkable, passing claims.
      if (verifiedBy === "auto") {
        if (decision && decision !== "pass") failures.push(`${where}: auto verification is not allowed for a ${decision} decision`);
        for (const ref of evidenceRefs) {
          const kind = classifyRef(ref);
          const executable = kind === "id" || ref.startsWith("scripts/") || ref.startsWith("tests/");
          if (!executable) failures.push(`${where}: auto verification requires executable evidence refs (scripts/, tests/, or a StableRef id), not ${ref}`);
        }
      } else if (verifiedBy === "human" || verifiedBy === "mixed") {
        const hasHumanArtifact = evidenceRefs.some((ref) => ref.startsWith("quality/evidence/") || ref.startsWith("quality/gates/"));
        if (!hasHumanArtifact) failures.push(`${where}: ${verifiedBy} verification requires a human-review evidence ref under quality/evidence/ or quality/gates/`);
      }
    }
  }

  if (records === 0) failures.push(`${RECORD_DIR}: no claim records found`);
  return { ok: failures.length === 0, files: files.length, records, failures: [...new Set(failures)] };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = validateClaimRecords();
  if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else if (result.ok) console.log(`ok: ${result.records} claim records in ${result.files} files`);
  else console.error(result.failures.join("\n"));
  process.exitCode = result.ok ? 0 : 1;
}
