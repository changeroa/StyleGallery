#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(repositoryRoot, "scripts", "validate-renderer-purity.mjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-pr4-renderer-"));
const cases = [];

function run(renderer) {
  const child = spawnSync(process.execPath, [validator, "--renderer", renderer, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  return { child, output: JSON.parse(child.stdout) };
}

try {
  const valid = run("tests/helpers/render-consumer-reference.mjs");
  cases.push({ actual: { codes: valid.output.failures.map((failure) => failure.code), status: valid.child.status }, expected: "pure import and exit:0", name: "canonical_renderer_import", ok: valid.child.status === 0 && valid.output.ok === true });
  const mutation = path.join(tempRoot, "render-consumer-reference.mjs");
  fs.writeFileSync(mutation, 'import fs from "node:fs";\nimport { patterns } from "../../scripts/pattern-data.mjs";\nfs.appendFileSync("CATALOG.md", "mutation");\nexport { patterns };\n');
  const invalid = run(mutation);
  const codes = invalid.output.failures.map((failure) => failure.code);
  cases.push({ actual: { codes, status: invalid.child.status }, expected: "renderer_side_effect_capability", name: "renderer_side_effect", ok: invalid.child.status !== 0 && codes.includes("renderer_side_effect_capability") });
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

const failures = cases.filter((testCase) => !testCase.ok).map((testCase) => `missing_semantic:${testCase.name}:${testCase.expected}`);
const result = { failures, ok: failures.length === 0, results: cases };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exitCode = 1;
