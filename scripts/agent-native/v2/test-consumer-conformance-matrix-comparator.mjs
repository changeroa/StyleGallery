#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  PIN,
  MUTATION_POLICY,
  SENTINEL_IDS,
  compareConsumerConformanceMatrices,
  expectedRunPolicy,
  matrixCoverageFailures,
  matrixDefinitionReport,
  sourceBinding,
} from "./consumer-conformance-matrix-comparator.mjs";
import {
  assertionPolicyCounters,
  candidateScenarioMatrix,
  fullScenarioMatrix,
  scenarioMatrix,
} from "../../../tests/fixtures/consumer-conformance-scenarios.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const playwrightBin = path.join(repositoryRoot, "node_modules", "@playwright", "test", "cli.js");
const expectedImageId = PIN.image_index.slice(PIN.image_index.indexOf("@sha256:") + 1);
const mutationGreps = Object.freeze({
  "clipped-focus": "@sentinel-clipped-focus",
  "console-error": "@sentinel-console-error",
  "dialog-focus-leak": "@sentinel-dialog-focus-leak",
  "low-contrast": "@sentinel-low-contrast",
  overflow: "@sentinel-overflow",
});

function runUnitContract() {
  const full = fullScenarioMatrix();
  const candidate = candidateScenarioMatrix();
  assert.equal(full.length, 147);
  assert.equal(candidate.length, 67);
  assert.deepEqual(scenarioMatrix().map(({ caseId }) => caseId), full.map(({ caseId }) => caseId), "the full 147-case matrix must remain the default producer");
  assert.ok(candidate.length < full.length);
  assert.deepEqual(matrixCoverageFailures(candidate), []);
  assert.deepEqual(assertionPolicyCounters(candidate).required_sentinel_ids.toSorted(), [
    "ci-cleanup-symlink", "clipped-focus", "console-error", "dialog-focus-leak",
    "low-contrast", "overflow", "page-evidence-existing-output", "page-evidence-symlink",
  ]);
  assert.throws(() => scenarioMatrix("unknown"), /unsupported consumer conformance matrix/);
  const definition = matrixDefinitionReport();
  assert.equal(definition.full.test_count, 147);
  assert.equal(definition.candidate.test_count, 67);
  assert.deepEqual(definition.candidate_coverage_failures, []);
  for (const omittedCase of ["state-w375-focus", "layout-w1440-full-unbroken", "layout-w768-tight-long-paragraph"]) {
    const omitted = candidateScenarioMatrix().filter(({ caseId }) => caseId !== omittedCase);
    assert.ok(matrixCoverageFailures(omitted).length > 0, `must reject omitted ${omittedCase}`);
  }

  const run = (name, matrix, index, wall) => ({
    assertion_policy: expectedRunPolicy(matrix), concurrent_containers: [], container_id: "unit-container",
    ended_at: "2026-07-31T16:01:00.000Z", exit_code: 0, failures: [], image_id: expectedImageId, matrix: name,
    node: PIN.node, output_precondition_empty: true, output_root: `/out/${name}-${index}`, playwright: PIN.playwright,
    retries: 0, schema_version: "1.0", source_binding: sourceBinding(), source_root: repositoryRoot,
    started_at: "2026-07-31T16:00:00.000Z", wall_time_ms: wall, workers: 1,
  });
  const report = {
    candidate_matrix: candidateScenarioMatrix(),
    mutations: Object.entries(MUTATION_POLICY).map(([id, expected_assertion]) => ({ candidate: { exit_code: 1, named_assertion: expected_assertion }, expected_assertion, full: { exit_code: 1, named_assertion: expected_assertion }, id })),
    pin: PIN,
    runs: {
      candidate: [run("candidate", candidate, 1, 500), run("candidate", candidate, 2, 510), run("candidate", candidate, 3, 520)],
      full: [run("full", full, 1, 1000), run("full", full, 2, 1010), run("full", full, 3, 1020)],
    },
    schema_version: "1.0", sentinel_controls: { ids: [...SENTINEL_IDS], ok: true }, source_binding: sourceBinding(),
  };
  assert.equal(compareConsumerConformanceMatrices(report).decision, "experimental_eligible_default_unchanged");
  const forgedRun = { assertion_policy: {}, concurrent_containers: [], container_id: "same", ended_at: "2026-07-31T16:01:00Z", exit_code: 0, failures: [], image_id: "sha256:abc", matrix: "full", node: PIN.node, output_precondition_empty: true, output_root: "/same", playwright: PIN.playwright, retries: 0, schema_version: "1.0", source_binding: sourceBinding(), source_root: repositoryRoot, started_at: "2026-07-31T16:00:00Z", wall_time_ms: 100, workers: 1 };
  const forged = { ...report, candidate_matrix: [], mutations: Array.from({ length: 5 }, () => ({ candidate: { exit_code: 1, named_assertion: "invented" }, expected_assertion: "invented", full: { exit_code: 1, named_assertion: "invented" }, id: "duplicate" })), runs: { candidate: [{ ...forgedRun, matrix: "candidate", wall_time_ms: 50 }, { ...forgedRun, matrix: "candidate", wall_time_ms: 50 }, { ...forgedRun, matrix: "candidate", wall_time_ms: 50 }], full: [forgedRun, forgedRun, forgedRun] }, sentinel_controls: { ids: [], ok: true } };
  const forgedResult = compareConsumerConformanceMatrices(forged);
  assert.equal(forgedResult.ok, false);
  assert.ok(forgedResult.failures.length >= 5);
  for (const [name, mutation] of [
    ["zero test count", (copy) => { copy.runs.full[0].assertion_policy.test_count = 0; }],
    ["empty counters", (copy) => { copy.runs.full[0].assertion_policy = {}; }],
    ["empty evidence IDs", (copy) => { copy.runs.candidate[0].assertion_policy.evidence_ids = []; }],
    ["empty sentinel IDs", (copy) => { copy.runs.candidate[0].assertion_policy.scenario_sentinel_ids = []; }],
    ["forged source binding", (copy) => { copy.source_binding["package-lock.json"] = "0".repeat(64); }],
    ["unbound run source", (copy) => { delete copy.runs.full[0].source_binding; }],
    ["wrong image", (copy) => { copy.runs.full[0].image_id = "sha256:abc"; }],
    ["wrong image manifest", (copy) => { copy.pin.image_manifest_linux_amd64 = "sha256:abc"; }],
    ["missing mutation", (copy) => { copy.mutations.pop(); }],
    ["extra mutation", (copy) => { copy.mutations.push({ candidate: { exit_code: 1, named_assertion: "invented" }, expected_assertion: "invented", full: { exit_code: 1, named_assertion: "invented" }, id: "invented" }); }],
    ["invented mutation assertion", (copy) => { copy.mutations[0].expected_assertion = "invented"; }],
    ["duplicate mutation", (copy) => { copy.mutations[1] = structuredClone(copy.mutations[0]); }],
    ["missing run", (copy) => { copy.runs.candidate.pop(); }],
    ["duplicate output root", (copy) => { copy.runs.candidate[0].output_root = copy.runs.full[0].output_root; }],
    ["extra report field", (copy) => { copy.forged = true; }],
  ]) {
    const copy = structuredClone(report);
    mutation(copy);
    assert.equal(compareConsumerConformanceMatrices(copy).ok, false, `must reject ${name}`);
  }
  return { comparator_negatives: 15, forged_minimal_rejected: true, negative_omissions_blocked: 3, ok: true };
}

