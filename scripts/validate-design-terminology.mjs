#!/usr/bin/env node

// Markdown remains the term-record source of truth. This checks record and graph
// consistency; it cannot prove the semantics of an external source or judgment.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { structuralMarkdown } from "./markdown-structure.mjs";

const RELATION_TYPES = new Set([
  "equivalent_within_scope", "near_equivalent", "partial_overlap", "broader_than", "narrower_than",
  "implementation_representation", "renamed_to", "deprecated_in_favor_of", "same_label_different_meaning", "not_comparable",
]);
const SYMMETRIC_TYPES = new Set(["equivalent_within_scope", "partial_overlap", "same_label_different_meaning", "not_comparable"]);
const SOURCE_KINDS = new Set(["design-system", "platform-guideline", "specification", "design-tool", "pattern-library", "brand-style-guide", "web-platform"]);
const STATUSES = new Set(["current", "deprecated", "historical", "unknown"]);
const TERM_ID = /^[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+$/;
const identifier = (cell) => /^`([^`]+)`$/.exec(cell)?.[1];
const validDate = (value) => /^20\d\d-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

function table(content, heading, expectedHeader, failures) {
  const sections = content.split(new RegExp(`^## ${heading}\\s*$`, "m"));
  if (sections.length !== 2) {
    failures.push(`${heading}: expected exactly one section`);
    return [];
  }
  const rows = sections[1].split("\n## ")[0].split("\n")
    .filter((line) => /^\|.*\|\s*$/.test(line.trim()))
    .map((line) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim()));
  if (JSON.stringify(rows[0]) !== JSON.stringify(expectedHeader)) failures.push(`${heading}: unexpected table header`);
  if (!rows[1]?.every((cell) => /^:?-+:?$/.test(cell)) || rows[1]?.length !== expectedHeader.length) {
    failures.push(`${heading}: missing table separator`);
  }
  const records = rows.slice(2);
  if (records.length === 0) failures.push(`${heading}: missing records`);
  return records;
}

