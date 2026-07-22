#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { MAX_ARTIFACT_FILE_BYTES } from "./page-artifact-metadata.mjs";
import { canonicalSourceManifest } from "./page-evidence-contract.mjs";
import {
  completeSession,
  corruptPngCrc,
  createConformance,
  declareCapturedArtifact,
  finalizeSession,
  isolated,
  pngWithTrailingBytes,
  pngWithInvalidImageData,
  pngWithTrailingImageData,
  receiptFor,
  reuseSetup,
  rewriteCompletedCapture,
  rewriteCompletedArtifact,
  semanticEnvironment,
  startSession,
  started,
  truncatedPng,
  validateSession,
  writeJson,
  writeRunner,
} from "./page-evidence-fixture.mjs";

const requested = [];
let json = false;
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") json = true;
  else if (argument === "--case") {
    const value = process.argv[index + 1];
    if (value) { requested.push(value); index += 1; }
  }
}

function codes(child) {
  return child?.report?.failures?.map((failure) => failure.code) ?? [];
}

function outcome(name, expected, child, observe = {}) {
  const actualCodes = codes(child);
  const valid = expected === "ok:true";
  const ok = valid ? child?.status === 0 && child.report.ok === true : child?.status !== 0 && actualCodes.includes(expected);
  return { actual: { codes: actualCodes, status: child?.status, ...observe }, expected, name, ok };
}

