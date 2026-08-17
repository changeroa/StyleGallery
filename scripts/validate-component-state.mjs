#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalSourceManifest, canonicalIntended, readCaptureSession, sameJson, sourceManifestMatches, withinSession } from "./capture-session-contract.mjs";
import { compileSchemas, readRecord, validateEvidenceArtifacts, validateProfile } from "./component-state-contract.mjs";
import { resolveSharedEvidenceCapture } from "./evidence-capture-contract.mjs";
import { resolveProfileRecords } from "./profile-record-contract.mjs";
import { visualExpectationFor } from "./visual-expectation-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = { artifactRoot: undefined, json: false, root: path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local"), runtimeManifest: undefined, sourceMode: "recorded-revision" };
const failures = [];

function addSchemaFailures(validate, value, file, code) {
  if (validate(value)) return;
  for (const error of validate.errors ?? []) failures.push({ code, message: `${error.instancePath || "/"} ${error.message}`, path: file });
}

function validateCommittedVisualExpectations(resolved, captureIdentity) {
  const evidenceRecord = resolved.records.evidence[0];
  const statesRecord = resolved.records.states[0];
  if (!evidenceRecord || !statesRecord) return;
  const scenarios = new Map((statesRecord.value.scenarios ?? []).map((scenario) => [scenario.id, scenario]));
  for (const pass of (evidenceRecord.value.passes ?? []).filter((candidate) => candidate.channel === "visual")) {
    const scenario = scenarios.get(pass.scenario_id);
    if (!scenario) continue;
    try {
      const expected = visualExpectationFor(scenario, captureIdentity?.environment ?? pass.environment, statesRecord.value.visual_environments ?? []);
      const actual = pass.artifact ?? {};
      if (actual.sha256 !== expected.sha256 || actual.width !== expected.width || actual.height !== expected.height) failures.push({ code: "evidence_visual_expectation_mismatch", message: `${pass.id} committed visual metadata differs from its canonical environment expectation`, path: evidenceRecord.path });
    } catch (error) {
      failures.push({ code: "evidence_visual_expectation_invalid", message: error instanceof Error ? error.message : String(error), path: evidenceRecord.path });
    }
  }
}

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") options.json = true;
  else if (["--artifact-root", "--runtime-manifest", "--root", "--source-mode"].includes(argument)) {
    const value = process.argv[index + 1];
    if (!value) failures.push({ code: "argument_value_required", message: `${argument} requires a path`, path: "<cli>" });
    else {
      if (argument === "--artifact-root") options.artifactRoot = path.resolve(value);
      if (argument === "--runtime-manifest") options.runtimeManifest = path.resolve(value);
      if (argument === "--root") options.root = path.resolve(value);
      if (argument === "--source-mode") {
        if (!["recorded-revision", "current-authoring"].includes(value)) failures.push({ code: "source_mode_invalid", message: "--source-mode must be recorded-revision or current-authoring", path: "<cli>" });
        else options.sourceMode = value;
      }
      index += 1;
    }
  } else failures.push({ code: "argument_unknown", message: `unsupported argument ${argument}`, path: "<cli>" });
}

