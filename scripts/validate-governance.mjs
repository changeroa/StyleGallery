#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const root = process.cwd();
const failures = [];
const warnings = [];
const sentinelProvenanceClauses = [
  "Completed-CI repository, workflow, run ID and attempt, SHA, and artifact-name fields are workflow-recorded, self-asserted metadata, not an external attestation.",
  "The self-asserted repository field names the canonical upstream changeroa/StyleGallery; the self-asserted execution_repository field names the actual GitHub Actions repository and is limited to changeroa/StyleGallery or ark-jo/StyleGallery.",
  "Verification against the uploaded GitHub Actions run and artifact ID and digest remains pending.",
  "Linux/amd64 repeatability remains unclaimed until that external verification succeeds.",
  "Baseline-owner approval remains unclaimed until the named owner explicitly approves it.",
  "Synthetic fixtures validate rejection and acceptance behavior only; they are not authenticated provenance.",
];
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
  "/consumer-reference/baselines/ @changeroa",
  "/tests/ @changeroa",
  "/playwright.config.mjs @changeroa",
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
    "Proposed Chromium sentinel",
    "Domain manifest and scope decision",
    "Layout domain hub",
    "Motion domain guidance",
    "Design Engineering domain guidance",
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
  requireIncludes(".github/workflows/validate.yml", "node scripts/test-consumer-reference-sentinel.mjs");
  requireIncludes(".github/workflows/validate.yml", "node scripts/validate-baseline-manifest.mjs --json");
  requireIncludes(".github/workflows/validate.yml", "node scripts/test-validate-baseline-manifest.mjs --json");
  requireIncludes(".github/workflows/validate.yml", "node scripts/test-summarize-sentinel-calibration.mjs");
  requireIncludes(".github/workflows/validate.yml", "node scripts/validate-renderer-purity.mjs --json");
  requireIncludes(".github/workflows/validate.yml", "checkout_sha=\"$(git -c safe.directory=\"$GITHUB_WORKSPACE\" rev-parse HEAD)\"");
  requireIncludes(".github/workflows/validate.yml", "--repository \"changeroa/StyleGallery\" \\");
  requireIncludes(".github/workflows/validate.yml", "--execution-repository \"$GITHUB_REPOSITORY\" \\");
  requireIncludes(".github/workflows/validate.yml", "\"repository\":\"%s\",\"execution_repository\":\"%s\"");
  requireIncludes(".github/workflows/validate.yml", "\"changeroa/StyleGallery\" \"$GITHUB_REPOSITORY\" \"$GITHUB_RUN_ID\"");
  if (/safe\.directory(?:=|\s+)["']?\*["']?/.test(read(".github/workflows/validate.yml"))) {
    failures.push(".github/workflows/validate.yml: broad Git safe.directory wildcard is forbidden");
  }
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
  requireIncludes("quality/evidence/executable-evidence.md", "The proposed Chromium sentinel preserves canonical card-grid geometry and truth-derived calibration evidence.");
  requireIncludes("GOVERNANCE.md", "node scripts/test-consumer-reference-sentinel.mjs");
  requireIncludes("GOVERNANCE.md", "owner.enforcement: \"placeholder\"");
  requireIncludes("GOVERNANCE.md", "review_independence: \"single_account\"");
}

function requireSentinelProvenanceBoundary() {
  for (const relative of ["consumer-reference/contract.md", "quality/evidence/executable-evidence.md", "GOVERNANCE.md"]) {
    for (const clause of sentinelProvenanceClauses) requireIncludes(relative, clause);
  }
}

requireGovernanceMatrix();
requireLifecycleStates();
requireOwnership();
requireStalenessDecision();
requireCiwiring();
requireRootLinks();
requireEvidenceMap();
requireSentinelProvenanceBoundary();
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
