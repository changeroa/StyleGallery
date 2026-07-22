#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addSchemaFindings,
  canonicalSourceManifest,
  compilePageEvidenceSchemas,
  dirtyRelevantSources,
  finding,
  gitIdentity,
  listArtifactFiles,
  metadata,
  normalizeReference,
  PAGE_EVIDENCE_MANIFEST,
  PAGE_EVIDENCE_RECEIPT,
  readJsonFile,
  readContainedBytes,
  readReceipt,
  resolveContained,
  sameJson,
  sameStringSet,
  withinSession,
} from "./page-evidence-contract.mjs";
import { parseStrictJson } from "./strict-json.mjs";

const styleGalleryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = { artifactRoot: undefined, json: false, manifest: undefined, priorManifest: undefined, root: undefined };
const argumentFailures = [];

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") options.json = true;
  else if (["--artifact-root", "--manifest", "--prior-manifest", "--root"].includes(argument)) {
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) argumentFailures.push(finding("argument_value_required", `${argument} requires a value`, "<cli>"));
    else {
      if (argument === "--artifact-root") options.artifactRoot = path.resolve(process.cwd(), value);
      if (argument === "--manifest") options.manifest = path.resolve(process.cwd(), value);
      if (argument === "--prior-manifest") options.priorManifest = path.resolve(process.cwd(), value);
      if (argument === "--root") options.root = path.resolve(process.cwd(), value);
      index += 1;
    }
  } else argumentFailures.push(finding("argument_unknown", `unsupported argument ${argument}`, "<cli>"));
}
for (const [name, value] of [["--root", options.root], ["--artifact-root", options.artifactRoot]]) {
  if (!value) argumentFailures.push(finding("argument_value_required", `${name} is required`, "<cli>"));
}
if (!options.manifest && options.artifactRoot) options.manifest = path.join(options.artifactRoot, PAGE_EVIDENCE_MANIFEST);

let schemas;
try { schemas = compilePageEvidenceSchemas(path.join(styleGalleryRoot, "consumer-reference/schema")); }
catch (error) { argumentFailures.push(finding("page_evidence_schema_invalid", error instanceof Error ? error.message : String(error), "consumer-reference/schema")); }

function checkedArtifact(root, artifact, failures) {
  const resolved = readContainedBytes({ prefix: "page_evidence_artifact", reference: artifact?.path, root }, failures);
  if (!resolved || !artifact?.media_type) return undefined;
  const bytes = resolved.bytes;
  const actual = metadata(bytes, artifact.media_type, artifact.path);
  if (!sameJson(actual, artifact)) failures.push(finding("page_evidence_artifact_integrity", "artifact bytes or metadata differ from the manifest", artifact.path));
  if (artifact.media_type === "image/png" && (!actual.width || !actual.height)) failures.push(finding("page_evidence_png_invalid", "captured PNG must contain a valid IHDR/IDAT/IEND chunk stream", artifact.path));
  return { actual, bytes, file: resolved.file };
}