const schemas = compileSchemas(path.join(repositoryRoot, "consumer-reference/schema"));
let runtimeManifest;
let receipt;
let canonicalSource;
let resolvedCapture;
if (!options.runtimeManifest && options.sourceMode === "current-authoring") {
  try { canonicalSource = canonicalSourceManifest(repositoryRoot, options.root); }
  catch (error) { failures.push({ code: "capture_source_unreadable", message: error instanceof Error ? error.message : String(error), path: options.root }); }
}
if (options.runtimeManifest) {
  runtimeManifest = readRecord(options.runtimeManifest, failures);
  if (!options.artifactRoot) failures.push({ code: "runtime_manifest_artifact_root_required", message: "--runtime-manifest requires --artifact-root", path: "<cli>" });
  if (runtimeManifest) {
    const validate = schemas.runtimeByVersion[runtimeManifest.schema_version];
    if (!validate) failures.push({ code: "runtime_manifest_schema_version_unknown", message: `${runtimeManifest.schema_version ?? "missing"} is not a supported runtime manifest version`, path: options.runtimeManifest });
    else addSchemaFailures(validate, runtimeManifest, options.runtimeManifest, "runtime_manifest_schema_invalid");
  }
  if (options.artifactRoot) receipt = readCaptureSession(path.join(options.artifactRoot, "capture-session.json"), schemas.capture, failures);
  if (receipt && runtimeManifest?.schema_version === "1.0") {
    const session = runtimeManifest.session;
    if (!session || !sameJson(session.receipt, receipt.artifact) || session.receipt_sha256 !== receipt.digest) failures.push({ code: "capture_session_receipt_mismatch", message: "manifest receipt metadata does not match capture-session.json", path: options.runtimeManifest });
    const expectedLink = receipt.link;
    for (const key of ["session_id", "nonce", "started_at", "revision", "branch", "attempt", "environment", "source"]) if (!sameJson(session?.[key], expectedLink[key])) failures.push({ code: "capture_session_mismatch", message: `manifest ${key} differs from receipt`, path: options.runtimeManifest });
    for (const key of ["repository", "intended"]) if (!sameJson(session?.[key], receipt.receipt[key])) failures.push({ code: "capture_session_mismatch", message: `manifest ${key} differs from receipt`, path: options.runtimeManifest });
    if (runtimeManifest.recorded_at !== session?.completed_at) failures.push({ code: "evidence_recorded_at_mismatch", message: "manifest recorded_at must equal session completed_at", path: options.runtimeManifest });
    if (!withinSession(session?.completed_at, receipt.receipt.started_at, session?.completed_at)) failures.push({ code: "capture_session_time_outside", message: "completed_at precedes session start", path: options.runtimeManifest });
    const canonical = canonicalIntended(options.root, failures);
    if (!sameJson(receipt.receipt.intended, canonical)) failures.push({ code: "capture_session_intent_mismatch", message: "receipt intent differs from current canonical records", path: options.runtimeManifest });
    if (!receipt.receipt.source) failures.push({ code: "capture_source_missing", message: "capture receipt must include its canonical source manifest", path: options.runtimeManifest });
    else if (!sourceManifestMatches(receipt.receipt.source, repositoryRoot, options.root)) failures.push({ code: "capture_source_drift", message: "current capture sources differ from the receipt source manifest", path: options.runtimeManifest });
    const run = runtimeManifest.run;
    if (run?.id !== receipt.receipt.session_id || run?.repository !== receipt.receipt.repository || run?.revision !== receipt.receipt.revision || run?.attempt !== receipt.receipt.attempt) failures.push({ code: "capture_session_mismatch", message: "manifest run differs from receipt", path: options.runtimeManifest });
    for (const record of runtimeManifest.records ?? []) for (const pass of record.passes ?? []) {
      if (!sameJson(pass.environment, runtimeManifest.environment) || !sameJson(pass.run, run)) failures.push({ code: "runtime_manifest_identity_mismatch", message: `${pass.id} does not match the closed manifest identity`, path: options.runtimeManifest });
      if (!sameJson(pass.session, receipt.link) || !sameJson(pass.environment, receipt.receipt.environment) || !sameJson(pass.run, run)) failures.push({ code: "capture_session_mismatch", message: `${pass.id} pass identity differs from receipt`, path: options.runtimeManifest });
    }
    resolvedCapture = { environment: runtimeManifest.environment, run, session };
  } else if (receipt && runtimeManifest?.schema_version === "2.0" && options.artifactRoot) {
    const records = runtimeManifest.records ?? [];
    const byProfile = new Map(records.map((record) => [record.profile_id, record]));
    const consumers = ["editorial-reference-profile", "terminal-reference-profile"].map((owner) => ({ capture_id: byProfile.get(owner)?.capture?.capture_id, owner, reference: byProfile.get(owner)?.capture }));
    consumers.push({ capture_id: runtimeManifest.capture?.capture_id, owner: "runtime-manifest", reference: runtimeManifest.capture });
    const expectedSession = {
      attempt: receipt.receipt.attempt, branch: receipt.receipt.branch, completed_at: runtimeManifest.recorded_at,
      environment: receipt.receipt.environment, intended: receipt.receipt.intended, nonce: receipt.receipt.nonce,
      receipt: receipt.artifact, receipt_sha256: receipt.digest, repository: receipt.receipt.repository,
      revision: receipt.receipt.revision, session_id: receipt.receipt.session_id, source: receipt.receipt.source,
      started_at: receipt.receipt.started_at,
    };
    const expectedRun = { attempt: receipt.receipt.attempt, id: receipt.receipt.session_id, repository: receipt.receipt.repository, revision: receipt.receipt.revision, source: process.env.GITHUB_ACTIONS === "true" ? "github_actions" : "local" };
    try {
      const resolved = resolveSharedEvidenceCapture({
        artifactCaptureIds: [runtimeManifest.capture?.capture_id, ...records.map((record) => record.capture?.capture_id)],
        consumers, expectedSource: receipt.receipt.source, repositoryRoot: options.artifactRoot,
      });
      resolvedCapture = resolved.use().capture;
      addSchemaFailures(schemas.captureV2, resolvedCapture, resolved.reference.path, "capture_record_schema_invalid");
      if (!sameJson(resolvedCapture.session?.receipt, receipt.artifact) || resolvedCapture.session?.receipt_sha256 !== receipt.digest) failures.push({ code: "capture_session_receipt_mismatch", message: "capture receipt metadata does not match capture-session.json", path: resolved.reference.path });
      if (!sameJson(resolvedCapture.environment, receipt.receipt.environment)) failures.push({ code: "capture_environment_mismatch", message: "capture environment differs from receipt", path: resolved.reference.path });
      if (!sameJson(resolvedCapture.run, expectedRun)) failures.push({ code: "capture_run_mismatch", message: "capture run differs from receipt", path: resolved.reference.path });
      for (const key of ["session_id", "nonce", "started_at", "revision", "branch", "attempt", "environment", "source", "repository", "intended"]) if (!sameJson(resolvedCapture.session?.[key], expectedSession[key])) failures.push({ code: "capture_session_mismatch", message: `capture ${key} differs from receipt`, path: resolved.reference.path });
      if (!withinSession(resolvedCapture.session?.completed_at, resolvedCapture.session?.started_at, resolvedCapture.session?.completed_at)) failures.push({ code: "capture_session_time_outside", message: "completed_at precedes session start", path: resolved.reference.path });
    } catch (error) {
      failures.push({ code: error?.code ?? "capture_resolution_failed", message: error instanceof Error ? error.message : String(error), path: error?.path ?? options.runtimeManifest });
    }
    const canonical = canonicalIntended(options.root, failures);
    if (!sameJson(receipt.receipt.intended, canonical)) failures.push({ code: "capture_session_intent_mismatch", message: "receipt intent differs from current canonical records", path: options.runtimeManifest });
    if (!sourceManifestMatches(receipt.receipt.source, repositoryRoot, options.root)) failures.push({ code: "capture_source_drift", message: "current capture sources differ from the receipt source manifest", path: options.runtimeManifest });
  }
} else if (options.artifactRoot) failures.push({ code: "runtime_manifest_required", message: "artifact validation requires --runtime-manifest", path: "<cli>" });

