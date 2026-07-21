import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { canonicalSourceManifest, digest, metadata } from "./page-evidence-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const creator = path.join(repositoryRoot, "scripts/create-page-evidence-session.mjs");
export const finalizer = path.join(repositoryRoot, "scripts/finalize-page-evidence.mjs");
export const validator = path.join(repositoryRoot, "scripts/validate-page-evidence.mjs");
export const semanticEnvironment = Object.freeze({
  browser: "Chromium 140.0.0",
  browser_revision: "chromium-1400",
  color_scheme: "light",
  locale: "en-US",
  page_scale_factor: 1,
  platform: "linux/amd64",
  reduced_motion: "no-preference",
  viewport: { height: 720, width: 320 },
});
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
  return value >>> 0;
});

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4, 8 + data.length)) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 8 + data.length);
  return chunk;
}

export function truncatedPng() {
  return Buffer.from(png.subarray(0, 24));
}

export function corruptPngCrc() {
  const bytes = Buffer.from(png);
  bytes[bytes.length - 1] ^= 0xff;
  return bytes;
}

export function pngWithTrailingBytes() {
  return Buffer.concat([png, Buffer.from("trailing bytes")]);
}

export function pngWithInvalidImageData() {
  return Buffer.concat([png.subarray(0, 33), pngChunk("IDAT", Buffer.alloc(0)), png.subarray(png.length - 12)]);
}

export function pngWithTrailingImageData() {
  const length = png.readUInt32BE(33);
  const data = png.subarray(41, 41 + length);
  return Buffer.concat([png.subarray(0, 33), pngChunk("IDAT", Buffer.concat([data, Buffer.from("trailing")])), png.subarray(45 + length)]);
}

function git(root, ...args) {
  return execFileSync("git", ["-c", `safe.directory=${root}`, ...args], { cwd: root, encoding: "utf8" }).trim();
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function runCli(file, args, root, env = {}) {
  const fixtureEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GITHUB_")));
  const child = spawnSync(process.execPath, [file, ...args, "--json"], { cwd: repositoryRoot, encoding: "utf8", env: { ...fixtureEnv, ...env } });
  let report = { failures: [{ code: "child_output_invalid", message: child.stdout || child.stderr, path: file }], ok: false };
  try { report = JSON.parse(child.stdout); } catch (error) { if (!(error instanceof SyntaxError)) throw error; }
  return { report, root, status: child.status };
}

export function initializeConsumer() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-page-evidence-")));
  execFileSync("git", ["init", "-b", "main"], { cwd: root, stdio: "ignore" });
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "user.name", "StyleGallery fixture");
  git(root, "remote", "add", "origin", "https://github.com/example/consumer.git");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "tests"), { recursive: true });
  fs.writeFileSync(path.join(root, "src/page.js"), "export const page = 'ready';\n");
  fs.writeFileSync(path.join(root, "tests/page.spec.js"), "const scenario = 'responsive-layout';\nvoid scenario;\n");
  git(root, "add", "src/page.js", "tests/page.spec.js");
  git(root, "commit", "-m", "fixture sources");
  return {
    relevantSources: ["src/page.js", "tests/page.spec.js"],
    repository: "example/consumer",
    revision: git(root, "rev-parse", "HEAD"),
    root,
  };
}

