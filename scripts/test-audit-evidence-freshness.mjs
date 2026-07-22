#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { cleanupFixture, completeSession, initializeConsumer } from "./page-evidence-fixture.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const auditor = path.join(repositoryRoot, "scripts", "audit-evidence-freshness.mjs");
const calibration = path.join(repositoryRoot, "consumer-reference", "baselines", "calibration.json");
const selectedCase = process.argv.find((argument) => argument === "--case") ? process.argv[process.argv.indexOf("--case") + 1] : null;
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-freshness-"));

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function run(args) {
  const child = spawnSync(process.execPath, [auditor, ...args, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  let report;
  try {
    report = JSON.parse(child.stdout);
  } catch (error) {
    report = null;
  }
  return { child, report };
}

function result(name, expected, actual, ok) {
  return { actual, expected, name, ok };
}

function pageSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://stylegallery.test/page-evidence-manifest.schema.json",
    additionalProperties: false,
    properties: {
      record_kind: { const: "page_evidence_manifest" },
      review_by: { format: "date-time", type: "string" },
      schema_version: { const: "1.0" },
    },
    required: ["record_kind", "review_by", "schema_version"],
    type: "object",
  };
}

function pageFixture(file, reviewBy) {
  writeJson(file, { record_kind: "page_evidence_manifest", review_by: reviewBy, schema_version: "1.0" });
}

function selected(cases) {
  if (!selectedCase) return cases;
  const match = cases.filter((testCase) => testCase.name === selectedCase);
  if (match.length === 0) {
    return [result(selectedCase, "known --case", { cases: cases.map((testCase) => testCase.name) }, false)];
  }
  return match;
}

const pageSchemaPath = path.join(tempRoot, "page-evidence-manifest.schema.json");
writeJson(pageSchemaPath, pageSchema());
const pagePreDeadline = path.join(tempRoot, "review-window.json");
pageFixture(pagePreDeadline, "2026-07-27T00:00:00Z");
const pagePastDeadline = path.join(tempRoot, "review-past-deadline.json");
pageFixture(pagePastDeadline, "2026-07-20T00:00:00Z");
const pageAtDeadline = path.join(tempRoot, "review-at-deadline.json");
pageFixture(pageAtDeadline, "2026-07-21T00:00:00Z");
const pageFresh = path.join(tempRoot, "review-fresh.json");
pageFixture(pageFresh, "2026-08-20T00:00:00Z");
const malformed = path.join(tempRoot, "malformed.json");
fs.writeFileSync(malformed, '{"record_kind":"page_evidence_manifest","review_by":"not-a-date","schema_version":"1.0"}\n');
const unknown = path.join(tempRoot, "unknown.json");
writeJson(unknown, { record_kind: "unsupported_evidence_manifest", schema_version: "1.0" });
const missing = path.join(tempRoot, "missing.json");
const missingPageSchema = path.join(tempRoot, "missing-page-evidence-manifest.schema.json");
const completedPageFixture = initializeConsumer();
const completedPage = completeSession(completedPageFixture);
if (completedPage.validate?.status !== 0) throw new Error(`full page fixture failed: ${JSON.stringify(completedPage.validate?.report ?? completedPage.finalize?.report)}`);
const completeManifest = JSON.parse(fs.readFileSync(path.join(completedPage.session.artifactRoot, "page-evidence-manifest.json"), "utf8"));
const impossibleDateRecords = [
  ["impossible-session-started-at", (value) => { value.session.started_at = "2023-02-30T12:00:00Z"; }],
  ["impossible-session-completed-at", (value) => { value.session.completed_at = "2023-02-30T12:00:00Z"; }],
  ["impossible-manifest-completed-at", (value) => { value.completed_at = "2023-02-30T12:00:00Z"; }],
  ["impossible-scenario-recorded-at", (value) => { value.scenarios[0].recorded_at = "2023-02-30T12:00:00Z"; }],
].map(([name, mutate]) => {
  const value = structuredClone(completeManifest);
  mutate(value);
  const file = path.join(tempRoot, `${name}.json`);
  writeJson(file, value);
  return { file, name };
});