function validLocator(locator, root) {
  if (!locator) return false;
  if (locator.startsWith("https://")) {
    try {
      const url = new URL(locator);
      return Boolean(url.hostname) && !url.username && !url.password;
    } catch { return false; }
  }
  if (/[\\\s]/.test(locator) || /^[a-z]+:/i.test(locator) || locator.startsWith("/")) return false;
  const target = path.resolve(root, "design-terminology", locator.split(/[?#]/)[0]);
  return target.startsWith(`${path.resolve(root)}${path.sep}`) && fs.existsSync(target) && fs.statSync(target).isFile();
}

function hasCycle(edges) {
  const visited = new Set();
  const visiting = new Set();
  function visit(node) {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of edges.get(node) ?? []) if (visit(next)) return true;
    visiting.delete(node);
    visited.add(node);
    return false;
  }
  return [...edges.keys()].some(visit);
}

export function validateDesignTerminology({ root = process.cwd() } = {}) {
  const failures = [];
  const relative = "design-terminology/conflict-cases.md";
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) return { ok: false, terms: 0, relations: 0, failures: [`${relative}: missing file`] };
  const content = structuralMarkdown(fs.readFileSync(target, "utf8"));
  const termRows = table(content, "Term Records", ["Term", "Label", "Source (kind)", "Concept", "Status", "Scope", "Reviewed on"], failures);
  const terms = new Map();
  termRows.forEach((row, index) => {
    const location = `${relative} term row ${index + 1}`;
    if (row.length !== 7) { failures.push(`${location}: expected 7 columns`); return; }
    const [termCell, label, sourceCell, concept, status, scope, reviewed] = row;
    const id = identifier(termCell);
    const source = /^\[([^\]]+)\]\(([^)]+)\)\s+\(`([^`]+)`\)$/.exec(sourceCell);
    if (!id || !TERM_ID.test(id)) failures.push(`${location}: term must carry one source-qualified identifier`);
    if (terms.has(id)) failures.push(`${location}: duplicate term ${id}`);
    if (!label) failures.push(`${location}: missing label`);
    if (!source || !SOURCE_KINDS.has(source[3])) failures.push(`${location}: source must name one closed source kind and direct locator`);
    if (!validLocator(source?.[2], root)) failures.push(`${location}: source locator must be HTTPS or an existing repository document`);
    if (!concept) failures.push(`${location}: missing concept`);
    if (!STATUSES.has(status)) failures.push(`${location}: status must be current, deprecated, historical, or unknown`);
    if (!scope) failures.push(`${location}: missing scope`);
    if (!validDate(reviewed)) failures.push(`${location}: reviewed_on must be a real YYYY-MM-DD date`);
    if (status === "historical" && !/\b(?:19|20)\d{2}\b|\bversion\b|\bdraft\b/i.test(scope)) failures.push(`${location}: historical term requires a dated or versioned scope`);
    if (id && !terms.has(id)) terms.set(id, { label, source: source?.[1], concept, scope, status });
  });

  const relationRows = table(content, "Recorded Relations", ["From", "To", "Type", "Scope", "Direction", "Boundary", "Reviewed on"], failures);
  const pairs = new Map();
  const used = new Set();
  const hierarchies = new Map();
  relationRows.forEach((row, index) => {
    const location = `${relative} relation row ${index + 1}`;
    if (row.length !== 7) { failures.push(`${location}: expected 7 columns`); return; }
    const [fromCell, toCell, typeCell, scope, direction, boundary, reviewed] = row;
    const from = identifier(fromCell);
    const to = identifier(toCell);
    const type = identifier(typeCell);
    if (!RELATION_TYPES.has(type)) failures.push(`${location}: unknown relation type ${type ?? typeCell}`);
    if (!terms.has(from)) failures.push(`${location}: from-term must be a recorded term`);
    if (!terms.has(to)) failures.push(`${location}: to-term must be a recorded term`);
    if (from && from === to) failures.push(`${location}: self relation is forbidden`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scope)) failures.push(`${location}: scope must be a non-empty kebab-case identifier`);
    const allowedDirections = type === "near_equivalent" ? ["symmetric", "directional"] : [SYMMETRIC_TYPES.has(type) ? "symmetric" : "directional"];
    if (!allowedDirections.includes(direction)) failures.push(`${location}: invalid direction for ${type}`);
    if (boundary.length < 20 || boundary.replaceAll("`", "") === type) failures.push(`${location}: boundary must be a non-trivial scope statement`);
    if (!validDate(reviewed)) failures.push(`${location}: reviewed_on must be a real YYYY-MM-DD date`);
    if (type === "same_label_different_meaning" && terms.has(from) && terms.has(to)) {
      const a = terms.get(from);
      const b = terms.get(to);
      if (a.label !== b.label) failures.push(`${location}: same_label_different_meaning requires identical labels`);
      if (a.concept === b.concept && a.scope === b.scope) failures.push(`${location}: same_label_different_meaning requires distinct meaning or scope`);
    }
    if (type === "renamed_to" || type === "deprecated_in_favor_of") {
      if (!/\b(?:19|20)\d{2}\b|\bv\d+\.\d+|\bversion\s+\d/i.test(boundary)) failures.push(`${location}: ${type} requires a time or version basis in the boundary`);
      const a = terms.get(from);
      const b = terms.get(to);
      if (a && b) {
        if (!["historical", "deprecated"].includes(a.status) || b.status !== "current") failures.push(`${location}: temporal relation requires historical/deprecated source and current replacement`);
        if (type === "deprecated_in_favor_of" && a.status !== "deprecated") failures.push(`${location}: deprecation requires deprecated from-term`);
        if (type === "renamed_to" && (a.source !== b.source || a.label === b.label)) failures.push(`${location}: rename requires one named source and different labels`);
      }
    }
    if (!terms.has(from) || !terms.has(to)) return;
    used.add(from);
    used.add(to);
    const key = JSON.stringify([from, to, scope]);
    const reverse = pairs.get(JSON.stringify([to, from, scope]));
    if (pairs.has(key)) failures.push(`${location}: duplicate or contradictory relation for ${from}->${to} in ${scope}`);
    if (reverse) {
      const inverse = type === "broader_than" ? "narrower_than" : type === "narrower_than" ? "broader_than" : direction === "symmetric" ? type : null;
      if (reverse.type !== inverse || reverse.direction !== direction) failures.push(`${location}: conflicting reverse relation in ${scope}`);
    }
    pairs.set(key, { type, direction });
    if (type === "broader_than" || type === "narrower_than") {
      const graph = hierarchies.get(scope) ?? new Map();
      const [parent, child] = type === "broader_than" ? [from, to] : [to, from];
      graph.set(parent, new Set([...(graph.get(parent) ?? []), child]));
      hierarchies.set(scope, graph);
    }
  });
  for (const [scope, graph] of hierarchies) if (hasCycle(graph)) failures.push(`${relative}: containment cycle in ${scope}`);
  for (const id of terms.keys()) if (!used.has(id)) failures.push(`${relative}: orphan term ${id} has no recorded relation`);
  return { ok: failures.length === 0, terms: termRows.length, relations: relationRows.length, failures: [...new Set(failures)] };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = validateDesignTerminology();
  if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else if (result.ok) console.log(`ok: ${result.terms} terms, ${result.relations} relations`);
  else console.error(result.failures.join("\n"));
  process.exitCode = result.ok ? 0 : 1;
}
