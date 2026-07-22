#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const root = process.cwd();
const ignoredDirs = new Set([".git", ".omo", "node_modules"]);
const failures = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirs.has(entry.name)) return [];
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(next);
    return entry.isFile() && entry.name.endsWith(".md") ? [next] : [];
  });
}

function frontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const metadata = {};
  for (const line of match[1].split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    metadata[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
  }
  return metadata;
}

function hasRootOnlyOkfFrontmatter(file, metadata) {
  return file === "index.md" && metadata && Object.keys(metadata).every((key) => key === "okf_version");
}

function checkIndex(file, content) {
  const metadata = frontmatter(content);
  if (metadata && !hasRootOnlyOkfFrontmatter(file, metadata)) {
    failures.push(`${file}: index.md must not contain concept frontmatter`);
  }
  if (!content.match(/^#\s+\S/m)) failures.push(`${file}: index.md must contain at least one heading`);
  if (!content.match(/\[[^\]]+\]\([^)]+\)/)) failures.push(`${file}: index.md must list at least one markdown link`);
}

function checkLog(file, content) {
  if (frontmatter(content)) failures.push(`${file}: log.md must not contain frontmatter`);
  if (!content.match(/^#\s+\S/m)) failures.push(`${file}: log.md must contain a title heading`);
  const dateHeadings = [...content.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
  for (const heading of dateHeadings) {
    if (!heading.match(/^\d{4}-\d{2}-\d{2}$/)) failures.push(`${file}: log.md date heading must be YYYY-MM-DD: ${heading}`);
  }
}

function checkConcept(file, content) {
  const metadata = frontmatter(content);
  if (!metadata) {
    failures.push(`${file}: missing OKF frontmatter`);
    return;
  }
  if (!metadata.type) failures.push(`${file}: missing required OKF type`);
}

const files = walk(root);
let conceptCount = 0;
let indexCount = 0;
let logCount = 0;

for (const absolute of files) {
  const file = path.relative(root, absolute);
  const content = fs.readFileSync(absolute, "utf8");
  const basename = path.basename(file);
  if (basename === "index.md") {
    indexCount += 1;
    checkIndex(file, content);
  } else if (basename === "log.md") {
    logCount += 1;
    checkLog(file, content);
  } else {
    conceptCount += 1;
    checkConcept(file, content);
  }
}

if (!files.includes(path.join(root, "index.md"))) failures.push("missing root index.md");
if (!files.includes(path.join(root, "log.md"))) failures.push("missing root log.md");

const result = {
  ok: failures.length === 0,
  conceptCount,
  indexCount,
  logCount,
  failures,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log(`ok: ${conceptCount} concepts, ${indexCount} indexes, ${logCount} logs`);
} else {
  console.error(failures.join("\n"));
}

process.exitCode = result.ok ? 0 : 1;