function childEnvironment(overrides = {}) {
  const environment = { ...process.env };
  for (const name of [
    "CONSUMER_CONFORMANCE_CAPTURE_DIR", "CONSUMER_CONFORMANCE_MATRIX", "CONSUMER_CONFORMANCE_MUTATION",
    "CONSUMER_CONFORMANCE_OBSERVATION_DIR", "PAGE_EVIDENCE_ARTIFACT_DIR", "PAGE_EVIDENCE_ARTIFACT_ROOT",
    "PAGE_EVIDENCE_CASE_ID", "PAGE_EVIDENCE_RUNNER_RESULT", "PAGE_EVIDENCE_SCENARIO_ID", "PAGE_EVIDENCE_SESSION_RECEIPT",
  ]) delete environment[name];
  return { ...environment, CONSUMER_CONFORMANCE_MUTATION: "none", ...overrides };
}

function runChild(command, args, options = {}) {
  const child = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: childEnvironment(options.env),
    maxBuffer: 64 * 1024 * 1024,
    timeout: options.timeout ?? 20 * 60 * 1000,
  });
  if (child.error) throw child.error;
  return child;
}

function writeEvidenceReceipt(root) {
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "page-evidence-session.json"), `${JSON.stringify({
    attempt: 1,
    intended_scenario_ids: ["responsive-layout"],
    nonce: crypto.randomBytes(32).toString("hex"),
    repository: "changeroa/StyleGallery",
    revision: "0".repeat(40),
    run_id: `matrix-${crypto.randomBytes(8).toString("hex")}`,
    session_id: `matrix-${crypto.randomBytes(8).toString("hex")}`,
    source: { sha256: crypto.createHash("sha256").update(JSON.stringify(sourceBinding())).digest("hex") },
  })}\n`, { flag: "wx" });
}

