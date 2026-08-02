#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CONTAINERS,
  CONTENTS,
  VIEWPORTS,
  assertionPolicyCounters,
  candidateScenarioMatrix,
  fullScenarioMatrix,
} from "../../../tests/fixtures/consumer-conformance-scenarios.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const PIN = Object.freeze({
  image_index: "mcr.microsoft.com/playwright:v1.61.0-noble@sha256:57b65fdc9ceabe0ef613124c7bbe2babcf9362c4d85e382fe3b03604e84b428a",
  image_manifest_linux_amd64: "sha256:111dde95859f2c659291cb60e698f9048a8fc30b35b4ddb7c90f9cb5b73062d9",
  node: "v22.18.0",
  platform: "linux/amd64",
  playwright: "1.61.0",
  retries: 0,
  workers: 1,
});
const IMAGE_ID = "sha256:57b65fdc9ceabe0ef613124c7bbe2babcf9362c4d85e382fe3b03604e84b428a";

export const MUTATION_POLICY = Object.freeze({
  "clipped-focus": "focus_geometry_visible",
  "console-error": "console_error_free",
  "dialog-focus-leak": "dialog_focus_trap",
  "low-contrast": "color-contrast",
  overflow: "document_no_horizontal_overflow",
});
export const SENTINEL_IDS = Object.freeze([
  "ci-cleanup-symlink", "clipped-focus", "console-error", "dialog-focus-leak",
  "low-contrast", "overflow", "page-evidence-existing-output", "page-evidence-symlink",
]);
const REQUIRED_CASES = Object.freeze([
  "dialog-w375", "layout-w320-full-unbroken", "layout-w320-tight-empty",
  "layout-w1440-full-unbroken", "state-w320-loading", "state-w375-default",
  "state-w375-focus", "state-w1024-focus", "zoom-w1024-scale2", "zoom-w1440-scale2",
]);
const SENTINEL_TAGS = Object.freeze({
  "dialog-w375": "@sentinel-dialog-focus-leak",
  "layout-w320-full-unbroken": "@sentinel-overflow",
  "state-w320-loading": "@sentinel-console-error",
  "state-w375-default": "@sentinel-low-contrast",
  "state-w375-focus": "@sentinel-clipped-focus",
});

function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex"); }
export function sourceBinding() {
  return Object.freeze({
    ".github/workflows/validate.yml": sha256(".github/workflows/validate.yml"),
    "package-lock.json": sha256("package-lock.json"),
    "package.json": sha256("package.json"),
    "playwright.config.mjs": sha256("playwright.config.mjs"),
    "scripts/agent-native/v2/consumer-conformance-matrix-comparator.mjs": sha256("scripts/agent-native/v2/consumer-conformance-matrix-comparator.mjs"),
    "scripts/agent-native/v2/test-consumer-conformance-matrix-comparator.mjs": sha256("scripts/agent-native/v2/test-consumer-conformance-matrix-comparator.mjs"),
    "tests/consumer-conformance.spec.mjs": sha256("tests/consumer-conformance.spec.mjs"),
    "tests/fixtures/consumer-conformance-scenarios.mjs": sha256("tests/fixtures/consumer-conformance-scenarios.mjs"),
    "tests/helpers/render-consumer-conformance.mjs": sha256("tests/helpers/render-consumer-conformance.mjs"),
  });
}
function exact(actual, expected) { return JSON.stringify(actual) === JSON.stringify(expected); }
function median(values) { return values.toSorted((a, b) => a - b)[1]; }
function pairSet(matrix, left, right) { return new Set(matrix.filter(({ kind }) => kind === "layout").map((s) => `${s[left].id ?? s[left].width}|${s[right].id ?? s[right].width}`)); }
function expectedTestNames(matrix) { return matrix.map(({ caseId, kind }) => `${kind} ${caseId}${SENTINEL_TAGS[caseId] ? ` ${SENTINEL_TAGS[caseId]}` : ""}`); }
function expectedScenarioSentinels(matrix) { return matrix.map(({ caseId }) => SENTINEL_TAGS[caseId]).filter(Boolean).toSorted(); }

export function matrixCoverageFailures(matrix) {
  const failures = [];
  const ids = new Set(matrix.map(({ caseId }) => caseId));
  if (ids.size !== matrix.length) failures.push("case_id_duplicate");
  for (const id of REQUIRED_CASES) if (!ids.has(id)) failures.push(`required_case_missing:${id}`);
  for (const state of fullScenarioMatrix().filter(({ kind }) => kind === "state")) if (!ids.has(state.caseId)) failures.push(`state_viewport_missing:${state.caseId}`);
  for (const overlay of ["drawer", "dialog"]) if (!matrix.some((s) => s.kind === "overlay" && s.overlay.id === overlay)) failures.push(`overlay_missing:${overlay}`);
  for (const [ln, lv, rn, rv] of [["viewport", VIEWPORTS, "container", CONTAINERS], ["viewport", VIEWPORTS, "content", CONTENTS], ["container", CONTAINERS, "content", CONTENTS]]) {
    const observed = pairSet(matrix, ln, rn);
    for (const left of lv) for (const right of rv) { const key = `${left.id ?? left.width}|${right.id ?? right.width}`; if (!observed.has(key)) failures.push(`pair_missing:${ln}:${key}:${rn}`); }
  }
  return failures;
}

export function expectedRunPolicy(matrix) {
  const base = assertionPolicyCounters(matrix);
  return Object.freeze({
    axe_analyze_calls: base.axe_calls,
    contrast_helper_calls: matrix.length,
    contrast_root_checks: base.contrast_calls,
    evidence_artifact_count: 2,
    evidence_helper_calls: matrix.length,
    evidence_ids: ["state-w1024-focus"],
    scenario_sentinel_ids: expectedScenarioSentinels(matrix),
    screenshot_artifact_count: matrix.length,
    screenshot_helper_calls: matrix.length,
    test_count: matrix.length,
    test_names: expectedTestNames(matrix),
  });
}

