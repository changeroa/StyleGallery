import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { resolveProfileRecords } from "./profile-record-contract.mjs";
import { parseStrictJson } from "./strict-json.mjs";

export const captureSourcePaths = Object.freeze([
  "package-lock.json",
  "package.json",
  "playwright.config.mjs",
  "consumer-reference/schema/ax-evidence.schema.json",
  "consumer-reference/schema/capture-session.schema.json",
  "consumer-reference/schema/component-capture-record.v2.schema.json",
  "consumer-reference/schema/component-evidence-record.v2.schema.json",
  "consumer-reference/schema/component-runtime-manifest.v2.schema.json",
  "consumer-reference/schema/dom-evidence.schema.json",
  "consumer-reference/schema/evidence-record.schema.json",
  "consumer-reference/schema/governed-button-component-state.schema.json",
  "consumer-reference/schema/governed-button-profile.schema.json",
  "consumer-reference/schema/governed-button-runtime-fixture.schema.json",
  "consumer-reference/schema/runtime-evidence-manifest.schema.json",
  "consumer-reference/schema/visual-evidence.schema.json",
  "scripts/artifact-metadata.mjs",
  "scripts/capture-session-contract.mjs",
  "scripts/component-state-contract.mjs",
  "scripts/component-state-semantics.mjs",
  "scripts/create-component-state-session.mjs",
  "scripts/evidence-artifact-contract.mjs",
  "scripts/evidence-capture-contract.mjs",
  "scripts/evidence-version-projection.mjs",
  "scripts/profile-record-contract.mjs",
  "scripts/strict-json.mjs",
  "scripts/test-component-evidence-v2-integration.mjs",
  "scripts/test-evidence-v2-projection.mjs",
  "scripts/test-validate-component-state-artifacts.mjs",
  "scripts/test-validate-component-state.mjs",
  "scripts/visual-expectation-contract.mjs",
  "tests/component-state-evidence.spec.mjs",
  "tests/helpers/render-component-state.mjs",
]);

function finding(code, file, message) {
  return { code, message, path: file };
}

export function sha256(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

export function repositoryGitArgs(repositoryRoot, ...args) {
  return ["-c", `safe.directory=${repositoryRoot}`, ...args];
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function profileSourceFiles(profileRoot) {
  if (!fs.existsSync(profileRoot)) return [];
  const sources = [];
  const profiles = fs.readdirSync(profileRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(profileRoot, entry.name, "profile.json")))
    .sort((left, right) => compare(left.name, right.name));
  for (const profile of profiles) {
    const profileFile = path.join(profileRoot, profile.name, "profile.json");
    const record = parseStrictJson(fs.readFileSync(profileFile, "utf8"));
    const references = [
      "profile.json",
      record.local_foundations,
      record.tokens,
      ...(record.component_records ?? []),
      ...(record.fixture_records ?? []),
      ...(record.state_records ?? []),
    ];
    for (const reference of references) {
      if (typeof reference !== "string") continue;
      if (path.posix.isAbsolute(reference) || path.win32.isAbsolute(reference) || reference.includes("\\") || path.posix.normalize(reference) !== reference || reference.split("/").some((segment) => segment === "." || segment === "..")) {
        throw new Error(`unsafe profile source reference ${profile.name}/${reference}`);
      }
      sources.push({
        file: path.join(profileRoot, profile.name, reference),
        logicalPath: `profiles/${profile.name}/${reference.split(path.sep).join("/")}`,
      });
    }
  }
  return sources;
}

export function relevantSourceFiles(repositoryRoot, profileRoot) {
  return [
    ...captureSourcePaths.map((reference) => ({ file: path.join(repositoryRoot, reference), logicalPath: reference })),
    ...profileSourceFiles(profileRoot),
  ].sort((left, right) => compare(left.logicalPath, right.logicalPath));
}

export function canonicalSourceManifest(repositoryRoot, profileRoot) {
  const files = relevantSourceFiles(repositoryRoot, profileRoot).map(({ file, logicalPath }) => {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`capture source must be a regular non-symlink file: ${logicalPath}`);
    const bytes = fs.readFileSync(file);
    return { byte_length: bytes.length, path: logicalPath, sha256: sha256(bytes) };
  });
  return { files, sha256: sha256(Buffer.from(JSON.stringify(files))) };
}

export function sourceManifestMatches(source, repositoryRoot, profileRoot) {
  try {
    return sameJson(source, canonicalSourceManifest(repositoryRoot, profileRoot));
  } catch {
    return false;
  }
}

export function dirtyRelevantSources(repositoryRoot, profileRoot) {
  const repositoryPrefix = `${path.resolve(repositoryRoot)}${path.sep}`;
  const tracked = relevantSourceFiles(repositoryRoot, profileRoot)
    .map(({ file }) => path.resolve(file))
    .filter((file) => file.startsWith(repositoryPrefix))
    .map((file) => path.relative(repositoryRoot, file));
  if (tracked.length === 0) return [];
  const output = execFileSync("git", repositoryGitArgs(repositoryRoot, "status", "--porcelain=v1", "--untracked-files=all", "--", ...tracked), { cwd: repositoryRoot, encoding: "utf8" });
  return output.split("\n").filter(Boolean).sort(compare);
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
    source: receipt.source,
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