const profiles = fs.existsSync(options.root) ? fs.readdirSync(options.root, { withFileTypes: true }).filter((entry) => entry.isDirectory() && fs.existsSync(path.join(options.root, entry.name, "profile.json"))).map((entry) => entry.name).sort() : [];
if (profiles.length === 0) failures.push({ code: "profile_root_empty", message: "governed-local root must contain profiles", path: options.root });
const committed = [];
for (const profile of profiles) {
  const profileRoot = path.join(options.root, profile);
  failures.push(...validateProfile(profileRoot, schemas));
  const resolved = resolveProfileRecords(profileRoot, failures);
  if (resolved) committed.push(resolved);
  if (!runtimeManifest && resolved?.records.evidence[0]?.value.schema_version === "1.0") {
    validateCommittedVisualExpectations(resolved);
    const evidenceRecord = resolved.records.evidence[0];
    if (canonicalSource) for (const pass of evidenceRecord.value.passes ?? []) {
      if (!pass.session?.source) failures.push({ code: "capture_source_missing", message: `${pass.id} committed evidence must include its canonical source manifest`, path: evidenceRecord.path });
      else if (!sameJson(pass.session.source, canonicalSource)) failures.push({ code: "capture_source_drift", message: `${pass.id} committed evidence source differs from current canonical capture sources`, path: evidenceRecord.path });
    }
  }
  const profileId = JSON.parse(fs.readFileSync(path.join(profileRoot, "profile.json"), "utf8")).id;
  const matching = runtimeManifest?.records?.filter((record) => record.profile_id === profileId) ?? [];
  if (runtimeManifest && matching.length !== 1) failures.push({ code: "runtime_manifest_profile_count", message: `${profileId} requires exactly one runtime evidence record`, path: options.runtimeManifest });
  if (options.artifactRoot && runtimeManifest && resolvedCapture && matching.length === 1) failures.push(...validateEvidenceArtifacts(profileRoot, options.artifactRoot, matching[0], schemas, resolvedCapture));
}
if (!runtimeManifest && committed.some((resolved) => resolved.records.evidence[0]?.value.schema_version === "2.0")) {
  const records = committed.map((resolved) => resolved.records.evidence[0]?.value).filter((record) => record?.schema_version === "2.0");
  const consumers = records.map((record) => ({ capture_id: record.capture?.capture_id, owner: record.profile_id, reference: record.capture }));
  if (records[0]) consumers.push({ capture_id: records[0].capture?.capture_id, owner: "runtime-manifest", reference: records[0].capture });
  try {
    const resolved = resolveSharedEvidenceCapture({
      artifactCaptureIds: records.map((record) => record.capture?.capture_id), consumers,
      expectedSource: options.sourceMode === "current-authoring" ? canonicalSource : undefined, repositoryRoot,
    });
    resolvedCapture = resolved.use().capture;
    if (options.sourceMode === "recorded-revision" && !sourceManifestMatches(resolvedCapture.session?.source, repositoryRoot, options.root, {
      mode: "recorded-revision", revision: resolvedCapture.session?.revision,
    })) failures.push({ code: "capture_source_drift", message: "capture sources differ from the immutable recorded revision", path: resolved.reference.path });
    for (const record of committed) validateCommittedVisualExpectations(record, resolvedCapture);
  } catch (error) {
    failures.push({ code: error?.code ?? "capture_resolution_failed", message: error instanceof Error ? error.message : String(error), path: error?.path ?? options.root });
  }
}
if (runtimeManifest) {
  const known = new Set(profiles.map((profile) => JSON.parse(fs.readFileSync(path.join(options.root, profile, "profile.json"), "utf8")).id));
  for (const record of runtimeManifest.records ?? []) if (!known.has(record.profile_id)) failures.push({ code: "runtime_manifest_profile_unknown", message: `${record.profile_id} is not a governed profile`, path: options.runtimeManifest });
}
if (runtimeManifest && options.artifactRoot) {
  const passes = (runtimeManifest.records ?? []).flatMap((record) => record.passes ?? []);
  const passArtifacts = new Set(passes.map((pass) => pass.artifact?.path).filter(Boolean));
  if (passArtifacts.size !== 30) failures.push({ code: "runtime_channel_count_mismatch", message: `manifest requires exactly 30 unique channel artifacts, found ${passArtifacts.size}`, path: options.runtimeManifest });
  const expected = new Set(passArtifacts);
  for (const pass of passes) if (pass.channel === "visual" && pass.artifact?.path?.endsWith(".png")) expected.add(pass.artifact.path.replace(/\.png$/, ".visual.json"));
  if (expected.size !== 40) failures.push({ code: "runtime_artifact_count_mismatch", message: `manifest requires exactly 40 runtime files, found ${expected.size}`, path: options.runtimeManifest });
  const runtimeRoot = path.join(options.artifactRoot, "runtime");
  const actual = fs.existsSync(runtimeRoot) ? fs.readdirSync(runtimeRoot, { withFileTypes: true }) : [];
  for (const entry of actual) {
    const reference = `runtime/${entry.name}`;
    if (!entry.isFile() || !expected.has(reference)) failures.push({ code: "runtime_artifact_unmanifested", message: `${reference} is not a declared regular session artifact`, path: runtimeRoot });
  }
  for (const reference of expected) if (!fs.existsSync(path.join(options.artifactRoot, reference))) failures.push({ code: "runtime_artifact_missing", message: `${reference} is missing`, path: runtimeRoot });
}

const uniqueFailures = [...new Map(failures.map((failure) => [`${failure.code}:${failure.path}:${failure.message}`, failure])).values()];
const result = { checkedProfiles: profiles.length, failures: uniqueFailures, ok: uniqueFailures.length === 0, warnings: [] };
if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else if (result.ok) process.stdout.write(`ok: ${profiles.length} governed-local component profiles\n`);
else process.stderr.write(`${result.failures.map((failure) => `${failure.code}: ${failure.path}: ${failure.message}`).join("\n")}\n`);
if (!result.ok) process.exitCode = 1;