function validatePacket({ allowReuse, artifactRoot, manifestFile, priorManifestFile, root, seen }) {
  const failures = [];
  const artifactReference = normalizeReference(root, artifactRoot);
  if (!artifactReference) failures.push(finding("page_evidence_artifact_escape", "artifact root must be inside the consumer repository", artifactRoot));
  else if (fs.existsSync(artifactRoot) && fs.lstatSync(artifactRoot).isSymbolicLink()) failures.push(finding("page_evidence_artifact_redirect", "artifact root must not be a filesystem redirect", artifactReference));
  else resolveContained({ expectedType: "directory", prefix: "page_evidence_artifact", reference: artifactReference, root }, failures);
  const artifactFiles = failures.length === 0 ? listArtifactFiles(artifactRoot, failures) : [];
  if (failures.some((entry) => entry.code === "page_evidence_artifact_limit")) return { failures, manifest: undefined };
  const manifestReference = normalizeReference(artifactRoot, manifestFile);
  if (manifestReference !== PAGE_EVIDENCE_MANIFEST) failures.push(finding("page_evidence_manifest_path_invalid", `manifest must be ${PAGE_EVIDENCE_MANIFEST} at artifact-root`, manifestFile));
  const manifestRecord = manifestReference ? readJsonFile({ prefix: "page_evidence_manifest", reference: manifestReference, root: artifactRoot }, failures) : undefined;
  const receiptRecord = readReceipt(artifactRoot, schemas, failures);
  const receipt = receiptRecord?.valid ? receiptRecord : undefined;
  if (!manifestRecord || !receipt) return { failures, manifest: manifestRecord?.value };
  if (!addSchemaFindings(schemas.manifest, manifestRecord.value, manifestReference, "page_evidence_manifest_schema_invalid", failures)) return { failures, manifest: manifestRecord.value };
  const manifest = manifestRecord.value;
  const manifestDigest = metadata(manifestRecord.bytes, "application/json", manifestReference).sha256;
  if (seen.has(manifestDigest)) {
    failures.push(finding("page_evidence_reuse_cycle", "prior manifest chain contains a cycle", manifestReference));
    return { failures, manifest };
  }
  seen.add(manifestDigest);

  const session = manifest.session;
  const expectedSession = session ? {
    attempt: receipt.value.attempt,
    branch: receipt.value.branch,
    completed_at: session.completed_at,
    conformance_record: receipt.value.conformance_record,
    environment: receipt.value.environment,
    intended_scenario_ids: receipt.value.intended_scenario_ids,
    nonce: receipt.value.nonce,
    receipt: receipt.artifact,
    receipt_sha256: receipt.digest,
    repository: receipt.value.repository,
    revision: receipt.value.revision,
    run_id: receipt.value.run_id,
    session_id: receipt.value.session_id,
    source: receipt.value.source,
    started_at: receipt.value.started_at,
  } : undefined;
  if (!sameJson(session, expectedSession)) failures.push(finding("page_evidence_session_mismatch", "completed manifest session differs from its immutable start receipt", manifestReference));
  if (manifest.repository !== receipt.value.repository) failures.push(finding("page_evidence_repository_mismatch", "manifest repository differs from the receipt", manifestReference));
  if (manifest.revision !== receipt.value.revision || manifest.run?.revision !== receipt.value.revision) failures.push(finding("page_evidence_revision_mismatch", "manifest revision differs from the receipt", manifestReference));
  if (manifest.run?.id !== receipt.value.run_id || manifest.run?.attempt !== receipt.value.attempt || manifest.run?.repository !== receipt.value.repository) failures.push(finding("page_evidence_run_mismatch", "manifest run differs from the receipt", manifestReference));
  if (manifest.completed_at !== session?.completed_at || !withinSession(session?.completed_at, receipt.value.started_at, session?.completed_at)) failures.push(finding("page_evidence_capture_outside_session", "manifest completion precedes session start", manifestReference));

  const git = gitIdentity(root, failures);
  if (git && git.revision !== receipt.value.revision) failures.push(finding("page_evidence_revision_mismatch", "checked-out revision differs from the evidence receipt", manifestReference));
  if (git?.repository && git.repository !== receipt.value.repository) failures.push(finding("page_evidence_repository_mismatch", "Git remote identity differs from the evidence receipt", manifestReference));
  const currentSource = canonicalSourceManifest(root, receipt.value.source.files.map((entry) => entry.path), failures);
  if (currentSource && !sameJson(currentSource, receipt.value.source)) failures.push(finding("page_evidence_source_drift", "relevant source bytes differ from the evidence receipt", manifestReference));
  if (dirtyRelevantSources(root, receipt.value.source.files.map((entry) => entry.path)).length > 0) failures.push(finding("page_evidence_source_drift", "relevant sources are dirty while validating evidence", manifestReference));
  const conformance = readJsonFile({ prefix: "page_evidence_conformance", reference: receipt.value.conformance_record.path, root }, failures);
  if (conformance && !sameJson(metadata(conformance.bytes, "application/json", conformance.reference), receipt.value.conformance_record)) failures.push(finding("page_evidence_conformance_drift", "conformance record differs from the evidence receipt", conformance.reference));

  let priorPacket;
  if (priorManifestFile) {
    const priorRoot = path.dirname(priorManifestFile);
    priorPacket = validatePacket({ allowReuse: false, artifactRoot: priorRoot, manifestFile: priorManifestFile, priorManifestFile: undefined, root, seen });
    failures.push(...priorPacket.failures);
  }
  const scenarios = Array.isArray(manifest.scenarios) ? manifest.scenarios : [];
  const controlFiles = new Set([PAGE_EVIDENCE_MANIFEST, PAGE_EVIDENCE_RECEIPT, ...scenarios.map((scenario) => scenario.runner_result.path)]);
  const expectedFiles = new Set(controlFiles);
  const scenarioIds = [];
  for (const scenario of scenarios) {
    scenarioIds.push(scenario.id);
    const runnerArtifact = checkedArtifact(artifactRoot, scenario.runner_result, failures);
    if (!runnerArtifact) continue;
    let runner;
    try { runner = parseStrictJson(runnerArtifact.bytes.toString("utf8")); }
    catch (error) { failures.push(finding("page_evidence_runner_json_invalid", error instanceof Error ? error.message : String(error), scenario.runner_result.path)); continue; }
    if (!addSchemaFindings(schemas.runner, runner, scenario.runner_result.path, "page_evidence_runner_schema_invalid", failures)) continue;
    if (runner.status !== "passed") failures.push(finding("page_evidence_runner_failed", `${scenario.id} runner did not pass`, scenario.runner_result.path));
    if (runner.session_id !== receipt.value.session_id || runner.nonce !== receipt.value.nonce || runner.receipt_sha256 !== receipt.digest) failures.push(finding("page_evidence_session_mismatch", `${scenario.id} runner session differs from the receipt`, scenario.runner_result.path));
    if (runner.revision !== receipt.value.revision || runner.run?.revision !== receipt.value.revision) failures.push(finding("page_evidence_revision_mismatch", `${scenario.id} runner revision differs from the receipt`, scenario.runner_result.path));
    if (runner.repository !== receipt.value.repository || runner.run?.repository !== receipt.value.repository) failures.push(finding("page_evidence_repository_mismatch", `${scenario.id} runner repository differs from the receipt`, scenario.runner_result.path));
    if (runner.source_sha256 !== receipt.value.source.sha256) failures.push(finding("page_evidence_source_mismatch", `${scenario.id} runner source differs from the receipt`, scenario.runner_result.path));
    if (!sameJson({ ...runner.run, status: "passed" }, manifest.run)) failures.push(finding("page_evidence_run_mismatch", `${scenario.id} runner identity differs from the closed run`, scenario.runner_result.path));
    if (runner.scenario_id !== scenario.id || runner.recorded_at !== scenario.recorded_at || !sameJson(runner.semantic_environment, scenario.semantic_environment)) failures.push(finding("page_evidence_scenario_mismatch", `${scenario.id} runner scenario differs from the manifest`, scenario.runner_result.path));
    if (!withinSession(runner.recorded_at, receipt.value.started_at, session?.completed_at)) failures.push(finding("page_evidence_capture_outside_session", `${scenario.id} runner was recorded outside the session interval`, scenario.runner_result.path));
    if (scenario.evidence?.kind === "captured") {
      const declared = runner.evidence?.kind === "captured" ? runner.evidence.artifacts : [];
      const captured = scenario.evidence.artifacts ?? [];
      if (!sameJson(declared, captured.map(({ path: artifactPath, media_type: mediaType }) => ({ media_type: mediaType, path: artifactPath })))) failures.push(finding("page_evidence_scenario_mismatch", `${scenario.id} artifact declarations differ from the runner result`, scenario.runner_result.path));
      for (const artifact of captured) {
        if (controlFiles.has(artifact.path)) failures.push(finding("page_evidence_artifact_control_collision", "captured artifacts must be disjoint from manifest, receipt, and runner-result controls", artifact.path));
        expectedFiles.add(artifact.path);
        checkedArtifact(artifactRoot, artifact, failures);
      }
    } else if (scenario.evidence?.kind === "reused") {
      if (!allowReuse) failures.push(finding("page_evidence_reuse_chain_unsupported", "a reused manifest cannot be reused again", manifestReference));
      if (!sameJson(runner.evidence, scenario.evidence)) failures.push(finding("page_evidence_reuse_identity_mismatch", `${scenario.id} reuse differs from the runner result`, scenario.runner_result.path));
      if (!priorPacket?.manifest) failures.push(finding("page_evidence_reuse_manifest_required", "reused evidence requires a valid prior manifest", manifestReference));
      else {
        const prior = priorPacket.manifest;
        const priorScenario = prior.scenarios?.find((candidate) => candidate.id === scenario.evidence.prior_scenario_id);
        const priorBytes = fs.readFileSync(priorManifestFile);
        if (scenario.evidence.prior_manifest_sha256 !== metadata(priorBytes, "application/json", PAGE_EVIDENCE_MANIFEST).sha256) failures.push(finding("page_evidence_reuse_manifest_mismatch", "prior manifest digest does not match", manifestReference));
        if (scenario.evidence.prior_session_id !== prior.session?.session_id || scenario.evidence.prior_run_id !== prior.run?.id) failures.push(finding("page_evidence_reuse_identity_mismatch", "prior session or run identity does not match", manifestReference));
        if (!priorScenario || priorScenario.id !== scenario.id || priorScenario.evidence?.kind !== "captured") failures.push(finding("page_evidence_reuse_scenario_mismatch", "reuse must select the same captured scenario", manifestReference));
        if (!sameJson(prior.session?.source, receipt.value.source)) failures.push(finding("page_evidence_reuse_source_mismatch", "reuse requires byte-identical relevant sources", manifestReference));
        if (priorScenario && !sameJson(priorScenario.semantic_environment, scenario.semantic_environment)) failures.push(finding("page_evidence_reuse_environment_mismatch", "reuse requires the same semantic environment", manifestReference));
      }
    }
  }
  if (!sameStringSet(scenarioIds, receipt.value.intended_scenario_ids)) failures.push(finding("page_evidence_pass_membership_invalid", "PASS scenarios must exactly match the start intent", manifestReference));
  for (const reference of artifactFiles) if (!expectedFiles.has(reference)) failures.push(finding("page_evidence_artifact_unmanifested", "artifact root contains a file outside the closed manifest", reference));
  seen.delete(manifestDigest);
  return { failures, manifest };
}

let report = { failures: argumentFailures, manifest: undefined };
if (argumentFailures.length === 0 && schemas) report = validatePacket({ allowReuse: true, artifactRoot: options.artifactRoot, manifestFile: options.manifest, priorManifestFile: options.priorManifest, root: options.root, seen: new Set() });
const result = {
  artifactCount: report.manifest?.scenarios?.reduce((count, scenario) => count + (scenario.evidence?.artifacts?.length ?? 0), 0) ?? 0,
  failures: report.failures,
  ok: report.failures.length === 0,
  scenarioCount: report.manifest?.scenarios?.length ?? 0,
  sessionId: report.manifest?.session?.session_id,
};
if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else if (result.ok) process.stdout.write(`validated ${result.scenarioCount} page evidence scenarios\n`);
else process.stderr.write(`${result.failures.map((issue) => `${issue.code}: ${issue.path}: ${issue.message}`).join("\n")}\n`);
if (!result.ok) process.exitCode = 1;