function collectSpecs(suites, target = []) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) target.push(spec);
    collectSpecs(suite.suites, target);
  }
  return target;
}

function readObservations(root) {
  const files = fs.readdirSync(root).filter((name) => name.startsWith("observation-") && name.endsWith(".json"));
  assert.ok(files.length > 0, "Playwright emitted no worker observations");
  return files.map((name) => JSON.parse(fs.readFileSync(path.join(root, name), "utf8")));
}

function observedPolicy(report, observations) {
  const specs = collectSpecs(report.suites);
  const nonempty = observations.filter((entry) => entry.screenshot_helper_calls > 0 || entry.evidence_helper_calls > 0);
  assert.equal(nonempty.length, 1, "one worker must own all observations when workers=1");
  const observation = nonempty[0];
  return {
    axe_analyze_calls: observation.axe_analyze_calls,
    contrast_helper_calls: observation.contrast_helper_calls,
    contrast_root_checks: observation.contrast_root_checks,
    evidence_artifact_count: observation.evidence_artifacts.length,
    evidence_helper_calls: observation.evidence_helper_calls,
    evidence_ids: [...new Set(observation.evidence_artifacts.map((entry) => entry.case_id))].toSorted(),
    scenario_sentinel_ids: specs.flatMap((spec) => spec.title.match(/@sentinel-[a-z-]+/g) ?? []).toSorted(),
    screenshot_artifact_count: observation.screenshot_artifacts.length,
    screenshot_helper_calls: observation.screenshot_helper_calls,
    test_count: specs.length,
    test_names: specs.map((spec) => spec.title),
  };
}

function runtimePlaywrightVersion() {
  return JSON.parse(fs.readFileSync(path.join(repositoryRoot, "node_modules", "@playwright", "test", "package.json"), "utf8")).version;
}

