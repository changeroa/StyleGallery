#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalSourceManifest,
  canonicalIntended,
  readCaptureSession,
  sameJson,
  sourceManifestMatches,
  withinSession,
} from "./capture-session-contract.mjs";
import { compileSchemas, readRecord, validateEvidenceArtifacts, validateProfile } from "./component-state-contract.mjs";
import { resolveProfileRecords } from "./profile-record-contract.mjs";
import { visualExpectationFor } from "./visual-expectation-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = { artifactRoot: undefined, json: false, root: path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local"), runtimeManifest: undefined };
const failures = [];

function validateCommittedVisualExpectations(resolved) {
  const evidenceRecord = resolved.records.evidence[0];
  const statesRecord = resolved.records.states[0];
  if (!evidenceRecord || !statesRecord) return;
  const scenarios = new Map((statesRecord.value.scenarios ?? []).map((scenario) => [scenario.id, scenario]));
  for (const pass of (evidenceRecord.value.passes ?? []).filter((candidate) => candidate.channel === "visual")) {
    const scenario = scenarios.get(pass.scenario_id);
    if (!scenario) continue;
    try {
      const expected = visualExpectationFor(scenario, pass.environment, statesRecord.value.visual_environments ?? []);
      const actual = pass.artifact ?? {};
      if (actual.sha256 !== expected.sha256 || actual.width !== expected.width || actual.height !== expected.height) {
        failures.push({ code: "evidence_visual_expectation_mismatch", message: `${pass.id} committed visual metadata differs from its canonical environment expectation`, path: evidenceRecord.path });
      }
    } catch (error) {
      failures.push({ code: "evidence_visual_expectation_invalid", message: error instanceof Error ? error.message : String(error), path: evidenceRecord.path });
    }
  }
}

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") options.json = true;
  else if (["--artifact-root", "--runtime-manifest", "--root"].includes(argument)) {
    const value = process.argv[index + 1];
    if (!value) failures.push({ code: "argument_value_required", message: `${argument} requires a path`, path: "<cli>" });
    else {
      if (argument === "--artifact-root") options.artifactRoot = path.resolve(value);
      if (argument === "--runtime-manifest") options.runtimeManifest = path.resolve(value);
      if (argument === "--root") options.root = path.resolve(value);
      index += 1;
    }
  } else failures.push({ code: "argument_unknown", message: `unsupported argument ${argument}`, path: "<cli>" });
}

