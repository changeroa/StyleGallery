#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { componentStateWorkflowFailures } from "./component-state-workflow-contract.mjs";
import { consumerEvidenceGovernanceFailures } from "./consumer-evidence-governance-contract.mjs";
import { referenceOwnershipFailures } from "./governance-matrix-contract.mjs";
import { immutableActionPins, requiredCodeowners, sentinelProvenanceClauses } from "./governance-policy-contract.mjs";
import { promotionGovernanceFailures } from "./promotion-governance-contract.mjs";
import { workflowActionFailures } from "./workflow-action-contract.mjs";

const json = new Set(process.argv.slice(2)).has("--json");
const root = process.cwd();
const failures = [];
const warnings = [];
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
    "Governed local reference profiles",
    "Component-state evidence matrices",
    "Consumer migration conformance",
    "Consumer page-evidence lifecycle",
    "Explicit evidence freshness schedule",
    "Deterministic consumer browser conformance",
    "Shared promotion policy",
    "Proposed Chromium sentinel",
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
  requireIncludes("GOVERNANCE.md", "`scripts/generate-consumer-reference-evidence.mjs`");
  requireIncludes("GOVERNANCE.md", "Browser state evidence begins with `scripts/create-component-state-session.mjs`");
  requireIncludes("GOVERNANCE.md", "Receipt creation rejects dirty relevant sources.");
  requireIncludes("GOVERNANCE.md", "browser-authored visual sidecars bind the same session, scenario, capture time, source digest, PNG bytes, dimensions, and hash");
  requireIncludes("GOVERNANCE.md", "exactly 30 channel passes over the closed 40-file runtime set");
  requireIncludes("GOVERNANCE.md", "Validation uses the receipt and completed manifest interval, not a wall-clock maximum age");
  for (const profile of ["editorial", "terminal"]) {
    for (const artifact of ["state-matrix.md", "keyboard-matrix.md", "evidence-coverage.md"]) {
      requireIncludes("GOVERNANCE.md", `design-engineering/reference-profiles/governed-local/${profile}/generated/${artifact}`);
    }
  }
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
  requireIncludes("GOVERNANCE.md", "Audit trigger:");
  requireIncludes("GOVERNANCE.md", "node scripts/validate-links.mjs --json");
}

function requireCiwiring() {
  requireIncludes(".github/workflows/validate.yml", "node -c scripts/component-state-workflow-contract.mjs");
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
  requireIncludes(".github/workflows/validate.yml", "node -c scripts/consumer-reference-case-runner.mjs");
  requireIncludes(".github/workflows/validate.yml", "node -c scripts/governed-profile-registry.mjs");
  requireIncludes(".github/workflows/validate.yml", "node -c scripts/promotion-attestation-contract.mjs");
  requireIncludes(".github/workflows/validate.yml", "node -c scripts/validate-promotion-rfc.mjs");
  requireIncludes(".github/workflows/validate.yml", "node -c scripts/test-validate-promotion-rfc.mjs");
  requireIncludes(".github/workflows/validate.yml", "node scripts/validate-consumer-reference.mjs --json");
  requireIncludes(".github/workflows/validate.yml", "node scripts/test-validate-consumer-reference.mjs --json");
  requireIncludes(".github/workflows/validate.yml", "node scripts/validate-promotion-rfc.mjs --json");
  requireIncludes(".github/workflows/validate.yml", "node scripts/test-validate-promotion-rfc.mjs --json");
  requireIncludes(".github/workflows/validate.yml", "consumer-reference/schema/promotion-rfc.schema.json");
  requireIncludes(".github/workflows/validate.yml", "consumer-reference/policies/shared-experimental.json");
  requireIncludes(".github/workflows/validate.yml", "node scripts/test-consumer-reference-sentinel.mjs");
  requireIncludes(".github/workflows/validate.yml", "node -c scripts/baseline-schema-parity.mjs");
  requireIncludes(".github/workflows/validate.yml", "node -c scripts/test-component-state-source-contract.mjs");
  requireIncludes(".github/workflows/validate.yml", "node scripts/test-component-state-source-contract.mjs");
  requireIncludes(".github/workflows/validate.yml", "consumer-reference/schema/visual-evidence.schema.json");
  requireIncludes(".github/workflows/validate.yml", "node scripts/create-component-state-session.mjs");
  requireIncludes(".github/workflows/validate.yml", "STATE_SESSION_RECEIPT=");
  requireIncludes(".github/workflows/validate.yml", "node scripts/finalize-component-state-evidence.mjs");
  requireIncludes(".github/workflows/validate.yml", "--runtime-manifest");
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

function requireComponentStateCiIsolation() {
  const relative = ".github/workflows/validate.yml";
  for (const failure of componentStateWorkflowFailures(read(relative))) failures.push(`${relative}: ${failure}`);
}

function requireImmutableActions() {
  const relative = ".github/workflows/validate.yml";
  const workflow = read(relative);
  for (const pin of immutableActionPins) if (!workflow.includes(pin)) failures.push(`${relative}: missing immutable action pin ${pin}`);
  failures.push(...workflowActionFailures(workflow, relative));
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
  requireIncludes("quality/evidence/executable-evidence.md", "Governed-local button states retain source-bound visual, DOM, and accessibility-tree evidence across both example profiles.");
  requireIncludes("quality/evidence/executable-evidence.md", "one clean capture session binds the browser artifacts to the governed source inventory");
  requireIncludes("quality/evidence/executable-evidence.md", "It does not prove product suitability, independent adoption, full accessibility, cross-browser behavior, or owner approval");
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
failures.push(...referenceOwnershipFailures(read("GOVERNANCE.md")));
requireLifecycleStates();
requireOwnership();
requireStalenessDecision();
requireCiwiring();
failures.push(...consumerEvidenceGovernanceFailures({
  evidence: read("quality/evidence/executable-evidence.md"),
  freshnessWorkflow: read(".github/workflows/evidence-freshness.yml"),
  governance: read("GOVERNANCE.md"),
  validationWorkflow: read(".github/workflows/validate.yml"),
}));
requireComponentStateCiIsolation();
requireImmutableActions();
requireRootLinks();
requireEvidenceMap();
requireSentinelProvenanceBoundary();
failures.push(...promotionGovernanceFailures(read));
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

process.exitCode = result.ok ? 0 : 1;
