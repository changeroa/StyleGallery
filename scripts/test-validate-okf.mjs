#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(root, "scripts", "validate-okf.mjs");

const cases = [
  {
    name: "missing_frontmatter",
    files: { "index.md": "# Bundle\n\n* [Bad](bad.md) - Bad\n", "log.md": "# Log\n\n## 2026-07-02\n* Init.\n", "bad.md": "# Bad\n" },
    expect: "missing OKF frontmatter",
  },
  {
    name: "missing_type",
    files: { "index.md": "# Bundle\n\n* [Bad](bad.md) - Bad\n", "log.md": "# Log\n\n## 2026-07-02\n* Init.\n", "bad.md": "---\ntitle: Bad\n---\n# Bad\n" },
    expect: "missing required OKF type",
  },
  {
    name: "index_frontmatter",
    files: { "index.md": "---\ntype: Index\n---\n# Bundle\n\n* [Good](good.md) - Good\n", "log.md": "# Log\n\n## 2026-07-02\n* Init.\n", "good.md": concept("Concept", "Good") },
    expect: "index.md must not contain concept frontmatter",
  },
  {
    name: "malformed_log_date",
    files: { "index.md": "# Bundle\n\n* [Good](good.md) - Good\n", "log.md": "# Log\n\n## July 2, 2026\n* Init.\n", "good.md": concept("Concept", "Good") },
    expect: "log.md date heading must be YYYY-MM-DD",
  },
  {
    name: "success_path",
    files: { "index.md": "---\nokf_version: \"0.1\"\n---\n# Bundle\n\n* [Good](good.md) - Good\n", "log.md": "# Log\n\n## 2026-07-02\n* Init.\n", "good.md": concept("Concept", "Good") },
    expect: null,
  },
];

function concept(type, title) {
  return `---\ntype: ${type}\ntitle: ${title}\ndescription: Valid OKF concept.\n---\n# ${title}\n`;
}

function runCase(testCase) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `layout-gallery-okf-${testCase.name}-`));
  for (const [relative, content] of Object.entries(testCase.files)) {
    const target = path.join(dir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  const result = spawnSync(process.execPath, [validator, "--json"], {
    cwd: dir,
    encoding: "utf8",
  });
  fs.rmSync(dir, { force: true, recursive: true });
  const output = JSON.parse(result.stdout);
  const passed = testCase.expect ? !output.ok && output.failures.some((failure) => failure.includes(testCase.expect)) : output.ok;
  return {
    name: testCase.name,
    ok: passed,
    expected: testCase.expect ?? "ok:true",
    actual: output,
  };
}

const results = cases.map(runCase);
const report = {
  ok: results.every((result) => result.ok),
  results,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;