function executeMatrixRun(matrix, index, executionRoot, grep) {
  const runRoot = path.join(executionRoot, `${matrix}-${index}`);
  const outputPreconditionEmpty = !fs.existsSync(runRoot);
  assert.equal(outputPreconditionEmpty, true, `run output already exists: ${runRoot}`);
  const captureRoot = path.join(runRoot, "screenshots");
  const evidenceRoot = path.join(runRoot, "page-evidence");
  const observationRoot = path.join(runRoot, "observations");
  fs.mkdirSync(observationRoot, { recursive: true });
  writeEvidenceReceipt(evidenceRoot);
  const startedAt = new Date().toISOString();
  const started = process.hrtime.bigint();
  const args = [playwrightBin, "test", "tests/consumer-conformance.spec.mjs", "--project=chromium", "--workers=1", "--retries=0", "--reporter=json"];
  if (grep) args.push("--grep", grep);
  const child = runChild(process.execPath, args, {
    env: {
      CONSUMER_CONFORMANCE_CAPTURE_DIR: captureRoot,
      CONSUMER_CONFORMANCE_MATRIX: matrix,
      CONSUMER_CONFORMANCE_OBSERVATION_DIR: observationRoot,
      PAGE_EVIDENCE_ARTIFACT_ROOT: evidenceRoot,
      PAGE_EVIDENCE_CASE_ID: "state-w1024-focus",
      PAGE_EVIDENCE_SCENARIO_ID: "responsive-layout",
    },
  });
  const wallTimeMs = Number((process.hrtime.bigint() - started) / 1_000_000n);
  const endedAt = new Date().toISOString();
  let playwrightReport;
  try { playwrightReport = JSON.parse(child.stdout); }
  catch { throw new Error(`Playwright JSON report invalid for ${matrix}-${index}: ${child.stdout.slice(0, 1000)}\n${child.stderr.slice(0, 1000)}`); }
  const specs = collectSpecs(playwrightReport.suites);
  const failedSpecs = specs.filter((spec) => !spec.ok);
  const failures = failedSpecs.map((spec) => spec.title);
  if (child.status !== 0 || failures.length > 0) throw new Error(`Playwright ${matrix}-${index} failed (${child.status}): ${JSON.stringify(failedSpecs)} ${JSON.stringify(playwrightReport.errors ?? [])}\n${child.stderr.slice(0, 4000)}`);
  return {
    assertion_policy: observedPolicy(playwrightReport, readObservations(observationRoot)),
    concurrent_containers: [],
    container_id: os.hostname(),
    ended_at: endedAt,
    exit_code: child.status,
    failures,
    image_id: process.env.CONSUMER_CONFORMANCE_IMAGE_ID ?? expectedImageId,
    matrix,
    node: process.version,
    output_precondition_empty: outputPreconditionEmpty,
    output_root: runRoot,
    playwright: runtimePlaywrightVersion(),
    retries: 0,
    schema_version: "1.0",
    source_binding: sourceBinding(),
    source_root: repositoryRoot,
    started_at: startedAt,
    wall_time_ms: wallTimeMs,
    workers: playwrightReport.config?.workers ?? 1,
  };
}

