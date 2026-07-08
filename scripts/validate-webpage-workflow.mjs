#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const root = process.cwd();
const failures = [];
const contents = new Map();

const requiredIncludes = {
  "README.md": [
    "[Webpage Generation Workflow](guides/webpage-generation-workflow.md)",
  ],
  "GUIDE.md": [
    "[Webpage generation workflow](guides/webpage-generation-workflow.md)",
    "content-to-layout match",
    "harmony evaluation",
    "GPT Image reference",
    "implementation handoff",
  ],
  "guides/layout-brief.md": [
    "## Webpage Generation Intake",
    "Content-to-layout match:",
    "Harmony evaluation:",
    "GPT Image reference:",
    "Required preconditions before prompt:",
    "Image review extract-vs-ignore:",
    "Implementation handoff:",
    "Accepted image debt:",
    "## Minimum Required Fields By Use Case",
    "Homepage:",
    "Dashboard:",
    "Article:",
    "Form:",
    "Command surface:",
    "## Rejected Alternatives",
    "Rejected pattern or recipe:",
    "Reason rejected:",
  ],
  "guides/decision-tree.md": [
    "Rejected alternatives:",
  ],
  "guides/webpage-generation-workflow.md": [
    "type: Planning Guide",
    "# Webpage Generation Workflow",
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
    "### Homepage Route",
    "### Dashboard Route",
    "### Article Route",
    "### Form Route",
    "### Command Surface Route",
  ],
  "recipes/index.md": [
    "[Homepage](homepage.md)",
  ],
  "recipes/homepage.md": [
    "type: Layout Recipe",
    "screen_type: Homepage",
    "## Recommended Pattern Stack",
    "## Content-To-Layout Matching",
    "## GPT Image Reference",
    "Required preconditions before prompt:",
    "Image review extract-vs-ignore:",
  ],
  "quality/gates/index.md": [
    "[Harmony evaluation gate](harmony-evaluation.md)",
  ],
  "quality/gates/harmony-evaluation.md": [
    "type: Quality Gate",
    "## Required Contract",
    "Content-to-layout match:",
    "Overall harmony:",
    "GPT Image reference:",
    "Implementation handoff:",
    "Rejected alternatives:",
    "Do not generate a GPT Image reference before harmony evaluation approves the semantic order, section jobs, pattern stack, scroll owner, and constraints.",
    "Source order, accessibility, brand correctness, and usability cannot be inferred from the image.",
    "Final implementation proof:",
  ],
};

const routeSteps = [
  "Content blocks",
  "Section jobs",
  "Recipe",
  "Pattern stack",
  "Scroll owner",
  "Constraints",
  "Harmony evaluation",
  "GPT Image reference",
  "Implementation handoff",
];

const workflowRoutes = [
  "Homepage",
  "Dashboard",
  "Article",
  "Form",
  "Command Surface",
];

function read(relative) {
  if (contents.has(relative)) return contents.get(relative);
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    failures.push(`${relative}: missing file`);
    contents.set(relative, "");
    return "";
  }
  const content = fs.readFileSync(absolute, "utf8");
  contents.set(relative, content);
  return content;
}

for (const [relative, snippets] of Object.entries(requiredIncludes)) {
  const content = read(relative);
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${relative}: missing ${snippet}`);
  }
}

function routeSection(content, route) {
  const heading = `### ${route} Route`;
  const start = content.indexOf(heading);
  if (start === -1) return "";
  const afterHeading = content.slice(start + heading.length);
  const nextHeading = afterHeading.search(/\n### /);
  return nextHeading === -1 ? afterHeading : afterHeading.slice(0, nextHeading);
}

function requireRouteOrder(relative, route) {
  const content = read(relative);
  const section = routeSection(content, route);
  if (!section) {
    failures.push(`${relative}: missing ### ${route} Route`);
    return;
  }

  const harmonyIndex = section.indexOf("Harmony evaluation");
  const imageIndex = section.indexOf("GPT Image reference");
  if (harmonyIndex !== -1 && imageIndex !== -1 && imageIndex < harmonyIndex) {
    failures.push(`${relative}: route ${route} places GPT Image reference before Harmony evaluation`);
  }

  let previousIndex = -1;
  let previousStep = "";
  for (const step of routeSteps) {
    const index = section.indexOf(step);
    if (index === -1) {
      failures.push(`${relative}: route ${route} missing ${step}`);
      continue;
    }
    if (index < previousIndex) {
      failures.push(`${relative}: route ${route} places ${step} before ${previousStep}`);
    }
    previousIndex = index;
    previousStep = step;
  }
}

for (const route of workflowRoutes) {
  requireRouteOrder("guides/webpage-generation-workflow.md", route);
}

const result = {
  ok: failures.length === 0,
  checkedFiles: Object.keys(requiredIncludes),
  checkedRequirements: Object.values(requiredIncludes).reduce((total, snippets) => total + snippets.length, 0),
  failures,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log(`ok: ${result.checkedRequirements} webpage workflow requirements`);
} else {
  console.error(result.failures.join("\n"));
}

process.exit(result.ok ? 0 : 1);
