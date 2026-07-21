#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { isOmoDependency, markdownLinkDestinations, structuralMarkdown } from "./markdown-structure.mjs";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const root = process.cwd();
const failures = [];
const repository = "https://github.com/emilkowalski/skills";
const revision = "220e8607c90b17337d210125777b7b695f26c221";
const revisionPattern = /^[0-9a-f]{40}$/;
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

const domains = [
  { slug: "layout", label: "Layout", leaves: [] },
  {
    slug: "motion",
    label: "Motion",
    leaves: [
      ["motion/vocabulary.md", "skills/animation-vocabulary/SKILL.md"],
      ["motion/review-workflow.md", "skills/review-animations/SKILL.md"],
      ["motion/practice-reference.md", "skills/review-animations/STANDARDS.md"],
    ],
  },
  { slug: "design-engineering", label: "Design Engineering", leaves: [["design-engineering/interface-craft.md", "skills/emil-design-eng/SKILL.md"]] },
  {
    slug: "game-ui",
    label: "Game UI",
    leaves: [
      ["game-ui/classification.md"],
      ["game-ui/screen-hierarchy.md"],
      ["game-ui/reference-record.md"],
      ["game-ui/unity/architecture.md", "README.md"],
      ["game-ui/unity/ui-systems.md"],
      ["game-ui/unity/cli-loop.md", "README.md"],
      ["game-ui/unity/repository-map.md"],
      ["game-ui/unity/org-wiki.md"],
    ],
  },
  {
    slug: "platform-guides",
    label: "Platform Guides",
    leaves: [
      ["platform-guides/apple-interaction.md", "skills/apple-design/SKILL.md"],
    ],
  },
];

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

function toRepositoryPath(value) {
  return value.split(path.sep).join("/");
}

function parseFrontmatter(relative, content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    failures.push(`${relative}: missing frontmatter`);
    return {};
  }
  const metadata = {};
  for (const rawLine of match[1].split("\n")) {
    if (!rawLine.trim()) continue;
    const separator = rawLine.indexOf(":");
    if (separator === -1) {
      failures.push(`${relative}: malformed frontmatter line`);
      continue;
    }
    const key = rawLine.slice(0, separator).trim();
    const value = rawLine.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (Object.hasOwn(metadata, key)) failures.push(`${relative}: duplicate frontmatter key ${key}`);
    metadata[key] = value;
  }
  return metadata;
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
      const expectedLeaves = domain.leaves.map(([leaf]) => leaf).sort();
      if (JSON.stringify(declaredLeaves) !== JSON.stringify(expectedLeaves)) valid = false;
    }
  }

  if (!valid) {
    failures.push(`${relative}: missing canonical domain contract`);
  }
}

function checkIndex(domain) {
  const relative = `${domain.slug}/index.md`;
  const content = structuralMarkdown(read(relative));
  if (!content) return;
  if (!content.includes("## Scope Boundary")) failures.push(`${relative}: missing Scope Boundary section`);
  if (!/^In scope:\s*\S/m.test(content)) failures.push(`${relative}: missing In scope declaration`);
  if (!/^Out of scope:\s*\S/m.test(content)) failures.push(`${relative}: missing Out of scope declaration`);
  if (!/^Parent: \[[^\]]+\]\([^)]+\)/m.test(content)) failures.push(`${relative}: missing Parent navigation link`);
  if (!/^Next: \[[^\]]+\]\([^)]+\)/m.test(content)) failures.push(`${relative}: missing Next navigation link`);
  for (const [leaf] of domain.leaves) {
    const target = path.posix.relative(domain.slug, leaf);
    if (!content.match(new RegExp(`\\[[^\\]]+\\]\\(${target.replaceAll(".", "\\.")}\\)`))) {
      failures.push(`${relative}: missing leaf route ${target}`);
    }
  }
}

