#!/usr/bin/env node

// Validates Design Terminology record consistency in design-terminology/conflict-cases.md.
// Enforces the human contract in relation-types.md as machine rules: closed relation types,
// recorded terms on both sides of every relation, non-trivial boundaries, forbidden
// contradiction pairs, date/status shape, and no orphan terms.

import fs from "node:fs";
import path from "node:path";

const RELATION_TYPES = new Set([
  "equivalent_within_scope", "near_equivalent", "partial_overlap", "broader_than", "narrower_than",
  "implementation_representation", "renamed_to", "deprecated_in_favor_of", "same_label_different_meaning", "not_comparable",
]);
const SOURCE_KINDS = new Set(["design-system", "platform-guideline", "specification", "design-tool", "pattern-library", "brand-style-guide", "web-platform"]);
const AGGREGATE_SOURCES = /^(multiple systems|industry history|industry usage|tool, code, tokens)/;
const STATUSES = new Set(["current", "deprecated", "historical", "unknown"]);
const DATE = /^20\d\d-\d{2}-\d{2}$/;

export function validateDesignTerminology({ root = process.cwd() } = {}) {
  const failures = [];
  const relative = "design-terminology/conflict-cases.md";
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) {
    return { ok: false, terms: 0, relations: 0, failures: [`${relative}: missing file`] };
  }
  const content = fs.readFileSync(target, "utf8");
  const section = (heading) => content.split(`## ${heading}`)[1]?.split("\n## ")[0] ?? "";
  const rows = (body) => body.split("\n")
    .filter((line) => /^\|.*\|\s*$/.test(line.trim()))
    .map((line) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim()))
    .filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell)))
    .slice(1);
  const codeTokens = (text) => [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]);

  const termRows = rows(section("Term Records"));
  const terms = new Map();
  termRows.forEach((row, index) => {
    const location = `${relative} term row ${index + 1}`;
    if (row.length !== 6) { failures.push(`${location}: expected 6 columns`); return; }
    const [termCell, sourceCell, concept, status, scope, reviewed] = row;
    const tokens = codeTokens(termCell);
    if (tokens.length === 0) failures.push(`${location}: term must carry a backticked identifier`);
    const kindTokens = codeTokens(sourceCell).filter((token) => SOURCE_KINDS.has(token));
    if (kindTokens.length === 0 && !AGGREGATE_SOURCES.test(sourceCell)) {
      failures.push(`${location}: source must name a closed source kind or an aggregate marker`);
    }
    if (kindTokens.length > 1) failures.push(`${location}: source must carry exactly one source kind`);
    if (!concept) failures.push(`${location}: missing concept`);
    if (!STATUSES.has(status)) failures.push(`${location}: status must be current, deprecated, historical, or unknown`);
    if (!scope) failures.push(`${location}: missing scope`);
    if (!DATE.test(reviewed)) failures.push(`${location}: reviewed_on must be YYYY-MM-DD`);
    for (const token of tokens.slice(0, 1)) terms.set(token, location);
  });

  const relationRows = rows(section("Recorded Relations"));
  const pairs = new Map();
  relationRows.forEach((row, index) => {
    const location = `${relative} relation row ${index + 1}`;
    if (row.length !== 4) { failures.push(`${location}: expected 4 columns`); return; }
    const [fromCell, toCell, typeCell, boundary] = row;
    const type = typeCell.replaceAll("`", "");
    if (!RELATION_TYPES.has(type)) failures.push(`${location}: unknown relation type ${type}`);
    const from = codeTokens(fromCell)[0];
    const to = codeTokens(toCell)[0];
    if (!from || !terms.has(from)) failures.push(`${location}: from-term must be a recorded term`);
    if (!to || !terms.has(to)) failures.push(`${location}: to-term must be a recorded term`);
    if (!boundary || boundary === type) failures.push(`${location}: boundary must be a non-trivial scope statement`);
    if ((type === "renamed_to" || type === "deprecated_in_favor_of") && !/\b(19|20)\d\d\b/.test(boundary)) {
      failures.push(`${location}: ${type} requires a time or version basis in the boundary`);
    }
    if (from && to) {
      const key = `${from}->${to}`;
      const reverseKey = `${to}->${from}`;
      const existing = pairs.get(key);
      if (existing === type) failures.push(`${location}: duplicate relation for ${key}`);
      if (type === "broader_than" && existing === "narrower_than") failures.push(`${location}: ${key} cannot record broader_than and narrower_than together`);
      if (type === "narrower_than" && existing === "broader_than") failures.push(`${location}: ${key} cannot record narrower_than and broader_than together`);
      if (type === "equivalent_within_scope" && existing === "not_comparable") failures.push(`${location}: ${key} cannot record equivalent_within_scope and not_comparable together`);
      if (type === "not_comparable" && existing === "equivalent_within_scope") failures.push(`${location}: ${key} cannot record not_comparable and equivalent_within_scope together`);
      if (type === "broader_than" && pairs.get(reverseKey) === "broader_than") failures.push(`${location}: ${key} conflicts with reverse broader_than`);
      pairs.set(key, type);
      for (const token of [from, to]) {
        const count = relationRows.filter((other) => codeTokens(other[0])[0] === token || codeTokens(other[1])[0] === token).length;
        terms.set(token, `${token} referenced ${count}`);
      }
    }
  });

  for (const [token] of terms) {
    const used = relationRows.some((row) => codeTokens(row[0])[0] === token || codeTokens(row[1])[0] === token);
    if (!used) failures.push(`${relative}: orphan term ${token} has no recorded relation`);
  }
  if (termRows.length === 0) failures.push(`${relative}: missing Term Records rows`);
  if (relationRows.length === 0) failures.push(`${relative}: missing Recorded Relations rows`);

  return { ok: failures.length === 0, terms: termRows.length, relations: relationRows.length, failures: [...new Set(failures)] };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).endsWith("validate-design-terminology.mjs");
if (isMain) {
  const result = validateDesignTerminology();
  if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else if (result.ok) console.log(`ok: ${result.terms} terms, ${result.relations} relations`);
  else console.error(result.failures.join("\n"));
  process.exitCode = result.ok ? 0 : 1;
}
