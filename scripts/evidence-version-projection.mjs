#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CAPTURE_DIRECTORY } from "./evidence-capture-contract.mjs";

const CAPTURE_FIELDS = ["environment", "run", "session"];
const V1_ROOT_FIELDS = ["schema_version", "component_id", "profile_id", "claim_boundary", "passes"];
const V1_PASS_FIELDS = ["id", "scenario_id", "artifact", "recorded_at", ...CAPTURE_FIELDS, "scope", "channel", "result"];
const V2_RECORD_FIELDS = ["schema_version", "record_kind", "component_id", "profile_id", "claim_boundary", "capture", "passes"];
const V2_PASS_FIELDS = ["id", "scenario_id", "artifact", "recorded_at", "scope", "channel", "result"];

export class EvidenceProjectionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "EvidenceProjectionError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new EvidenceProjectionError(code, message);
}

function clone(value) {
  return structuredClone(value);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function digest(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

function requireObject(value, code, location) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code, `${location} must be an object`);
}

function requireFields(value, fields, code, location) {
  requireObject(value, code, location);
  for (const field of fields) if (!(field in value)) fail(code, `${location}.${field} is required`);
}

function sessionLink(session) {
  const fields = ["session_id", "nonce", "receipt_sha256", "started_at", "revision", "branch", "attempt", "environment", "source"];
  return Object.fromEntries(fields.map((field) => [field, clone(session[field])]));
}

function captureIdentity(pass) {
  return { environment: clone(pass.environment), run: clone(pass.run), session: clone(pass.session) };
}

export function buildCapturePacket({ environment, run, session }) {
  const payload = { environment: clone(environment), run: clone(run), session: clone(session) };
  const capture_id = digest(Buffer.from(canonicalJson(payload)));
  const record = { schema_version: "2.0", record_kind: "component_capture", capture_id, profile_id: "shared-component-state", ...payload };
  const bytes = Buffer.from(`${JSON.stringify(record, null, 2)}\n`);
  const sha256 = digest(bytes);
  const reference = {
    capture_id,
    path: `${CAPTURE_DIRECTORY}/sha256-${sha256.slice(7)}.capture.json`,
    sha256,
    byte_length: bytes.length,
  };
  return { bytes, record, reference };
}

function inputRecords(input) {
  if (Array.isArray(input)) return input;
  requireObject(input, "evidence_v1_input_invalid", "input");
  if (Array.isArray(input.records)) return input.records;
  return [input];
}

/** Normalize one or more v1 profile records into one shared capture packet and v2 manifest. */
export function normalizeEvidenceV1(input) {
  const records = inputRecords(input);
  if (records.length === 0) fail("evidence_v1_records_required", "at least one v1 evidence record is required");
  const profiles = new Set();
  let sharedIdentity;
  const normalized = [];

  records.forEach((record, recordIndex) => {
    const location = `records[${recordIndex}]`;
    requireFields(record, V1_ROOT_FIELDS, "evidence_v1_required_field_missing", location);
    if (record.schema_version !== "1.0") fail("evidence_v1_version_invalid", `${location}.schema_version must be 1.0`);
    if (!Array.isArray(record.passes) || record.passes.length === 0) fail("evidence_v1_passes_required", `${location}.passes must not be empty`);
    if (profiles.has(record.profile_id)) fail("evidence_v1_profile_duplicate", `${record.profile_id} is repeated`);
    profiles.add(record.profile_id);
    for (const [passIndex, pass] of record.passes.entries()) {
      requireFields(pass, V1_PASS_FIELDS, "evidence_v1_required_field_missing", `${location}.passes[${passIndex}]`);
      const identity = captureIdentity(pass);
      if (sharedIdentity && canonicalJson(identity) !== canonicalJson(sharedIdentity)) fail("evidence_v1_mixed_profile_captures", "all profile passes must share one capture identity");
      sharedIdentity ??= identity;
    }
    normalized.push({
      schema_version: "2.0",
      record_kind: "component_evidence",
      component_id: clone(record.component_id),
      profile_id: clone(record.profile_id),
      claim_boundary: clone(record.claim_boundary),
      capture: undefined,
      passes: record.passes.map((pass) => Object.fromEntries(V2_PASS_FIELDS.map((field) => [field, clone(pass[field])]))),
    });
  });

  const boundaries = new Set(normalized.map((record) => record.claim_boundary));
  if (boundaries.size !== 1) fail("evidence_v1_claim_boundary_mixed", "v1 records must share one claim boundary");
  const capture = buildCapturePacket(sharedIdentity);
  for (const record of normalized) record.capture = clone(capture.reference);
  const recorded_at = normalized.flatMap((record) => record.passes.map((pass) => pass.recorded_at)).sort().at(-1);
  const manifest = {
    schema_version: "2.0",
    record_kind: "component_runtime_manifest",
    claim_boundary: normalized[0].claim_boundary,
    recorded_at,
    capture: clone(capture.reference),
    records: normalized,
  };
  return { captures: [capture], manifest };
}

