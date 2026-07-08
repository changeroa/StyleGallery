#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

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

function read(relative) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) {
    failures.push(`${relative}: missing file`);
    return "";
  }
  return fs.readFileSync(target, "utf8");
}

function stripFencedCodeBlocks(content) {
  return content.replace(/```[\s\S]*?```/g, "");
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
  if (!read(relative).includes(text)) failures.push(`${relative}: missing ${text}`);
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
}

function requireTaskRoutes() {
  const content = read("README.md");
  const section = content.split("## Task Routes")[1]?.split("\n## ")[0] ?? "";
  const routeRows = section.split("\n").filter((line) => /^\| `[^`]+` \| \[[^\]]+\]\([^)]+\) \|/.test(line));
  if (routeRows.length < 10) failures.push(`README.md: expected at least 10 task route rows, found ${routeRows.length}`);
}

function requireLeafNavigation() {
  for (const file of ["patterns", "recipes", "quality"].flatMap(walk)) {
    const content = stripFencedCodeBlocks(read(file));
    if (!/^Parent: \[[^\]]+\]\([^)]+\)/m.test(content)) failures.push(`${file}: missing Parent navigation link`);
    if (!/^Next: \[[^\]]+\]\([^)]+\)/m.test(content)) failures.push(`${file}: missing Next navigation link`);
  }
}

requireRootRoles();
requireTaskRoutes();
requireLeafNavigation();

const result = {
  checkedLeafFiles: ["patterns", "recipes", "quality"].flatMap(walk).length,
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

process.exit(result.ok ? 0 : 1);
