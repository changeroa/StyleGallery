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
  PAGE_EVIDENCE_CLAIM,
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

const styleGalleryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = { artifactRoot: undefined, json: false, priorManifest: undefined, reviewBy: undefined, root: undefined, runnerResults: [] };
const failures = [];

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") options.json = true;
  else if (["--artifact-root", "--prior-manifest", "--review-by", "--root", "--runner-result"].includes(argument)) {
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) failures.push(finding("argument_value_required", `${argument} requires a value`, "<cli>"));
    else {
      if (argument === "--artifact-root") options.artifactRoot = path.resolve(process.cwd(), value);
      if (argument === "--prior-manifest") options.priorManifest = value;
      if (argument === "--review-by") options.reviewBy = value;
      if (argument === "--root") options.root = path.resolve(process.cwd(), value);
      if (argument === "--runner-result") options.runnerResults.push(value);
      index += 1;
    }
  } else failures.push(finding("argument_unknown", `unsupported argument ${argument}`, "<cli>"));
}
for (const [name, value] of [["--root", options.root], ["--artifact-root", options.artifactRoot], ["--review-by", options.reviewBy]]) {
  if (!value) failures.push(finding("argument_value_required", `${name} is required`, "<cli>"));
}
if (options.runnerResults.length === 0) failures.push(finding("argument_value_required", "at least one --runner-result is required", "<cli>"));

let schemas;
try { schemas = compilePageEvidenceSchemas(path.join(styleGalleryRoot, "consumer-reference/schema")); }
catch (error) { failures.push(finding("page_evidence_schema_invalid", error instanceof Error ? error.message : String(error), "consumer-reference/schema")); }

let artifactReference;
let artifactFiles = [];
if (options.root && options.artifactRoot) {
  artifactReference = normalizeReference(options.root, options.artifactRoot);
  if (!artifactReference) failures.push(finding("page_evidence_artifact_escape", "artifact root must be inside the consumer repository", options.artifactRoot));
  else if (fs.existsSync(options.artifactRoot) && fs.lstatSync(options.artifactRoot).isSymbolicLink()) failures.push(finding("page_evidence_artifact_redirect", "artifact root must not be a filesystem redirect", artifactReference));
  else {
    const resolved = resolveContained({ expectedType: "directory", prefix: "page_evidence_artifact", reference: artifactReference, root: options.root }, failures);
    if (resolved) artifactFiles = listArtifactFiles(options.artifactRoot, failures);
  }
}
const packetWithinLimits = !failures.some((entry) => entry.code === "page_evidence_artifact_limit");
const manifestFile = options.artifactRoot ? path.join(options.artifactRoot, PAGE_EVIDENCE_MANIFEST) : undefined;
if (manifestFile && fs.existsSync(manifestFile)) failures.push(finding("page_evidence_session_replay", "completed manifest already exists and cannot be overwritten", PAGE_EVIDENCE_MANIFEST));
const receiptRecord = options.artifactRoot && schemas && packetWithinLimits ? readReceipt(options.artifactRoot, schemas, failures) : undefined;
const receipt = receiptRecord?.valid ? receiptRecord : undefined;

const git = options.root ? gitIdentity(options.root, failures) : undefined;
if (receipt && git) {
  if (git.revision !== receipt.value.revision) failures.push(finding("page_evidence_revision_mismatch", "checked-out revision differs from the start receipt", PAGE_EVIDENCE_RECEIPT));
  if (git.repository && git.repository !== receipt.value.repository) failures.push(finding("page_evidence_repository_mismatch", "Git remote identity differs from the start receipt", PAGE_EVIDENCE_RECEIPT));
}

if (receipt && options.root) {
  const sourcePaths = receipt.value.source.files.map((entry) => entry.path);
  const currentSource = canonicalSourceManifest(options.root, sourcePaths, failures);
  if (currentSource && !sameJson(currentSource, receipt.value.source)) failures.push(finding("page_evidence_source_drift", "relevant source bytes differ from the start receipt", PAGE_EVIDENCE_RECEIPT));
  if (dirtyRelevantSources(options.root, sourcePaths).length > 0) failures.push(finding("page_evidence_source_drift", "relevant sources became dirty after session start", PAGE_EVIDENCE_RECEIPT));
  const conformance = readJsonFile({ prefix: "page_evidence_conformance", reference: receipt.value.conformance_record.path, root: options.root }, failures);
  if (conformance && !sameJson(metadata(conformance.bytes, "application/json", conformance.reference), receipt.value.conformance_record)) failures.push(finding("page_evidence_conformance_drift", "conformance record differs from the start receipt", conformance.reference));
}