const schemas = compileSchemas(path.join(repositoryRoot, "consumer-reference/schema"));
let runtimeManifest;
let capture;
let canonicalSource;
if (!options.runtimeManifest) {
  try { canonicalSource = canonicalSourceManifest(repositoryRoot, options.root); }
  catch (error) { failures.push({ code: "capture_source_unreadable", message: error instanceof Error ? error.message : String(error), path: options.root }); }
}
if (options.runtimeManifest) {
  runtimeManifest = readRecord(options.runtimeManifest, failures);
  if (!options.artifactRoot) failures.push({ code: "runtime_manifest_artifact_root_required", message: "--runtime-manifest requires --artifact-root", path: "<cli>" });
  if (runtimeManifest && !schemas.runtime(runtimeManifest)) for (const error of schemas.runtime.errors ?? []) failures.push({ code: "runtime_manifest_schema_invalid", message: `${error.instancePath || "/"} ${error.message}`, path: options.runtimeManifest });
  if (options.artifactRoot) capture = readCaptureSession(path.join(options.artifactRoot, "capture-session.json"), schemas.capture, failures);
  if (capture && runtimeManifest) {
    const session = runtimeManifest.session;
    if (!session || !sameJson(session.receipt, capture.artifact) || session.receipt_sha256 !== capture.digest) failures.push({ code: "capture_session_receipt_mismatch", message: "manifest receipt metadata does not match capture-session.json", path: options.runtimeManifest });
    const expectedLink = capture.link;
    for (const key of ["session_id", "nonce", "started_at", "revision", "branch", "attempt", "environment", "source"]) if (!sameJson(session?.[key], expectedLink[key])) failures.push({ code: "capture_session_mismatch", message: `manifest ${key} differs from receipt`, path: options.runtimeManifest });
    for (const key of ["repository", "intended"]) if (!sameJson(session?.[key], capture.receipt[key])) failures.push({ code: "capture_session_mismatch", message: `manifest ${key} differs from receipt`, path: options.runtimeManifest });
    if (runtimeManifest.recorded_at !== session?.completed_at) failures.push({ code: "evidence_recorded_at_mismatch", message: "manifest recorded_at must equal session completed_at", path: options.runtimeManifest });
    if (!withinSession(session?.completed_at, capture.receipt.started_at, session?.completed_at)) failures.push({ code: "capture_session_time_outside", message: "completed_at precedes session start", path: options.runtimeManifest });
    const canonical = canonicalIntended(options.root, failures);
    if (!sameJson(capture.receipt.intended, canonical)) failures.push({ code: "capture_session_intent_mismatch", message: "receipt intent differs from current canonical records", path: options.runtimeManifest });
    if (!capture.receipt.source) failures.push({ code: "capture_source_missing", message: "capture receipt must include its canonical source manifest", path: options.runtimeManifest });
    else if (!sourceManifestMatches(capture.receipt.source, repositoryRoot, options.root)) failures.push({ code: "capture_source_drift", message: "current capture sources differ from the receipt source manifest", path: options.runtimeManifest });
    const run = runtimeManifest.run;
    if (run?.id !== capture.receipt.session_id || run?.repository !== capture.receipt.repository || run?.revision !== capture.receipt.revision || run?.attempt !== capture.receipt.attempt) failures.push({ code: "capture_session_mismatch", message: "manifest run differs from receipt", path: options.runtimeManifest });
    for (const record of runtimeManifest.records ?? []) {
      for (const pass of record.passes ?? []) {
        if (!sameJson(pass.environment, runtimeManifest.environment) || !sameJson(pass.run, run)) failures.push({ code: "runtime_manifest_identity_mismatch", message: `${pass.id} does not match the closed manifest identity`, path: options.runtimeManifest });
        if (!sameJson(pass.session, capture.link) || !sameJson(pass.environment, capture.receipt.environment) || !sameJson(pass.run, run)) failures.push({ code: "capture_session_mismatch", message: `${pass.id} pass identity differs from receipt`, path: options.runtimeManifest });
      }
    }
  }
} else if (options.artifactRoot) failures.push({ code: "runtime_manifest_required", message: "artifact validation requires --runtime-manifest", path: "<cli>" });

const profiles = fs.existsSync(options.root)
  ? fs.readdirSync(options.root, { withFileTypes: true }).filter((entry) => entry.isDirectory() && fs.existsSync(path.join(options.root, entry.name, "profile.json"))).map((entry) => entry.name).sort()
  : [];
if (profiles.length === 0) failures.push({ code: "profile_root_empty", message: "governed-local root must contain profiles", path: options.root });
for (const profile of profiles) {
  const profileRoot = path.join(options.root, profile);
  failures.push(...validateProfile(profileRoot, schemas));
  if (!runtimeManifest) {
    const resolved = resolveProfileRecords(profileRoot, failures);
    if (resolved) validateCommittedVisualExpectations(resolved);
    const evidenceRecord = resolved?.records.evidence[0];
    if (canonicalSource) {
      for (const pass of evidenceRecord?.value.passes ?? []) {
        if (!pass.session?.source) failures.push({ code: "capture_source_missing", message: `${pass.id} committed evidence must include its canonical source manifest`, path: evidenceRecord.path });
        else if (!sameJson(pass.session.source, canonicalSource)) failures.push({ code: "capture_source_drift", message: `${pass.id} committed evidence source differs from current canonical capture sources`, path: evidenceRecord.path });
      }
    }
  }
  const profileId = JSON.parse(fs.readFileSync(path.join(profileRoot, "profile.json"), "utf8")).id;
  const matching = runtimeManifest?.records?.filter((record) => record.profile_id === profileId) ?? [];
  if (runtimeManifest && matching.length !== 1) failures.push({ code: "runtime_manifest_profile_count", message: `${profileId} requires exactly one runtime evidence record`, path: options.runtimeManifest });
  if (options.artifactRoot && runtimeManifest) failures.push(...validateEvidenceArtifacts(profileRoot, options.artifactRoot, matching[0], schemas, runtimeManifest.session));
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