function checkLeaf(domain, relative, expectedSourcePath, titles) {
  const content = read(relative);
  if (!content) return;
  const metadata = parseFrontmatter(relative, content);
  const requiredFields = ["type", "title", "description", "domain", "lifecycle"];
  if (expectedSourcePath) requiredFields.push("source_repository", "source_path", "source_revision");
  for (const field of requiredFields) {
    if (!metadata[field]) failures.push(`${relative}: missing ${field}`);
  }
  const knownDomain = domains.some((candidate) => candidate.slug === metadata.domain);
  if (metadata.domain && !knownDomain) failures.push(`${relative}: unknown domain ${metadata.domain}`);
  else if (metadata.domain && metadata.domain !== domain.slug) failures.push(`${relative}: domain ${metadata.domain} does not match ${domain.slug}`);
  if (metadata.lifecycle && metadata.lifecycle !== "experimental") failures.push(`${relative}: domain leaf lifecycle must be experimental`);
  if (expectedSourcePath) {
    const expectedSource = sourceOverrides[relative] ?? { repository, revision };
    if (metadata.source_repository && metadata.source_repository !== expectedSource.repository) failures.push(`${relative}: unexpected source_repository ${metadata.source_repository}`);
    if (metadata.source_path && metadata.source_path !== expectedSourcePath) failures.push(`${relative}: unexpected source_path ${metadata.source_path}`);
    if (metadata.source_revision && !revisionPattern.test(metadata.source_revision)) {
      failures.push(`${relative}: source_revision must be a full 40-character lowercase Git SHA`);
    } else if (metadata.source_revision && metadata.source_revision !== expectedSource.revision) {
      failures.push(`${relative}: unexpected source_revision ${metadata.source_revision}`);
    }
  } else {
    for (const field of ["source_repository", "source_path", "source_revision"]) {
      if (Object.hasOwn(metadata, field)) failures.push(`${relative}: locally authored leaf must omit ${field}`);
    }
  }
  if (metadata.title) {
    if (titles.has(metadata.title)) failures.push(`${relative}: duplicate title ${metadata.title}`);
    titles.add(metadata.title);
  }
  const body = structuralMarkdown(content);
  for (const section of requiredLeafSections) {
    if (!body.includes(`## ${section}`)) failures.push(`${relative}: missing ${section} section`);
  }
  if (!/^Parent: \[[^\]]+\]\([^)]+\)/m.test(body)) failures.push(`${relative}: missing Parent navigation link`);
  if (!/^Next: \[[^\]]+\]\([^)]+\)/m.test(body)) failures.push(`${relative}: missing Next navigation link`);
  if (markdownLinkDestinations(content).some(isOmoDependency)) failures.push(`${relative}: tracked document must not depend on .omo`);
  if (metadata.lifecycle === "experimental" && /canonical universal policy/i.test(body)) {
    failures.push(`${relative}: experimental document claims canonical authority`);
  }
}

function rejectUndeclaredDomainDocuments() {
  for (const domain of domains) {
    const declared = new Set([`${domain.slug}/index.md`, ...domain.leaves.map(([leaf]) => leaf)]);
    for (const absolute of walkMarkdown(path.join(root, domain.slug))) {
      const relative = toRepositoryPath(path.relative(root, absolute));
      if (!declared.has(relative)) failures.push(`${relative}: undeclared governed domain document`);
    }
  }
}

function walkMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", ".omo", "node_modules"].includes(entry.name)) return [];
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdown(target);
    return entry.isFile() && entry.name.endsWith(".md") ? [target] : [];
  });
}

function rejectOmoDependencies() {
  for (const absolute of walkMarkdown(root)) {
    const relative = toRepositoryPath(path.relative(root, absolute));
    const content = fs.readFileSync(absolute, "utf8");
    if (markdownLinkDestinations(content).some(isOmoDependency)) failures.push(`${relative}: tracked document must not depend on .omo`);
  }
}

checkManifest();
read("quality/claim-records/stylegallery-multidomain-scope.md");
requireRootRoutes();
requireCrossDomainConsistency();
const titles = new Set();
let checkedLeaves = 0;
for (const domain of domains) {
  checkIndex(domain);
  for (const [relative, sourcePath] of domain.leaves) {
    checkedLeaves += 1;
    checkLeaf(domain, relative, sourcePath, titles);
  }
}
rejectUndeclaredDomainDocuments();
rejectOmoDependencies();

const result = { ok: failures.length === 0, checkedDomains: domains.length, checkedLeaves, failures: [...new Set(failures)] };
if (json) console.log(JSON.stringify(result, null, 2));
else if (result.ok) console.log(`ok: ${result.checkedDomains} domains, ${result.checkedLeaves} governed leaves`);
else console.error(result.failures.join("\n"));
process.exit(result.ok ? 0 : 1);
