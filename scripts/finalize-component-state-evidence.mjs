#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { artifactMetadata } from "./artifact-metadata.mjs";
import {
  canonicalIntended,
  readCaptureSession,
  sameJson,
  sourceManifestMatches,
} from "./capture-session-contract.mjs";
import { compileSchemas, validateEvidenceArtifacts } from "./component-state-contract.mjs";
import { resolveProfileRecords } from "./profile-record-contract.mjs";
import { parseStrictJson } from "./strict-json.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = {
  artifactRoot: undefined,
  json: false,
  output: undefined,
  profileRoot: path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local"),
  sessionReceipt: undefined,
  writeCanonical: false,
};
const failures = [];

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") options.json = true;
  else if (argument === "--write-canonical") options.writeCanonical = true;
  else if (["--artifact-root", "--output", "--root", "--session-receipt"].includes(argument)) {
    const value = process.argv[index + 1];
    if (!value) failures.push({ code: "argument_value_required", message: `${argument} requires a value`, path: "<cli>" });
    else {
      if (argument === "--artifact-root") options.artifactRoot = path.resolve(value);
      if (argument === "--output") options.output = path.resolve(value);
      if (argument === "--root") options.profileRoot = path.resolve(value);
      if (argument === "--session-receipt") options.sessionReceipt = path.resolve(value);
      index += 1;
    }
  } else failures.push({ code: "argument_unknown", message: `unsupported argument ${argument}`, path: "<cli>" });
}

if (!options.artifactRoot) failures.push({ code: "argument_value_required", message: "--artifact-root is required", path: "<cli>" });
const output = options.output ?? (options.artifactRoot ? path.join(options.artifactRoot, "runtime-manifest.json") : undefined);
if (output && fs.existsSync(output)) failures.push({ code: "capture_session_replay", message: "completed session manifest already exists and cannot be overwritten", path: output });
const receiptFile = options.sessionReceipt ?? (options.artifactRoot ? path.join(options.artifactRoot, "capture-session.json") : "");
if (options.artifactRoot && receiptFile !== path.join(options.artifactRoot, "capture-session.json")) failures.push({ code: "capture_session_path_invalid", message: "session receipt must be the artifact-root capture-session.json", path: receiptFile });
const schemas = compileSchemas(path.join(repositoryRoot, "consumer-reference/schema"));
const capture = receiptFile ? readCaptureSession(receiptFile, schemas.capture, failures) : undefined;
const intended = canonicalIntended(options.profileRoot, failures);
if (capture && !sameJson(capture.receipt.intended, intended)) failures.push({ code: "capture_session_intent_mismatch", message: "receipt intent differs from canonical profile scenarios", path: receiptFile });
if (capture && !sourceManifestMatches(capture.receipt.source, repositoryRoot, options.profileRoot)) failures.push({ code: "capture_source_drift", message: "capture sources differ from the receipt source manifest", path: receiptFile });

const completedAt = new Date().toISOString();
const completedSession = capture ? {
  attempt: capture.receipt.attempt,
  branch: capture.receipt.branch,
  completed_at: completedAt,
  environment: capture.receipt.environment,
  intended: capture.receipt.intended,
  nonce: capture.receipt.nonce,
  receipt: capture.artifact,
  receipt_sha256: capture.digest,
  repository: capture.receipt.repository,
  revision: capture.receipt.revision,
  session_id: capture.receipt.session_id,
  source: capture.receipt.source,
  started_at: capture.receipt.started_at,
} : undefined;
const run = capture ? {
  attempt: capture.receipt.attempt,
  id: capture.receipt.session_id,
  repository: capture.receipt.repository,
  revision: capture.receipt.revision,
  source: process.env.GITHUB_ACTIONS === "true" ? "github_actions" : "local",
} : undefined;
const channelFiles = Object.freeze({ ax: "ax.json", dom: "dom.json", visual: "png" });
const records = [];
const expectedFiles = new Set();
const canonicalWrites = [];