export function createConformance(fixture, { artifactName = "session-a", recordName = artifactName, runId = `run-${artifactName}`, scenarioId = "responsive-layout", sessionId = `session-${artifactName}` } = {}) {
  const sourceFailures = [];
  const source = canonicalSourceManifest(fixture.root, fixture.relevantSources, sourceFailures);
  if (!source || sourceFailures.length > 0) throw new Error(`fixture source manifest failed: ${JSON.stringify(sourceFailures)}`);
  const artifactRoot = path.join(fixture.root, "evidence", artifactName);
  const recordFile = path.join(fixture.root, "records", `${recordName}.json`);
  writeJson(recordFile, {
    claim_boundary: "Synthetic conformance fixture; not product certification.",
    consumer: { relevant_sources: fixture.relevantSources, repository: fixture.repository, revision: fixture.revision },
    id: `${recordName}-conformance`,
    page_evidence: { manifest: path.relative(fixture.root, path.join(artifactRoot, "page-evidence-manifest.json")), status: "applicable" },
    record_kind: "consumer_migration_conformance",
    scenarios: [{
      assertions: ["No document overflow."],
      argv: ["node", "tests/page.spec.js"],
      evidence_method: "browser",
      exit_code: 0,
      id: scenarioId,
      observable_actions: ["Render the page."],
      result_artifact: path.relative(fixture.root, path.join(artifactRoot, "runner", `${scenarioId}.json`)),
      run_id: runId,
      session_id: sessionId,
      source_digest: source.sha256,
    }],
    schema_version: "1.0",
  });
  return { artifactRoot, recordFile, runId, scenarioId, sessionId, source };
}

export function startSession(fixture, session, env = {}) {
  return runCli(creator, ["--root", fixture.root, "--record", session.recordFile, "--artifact-root", session.artifactRoot], fixture.root, env);
}

export function receiptFor(session) {
  const file = path.join(session.artifactRoot, "page-evidence-session.json");
  const bytes = fs.readFileSync(file);
  return { bytes, file, sha256: digest(bytes), value: JSON.parse(bytes) };
}

export function writeRunner(fixture, session, overrides = {}) {
  const receipt = receiptFor(session);
  const scenarioId = overrides.scenarioId ?? session.scenarioId;
  const runnerReference = `runner/${scenarioId}.json`;
  const artifactReference = overrides.artifactPath ?? `captures/${scenarioId}-320.png`;
  if (overrides.writeArtifact !== false) {
    const artifactFile = path.join(session.artifactRoot, artifactReference);
    fs.mkdirSync(path.dirname(artifactFile), { recursive: true });
    fs.writeFileSync(artifactFile, overrides.artifactBytes ?? png);
  }
  const evidence = overrides.evidence ?? (overrides.status === "failed"
    ? { kind: "failed", reason: "synthetic runner failure" }
    : { artifacts: [{ media_type: "image/png", path: artifactReference }], kind: "captured" });
  const runner = {
    evidence,
    nonce: overrides.nonce ?? receipt.value.nonce,
    receipt_sha256: overrides.receiptSha256 ?? receipt.sha256,
    recorded_at: overrides.recordedAt ?? receipt.value.started_at,
    record_kind: "page_evidence_runner_result",
    repository: overrides.repository ?? fixture.repository,
    revision: overrides.revision ?? fixture.revision,
    run: {
      attempt: receipt.value.attempt,
      id: overrides.runId ?? session.runId,
      repository: overrides.runRepository ?? fixture.repository,
      revision: overrides.runRevision ?? fixture.revision,
      source: "local",
    },
    scenario_id: scenarioId,
    schema_version: "1.0",
    semantic_environment: overrides.semanticEnvironment ?? semanticEnvironment,
    session_id: overrides.sessionId ?? session.sessionId,
    source_sha256: overrides.sourceSha256 ?? receipt.value.source.sha256,
    status: overrides.status ?? "passed",
  };
  const runnerFile = path.join(session.artifactRoot, runnerReference);
  writeJson(runnerFile, runner);
  return { artifactReference, runner, runnerFile, runnerReference };
}

export function declareCapturedArtifact(session, runnerRecord, artifactReference) {
  if (runnerRecord.artifactReference !== artifactReference) {
    fs.rmSync(path.join(session.artifactRoot, runnerRecord.artifactReference), { force: true });
  }
  const runner = {
    ...runnerRecord.runner,
    evidence: { artifacts: [{ media_type: "application/json", path: artifactReference }], kind: "captured" },
  };
  writeJson(runnerRecord.runnerFile, runner);
  return { ...runnerRecord, artifactReference, runner };
}

