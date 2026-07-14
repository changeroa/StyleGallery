#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(root, "scripts", "validate-ia.mjs");
const governedProfileRoutes = [
  ["Editorial profile", "editorial/profile.json"],
  ["Editorial state matrix", "editorial/generated/state-matrix.md"],
  ["Editorial keyboard matrix", "editorial/generated/keyboard-matrix.md"],
  ["Editorial evidence coverage", "editorial/generated/evidence-coverage.md"],
  ["Terminal profile", "terminal/profile.json"],
  ["Terminal state matrix", "terminal/generated/state-matrix.md"],
  ["Terminal keyboard matrix", "terminal/generated/keyboard-matrix.md"],
  ["Terminal evidence coverage", "terminal/generated/evidence-coverage.md"],
];

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
    "| [Layout](layout/index.md) | Layout domain |",
    "| [Motion](motion/index.md) | Motion domain |",
    "| [Design Engineering](design-engineering/index.md) | Design Engineering domain |",
    "| [Platform Guides](platform-guides/index.md) | Platform Guides domain |",
    "| [Consumer Reference](consumer-reference/index.md) | Shared infrastructure contract |",
    "",
    "## Task Routes",
    "",
    "| Task | Primary route |",
    "| --- | --- |",
    "| `plan a layout` | [Guide](GUIDE.md) |",
    "| `make a homepage` | [Homepage](recipes/homepage.md) |",
    "| `choose a primitive` | [Catalog](CATALOG.md) |",
    "| `review quality` | [Quality](quality/index.md) |",
    "| `check links` | [Quality](quality/index.md) |",
    "| `write a recipe` | [Recipes](recipes/index.md) |",
    "| `inspect pattern categories` | [Patterns](patterns/index.md) |",
    "| `fill a brief` | [Brief](guides/layout-brief.md) |",
    "| `record evidence` | [Evidence](quality/evidence/index.md) |",
    "| `run findability QA` | [Findability](quality/index.md) |",
    "",
    "## Link Policy",
    "",
    "- Navigation links move a reader to the next decision point.",
    "- Citation links identify source lineage or evidence boundaries.",
    "- Dependency links identify generated, validation, or composition relationships.",
    "",
  ].join("\n"),
  "index.md": [
    "# Bundle",
    "",
    "Primary role: OKF bundle map.",
    "",
    "- [Layout](layout/index.md)",
    "- [Motion](motion/index.md)",
    "- [Design Engineering](design-engineering/index.md)",
    "- [Platform Guides](platform-guides/index.md)",
    "- [Consumer reference](consumer-reference/index.md)",
    "",
  ].join("\n"),
  "GUIDE.md": "# Guide\n\nPrimary role: planning workflow.\n",
  "CATALOG.md": "# Catalog\n\nPrimary role: pattern lookup.\n",
  "patterns/index.md": "# Patterns\n",
  "patterns/stacking/index.md": "# Stacking\n",
  "patterns/stacking/stack.md": leaf("Stack", "index.md", "../../recipes/index.md"),
  "recipes/index.md": "# Recipes\n",
  "recipes/homepage.md": leaf("Homepage", "index.md", "../quality/index.md"),
  "quality/index.md": "# Quality\n\n## Tree-Test Findability QA\n",
  "quality/gates/index.md": "# Gates\n",
  "quality/gates/layout.md": leaf("Layout", "index.md", "../evidence/index.md"),
  "quality/evidence/index.md": "# Evidence\n",
  "layout/index.md": "# Layout\n\n- [Catalog](../CATALOG.md)\n",
  "motion/index.md": "# Motion\n\n- [Review](review.md)\n",
  "motion/review.md": leaf("Motion review", "index.md", "../design-engineering/index.md"),
  "design-engineering/index.md": "# Design Engineering\n\n- [Craft](craft.md)\n- [Reference Profiles](reference-profiles/index.md)\n",
  "design-engineering/craft.md": leaf("Craft", "index.md", "../platform-guides/index.md"),
  "design-engineering/reference-profiles/index.md": "# Reference Profiles\n\n- [Governed Local Profiles](governed-local/index.md)\n- [External Adaptation](external-adaptation/index.md)\n\nParent: [Design Engineering](../index.md).\nNext: [Governed Local Profiles](governed-local/index.md).\n",
  "design-engineering/reference-profiles/governed-local/index.md": [
    "# Governed Local Profiles",
    "",
    ...governedProfileRoutes.map(([label, target]) => `- [${label}](${target})`),
    "",
    "Parent: [Reference Profiles](../index.md).",
    "Next: [External Adaptation](../external-adaptation/index.md).",
    "",
  ].join("\n"),
  "design-engineering/reference-profiles/external-adaptation/index.md": "# External Adaptation\n\nParent: [Reference Profiles](../index.md).\nNext: [Platform Guides](../../../platform-guides/index.md).\n",
  "platform-guides/index.md": "# Platform Guides\n\n- [Apple](apple.md)\n",
  "platform-guides/apple.md": leaf("Apple", "index.md", "../layout/index.md"),
  "consumer-reference/index.md": "# Consumer Reference\n\n- [Contract](contract.md)\n",
  "consumer-reference/contract.md": leaf("Consumer Reference Contract", "index.md", "../quality/index.md"),
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
    name: "missing_motion_readme_route",
    mutate: {
      "README.md": baseFiles["README.md"].replace("| [Motion](motion/index.md) | Motion domain |\n", ""),
    },
    expect: "README.md: missing [Motion](motion/index.md)",
  },
  {
    name: "motion_readme_route_only_in_fence",
    mutate: {
      "README.md": baseFiles["README.md"].replace("| [Motion](motion/index.md) | Motion domain |\n", "```md\n[Motion](motion/index.md)\n```\n"),
    },
    expect: "README.md: missing [Motion](motion/index.md)",
  },
  {
    name: "missing_design_engineering_index_route",
    mutate: {
      "index.md": baseFiles["index.md"].replace("- [Design Engineering](design-engineering/index.md)\n", ""),
    },
    expect: "index.md: missing [Design Engineering](design-engineering/index.md)",
  },
  {
    name: "missing_reference_profile_route",
    mutate: {
      "design-engineering/index.md": "# Design Engineering\n\n- [Craft](craft.md)\n",
    },
    expect: "design-engineering/index.md: missing [Reference Profiles](reference-profiles/index.md)",
  },
  ...governedProfileRoutes.map(([label, target]) => ({
    name: `missing_governed_route_${target.replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "")}`,
    mutate: {
      "design-engineering/reference-profiles/governed-local/index.md": baseFiles["design-engineering/reference-profiles/governed-local/index.md"].replace(`- [${label}](${target})\n`, ""),
    },
    expect: `design-engineering/reference-profiles/governed-local/index.md: missing [${label}](${target})`,
  })),
  {
    name: "missing_external_adaptation_parent",
    mutate: {
      "design-engineering/reference-profiles/external-adaptation/index.md": "# External Adaptation\n\nNext: [Platform Guides](../../../platform-guides/index.md).\n",
    },
    expect: "design-engineering/reference-profiles/external-adaptation/index.md: missing Parent navigation link",
  },
  {
    name: "missing_consumer_reference_route",
    mutate: {
      "index.md": baseFiles["index.md"].replace("- [Consumer reference](consumer-reference/index.md)\n", ""),
    },
    expect: "index.md: missing [Consumer reference](consumer-reference/index.md)",
  },
  {
    name: "missing_domain_leaf_parent",
    mutate: {
      "motion/review.md": "# Motion review\n\nNext: [Next](../design-engineering/index.md)\n",
    },
    expect: "motion/review.md: missing Parent navigation link",
  },
  {
    name: "missing_domain_leaf_next",
    mutate: {
      "motion/review.md": "# Motion review\n\nParent: [Motion](index.md)\n",
    },
    expect: "motion/review.md: missing Next navigation link",
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
process.exitCode = report.ok ? 0 : 1;
