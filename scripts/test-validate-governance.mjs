#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const validator = path.join(root, "scripts", "validate-governance.mjs");
const generatedWarning = "<!-- Generated from `scripts/generate-patterns.mjs` and `scripts/pattern-data.mjs`. Do not hand-edit generated catalog or pattern docs; edit the source files and regenerate. -->";
const sentinelProvenanceClauses = [
  "Completed-CI repository, workflow, run ID and attempt, SHA, and artifact-name fields are workflow-recorded, self-asserted metadata, not an external attestation.",
  "The self-asserted repository field names the canonical upstream changeroa/StyleGallery; the self-asserted execution_repository field names the actual GitHub Actions repository and is limited to changeroa/StyleGallery or ark-jo/StyleGallery.",
  "The committed calibration's external_verification object records an independently checked GitHub Actions run and artifact API identity; artifact.api_digest is distinct from committed_ci.raw_evidence_sha256.",
  "Future CI aggregates remain awaiting_external_verification until their uploaded artifact API identity is independently checked.",
  "Linux/amd64 repeatability is externally verified only for committed run 29260372260; it does not establish baseline-owner approval or product suitability.",
  "Baseline-owner approval remains unclaimed until the named owner explicitly approves it.",
  "Synthetic fixtures validate rejection and acceptance behavior only; they are not authenticated provenance.",
];

