#!/usr/bin/env node
// Strict YAML subset: one flat mapping of scalars, with quoted strings and
// literal/folded block strings. No YAML parser exists in the locked dependency
// graph. Reject unsupported syntax rather than silently approximating it.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function scalar(raw) {
  if (raw.startsWith('"')) {
    const match = /^("(?:[^"\\]|\\.)*")\s*(?:#.*)?$/.exec(raw);
    if (!match) throw new Error("invalid double-quoted scalar");
    return JSON.parse(match[1]);
  }
  if (raw.startsWith("'")) {
    const match = /^'((?:[^']|'')*)'\s*(?:#.*)?$/.exec(raw);
    if (!match) throw new Error("invalid single-quoted scalar");
    return match[1].replaceAll("''", "'");
  }
  const value = raw.replace(/\s+#.*$/, "").trimEnd();
  if (!value || /:\s|:$/.test(value)) throw new Error('plain scalars containing ": " must be quoted');
  if (/^[!&*[\]{}|>@`#%,?]/.test(value) || /^-(?:\s|$)/.test(value)) throw new Error("unsupported YAML scalar syntax");
  if (/^(?:true|false)$/i.test(value)) return value.toLowerCase() === "true";
  if (/^(?:null|~)$/i.test(value)) return null;
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return Number(value);
  if (/^[+-]?(?:0[xob][\da-f_]+|(?:\d+(?:\.\d*)?|\.\d+)[eE][+-]?\d+|\.(?:inf|nan))$/i.test(value)) throw new Error("quote numeric forms outside the supported decimal subset");
  return value;
}

export function validateSkillFrontmatter(text) {
  const failures = [];
  const fail = (code, message, line) => failures.push({ code, message, line });
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  if (lines[0] !== "---") {
    fail("frontmatter_missing", "SKILL.md must begin with a YAML frontmatter delimiter", 1);
    return { ok: false, failures };
  }
  const end = lines.indexOf("---", 1);
  if (end === -1) {
    fail("frontmatter_unclosed", "YAML frontmatter must have a closing delimiter", 1);
    return { ok: false, failures };
  }
  const values = new Map();
  for (let index = 1; index < end; index += 1) {
    const line = lines[index];
    if (line.includes("\t")) {
      fail("frontmatter_tab", "tabs are not allowed in frontmatter", index + 1);
      continue;
    }
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_-]*):(?: +(.*))?$/.exec(line);
    if (!match) {
      fail("frontmatter_syntax", "expected a top-level scalar mapping; nested maps, sequences, directives, and other YAML syntax are unsupported", index + 1);
      continue;
    }
    const [, key, raw = ""] = match;
    if (values.has(key)) fail("frontmatter_duplicate_key", `duplicate key: ${key}`, index + 1);
    // Mark the key before parsing so malformed values cannot hide duplicates.
    values.set(key, undefined);
    try {
      if (/^[|>][+-]?(?:\s+#.*)?$/.test(raw)) {
        const block = [];
        let indent;
        while (index + 1 < end && (/^ /.test(lines[index + 1]) || !lines[index + 1].trim())) {
          const next = lines[++index];
          if (next.includes("\t")) throw new Error("tabs are not allowed in block scalars");
          if (next.trim()) {
            indent ??= next.length - next.trimStart().length;
            if (next.slice(0, indent) !== " ".repeat(indent)) throw new Error("inconsistent block indentation");
          }
          block.push(next.slice(indent ?? 0));
        }
        values.set(key, block.join(raw[0] === ">" ? " " : "\n").trim());
      } else {
        values.set(key, scalar(raw));
      }
    } catch (error) {
      fail("frontmatter_syntax", `${key}: ${error.message}`, index + 1);
    }
  }
  for (const key of ["name", "description"]) {
    if (typeof values.get(key) !== "string" || !values.get(key).trim()) fail("frontmatter_required", `${key} must be a non-empty string`, 1);
  }
  return { ok: failures.length === 0, failures };
}

export function validateRepositorySkills(root) {
  const inventory = spawnSync("git", ["-C", root, "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "SKILL.md", "**/SKILL.md"], { encoding: "utf8", timeout: 30_000, maxBuffer: 16 * 1024 * 1024 });
  if (inventory.status !== 0) return { ok: false, files: [], failures: [{ code: "skill_inventory_failed", message: inventory.error?.message ?? inventory.stderr.trim() }] };
  const files = [...new Set(inventory.stdout.split("\0").filter(Boolean))].sort();
  const failures = [];
  for (const file of files) {
    try {
      const target = path.join(root, file);
      if (!fs.lstatSync(target).isFile()) throw new Error("SKILL.md must be a regular file");
      for (const failure of validateSkillFrontmatter(fs.readFileSync(target, "utf8")).failures) failures.push({ path: file, ...failure });
    } catch (error) {
      failures.push({ path: file, code: "skill_unreadable", message: error.message });
    }
  }
  return { ok: failures.length === 0, files, failures };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  let json = false;
  try {
    const args = process.argv.slice(2);
    for (let index = 0; index < args.length; index += 1) {
      if (args[index] === "--json") json = true;
      else if (args[index] === "--root" && args[index + 1] && !args[index + 1].startsWith("--")) root = path.resolve(args[++index]);
      else throw new Error(`unknown or incomplete argument: ${args[index]}`);
    }
    const result = validateRepositorySkills(root);
    if (json) console.log(JSON.stringify(result, null, 2));
    else if (result.ok) console.log(`ok: ${result.files.length} SKILL.md frontmatter files`);
    else console.error(result.failures.map(({ path: file, line, message }) => `${file ?? root}:${line ?? 1}: ${message}`).join("\n"));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
