#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateClaimRecords } from "./validate-claim-records.mjs";

// Synthetic records test invariants only. They make no real quality claims.
const record = (title, fields) => [
  `## Claim Record ${title}`, "",
  "Principle: Synthetic principle.", "",
  "Claim: Synthetic claim.", "",
  `Warrant: ${fields.warrant ?? "Synthetic warrant connecting the evidence to the claim."}`, "",
  `Boundary or limitation: ${fields.boundary ?? "Synthetic boundary naming what the evidence cannot prove."}`, "",
  `Decision: ${fields.decision}`,
  ...(fields.refs === undefined ? [] : [`Evidence refs: ${fields.refs}`]),
  ...(fields.verified === undefined ? [] : [`Verified by: ${fields.verified}`]),
  ...(fields.reviewed === undefined ? [] : [`Reviewed at: ${fields.reviewed}`]),
  ...(fields.reviewBy === undefined ? [] : [`Review by: ${fields.reviewBy}`]),
  ...(fields.revision === undefined ? [] : [`Source revision: ${fields.revision}`]),
  ...(fields.conflicts === undefined ? [] : [`Conflicts with: ${fields.conflicts}`]),
  "",
].join("\n");
const defaults = { reviewed: "2026-10-15", reviewBy: "not applicable", revision: "not applicable", conflicts: "not applicable" };
const auto = { ...defaults, decision: "pass when the oracle is green.", refs: "`scripts/oracle.mjs`, `sg://claim/synthetic`", verified: "auto" };
const human = { ...defaults, decision: "blocked when the gate fails.", refs: "`quality/evidence/review.md`, `quality/gates/gate.md`", verified: "human" };
const document = (records) => ["---", "type: Quality Reference", "title: Synthetic", "---", "", "# Synthetic records", "", ...records, "## IA Navigation", "", "Parent: none.", ""].join("\n");
const base = (overrides = {}) => document([record("1 - Auto", { ...auto, ...overrides.auto }), record("2 - Human", { ...human, ...overrides.human })]);

const cases = [
  { name: "valid", content: base(), expected: null },
  { name: "valid_mixed_review_required", content: base({ human: { verified: "mixed", decision: "review_required when only screenshots exist." } }), expected: null },
  { name: "valid_human_pass", content: base({ human: { decision: "pass when reviewed." } }), expected: null },
  { name: "valid_review_by_date", content: base({ auto: { reviewBy: "2027-01-31" } }), expected: null },
  { name: "valid_leap_date", content: base({ auto: { reviewed: "2024-02-29" } }), expected: null },
  { name: "empty_warrant", content: base({ auto: { warrant: "" } }), expected: "warrant must be" },
  { name: "na_boundary", content: base({ auto: { boundary: "not applicable" } }), expected: "boundary or limitation must be" },
  { name: "bad_decision", content: base({ auto: { decision: "maybe later." } }), expected: "decision must begin" },
  { name: "bad_verified_by", content: base({ auto: { verified: "robot" } }), expected: "verified by must be" },
  { name: "missing_verified_by", content: base({ auto: { verified: undefined } }), expected: "verified by must be" },
  { name: "bad_reviewed_at", content: base({ auto: { reviewed: "Oct 15" } }), expected: "reviewed at must be" },
  { name: "impossible_reviewed_at", content: base({ auto: { reviewed: "2025-02-29" } }), expected: "reviewed at must be" },
  { name: "bad_review_by", content: base({ auto: { reviewBy: "soon" } }), expected: "review by must be" },
  { name: "missing_source_revision", content: base({ auto: { revision: undefined } }), expected: "source revision must be" },
  { name: "missing_conflicts_with", content: base({ auto: { conflicts: undefined } }), expected: "conflicts with must be" },
  { name: "missing_evidence_refs", content: base({ auto: { refs: undefined } }), expected: "evidence refs must name" },
  { name: "unticked_evidence_refs", content: base({ auto: { refs: "scripts/oracle.mjs" } }), expected: "wrapped in backticks" },
  { name: "nonexistent_evidence_ref", content: base({ auto: { refs: "`scripts/missing.mjs`" } }), expected: "does not resolve" },
  { name: "escaping_evidence_ref", content: base({ auto: { refs: "`scripts/../../outside.mjs`" } }), expected: "does not resolve" },
  { name: "invalid_evidence_ref", content: base({ auto: { refs: "`Not A Ref`" } }), expected: "neither a repository path" },
  { name: "auto_blocked", content: base({ auto: { decision: "blocked when anything fails." } }), expected: "auto verification is not allowed for a blocked" },
  { name: "auto_review_required", content: base({ auto: { decision: "review_required for people." } }), expected: "auto verification is not allowed for a review_required" },
  { name: "auto_human_only_ref", content: base({ auto: { refs: "`quality/evidence/review.md`" } }), expected: "auto verification requires executable" },
  { name: "human_without_review_artifact", content: base({ human: { refs: "`scripts/oracle.mjs`" } }), expected: "human verification requires a human-review" },
  { name: "mixed_without_review_artifact", content: base({ human: { verified: "mixed", refs: "`sg://claim/synthetic`" } }), expected: "mixed verification requires a human-review" },
  { name: "records_only_in_fence", content: `\x60\x60\x60md\n${base()}\x60\x60\x60\n`, expected: "no claim records found" },
  { name: "records_only_in_comment", content: `<!--\n${base()}\n-->\n`, expected: "no claim records found" },
];

const results = [];
for (const testCase of cases) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sg-claims-${testCase.name}-`));
  try {
    for (const [relative, content] of Object.entries({
      "quality/claim-records/samples.md": testCase.content,
      "scripts/oracle.mjs": "export {};\n",
      "quality/evidence/review.md": "# Review\n",
      "quality/gates/gate.md": "# Gate\n",
    })) {
      fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
      fs.writeFileSync(path.join(root, relative), content);
    }
    const result = validateClaimRecords({ root });
    const ok = testCase.expected === null ? result.ok : !result.ok && result.failures.some((failure) => failure.includes(testCase.expected));
    results.push({ name: testCase.name, ok, ...(!ok ? { actual: result.failures } : {}) });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
const corpus = validateClaimRecords();
results.push({ name: "current_corpus", ok: corpus.ok && corpus.records >= 4, ...(!corpus.ok ? { actual: corpus.failures } : {}) });
assert.ok(results.length === cases.length + 1);
const report = { ok: results.every(({ ok }) => ok), cases: results.length, failures: results.filter(({ ok }) => !ok) };
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;
