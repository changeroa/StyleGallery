#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { isOmoDependency, markdownLinkDestinations, stripFencedCodeBlocks } from "./markdown-structure.mjs";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const root = process.cwd();
const failures = [];
const repository = "https://github.com/emilkowalski/skills";
const revision = "220e8607c90b17337d210125777b7b695f26c221";
const revisionPattern = /^[0-9a-f]{40}$/;
const referenceDocuments = [
  "design-engineering/reference-profiles/index.md",
  "design-engineering/reference-profiles/governed-local/index.md",
  "design-engineering/reference-profiles/external-adaptation/index.md",
];

const domains = [
  { slug: "layout", label: "Layout", leaves: [] },
  {
    slug: "motion",
    label: "Motion",
    leaves: [
      ["motion/vocabulary.md", "skills/animation-vocabulary/SKILL.md"],
      ["motion/review-workflow.md", "skills/review-animations/SKILL.md"],
      ["motion/practice-reference.md", "skills/review-animations/STANDARDS.md"],
    ],
  },
  {
    slug: "design-engineering",
    label: "Design Engineering",
    leaves: [["design-engineering/interface-craft.md", "skills/emil-design-eng/SKILL.md"]],
    referenceDocuments,
  },
  { slug: "platform-guides", label: "Platform Guides", leaves: [["platform-guides/apple-interaction.md", "skills/apple-design/SKILL.md"]] },
];

const requiredLeafSections = [
  "Repository Boundary",
  "Reusable Method",
  "Opinionated Guidance",
  "Platform-Specific Guidance",
  "Unsupported Absolutes",
  "Verification Contract",
  "Source, License, And Attribution",
  "IA Navigation",
];

function read(relative) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) {
    failures.push(`${relative}: missing file`);
    return "";
  }
  return fs.readFileSync(target, "utf8");
}

function parseFrontmatter(relative, content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    failures.push(`${relative}: missing frontmatter`);
    return {};
  }
  const metadata = {};
  for (const rawLine of match[1].split("\n")) {
    if (!rawLine.trim()) continue;
    const separator = rawLine.indexOf(":");
    if (separator === -1) {
      failures.push(`${relative}: malformed frontmatter line`);
      continue;
    }
    const key = rawLine.slice(0, separator).trim();
    const value = rawLine.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (Object.hasOwn(metadata, key)) failures.push(`${relative}: duplicate frontmatter key ${key}`);
    metadata[key] = value;
  }
  return metadata;
}

function requireRootRoutes() {
  for (const relative of ["README.md", "index.md"]) {
    const content = stripFencedCodeBlocks(read(relative));
    for (const domain of domains) {
      const route = `[${domain.label}](${domain.slug}/index.md)`;
      if (!content.includes(route)) failures.push(`${relative}: missing ${route}`);
    }
  }
}

