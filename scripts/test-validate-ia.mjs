#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const validator = path.join(root, "scripts", "validate-ia.mjs");

const baseFiles = {
  "README.md": [
    "# layout-gallery",
    "",
    "Primary role: repository guide.",
    "",
    "## Repository Entry Roles",
    "",
    "| Entry | Primary role |",
    "| --- | --- |",
    "| [README](README.md) | Repository guide |",
    "",
    "## Task Routes",
    "",
    "| Task | Primary route |",
    "| --- | --- |",
    "| `plan a layout` | [Guide](GUIDE.md) |",
    "| `choose a primitive` | [Catalog](CATALOG.md) |",
    "| `review quality` | [Quality](quality/index.md) |",
    "| `check links` | [Quality](quality/index.md) |",
    "| `write a recipe` | [Recipes](recipes/index.md) |",
    "| `inspect pattern categories` | [Patterns](patterns/index.md) |",
    "| `fill a brief` | [Brief](guides/layout-brief.md) |",
    "| `record evidence` | [Quality](quality/index.md) |",
    "| `run findability QA` | [Findability](quality/index.md) |",
    "| `choose settings` | [Settings](recipes/saas-settings.md) |",
    "",
    "## Link Policy",
    "",
    "- Navigation links move a reader to the next decision point.",
    "- Citation links identify source lineage or evidence boundaries.",
    "- Dependency links identify generated, validation, or composition relationships.",
    "",
  ].join("\n"),
  "index.md": "# Bundle\n\nPrimary role: OKF bundle map.\n",
  "GUIDE.md": "# Guide\n\nPrimary role: planning workflow.\n",
  "CATALOG.md": "# Catalog\n\nPrimary role: pattern lookup.\n",
  "patterns/index.md": "# Patterns\n",
  "patterns/stacking/index.md": "# Stacking\n",
  "patterns/stacking/stack.md": leaf("Stack", "index.md", "../../recipes/index.md"),
  "recipes/index.md": "# Recipes\n",
  "recipes/saas-settings.md": leaf("SaaS Settings", "index.md", "../quality/index.md"),
  "quality/index.md": "# Quality\n\n## Tree-Test Findability QA\n\n- [Repository guide](../README.md)\n",
};

const cases = [
  {
    name: "missing_leaf_parent",
    mutate: {
      "patterns/stacking/stack.md": "# Stack\n\nNext: [Recipes](../../recipes/index.md)\n",
    },
    expect: "patterns/stacking/stack.md: missing Parent navigation link",
  },
  {
    name: "missing_leaf_next",
    mutate: {
      "patterns/stacking/stack.md": "# Stack\n\nParent: [Stacking](index.md)\n",
    },
    expect: "patterns/stacking/stack.md: missing Next navigation link",
  },
  {
    name: "missing_task_routes",
    mutate: {
      "README.md": "# layout-gallery\n\nPrimary role: repository guide.\n\n## Repository Entry Roles\n",
    },
    expect: "README.md: missing ## Task Routes",
  },
  {
    name: "missing_link_policy",
    mutate: {
      "README.md": baseFiles["README.md"].replace(/\n## Link Policy\n[\s\S]*$/, "\n"),
    },
    expect: "README.md: missing ## Link Policy",
  },
  {
    name: "success_path",
    expect: null,
  },
];

function leaf(title, parent, next) {
  return `# ${title}\n\n## IA Navigation\n\nParent: [Parent](${parent}).\nNext: [Next](${next}).\n`;
}

function writeFixture(testCase) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `layout-gallery-ia-${testCase.name}-`));
  const entries = { ...baseFiles, ...(testCase.mutate ?? {}) };
  for (const [relative, content] of Object.entries(entries)) {
    const target = path.join(dir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return dir;
}

function runCase(testCase) {
  const dir = writeFixture(testCase);
  const result = spawnSync(process.execPath, [validator, "--json"], {
    cwd: dir,
    encoding: "utf8",
  });
  fs.rmSync(dir, { force: true, recursive: true });
  const output = JSON.parse(result.stdout);
  const passed = testCase.expect ? !output.ok && output.failures.includes(testCase.expect) : output.ok;
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
process.exit(report.ok ? 0 : 1);