const files = {
  "AGENTS.md": "# Agent Instructions\n\nSee [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md) and [StyleGallery Domains](DOMAINS.md).\n",
  "README.md": "# StyleGallery\n\n- [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md)\n- [StyleGallery Domains](DOMAINS.md)\n",
  "index.md": "# StyleGallery\n\n- [Governance, lifecycle, and docs-as-code](GOVERNANCE.md)\n- [StyleGallery Domains](DOMAINS.md)\n",
  "DOMAINS.md": "# StyleGallery Domains\n",
  "consumer-reference/contract.md": `${sentinelProvenanceClauses.join("\n")}\n`,
  "CATALOG.md": `# Layout Pattern Catalog\n\n${generatedWarning}\n`,
  "patterns/index.md": `# Pattern Categories\n\n${generatedWarning}\n`,
  "patterns/stacking/index.md": `# Stacking\n\n${generatedWarning}\n`,
  "patterns/stacking/stack.md": [
    "---",
    "lifecycle: generated",
    "generated_from: scripts/generate-patterns.mjs, scripts/pattern-data.mjs",
    "---",
    "",
    "# stack",
    "",
    generatedWarning,
    "",
  ].join("\n"),
  "quality/evidence/executable-evidence.md": [
    "| Claim | Validator or test | CI command | Positive evidence | Negative evidence | Evidence boundary |",
    "| Governance, lifecycle, generated-file, ownership, and stale-content policy remain discoverable and CI-enforced. | `scripts/validate-governance.mjs` and `scripts/test-validate-governance.mjs` | `node scripts/validate-governance.mjs --json`; `node scripts/test-validate-governance.mjs --json` | `GOVERNANCE.md`, `.github/CODEOWNERS`, generated warnings, generated metadata, root links, lifecycle states, stale-audit decision, and CI wiring are present. | Missing governance file, generated warning, generated metadata, CODEOWNERS coverage, or stale policy fixtures must fail. | Proves governance policy is present and linked, not that CODEOWNERS users have verified repository write access. |",
    "| Domain topology, metadata, provenance, scope boundaries, and root routes remain enforced. | `scripts/validate-domains.mjs` and `scripts/test-validate-domains.mjs` | `node scripts/validate-domains.mjs --json`; `node scripts/test-validate-domains.mjs` | Four governed domains and their declared leaves are reachable and attributed. | Domain metadata, immutable provenance, scope boundaries, and root-route fixtures must fail. | A full SHA proves content identity syntax, not publisher authenticity or local quality. |",
    "Consumer-reference handoffs, schema/runtime parity, and containment remain enforced; repository handoff omissions must fail.",
    "The proposed Chromium sentinel preserves canonical card-grid geometry and truth-derived calibration evidence.",
    "Linux/amd64 20-run calibration and `baseline_owner_approval` remain pending.",
    ...sentinelProvenanceClauses,
    "",
  ].join("\n"),
  ".github/CODEOWNERS": [
    "* @changeroa",
    "/GOVERNANCE.md @changeroa",
    "/README.md @changeroa",
    "/index.md @changeroa",
    "/AGENTS.md @changeroa",
    "/DOMAINS.md @changeroa",
    "/GUIDE.md @changeroa",
    "/guides/ @changeroa",
    "/recipes/ @changeroa",
    "/quality/ @changeroa",
    "/layout/ @changeroa",
    "/motion/ @changeroa",
    "/design-engineering/ @changeroa",
    "/platform-guides/ @changeroa",
    "/consumer-reference/ @changeroa",
    "/consumer-reference/baselines/ @changeroa",
    "/tests/ @changeroa",
    "/playwright.config.mjs @changeroa",
    "/scripts/pattern-data.mjs @changeroa",
    "/scripts/generate-patterns.mjs @changeroa",
    "/patterns/ @changeroa",
    "/CATALOG.md @changeroa",
    "/.github/workflows/validate.yml @changeroa",
    "/.github/ @changeroa",
    "/scripts/ @changeroa",
    "/scripts/validate-*.mjs @changeroa",
    "/scripts/test-validate-*.mjs @changeroa",
    "",
  ].join("\n"),
  ".github/workflows/validate.yml": [
    "jobs:",
    "  validate:",
    "uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4",
    "uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4",
    "uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4",
    "node -c scripts/component-state-workflow-contract.mjs",
    "node -c scripts/validate-governance.mjs",
    "node -c scripts/test-validate-governance.mjs",
    "node scripts/validate-governance.mjs --json",
    "node scripts/test-validate-governance.mjs --json",
    "node -c scripts/validate-domains.mjs",
    "node -c scripts/test-validate-domains.mjs",
    "node scripts/validate-domains.mjs --json",
    "node scripts/test-validate-domains.mjs",
    "node scripts/validate-webpage-workflow.mjs --json",
    "node scripts/test-validate-webpage-workflow.mjs --json",
    "node -c scripts/validate-consumer-reference.mjs",
    "node -c scripts/test-validate-consumer-reference.mjs",
    "node scripts/validate-consumer-reference.mjs --json",
    "node scripts/test-validate-consumer-reference.mjs --json",
    "node scripts/test-consumer-reference-sentinel.mjs",
    "  component-state-evidence:",
    "    env:",
    "      STATE_EVIDENCE_ROOT: .tmp/consumer-reference-state",
    "    container:",
    "      image: mcr.microsoft.com/playwright:v1.61.0-noble@sha256:57b65fdc9ceabe0ef613124c7bbe2babcf9362c4d85e382fe3b03604e84b428a",
    "    steps:",
    "      - name: Run artifact harness",
    "        run: node scripts/test-validate-component-state-artifacts.mjs",
    "      - name: Capture evidence",
    "        env:",
    "          SENTINEL_CONTAINER_IMAGE: mcr.microsoft.com/playwright:v1.61.0-noble@sha256:57b65fdc9ceabe0ef613124c7bbe2babcf9362c4d85e382fe3b03604e84b428a",
    "        run: |",
    "          node scripts/create-component-state-session.mjs \\",
    "            --output \"$STATE_EVIDENCE_ROOT/capture-session.json\" \\",
    "            --json",
    "          STATE_ARTIFACT_DIR=\"$STATE_EVIDENCE_ROOT/runtime\" \\",
    "            STATE_SESSION_RECEIPT=\"$STATE_EVIDENCE_ROOT/capture-session.json\" \\",
    "            npm run test:component-state:runtime -- --reporter=line",
    "          node scripts/finalize-component-state-evidence.mjs \\",
    "            --artifact-root \"$STATE_EVIDENCE_ROOT\" \\",
    "            --output \"$STATE_EVIDENCE_ROOT/runtime-manifest.json\" \\",
    "            --json",
    "          node scripts/validate-component-state.mjs \\",
    "            --artifact-root \"$STATE_EVIDENCE_ROOT\" \\",
    "            --runtime-manifest \"$STATE_EVIDENCE_ROOT/runtime-manifest.json\" \\",
    "            --json",
    "      - name: Upload evidence",
    "        with:",
    "          path: ${{ env.STATE_EVIDENCE_ROOT }}/",
    "  chromium-sentinel:",
    "    steps:",
    "      - run: node scripts/test-consumer-reference-sentinel.mjs",
    "  chromium-calibration:",
    "node scripts/validate-baseline-manifest.mjs --json",
    "node scripts/test-validate-baseline-manifest.mjs --json",
    "node scripts/test-summarize-sentinel-calibration.mjs",
    "node scripts/validate-renderer-purity.mjs --json",
    "checkout_sha=\"$(git -c safe.directory=\"$GITHUB_WORKSPACE\" rev-parse HEAD)\"",
    "--repository \"changeroa/StyleGallery\" \\",
    "--execution-repository \"$GITHUB_REPOSITORY\" \\",
    "\"repository\":\"%s\",\"execution_repository\":\"%s\"",
    "\"changeroa/StyleGallery\" \"$GITHUB_REPOSITORY\" \"$GITHUB_RUN_ID\"",
    "permissions:",
    "contents: read",
    "",
  ].join("\n"),
  "GOVERNANCE.md": [
    "---",
    "scheduled_stale_audit: deferred",
    "---",
    "",
    "# Governance, Lifecycle, And Docs-As-Code",
    "",
    "| Doc family | Source of truth | Generator | Generated artifacts | Lifecycle state | Stale trigger | Validator | Review owner |",
    "| Root repository guide | `README.md` | Manual | None | `stable` | Source-of-truth route changes, broken root links, or ownership changes. | `scripts/validate-okf.mjs` | Repository governance owner |",
    "| OKF bundle map | `index.md` | Manual | None | `scripts/validate-okf.mjs` | Repository governance owner |",
    "| Agent editing rules | `AGENTS.md` | Manual | None | `scripts/validate-links.mjs` | Repository governance owner |",
    "| Planning guides | `GUIDE.md`, `guides/*.md` | Manual | None | `scripts/validate-okf.mjs` | Planning-doc owner |",
    "| Layout recipes | `recipes/*.md` | Manual | None | `scripts/validate-okf.mjs` | Recipe owner |",
    "| Quality gates and evidence | `quality/**/*.md` | Manual | None | `scripts/validate-okf.mjs` | Quality owner |",
    "| Consumer reference contract | `consumer-reference/contract.md` | Manual | None | `stable` | Receiver changes. | `scripts/validate-consumer-reference.mjs` | Validation owner |",
    "| Component-state evidence matrices | Declared component, state, fixture, and evidence records | `scripts/generate-consumer-reference-evidence.mjs` | Six profile matrices | `generated` | Source or generator changes. | `scripts/validate-component-state.mjs` | Validation owner |",
    "| Proposed Chromium sentinel | `tests/helpers/render-consumer-reference.mjs`, `consumer-reference/schema/calibration-record.schema.json`, `consumer-reference/baselines/*.json` | Playwright | Snapshot and raw calibration evidence | `experimental` | Renderer or baseline changes. | `scripts/validate-baseline-manifest.mjs` | Validation owner |",
    "| Domain manifest and scope decision | `DOMAINS.md`, `quality/claim-records/stylegallery-multidomain-scope.md` | Manual | None | `stable` | Domain membership, repository-scope, or provenance-policy changes. | `scripts/validate-domains.mjs`, `scripts/validate-governance.mjs` | Repository governance owner |",
    "| Layout domain hub | `layout/index.md` | Manual | None | `stable` | Layout route or ownership changes. | `scripts/validate-domains.mjs`, `scripts/validate-ia.mjs` | Pattern-data owner |",
    "| Motion domain guidance | `motion/*.md` | Manual | None | `experimental` | Upstream revision, evidence boundary, or guidance changes. | `scripts/validate-domains.mjs` | Motion domain owner |",
    "| Design Engineering domain guidance | `design-engineering/*.md` | Manual | None | `experimental` | Upstream revision, evidence boundary, or guidance changes. | `scripts/validate-domains.mjs` | Design Engineering domain owner |",
    "| Platform Guides domain guidance | `platform-guides/*.md` | Manual | None | `experimental` | Platform version, upstream revision, evidence boundary, or guidance changes. | `scripts/validate-domains.mjs` | Platform Guides domain owner |",
    "| Pattern data and examples | `scripts/pattern-data.mjs` | Manual data source | `patterns/**/*.md` | `generated` output from `stable` source | Source-lineage URL changes, generated drift, category changes, or pattern count changes. | `scripts/validate-patterns.mjs`, `scripts/validate-catalog.mjs`, `scripts/validate-governance.mjs` | Pattern-data owner |",
    "| Pattern generator | `scripts/generate-patterns.mjs` | Manual code source | `patterns/**/*.md` | `stable` generator, `generated` output | Generated structure changes, generated-warning changes, or generated metadata changes. | `node -c scripts/generate-patterns.mjs` | Pattern-data owner |",
    "| Validation scripts | `scripts/validate-*.mjs`, `scripts/test-validate-*.mjs` | Manual code source | CI validation output | `node -c` | Validation owner |",
    "| CI workflow | `.github/workflows/validate.yml` | Manual | GitHub Actions run | GitHub Actions | Repository governance owner |",
    "",
    "## Generated Artifact Policy",
    "Do not hand-edit generated artifacts.",
    "`scripts/pattern-data.mjs`",
    "`scripts/generate-patterns.mjs`",
    "`scripts/generate-consumer-reference-evidence.mjs`",
    "Browser state evidence begins with `scripts/create-component-state-session.mjs`",
    "Validation uses the receipt and completed manifest interval, not a wall-clock maximum age",
    "design-engineering/reference-profiles/governed-local/editorial/generated/state-matrix.md",
    "design-engineering/reference-profiles/governed-local/editorial/generated/keyboard-matrix.md",
    "design-engineering/reference-profiles/governed-local/editorial/generated/evidence-coverage.md",
    "design-engineering/reference-profiles/governed-local/terminal/generated/state-matrix.md",
    "design-engineering/reference-profiles/governed-local/terminal/generated/keyboard-matrix.md",
    "design-engineering/reference-profiles/governed-local/terminal/generated/evidence-coverage.md",
    "",
    "## Lifecycle States",
    "`draft` `stable` `deprecated` `experimental` `generated`",
    "",
    "## Review Ownership",
    "CODEOWNERS",
    "owner.enforcement: \"placeholder\"",
    "review_independence: \"single_account\"",
    "",
    "## Staleness Control",
    "Decision: no scheduled stale-content workflow yet.",
    "Audit trigger:",
    "node scripts/validate-links.mjs --json",
    "node scripts/test-consumer-reference-sentinel.mjs",
    ...sentinelProvenanceClauses,
    "",
  ].join("\n"),
};

