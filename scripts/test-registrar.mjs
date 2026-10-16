#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RECORD_FIELDS, REGISTRAR_RULES, registrarView, runRegistrar } from "./registrar.mjs";

// Synthetic records test invariants only. They make no real quality claims.
const now = new Date("2026-10-16T12:00:00Z");
const autoFields = {
  Principle: "Synthetic principle.",
  Claim: "The synthetic layout keeps one scroll owner.",
  Context: "Synthetic context.",
  "Use case": "not applicable",
  Warrant: "Synthetic warrant connecting the evidence to the claim.",
  "Evidence family": "`validator`, `screenshot`",
  "Verification protocol": "Run the synthetic oracle.",
  "Implementation handoff": "not applicable",
  "Consumer reference": "not_applicable",
  "Consumer reference reason": "This synthetic record selects no consumer reference.",
  "Boundary or limitation": "Synthetic boundary naming what the evidence cannot prove.",
  "Debt or escalation": "Synthetic escalation path.",
  Decision: "pass when the oracle is green.",
  "Evidence refs": "`scripts/oracle.mjs`, `sg://conservator/stack`",
  "Verified by": "auto",
  "Reviewed at": "2026-10-15",
  "Review by": "not applicable",
  "Source revision": "not applicable",
  "Conflicts with": "not applicable",
};
const humanFields = {
  ...autoFields,
  Claim: "A synthetic review decision blocks the change.",
  "Evidence family": "`rationale`, `user`",
  Decision: "blocked when the gate fails.",
  "Evidence refs": "`quality/evidence/review.md`, `quality/gates/gate.md`",
  "Verified by": "human",
};
const record = (title, fields, extra = []) => [
  `## Claim Record ${title}`, "",
  ...Object.entries(fields).filter(([, value]) => value !== undefined).map(([key, value]) => `${key}: ${value}`),
  ...extra, "",
].join("\n");
const document = (records) => ["---", "type: Quality Reference", "title: Synthetic", "---", "", "# Synthetic records", "", ...records, "## IA Navigation", "", "Parent: none.", ""].join("\n");
const base = ({ auto = {}, human = {}, autoTitle = "1 - Auto", humanTitle = "2 - Human", autoExtra = [] } = {}) => document([
  record(autoTitle, { ...autoFields, ...auto }, autoExtra),
  record(humanTitle, { ...humanFields, ...human }),
]);
const template = (fields) => `# Claims\n\n## Claim Record Template\n\n\`\`\`txt\n${fields.map((field) => `${field}:`).join("\n")}\n\`\`\`\n`;
const families = ["validator", "screenshot", "accessibility", "user", "source", "rationale"].map((family) => `## \`${family}\`\n\nDefinition.\n`).join("\n");
const anchor1 = "quality/claim-records/samples.md#claim-record-1";
const anchor2 = "quality/claim-records/samples.md#claim-record-2";

