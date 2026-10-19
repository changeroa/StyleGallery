#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defaultMarkdownPath, defaultRecordPath, validateHigPrinciples } from "./validate-hig-principles.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(repositoryRoot, "scripts", "validate-hig-principles.mjs");
const fixtureDirectory = "tests/fixtures/hig-principles";

function runValidator(args) {
  const child = spawnSync(process.execPath, [validator, ...args, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  let report = null;
  try {
    report = JSON.parse(child.stdout);
  } catch {
    report = null;
  }
  return { report, status: child.status };
}

const codesOf = (report) => [...new Set((report?.failures ?? []).map((item) => item.code))].sort();
const sameCodes = (actual, expected) => actual.length === expected.length && actual.every((code, index) => code === expected[index]);

// Each committed fixture must produce exactly the listed failure codes; a valid fixture produces none.
const fixtureCases = [
  { expected: [], fixture: "valid-minimal.json" },
  { expected: ["field_missing"], fixture: "missing-field.json" },
  { expected: ["class_unknown"], fixture: "unknown-class.json" },
  { expected: ["id_duplicate"], fixture: "duplicate-id.json" },
];

const results = [];
for (const { expected, fixture } of fixtureCases) {
  const { report, status } = runValidator(["--record", `${fixtureDirectory}/${fixture}`, "--skip-markdown"]);
  const codes = codesOf(report);
  const exitOk = expected.length === 0 ? status === 0 : status === 1;
  results.push({ actual: { codes, status }, expected: { codes: expected, status: expected.length === 0 ? 0 : 1 }, name: `fixture:${fixture}`, ok: exitOk && sameCodes(codes, expected) });
}

const repository = runValidator([]);
results.push({ actual: { codes: codesOf(repository.report), status: repository.status }, expected: { codes: [], status: 0 }, name: "repository-record-and-guide", ok: repository.status === 0 && repository.report?.ok === true });

// In-memory mutations of the real record cover cross-file and reference checks.
const record = JSON.parse(fs.readFileSync(path.join(repositoryRoot, defaultRecordPath), "utf8"));
const markdown = fs.readFileSync(path.join(repositoryRoot, defaultMarkdownPath), "utf8");
const firstId = record.principles[0].id;
const covered = record.source_pages.find((page) => page.disposition === "covered");
const extracted = record.source_pages.find((page) => page.disposition === "extracted");
const mutations = [
  { expected: ["markdown_missing_id"], name: "markdown-drift", options: { markdown: markdown.replaceAll(`\`${firstId}\``, "`removed`") }, record },
  { expected: ["covered_by_unknown"], name: "dangling-covered-by", record: { ...record, source_pages: record.source_pages.map((page) => (page === covered ? { ...page, covered_by: "hig.none.none.none" } : page)) } },
  { expected: ["reference_unknown"], name: "unknown-wcag-criterion", record: { ...record, principles: record.principles.map((item, index) => (index === 0 ? { ...item, wcag: [...item.wcag, "9.9.9"] } : item)) } },
  { expected: ["inventory_unextracted"], name: "extracted-page-without-principle", record: { ...record, principles: record.principles.filter((item) => item.page !== extracted.page) } },
  { expected: ["source_url_mismatch"], name: "source-url-mismatch", record: { ...record, principles: record.principles.map((item, index) => (index === 0 ? { ...item, source_url: "https://example.com/hig" } : item)) } },
];
for (const mutation of mutations) {
  const report = validateHigPrinciples(mutation.record, mutation.options ?? { markdown });
  const codes = codesOf(report);
  // Removing a page's principles can also leave reference entries unused; only the named code is required.
  const ok = report.ok === false && mutation.expected.every((code) => codes.includes(code));
  results.push({ actual: { codes }, expected: { includes: mutation.expected }, name: `mutation:${mutation.name}`, ok });
}

const report = { ok: results.every((item) => item.ok), results };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.ok ? 0 : 1;