let prior;
if (options.priorManifest && options.root && schemas) {
  const reference = normalizeReference(options.root, options.priorManifest);
  if (!reference) failures.push(finding("page_evidence_reuse_manifest_escape", "prior manifest must be inside the consumer repository", options.priorManifest));
  else {
    prior = readJsonFile({ prefix: "page_evidence_reuse_manifest", reference, root: options.root }, failures);
    if (prior) {
      prior.sha256 = metadata(prior.bytes, "application/json", reference).sha256;
      prior.valid = addSchemaFindings(schemas.manifest, prior.value, reference, "page_evidence_reuse_manifest_invalid", failures);
    }
  }
}

const runnerReferences = options.artifactRoot ? options.runnerResults.map((candidate) => normalizeReference(options.artifactRoot, candidate)) : [];
if (runnerReferences.some((reference) => !reference) || new Set(runnerReferences).size !== runnerReferences.length) failures.push(finding("page_evidence_runner_path_invalid", "runner results must be unique normalized paths inside artifact root", "<cli>"));
const completedAt = new Date().toISOString();
const scenarios = [];
const controlFiles = new Set([PAGE_EVIDENCE_MANIFEST, PAGE_EVIDENCE_RECEIPT, ...runnerReferences.filter(Boolean)]);
const expectedFiles = new Set([...controlFiles].filter((reference) => reference !== PAGE_EVIDENCE_MANIFEST));
const artifactOwners = new Map();
let canonicalRun;

for (const reference of packetWithinLimits ? runnerReferences.filter(Boolean) : []) {
  const runner = readJsonFile({ prefix: "page_evidence_runner", reference, root: options.artifactRoot }, failures);
  if (!runner || !schemas) continue;
  if (!addSchemaFindings(schemas.runner, runner.value, reference, "page_evidence_runner_schema_invalid", failures)) continue;
  const value = runner.value;
  if (value.status !== "passed") failures.push(finding("page_evidence_runner_failed", `${value.scenario_id ?? reference} runner did not pass`, reference));
  if (receipt) {
    if (value.session_id !== receipt.value.session_id || value.nonce !== receipt.value.nonce || value.receipt_sha256 !== receipt.digest) failures.push(finding("page_evidence_session_mismatch", `${value.scenario_id ?? reference} runner session differs from the receipt`, reference));
    if (value.revision !== receipt.value.revision || value.run?.revision !== receipt.value.revision) failures.push(finding("page_evidence_revision_mismatch", `${value.scenario_id ?? reference} runner revision differs from the receipt`, reference));
    if (value.repository !== receipt.value.repository || value.run?.repository !== receipt.value.repository) failures.push(finding("page_evidence_repository_mismatch", `${value.scenario_id ?? reference} runner repository differs from the receipt`, reference));
    if (value.source_sha256 !== receipt.value.source.sha256) failures.push(finding("page_evidence_source_mismatch", `${value.scenario_id ?? reference} runner source differs from the receipt`, reference));
    if (value.run?.id !== receipt.value.run_id || value.run?.attempt !== receipt.value.attempt) failures.push(finding("page_evidence_run_mismatch", `${value.scenario_id ?? reference} runner identity differs from the receipt`, reference));
    if (!receipt.value.intended_scenario_ids.includes(value.scenario_id)) failures.push(finding("page_evidence_scenario_unintended", `${value.scenario_id ?? reference} was not declared at session start`, reference));
    if (!withinSession(value.recorded_at, receipt.value.started_at, completedAt)) failures.push(finding("page_evidence_capture_outside_session", `${value.scenario_id ?? reference} was recorded outside the session interval`, reference));
  }
  const run = value.run ? { ...value.run, status: "passed" } : undefined;
  if (canonicalRun && !sameJson(canonicalRun, run)) failures.push(finding("page_evidence_run_mismatch", "runner results mix run identities", reference));
  else if (!canonicalRun) canonicalRun = run;
  let evidence;
  if (value.evidence?.kind === "captured") {
    const artifacts = [];
    for (const declaration of value.evidence.artifacts ?? []) {
      if (controlFiles.has(declaration.path)) {
        failures.push(finding("page_evidence_artifact_control_collision", "captured artifacts must be disjoint from manifest, receipt, and runner-result controls", declaration.path));
        continue;
      }
      const owner = artifactOwners.get(declaration.path);
      if (owner) failures.push(finding("page_evidence_artifact_reused", `${declaration.path} is shared by ${owner} and ${value.scenario_id}`, reference));
      else artifactOwners.set(declaration.path, value.scenario_id);
      const resolved = readContainedBytes({ prefix: "page_evidence_artifact", reference: declaration.path, root: options.artifactRoot }, failures);
      if (!resolved) continue;
      expectedFiles.add(declaration.path);
      const artifact = metadata(resolved.bytes, declaration.media_type, declaration.path);
      if (declaration.media_type === "image/png" && (!artifact.width || !artifact.height)) failures.push(finding("page_evidence_png_invalid", "captured PNG must contain a valid IHDR/IDAT/IEND chunk stream", declaration.path));
      artifacts.push(artifact);
    }
    evidence = { artifacts, kind: "captured" };
  } else if (value.evidence?.kind === "reused") {
    evidence = value.evidence;
    if (!prior?.valid) failures.push(finding("page_evidence_reuse_manifest_required", "reused evidence requires a valid --prior-manifest", reference));
    else {
      const priorScenario = prior.value.scenarios?.find((scenario) => scenario.id === value.evidence.prior_scenario_id);
      if (value.evidence.prior_manifest_sha256 !== prior.sha256) failures.push(finding("page_evidence_reuse_manifest_mismatch", "prior manifest digest does not match", reference));
      if (value.evidence.prior_session_id !== prior.value.session?.session_id || value.evidence.prior_run_id !== prior.value.run?.id) failures.push(finding("page_evidence_reuse_identity_mismatch", "prior session or run identity does not match", reference));
      if (!priorScenario || value.evidence.prior_scenario_id !== value.scenario_id || priorScenario.evidence?.kind !== "captured") failures.push(finding("page_evidence_reuse_scenario_mismatch", "reuse must select the same captured scenario", reference));
      if (receipt && !sameJson(prior.value.session?.source, receipt.value.source)) failures.push(finding("page_evidence_reuse_source_mismatch", "reuse requires byte-identical relevant sources", reference));
      if (priorScenario && !sameJson(priorScenario.semantic_environment, value.semantic_environment)) failures.push(finding("page_evidence_reuse_environment_mismatch", "reuse requires the same semantic environment", reference));
    }
  }
  scenarios.push({ evidence, id: value.scenario_id, recorded_at: value.recorded_at, runner_result: metadata(runner.bytes, "application/json", reference), semantic_environment: value.semantic_environment });
}

