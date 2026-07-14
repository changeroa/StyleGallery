#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { files, generatedWarning, sentinelProvenanceClauses } from "./governance-test-fixture.mjs";
import { governanceMatrixCases } from "./governance-matrix-negative-cases.mjs";
import { componentStateWorkflowCases } from "./component-state-workflow-negative-cases.mjs";
import { workflowSafetyCases } from "./governance-workflow-negative-cases.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(root, "scripts", "validate-governance.mjs");
const adapterHarness = path.join(root, "scripts", "test-reference-adapters.mjs");
const adapterPipeParser = 'let output = ""; process.stdin.setEncoding("utf8"); process.stdin.on("data", (chunk) => { output += chunk; }); process.stdin.on("end", () => { const report = JSON.parse(output); const complete = report.ok === true && report.failures.length === 0 && report.results.length === 42; process.stdout.write(complete ? "42\\n" : "incomplete\\n"); process.exitCode = complete ? 0 : 1; });';

const cases = [
  { name: "missing_governance", omit: ["GOVERNANCE.md"], expect: "GOVERNANCE.md: missing file" },
  { name: "broad_profile_sources_claim_no_generated_artifacts", mutate: { "GOVERNANCE.md": files["GOVERNANCE.md"].replace(/`design-engineering\/reference-profiles\/governed-local\/editorial\/profile\.json`[^|]+/, "`design-engineering/reference-profiles/governed-local/**`") }, expect: "GOVERNANCE.md: governed local reference profile sources must be the six explicit canonical profile files" },
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
  { name: "missing_promotion_codeowner", mutate: { ".github/CODEOWNERS": files[".github/CODEOWNERS"].replace("/consumer-reference/policies/ @changeroa\n", "") }, expect: ".github/CODEOWNERS: missing /consumer-reference/policies/ @changeroa" },
  { name: "missing_promotion_ci_wiring", mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("node scripts/test-validate-promotion-rfc.mjs --json\n", "") }, expect: ".github/workflows/validate.yml: missing node scripts/test-validate-promotion-rfc.mjs --json" },
  { name: "missing_stable_count_boundary", mutate: { "GOVERNANCE.md": files["GOVERNANCE.md"].replace("Shared stable has no numeric adoption threshold.", "Stable uses an adoption threshold.") }, expect: "GOVERNANCE.md: missing Shared stable has no numeric adoption threshold" },
  { name: "fake_promotion_policy_claim", mutate: { "consumer-reference/policies/shared-experimental.json": files["consumer-reference/policies/shared-experimental.json"].replace('"promotion_occurred": false', '"promotion_occurred": true') }, expect: 'consumer-reference/policies/shared-experimental.json: missing "promotion_occurred": false' },
  { name: "missing_domain_family", mutate: { "GOVERNANCE.md": files["GOVERNANCE.md"].replace("| Motion domain guidance |", "| Motion reference notes |") }, expect: "GOVERNANCE.md: missing Motion domain guidance" },
  { name: "missing_domain_ci_wiring", mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("node scripts/validate-domains.mjs --json\n", "") }, expect: ".github/workflows/validate.yml: missing node scripts/validate-domains.mjs --json" },
  { name: "missing_domain_evidence_coverage", mutate: { "quality/evidence/executable-evidence.md": files["quality/evidence/executable-evidence.md"].replace("Domain metadata, immutable provenance, scope boundaries, and root-route fixtures must fail.", "Domain fixtures must fail.") }, expect: "quality/evidence/executable-evidence.md: missing Domain metadata, immutable provenance, scope boundaries, and root-route fixtures must fail." },
  { name: "missing_sentinel_ci_wiring", mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replaceAll("node scripts/test-consumer-reference-sentinel.mjs", "") }, expect: ".github/workflows/validate.yml: missing node scripts/test-consumer-reference-sentinel.mjs" },
  { name: "missing_component_source_contract_ci", mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("node scripts/test-component-state-source-contract.mjs", "") }, expect: ".github/workflows/validate.yml: missing node scripts/test-component-state-source-contract.mjs" },
  { name: "missing_visual_schema_ci", mutate: { ".github/workflows/validate.yml": files[".github/workflows/validate.yml"].replace("consumer-reference/schema/visual-evidence.schema.json", "") }, expect: ".github/workflows/validate.yml: missing consumer-reference/schema/visual-evidence.schema.json" },
  ...componentStateWorkflowCases(files[".github/workflows/validate.yml"]),
  { name: "missing_sentinel_evidence_coverage", mutate: { "quality/evidence/executable-evidence.md": files["quality/evidence/executable-evidence.md"].replace("The proposed Chromium sentinel preserves canonical card-grid geometry and truth-derived calibration evidence.", "Chromium evidence exists.") }, expect: "quality/evidence/executable-evidence.md: missing The proposed Chromium sentinel preserves canonical card-grid geometry and truth-derived calibration evidence." },
  { name: "missing_component_state_evidence_coverage", mutate: { "quality/evidence/executable-evidence.md": files["quality/evidence/executable-evidence.md"].replace("Governed-local button states retain source-bound visual, DOM, and accessibility-tree evidence across both example profiles.", "Component evidence exists.") }, expect: "quality/evidence/executable-evidence.md: missing Governed-local button states retain source-bound visual, DOM, and accessibility-tree evidence across both example profiles." },
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
  ...governanceMatrixCases(files["GOVERNANCE.md"]),
  ...workflowSafetyCases(files[".github/workflows/validate.yml"]),
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
const adapterPipeCheck = spawnSync("sh", ["-c", '"$NODE_BIN" "$ADAPTER_HARNESS" --json | "$NODE_BIN" -e "$ADAPTER_PIPE_PARSER"'], {
  cwd: root, encoding: "utf8", env: { ...process.env, ADAPTER_HARNESS: adapterHarness, ADAPTER_PIPE_PARSER: adapterPipeParser, NODE_BIN: process.execPath },
});
results.push({
  actual: { status: adapterPipeCheck.status, stdout: adapterPipeCheck.stdout.trim() },
  expected: "complete 42-result JSON report through a pipe",
  name: "adapter_json_pipe_complete",
  ok: adapterPipeCheck.status === 0 && adapterPipeCheck.stdout.trim() === "42",
});
const report = {
  ok: results.every((result) => result.ok),
  results,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;