function checkManifest() {
  const relative = "DOMAINS.md";
  const content = stripFencedCodeBlocks(read(relative));
  const section = (heading) => content.split(`${heading}\n`)[1]?.split("\n## ")[0] ?? "";
  const tableRows = (body) => {
    const rows = body.split("\n").filter((line) => /^\s*\|.*\|\s*$/.test(line)).map((line) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim()));
    return rows.filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell))).slice(1);
  };
  const domainRows = tableRows(section("## Domain Contract"));
  const pageRows = tableRows(section("## Page Manifest"));
  const expectedLabels = new Set(domains.map((domain) => domain.label));
  const exactLabels = (rows) => rows.length === domains.length && new Set(rows.map((row) => row[0])).size === domains.length && rows.every((row) => expectedLabels.has(row[0]));
  let valid = Boolean(content)
    && exactLabels(domainRows)
    && exactLabels(pageRows)
    && content.includes(`snapshot \`${revision}\``)
    && content.includes("## Shared Non-Domain Infrastructure")
    && content.includes("[Consumer Reference](consumer-reference/index.md)")
    && content.includes("not a fifth domain");

  for (const domain of domains) {
    const domainRow = domainRows.find((row) => row[0] === domain.label);
    const pageRow = pageRows.find((row) => row[0] === domain.label);
    const expectedLifecycle = domain.slug === "layout" ? "`stable` and `generated`" : "`experimental`";
    const expectedHub = `[${domain.label}](${domain.slug}/index.md)`;
    const expectedManualHub = `\`${domain.slug}/index.md\``;
    if (!domainRow || domainRow[1] !== expectedHub || domainRow[2] !== expectedLifecycle) valid = false;
    if (!pageRow || pageRow[1] !== expectedManualHub) valid = false;
    if (domain.leaves.length > 0 && pageRow) {
      const declaredLeaves = [...pageRow[2].matchAll(/`([^`]+\.md)`/g)].map((match) => match[1]).sort();
      const expectedLeaves = [...domain.leaves.map(([leaf]) => leaf), ...(domain.referenceDocuments ?? [])].sort();
      if (JSON.stringify(declaredLeaves) !== JSON.stringify(expectedLeaves)) valid = false;
    }
  }

  if (!valid) {
    failures.push(`${relative}: missing canonical domain contract`);
  }
}

function checkIndex(domain) {
  const relative = `${domain.slug}/index.md`;
  const content = stripFencedCodeBlocks(read(relative));
  if (!content) return;
  if (!content.includes("## Scope Boundary")) failures.push(`${relative}: missing Scope Boundary section`);
  if (!/^In scope:\s*\S/m.test(content)) failures.push(`${relative}: missing In scope declaration`);
  if (!/^Out of scope:\s*\S/m.test(content)) failures.push(`${relative}: missing Out of scope declaration`);
  if (!/^Parent: \[[^\]]+\]\([^)]+\)/m.test(content)) failures.push(`${relative}: missing Parent navigation link`);
  if (!/^Next: \[[^\]]+\]\([^)]+\)/m.test(content)) failures.push(`${relative}: missing Next navigation link`);
  for (const [leaf] of domain.leaves) {
    const target = path.basename(leaf);
    if (!content.match(new RegExp(`\\[[^\\]]+\\]\\(${target.replaceAll(".", "\\.")}\\)`))) {
      failures.push(`${relative}: missing leaf route ${target}`);
    }
  }
  if (domain.referenceDocuments?.length > 0 && !content.includes("[Reference Profiles](reference-profiles/index.md)")) {
    failures.push(`${relative}: missing reference profile route`);
  }
}

function checkLeaf(domain, relative, expectedSourcePath, titles) {
  const content = read(relative);
  if (!content) return;
  const metadata = parseFrontmatter(relative, content);
  for (const field of ["type", "title", "description", "domain", "lifecycle", "source_repository", "source_path", "source_revision"]) {
    if (!metadata[field]) failures.push(`${relative}: missing ${field}`);
  }
  const knownDomain = domains.some((candidate) => candidate.slug === metadata.domain);
  if (metadata.domain && !knownDomain) failures.push(`${relative}: unknown domain ${metadata.domain}`);
  else if (metadata.domain && metadata.domain !== domain.slug) failures.push(`${relative}: domain ${metadata.domain} does not match ${domain.slug}`);
  if (metadata.lifecycle && metadata.lifecycle !== "experimental") failures.push(`${relative}: external adaptation lifecycle must be experimental`);
  if (metadata.source_repository && metadata.source_repository !== repository) failures.push(`${relative}: unexpected source_repository ${metadata.source_repository}`);
  if (metadata.source_path && metadata.source_path !== expectedSourcePath) failures.push(`${relative}: unexpected source_path ${metadata.source_path}`);
  if (metadata.source_revision && !revisionPattern.test(metadata.source_revision)) {
    failures.push(`${relative}: source_revision must be a full 40-character lowercase Git SHA`);
  } else if (metadata.source_revision && metadata.source_revision !== revision) {
    failures.push(`${relative}: unexpected source_revision ${metadata.source_revision}`);
  }
  if (metadata.title) {
    if (titles.has(metadata.title)) failures.push(`${relative}: duplicate title ${metadata.title}`);
    titles.add(metadata.title);
  }
  const body = stripFencedCodeBlocks(content);
  for (const section of requiredLeafSections) {
    if (!body.includes(`## ${section}`)) failures.push(`${relative}: missing ${section} section`);
  }
  if (!/^Parent: \[[^\]]+\]\([^)]+\)/m.test(body)) failures.push(`${relative}: missing Parent navigation link`);
  if (!/^Next: \[[^\]]+\]\([^)]+\)/m.test(body)) failures.push(`${relative}: missing Next navigation link`);
  if (markdownLinkDestinations(content).some(isOmoDependency)) failures.push(`${relative}: tracked document must not depend on .omo`);
  if (metadata.lifecycle === "experimental" && /canonical universal policy/i.test(body)) {
    failures.push(`${relative}: experimental document claims canonical authority`);
  }
}