const cases = [
  { name: "valid", files: {}, expected: null },
  { name: "valid_mixed_review_required", files: { samples: base({ human: { "Verified by": "mixed", Decision: "review_required when only screenshots exist." } }) }, expected: null },
  { name: "valid_review_by_and_sha", files: { samples: base({ auto: { "Review by": "2027-01-31", "Source revision": "55a3499" } }) }, expected: null },
  { name: "valid_https_revision", files: { samples: base({ auto: { "Review by": "2027-01-31", "Source revision": "https://example.com/spec" } }) }, expected: null },
  { name: "valid_leap_date", files: { samples: base({ auto: { "Reviewed at": "2024-02-29" } }) }, expected: null },
  { name: "valid_reciprocal_conflict", files: { samples: base({ auto: { "Conflicts with": `\`${anchor2}\`` }, human: { "Conflicts with": `\`${anchor1}\`` } }) }, expected: null },
  { name: "valid_consumer_reference_record", files: { samples: base({ auto: { "Consumer reference": "`consumer-reference/record.json`" } }) }, expected: null },
  { name: "overdue_review_is_a_warning", files: { samples: base({ auto: { "Review by": "2026-10-15" } }) }, expected: null, warning: "review-by-overdue" },
  { name: "package_only_ref_is_a_warning", files: { samples: base({ human: { "Evidence refs": "`quality/evidence/review.md`, `scripts/repo-only.mjs`" } }), "package.json": JSON.stringify({ files: ["quality/evidence/review.md"] }) }, expected: null, warning: "evidence-ref-exists" },

  { name: "records_only_in_fence", files: { samples: `\x60\x60\x60md\n${base()}\x60\x60\x60\n` }, expected: "records-present", exhibits: [] },
  { name: "records_only_in_comment", files: { samples: `<!--\n${base()}\n-->\n` }, expected: "records-present", exhibits: [] },
  { name: "bad_title", files: { samples: base({ autoTitle: "One" }) }, expected: "record-title-format" },
  { name: "duplicate_number", files: { samples: base({ humanTitle: "1 - Other" }) }, expected: "record-number-unique" },
  { name: "duplicate_title", files: { samples: base({ humanTitle: "2 - auto" }) }, expected: "record-title-unique" },
  { name: "template_drift", files: { "quality/claims.md": template(RECORD_FIELDS.filter((field) => field !== "Context")) }, expected: "template-sync" },
  { name: "template_missing", files: { "quality/claims.md": "# Claims\n" }, expected: "template-sync" },
  { name: "missing_principle", files: { samples: base({ auto: { Principle: undefined } }) }, expected: "field-present" },
  { name: "missing_debt", files: { samples: base({ human: { "Debt or escalation": undefined } }) }, expected: "field-present" },
  { name: "missing_verified_by", files: { samples: base({ auto: { "Verified by": undefined } }) }, expected: "field-present" },
  { name: "missing_source_revision", files: { samples: base({ auto: { "Source revision": undefined } }) }, expected: "field-present" },
  { name: "empty_review_by", files: { samples: base({ auto: { "Review by": "" } }) }, expected: "field-present" },
  { name: "repeated_field", files: { samples: base({ autoExtra: ["Decision: blocked when anything fails."] }) }, expected: "field-not-repeated" },
  { name: "na_warrant", files: { samples: base({ auto: { Warrant: "not applicable" } }) }, expected: "statement-not-empty" },
  { name: "na_boundary", files: { samples: base({ auto: { "Boundary or limitation": "not applicable" } }) }, expected: "statement-not-empty" },
  { name: "na_claim", files: { samples: base({ human: { Claim: "Not Applicable" } }) }, expected: "statement-not-empty" },
  { name: "bad_decision", files: { samples: base({ auto: { Decision: "maybe later." } }) }, expected: "decision-value" },
  { name: "bad_verified_by", files: { samples: base({ auto: { "Verified by": "robot" } }) }, expected: "verified-by-value" },
  { name: "bad_reviewed_at", files: { samples: base({ auto: { "Reviewed at": "Oct 15" } }) }, expected: "reviewed-at-date" },
  { name: "impossible_reviewed_at", files: { samples: base({ auto: { "Reviewed at": "2025-02-29" } }) }, expected: "reviewed-at-date" },
  { name: "future_reviewed_at", files: { samples: base({ auto: { "Reviewed at": "2026-12-01" } }) }, expected: "reviewed-at-not-future" },
  { name: "bad_review_by", files: { samples: base({ auto: { "Review by": "soon" } }) }, expected: "review-by-value" },
  { name: "review_by_before_reviewed_at", files: { samples: base({ auto: { "Review by": "2026-10-01" } }) }, expected: "review-by-after-reviewed-at" },
  { name: "bad_source_revision", files: { samples: base({ auto: { "Source revision": "main branch", "Review by": "2027-01-31" } }) }, expected: "source-revision-format" },
  { name: "http_source_revision", files: { samples: base({ auto: { "Source revision": "http://example.com", "Review by": "2027-01-31" } }) }, expected: "source-revision-format" },
  { name: "external_source_without_review_by", files: { samples: base({ auto: { "Source revision": "55a3499" } }) }, expected: "external-source-review-by" },
  { name: "unticked_conflict", files: { samples: base({ auto: { "Conflicts with": "record two" } }) }, expected: "conflicts-with-format" },
  { name: "conflict_bad_shape", files: { samples: base({ auto: { "Conflicts with": "`samples.md#2`" } }) }, expected: "conflicts-with-format" },
  { name: "conflict_missing_record", files: { samples: base({ auto: { "Conflicts with": "`quality/claim-records/samples.md#claim-record-9`" } }) }, expected: "conflicts-with-resolves" },
  { name: "conflict_self", files: { samples: base({ auto: { "Conflicts with": `\`${anchor1}\`` } }) }, expected: "conflicts-with-resolves" },
  { name: "conflict_one_sided", files: { samples: base({ auto: { "Conflicts with": `\`${anchor2}\`` } }) }, expected: "conflicts-with-reciprocal" },
  { name: "na_evidence_refs", files: { samples: base({ human: { "Evidence refs": "not applicable" } }) }, expected: "evidence-refs-present" },
  { name: "unticked_evidence_refs", files: { samples: base({ human: { "Evidence refs": "quality/evidence/review.md" } }) }, expected: "evidence-refs-backticked" },
  { name: "invalid_evidence_ref", files: { samples: base({ auto: { "Evidence refs": "`Not A Ref`, `sg://conservator/stack`" } }) }, expected: "evidence-ref-kind" },
  { name: "nonexistent_evidence_ref", files: { samples: base({ auto: { "Evidence refs": "`scripts/missing.mjs`, `sg://conservator/stack`" } }) }, expected: "evidence-ref-exists" },
  { name: "escaping_evidence_ref", files: { samples: base({ auto: { "Evidence refs": "`scripts/../../outside.mjs`, `sg://conservator/stack`" } }) }, expected: "evidence-ref-exists" },
  { name: "unknown_conservator_exhibit", files: { samples: base({ auto: { "Evidence refs": "`scripts/oracle.mjs`, `sg://conservator/stack`, `sg://conservator/absent`" } }) }, expected: "conservator-ref-resolves" },
  { name: "unknown_evidence_family", files: { samples: base({ auto: { "Evidence family": "`validator`, `rendered`" } }) }, expected: "evidence-family-known" },
  { name: "unticked_evidence_family", files: { samples: base({ human: { "Evidence family": "rationale" } }) }, expected: "evidence-family-known" },
  { name: "consumer_reference_not_json", files: { samples: base({ auto: { "Consumer reference": "`consumer-reference/index.md`" } }) }, expected: "consumer-reference-format" },
  { name: "consumer_reference_missing_file", files: { samples: base({ auto: { "Consumer reference": "`consumer-reference/absent.json`" } }) }, expected: "consumer-reference-format" },
  { name: "consumer_reference_reason_fragment", files: { samples: base({ auto: { "Consumer reference reason": "none" } }) }, expected: "consumer-reference-reason" },
  { name: "auto_blocked", files: { samples: base({ auto: { Decision: "blocked when anything fails." } }) }, expected: "auto-pass-only" },
  { name: "auto_review_required", files: { samples: base({ auto: { Decision: "review_required for people." } }) }, expected: "auto-pass-only" },
  { name: "auto_human_only_ref", files: { samples: base({ auto: { "Evidence refs": "`quality/evidence/review.md`, `sg://conservator/stack`" } }) }, expected: "auto-executable-refs" },
  { name: "auto_without_validator_family", files: { samples: base({ auto: { "Evidence family": "`screenshot`" } }) }, expected: "auto-validator-family" },
  { name: "auto_human_outcome_term", files: { samples: base({ auto: { Claim: "The synthetic layout is accessible for everyone." } }) }, expected: "auto-no-human-outcome-terms" },
  { name: "auto_readable_term", files: { samples: base({ auto: { Claim: "The measure keeps prose readable." } }) }, expected: "auto-no-human-outcome-terms" },
  { name: "human_without_review_artifact", files: { samples: base({ human: { "Evidence refs": "`scripts/oracle.mjs`" } }) }, expected: "human-review-artifact" },
  { name: "mixed_without_review_artifact", files: { samples: base({ human: { "Verified by": "mixed", Decision: "review_required when unclear.", "Evidence refs": "`sg://claim/synthetic`" } }) }, expected: "human-review-artifact" },
  { name: "record_file_not_indexed", files: { "quality/claim-records/index.md": "# Claim Records\n" }, expected: "record-file-indexed" },
  { name: "exhibit_without_record", files: { samples: base({ auto: { "Evidence refs": "`scripts/oracle.mjs`" } }) }, expected: "conservator-exhibit-recorded" },
  { name: "exhibit_cited_twice", files: { samples: base({ human: { "Evidence refs": "`quality/evidence/review.md`, `sg://conservator/stack`" } }) }, expected: "conservator-exhibit-recorded" },
];

