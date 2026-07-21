#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const root = process.cwd();
const failures = [];
const warnings = [];
const requiredCodeowners = [
  "* @changeroa",
  "/GOVERNANCE.md @changeroa",
  "/README.md @changeroa",
  "/index.md @changeroa",
  "/AGENTS.md @changeroa",
  "/DOMAINS.md @changeroa",
  "/layout/ @changeroa",
  "/motion/ @changeroa",
  "/design-engineering/ @changeroa",
  "/platform-guides/ @changeroa",
  "/consumer-reference/ @changeroa",
  "/GUIDE.md @changeroa",
  "/guides/ @changeroa",
  "/recipes/ @changeroa",
  "/quality/ @changeroa",
  "/scripts/pattern-data.mjs @changeroa",
  "/scripts/generate-patterns.mjs @changeroa",
  "/patterns/ @changeroa",
  "/CATALOG.md @changeroa",
  "/.github/workflows/validate.yml @changeroa",
  "/.github/ @changeroa",
  "/scripts/ @changeroa",
  "/scripts/validate-*.mjs @changeroa",
  "/scripts/test-validate-*.mjs @changeroa",
];

function read(relative) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) {
    failures.push(`${relative}: missing file`);
    return "";
  }
  return fs.readFileSync(target, "utf8");
}

function requireIncludes(relative, text) {
  if (!read(relative).includes(text)) failures.push(`${relative}: missing ${text}`);
}

function recommendIncludes(relative, text, label = `recommended wording missing ${text}`) {
  if (!read(relative).includes(text)) warnings.push(`${relative}: ${label}`);
}

function requirePattern(relative, pattern, label) {
  if (!pattern.test(read(relative))) failures.push(`${relative}: missing ${label}`);
}

function requireGeneratedWarning(relative) {
  requirePattern(relative, /Generated from `scripts\/generate-patterns\.mjs` and `scripts\/pattern-data\.mjs`\. Do not hand-edit/, "generated warning");
}

function requireGeneratedPatternMetadata(relative) {
  requireIncludes(relative, "lifecycle: generated");
  requireIncludes(relative, "generated_from: scripts/generate-patterns.mjs, scripts/pattern-data.mjs");
}

function requireGovernanceMatrix() {
  const families = [
    "Root repository guide",
    "OKF bundle map",
    "Agent editing rules",
    "Planning guides",
    "Layout recipes",
    "Quality gates and evidence",
    "Consumer reference contract",
    "Domain manifest and scope decision",
    "Layout domain hub",
    "Motion domain guidance",
    "Design Engineering domain guidance",
    "Game UI domain guidance",
    "Platform Guides domain guidance",
    "Pattern data and examples",
    "Pattern generator",
    "Validation scripts",
    "CI workflow",
  ];
  for (const family of families) requireIncludes("GOVERNANCE.md", family);
  requireIncludes("GOVERNANCE.md", "| Doc family | Source of truth | Generator | Generated artifacts | Lifecycle state | Stale trigger | Validator | Review owner |");
  requireIncludes("GOVERNANCE.md", "`scripts/pattern-data.mjs`");
  requireIncludes("GOVERNANCE.md", "`scripts/generate-patterns.mjs`");
  requireIncludes("GOVERNANCE.md", "`scripts/validate-patterns.mjs`, `scripts/validate-catalog.mjs`, `scripts/validate-governance.mjs`");
  requireIncludes("GOVERNANCE.md", "Source-lineage URL changes, generated drift, category changes, or pattern count changes.");
  requireIncludes("GOVERNANCE.md", "Generated structure changes, generated-warning changes, or generated metadata changes.");
}

function requireLifecycleStates() {
  for (const state of ["`draft`", "`stable`", "`deprecated`", "`experimental`", "`generated`"]) {
    requireIncludes("GOVERNANCE.md", state);
  }
}

function requireOwnership() {
  for (const ownerRule of requiredCodeowners) {
    requireIncludes(".github/CODEOWNERS", ownerRule);
  }
  requireIncludes("GOVERNANCE.md", "Review Ownership");
  requireIncludes("GOVERNANCE.md", "CODEOWNERS");
}

function requireStalenessDecision() {
  requireIncludes("GOVERNANCE.md", "scheduled_stale_audit: deferred");
  recommendIncludes("GOVERNANCE.md", "Decision: no scheduled stale-content workflow yet.");
  requireIncludes("GOVERNANCE.md", "Audit trigger:");
  requireIncludes("GOVERNANCE.md", "node scripts/validate-links.mjs --json");
}