function validateRun(run, matrixName, matrix, index, failures) {
  const label = `${matrixName}:${index + 1}`;
  const expectedKeys = ["assertion_policy", "concurrent_containers", "container_id", "ended_at", "exit_code", "failures", "image_id", "matrix", "node", "output_precondition_empty", "output_root", "playwright", "retries", "schema_version", "source_binding", "source_root", "started_at", "wall_time_ms", "workers"];
  if (!run || !exact(Object.keys(run).toSorted(), expectedKeys)) { failures.push(`run_shape:${label}`); return; }
  if (run.schema_version !== "1.0" || run.matrix !== matrixName || run.exit_code !== 0 || !exact(run.failures, [])) failures.push(`run_result:${label}`);
  if (!exact(run.source_binding, sourceBinding())) failures.push(`source_binding:${label}`);
  if (run.node !== PIN.node || run.playwright !== PIN.playwright || run.workers !== PIN.workers || run.retries !== PIN.retries || run.image_id !== IMAGE_ID) failures.push(`runtime_binding:${label}`);
  if (run.output_precondition_empty !== true || !exact(run.concurrent_containers, [])) failures.push(`isolation:${label}`);
  if (!(run.wall_time_ms > 0) || !(Date.parse(run.ended_at) >= Date.parse(run.started_at))) failures.push(`timing:${label}`);
  if (!exact(run.assertion_policy, expectedRunPolicy(matrix))) failures.push(`assertion_policy:${label}`);
}

export function compareConsumerConformanceMatrices(report) {
  const failures = [];
  const expectedTopKeys = ["candidate_matrix", "mutations", "pin", "runs", "schema_version", "sentinel_controls", "source_binding"];
  if (!report || !exact(Object.keys(report).toSorted(), expectedTopKeys)) return { decision: "rejected_default_unchanged", failures: ["report_shape"], ok: false };
  if (report.schema_version !== "1.0" || !exact(report.pin, PIN) || !exact(report.source_binding, sourceBinding())) failures.push("report_binding");
  failures.push(...matrixCoverageFailures(report.candidate_matrix ?? []).map((f) => `candidate_${f}`));
  if (!exact(report.candidate_matrix?.map(({ caseId }) => caseId), candidateScenarioMatrix().map(({ caseId }) => caseId))) failures.push("candidate_inventory");
  if (!exact(report.sentinel_controls, { ids: [...SENTINEL_IDS], ok: true })) failures.push("sentinel_controls");

  const allRuns = [];
  for (const [name, matrix] of [["full", fullScenarioMatrix()], ["candidate", candidateScenarioMatrix()]]) {
    const runs = report.runs?.[name];
    if (!Array.isArray(runs) || runs.length !== 3) { failures.push(`run_count:${name}`); continue; }
    runs.forEach((run, index) => validateRun(run, name, matrix, index, failures));
    allRuns.push(...runs);
  }
  if (allRuns.length === 6 && new Set(allRuns.map((run) => run.output_root)).size !== 6) failures.push("run_output_root_duplicate");
  if (allRuns.length === 6 && new Set(allRuns.map((r) => JSON.stringify(r.assertion_policy))).size !== 2) failures.push("run_policy_nondeterministic");

  const mutationIds = Object.keys(MUTATION_POLICY).toSorted();
  if (!Array.isArray(report.mutations) || !exact(report.mutations.map((m) => m.id).toSorted(), mutationIds)) failures.push("mutation_inventory");
  for (const mutation of report.mutations ?? []) {
    if (!exact(Object.keys(mutation).toSorted(), ["candidate", "expected_assertion", "full", "id"])) { failures.push(`mutation_shape:${mutation.id}`); continue; }
    const expected = MUTATION_POLICY[mutation.id];
    if (mutation.expected_assertion !== expected) failures.push(`mutation_policy:${mutation.id}`);
    for (const side of ["full", "candidate"]) if (!exact(mutation[side], { exit_code: 1, named_assertion: expected })) failures.push(`mutation_result:${mutation.id}:${side}`);
  }

  const fullTimes = report.runs?.full?.map((r) => r.wall_time_ms) ?? [];
  const candidateTimes = report.runs?.candidate?.map((r) => r.wall_time_ms) ?? [];
  const fullMedianMs = fullTimes.length === 3 ? median(fullTimes) : null;
  const candidateMedianMs = candidateTimes.length === 3 ? median(candidateTimes) : null;
  const improvement = fullMedianMs && candidateMedianMs ? 1 - candidateMedianMs / fullMedianMs : null;
  if (!(improvement >= 0.25)) failures.push(`median_improvement_below_25_percent:${improvement}`);
  return { candidate_median_ms: candidateMedianMs, decision: failures.length ? "rejected_default_unchanged" : "experimental_eligible_default_unchanged", failures, full_median_ms: fullMedianMs, improvement_fraction: improvement, ok: failures.length === 0 };
}

export function matrixDefinitionReport() { const full = fullScenarioMatrix(), candidate = candidateScenarioMatrix(); return { candidate: expectedRunPolicy(candidate), candidate_coverage_failures: matrixCoverageFailures(candidate), full: expectedRunPolicy(full) }; }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { const file = process.argv[2]; const result = file ? compareConsumerConformanceMatrices(JSON.parse(fs.readFileSync(file, "utf8"))) : matrixDefinitionReport(); process.stdout.write(`${JSON.stringify(result, null, 2)}\n`); if (file && !result.ok) process.exitCode = 1; }