export function rewriteCompletedCapture(session, runnerRecord, artifactReference) {
  const declared = declareCapturedArtifact(session, runnerRecord, artifactReference);
  const manifestFile = path.join(session.artifactRoot, "page-evidence-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile));
  const runnerResult = metadata(fs.readFileSync(declared.runnerFile), "application/json", declared.runnerReference);
  const artifact = metadata(fs.readFileSync(path.join(session.artifactRoot, artifactReference)), "application/json", artifactReference);
  const [scenario, ...remaining] = manifest.scenarios;
  writeJson(manifestFile, {
    ...manifest,
    scenarios: [{ ...scenario, evidence: { artifacts: [artifact], kind: "captured" }, runner_result: runnerResult }, ...remaining],
  });
}

export function rewriteCompletedArtifact(session, runnerRecord, bytes) {
  const artifactFile = path.join(session.artifactRoot, runnerRecord.artifactReference);
  fs.writeFileSync(artifactFile, bytes);
  const artifact = { ...metadata(bytes, "image/png", runnerRecord.artifactReference), height: 1, width: 1 };
  const manifestFile = path.join(session.artifactRoot, "page-evidence-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile));
  const runnerResult = metadata(fs.readFileSync(runnerRecord.runnerFile), "application/json", runnerRecord.runnerReference);
  const [scenario, ...remaining] = manifest.scenarios;
  writeJson(manifestFile, {
    ...manifest,
    scenarios: [{ ...scenario, evidence: { artifacts: [artifact], kind: "captured" }, runner_result: runnerResult }, ...remaining],
  });
}

export function finalizeSession(fixture, session, runner, priorManifest) {
  const args = ["--root", fixture.root, "--artifact-root", session.artifactRoot, "--runner-result", runner.runnerReference, "--review-by", "2030-01-01T00:00:00Z"];
  if (priorManifest) args.push("--prior-manifest", priorManifest);
  return runCli(finalizer, args, fixture.root);
}

export function validateSession(fixture, session, priorManifest) {
  const args = ["--root", fixture.root, "--artifact-root", session.artifactRoot];
  if (priorManifest) args.push("--prior-manifest", priorManifest);
  return runCli(validator, args, fixture.root);
}

export function completeSession(fixture, session = createConformance(fixture)) {
  const start = startSession(fixture, session);
  if (start.status !== 0) return { fixture, session, start };
  const runner = writeRunner(fixture, session);
  const finalize = finalizeSession(fixture, session, runner);
  const validate = finalize.status === 0 ? validateSession(fixture, session) : undefined;
  return { finalize, fixture, runner, session, start, validate };
}

export function isolated(run) {
  const fixture = initializeConsumer();
  try { return run(fixture); }
  finally { cleanupFixture(fixture); }
}

export function started(fixture, options) {
  const session = createConformance(fixture, options);
  const start = startSession(fixture, session);
  if (start.status !== 0) throw new Error(`fixture start failed: ${JSON.stringify(start.report)}`);
  return session;
}

export function reuseSetup(fixture, { beforeCurrent, currentOptions } = {}) {
  const prior = completeSession(fixture, createConformance(fixture, { artifactName: "prior" }));
  beforeCurrent?.(fixture);
  const current = started(fixture, { artifactName: "current", ...currentOptions });
  const priorManifest = path.join(prior.session.artifactRoot, "page-evidence-manifest.json");
  const evidence = {
    kind: "reused",
    prior_manifest_sha256: digest(fs.readFileSync(priorManifest)),
    prior_run_id: prior.session.runId,
    prior_scenario_id: prior.session.scenarioId,
    prior_session_id: prior.session.sessionId,
  };
  return { current, evidence, prior, priorManifest };
}

export function cleanupFixture(fixture) {
  fs.rmSync(fixture.root, { force: true, recursive: true });
}