const defaults = () => ({
  "quality/claims.md": template(RECORD_FIELDS),
  "quality/evidence/families.md": `# Families\n\n${families}`,
  "quality/claim-records/index.md": "# Claim Records\n\n- [Samples](samples.md)\n",
  "quality/claim-records/samples.md": base(),
  "scripts/oracle.mjs": "export {};\n",
  "quality/evidence/review.md": "# Review\n",
  "quality/gates/gate.md": "# Gate\n",
  "consumer-reference/record.json": "{}\n",
  "consumer-reference/index.md": "# Index\n",
});

const results = [];
const exercised = new Set();
for (const testCase of cases) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sg-registrar-${testCase.name}-`));
  try {
    const files = defaults();
    for (const [key, content] of Object.entries(testCase.files)) files[key === "samples" ? "quality/claim-records/samples.md" : key] = content;
    for (const [relative, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
      fs.writeFileSync(path.join(root, relative), content);
    }
    const result = runRegistrar({ root, now, exhibitList: testCase.exhibits ?? ["stack"] });
    const tagged = (list, rule) => list.some((entry) => entry.endsWith(`[${rule}]`));
    let ok = testCase.expected === null ? result.ok : !result.ok && tagged(result.failures, testCase.expected);
    if (testCase.warning) ok = ok && tagged(result.warnings, testCase.warning);
    if (ok && testCase.expected) exercised.add(testCase.expected);
    if (ok && testCase.warning) exercised.add(testCase.warning);
    results.push({ name: testCase.name, ok, ...(!ok ? { actual: result.failures, warnings: result.warnings } : {}) });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

const uncovered = REGISTRAR_RULES.filter((rule) => !exercised.has(rule));
results.push({ name: "every_rule_has_a_failing_fixture", ok: uncovered.length === 0, ...(uncovered.length ? { actual: uncovered } : {}) });

const corpus = runRegistrar({ now });
results.push({ name: "current_corpus", ok: corpus.ok && corpus.records >= 49, ...(!corpus.ok ? { actual: corpus.failures } : {}) });
const unverified = registrarView(corpus, { unverified: true });
results.push({ name: "unverified_view", ok: unverified.register.length > 0 && unverified.register.every((entry) => entry.verified_by !== "auto") });
const stale = registrarView(corpus, { stale: true });
results.push({ name: "stale_view", ok: stale.register.every((entry) => entry.overdue) });

assert.equal(results.length, cases.length + 4);
const report = { ok: results.every(({ ok }) => ok), cases: results.length, rules: REGISTRAR_RULES.length, failures: results.filter(({ ok }) => !ok) };
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;
