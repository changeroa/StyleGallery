#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(root, "scripts", "validate-domains.mjs");
const revision = "220e8607c90b17337d210125777b7b695f26c221";
const repository = "https://github.com/emilkowalski/skills";
const unityCliLoopRepository = "https://github.com/hatayama/unity-cli-loop";
const unityCliLoopRevision = "61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0";
const vocabularyDomainList = "Use for: Layout, Motion, Design Engineering, Game UI, Platform Guides, State Management, root routing, and `domain` frontmatter on governed leaves.";
const qualityDomainList = "`quality/` is shared StyleGallery infrastructure for deciding whether Layout, Motion, Design Engineering, Game UI, Platform Guides, and State Management claims are admissible.";
const readmeConsumerReferenceBoundary = "without owning profiles, visual values, components, or another governed domain";
const qualityConsumerReferenceBoundary = "without classifying it as another governed domain";
const executableEvidenceDomainCoverage = "Six governed domains and their declared leaves are reachable and attributed.";
const gameUiFindabilityScenario = "| Find the authority route for uGUI, UI Toolkit, or NGUI. | [README](../README.md) | [Unity UI Systems](../game-ui/unity/ui-systems.md) | The first selected route is Game UI, and the system-specific source and version boundary is reached within three hops. |";
const stateManagementFindabilityScenario = "| Plan application-state ownership and recovery. | [README](../README.md) | [State Management](../state-management/index.md) | The first selected route is State Management and the decision tree or state brief is reached within two hops. |";
const stateManagementLeaves = [
  ["state-management/catalog.md", "State Management Catalog"],
  ["state-management/guides/planning-workflow.md", "State Management Planning Workflow"],
  ["state-management/guides/decision-tree.md", "State Management Decision Tree"],
  ["state-management/guides/state-brief.md", "State Brief"],
  ["state-management/guides/verification-matrix.md", "State Verification Matrix"],
  ["state-management/patterns/index.md", "State Management Patterns"],
  ["state-management/patterns/ownership/local-draft-state.md", "Local Draft State"],
  ["state-management/patterns/ownership/url-owned-state.md", "URL-Owned State"],
  ["state-management/patterns/ownership/server-state-cache.md", "Server-State Cache"],
  ["state-management/patterns/derivation/derived-state.md", "Derived State"],
  ["state-management/patterns/transitions/explicit-transition-model.md", "Explicit Transition Model"],
  ["state-management/patterns/synchronization/optimistic-mutation.md", "Optimistic Mutation"],
  ["state-management/recipes/index.md", "State Management Recipes"],
  ["state-management/recipes/pattern-to-recipe-matrix.md", "State Pattern To Recipe Matrix"],
  ["state-management/recipes/search-and-filter.md", "Search And Filter State"],
  ["state-management/recipes/editable-form.md", "Editable Form State"],
  ["state-management/recipes/optimistic-list.md", "Optimistic List State"],
];

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

function leafPage({ title, domain, sourcePath, parent, next, lifecycle = "experimental", body = "", provenanceKind, forgedSourceFields = false, omitSourceFields = false }) {
  const frontmatter = [
    "---",
    "type: Domain Guide",
    `title: ${title}`,
    `description: Bounded ${title} guidance.`,
    `domain: ${domain}`,
    `lifecycle: ${lifecycle}`,
  ];
  if (provenanceKind) frontmatter.push(`provenance_kind: ${provenanceKind}`);
  if ((sourcePath && !provenanceKind && !omitSourceFields) || forgedSourceFields) {
    frontmatter.push(`source_repository: ${repository}`, `source_path: ${sourcePath}`, `source_revision: ${revision}`);
  }
  const attribution = provenanceKind === "local"
    ? ["- Local StyleGallery method; no upstream attribution."]
    : sourcePath ? [
      `- Upstream inspiration: ${repository}/blob/${revision}/${sourcePath}`,
      `- Snapshot: \`${revision}\``,
      "- Reuse form: independent method rewrite.",
    ] : ["- Reuse form: locally authored method."];
  return [
    ...frontmatter,
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
    ...attribution,
    "",
    "## IA Navigation",
    "",
    `Parent: [Domain](${parent}).`,
    `Next: [Next](${next}).`,
    "",
  ].join("\n");
}