/** Expand a v2 packet back to canonical v1 evidence records. */
export function expandEvidenceV2(packet) {
  requireFields(packet, ["captures", "manifest"], "evidence_v2_required_field_missing", "packet");
  const manifest = packet.manifest;
  requireFields(manifest, ["schema_version", "record_kind", "claim_boundary", "recorded_at", "capture", "records"], "evidence_v2_required_field_missing", "manifest");
  if (manifest.schema_version !== "2.0") fail("evidence_v2_version_invalid", "manifest.schema_version must be 2.0");
  if (!Array.isArray(packet.captures) || packet.captures.length === 0) fail("evidence_v2_capture_missing", "exactly one capture record is required");
  if (packet.captures.length !== 1) fail("evidence_v2_capture_duplicate", "exactly one capture record is allowed");
  if (!Array.isArray(manifest.records) || manifest.records.length === 0) fail("evidence_v2_records_required", "manifest.records must not be empty");
  const capturePacket = packet.captures[0];
  requireFields(capturePacket, ["record", "reference"], "evidence_v2_required_field_missing", "captures[0]");
  const rebuilt = buildCapturePacket(capturePacket.record);
  if (canonicalJson(rebuilt.reference) !== canonicalJson(capturePacket.reference)) fail("evidence_v2_capture_hash_mismatch", "capture reference does not match capture content");
  if (canonicalJson(manifest.capture) !== canonicalJson(capturePacket.reference)) fail("evidence_v2_capture_unknown", "manifest references an unknown capture");

  const profiles = new Set();
  return manifest.records.map((record, recordIndex) => {
    const location = `records[${recordIndex}]`;
    requireFields(record, V2_RECORD_FIELDS, "evidence_v2_required_field_missing", location);
    if (record.schema_version !== "2.0") fail("evidence_v2_version_invalid", `${location}.schema_version must be 2.0`);
    if (!Array.isArray(record.passes) || record.passes.length === 0) fail("evidence_v2_passes_required", `${location}.passes must not be empty`);
    if (profiles.has(record.profile_id)) fail("evidence_v2_profile_duplicate", `${record.profile_id} is repeated`);
    profiles.add(record.profile_id);
    if (canonicalJson(record.capture) !== canonicalJson(capturePacket.reference)) fail("evidence_v2_capture_unknown", `${location} references an unknown capture`);
    for (const [passIndex, pass] of record.passes.entries()) {
      requireFields(pass, V2_PASS_FIELDS, "evidence_v2_required_field_missing", `${location}.passes[${passIndex}]`);
      for (const field of [...CAPTURE_FIELDS, "capture_ref"]) if (field in pass) fail("evidence_v2_pass_capture_identity_forbidden", `${location}.passes[${passIndex}].${field} is forbidden`);
    }
    const capture = capturePacket.record;
    return {
      claim_boundary: clone(record.claim_boundary),
      component_id: clone(record.component_id),
      passes: record.passes.map((pass) => ({
        artifact: clone(pass.artifact), channel: clone(pass.channel), environment: clone(capture.environment), id: clone(pass.id),
        recorded_at: clone(pass.recorded_at), result: clone(pass.result), run: clone(capture.run), scenario_id: clone(pass.scenario_id),
        session: sessionLink(capture.session), scope: clone(pass.scope),
      })),
      profile_id: clone(record.profile_id),
      schema_version: "1.0",
    };
  });
}

function runCli() {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  let root = path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local");
  let includeManifest = false;
  for (let index = 2; index < process.argv.length; index += 1) {
    if (process.argv[index] === "--root" && process.argv[index + 1]) root = path.resolve(process.argv[++index]);
    else if (process.argv[index] === "--manifest") includeManifest = true;
    else fail("evidence_projection_argument_unknown", `unsupported argument ${process.argv[index]}`);
  }
  const profiles = fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, entry.name, "evidence/button.evidence.json"))).map((entry) => entry.name).sort();
  const source = profiles.map((profile) => JSON.parse(fs.readFileSync(path.join(root, profile, "evidence/button.evidence.json"), "utf8")));
  const packet = normalizeEvidenceV1(source);
  const expanded = expandEvidenceV2(packet);
  const report = {
    ok: canonicalJson(source) === canonicalJson(expanded), profiles: packet.manifest.records.length,
    passes: packet.manifest.records.reduce((count, record) => count + record.passes.length, 0), captures: packet.captures.length,
    artifact_paths: packet.manifest.records.flatMap((record) => record.passes.map((pass) => pass.artifact.path)),
    capture_ids: packet.captures.map((capture) => capture.record.capture_id), ...(includeManifest ? { packet } : {}),
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try { runCli(); } catch (error) {
    process.stderr.write(`${error?.code ?? "evidence_projection_failed"}: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