function executeMutation(matrix, id) {
  const expectedAssertion = MUTATION_POLICY[id];
  const child = runChild(process.execPath, [playwrightBin, "test", "tests/consumer-conformance.spec.mjs", "--project=chromium", "--workers=1", "--retries=0", "--reporter=line", "--grep", mutationGreps[id]], {
    env: { CONSUMER_CONFORMANCE_MATRIX: matrix, CONSUMER_CONFORMANCE_MUTATION: id },
    timeout: 3 * 60 * 1000,
  });
  const output = `${child.stdout}\n${child.stderr}`;
  assert.equal(child.status, 1, `${matrix} mutation ${id} must fail exactly once`);
  assert.match(output, new RegExp(expectedAssertion.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${matrix} mutation ${id} did not name ${expectedAssertion}`);
  return { exit_code: child.status, named_assertion: expectedAssertion };
}

function executeSentinelControls() {
  const child = runChild(process.execPath, [path.join(repositoryRoot, "scripts", "test-consumer-conformance-sentinel.mjs"), "--json"], { timeout: 10 * 60 * 1000 });
  let report;
  try { report = JSON.parse(child.stdout); }
  catch { throw new Error(`sentinel control JSON invalid: ${child.stdout.slice(0, 1000)}\n${child.stderr.slice(0, 1000)}`); }
  assert.equal(child.status, 0, `sentinel controls failed: ${JSON.stringify(report.failures)}`);
  assert.equal(report.ok, true);
  assert.deepEqual(report.results.map(({ name }) => name).toSorted(), [...SENTINEL_IDS].toSorted());
  return { ids: [...SENTINEL_IDS], ok: report.ok };
}

function assertExecuteRuntime() {
  assert.equal(process.version, PIN.node, `execute mode requires Node ${PIN.node}`);
  assert.equal(runtimePlaywrightVersion(), PIN.playwright, `execute mode requires Playwright ${PIN.playwright}`);
  assert.equal(process.platform, "linux", "execute mode requires linux/amd64");
  assert.equal(process.arch, "x64", "execute mode requires linux/amd64");
  assert.equal(process.env.CONSUMER_CONFORMANCE_IMAGE_ID, expectedImageId, "execute mode requires the workflow-pinned Playwright image identity");
}

function executeRealComparison() {
  assertExecuteRuntime();
  const executionRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-matrix-comparison-"));
  try {
    const runs = { candidate: [], full: [] };
    for (let index = 1; index <= 3; index += 1) {
      runs.full.push(executeMatrixRun("full", index, executionRoot));
      runs.candidate.push(executeMatrixRun("candidate", index, executionRoot));
    }
    const mutations = Object.entries(MUTATION_POLICY).map(([id, expected_assertion]) => ({
      candidate: executeMutation("candidate", id),
      expected_assertion,
      full: executeMutation("full", id),
      id,
    }));
    const report = {
      candidate_matrix: candidateScenarioMatrix(), mutations, pin: PIN, runs,
      schema_version: "1.0", sentinel_controls: executeSentinelControls(), source_binding: sourceBinding(),
    };
    const reportFile = path.join(executionRoot, "authenticated-report.json");
    const reportBytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(reportFile, reportBytes, { flag: "wx" });
    const comparator = runChild(process.execPath, [path.join(repositoryRoot, "scripts", "agent-native", "v2", "consumer-conformance-matrix-comparator.mjs"), reportFile]);
    assert.equal(comparator.status, 0, `comparator rejected real report: ${comparator.stdout}\n${comparator.stderr}`);
    const result = JSON.parse(comparator.stdout);
    assert.equal(result.ok, true);
    return {
      ...result,
      evidence: {
        candidate_test_counts: runs.candidate.map((run) => run.assertion_policy.test_count),
        full_test_counts: runs.full.map((run) => run.assertion_policy.test_count),
        mutation_runs: mutations.length * 2,
        report_sha256: crypto.createHash("sha256").update(reportBytes).digest("hex"),
        sentinel_controls: SENTINEL_IDS.length,
      },
      timings_ms: { candidate: runs.candidate.map((run) => run.wall_time_ms), full: runs.full.map((run) => run.wall_time_ms) },
    };
  } finally {
    fs.rmSync(executionRoot, { force: true, recursive: true });
  }
}

function executeSmoke(completeCandidate = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-matrix-smoke-"));
  try {
    const run = executeMatrixRun("candidate", 1, root, completeCandidate ? undefined : "state-w1024-focus");
    assert.equal(run.exit_code, 0);
    assert.equal(run.workers, 1);
    if (completeCandidate) assert.deepEqual(run.assertion_policy, expectedRunPolicy(candidateScenarioMatrix()));
    else {
      assert.equal(run.assertion_policy.test_count, 1);
      assert.equal(run.assertion_policy.screenshot_artifact_count, 1);
      assert.equal(run.assertion_policy.evidence_artifact_count, 2);
    }
    return {
      evidence_artifacts: run.assertion_policy.evidence_artifact_count,
      matrix: "candidate",
      ok: true,
      screenshot_artifacts: run.assertion_policy.screenshot_artifact_count,
      test_count: run.assertion_policy.test_count,
      wall_time_ms: run.wall_time_ms,
    };
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
}

const unit = runUnitContract();
const mode = process.argv[2];
if (mode === undefined) process.stdout.write(`${JSON.stringify(unit)}\n`);
else if (mode === "--smoke") process.stdout.write(`${JSON.stringify(executeSmoke())}\n`);
else if (mode === "--smoke-candidate") process.stdout.write(`${JSON.stringify(executeSmoke(true))}\n`);
else if (mode === "--execute") process.stdout.write(`${JSON.stringify(executeRealComparison(), null, 2)}\n`);
else {
  process.stderr.write(`unsupported argument ${mode}; expected --smoke, --smoke-candidate, or --execute\n`);
  process.exitCode = 1;
}