const localLeafPath = "design-engineering/consumer-migration-readiness.md";
const localLeafRegistry = (canonicalDomains) => {
  const registry = structuredClone(canonicalDomains);
  const designEngineering = registry.find((domain) => domain.slug === "design-engineering");
  if (!designEngineering.leaves.some((leaf) => leaf.path === localLeafPath)) designEngineering.leaves.push({ path: localLeafPath, provenance: "local" });
  return registry;
};

const localLeaf = leafPage({
  title: "Consumer Migration Readiness",
  domain: "design-engineering",
  parent: "index.md",
  next: "../platform-guides/index.md",
  provenanceKind: "local",
  sourcePath: "unused/local-source.md",
});

const baseFiles = {
  "README.md": `# StyleGallery\n\nConsumer Reference is shared non-domain infrastructure ${readmeConsumerReferenceBoundary}.\n\n- [Layout](layout/index.md)\n- [Motion](motion/index.md)\n- [Design Engineering](design-engineering/index.md)\n- [Game UI](game-ui/index.md)\n- [Platform Guides](platform-guides/index.md)\n- [State Management](state-management/index.md)\n`,
  "index.md": "# StyleGallery\n\n- [Layout](layout/index.md)\n- [Motion](motion/index.md)\n- [Design Engineering](design-engineering/index.md)\n- [Game UI](game-ui/index.md)\n- [Platform Guides](platform-guides/index.md)\n- [State Management](state-management/index.md)\n",
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
    "| Game UI | [Game UI](game-ui/index.md) | `experimental` |",
    "| Platform Guides | [Platform Guides](platform-guides/index.md) | `experimental` |",
    "| State Management | [State Management](state-management/index.md) | `experimental` |",
    "",
    "## Page Manifest",
    "",
    "| Domain | Manual hub | Governed leaves |",
    "| --- | --- | --- |",
    "| Layout | `layout/index.md` | Existing Layout corpus. |",
    "| Motion | `motion/index.md` | `motion/vocabulary.md`, `motion/review-workflow.md`, `motion/practice-reference.md` |",
    "| Design Engineering | `design-engineering/index.md` | `design-engineering/interface-craft.md`, `design-engineering/consumer-migration-readiness.md`, `design-engineering/reference-profiles/index.md`, `design-engineering/reference-profiles/governed-local/index.md`, `design-engineering/reference-profiles/external-adaptation/index.md` |",
    "| Game UI | `game-ui/index.md` | `game-ui/classification.md`, `game-ui/screen-hierarchy.md`, `game-ui/reference-record.md`, `game-ui/unity/architecture.md`, `game-ui/unity/ui-systems.md`, `game-ui/unity/cli-loop.md`, `game-ui/unity/repository-map.md`, `game-ui/unity/org-wiki.md` |",
    "| Platform Guides | `platform-guides/index.md` | `platform-guides/apple-interaction.md` |",
    `| State Management | \`state-management/index.md\` | ${stateManagementLeaves.map(([path]) => `\`${path}\``).join(", ")} |`,
    "",
    `Source snapshot \`${revision}\`.`,
    "",
    "## Shared Non-Domain Infrastructure",
    "",
    "[Consumer Reference](consumer-reference/index.md) is shared infrastructure outside the six-domain contract and cannot add another domain row.",
    "",
    "## Lifecycle And Staleness",
    "",
    "Domain lifecycle changes are repository-owner decisions when machine-checkable contracts have relevant validator coverage.",
    "User studies, reader tasks, adoption counts, and attestations are neither required nor sufficient for a domain lifecycle change.",
    "",
    "### Consumer Reference Promotion",
    "",
    "This separate contract governs consumer-reference invariant sharing only; it does not govern domain or page lifecycle.",
    "The gateway applies only to consumer-local → shared-experimental invariant eligibility.",
    "Editorial and terminal are related examples in one fixture set.",
    "Shared stable has no numeric adoption threshold.",
    "Normative correctness may waive adoption count only.",
    "A stable contract is never silently relabeled experimental.",
    "Promotion records are JSON-only and examples have zero adopter attestations.",
    "",
  ].join("\n"),
  "layout/index.md": indexPage("Layout", [["Catalog", "../CATALOG.md"]]),
  "motion/index.md": indexPage("Motion", [["Motion Vocabulary", "vocabulary.md"], ["Motion Review Workflow", "review-workflow.md"], ["Motion Practice Reference", "practice-reference.md"]]),
  "motion/vocabulary.md": leafPage({ title: "Motion Vocabulary", domain: "motion", sourcePath: "skills/animation-vocabulary/SKILL.md", parent: "index.md", next: "review-workflow.md" }),
  "motion/review-workflow.md": leafPage({ title: "Motion Review Workflow", domain: "motion", sourcePath: "skills/review-animations/SKILL.md", parent: "index.md", next: "practice-reference.md" }),
  "motion/practice-reference.md": leafPage({ title: "Motion Practice Reference", domain: "motion", sourcePath: "skills/review-animations/STANDARDS.md", parent: "index.md", next: "../design-engineering/index.md" }),
  "design-engineering/index.md": indexPage("Design Engineering", [["Interface Craft", "interface-craft.md"], ["Consumer Migration Readiness", "consumer-migration-readiness.md"], ["Reference Profiles", "reference-profiles/index.md"]]),
  "design-engineering/interface-craft.md": leafPage({ title: "Interface Craft", domain: "design-engineering", sourcePath: "skills/emil-design-eng/SKILL.md", parent: "index.md", next: "../platform-guides/index.md" }),
  [localLeafPath]: localLeaf,
  "design-engineering/reference-profiles/index.md": "# Reference Profiles\n\nDomain classification: design-engineering.\n\n- [Governed Local Profiles](governed-local/index.md)\n\nParent: [Design Engineering](../index.md).\nNext: [External adaptation](external-adaptation/index.md).\n",
  "design-engineering/reference-profiles/governed-local/index.md": "# Governed Local Profiles\n\nParent: [Reference Profiles](../index.md).\nNext: [External adaptation](../external-adaptation/index.md).\n",
  "design-engineering/reference-profiles/external-adaptation/index.md": "# External Adaptation\n\nSynthetic validator coverage only; no durable adopter record.\n\nParent: [Reference Profiles](../index.md).\nNext: [Platform Guides](../../../platform-guides/index.md).\n",
  "game-ui/index.md": indexPage("Game UI", [["Game UI Classification", "classification.md"], ["Game UI Screen Hierarchy", "screen-hierarchy.md"], ["Game UI Reference Record", "reference-record.md"], ["Unity UI Architecture", "unity/architecture.md"], ["Unity UI Systems", "unity/ui-systems.md"], ["Unity CLI Loop", "unity/cli-loop.md"], ["Unity Repository Map", "unity/repository-map.md"], ["Unity Organization Compressed Wiki", "unity/org-wiki.md"]]),
  "game-ui/classification.md": leafPage({ title: "Game UI Classification", domain: "game-ui", parent: "index.md", next: "screen-hierarchy.md" }),
  "game-ui/screen-hierarchy.md": leafPage({ title: "Game UI Screen Hierarchy", domain: "game-ui", parent: "index.md", next: "reference-record.md" }),
  "game-ui/reference-record.md": leafPage({ title: "Game UI Reference Record", domain: "game-ui", parent: "index.md", next: "../platform-guides/index.md" }),
  "game-ui/unity/architecture.md": leafPage({ title: "Unity UI Architecture", domain: "game-ui", sourcePath: "README.md", parent: "../index.md", next: "ui-systems.md" })
    .replaceAll(repository, "https://github.com/annulusgames/UGUIAnimationSamples")
    .replaceAll(revision, "343c8110e5683be209cc01ccb4cb986175e61643"),
  "game-ui/unity/ui-systems.md": leafPage({ title: "Unity UI Systems", domain: "game-ui", parent: "../index.md", next: "cli-loop.md" }),
  "game-ui/unity/cli-loop.md": leafPage({ title: "Unity CLI Loop", domain: "game-ui", sourcePath: "README.md", parent: "../index.md", next: "repository-map.md" })
    .replaceAll(repository, unityCliLoopRepository)
    .replaceAll(revision, unityCliLoopRevision),
  "game-ui/unity/repository-map.md": leafPage({ title: "Unity Repository Map", domain: "game-ui", parent: "../index.md", next: "org-wiki.md" }),
  "game-ui/unity/org-wiki.md": leafPage({ title: "Unity Organization Compressed Wiki", domain: "game-ui", parent: "../index.md", next: "../../platform-guides/index.md" }),
  "platform-guides/index.md": indexPage("Platform Guides", [["Apple Interaction", "apple-interaction.md"]]),
  "platform-guides/apple-interaction.md": leafPage({ title: "Apple Interaction", domain: "platform-guides", sourcePath: "skills/apple-design/SKILL.md", parent: "index.md", next: "../layout/index.md" }),
  "state-management/index.md": indexPage("State Management", stateManagementLeaves.map(([relative, title]) => [title, relative.replace("state-management/", "")])),
  ...Object.fromEntries(stateManagementLeaves.map(([relative, title], index) => [
    relative,
    leafPage({
      title,
      domain: "state-management",
      provenanceKind: "local",
      parent: relative.includes("/") ? "../index.md" : "index.md",
      next: index + 1 < stateManagementLeaves.length ? path.posix.relative(path.posix.dirname(relative), stateManagementLeaves[index + 1][0]) : "../layout/index.md",
    }),
  ])),
  "quality/claim-records/stylegallery-multidomain-scope.md": "# Scope Decision\n\nStyleGallery supersedes the layout-only repository identity.\n",
  "guides/vocabulary.md": `# Controlled Vocabulary\n\n- Canonical: \`domain\`\n  - ${vocabularyDomainList}\n`,
  "quality/index.md": `# Quality Gates\n\n${qualityDomainList}\n\nThe handoff reaches the shared contract ${qualityConsumerReferenceBoundary}.\n\n${gameUiFindabilityScenario}\n${stateManagementFindabilityScenario}\n`,
  "quality/evidence/executable-evidence.md": `# Executable Evidence Coverage\n\n${executableEvidenceDomainCoverage}\n`,
  "CATALOG.md": "# Catalog\n",
};

