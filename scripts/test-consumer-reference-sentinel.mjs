#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const cases = [
  ["hidden_layout", "hidden-layout", "computed_layout_visible"],
  ["long_content_reflow", "long-content-reflow", "computed_long_content_reflow"],
];

const results = cases.map(([name, mutation, expected]) => {
  const child = spawnSync(
    path.join(repositoryRoot, "node_modules", ".bin", "playwright"),
    ["test", "tests/consumer-reference-sentinels.spec.mjs", "--project=chromium", "--reporter=line"],
    { cwd: repositoryRoot, encoding: "utf8", env: { ...process.env, SENTINEL_MUTATION: mutation } },
  );
  const output = `${child.stdout}\n${child.stderr}`;
  return {
    actual: { named: output.includes(expected), status: child.status },
    expected,
    name,
    ok: child.status !== 0 && output.includes(expected),
  };
});

const failures = results.filter((result) => !result.ok).map((result) => `missing_semantic:${result.name}:${result.expected}`);
const report = { failures, ok: failures.length === 0, results };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