const cases = {
  "complete-session": () => isolated((fixture) => {
    const completed = completeSession(fixture);
    return outcome("complete-session", "ok:true", completed.validate, {
      finalized: completed.finalize?.report.ok === true,
      scenarioCount: completed.validate?.report.scenarioCount,
      started: completed.start?.report.ok === true,
    });
  }),
  "dirty-relevant-source": () => isolated((fixture) => {
    const session = createConformance(fixture);
    fs.appendFileSync(path.join(fixture.root, fixture.relevantSources[0]), "// dirty\n");
    return outcome("dirty-relevant-source", "page_evidence_source_dirty", startSession(fixture, session));
  }),
  "untracked-relevant-source": () => isolated((fixture) => {
    const session = createConformance(fixture);
    const untracked = "src/untracked.js";
    fs.writeFileSync(path.join(fixture.root, untracked), "export const untracked = true;\n");
    const record = JSON.parse(fs.readFileSync(session.recordFile));
    record.consumer.relevant_sources.push(untracked);
    const sourceFailures = [];
    const source = canonicalSourceManifest(fixture.root, record.consumer.relevant_sources, sourceFailures);
    record.scenarios[0].source_digest = source.sha256;
    writeJson(session.recordFile, record);
    return outcome("untracked-relevant-source", "page_evidence_source_dirty", startSession(fixture, session));
  }),
  "source-drift-after-start": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session);
    fs.appendFileSync(path.join(fixture.root, fixture.relevantSources[0]), "// drift\n");
    return outcome("source-drift-after-start", "page_evidence_source_drift", finalizeSession(fixture, session, runner));
  }),
  "cross-revision": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session, { revision: "0".repeat(40), runRevision: "0".repeat(40) });
    return outcome("cross-revision", "page_evidence_revision_mismatch", finalizeSession(fixture, session, runner));
  }),
  "cross-run": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session, { runId: "different-run" });
    return outcome("cross-run", "page_evidence_run_mismatch", finalizeSession(fixture, session, runner));
  }),
  "cross-session-replay": () => isolated((fixture) => {
    const target = started(fixture, { artifactName: "target" });
    const alternate = started(fixture, { artifactName: "alternate" });
    const targetRunner = writeRunner(fixture, target);
    const alternateRunner = writeRunner(fixture, alternate);
    fs.copyFileSync(alternateRunner.runnerFile, targetRunner.runnerFile);
    fs.copyFileSync(path.join(alternate.artifactRoot, alternateRunner.artifactReference), path.join(target.artifactRoot, targetRunner.artifactReference));
    return outcome("cross-session-replay", "page_evidence_session_mismatch", finalizeSession(fixture, target, targetRunner));
  }),
  "failed-runner": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session, { status: "failed" });
    return outcome("failed-runner", "page_evidence_runner_failed", finalizeSession(fixture, session, runner));
  }),
  "finalize-runner-control-collision": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session);
    const declared = declareCapturedArtifact(session, runner, runner.runnerReference);
    return outcome("finalize-runner-control-collision", "page_evidence_artifact_control_collision", finalizeSession(fixture, session, declared));
  }),
  "finalize-receipt-control-collision": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session);
    const declared = declareCapturedArtifact(session, runner, "page-evidence-session.json");
    return outcome("finalize-receipt-control-collision", "page_evidence_artifact_control_collision", finalizeSession(fixture, session, declared));
  }),
  "unmanifested-png": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session);
    fs.writeFileSync(path.join(session.artifactRoot, "rogue.png"), "rogue");
    return outcome("unmanifested-png", "page_evidence_artifact_unmanifested", finalizeSession(fixture, session, runner));
  }),
  "artifact-tree-depth-limit": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session);
    fs.mkdirSync(path.join(session.artifactRoot, ...Array.from({ length: 18 }, (_, index) => `depth-${index}`)), { recursive: true });
    return outcome("artifact-tree-depth-limit", "page_evidence_artifact_limit", finalizeSession(fixture, session, runner));
  }),
  "artifact-entry-limit": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session);
    for (let index = 0; index < 4097; index += 1) fs.writeFileSync(path.join(session.artifactRoot, `entry-${index}.txt`), "");
    return outcome("artifact-entry-limit", "page_evidence_artifact_limit", finalizeSession(fixture, session, runner));
  }),
  "artifact-file-byte-limit": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session);
    fs.truncateSync(path.join(session.artifactRoot, runner.artifactReference), MAX_ARTIFACT_FILE_BYTES + 1);
    return outcome("artifact-file-byte-limit", "page_evidence_artifact_limit", finalizeSession(fixture, session, runner));
  }),
  "artifact-packet-byte-limit": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session);
    for (let index = 0; index < 5; index += 1) {
      const file = path.join(session.artifactRoot, `packet-${index}.bin`);
      fs.closeSync(fs.openSync(file, "w"));
      fs.truncateSync(file, 60 * 1024 * 1024);
    }
    return outcome("artifact-packet-byte-limit", "page_evidence_artifact_limit", finalizeSession(fixture, session, runner));
  }),
  "missing-artifact": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session);
    fs.rmSync(path.join(session.artifactRoot, runner.artifactReference));
    return outcome("missing-artifact", "page_evidence_artifact_missing", finalizeSession(fixture, session, runner));
  }),
  "truncated-png": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session, { artifactBytes: truncatedPng() });
    return outcome("truncated-png", "page_evidence_png_invalid", finalizeSession(fixture, session, runner));
  }),
  "corrupt-png-crc": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session, { artifactBytes: corruptPngCrc() });
    return outcome("corrupt-png-crc", "page_evidence_png_invalid", finalizeSession(fixture, session, runner));
  }),
  "trailing-png-bytes": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session, { artifactBytes: pngWithTrailingBytes() });
    return outcome("trailing-png-bytes", "page_evidence_png_invalid", finalizeSession(fixture, session, runner));
  }),
  "invalid-png-image-data-finalize": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session, { artifactBytes: pngWithInvalidImageData() });
    return outcome("invalid-png-image-data-finalize", "page_evidence_png_invalid", finalizeSession(fixture, session, runner));
  }),
  "invalid-png-image-data-validate": () => isolated((fixture) => {
    const completed = completeSession(fixture);
    rewriteCompletedArtifact(completed.session, completed.runner, pngWithInvalidImageData());
    return outcome("invalid-png-image-data-validate", "page_evidence_png_invalid", validateSession(fixture, completed.session));
  }),
  "trailing-png-image-data-finalize": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session, { artifactBytes: pngWithTrailingImageData() });
    return outcome("trailing-png-image-data-finalize", "page_evidence_png_invalid", finalizeSession(fixture, session, runner));
  }),
  "hash-substitution": () => isolated((fixture) => {
    const completed = completeSession(fixture);
    fs.appendFileSync(path.join(completed.session.artifactRoot, completed.runner.artifactReference), "substitution");
    return outcome("hash-substitution", "page_evidence_artifact_integrity", validateSession(fixture, completed.session));
  }),
  "validate-runner-control-collision": () => isolated((fixture) => {
    const completed = completeSession(fixture);
    rewriteCompletedCapture(completed.session, completed.runner, completed.runner.runnerReference);
    return outcome("validate-runner-control-collision", "page_evidence_artifact_control_collision", validateSession(fixture, completed.session));
  }),
  "validate-receipt-control-collision": () => isolated((fixture) => {
    const completed = completeSession(fixture);
    rewriteCompletedCapture(completed.session, completed.runner, "page-evidence-session.json");
    return outcome("validate-receipt-control-collision", "page_evidence_artifact_control_collision", validateSession(fixture, completed.session));
  }),
  "validate-manifest-control-collision": () => isolated((fixture) => {
    const completed = completeSession(fixture);
    rewriteCompletedCapture(completed.session, completed.runner, "page-evidence-manifest.json");
    return outcome("validate-manifest-control-collision", "page_evidence_artifact_control_collision", validateSession(fixture, completed.session));
  }),
  "artifact-symlink": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session);
    const artifact = path.join(session.artifactRoot, runner.artifactReference);
    fs.rmSync(artifact);
    fs.symlinkSync("/etc/hosts", artifact);
    return outcome("artifact-symlink", "page_evidence_artifact_symlink", finalizeSession(fixture, session, runner));
  }),
  "artifact-redirect": () => isolated((fixture) => {
    const completed = completeSession(fixture);
    const realRoot = `${completed.session.artifactRoot}-real`;
    fs.renameSync(completed.session.artifactRoot, realRoot);
    fs.symlinkSync(realRoot, completed.session.artifactRoot);
    return outcome("artifact-redirect", "page_evidence_artifact_redirect", validateSession(fixture, completed.session));
  }),
  "parent-escape": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session, { artifactPath: "../outside.png" });
    return outcome("parent-escape", "page_evidence_artifact_escape", finalizeSession(fixture, session, runner));
  }),
  "capture-outside-session": () => isolated((fixture) => {
    const session = started(fixture);
    const runner = writeRunner(fixture, session, { recordedAt: "2000-01-01T00:00:00Z" });
    return outcome("capture-outside-session", "page_evidence_capture_outside_session", finalizeSession(fixture, session, runner));
  }),
  "missing-start-receipt": () => isolated((fixture) => {
    const completed = completeSession(fixture);
    fs.rmSync(path.join(completed.session.artifactRoot, "page-evidence-session.json"));
    return outcome("missing-start-receipt", "page_evidence_session_missing", validateSession(fixture, completed.session));
  }),
  "safe-reuse": () => isolated((fixture) => {
    const setup = reuseSetup(fixture);
    const runner = writeRunner(fixture, setup.current, { evidence: setup.evidence, writeArtifact: false });
    const finalized = finalizeSession(fixture, setup.current, runner, setup.priorManifest);
    const validated = finalized.status === 0 ? validateSession(fixture, setup.current, setup.priorManifest) : finalized;
    return outcome("safe-reuse", "ok:true", validated, { finalized: finalized.report.ok === true });
  }),
  "unsafe-reuse": () => isolated((fixture) => {
    const setup = reuseSetup(fixture);
    setup.evidence.prior_manifest_sha256 = "0".repeat(64);
    const runner = writeRunner(fixture, setup.current, { evidence: setup.evidence, writeArtifact: false });
    return outcome("unsafe-reuse", "page_evidence_reuse_manifest_mismatch", finalizeSession(fixture, setup.current, runner, setup.priorManifest));
  }),
  "reuse-source-mismatch": () => isolated((fixture) => {
    const setup = reuseSetup(fixture, { beforeCurrent: (consumer) => {
      fs.appendFileSync(path.join(consumer.root, consumer.relevantSources[0]), "// next revision\n");
      execFileSync("git", ["add", consumer.relevantSources[0]], { cwd: consumer.root });
      execFileSync("git", ["commit", "-m", "next fixture revision"], { cwd: consumer.root });
      consumer.revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: consumer.root, encoding: "utf8" }).trim();
    } });
    const runner = writeRunner(fixture, setup.current, { evidence: setup.evidence, writeArtifact: false });
    return outcome("reuse-source-mismatch", "page_evidence_reuse_source_mismatch", finalizeSession(fixture, setup.current, runner, setup.priorManifest));
  }),
  "reuse-scenario-mismatch": () => isolated((fixture) => {
    const setup = reuseSetup(fixture, { currentOptions: { scenarioId: "different-scenario" } });
    const runner = writeRunner(fixture, setup.current, { evidence: setup.evidence, writeArtifact: false });
    return outcome("reuse-scenario-mismatch", "page_evidence_reuse_scenario_mismatch", finalizeSession(fixture, setup.current, runner, setup.priorManifest));
  }),
  "reuse-environment-mismatch": () => isolated((fixture) => {
    const setup = reuseSetup(fixture);
    const changedEnvironment = { ...semanticEnvironment, viewport: { ...semanticEnvironment.viewport, width: 375 } };
    const runner = writeRunner(fixture, setup.current, { evidence: setup.evidence, semanticEnvironment: changedEnvironment, writeArtifact: false });
    return outcome("reuse-environment-mismatch", "page_evidence_reuse_environment_mismatch", finalizeSession(fixture, setup.current, runner, setup.priorManifest));
  }),
  "downloaded-unchanged-session": () => isolated((fixture) => {
    const completed = completeSession(fixture);
    const download = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-page-download-")));
    try {
      fs.cpSync(fixture.root, download, { recursive: true });
      const downloadedFixture = { ...fixture, root: download };
      const downloadedSession = { ...completed.session, artifactRoot: completed.session.artifactRoot.replace(fixture.root, download), recordFile: completed.session.recordFile.replace(fixture.root, download) };
      return outcome("downloaded-unchanged-session", "ok:true", validateSession(downloadedFixture, downloadedSession));
    } finally { fs.rmSync(download, { force: true, recursive: true }); }
  }),
  "past-review-by-advisory": () => isolated((fixture) => {
    const completed = completeSession(fixture);
    const manifestFile = path.join(completed.session.artifactRoot, "page-evidence-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestFile));
    manifest.review_by = "2000-01-01T00:00:00Z";
    writeJson(manifestFile, manifest);
    return outcome("past-review-by-advisory", "ok:true", validateSession(fixture, completed.session));
  }),
};

const selected = requested.length > 0 ? requested : Object.keys(cases);
const results = selected.map((name) => cases[name]?.() ?? ({ actual: { codes: [], status: null }, expected: "known-case", name, ok: false }));
const failures = results.filter((result) => !result.ok).map((result) => `${result.name}:${result.expected}`);
const report = { adversarial: results.filter((result) => result.expected !== "ok:true").length, failures, ok: failures.length === 0, results };
if (json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
