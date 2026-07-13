#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const validator = path.join(root, "scripts", "validate-domains.mjs");
const revision = "220e8607c90b17337d210125777b7b695f26c221";
const repository = "https://github.com/emilkowalski/skills";

function indexPage(title, links) {
  return [
    `# ${title}`,
    "",
    "## Scope Boundary",
    "",
    "In scope: governed guidance for this domain.",
    "Out of scope: reusable Layout pattern CSS and universal authority.",
    "",
    "## Documents",
    "",
    ...links.map(([label, target]) => `- [${label}](${target})`),
    "",
    "## IA Navigation",
    "",
    "Parent: [StyleGallery](../index.md).",
    "Next: [Domains](../DOMAINS.md).",
    "",
  ].join("\n");
}

function leafPage({ title, domain, sourcePath, parent, next, lifecycle = "experimental", body = "" }) {
  return [
    "---",
    "type: Domain Guide",
    `title: ${title}`,
    `description: Bounded ${title} guidance.`,
    `domain: ${domain}`,
    `lifecycle: ${lifecycle}`,
    `source_repository: ${repository}`,
    `source_path: ${sourcePath}`,
    `source_revision: ${revision}`,
    "---",
    "",
    `# ${title}`,
    "",
    "## Repository Boundary",
    "",
    "This page is an independent method rewrite, not universal policy.",
    "",
    "## Reusable Method",
    "",
    "Use observable evidence and preserve ambiguity.",
    "",
    "## Opinionated Guidance",
    "",
    "Treat practitioner preferences as hypotheses.",
    "",
    "## Platform-Specific Guidance",
    "",
    "Label platform examples explicitly.",
    "",
    "## Unsupported Absolutes",
    "",
    "Do not promote categorical performance or accessibility claims.",
    "",
    "## Verification Contract",
    "",
    "Verify the claim on its actual surface.",
    body,
    "",
    "## Source, License, And Attribution",
    "",
    `- Upstream inspiration: ${repository}/blob/${revision}/${sourcePath}`,
    `- Snapshot: \`${revision}\``,
    "- Reuse form: independent method rewrite.",
    "",
    "## IA Navigation",
    "",
    `Parent: [Domain](${parent}).`,
    `Next: [Next](${next}).`,
    "",
  ].join("\n");
}

const baseFiles = {
  "README.md": "# StyleGallery\n\n- [Layout](layout/index.md)\n- [Motion](motion/index.md)\n- [Design Engineering](design-engineering/index.md)\n- [Platform Guides](platform-guides/index.md)\n",
  "index.md": "# StyleGallery\n\n- [Layout](layout/index.md)\n- [Motion](motion/index.md)\n- [Design Engineering](design-engineering/index.md)\n- [Platform Guides](platform-guides/index.md)\n",
  "DOMAINS.md": [
    "# StyleGallery Domains",
    "",
    "## Domain Contract",
    "",
    "| Domain | Hub | Lifecycle |",
    "| --- | --- | --- |",
    "| Layout | [Layout](layout/index.md) | `stable` and `generated` |",
    "| Motion | [Motion](motion/index.md) | `experimental` |",
    "| Design Engineering | [Design Engineering](design-engineering/index.md) | `experimental` |",
    "| Platform Guides | [Platform Guides](platform-guides/index.md) | `experimental` |",
    "",
    "## Page Manifest",
    "",
    "| Domain | Manual hub | Governed leaves |",
    "| --- | --- | --- |",
    "| Layout | `layout/index.md` | Existing Layout corpus. |",
    "| Motion | `motion/index.md` | `motion/vocabulary.md`, `motion/review-workflow.md`, `motion/practice-reference.md` |",
    "| Design Engineering | `design-engineering/index.md` | `design-engineering/interface-craft.md`, `design-engineering/reference-profiles/index.md`, `design-engineering/reference-profiles/governed-local/index.md`, `design-engineering/reference-profiles/external-adaptation/index.md` |",
    "| Platform Guides | `platform-guides/index.md` | `platform-guides/apple-interaction.md` |",
    "",
    `Source snapshot \`${revision}\`.`,
    "",
    "## Shared Non-Domain Infrastructure",
    "",
    "[Consumer Reference](consumer-reference/index.md) is shared infrastructure and not a fifth domain.",
    "",
  ].join("\n"),
  "layout/index.md": indexPage("Layout", [["Catalog", "../CATALOG.md"]]),
  "motion/index.md": indexPage("Motion", [["Motion Vocabulary", "vocabulary.md"], ["Motion Review Workflow", "review-workflow.md"], ["Motion Practice Reference", "practice-reference.md"]]),
  "motion/vocabulary.md": leafPage({ title: "Motion Vocabulary", domain: "motion", sourcePath: "skills/animation-vocabulary/SKILL.md", parent: "index.md", next: "review-workflow.md" }),
  "motion/review-workflow.md": leafPage({ title: "Motion Review Workflow", domain: "motion", sourcePath: "skills/review-animations/SKILL.md", parent: "index.md", next: "practice-reference.md" }),
  "motion/practice-reference.md": leafPage({ title: "Motion Practice Reference", domain: "motion", sourcePath: "skills/review-animations/STANDARDS.md", parent: "index.md", next: "../design-engineering/index.md" }),
  "design-engineering/index.md": indexPage("Design Engineering", [["Interface Craft", "interface-craft.md"], ["Reference Profiles", "reference-profiles/index.md"]]),
  "design-engineering/interface-craft.md": leafPage({ title: "Interface Craft", domain: "design-engineering", sourcePath: "skills/emil-design-eng/SKILL.md", parent: "index.md", next: "../platform-guides/index.md" }),
  "design-engineering/reference-profiles/index.md": "# Reference Profiles\n\nDomain classification: design-engineering.\n\n- [Governed Local Profiles](governed-local/index.md)\n\nParent: [Design Engineering](../index.md).\nNext: [External adaptation](external-adaptation/index.md).\n",
  "design-engineering/reference-profiles/governed-local/index.md": "# Governed Local Profiles\n\nParent: [Reference Profiles](../index.md).\nNext: [External adaptation](../external-adaptation/index.md).\n",
  "design-engineering/reference-profiles/external-adaptation/index.md": "# External Adaptation\n\nSynthetic validator coverage only; no durable adopter record.\n\nParent: [Reference Profiles](../index.md).\nNext: [Platform Guides](../../../platform-guides/index.md).\n",
  "platform-guides/index.md": indexPage("Platform Guides", [["Apple Interaction", "apple-interaction.md"]]),
  "platform-guides/apple-interaction.md": leafPage({ title: "Apple Interaction", domain: "platform-guides", sourcePath: "skills/apple-design/SKILL.md", parent: "index.md", next: "../layout/index.md" }),
  "quality/claim-records/stylegallery-multidomain-scope.md": "# Scope Decision\n\nStyleGallery supersedes the layout-only repository identity.\n",
  "CATALOG.md": "# Catalog\n",
};