const cases = [
  (() => {
    const actual = run(["--record", pageFresh, "--page-schema", pageSchemaPath, "--as-of", "2023-02-30T12:00:00Z", "--mode", "advisory"]);
    return result("impossible-as-of", "exit nonzero with as_of_invalid", { codes: actual.report?.failures?.map((item) => item.code), status: actual.child.status }, actual.child.status !== 0 && actual.report?.failures?.some((item) => item.code === "as_of_invalid"));
  })(),
  ...impossibleDateRecords.map(({ file, name }) => (() => {
    const actual = run(["--record", file, "--as-of", "2026-07-21T00:00:00Z", "--mode", "advisory"]);
    return result(name, "exit nonzero with freshness_record_invalid", { codes: actual.report?.failures?.map((item) => item.code), status: actual.child.status }, actual.child.status !== 0 && actual.report?.failures?.some((item) => item.code === "freshness_record_invalid"));
  })()),
  (() => {
    const actual = run(["--record", calibration, "--as-of", "2026-07-01T00:00:00Z", "--mode", "advisory"]);
    return result("fresh-calibration", "exit 0 with status fresh and no warnings", { codes: actual.report?.failures?.map((item) => item.code), status: actual.child.status, statuses: actual.report?.records?.map((item) => item.status) }, actual.child.status === 0 && actual.report?.ok === true && actual.report.records[0]?.status === "fresh" && actual.report.warnings.length === 0);
  })(),
  (() => {
    const actual = run(["--record", calibration, "--as-of", "2026-07-21T00:00:00Z", "--mode", "advisory"]);
    return result("expiring-calibration-advisory", "exit 0 with expiring status and evidence_expiring warning", { codes: actual.report?.warnings?.map((item) => item.code), status: actual.child.status, statuses: actual.report?.records?.map((item) => item.status) }, actual.child.status === 0 && actual.report?.ok === true && actual.report.records[0]?.status === "expiring" && actual.report.warnings.some((item) => item.code === "evidence_expiring"));
  })(),
  (() => {
    const actual = run(["--record", calibration, "--as-of", "2026-07-28T00:00:00Z", "--mode", "advisory"]);
    return result("expired-calibration-advisory", "exit 0 with expired status and warning", { codes: actual.report?.warnings?.map((item) => item.code), status: actual.child.status, statuses: actual.report?.records?.map((item) => item.status) }, actual.child.status === 0 && actual.report?.ok === true && actual.report.records[0]?.status === "expired" && actual.report.warnings.some((item) => item.code === "evidence_expired"));
  })(),
  (() => {
    const actual = run(["--record", pagePreDeadline, "--page-schema", pageSchemaPath, "--as-of", "2026-07-21T00:00:00Z", "--mode", "advisory"]);
    return result("pre-deadline-page-advisory", "exit 0 with expiring status and evidence_expiring warning", { codes: actual.report?.warnings?.map((item) => item.code), status: actual.child.status, statuses: actual.report?.records?.map((item) => item.status) }, actual.child.status === 0 && actual.report?.ok === true && actual.report.records[0]?.status === "expiring" && actual.report.warnings.some((item) => item.code === "evidence_expiring"));
  })(),
  (() => {
    const actual = run(["--record", pagePreDeadline, "--page-schema", pageSchemaPath, "--as-of", "2026-07-21T00:00:00Z", "--mode", "blocking"]);
    return result("pre-deadline-review-window-blocking", "exit 0 with expiring status, advisory evidence_expiring warning, and no blocking failure", { failureCodes: actual.report?.failures?.map((item) => item.code), warningCodes: actual.report?.warnings?.map((item) => item.code), status: actual.child.status, statuses: actual.report?.records?.map((item) => item.status) }, actual.child.status === 0 && actual.report?.ok === true && actual.report.records[0]?.status === "expiring" && actual.report.warnings.some((item) => item.code === "evidence_expiring") && actual.report.failures.length === 0);
  })(),
  (() => {
    const actual = run(["--record", pagePastDeadline, "--page-schema", pageSchemaPath, "--as-of", "2026-07-21T00:00:00Z", "--mode", "advisory"]);
    return result("review-due-page-advisory", "exit 0 with review_due status and evidence_review_due warning", { codes: actual.report?.warnings?.map((item) => item.code), status: actual.child.status, statuses: actual.report?.records?.map((item) => item.status) }, actual.child.status === 0 && actual.report?.ok === true && actual.report.records[0]?.status === "review_due" && actual.report.warnings.some((item) => item.code === "evidence_review_due"));
  })(),
  (() => {
    const before = fs.readFileSync(calibration);
    const actual = run(["--record", calibration, "--record", pagePreDeadline, "--page-schema", pageSchemaPath, "--as-of", "2026-07-21T00:00:00Z", "--mode", "advisory"]);
    const after = fs.readFileSync(calibration);
    return result("repeated-record-and-source-immutability", "two records are audited and calibration bytes remain unchanged", { bytesUnchanged: before.equals(after), count: actual.report?.records?.length, status: actual.child.status }, actual.child.status === 0 && actual.report?.records?.length === 2 && before.equals(after));
  })(),
  (() => {
    const actual = run(["--record", pageFresh, "--page-schema", pageSchemaPath, "--as-of", "2026-07-21T00:00:00Z", "--mode", "advisory"]);
    return result("fresh-page-review", "exit 0 with fresh page evidence", { status: actual.child.status, statuses: actual.report?.records?.map((item) => item.status) }, actual.child.status === 0 && actual.report?.records[0]?.status === "fresh");
  })(),
  (() => {
    const actual = run(["--record", malformed, "--page-schema", pageSchemaPath, "--as-of", "2026-07-21T00:00:00Z", "--mode", "advisory"]);
    return result("malformed-advisory", "exit nonzero with freshness_record_invalid", { codes: actual.report?.failures?.map((item) => item.code), status: actual.child.status }, actual.child.status !== 0 && actual.report?.ok === false && actual.report.failures.some((item) => item.code === "freshness_record_invalid"));
  })(),
  (() => {
    const actual = run(["--record", unknown, "--as-of", "2026-07-21T00:00:00Z", "--mode", "advisory"]);
    return result("unknown-record-kind", "exit nonzero with freshness_record_invalid", { codes: actual.report?.failures?.map((item) => item.code), status: actual.child.status }, actual.child.status !== 0 && actual.report?.failures.some((item) => item.code === "freshness_record_invalid"));
  })(),
  (() => {
    const actual = run(["--record", missing, "--as-of", "2026-07-21T00:00:00Z", "--mode", "advisory"]);
    return result("unreadable-record", "exit nonzero with freshness_record_unreadable", { codes: actual.report?.failures?.map((item) => item.code), status: actual.child.status }, actual.child.status !== 0 && actual.report?.failures.some((item) => item.code === "freshness_record_unreadable"));
  })(),
  (() => {
    const actual = run(["--record", pagePreDeadline, "--page-schema", missingPageSchema, "--as-of", "2026-07-21T00:00:00Z", "--mode", "advisory"]);
    return result("missing-page-schema", "exit nonzero with freshness_schema_missing", { codes: actual.report?.failures?.map((item) => item.code), status: actual.child.status }, actual.child.status !== 0 && actual.report?.failures.some((item) => item.code === "freshness_schema_missing"));
  })(),
  (() => {
    const actual = run(["--record", calibration, "--as-of", "2026-07-28T00:00:00Z", "--mode", "blocking"]);
    return result("expired-calibration-blocking", "exit nonzero with evidence_expired", { codes: actual.report?.failures?.map((item) => item.code), status: actual.child.status }, actual.child.status !== 0 && actual.report?.failures.some((item) => item.code === "evidence_expired"));
  })(),
  (() => {
    const actual = run(["--record", pagePastDeadline, "--page-schema", pageSchemaPath, "--as-of", "2026-07-21T00:00:00Z", "--mode", "blocking"]);
    return result("review-due-blocking", "exit nonzero with evidence_review_due", { codes: actual.report?.failures?.map((item) => item.code), status: actual.child.status, statuses: actual.report?.records?.map((item) => item.status) }, actual.child.status !== 0 && actual.report?.ok === false && actual.report.records[0]?.status === "review_due" && actual.report.failures.some((item) => item.code === "evidence_review_due"));
  })(),
  (() => {
    const actual = run(["--record", pageAtDeadline, "--page-schema", pageSchemaPath, "--as-of", "2026-07-21T00:00:00Z", "--mode", "blocking"]);
    return result("page-at-review-deadline-blocking", "exit nonzero with review_due/evidence_review_due at the deadline", { codes: actual.report?.failures?.map((item) => item.code), status: actual.child.status, statuses: actual.report?.records?.map((item) => item.status) }, actual.child.status !== 0 && actual.report?.ok === false && actual.report.records[0]?.status === "review_due" && actual.report.failures.some((item) => item.code === "evidence_review_due"));
  })(),
];

try {
  const report = { ok: selected(cases).every((testCase) => testCase.ok), results: selected(cases) };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.ok ? 0 : 1;
} finally {
  cleanupFixture(completedPageFixture);
  fs.rmSync(tempRoot, { force: true, recursive: true });
}