function rejectUndeclaredDomainDocuments() {
  const generatedReference = /^design-engineering\/reference-profiles\/governed-local\/(?:editorial|terminal)\/generated\/(?:state-matrix|keyboard-matrix|evidence-coverage)\.md$/;
  for (const domain of domains) {
    const declared = new Set([`${domain.slug}/index.md`, ...domain.leaves.map(([leaf]) => leaf), ...(domain.referenceDocuments ?? [])]);
    for (const absolute of walkMarkdown(path.join(root, domain.slug))) {
      const relative = path.relative(root, absolute);
      if (generatedReference.test(relative)) continue;
      if (!declared.has(relative)) failures.push(`${relative}: undeclared governed domain document`);
    }
  }
}

function walkMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", ".omo", "node_modules"].includes(entry.name)) return [];
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdown(target);
    return entry.isFile() && entry.name.endsWith(".md") ? [target] : [];
  });
}

function rejectOmoDependencies() {
  for (const absolute of walkMarkdown(root)) {
    const relative = path.relative(root, absolute);
    const content = fs.readFileSync(absolute, "utf8");
    if (markdownLinkDestinations(content).some(isOmoDependency)) failures.push(`${relative}: tracked document must not depend on .omo`);
  }
}

function checkReferenceDocuments() {
  const index = stripFencedCodeBlocks(read(referenceDocuments[0]));
  if (!/Domain classification:\s*design-engineering\./i.test(index)) {
    failures.push(`${referenceDocuments[0]}: reference profiles must remain in the Design Engineering domain`);
  }
  if (!index.includes("[Governed Local Profiles](governed-local/index.md)")) {
    failures.push(`${referenceDocuments[0]}: missing governed-local route`);
  }
  const external = stripFencedCodeBlocks(read(referenceDocuments[2]));
  if (!external.includes("Synthetic validator coverage only") || !external.includes("no durable adopter record")) {
    failures.push(`${referenceDocuments[1]}: external adaptation must remain documentation-only`);
  }
}

function checkPromotionBoundary() {
  const relative = "DOMAINS.md";
  const content = stripFencedCodeBlocks(read(relative));
  const required = [
    "### Consumer Reference Promotion",
    "applies only to consumer-local → shared-experimental invariant eligibility",
    "Editorial and terminal are related examples in one fixture set",
    "Shared stable has no numeric adoption threshold",
    "Normative correctness may waive adoption count only",
    "never silently relabeled experimental",
    "Promotion records are JSON-only",
    "zero adopter attestations",
  ];
  for (const clause of required) if (!content.includes(clause)) failures.push(`${relative}: missing promotion boundary ${clause}`);
}

checkManifest();
read("quality/claim-records/stylegallery-multidomain-scope.md");
requireRootRoutes();
const titles = new Set();
let checkedLeaves = 0;
for (const domain of domains) {
  checkIndex(domain);
  for (const [relative, sourcePath] of domain.leaves) {
    checkedLeaves += 1;
    checkLeaf(domain, relative, sourcePath, titles);
  }
}
rejectUndeclaredDomainDocuments();
rejectOmoDependencies();
checkReferenceDocuments();
checkPromotionBoundary();

const result = { ok: failures.length === 0, checkedDomains: domains.length, checkedLeaves, failures: [...new Set(failures)] };
if (json) console.log(JSON.stringify(result, null, 2));
else if (result.ok) console.log(`ok: ${result.checkedDomains} domains, ${result.checkedLeaves} governed leaves`);
else console.error(result.failures.join("\n"));
process.exit(result.ok ? 0 : 1);
