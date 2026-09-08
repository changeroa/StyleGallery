#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateDesignTerminology } from "./validate-design-terminology.mjs";

// Synthetic sources test invariants only. They make no real terminology claims.
const term = (id, label, status = "current", source = "Example") => `| \`sample.${id}\` | ${label} | [${source}](https://example.org/terms/${id}) (\`design-system\`) | concept-${id} | ${status} | version 2025.10 | 2026-09-08 |`;
const relation = (from, to, type, scope = "catalog", direction = "directional", boundary = "The declared sample scope includes this mapping and excludes unrelated instances.") => `| \`sample.${from}\` | \`sample.${to}\` | \`${type}\` | ${scope} | ${direction} | ${boundary} | 2026-09-08 |`;
const terms = [term("a", "Alpha"), term("b", "Beta"), term("c", "Gamma"), term("d", "Delta")];
const relations = [relation("a", "b", "broader_than"), relation("b", "c", "broader_than"), relation("c", "d", "implementation_representation", "output")];
const base = [
  "# Synthetic terms", "", "## Term Records", "",
  "| Term | Label | Source (kind) | Concept | Status | Scope | Reviewed on |",
  "| --- | --- | --- | --- | --- | --- | --- |", ...terms, "",
  "## Recorded Relations", "",
  "| From | To | Type | Scope | Direction | Boundary | Reviewed on |",
  "| --- | --- | --- | --- | --- | --- | --- |", ...relations, "",
].join("\n");
const change = (before, after) => (content) => {
  assert.ok(content.includes(before), `fixture mutation target missing: ${before}`);
  const changed = content.replace(before, after);
  assert.notEqual(changed, content, "fixture mutation must change bytes");
  return changed;
};
const add = (row) => (content) => `${content}${row}\n`;
const temporal = (content) => content.replace(terms[0], term("a", "Alpha", "historical"))
  .replace(relations[0], relation("a", "b", "renamed_to", "rename", "directional", "Example replaced Alpha with Beta in version 2025.10; the old label is historical."));

