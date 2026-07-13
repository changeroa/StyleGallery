import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveProfileRecords } from "./profile-record-contract.mjs";
import { parseStrictJson } from "./strict-json.mjs";

function finding(code, file, message) {
  return { code, message, path: file };
}

export function sha256(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

export function sessionLink(receipt, receiptSha256) {
  return {
    attempt: receipt.attempt,
    branch: receipt.branch,
    environment: receipt.environment,
    nonce: receipt.nonce,
    receipt_sha256: receiptSha256,
    revision: receipt.revision,
    session_id: receipt.session_id,
    started_at: receipt.started_at,
  };
}

export function readCaptureSession(file, validate, failures) {
  if (!fs.existsSync(file)) {
    failures.push(finding("capture_session_missing", file, "capture session receipt is missing"));
    return undefined;
  }
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    failures.push(finding("capture_session_type_invalid", file, "capture session receipt must be a regular non-symlink file"));
    return undefined;
  }
  const bytes = fs.readFileSync(file);
  let receipt;
  try {
    receipt = parseStrictJson(bytes.toString("utf8"));
  } catch (error) {
    failures.push(finding("capture_session_json_invalid", file, error instanceof Error ? error.message : String(error)));
    return undefined;
  }
  if (!validate(receipt)) {
    for (const error of validate.errors ?? []) failures.push(finding("capture_session_schema_invalid", file, `${error.instancePath || "/"} ${error.message}`));
  }
  const digest = sha256(bytes);
  return {
    artifact: { byte_length: bytes.length, media_type: "application/json", path: "capture-session.json", sha256: digest },
    bytes,
    digest,
    link: sessionLink(receipt, digest),
    receipt,
  };
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function canonicalIntended(profileRoot, failures) {
  if (!fs.existsSync(profileRoot)) return [];
  const intended = [];
  for (const entry of fs.readdirSync(profileRoot, { withFileTypes: true }).filter((item) => item.isDirectory()).sort((left, right) => compare(left.name, right.name))) {
    const root = path.join(profileRoot, entry.name);
    if (!fs.existsSync(path.join(root, "profile.json"))) continue;
    const resolved = resolveProfileRecords(root, failures);
    const fixture = resolved?.records.fixture[0]?.value;
    if (!resolved || !fixture) continue;
    intended.push({
      profile_id: resolved.profile.id,
      profile_name: entry.name,
      scenarios: fixture.scenarios.map((scenario) => ({ channels: [...scenario.required_channels].sort(compare), id: scenario.id })).sort((left, right) => compare(left.id, right.id)),
    });
  }
  return intended;
}

export function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function withinSession(capturedAt, startedAt, completedAt) {
  const captured = Date.parse(capturedAt);
  const started = Date.parse(startedAt);
  const completed = Date.parse(completedAt);
  return Number.isFinite(captured) && Number.isFinite(started) && Number.isFinite(completed) && captured >= started && captured <= completed;
}
