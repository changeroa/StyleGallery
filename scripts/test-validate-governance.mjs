#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const validator = path.join(root, "scripts", "validate-governance.mjs");
const generatedWarning = "<!-- Generated from `scripts/generate-patterns.mjs` and `scripts/pattern-data.mjs`. Do not hand-edit generated catalog or pattern docs; edit the source files and regenerate. -->";

const files = {
  "AGENTS.md": "# Agent Instructions\n\nSee [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md) and [StyleGallery Domains](DOMAINS.md).\n",
  "README.md": "# StyleGallery\n\n- [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md)\n- [StyleGallery Domains](DOMAINS.md)\n",
  "index.md": "# StyleGallery\n\n- [Governance, lifecycle, and docs-as-code](GOVERNANCE.md)\n- [StyleGallery Domains](DOMAINS.md)\n",
  "DOMAINS.md": "# StyleGallery Domains\n",
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
    "| Domain topology, metadata, provenance, scope boundaries, and root routes remain enforced. | `scripts/validate-domains.mjs` and `scripts/test-validate-domains.mjs` | `node scripts/validate-domains.mjs --json`; `node scripts/test-validate-domains.mjs` | Five governed domains and their declared leaves are reachable and attributed. | Domain metadata, immutable provenance, scope boundaries, and root-route fixtures must fail. | A full SHA proves content identity syntax, not publisher authenticity or local quality. |",
    "Consumer-reference handoffs, schema/runtime parity, and containment remain enforced; repository handoff omissions must fail.",
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
    "| Domain manifest and scope decision | `DOMAINS.md`, `quality/claim-records/stylegallery-multidomain-scope.md` | Manual | None | `stable` | Domain membership, repository-scope, or provenance-policy changes. | `scripts/validate-domains.mjs`, `scripts/validate-governance.mjs` | Repository governance owner |",
    "| Layout domain hub | `layout/index.md` | Manual | None | `stable` | Layout route or ownership changes. | `scripts/validate-domains.mjs`, `scripts/validate-ia.mjs` | Pattern-data owner |",
    "| Motion domain guidance | `motion/*.md` | Manual | None | `experimental` | Upstream revision, evidence boundary, or guidance changes. | `scripts/validate-domains.mjs` | Motion domain owner |",
    "| Design Engineering domain guidance | `design-engineering/*.md` | Manual | None | `experimental` | Upstream revision, evidence boundary, or guidance changes. | `scripts/validate-domains.mjs` | Design Engineering domain owner |",
    "| Game UI domain guidance | `game-ui/**/*.md` | Manual | None | `experimental` | Classification, hierarchy, engine implementation, evidence boundary, or route changes. | `scripts/validate-domains.mjs` | Game UI domain owner |",
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
    "",
  ].join("\n"),
};

const cases = [
  { name: "missing_governance", omit: ["GOVERNANCE.md"], expect: "GOVERNANCE.md: missing file" },
  { name: "missing_matrix_stale_trigger", mutate: { "GOVERNANCE.md": files["GOVERNANCE.md"].replace("Generated structure changes, generated-warning changes, or generated metadata changes.", "Generated structure changes.") }, expect: "GOVERNANCE.md: missing Generated structure changes, generated-warning changes, or generated metadata changes." },
  { name: "missing_game_ui_domain_family", mutate: { "GOVERNANCE.md": files["GOVERNANCE.md"].replace(/^\| Game UI domain guidance .*\n/m, "") }, expect: "GOVERNANCE.md: missing Game UI domain guidance" },
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
  { name: "missing_domain_family", mutate: { "GOVERNANCE.md": files["GOVERNANCE.md"].replace("| Motion domain guidance |", "| Motion reference notes |") }, expect: "GOVERNANCE.md: missing Motion domain guidance" },
  { name: "missing_domain_ci_wiring", mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("node scripts/validate-domains.mjs --json\n", "") }, expect: ".github/workflows/validate.yml: missing node scripts/validate-domains.mjs --json" },
  { name: "missing_domain_evidence_coverage", mutate: { "quality/evidence/executable-evidence.md": files["quality/evidence/executable-evidence.md"].replace("Domain metadata, immutable provenance, scope boundaries, and root-route fixtures must fail.", "Domain fixtures must fail.") }, expect: "quality/evidence/executable-evidence.md: missing Domain metadata, immutable provenance, scope boundaries, and root-route fixtures must fail." },
  { name: "success_path", expect: null },
];

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