const cases = [
  { name: "missing_governance", omit: ["GOVERNANCE.md"], expect: "GOVERNANCE.md: missing file" },
  { name: "missing_matrix_stale_trigger", mutate: { "GOVERNANCE.md": files["GOVERNANCE.md"].replace("Generated structure changes, generated-warning changes, or generated metadata changes.", "Generated structure changes.") }, expect: "GOVERNANCE.md: missing Generated structure changes, generated-warning changes, or generated metadata changes." },
  { name: "missing_evidence_fixture_coverage", mutate: { "quality/evidence/executable-evidence.md": "Missing governance file or generated warning fixtures must fail." }, expect: "quality/evidence/executable-evidence.md: missing Missing governance file, generated warning, generated metadata, CODEOWNERS coverage, or stale policy fixtures must fail." },
  {
    name: "missing_generated_warning",
    mutate: {
      "patterns/stacking/stack.md": [
        "---",
        "lifecycle: generated",
        "generated_from: scripts/generate-patterns.mjs, scripts/pattern-data.mjs",
        "---",
        "",
        "# stack",
        "",
      ].join("\n"),
    },
    expect: "patterns/stacking/stack.md: missing generated warning",
  },
  { name: "missing_generated_metadata", mutate: { "patterns/stacking/stack.md": `# stack\n\n${generatedWarning}\n` }, expect: "patterns/stacking/stack.md: missing lifecycle: generated" },
  {
    name: "missing_codeowners_coverage",
    mutate: {
      ".github/CODEOWNERS": [
        "* @changeroa",
        "/GOVERNANCE.md @changeroa",
        "/scripts/pattern-data.mjs @changeroa",
        "/patterns/ @changeroa",
        "",
      ].join("\n"),
    },
    expect: ".github/CODEOWNERS: missing /README.md @changeroa",
  },
  {
    name: "missing_workflow_permissions",
    mutate: {
      ".github/workflows/validate.yml": [
        "node -c scripts/validate-governance.mjs",
        "node -c scripts/test-validate-governance.mjs",
        "node scripts/validate-governance.mjs --json",
        "node scripts/test-validate-governance.mjs --json",
        "",
      ].join("\n"),
    },
    expect: ".github/workflows/validate.yml: missing permissions:",
  },
  { name: "missing_stale_policy", mutate: { "GOVERNANCE.md": files["GOVERNANCE.md"].replace("scheduled_stale_audit: deferred\n", "") }, expect: "GOVERNANCE.md: missing scheduled_stale_audit: deferred" },
  {
    name: "paraphrased_stale_policy",
    mutate: {
      "GOVERNANCE.md": files["GOVERNANCE.md"].replace(
        "Decision: no scheduled stale-content workflow yet.",
        "Decision: a scheduled stale-content workflow is not needed yet.",
      ),
    },
    expectWarning: "GOVERNANCE.md: recommended wording missing Decision: no scheduled stale-content workflow yet.",
  },
  { name: "paraphrased_governance_link_label", mutate: { "README.md": files["README.md"].replace("[Governance, Lifecycle, And Docs-As-Code]", "[Governance reference]") }, expectWarning: "README.md: recommended link label missing [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md)" },
  { name: "missing_motion_codeowner", mutate: { ".github/CODEOWNERS": files[".github/CODEOWNERS"].replace("/motion/ @changeroa\n", "") }, expect: ".github/CODEOWNERS: missing /motion/ @changeroa" },
  { name: "missing_consumer_reference_codeowner", mutate: { ".github/CODEOWNERS": files[".github/CODEOWNERS"].replace("/consumer-reference/ @changeroa\n", "") }, expect: ".github/CODEOWNERS: missing /consumer-reference/ @changeroa" },
  { name: "missing_baseline_codeowner", mutate: { ".github/CODEOWNERS": files[".github/CODEOWNERS"].replace("/consumer-reference/baselines/ @changeroa\n", "") }, expect: ".github/CODEOWNERS: missing /consumer-reference/baselines/ @changeroa" },
  { name: "missing_domain_family", mutate: { "GOVERNANCE.md": files["GOVERNANCE.md"].replace("| Motion domain guidance |", "| Motion reference notes |") }, expect: "GOVERNANCE.md: missing Motion domain guidance" },
  { name: "missing_domain_ci_wiring", mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("node scripts/validate-domains.mjs --json\n", "") }, expect: ".github/workflows/validate.yml: missing node scripts/validate-domains.mjs --json" },
  { name: "missing_domain_evidence_coverage", mutate: { "quality/evidence/executable-evidence.md": files["quality/evidence/executable-evidence.md"].replace("Domain metadata, immutable provenance, scope boundaries, and root-route fixtures must fail.", "Domain fixtures must fail.") }, expect: "quality/evidence/executable-evidence.md: missing Domain metadata, immutable provenance, scope boundaries, and root-route fixtures must fail." },
  { name: "missing_sentinel_ci_wiring", mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replaceAll("node scripts/test-consumer-reference-sentinel.mjs", "") }, expect: ".github/workflows/validate.yml: missing node scripts/test-consumer-reference-sentinel.mjs" },
  {
    name: "browser_artifact_harness_in_static_job",
    mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("  component-state-evidence:\n", "node scripts/test-validate-component-state-artifacts.mjs\n  component-state-evidence:\n") },
    expect: ".github/workflows/validate.yml: browser-dependent artifact/session harness must not run in validate job",
  },
  {
    name: "browser_artifact_harness_missing_container_job",
    mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("        run: node scripts/test-validate-component-state-artifacts.mjs\n", "") },
    expect: ".github/workflows/validate.yml: component-state artifact/session harness must run in Playwright container job",
  },
  {
    name: "duplicate_artifact_harness_in_chromium_sentinel",
    mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("      - run: node scripts/test-consumer-reference-sentinel.mjs\n", "      - run: node scripts/test-consumer-reference-sentinel.mjs\n      - run: node scripts/test-validate-component-state-artifacts.mjs\n") },
    expect: ".github/workflows/validate.yml: artifact/session harness must run exactly once and only in component-state-evidence job",
  },
  {
    name: "unpinned_component_container_with_pinned_env",
    mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("      image: mcr.microsoft.com/playwright:v1.61.0-noble@sha256:57b65fdc9ceabe0ef613124c7bbe2babcf9362c4d85e382fe3b03604e84b428a", "      image: mcr.microsoft.com/playwright:v1.61.0-noble") },
    expect: ".github/workflows/validate.yml: component-state container.image must equal pinned Playwright digest",
  },
  {
    name: "session_receipt_outside_shared_root",
    mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("            STATE_SESSION_RECEIPT=\"$STATE_EVIDENCE_ROOT/capture-session.json\" \\\n", "            STATE_SESSION_RECEIPT=\"/tmp/capture-session.json\" \\\n") },
    expect: ".github/workflows/validate.yml: component-state runtime must bind receipt under shared root",
  },
  {
    name: "finalizer_output_outside_shared_root",
    mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("            --output \"$STATE_EVIDENCE_ROOT/runtime-manifest.json\" \\\n", "            --output \"/tmp/runtime-manifest.json\" \\\n") },
    expect: ".github/workflows/validate.yml: component-state finalizer must write manifest under shared root",
  },
  {
    name: "validator_manifest_outside_shared_root",
    mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("            --runtime-manifest \"$STATE_EVIDENCE_ROOT/runtime-manifest.json\" \\\n", "            --runtime-manifest \"/tmp/runtime-manifest.json\" \\\n") },
    expect: ".github/workflows/validate.yml: component-state validator must read manifest under shared root",
  },
  {
    name: "finalizer_artifact_root_outside_shared_root",
    mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("          node scripts/finalize-component-state-evidence.mjs \\\n            --artifact-root \"$STATE_EVIDENCE_ROOT\" \\\n", "          node scripts/finalize-component-state-evidence.mjs \\\n            --artifact-root \"/tmp/consumer-reference-state\" \\\n") },
    expect: ".github/workflows/validate.yml: component-state finalizer must use shared artifact root",
  },
  {
    name: "validator_artifact_root_outside_shared_root",
    mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("          node scripts/validate-component-state.mjs \\\n            --artifact-root \"$STATE_EVIDENCE_ROOT\" \\\n", "          node scripts/validate-component-state.mjs \\\n            --artifact-root \"/tmp/consumer-reference-state\" \\\n") },
    expect: ".github/workflows/validate.yml: component-state validator must use shared artifact root",
  },
  {
    name: "runner_temp_in_component_job",
    mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("STATE_EVIDENCE_ROOT: .tmp/consumer-reference-state", "STATE_EVIDENCE_ROOT: ${{ runner.temp }}/consumer-reference-state") },
    expect: ".github/workflows/validate.yml: component-state Playwright container job must not use runner temp paths",
  },
  {
    name: "component_state_workspace_root_drift",
    mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replaceAll(".tmp/consumer-reference-state", "state-output") },
    expect: ".github/workflows/validate.yml: missing shared component-state workspace path STATE_EVIDENCE_ROOT: .tmp/consumer-reference-state",
  },
  { name: "missing_sentinel_evidence_coverage", mutate: { "quality/evidence/executable-evidence.md": files["quality/evidence/executable-evidence.md"].replace("The proposed Chromium sentinel preserves canonical card-grid geometry and truth-derived calibration evidence.", "Chromium evidence exists.") }, expect: "quality/evidence/executable-evidence.md: missing The proposed Chromium sentinel preserves canonical card-grid geometry and truth-derived calibration evidence." },
  {
    name: "floating_action_ref",
    mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4", "uses: actions/checkout@v4") },
    expect: ".github/workflows/validate.yml: floating or unlabeled action ref uses: actions/checkout@v4",
  },
  {
    name: "missing_scoped_checkout_sha_trust",
    mutate: {
      ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace(
        "checkout_sha=\"$(git -c safe.directory=\"$GITHUB_WORKSPACE\" rev-parse HEAD)\"",
        "checkout_sha=\"$(git rev-parse HEAD)\"",
      ),
    },
    expect: ".github/workflows/validate.yml: missing checkout_sha=\"$(git -c safe.directory=\"$GITHUB_WORKSPACE\" rev-parse HEAD)\"",
  },
  {
    name: "reject_broad_checkout_sha_trust",
    mutate: {
      ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace(
        "checkout_sha=\"$(git -c safe.directory=\"$GITHUB_WORKSPACE\" rev-parse HEAD)\"",
        "checkout_sha=\"$(git -c safe.directory='*' rev-parse HEAD)\"",
      ),
    },
    expect: ".github/workflows/validate.yml: broad Git safe.directory wildcard is forbidden",
  },
  {
    name: "missing_canonical_repository_wiring",
    mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("--repository \"changeroa/StyleGallery\" \\", "--repository \"$GITHUB_REPOSITORY\" \\") },
    expect: ".github/workflows/validate.yml: missing --repository \"changeroa/StyleGallery\" \\",
  },
  {
    name: "missing_execution_repository_wiring",
    mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("--execution-repository \"$GITHUB_REPOSITORY\" \\\n", "") },
    expect: ".github/workflows/validate.yml: missing --execution-repository \"$GITHUB_REPOSITORY\" \\",
  },
  {
    name: "workflow_metadata_repository_mismatch",
    mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("\"changeroa/StyleGallery\" \"$GITHUB_REPOSITORY\" \"$GITHUB_RUN_ID\"", "\"$GITHUB_REPOSITORY\" \"changeroa/StyleGallery\" \"$GITHUB_RUN_ID\"") },
    expect: ".github/workflows/validate.yml: missing \"changeroa/StyleGallery\" \"$GITHUB_REPOSITORY\" \"$GITHUB_RUN_ID\"",
  },
  { name: "success_path", expect: null },
];

