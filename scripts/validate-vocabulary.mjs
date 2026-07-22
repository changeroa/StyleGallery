#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const root = process.cwd();
const failures = [];
const warnings = [];

const glossaryFile = "guides/vocabulary.md";
const requiredTerms = [
  "domain",
  "category",
  "pattern",
  "recipe",
  "gate",
  "claim",
  "evidence family",
  "scroll ownership",
  "harmony",
  "debt",
  "consumer reference",
  "maturity",
  "artifact mode",
];

const requiredIncludes = {
  [glossaryFile]: [
    "## Canonical Terms",
    "## Aliases",
    "## Deprecated Terms",
    "## Local-Only Terms",
    "## Scannability Checklist",
    "## Vale Proposal",
    "Prose linting should wait until the vocabulary is stable.",
    "Local-only: `consumer component`",
    "In Layout, component implies visual or framework ownership",
  ],
};

const recommendedLinks = {
  "README.md": { target: "guides/vocabulary.md", preferred: "[Controlled vocabulary](guides/vocabulary.md)" },
  "GUIDE.md": { target: "guides/vocabulary.md", preferred: "[Controlled vocabulary](guides/vocabulary.md)" },
  "index.md": { target: "guides/vocabulary.md", preferred: "[Controlled vocabulary](guides/vocabulary.md)" },
  "quality/index.md": { target: "../guides/vocabulary.md", preferred: "[Controlled vocabulary](../guides/vocabulary.md)" },
};

function read(relative) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) {
    failures.push(`${relative}: missing file`);
    return "";
  }
  return fs.readFileSync(target, "utf8");
}

for (const [relative, snippets] of Object.entries(requiredIncludes)) {
  const content = read(relative);
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${relative}: missing ${snippet}`);
  }
}

for (const [relative, link] of Object.entries(recommendedLinks)) {
  const content = read(relative);
  if (!content.includes(`](${link.target})`)) failures.push(`${relative}: missing link target ${link.target}`);
  if (!content.includes(link.preferred)) warnings.push(`${relative}: recommended link label missing ${link.preferred}`);
}

const glossary = read(glossaryFile);
const canonicalRecords = [...glossary.matchAll(/^- Canonical: `([^`]+)`\n  - Concept: ([^\n]+)/gm)].map((match) => ({
  term: match[1].trim(),
  concept: match[2].trim().toLowerCase(),
}));
const canonicalTerms = canonicalRecords.map((record) => record.term);

for (const term of requiredTerms) {
  if (!canonicalTerms.includes(term)) failures.push(`${glossaryFile}: missing canonical term ${term}`);
}

const termsSeen = new Set();
for (const term of canonicalTerms) {
  if (termsSeen.has(term)) failures.push(`${glossaryFile}: duplicate canonical term ${term}`);
  termsSeen.add(term);
}

const conceptToTerm = new Map();
for (const record of canonicalRecords) {
  const existing = conceptToTerm.get(record.concept);
  if (existing && existing !== record.term) {
    failures.push(`${glossaryFile}: concept "${record.concept}" has multiple canonical terms: ${existing}, ${record.term}`);
  }
  conceptToTerm.set(record.concept, record.term);
}

const result = {
  ok: failures.length === 0,
  checkedFiles: [...new Set([...Object.keys(requiredIncludes), ...Object.keys(recommendedLinks)])],
  requiredTerms,
  canonicalTerms,
  failures,
  warnings,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log(`ok: ${canonicalTerms.length} canonical vocabulary terms (${warnings.length} warnings)`);
} else {
  console.error(failures.join("\n"));
}

process.exitCode = result.ok ? 0 : 1;