function requireCiwiring() {
  requireIncludes(".github/workflows/validate.yml", "node -c scripts/validate-governance.mjs");
  requireIncludes(".github/workflows/validate.yml", "node -c scripts/test-validate-governance.mjs");
  requireIncludes(".github/workflows/validate.yml", "node scripts/validate-governance.mjs --json");
  requireIncludes(".github/workflows/validate.yml", "node scripts/test-validate-governance.mjs --json");
  requireIncludes(".github/workflows/validate.yml", "node -c scripts/validate-domains.mjs");
  requireIncludes(".github/workflows/validate.yml", "node -c scripts/test-validate-domains.mjs");
  requireIncludes(".github/workflows/validate.yml", "node scripts/validate-domains.mjs --json");
  requireIncludes(".github/workflows/validate.yml", "node scripts/test-validate-domains.mjs");
  requireIncludes(".github/workflows/validate.yml", "node scripts/validate-webpage-workflow.mjs --json");
  requireIncludes(".github/workflows/validate.yml", "node scripts/test-validate-webpage-workflow.mjs --json");
  requireIncludes(".github/workflows/validate.yml", "node -c scripts/validate-consumer-reference.mjs");
  requireIncludes(".github/workflows/validate.yml", "node -c scripts/test-validate-consumer-reference.mjs");
  requireIncludes(".github/workflows/validate.yml", "node scripts/validate-consumer-reference.mjs --json");
  requireIncludes(".github/workflows/validate.yml", "node scripts/test-validate-consumer-reference.mjs --json");
  requireIncludes(".github/workflows/validate.yml", "permissions:");
  requireIncludes(".github/workflows/validate.yml", "contents: read");
}

function requireRootLinks() {
  for (const relative of ["README.md", "index.md", "AGENTS.md"]) {
    requirePattern(relative, /\[[^\]]+\]\(GOVERNANCE\.md\)/, "link target GOVERNANCE.md");
  }
  recommendIncludes("README.md", "[Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md)", "recommended link label missing [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md)");
  recommendIncludes("index.md", "[Governance, lifecycle, and docs-as-code](GOVERNANCE.md)", "recommended link label missing [Governance, lifecycle, and docs-as-code](GOVERNANCE.md)");
  recommendIncludes("AGENTS.md", "[Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md)", "recommended link label missing [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md)");
  requireIncludes("README.md", "(DOMAINS.md)");
  requireIncludes("index.md", "(DOMAINS.md)");
  requireIncludes("AGENTS.md", "(DOMAINS.md)");
}

function requireEvidenceMap() {
  requireIncludes("quality/evidence/executable-evidence.md", "scripts/validate-governance.mjs");
  requireIncludes("quality/evidence/executable-evidence.md", "scripts/test-validate-governance.mjs");
  recommendIncludes("quality/evidence/executable-evidence.md", "generated warnings, generated metadata, root link targets");
  requireIncludes("quality/evidence/executable-evidence.md", "Missing governance file, generated warning, generated metadata, CODEOWNERS coverage, or stale policy fixtures must fail.");
  requireIncludes("quality/evidence/executable-evidence.md", "Domain metadata, immutable provenance, scope boundaries, and root-route fixtures must fail.");
  requireIncludes("quality/evidence/executable-evidence.md", "Consumer-reference handoffs, schema/runtime parity");
  requireIncludes("quality/evidence/executable-evidence.md", "repository handoff omissions must fail");
  requireIncludes("GOVERNANCE.md", "owner.enforcement: \"placeholder\"");
  requireIncludes("GOVERNANCE.md", "review_independence: \"single_account\"");
}

requireGovernanceMatrix();
requireLifecycleStates();
requireOwnership();
requireStalenessDecision();
requireCiwiring();
requireRootLinks();
requireEvidenceMap();
requireGeneratedWarning("CATALOG.md");
requireGeneratedWarning("patterns/index.md");
requireGeneratedWarning("patterns/stacking/index.md");
requireGeneratedWarning("patterns/stacking/stack.md");
requireGeneratedPatternMetadata("patterns/stacking/stack.md");

const result = {
  failures,
  ok: failures.length === 0,
  warnings,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log(`ok: governance policy (${warnings.length} warnings)`);
} else {
  console.error(result.failures.join("\n"));
}

process.exit(result.ok ? 0 : 1);