if (receipt) {
  const passedIds = scenarios.map((scenario) => scenario.id);
  if (!sameStringSet(passedIds, receipt.value.intended_scenario_ids)) failures.push(finding("page_evidence_pass_membership_invalid", "PASS scenarios must exactly match the start intent", PAGE_EVIDENCE_MANIFEST));
}
if (packetWithinLimits && options.artifactRoot && fs.existsSync(options.artifactRoot)) {
  for (const reference of artifactFiles) if (!expectedFiles.has(reference)) failures.push(finding("page_evidence_artifact_unmanifested", "artifact root contains a file outside the closed manifest", reference));
}

const completedSession = receipt ? {
  ...receipt.value,
  completed_at: completedAt,
  receipt: receipt.artifact,
  receipt_sha256: receipt.digest,
} : undefined;
delete completedSession?.record_kind;
delete completedSession?.schema_version;
const manifest = receipt && canonicalRun ? {
  claim_boundary: PAGE_EVIDENCE_CLAIM,
  completed_at: completedAt,
  record_kind: "page_evidence_manifest",
  repository: receipt.value.repository,
  review_by: options.reviewBy,
  revision: receipt.value.revision,
  run: canonicalRun,
  scenarios,
  schema_version: "1.0",
  session: completedSession,
} : undefined;
if (manifest && schemas) addSchemaFindings(schemas.manifest, manifest, PAGE_EVIDENCE_MANIFEST, "page_evidence_manifest_schema_invalid", failures);
if (failures.length === 0 && manifestFile) fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
const result = { artifactCount: artifactOwners.size, failures, manifest: manifestFile, ok: failures.length === 0, scenarioCount: scenarios.length, sessionId: receipt?.value.session_id };
if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else if (result.ok) process.stdout.write(`finalized ${result.scenarioCount} page evidence scenarios\n`);
else process.stderr.write(`${failures.map((issue) => `${issue.code}: ${issue.path}: ${issue.message}`).join("\n")}\n`);
if (!result.ok) process.exitCode = 1;