const cases = [
  { name: "empty_manifest", mutate: ["DOMAINS.md", baseFiles["DOMAINS.md"], "# Empty manifest\n"], expect: "DOMAINS.md: missing canonical domain contract" },
  { name: "manifest_extra_domain", mutate: ["DOMAINS.md", "| Platform Guides | [Platform Guides](platform-guides/index.md) | `experimental` |", "| Platform Guides | [Platform Guides](platform-guides/index.md) | `experimental` |\n| Other | [Other](other/index.md) | `experimental` |"], expect: "DOMAINS.md: missing canonical domain contract" },
  { name: "consumer_reference_sixth_domain", mutate: ["DOMAINS.md", "| Platform Guides | [Platform Guides](platform-guides/index.md) | `experimental` |", "| Platform Guides | [Platform Guides](platform-guides/index.md) | `experimental` |\n| Consumer Reference | [Consumer Reference](consumer-reference/index.md) | `stable` |"], expect: "DOMAINS.md: missing canonical domain contract" },
  { name: "consumer_reference_five_domain_contract", mutate: ["DOMAINS.md", "six-domain contract", "five-domain contract"], expect: "DOMAINS.md: missing canonical domain contract" },
  { name: "domain_lifecycle_reader_gate", mutate: ["DOMAINS.md", "User studies, reader tasks, adoption counts, and attestations are neither required nor sufficient for a domain lifecycle change.", "User studies and reader tasks are required for a domain lifecycle change."], expect: "DOMAINS.md: missing lifecycle boundary User studies, reader tasks, adoption counts, and attestations are neither required nor sufficient for a domain lifecycle change." },
  { name: "consumer_promotion_claims_domain_lifecycle", mutate: ["DOMAINS.md", "does not govern domain or page lifecycle", "also governs domain and page lifecycle"], expect: "DOMAINS.md: missing promotion boundary does not govern domain or page lifecycle" },
  { name: "promotion_stable_by_count", mutate: ["DOMAINS.md", "Shared stable has no numeric adoption threshold.", "Shared stable uses a numeric adoption threshold."], expect: "DOMAINS.md: missing promotion boundary Shared stable has no numeric adoption threshold" },
  { name: "promotion_related_as_independent", mutate: ["DOMAINS.md", "Editorial and terminal are related examples in one fixture set.", "Editorial and terminal are independent consumers."], expect: "DOMAINS.md: missing promotion boundary Editorial and terminal are related examples in one fixture set" },
  { name: "promotion_yaml_route", mutate: ["DOMAINS.md", "Promotion records are JSON-only", "Promotion records may use YAML"], expect: "DOMAINS.md: missing promotion boundary Promotion records are JSON-only" },
  { name: "reference_profiles_fifth_domain", mutate: ["design-engineering/reference-profiles/index.md", "Domain classification: design-engineering.", "Domain classification: reference-profiles."], expect: "design-engineering/reference-profiles/index.md: reference profiles must remain in the Design Engineering domain" },
  { name: "manifest_extra_leaf", mutate: ["DOMAINS.md", "`motion/vocabulary.md`,", "`motion/vocabulary.md`, `motion/ghost.md`,"], expect: "DOMAINS.md: missing canonical domain contract" },
  { name: "manifest_wrong_lifecycle", mutate: ["DOMAINS.md", "| Motion | [Motion](motion/index.md) | `experimental` |", "| Motion | [Motion](motion/index.md) | `stable` |"], expect: "DOMAINS.md: missing canonical domain contract" },
  { name: "missing_domain_index", omit: ["design-engineering/index.md"], expect: "design-engineering/index.md: missing file" },
  { name: "missing_domain_leaf", omit: ["motion/vocabulary.md"], expect: "motion/vocabulary.md: missing file" },
  { name: "missing_local_domain_leaf", omit: ["game-ui/classification.md"], expect: "game-ui/classification.md: missing file" },
  { name: "missing_unity_ui_systems_leaf", omit: ["game-ui/unity/ui-systems.md"], expect: "game-ui/unity/ui-systems.md: missing file" },
  { name: "missing_unity_cli_loop_leaf", omit: ["game-ui/unity/cli-loop.md"], expect: "game-ui/unity/cli-loop.md: missing file" },
  { name: "missing_unity_repository_map_leaf", omit: ["game-ui/unity/repository-map.md"], expect: "game-ui/unity/repository-map.md: missing file" },
  { name: "missing_unity_org_wiki_leaf", omit: ["game-ui/unity/org-wiki.md"], expect: "game-ui/unity/org-wiki.md: missing file" },
  { name: "missing_state_management_index", omit: ["state-management/index.md"], expect: "state-management/index.md: missing file" },
  { name: "missing_state_management_leaf", omit: ["state-management/guides/state-brief.md"], expect: "state-management/guides/state-brief.md: missing file" },
  { name: "undeclared_domain_leaf", add: ["motion/rogue.md", "# Rogue\n"], expect: "motion/rogue.md: undeclared governed domain document" },
  {
    name: "local_leaf_success",
    registry: localLeafRegistry,
    expect: null,
  },
  {
    name: "local_leaf_missing_provenance",
    registry: localLeafRegistry,
    mutate: [localLeafPath, "provenance_kind: local\n", ""],
    expect: "design-engineering/consumer-migration-readiness.md: missing provenance_kind",
  },
  {
    name: "local_leaf_forged_source",
    registry: localLeafRegistry,
    add: [localLeafPath, leafPage({ title: "Consumer Migration Readiness", domain: "design-engineering", parent: "index.md", next: "../platform-guides/index.md", sourcePath: "unused/local-source.md", provenanceKind: "local", forgedSourceFields: true })],
    expect: "design-engineering/consumer-migration-readiness.md: local leaf must not declare source_repository",
  },
  { name: "undeclared_local_leaf", add: ["design-engineering/rogue-local.md", localLeaf.replace("title: Consumer Migration Readiness", "title: Rogue Local Method")], expect: "design-engineering/rogue-local.md: undeclared governed domain document" },
  { name: "undeclared_nested_game_ui_leaf", add: ["game-ui/unity/rogue.md", "# Rogue\n"], expect: "game-ui/unity/rogue.md: undeclared governed domain document" },
  { name: "unknown_domain", mutate: ["motion/vocabulary.md", "domain: motion", "domain: unknown"], expect: "motion/vocabulary.md: unknown domain unknown" },
  { name: "wrong_domain", mutate: ["motion/vocabulary.md", "domain: motion", "domain: platform-guides"], expect: "motion/vocabulary.md: domain platform-guides does not match motion" },
  { name: "missing_lifecycle", mutate: ["motion/vocabulary.md", "lifecycle: experimental\n", ""], expect: "motion/vocabulary.md: missing lifecycle" },
  { name: "short_revision", mutate: ["motion/vocabulary.md", revision, "220e860"], expect: "motion/vocabulary.md: source_revision must be a full 40-character lowercase Git SHA" },
  { name: "wrong_full_revision", mutate: ["motion/vocabulary.md", revision, "0000000000000000000000000000000000000000"], expect: "motion/vocabulary.md: unexpected source_revision 0000000000000000000000000000000000000000" },
  { name: "wrong_source_path", mutate: ["motion/vocabulary.md", "skills/animation-vocabulary/SKILL.md", "skills/apple-design/SKILL.md"], expect: "motion/vocabulary.md: unexpected source_path skills/apple-design/SKILL.md" },
  { name: "unity_wrong_domain", mutate: ["game-ui/unity/architecture.md", "domain: game-ui", "domain: platform-guides"], expect: "game-ui/unity/architecture.md: domain platform-guides does not match game-ui" },
  { name: "unity_wrong_repository", mutate: ["game-ui/unity/architecture.md", "https://github.com/annulusgames/UGUIAnimationSamples", repository], expect: `game-ui/unity/architecture.md: unexpected source_repository ${repository}` },
  { name: "unity_wrong_revision", mutate: ["game-ui/unity/architecture.md", "343c8110e5683be209cc01ccb4cb986175e61643", revision], expect: `game-ui/unity/architecture.md: unexpected source_revision ${revision}` },
  { name: "unity_ui_systems_wrong_domain", mutate: ["game-ui/unity/ui-systems.md", "domain: game-ui", "domain: platform-guides"], expect: "game-ui/unity/ui-systems.md: domain platform-guides does not match game-ui" },
  { name: "unity_repository_map_wrong_domain", mutate: ["game-ui/unity/repository-map.md", "domain: game-ui", "domain: motion"], expect: "game-ui/unity/repository-map.md: domain motion does not match game-ui" },
  { name: "unity_org_wiki_wrong_domain", mutate: ["game-ui/unity/org-wiki.md", "domain: game-ui", "domain: motion"], expect: "game-ui/unity/org-wiki.md: domain motion does not match game-ui" },
  { name: "unity_ui_systems_unexpected_source", mutate: ["game-ui/unity/ui-systems.md", "lifecycle: experimental", `lifecycle: experimental\nsource_repository: ${repository}`], expect: "game-ui/unity/ui-systems.md: locally authored leaf must omit source_repository" },
  { name: "unity_repository_map_unexpected_source", mutate: ["game-ui/unity/repository-map.md", "lifecycle: experimental", `lifecycle: experimental\nsource_repository: ${repository}`], expect: "game-ui/unity/repository-map.md: locally authored leaf must omit source_repository" },
  { name: "unity_org_wiki_unexpected_source", mutate: ["game-ui/unity/org-wiki.md", "lifecycle: experimental", `lifecycle: experimental\nsource_repository: ${repository}`], expect: "game-ui/unity/org-wiki.md: locally authored leaf must omit source_repository" },
  { name: "unity_cli_loop_wrong_repository", mutate: ["game-ui/unity/cli-loop.md", unityCliLoopRepository, repository], expect: `game-ui/unity/cli-loop.md: unexpected source_repository ${repository}` },
  { name: "unity_cli_loop_wrong_source_path", mutate: ["game-ui/unity/cli-loop.md", "source_path: README.md", "source_path: package.json"], expect: "game-ui/unity/cli-loop.md: unexpected source_path package.json" },
  { name: "unity_cli_loop_wrong_revision", mutate: ["game-ui/unity/cli-loop.md", unityCliLoopRevision, revision], expect: `game-ui/unity/cli-loop.md: unexpected source_revision ${revision}` },
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
  { name: "game_ui_route_only_in_html_comment", mutate: ["README.md", "- [Game UI](game-ui/index.md)\n", "<!-- - [Game UI](game-ui/index.md) -->\n"], expect: "README.md: missing [Game UI](game-ui/index.md)" },
  { name: "required_section_only_in_html_comment", mutate: ["motion/vocabulary.md", "## Verification Contract", "<!--\n## Verification Contract\n-->"], expect: "motion/vocabulary.md: missing Verification Contract section" },
  { name: "blank_forbidden_source_key", mutate: ["game-ui/unity/ui-systems.md", "lifecycle: experimental\n---", "lifecycle: experimental\nsource_repository:\n---"], expect: "game-ui/unity/ui-systems.md: locally authored leaf must omit source_repository" },
  { name: "omo_dependency", mutate: ["motion/vocabulary.md", "Verify the claim on its actual surface.", "Verify with [draft](../.omo/research.md)."], expect: "motion/vocabulary.md: tracked document must not depend on .omo" },
  { name: "omo_directory_dependency", mutate: ["motion/vocabulary.md", "Verify the claim on its actual surface.", "Verify with [draft](../.omo)."], expect: "motion/vocabulary.md: tracked document must not depend on .omo" },
  { name: "omo_reference_dependency", mutate: ["motion/vocabulary.md", "Verify the claim on its actual surface.", "Verify with [draft][work].\n\n[work]: ../.omo/research.md"], expect: "motion/vocabulary.md: tracked document must not depend on .omo" },
  { name: "canonical_while_experimental", mutate: ["motion/vocabulary.md", "Treat practitioner preferences as hypotheses.", "This is canonical universal policy."], expect: "motion/vocabulary.md: experimental document claims canonical authority" },
  { name: "vocabulary_missing_game_ui", mutate: ["guides/vocabulary.md", vocabularyDomainList, vocabularyDomainList.replace("Game UI, ", "")], expect: "guides/vocabulary.md: missing canonical six-domain vocabulary list" },
  { name: "quality_missing_game_ui", mutate: ["quality/index.md", qualityDomainList, qualityDomainList.replace("Game UI, ", "")], expect: "quality/index.md: missing canonical six-domain quality scope" },
  { name: "quality_missing_game_ui_findability_scenario", mutate: ["quality/index.md", `${gameUiFindabilityScenario}\n`, ""], expect: "quality/index.md: missing Game UI findability QA scenario" },
  { name: "quality_missing_state_management_findability_scenario", mutate: ["quality/index.md", `${stateManagementFindabilityScenario}\n`, ""], expect: "quality/index.md: missing State Management findability QA scenario" },
  { name: "readme_stale_consumer_reference_boundary", mutate: ["README.md", "another governed domain", "a seventh domain"], expect: "README.md: missing canonical Consumer Reference boundary" },
  { name: "quality_stale_consumer_reference_boundary", mutate: ["quality/index.md", "another governed domain", "a seventh domain"], expect: "quality/index.md: missing canonical Consumer Reference boundary" },
  { name: "executable_evidence_stale_domain_count", mutate: ["quality/evidence/executable-evidence.md", "Six governed domains", "Five governed domains"], expect: "quality/evidence/executable-evidence.md: missing canonical six-domain validator coverage" },
  { name: "success_path", expect: null },
];