const cases = [
  { name: "valid", expected: null },
  { name: "valid_inverse", mutate: add(relation("b", "a", "narrower_than")), expected: null },
  { name: "separate_scope", mutate: add(relation("b", "a", "broader_than", "other-scope")), expected: null },
  { name: "valid_temporal", mutate: temporal, expected: null },
  { name: "valid_leap_date", mutate: change("2026-09-08", "2024-02-29"), expected: null },
  { name: "duplicate_term", mutate: change(terms[0], `${terms[0]}\n${terms[0]}`), expected: "duplicate term" },
  { name: "missing_label", mutate: change("| Alpha |", "| |"), expected: "missing label" },
  { name: "aggregate_source", mutate: change("[Example](https://example.org/terms/a) (`design-system`)", "multiple systems"), expected: "source must name one" },
  { name: "bad_source_kind", mutate: change("`design-system`", "`cool-tool`"), expected: "source must name one" },
  { name: "unsafe_source", mutate: change("https://example.org/terms/a", "javascript:alert"), expected: "source locator" },
  { name: "local_source_missing", mutate: change("https://example.org/terms/a", "missing.md"), expected: "source locator" },
  { name: "local_source_escape", mutate: change("https://example.org/terms/a", "../../outside.md"), expected: "source locator" },
  { name: "bad_status", mutate: change("| current |", "| maybe |"), expected: "status must be" },
  { name: "bad_date", mutate: change("2026-09-08", "Sep 8"), expected: "real YYYY-MM-DD" },
  { name: "impossible_day", mutate: change("2026-09-08", "2026-02-30"), expected: "real YYYY-MM-DD" },
  { name: "non_leap_day", mutate: change("2026-09-08", "2025-02-29"), expected: "real YYYY-MM-DD" },
  { name: "historical_scope_missing", mutate: change(terms[0], term("a", "Alpha", "historical").replace("version 2025.10", "unspecified era")), expected: "historical term requires" },
  { name: "unknown_relation", mutate: change("`broader_than`", "`overlaps`"), expected: "unknown relation type" },
  { name: "unrecorded_term", mutate: change(relations[0], relations[0].replace("`sample.b`", "`sample.ghost`")), expected: "to-term must be" },
  { name: "orphan_term", mutate: change(terms[0], `${terms[0]}\n${term("unused", "Unused")}`), expected: "orphan term" },
  { name: "self_relation", mutate: add(relation("a", "a", "broader_than")), expected: "self relation" },
  { name: "empty_boundary", mutate: change(relations[0], relation("a", "b", "broader_than", "catalog", "directional", "")), expected: "non-trivial scope" },
  { name: "empty_scope", mutate: change("| catalog |", "| |"), expected: "scope must be" },
  { name: "bad_direction", mutate: change("| directional |", "| symmetric |"), expected: "invalid direction" },
  { name: "duplicate_relation", mutate: add(relations[0]), expected: "duplicate or contradictory" },
  { name: "same_direction_contradiction", mutate: add(relation("a", "b", "narrower_than")), expected: "duplicate or contradictory" },
  { name: "reverse_contradiction", mutate: add(relation("b", "a", "broader_than")), expected: "conflicting reverse" },
  { name: "cycle_three_nodes", mutate: add(relation("c", "a", "broader_than")), expected: "containment cycle" },
  { name: "reverse_representation", mutate: add(relation("d", "c", "implementation_representation", "output")), expected: "conflicting reverse" },
  { name: "same_label_mismatch", mutate: change(relations[0], relation("a", "b", "same_label_different_meaning", "labels", "symmetric")), expected: "requires identical labels" },
  { name: "rename_without_event", mutate: (content) => temporal(content).replace("Example replaced Alpha with Beta in version 2025.10; the old label is historical.", "The source replaced this label at an unspecified point in its history."), expected: "time or version basis" },
  { name: "rename_across_sources", mutate: (content) => temporal(content).replace("[Example](https://example.org/terms/b)", "[Other](https://example.org/terms/b)"), expected: "one named source" },
  { name: "rename_current_source", mutate: (content) => temporal(content).replace("| historical |", "| current |"), expected: "temporal relation requires" },
  { name: "deprecation_status", mutate: (content) => temporal(content).replace("`renamed_to`", "`deprecated_in_favor_of`"), expected: "deprecation requires" },
  { name: "records_only_in_fence", mutate: (content) => `\x60\x60\x60md\n${content}\x60\x60\x60\n`, expected: "expected exactly one section" },
  { name: "records_only_in_comment", mutate: (content) => `<!--\n${content}\n-->`, expected: "expected exactly one section" },
  { name: "wrong_heading_level", mutate: change("## Term Records", "### Term Records"), expected: "expected exactly one section" },
  { name: "inline_heading", mutate: change("## Term Records", "text ## Term Records"), expected: "expected exactly one section" },
  { name: "duplicate_section", mutate: (content) => `${content}\n## Term Records\n`, expected: "expected exactly one section" },
  { name: "invalid_header", mutate: change("| From | To |", "| Start | End |"), expected: "unexpected table header" },
  { name: "empty_records", mutate: (content) => content.replace(terms.join("\n"), ""), expected: "missing records" },
];

const results = [];
for (const testCase of cases) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sg-term-${testCase.name}-`));
  try {
    fs.mkdirSync(path.join(root, "design-terminology"));
    fs.writeFileSync(path.join(root, "design-terminology/conflict-cases.md"), testCase.mutate ? testCase.mutate(base) : base);
    const result = validateDesignTerminology({ root });
    const ok = testCase.expected === null ? result.ok : !result.ok && result.failures.some((failure) => failure.includes(testCase.expected));
    results.push({ name: testCase.name, ok, ...(!ok ? { actual: result.failures } : {}) });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
const corpus = validateDesignTerminology();
results.push({ name: "current_corpus", ok: corpus.ok, ...(!corpus.ok ? { actual: corpus.failures } : {}) });
const report = { ok: results.every(({ ok }) => ok), cases: results.length, failures: results.filter(({ ok }) => !ok) };
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;
