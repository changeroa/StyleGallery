#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { stripFencedCodeBlocks } from "./markdown-structure.mjs";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const root = process.cwd();
const failures = [];

const rootRoles = [
  ["README.md", "Primary role: repository guide"],
  ["index.md", "Primary role: OKF bundle map"],
  ["GUIDE.md", "Primary role: planning workflow"],
  ["CATALOG.md", "Primary role: pattern lookup"],
];
const domainRoutes = [
  ["Layout", "layout/index.md"],
  ["Motion", "motion/index.md"],
  ["Design Engineering", "design-engineering/index.md"],
  ["Platform Guides", "platform-guides/index.md"],
];
const leafDirectories = ["patterns", "recipes", "quality", "motion", "design-engineering", "platform-guides", "consumer-reference"];
const nestedIndexes = [
  "design-engineering/reference-profiles/index.md",
  "design-engineering/reference-profiles/governed-local/index.md",
  "design-engineering/reference-profiles/external-adaptation/index.md",
];
const governedProfileLinks = [
  "[Editorial profile](editorial/profile.json)",
  "[Editorial state matrix](editorial/generated/state-matrix.md)",
  "[Editorial keyboard matrix](editorial/generated/keyboard-matrix.md)",
  "[Editorial evidence coverage](editorial/generated/evidence-coverage.md)",
  "[Terminal profile](terminal/profile.json)",
  "[Terminal state matrix](terminal/generated/state-matrix.md)",
  "[Terminal keyboard matrix](terminal/generated/keyboard-matrix.md)",
  "[Terminal evidence coverage](terminal/generated/evidence-coverage.md)",
];

function read(relative) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) {
    failures.push(`${relative}: missing file`);
    return "";
  }
  return fs.readFileSync(target, "utf8");
}

function walk(dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(absolute, entry.name);
    if (entry.isDirectory()) return walk(path.relative(root, next));
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "index.md") return [];
    return [path.relative(root, next)];
  });
}

function requireIncludes(relative, text) {
  if (!stripFencedCodeBlocks(read(relative)).includes(text)) failures.push(`${relative}: missing ${text}`);
}

function requireRootRoles() {
  for (const [relative, role] of rootRoles) {
    requireIncludes(relative, role);
  }
  requireIncludes("README.md", "## Repository Entry Roles");
  requireIncludes("README.md", "## Task Routes");
  requireIncludes("README.md", "## Link Policy");
  requireIncludes("README.md", "Navigation links");
  requireIncludes("README.md", "Citation links");
  requireIncludes("README.md", "Dependency links");
  requireIncludes("quality/index.md", "## Tree-Test Findability QA");
  requireIncludes("README.md", "[Consumer Reference](consumer-reference/index.md)");
  requireIncludes("index.md", "[Consumer reference](consumer-reference/index.md)");
  requireIncludes("design-engineering/index.md", "[Reference Profiles](reference-profiles/index.md)");
  requireIncludes("design-engineering/reference-profiles/index.md", "[External Adaptation](external-adaptation/index.md)");
  requireIncludes("design-engineering/reference-profiles/index.md", "[Governed Local Profiles](governed-local/index.md)");
  for (const link of governedProfileLinks) {
    requireIncludes("design-engineering/reference-profiles/governed-local/index.md", link);
  }
}

function requireTaskRoutes() {
  const content = stripFencedCodeBlocks(read("README.md"));
  const section = content.split("## Task Routes")[1]?.split("\n## ")[0] ?? "";
  const routeRows = section.split("\n").filter((line) => /^\| `[^`]+` \| \[[^\]]+\]\([^)]+\) \|/.test(line));
  if (routeRows.length < 10) failures.push(`README.md: expected at least 10 task route rows, found ${routeRows.length}`);
}

function requireDomainRoutes() {
  for (const relative of ["README.md", "index.md"]) {
    for (const [label, target] of domainRoutes) requireIncludes(relative, `[${label}](${target})`);
  }
}

function requireLeafNavigation() {
  for (const file of [...leafDirectories.flatMap(walk), ...nestedIndexes]) {
    const content = stripFencedCodeBlocks(read(file));
    if (!/^Parent: \[[^\]]+\]\([^)]+\)/m.test(content)) failures.push(`${file}: missing Parent navigation link`);
    if (!/^Next: \[[^\]]+\]\([^)]+\)/m.test(content)) failures.push(`${file}: missing Next navigation link`);
  }
}

requireRootRoles();
requireTaskRoutes();
requireDomainRoutes();
requireLeafNavigation();

const result = {
  checkedLeafFiles: leafDirectories.flatMap(walk).length + nestedIndexes.length,
  failures,
  ok: failures.length === 0,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log(`ok: ${result.checkedLeafFiles} IA leaf files`);
} else {
  console.error(result.failures.join("\n"));
}

process.exitCode = result.ok ? 0 : 1;
