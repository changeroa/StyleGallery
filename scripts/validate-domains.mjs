#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectDomainBoundaryFailures } from "./domain-document-boundaries.mjs";
import { createDomainValidationChecks } from "./domain-validation-checks.mjs";
import { structuralMarkdown } from "./markdown-structure.mjs";

const repository = "https://github.com/emilkowalski/skills";
const revision = "220e8607c90b17337d210125777b7b695f26c221";
const revisionPattern = /^[0-9a-f]{40}$/;
const referenceDocuments = [
  "design-engineering/reference-profiles/index.md",
  "design-engineering/reference-profiles/governed-local/index.md",
  "design-engineering/reference-profiles/external-adaptation/index.md",
];
const requiredCrossDomainStrings = [
  {
    relative: "guides/vocabulary.md",
    required: "Use for: Layout, Motion, Design Engineering, Game UI, Platform Guides, root routing, and `domain` frontmatter on governed leaves.",
    failure: "guides/vocabulary.md: missing canonical five-domain vocabulary list",
  },
  {
    relative: "quality/index.md",
    required: "`quality/` is shared StyleGallery infrastructure for deciding whether Layout, Motion, Design Engineering, Game UI, and Platform Guides claims are admissible.",
    failure: "quality/index.md: missing canonical five-domain quality scope",
  },
  {
    relative: "README.md",
    required: "without owning profiles, visual values, components, or a sixth domain",
    failure: "README.md: missing canonical Consumer Reference boundary",
  },
  {
    relative: "quality/index.md",
    required: "without classifying it as a sixth domain",
    failure: "quality/index.md: missing canonical Consumer Reference boundary",
  },
  {
    relative: "quality/evidence/executable-evidence.md",
    required: "Five governed domains and their declared leaves are reachable and attributed.",
    failure: "quality/evidence/executable-evidence.md: missing canonical five-domain validator coverage",
  },
  {
    relative: "quality/index.md",
    required: "| Find the authority route for uGUI, UI Toolkit, or NGUI. | [README](../README.md) | [Unity UI Systems](../game-ui/unity/ui-systems.md) | The first selected route is Game UI, and the system-specific source and version boundary is reached within three hops. |",
    failure: "quality/index.md: missing Game UI findability QA scenario",
  },
];

export const canonicalDomains = [
  { slug: "layout", label: "Layout", leaves: [] },
  {
    slug: "motion",
    label: "Motion",
    leaves: [
      { path: "motion/vocabulary.md", provenance: "external", sourcePath: "skills/animation-vocabulary/SKILL.md" },
      { path: "motion/review-workflow.md", provenance: "external", sourcePath: "skills/review-animations/SKILL.md" },
      { path: "motion/practice-reference.md", provenance: "external", sourcePath: "skills/review-animations/STANDARDS.md" },
    ],
  },
  {
    slug: "design-engineering",
    label: "Design Engineering",
    leaves: [
      { path: "design-engineering/interface-craft.md", provenance: "external", sourcePath: "skills/emil-design-eng/SKILL.md" },
      { path: "design-engineering/consumer-migration-readiness.md", provenance: "local" },
    ],
    referenceDocuments,
  },
  {
    slug: "game-ui",
    label: "Game UI",
    leaves: [
      { path: "game-ui/classification.md", provenance: "repository" },
      { path: "game-ui/screen-hierarchy.md", provenance: "repository" },
      { path: "game-ui/reference-record.md", provenance: "repository" },
      { path: "game-ui/unity/architecture.md", provenance: "external", sourcePath: "README.md" },
      { path: "game-ui/unity/ui-systems.md", provenance: "repository" },
      { path: "game-ui/unity/cli-loop.md", provenance: "external", sourcePath: "README.md" },
      { path: "game-ui/unity/repository-map.md", provenance: "repository" },
      { path: "game-ui/unity/org-wiki.md", provenance: "repository" },
    ],
  },
  { slug: "platform-guides", label: "Platform Guides", leaves: [{ path: "platform-guides/apple-interaction.md", provenance: "external", sourcePath: "skills/apple-design/SKILL.md" }] },
];
export const domainRegistry = canonicalDomains;

let domains = canonicalDomains;
let root = process.cwd();
let failures = [];

const sourceOverrides = {
  "game-ui/unity/architecture.md": {
    repository: "https://github.com/annulusgames/UGUIAnimationSamples",
    revision: "343c8110e5683be209cc01ccb4cb986175e61643",
  },
  "game-ui/unity/cli-loop.md": {
    repository: "https://github.com/hatayama/unity-cli-loop",
    revision: "61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0",
  },
};

const requiredLeafSections = [
  "Repository Boundary",
  "Reusable Method",
  "Opinionated Guidance",
  "Platform-Specific Guidance",
  "Unsupported Absolutes",
  "Verification Contract",
  "Source, License, And Attribution",
  "IA Navigation",
];