function writeFixture(testCase) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `stylegallery-domains-${testCase.name}-`));
  const omitted = new Set(testCase.omit ?? []);
  const entries = { ...baseFiles };
  const mutations = testCase.mutations ?? (testCase.mutate ? [testCase.mutate] : []);
  for (const [relative, before, after] of mutations) entries[relative] = entries[relative].replace(before, after);
  if (testCase.add) {
    const additions = Array.isArray(testCase.add[0]) ? testCase.add : [testCase.add];
    for (const [relative, content] of additions) entries[relative] = content;
  }
  for (const [relative, content] of Object.entries(entries)) {
    if (omitted.has(relative)) continue;
    const target = path.join(dir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return dir;
}

let validatorModulePromise;
async function loadValidatorModule() {
  if (!validatorModulePromise) {
    validatorModulePromise = (async () => {
      const previousExitCode = process.exitCode;
      const originalLog = console.log;
      const originalError = console.error;
      console.log = () => {};
      console.error = () => {};
      try {
        return await import(pathToFileURL(validator).href);
      } catch {
        return null;
      } finally {
        console.log = originalLog;
        console.error = originalError;
        process.exitCode = previousExitCode;
      }
    })();
  }
  return validatorModulePromise;
}

async function runCase(testCase) {
  const dir = writeFixture(testCase);
  let output;
  if (testCase.registry) {
    const module = await loadValidatorModule();
    if (module?.validateDomains && module.canonicalDomains) {
      output = module.validateDomains({ root: dir, domains: testCase.registry(module.canonicalDomains) });
    } else {
      output = { ok: false, failures: ["validator does not expose a registry injection function"] };
    }
  } else {
    const result = spawnSync(process.execPath, [validator, "--json"], { cwd: dir, encoding: "utf8" });
    try {
      output = JSON.parse(result.stdout);
    } catch {
      output = { ok: false, failures: ["validator unavailable or returned non-JSON output"] };
    }
  }
  fs.rmSync(dir, { force: true, recursive: true });
  const passed = testCase.expect ? !output.ok && output.failures.includes(testCase.expect) : output.ok;
  return { name: testCase.name, ok: passed, expected: testCase.expect ?? "ok:true", actual: output };
}

const caseIndex = process.argv.indexOf("--case");
const requestedCase = caseIndex === -1 ? null : process.argv[caseIndex + 1];
const selectedCases = requestedCase ? cases.filter((testCase) => testCase.name === requestedCase) : cases;
if (requestedCase && selectedCases.length === 0) {
  console.error(`unknown case: ${requestedCase}`);
  process.exitCode = 1;
  process.exit();
}

const results = await Promise.all(selectedCases.map(runCase));
const report = { ok: results.every((result) => result.ok), results };
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;
