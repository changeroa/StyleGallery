#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateDesignTerminology } from "./validate-design-terminology.mjs";

const source = fs.readFileSync(path.resolve("design-terminology/conflict-cases.md"), "utf8");
const termLine = source.split("\n").find((line) => line.includes("`figma.variable`") && line.includes("named-design-value"));
const relationLine = source.split("\n").find((line) => line.includes("`partial_overlap`") && line.includes("Exportable variables"));

const cases = [
  { name: "ok", expect: null },
  { name: "unknown_relation_type", mutate: [relationLine, relationLine.replace("partial_overlap", "overlaps")], expect: "unknown relation type overlaps" },
  { name: "empty_boundary", mutate: [relationLine, relationLine.replace(/Exportable.*\|/, "|")], expect: "boundary must be a non-trivial scope statement" },
  { name: "unrecorded_relation_target", mutate: [relationLine, relationLine.replace("`dtcg.token`", "`dtcg.unknown`")], expect: "to-term must be a recorded term" },
  { name: "orphan_term", mutate: [termLine, termLine.replace("`figma.variable`", "`figma.ghost`")], expect: "orphan term figma.ghost" },
  { name: "bad_date", mutate: [termLine, termLine.replace("2026-08-18", "Aug 18")], expect: "reviewed_on must be YYYY-MM-DD" },
  { name: "bad_status", mutate: [termLine, termLine.replace("| current | file-", "| maybe | file-")], expect: "status must be current, deprecated, historical, or unknown" },
  { name: "bad_source_kind", mutate: [termLine, termLine.replace("`design-tool`", "`cool-tool`")], expect: "source must name a closed source kind or an aggregate marker" },
];

let failures = 0;
for (const testCase of cases) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `sg-term-${testCase.name}-`));
  fs.mkdirSync(path.join(dir, "design-terminology"), { recursive: true });
  const content = testCase.mutate ? source.replace(testCase.mutate[0], testCase.mutate[1]) : source;
  fs.writeFileSync(path.join(dir, "design-terminology/conflict-cases.md"), content);
  const result = validateDesignTerminology({ root: dir });
  const passed = testCase.expect === null ? result.ok : !result.ok && result.failures.some((failure) => failure.includes(testCase.expect));
  if (!passed) { failures += 1; console.error(`FAIL ${testCase.name}:`, result.failures.slice(0, 3)); }
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(JSON.stringify({ ok: failures === 0, cases: cases.length, failures }));
process.exitCode = failures === 0 ? 0 : 1;