for (const profileIntent of intended) {
  const profileRoot = path.join(options.profileRoot, profileIntent.profile_name);
  const profileFailures = [];
  const resolved = resolveProfileRecords(profileRoot, profileFailures);
  failures.push(...profileFailures);
  const fixture = resolved?.records.fixture[0]?.value;
  const states = resolved?.records.states[0]?.value;
  if (!resolved || !fixture || !states || !capture || !run || !completedSession) continue;
  const stateById = new Map(states.scenarios.map((scenario) => [scenario.id, scenario]));
  const passes = [];
  for (const scenario of fixture.scenarios) {
    const canonical = stateById.get(scenario.id);
    const documents = {};
    for (const channel of ["dom", "ax", "visual"]) {
      const file = path.join(options.artifactRoot, "runtime", `${profileIntent.profile_name}-${scenario.id}.${channel}.json`);
      try { documents[channel] = parseStrictJson(fs.readFileSync(file, "utf8")); }
      catch (error) { failures.push({ code: "evidence_json_invalid", message: error instanceof Error ? error.message : String(error), path: file }); }
      if (channel === "visual") expectedFiles.add(path.basename(file));
    }
    const capturedTimes = new Set(Object.values(documents).map((document) => document?.captured_at).filter(Boolean));
    if (capturedTimes.size !== 1) failures.push({ code: "capture_session_time_mismatch", message: `${scenario.id} visual, DOM, and AX must share one captured_at`, path: profileRoot });
    const recordedAt = [...capturedTimes][0] ?? "";
    for (const channel of scenario.required_channels) {
      const suffix = channelFiles[channel];
      const artifactPath = `runtime/${profileIntent.profile_name}-${scenario.id}.${suffix}`;
      expectedFiles.add(path.basename(artifactPath));
      const absolute = path.join(options.artifactRoot, artifactPath);
      if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isFile() || fs.lstatSync(absolute).isSymbolicLink()) {
        failures.push({ code: "runtime_artifact_missing", message: `${artifactPath} is missing or not a regular file`, path: absolute });
        continue;
      }
      const mediaType = channel === "visual" ? "image/png" : "application/json";
      passes.push({
        artifact: { path: artifactPath, ...artifactMetadata(fs.readFileSync(absolute), mediaType) },
        channel,
        environment: capture.receipt.environment,
        id: `${scenario.id}-${channel}`,
        recorded_at: recordedAt,
        result: { observed: `Recorded ${channel} evidence for ${scenario.id}; this is not certification.`, status: "passed" },
        run,
        scenario_id: scenario.id,
        session: capture.link,
        scope: { component: "button", semantic_mode: scenario.semantic_mode, state_set: canonical.states },
      });
    }
  }
  const evidence = {
    claim_boundary: "Scenario artifacts are evidence, not visual regression baselines or accessibility certification.",
    component_id: "button",
    passes,
    profile_id: resolved.profile.id,
    schema_version: "1.0",
  };
  failures.push(...validateEvidenceArtifacts(profileRoot, options.artifactRoot, evidence, schemas, completedSession));
  records.push(evidence);
  if (resolved.records.evidence[0]) canonicalWrites.push([resolved.records.evidence[0].path, evidence]);
}

const runtimeRoot = options.artifactRoot ? path.join(options.artifactRoot, "runtime") : "";
if (runtimeRoot && fs.existsSync(runtimeRoot)) {
  for (const entry of fs.readdirSync(runtimeRoot, { withFileTypes: true })) if (!entry.isFile() || !expectedFiles.has(entry.name)) failures.push({ code: "runtime_artifact_unmanifested", message: `${entry.name} is not part of the closed artifact set`, path: path.join(runtimeRoot, entry.name) });
}

const manifest = {
  claim_boundary: "Scenario artifacts are evidence, not visual regression baselines or accessibility certification.",
  environment: capture?.receipt.environment,
  recorded_at: completedAt,
  record_kind: "component_state_runtime_manifest",
  records,
  run,
  schema_version: "1.0",
  session: completedSession,
};
if (!schemas.runtime(manifest)) for (const error of schemas.runtime.errors ?? []) failures.push({ code: "runtime_manifest_schema_invalid", message: `${error.instancePath || "/"} ${error.message}`, path: options.output ?? "<manifest>" });
if (failures.length === 0 && options.writeCanonical) for (const [file, evidence] of canonicalWrites) fs.writeFileSync(file, `${JSON.stringify(evidence, null, 2)}\n`);
if (failures.length === 0 && output) fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
const result = { artifactCount: expectedFiles.size, failures, manifest: output, ok: failures.length === 0, profileCount: records.length, sessionId: capture?.receipt.session_id };
if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else if (result.ok) process.stdout.write(`finalized ${result.artifactCount} component state artifacts\n`);
else process.stderr.write(`${failures.map((failure) => `${failure.code}: ${failure.path}: ${failure.message}`).join("\n")}\n`);
if (!result.ok) process.exitCode = 1;
