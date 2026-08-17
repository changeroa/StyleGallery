#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { artifactMetadata } from "./artifact-metadata.mjs";
import { canonicalIntended, readCaptureSession, sameJson, sourceManifestMatches } from "./capture-session-contract.mjs";
import { compileSchemas, validateEvidenceArtifacts } from "./component-state-contract.mjs";
import { buildCapturePacket } from "./evidence-version-projection.mjs";
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

function finding(code, target, message) {
  return { code, message, path: target };
}

function isInside(base, target) {
  const relative = path.relative(base, target);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function writeAtomic(file, bytes) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || !fs.readFileSync(file).equals(bytes)) throw Object.assign(new Error("existing output differs from finalized bytes"), { code: "capture_output_conflict" });
    return;
  }
  const temporary = `${file}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, bytes, { flag: "wx" });
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") options.json = true;
  else if (argument === "--write-canonical") options.writeCanonical = true;
  else if (["--artifact-root", "--output", "--root", "--session-receipt"].includes(argument)) {
    const value = process.argv[index + 1];
    if (!value) failures.push(finding("argument_value_required", "<cli>", `${argument} requires a value`));
    else {
      if (argument === "--artifact-root") options.artifactRoot = path.resolve(value);
      if (argument === "--output") options.output = path.resolve(value);
      if (argument === "--root") options.profileRoot = path.resolve(value);
      if (argument === "--session-receipt") options.sessionReceipt = path.resolve(value);
      index += 1;
    }
  } else failures.push(finding("argument_unknown", "<cli>", `unsupported argument ${argument}`));
}

if (!options.artifactRoot) failures.push(finding("argument_value_required", "<cli>", "--artifact-root is required"));
if (options.writeCanonical) failures.push(finding("canonical_write_forbidden", options.profileRoot, "Todo 15 finalization cannot write canonical profile evidence"));
const output = options.output ?? (options.artifactRoot ? path.join(options.artifactRoot, "runtime-manifest.json") : undefined);
if (output && options.artifactRoot && !isInside(options.artifactRoot, output)) failures.push(finding("finalizer_output_escape", output, "runtime manifest output must remain inside artifact-root"));
if (output && fs.existsSync(output)) failures.push(finding("capture_session_replay", output, "completed session manifest already exists and cannot be overwritten"));
const receiptFile = options.sessionReceipt ?? (options.artifactRoot ? path.join(options.artifactRoot, "capture-session.json") : "");
if (options.artifactRoot && receiptFile !== path.join(options.artifactRoot, "capture-session.json")) failures.push(finding("capture_session_path_invalid", receiptFile, "session receipt must be the artifact-root capture-session.json"));
const schemas = compileSchemas(path.join(repositoryRoot, "consumer-reference/schema"));
const capture = receiptFile ? readCaptureSession(receiptFile, schemas.capture, failures) : undefined;
const intended = canonicalIntended(options.profileRoot, failures);
if (capture && !sameJson(capture.receipt.intended, intended)) failures.push(finding("capture_session_intent_mismatch", receiptFile, "receipt intent differs from canonical profile scenarios"));
if (capture && !capture.receipt.source) failures.push(finding("capture_source_missing", receiptFile, "capture receipt must include its canonical source manifest"));
else if (capture && !sourceManifestMatches(capture.receipt.source, repositoryRoot, options.profileRoot)) failures.push(finding("capture_source_drift", receiptFile, "capture sources differ from the receipt source manifest"));

const runtimeDirectory = options.artifactRoot ? path.join(options.artifactRoot, "runtime") : "";
const capturedAtValues = runtimeDirectory && fs.existsSync(runtimeDirectory)
  ? fs.readdirSync(runtimeDirectory).filter((name) => name.endsWith(".dom.json")).map((name) => {
    try { return parseStrictJson(fs.readFileSync(path.join(runtimeDirectory, name), "utf8")).captured_at; }
    catch { return undefined; }
  }).filter((value) => Number.isFinite(Date.parse(value))).sort()
  : [];
const completedAt = capturedAtValues.at(-1) ?? new Date().toISOString();
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
const capturePacket = capture && run && completedSession ? buildCapturePacket({ environment: capture.receipt.environment, run, session: completedSession }) : undefined;
if (capturePacket && !schemas.captureV2(capturePacket.record)) for (const error of schemas.captureV2.errors ?? []) failures.push(finding("capture_record_schema_invalid", output ?? "<capture>", `${error.instancePath || "/"} ${error.message}`));

const channelFiles = Object.freeze({ ax: "ax.json", dom: "dom.json", visual: "png" });
const records = [];
const expectedFiles = new Set();
for (const profileIntent of intended) {
  const profileRoot = path.join(options.profileRoot, profileIntent.profile_name);
  const profileFailures = [];
  const resolved = resolveProfileRecords(profileRoot, profileFailures);
  failures.push(...profileFailures);
  const fixture = resolved?.records.fixture[0]?.value;
  const states = resolved?.records.states[0]?.value;
  if (!resolved || !fixture || !states || !capturePacket) continue;
  const stateById = new Map(states.scenarios.map((scenario) => [scenario.id, scenario]));
  const passes = [];
  for (const scenario of fixture.scenarios) {
    const canonical = stateById.get(scenario.id);
    const documents = {};
    for (const channel of ["dom", "ax", "visual"]) {
      const file = path.join(options.artifactRoot, "runtime", `${profileIntent.profile_name}-${scenario.id}.${channel}.json`);
      try { documents[channel] = parseStrictJson(fs.readFileSync(file, "utf8")); }
      catch (error) { failures.push(finding("evidence_json_invalid", file, error instanceof Error ? error.message : String(error))); }
      if (channel === "visual") expectedFiles.add(path.basename(file));
    }
    const capturedTimes = new Set(Object.values(documents).map((document) => document?.captured_at).filter(Boolean));
    if (capturedTimes.size !== 1) failures.push(finding("capture_session_time_mismatch", profileRoot, `${scenario.id} visual, DOM, and AX must share one captured_at`));
    const recordedAt = [...capturedTimes][0] ?? "";
    for (const channel of scenario.required_channels) {
      const artifactPath = `runtime/${profileIntent.profile_name}-${scenario.id}.${channelFiles[channel]}`;
      expectedFiles.add(path.basename(artifactPath));
      const absolute = path.join(options.artifactRoot, artifactPath);
      if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isFile() || fs.lstatSync(absolute).isSymbolicLink()) {
        failures.push(finding("runtime_artifact_missing", absolute, `${artifactPath} is missing or not a regular file`));
        continue;
      }
      const mediaType = channel === "visual" ? "image/png" : "application/json";
      passes.push({
        artifact: { path: artifactPath, ...artifactMetadata(fs.readFileSync(absolute), mediaType) },
        channel,
        id: `${scenario.id}-${channel}`,
        recorded_at: recordedAt,
        result: { observed: `Recorded ${channel} evidence for ${scenario.id}; this is not certification.`, status: "passed" },
        scenario_id: scenario.id,
        scope: { component: "button", semantic_mode: scenario.semantic_mode, state_set: canonical.states },
      });
    }
  }
  const evidence = {
    schema_version: "2.0",
    record_kind: "component_evidence",
    component_id: "button",
    profile_id: resolved.profile.id,
    claim_boundary: "Scenario artifacts are evidence, not visual regression baselines or accessibility certification.",
    capture: structuredClone(capturePacket.reference),
    passes,
  };
  failures.push(...validateEvidenceArtifacts(profileRoot, options.artifactRoot, evidence, schemas, capturePacket.record));
  records.push(evidence);
}

const runtimeRoot = options.artifactRoot ? path.join(options.artifactRoot, "runtime") : "";
if (runtimeRoot && fs.existsSync(runtimeRoot)) {
  for (const entry of fs.readdirSync(runtimeRoot, { withFileTypes: true })) if (!entry.isFile() || !expectedFiles.has(entry.name)) failures.push(finding("runtime_artifact_unmanifested", path.join(runtimeRoot, entry.name), `${entry.name} is not part of the closed artifact set`));
}
const manifest = {
  schema_version: "2.0",
  record_kind: "component_runtime_manifest",
  claim_boundary: "Scenario artifacts are evidence, not visual regression baselines or accessibility certification.",
  recorded_at: completedAt,
  capture: capturePacket?.reference,
  records,
};
if (!schemas.runtime(manifest)) for (const error of schemas.runtime.errors ?? []) failures.push(finding("runtime_manifest_schema_invalid", output ?? "<manifest>", `${error.instancePath || "/"} ${error.message}`));

let captureFile;
if (failures.length === 0 && output && capturePacket) {
  captureFile = path.join(options.artifactRoot, capturePacket.reference.path);
  try {
    writeAtomic(captureFile, capturePacket.bytes);
    writeAtomic(output, Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
  } catch (error) {
    failures.push(finding(error?.code ?? "finalizer_write_failed", error?.code === "capture_output_conflict" ? captureFile : output, error instanceof Error ? error.message : String(error)));
  }
}
const result = {
  artifactCount: expectedFiles.size,
  capture: capturePacket?.reference,
  captureFile,
  failures,
  manifest: output,
  ok: failures.length === 0,
  profileCount: records.length,
  sessionId: capture?.receipt.session_id,
};
if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else if (result.ok) process.stdout.write(`finalized ${result.artifactCount} component state artifacts\n`);
else process.stderr.write(`${failures.map((failure) => `${failure.code}: ${failure.path}: ${failure.message}`).join("\n")}\n`);
if (!result.ok) process.exitCode = 1;
