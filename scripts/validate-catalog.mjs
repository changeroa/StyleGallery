#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { patterns } from "./pattern-data.mjs";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const root = process.cwd();
const failures = [];

function slugDir(category) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function requireIncludes(relative, text) {
  if (!read(relative).includes(text)) failures.push(`${relative}: missing ${text}`);
}

const expectedFiles = new Set();
const expectedCategories = new Set();

for (const [slug, category, problem] of patterns) {
  const dir = slugDir(category);
  const file = `patterns/${dir}/${slug}.md`;
  expectedFiles.add(file);
  expectedCategories.add(category);
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing pattern file: ${file}`);
  requireIncludes("CATALOG.md", `- [${slug}](${file}) - ${category}: ${problem}`);
  requireIncludes(`patterns/${dir}/index.md`, `- [${slug}](${slug}.md) - ${problem}`);
}

for (const category of expectedCategories) {
  const dir = slugDir(category);
  requireIncludes("patterns/index.md", `- [${category}](${dir}/index.md)`);
}

const actualFiles = fs.readdirSync(path.join(root, "patterns"), { recursive: true })
  .filter((entry) => typeof entry === "string" && entry.endsWith(".md") && !entry.endsWith("index.md"))
  .map((entry) => `patterns/${entry}`);

for (const file of actualFiles) {
  if (!expectedFiles.has(file)) failures.push(`unexpected pattern file: ${file}`);
}

const result = {
  actualPatternCount: actualFiles.length,
  expectedPatternCount: expectedFiles.size,
  failures,
  ok: failures.length === 0,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log(`ok: ${actualFiles.length} cataloged patterns`);
} else {
  console.error(result.failures.join("\n"));
}

process.exitCode = result.ok ? 0 : 1;