const cases = [
  { name: "empty_manifest", mutate: ["DOMAINS.md", baseFiles["DOMAINS.md"], "# Empty manifest\n"], expect: "DOMAINS.md: missing canonical domain contract" },
  { name: "manifest_extra_domain", mutate: ["DOMAINS.md", "| Platform Guides | [Platform Guides](platform-guides/index.md) | `experimental` |", "| Platform Guides | [Platform Guides](platform-guides/index.md) | `experimental` |\n| Other | [Other](other/index.md) | `experimental` |"], expect: "DOMAINS.md: missing canonical domain contract" },
  { name: "consumer_reference_fifth_domain", mutate: ["DOMAINS.md", "| Platform Guides | [Platform Guides](platform-guides/index.md) | `experimental` |", "| Platform Guides | [Platform Guides](platform-guides/index.md) | `experimental` |\n| Consumer Reference | [Consumer Reference](consumer-reference/index.md) | `stable` |"], expect: "DOMAINS.md: missing canonical domain contract" },
  { name: "reference_profiles_fifth_domain", mutate: ["design-engineering/reference-profiles/index.md", "Domain classification: design-engineering.", "Domain classification: reference-profiles."], expect: "design-engineering/reference-profiles/index.md: reference profiles must remain in the Design Engineering domain" },
  { name: "manifest_extra_leaf", mutate: ["DOMAINS.md", "`motion/vocabulary.md`,", "`motion/vocabulary.md`, `motion/ghost.md`,"], expect: "DOMAINS.md: missing canonical domain contract" },
  { name: "manifest_wrong_lifecycle", mutate: ["DOMAINS.md", "| Motion | [Motion](motion/index.md) | `experimental` |", "| Motion | [Motion](motion/index.md) | `stable` |"], expect: "DOMAINS.md: missing canonical domain contract" },
  { name: "missing_domain_index", omit: ["design-engineering/index.md"], expect: "design-engineering/index.md: missing file" },
  { name: "missing_domain_leaf", omit: ["motion/vocabulary.md"], expect: "motion/vocabulary.md: missing file" },
  { name: "undeclared_domain_leaf", add: ["motion/rogue.md", "# Rogue\n"], expect: "motion/rogue.md: undeclared governed domain document" },
  { name: "unknown_domain", mutate: ["motion/vocabulary.md", "domain: motion", "domain: unknown"], expect: "motion/vocabulary.md: unknown domain unknown" },
  { name: "wrong_domain", mutate: ["motion/vocabulary.md", "domain: motion", "domain: platform-guides"], expect: "motion/vocabulary.md: domain platform-guides does not match motion" },
  { name: "missing_lifecycle", mutate: ["motion/vocabulary.md", "lifecycle: experimental\n", ""], expect: "motion/vocabulary.md: missing lifecycle" },
  { name: "short_revision", mutate: ["motion/vocabulary.md", revision, "220e860"], expect: "motion/vocabulary.md: source_revision must be a full 40-character lowercase Git SHA" },
  { name: "wrong_full_revision", mutate: ["motion/vocabulary.md", revision, "0000000000000000000000000000000000000000"], expect: "motion/vocabulary.md: unexpected source_revision 0000000000000000000000000000000000000000" },
  { name: "wrong_source_path", mutate: ["motion/vocabulary.md", "skills/animation-vocabulary/SKILL.md", "skills/apple-design/SKILL.md"], expect: "motion/vocabulary.md: unexpected source_path skills/apple-design/SKILL.md" },
  { name: "missing_scope", mutate: ["motion/index.md", "## Scope Boundary", "## Boundary"], expect: "motion/index.md: missing Scope Boundary section" },
  { name: "scope_only_in_fence", mutate: ["motion/index.md", "## Scope Boundary", "## Boundary\n\n```md\n## Scope Boundary\nIn scope: fake\nOut of scope: fake\n```"], expect: "motion/index.md: missing Scope Boundary section" },
  { name: "scope_only_in_tilde_fence", mutate: ["motion/index.md", "## Scope Boundary", "## Boundary\n\n~~~md\n## Scope Boundary\nIn scope: fake\nOut of scope: fake\n~~~"], expect: "motion/index.md: missing Scope Boundary section" },
  { name: "missing_parent", mutate: ["motion/vocabulary.md", "Parent: [Domain](index.md).", ""], expect: "motion/vocabulary.md: missing Parent navigation link" },
  { name: "missing_next", mutate: ["motion/vocabulary.md", "Next: [Next](review-workflow.md).", ""], expect: "motion/vocabulary.md: missing Next navigation link" },
  { name: "duplicate_title", mutate: ["design-engineering/interface-craft.md", "title: Interface Craft", "title: Motion Vocabulary"], expect: "design-engineering/interface-craft.md: duplicate title Motion Vocabulary" },
  { name: "unreachable_domain", mutate: ["README.md", "- [Motion](motion/index.md)\n", ""], expect: "README.md: missing [Motion](motion/index.md)" },
  { name: "route_only_in_fence", mutate: ["README.md", "- [Motion](motion/index.md)\n", "```md\n- [Motion](motion/index.md)\n```\n"], expect: "README.md: missing [Motion](motion/index.md)" },
  { name: "route_only_in_backtick_fence_with_tilde_info", mutate: ["README.md", "- [Motion](motion/index.md)\n", "```md~example\n- [Motion](motion/index.md)\n```\n"], expect: "README.md: missing [Motion](motion/index.md)" },
  { name: "route_only_in_tilde_fence_with_backtick_info", mutate: ["README.md", "- [Motion](motion/index.md)\n", "~~~md`example\n- [Motion](motion/index.md)\n~~~\n"], expect: "README.md: missing [Motion](motion/index.md)" },
  { name: "omo_dependency", mutate: ["motion/vocabulary.md", "Verify the claim on its actual surface.", "Verify with [draft](../.omo/research.md)."], expect: "motion/vocabulary.md: tracked document must not depend on .omo" },
  { name: "omo_directory_dependency", mutate: ["motion/vocabulary.md", "Verify the claim on its actual surface.", "Verify with [draft](../.omo)."], expect: "motion/vocabulary.md: tracked document must not depend on .omo" },
  { name: "omo_reference_dependency", mutate: ["motion/vocabulary.md", "Verify the claim on its actual surface.", "Verify with [draft][work].\n\n[work]: ../.omo/research.md"], expect: "motion/vocabulary.md: tracked document must not depend on .omo" },
  { name: "canonical_while_experimental", mutate: ["motion/vocabulary.md", "Treat practitioner preferences as hypotheses.", "This is canonical universal policy."], expect: "motion/vocabulary.md: experimental document claims canonical authority" },
  { name: "success_path", expect: null },
];

function writeFixture(testCase) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `stylegallery-domains-${testCase.name}-`));
  const omitted = new Set(testCase.omit ?? []);
  const entries = { ...baseFiles };
  if (testCase.mutate) {
    const [relative, before, after] = testCase.mutate;
    entries[relative] = entries[relative].replace(before, after);
  }
  if (testCase.add) {
    const [relative, content] = testCase.add;
    entries[relative] = content;
  }
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
  const result = spawnSync(process.execPath, [validator, "--json"], { cwd: dir, encoding: "utf8" });
  fs.rmSync(dir, { force: true, recursive: true });
  let output;
  try {
    output = JSON.parse(result.stdout);
  } catch {
    output = { ok: false, failures: ["validator unavailable or returned non-JSON output"] };
  }
  const passed = testCase.expect ? !output.ok && output.failures.includes(testCase.expect) : output.ok;
  return { name: testCase.name, ok: passed, expected: testCase.expect ?? "ok:true", actual: output };
}

const results = cases.map(runCase);
const report = { ok: results.every((result) => result.ok), results };
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