function read(relative) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) {
    failures.push(`${relative}: missing file`);
    return "";
  }
  return fs.readFileSync(target, "utf8");
}

function requireRootRoutes() {
  for (const relative of ["README.md", "index.md"]) {
    const content = structuralMarkdown(read(relative));
    for (const domain of domains) {
      const route = `[${domain.label}](${domain.slug}/index.md)`;
      if (!content.includes(route)) failures.push(`${relative}: missing ${route}`);
    }
  }
}

function requireCrossDomainConsistency() {
  for (const check of requiredCrossDomainStrings) {
    const content = structuralMarkdown(read(check.relative));
    if (!content.includes(check.required)) failures.push(check.failure);
  }
}

function checkManifest() {
  const relative = "DOMAINS.md";
  const content = structuralMarkdown(read(relative));
  const section = (heading) => content.split(`${heading}\n`)[1]?.split("\n## ")[0] ?? "";
  const tableRows = (body) => {
    const rows = body.split("\n").filter((line) => /^\s*\|.*\|\s*$/.test(line)).map((line) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim()));
    return rows.filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell))).slice(1);
  };
  const domainRows = tableRows(section("## Domain Contract"));
  const pageRows = tableRows(section("## Page Manifest"));
  const expectedLabels = new Set(domains.map((domain) => domain.label));
  const exactLabels = (rows) => rows.length === domains.length && new Set(rows.map((row) => row[0])).size === domains.length && rows.every((row) => expectedLabels.has(row[0]));
  let valid = exactLabels(domainRows)
    && exactLabels(pageRows)
    && content.includes(`snapshot \`${revision}\``)
    && content.includes("## Shared Non-Domain Infrastructure")
    && content.includes("[Consumer Reference](consumer-reference/index.md)")
    && content.includes("infrastructure outside the five-domain contract")
    && content.includes("cannot add a sixth domain row");

  for (const domain of domains) {
    const domainRow = domainRows.find((row) => row[0] === domain.label);
    const pageRow = pageRows.find((row) => row[0] === domain.label);
    const expectedLifecycle = domain.slug === "layout" ? "`stable` and `generated`" : "`experimental`";
    const expectedHub = `[${domain.label}](${domain.slug}/index.md)`;
    const expectedManualHub = `\`${domain.slug}/index.md\``;
    if (!domainRow || domainRow[1] !== expectedHub || domainRow[2] !== expectedLifecycle) valid = false;
    if (!pageRow || pageRow[1] !== expectedManualHub) valid = false;
    if (domain.leaves.length > 0 && pageRow) {
      const declaredLeaves = [...pageRow[2].matchAll(/`([^`]+\.md)`/g)].map((match) => match[1]).sort();
      const expectedLeaves = [...domain.leaves.map((leaf) => leaf.path), ...(domain.referenceDocuments ?? [])].sort();
      if (JSON.stringify(declaredLeaves) !== JSON.stringify(expectedLeaves)) valid = false;
    }
  }

  if (!valid) {
    failures.push(`${relative}: missing canonical domain contract`);
  }
}

function boundaryRegistry(registry) {
  return registry.map((domain) => ({
    ...domain,
    leaves: domain.leaves.map((leaf) => [leaf.path, leaf.sourcePath]),
  }));
}

export function validateDomains({ root: nextRoot = process.cwd(), domains: nextDomains = canonicalDomains } = {}) {
  const previousRoot = root;
  const previousDomains = domains;
  const previousFailures = failures;
  root = nextRoot;
  domains = nextDomains;
  failures = [];
  const { checkDomainLifecycleBoundary, checkIndex, checkLeaf, checkReferenceDocuments, checkPromotionBoundary } = createDomainValidationChecks({
    domains,
    failures,
    read,
    referenceDocuments,
    repository,
    revision,
    revisionPattern,
    requiredLeafSections,
    sourceOverrides,
  });
  checkManifest();
  read("quality/claim-records/stylegallery-multidomain-scope.md");
  requireRootRoutes();
  requireCrossDomainConsistency();
  const titles = new Set();
  let checkedLeaves = 0;
  for (const domain of domains) {
    checkIndex(domain);
    for (const leaf of domain.leaves) {
      checkedLeaves += 1;
      checkLeaf(domain, leaf, titles);
    }
  }
  failures.push(...collectDomainBoundaryFailures(root, boundaryRegistry(domains)));
  checkReferenceDocuments();
  checkDomainLifecycleBoundary();
  checkPromotionBoundary();

  const result = { ok: failures.length === 0, checkedDomains: domains.length, checkedLeaves, failures: [...new Set(failures)] };
  root = previousRoot;
  domains = previousDomains;
  failures = previousFailures;
  return result;
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMainModule) {
  const result = validateDomains();
  if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else if (result.ok) console.log(`ok: ${result.checkedDomains} domains, ${result.checkedLeaves} governed leaves`);
  else console.error(result.failures.join("\n"));
  process.exitCode = result.ok ? 0 : 1;
}
