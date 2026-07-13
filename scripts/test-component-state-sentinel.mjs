#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const cases = [
  ["key_runtime_mismatch", "runtime-key-mismatch", "state_activation_key_parity", "action-focused"],
  ["pressed_false", "runtime-pressed-false", "pressed_surface_mismatch", "toggle-focused-pressed"],
  ["visual_ready", "runtime-visual-ready", "visual_surface_parity", "toggle-focused-pressed"],
  ["unknown_scenario", "runtime-unknown-scenario", "state_runtime_unknown_scenario", "action-focused"],
  ["expanded_ax_mismatch", "runtime-expanded-ax-mismatch", "expanded_surface_mismatch", "disclosure-expanded-loading"],
  ["disabled_activation", "runtime-disabled-activation", "state_activation_key_parity", "action-disabled-busy"],
];

const results = cases.map(([name, mutation, expected, scenario]) => {
  const child = spawnSync(
    path.join(repositoryRoot, "node_modules", ".bin", "playwright"),
    ["test", "tests/component-state-evidence.spec.mjs", "--project=chromium", "--reporter=line", "--grep", scenario],
    { cwd: repositoryRoot, encoding: "utf8", env: { ...process.env, STATE_MUTATION: mutation } },
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
