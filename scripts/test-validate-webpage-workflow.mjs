#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const validator = path.join(root, "scripts", "validate-webpage-workflow.mjs");

const files = {
  "README.md": "# layout-gallery\n\n- [Webpage Generation Workflow](guides/webpage-generation-workflow.md)\n",
  "GUIDE.md": [
    "# Layout Planning Guide",
    "",
    "- [Webpage generation workflow](guides/webpage-generation-workflow.md)",
    "- content-to-layout match",
    "- harmony evaluation",
    "- GPT Image reference",
    "- implementation handoff",
    "",
  ].join("\n"),
  "guides/layout-brief.md": [
    "# Layout Brief Template",
    "",
    "## Webpage Generation Intake",
    "",
    "Content-to-layout match:",
    "Harmony evaluation:",
    "GPT Image reference:",
    "Required preconditions before prompt:",
    "Image review extract-vs-ignore:",
    "Implementation handoff:",
    "Accepted image debt:",
    "",
    "## Minimum Required Fields By Use Case",
    "",
    "Homepage:",
    "Dashboard:",
    "Article:",
    "Form:",
    "Command surface:",
    "",
    "## Rejected Alternatives",
    "",
    "Rejected pattern or recipe:",
    "Reason rejected:",
    "",
  ].join("\n"),
  "guides/decision-tree.md": [
    "# Layout Decision Tree",
    "",
    "Rejected alternatives:",
    "",
  ].join("\n"),
  "guides/webpage-generation-workflow.md": [
    "---",
    "type: Planning Guide",
    "---",
    "",
    "# Webpage Generation Workflow",
    "",
    "## Use Cases",
    "## Content-to-Layout Match",
    "## Harmony Evaluation",
    "## GPT Image Reference",
    "Required preconditions before prompt:",
    "Extract from image:",
    "Ignore from image:",
    "## Implementation Handoff",
    "Implementation debt:",
    "Final implementation proof:",
    "## Workflow Route Examples",
    "",
    "### Homepage Route",
    "Content blocks -> Section jobs -> Recipe -> Pattern stack -> Scroll owner -> Constraints -> Harmony evaluation -> GPT Image reference -> Implementation handoff",
    "",
    "### Dashboard Route",
    "Content blocks -> Section jobs -> Recipe -> Pattern stack -> Scroll owner -> Constraints -> Harmony evaluation -> GPT Image reference -> Implementation handoff",
    "",
    "### Article Route",
    "Content blocks -> Section jobs -> Recipe -> Pattern stack -> Scroll owner -> Constraints -> Harmony evaluation -> GPT Image reference -> Implementation handoff",
    "",
    "### Form Route",
    "Content blocks -> Section jobs -> Recipe -> Pattern stack -> Scroll owner -> Constraints -> Harmony evaluation -> GPT Image reference -> Implementation handoff",
    "",
    "### Command Surface Route",
    "Content blocks -> Section jobs -> Recipe -> Pattern stack -> Scroll owner -> Constraints -> Harmony evaluation -> GPT Image reference -> Implementation handoff",
    "",
  ].join("\n"),
  "recipes/index.md": "# Layout Recipes\n\n- [Homepage](homepage.md)\n",
  "recipes/homepage.md": [
    "---",
    "type: Layout Recipe",
    "screen_type: Homepage",
    "---",
    "",
    "# Homepage",
    "",
    "## Recommended Pattern Stack",
    "## Content-To-Layout Matching",
    "## GPT Image Reference",
    "Required preconditions before prompt:",
    "Image review extract-vs-ignore:",
    "",
  ].join("\n"),
  "quality/gates/index.md": "# Gate Contracts\n\n- [Harmony evaluation gate](harmony-evaluation.md)\n",
  "quality/gates/harmony-evaluation.md": [
    "---",
    "type: Quality Gate",
    "---",
    "",
    "# Harmony Evaluation Gate",
    "",
    "## Required Contract",
    "",
    "Content-to-layout match:",
    "Overall harmony:",
    "GPT Image reference:",
    "Implementation handoff:",
    "Rejected alternatives:",
    "Do not generate a GPT Image reference before harmony evaluation approves the semantic order, section jobs, pattern stack, scroll owner, and constraints.",
    "Source order, accessibility, brand correctness, and usability cannot be inferred from the image.",
    "Final implementation proof:",
    "",
  ].join("\n"),
};

const cases = [
  {
    name: "missing_workflow_file",
    omit: ["guides/webpage-generation-workflow.md"],
    expect: "guides/webpage-generation-workflow.md: missing file",
  },
  {
    name: "missing_harmony_anchor",
    mutate: {
      "quality/gates/harmony-evaluation.md": files["quality/gates/harmony-evaluation.md"].replace("Overall harmony:", "Overall fit:"),
    },
    expect: "quality/gates/harmony-evaluation.md: missing Overall harmony:",
  },
  {
    name: "missing_route_examples",
    mutate: {
      "guides/webpage-generation-workflow.md": files["guides/webpage-generation-workflow.md"].replace("## Workflow Route Examples", "## Workflow Routes"),
    },
    expect: "guides/webpage-generation-workflow.md: missing ## Workflow Route Examples",
  },
  {
    name: "missing_image_proof_boundary",
    mutate: {
      "quality/gates/harmony-evaluation.md": files["quality/gates/harmony-evaluation.md"].replace(
        "Source order, accessibility, brand correctness, and usability cannot be inferred from the image.",
        "Generated image alone is enough for source order and access decisions.",
      ),
    },
    expect: "quality/gates/harmony-evaluation.md: missing Source order, accessibility, brand correctness, and usability cannot be inferred from the image.",
  },
  {
    name: "misordered_gpt_image_route",
    mutate: {
      "guides/webpage-generation-workflow.md": files["guides/webpage-generation-workflow.md"].replace(
        "Content blocks -> Section jobs -> Recipe -> Pattern stack -> Scroll owner -> Constraints -> Harmony evaluation -> GPT Image reference -> Implementation handoff",
        "Content blocks -> Section jobs -> Recipe -> Pattern stack -> GPT Image reference -> Harmony evaluation -> Scroll owner -> Constraints -> Implementation handoff",
      ),
    },
    expect: "guides/webpage-generation-workflow.md: route Homepage places GPT Image reference before Harmony evaluation",
  },
  {
    name: "missing_rejected_alternatives",
    mutate: {
      "guides/layout-brief.md": files["guides/layout-brief.md"].replace("## Rejected Alternatives", "## Alternatives"),
    },
    expect: "guides/layout-brief.md: missing ## Rejected Alternatives",
  },
  {
    name: "success_path",
    expect: null,
  },
];

function writeFixture(testCase) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `layout-gallery-webpage-workflow-${testCase.name}-`));
  const omitted = new Set(testCase.omit ?? []);
  const entries = { ...files, ...(testCase.mutate ?? {}) };
  for (const [relative, content] of Object.entries(entries)) {
    if (omitted.has(relative)) continue;
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
