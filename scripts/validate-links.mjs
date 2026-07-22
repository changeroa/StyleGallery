#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const root = process.cwd();
const failures = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git" || entry.name === ".omo" || entry.name === "node_modules") return [];
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(next);
    if (!entry.isFile() || !entry.name.endsWith(".md")) return [];
    return [next];
  });
}

function stripFencedCodeBlocks(content) {
  return content.replace(/```[\s\S]*?```/g, "");
}

function localTarget(rawTarget) {
  const target = rawTarget.trim();
  if (!target || target.startsWith("#")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return null;
  return target.split("#")[0].split("?")[0];
}

function checkLink(file, target) {
  const local = localTarget(target);
  if (!local) return;
  const decoded = decodeURIComponent(local);
  const absolute = path.resolve(path.dirname(file), decoded);
  if (!absolute.startsWith(root)) {
    failures.push(`${path.relative(root, file)}: link escapes repository: ${target}`);
    return;
  }
  if (!fs.existsSync(absolute)) failures.push(`${path.relative(root, file)}: missing link target: ${target}`);
}

const files = walk(root);
for (const file of files) {
  const content = stripFencedCodeBlocks(fs.readFileSync(file, "utf8"));
  for (const match of content.matchAll(/(?<!!)\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    checkLink(file, match[1]);
  }
}

const result = {
  checkedFiles: files.length,
  failures,
  ok: failures.length === 0,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log(`ok: ${files.length} markdown files`);
} else {
  console.error(result.failures.join("\n"));
}

process.exitCode = result.ok ? 0 : 1;