for (const [pathIndex, relative] of ["consumer-reference/contract.md", "quality/evidence/executable-evidence.md", "GOVERNANCE.md"].entries()) {
  for (const [clauseIndex, clause] of sentinelProvenanceClauses.entries()) {
    cases.splice(cases.length - 1, 0,
      { name: `provenance_clause_deleted_${pathIndex}_${clauseIndex}`, mutate: { [relative]: files[relative].replace(clause, "") }, expect: `${relative}: missing ${clause}` },
      { name: `provenance_clause_misworded_${pathIndex}_${clauseIndex}`, mutate: { [relative]: files[relative].replace(clause, `Misworded ${clause.slice(1)}`) }, expect: `${relative}: missing ${clause}` },
    );
  }
}

function writeFixture(testCase) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `layout-gallery-governance-${testCase.name}-`));
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
  const passed = testCase.expectWarning
    ? output.ok && output.warnings?.includes(testCase.expectWarning)
    : testCase.expect
      ? !output.ok && output.failures.includes(testCase.expect)
      : output.ok;
  return {
    actual: output,
    expected: testCase.expectWarning ?? testCase.expect ?? "ok:true",
    name: testCase.name,
    ok: passed,
  };
}

const results = cases.map(runCase);
const report = {
  ok: results.every((result) => result.ok),
  results,
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
