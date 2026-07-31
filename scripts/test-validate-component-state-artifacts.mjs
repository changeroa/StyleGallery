#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { artifactMetadata } from "./artifact-metadata.mjs";
import { sessionLink, sha256 } from "./capture-session-contract.mjs";
import { makePng, syntheticImage } from "./component-state-artifact-fixture.mjs";
import { resolveProfileRecords } from "./profile-record-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(repositoryRoot, "consumer-reference/fixtures/component-evidence-v1");
const sourceProfiles = path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local");
const validator = path.join(repositoryRoot, "scripts/validate-component-state.mjs");
const finalizer = path.join(repositoryRoot, "scripts/finalize-component-state-evidence.mjs");
const creator = path.join(repositoryRoot, "scripts/create-component-state-session.mjs");

const png = makePng(32);

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function materializeArchivedV1Evidence(profileRoot) {
  for (const profile of ["editorial", "terminal"]) {
    fs.copyFileSync(path.join(fixtureRoot, `${profile}.button.evidence.json`), path.join(profileRoot, profile, "evidence/button.evidence.json"));
  }
}

function profileEntries(profileRoot) {
  return fs.readdirSync(profileRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(profileRoot, entry.name, "profile.json")));
}

function prepareCanonical() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-state-artifacts-base-"));
  const profileRoot = path.join(root, "profiles");
  const artifactRoot = path.join(root, "artifacts");
  fs.cpSync(sourceProfiles, profileRoot, { recursive: true });
  materializeArchivedV1Evidence(profileRoot);
  for (const entry of profileEntries(profileRoot)) {
    const resolved = resolveProfileRecords(path.join(profileRoot, entry.name), []);
    const statesRecord = resolved.records.states[0];
    for (const scenario of statesRecord.value.scenarios) {
      const metadata = artifactMetadata(syntheticImage(entry.name, scenario.id), "image/png");
      scenario.expected.visual_image = scenario.expected.visual_image.map((expectation) => ({ environment_id: expectation.environment_id, height: metadata.height, sha256: metadata.sha256, width: metadata.width }));
    }
    writeJson(statesRecord.path, statesRecord.value);
  }
  const receiptFile = path.join(artifactRoot, "capture-session.json");
  const created = spawnSync(process.execPath, [creator, "--root", profileRoot, "--output", receiptFile, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  if (created.status !== 0) throw new Error(`canonical session creation failed: ${created.stdout}${created.stderr}`);
  const receiptBytes = fs.readFileSync(receiptFile);
  const receipt = JSON.parse(receiptBytes);
  const captureLink = sessionLink(receipt, sha256(receiptBytes));
  const capturedAt = new Date().toISOString();
  for (const entry of profileEntries(profileRoot)) {
    const resolved = resolveProfileRecords(path.join(profileRoot, entry.name), []);
    const fixtures = resolved.records.fixture[0].value;
    const states = new Map(resolved.records.states[0].value.scenarios.map((scenario) => [scenario.id, scenario]));
    for (const fixture of fixtures.scenarios) {
      const scenario = states.get(fixture.id);
      const prefix = path.join(artifactRoot, "runtime", `${entry.name}-${fixture.id}`);
      const attributes = Object.fromEntries(Object.entries(scenario.expected.dom).filter(([key]) => !["active", "role"].includes(key)));
      writeJson(`${prefix}.dom.json`, {
        activation_count: scenario.expected.activation === "allowed" ? 1 : 0,
        activation_key: fixture.activation_key,
        active: scenario.expected.dom.active === "true",
        attributes,
        capture_session: captureLink,
        captured_at: capturedAt,
        channel: "dom",
        profile_id: resolved.profile.id,
        role: scenario.expected.dom.role,
        scenario_id: fixture.id,
        schema_version: "1.0",
        semantic_mode: scenario.semantic_mode,
        visual_states: scenario.expected.visual,
      });
      writeJson(`${prefix}.ax.json`, {
        capture_session: captureLink,
        captured_at: capturedAt,
        channel: "ax",
        name: fixture.label,
        profile_id: resolved.profile.id,
        properties: Object.fromEntries(Object.entries(scenario.expected.ax).filter(([key]) => key !== "role")),
        role: scenario.expected.ax.role,
        scenario_id: fixture.id,
        schema_version: "1.0",
        semantic_mode: scenario.semantic_mode,
      });
      fs.mkdirSync(path.dirname(`${prefix}.png`), { recursive: true });
      const image = syntheticImage(entry.name, fixture.id);
      fs.writeFileSync(`${prefix}.png`, image);
      writeJson(`${prefix}.visual.json`, {
        capture_session: captureLink,
        captured_at: capturedAt,
        channel: "visual",
        image: { path: `${entry.name}-${fixture.id}.png`, ...artifactMetadata(image, "image/png") },
        profile_id: resolved.profile.id,
        scenario_id: fixture.id,
        schema_version: "1.0",
        semantic_mode: scenario.semantic_mode,
        source_sha256: receipt.source.sha256,
      });
    }
  }
  const manifest = path.join(artifactRoot, "runtime-manifest.json");
  const child = spawnSync(process.execPath, [finalizer, "--root", profileRoot, "--artifact-root", artifactRoot, "--output", manifest, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  if (child.status !== 0) throw new Error(`canonical artifact finalization failed: ${child.stdout}${child.stderr}`);
  const finalization = JSON.parse(child.stdout);
  if (finalization.artifactCount !== 40) throw new Error(`canonical finalization must close 40 runtime files, found ${finalization.artifactCount}`);
  const v2 = JSON.parse(fs.readFileSync(manifest, "utf8"));
  const captureRecord = JSON.parse(fs.readFileSync(path.join(artifactRoot, v2.capture.path), "utf8"));
  const legacy = {
    claim_boundary: v2.claim_boundary,
    environment: captureRecord.environment,
    recorded_at: v2.recorded_at,
    record_kind: "component_state_runtime_manifest",
    records: v2.records.map((record) => ({
      claim_boundary: record.claim_boundary,
      component_id: record.component_id,
      passes: record.passes.map((passRecord) => ({ ...passRecord, environment: captureRecord.environment, run: captureRecord.run, session: sessionLink(captureRecord.session, captureRecord.session.receipt_sha256) })),
      profile_id: record.profile_id,
      schema_version: "1.0",
    })),
    run: captureRecord.run,
    schema_version: "1.0",
    session: captureRecord.session,
  };
  writeJson(manifest, legacy);
  const passCount = legacy.records.flatMap((record) => record.passes).length;
  if (passCount !== 30) throw new Error(`canonical finalization must retain 30 channel passes, found ${passCount}`);
  return { artifactRoot, manifest, profileRoot, root };
}

function codes(output) {
  return (output.failures ?? []).map((failure) => failure.code);
}

function findPass(manifest, scenario, channel, record = 0) {
  return manifest.records[record].passes.find((pass) => pass.scenario_id === scenario && pass.channel === channel);
}

function refresh(pass, artifactRoot, preserveDimensions = false) {
  const file = path.join(artifactRoot, pass.artifact.path);
  const dimensions = { height: pass.artifact.height, width: pass.artifact.width };
  pass.artifact = { path: pass.artifact.path, ...artifactMetadata(fs.readFileSync(file), pass.artifact.media_type) };
  if (preserveDimensions) Object.assign(pass.artifact, dimensions);
}

function mutateJsonArtifact(manifest, artifactRoot, scenario, channel, mutate) {
  const pass = findPass(manifest, scenario, channel);
  const file = path.join(artifactRoot, pass.artifact.path);
  const document = JSON.parse(fs.readFileSync(file));
  mutate(document);
  writeJson(file, document);
  refresh(pass, artifactRoot);
  return pass;
}


const cases = [
  { name: "canonical", valid: true },
  { expect: "evidence_channel_duplicate", name: "channel_substitution", mutate: (m) => { findPass(m, "action-focused", "ax").channel = "dom"; } },
  { expect: "evidence_png_invalid", name: "dummy_visual_bytes", mutate: (m, a) => { const p = findPass(m, "action-focused", "visual"); fs.writeFileSync(path.join(a, p.artifact.path), "not a png"); refresh(p, a, true); } },
  { expect: "evidence_visual_image_mismatch", name: "wrong_valid_png", mutate: (m, a) => { const p = findPass(m, "action-focused", "visual"); fs.writeFileSync(path.join(a, p.artifact.path), makePng(224)); refresh(p, a); } },
  { expect: "evidence_visual_expectation_mismatch", name: "coordinated_visual_substitution", mutate: (m, a) => { const p = findPass(m, "action-focused", "visual"); const file = path.join(a, p.artifact.path); const image = makePng(224); fs.writeFileSync(file, image); refresh(p, a); const sidecar = path.join(a, p.artifact.path.replace(/\.png$/, ".visual.json")); const document = JSON.parse(fs.readFileSync(sidecar)); document.image = { path: path.basename(file), ...artifactMetadata(image, "image/png") }; writeJson(sidecar, document); } },
  { expect: "evidence_json_invalid", name: "png_as_dom", mutate: (m, a) => { const p = findPass(m, "action-focused", "dom"); fs.writeFileSync(path.join(a, p.artifact.path), png); refresh(p, a); } },
  { expect: "evidence_artifact_symlink", name: "artifact_symlink", mutate: (m, a) => { const p = findPass(m, "action-focused", "visual"); const f = path.join(a, p.artifact.path); fs.rmSync(f); fs.symlinkSync("/etc/hosts", f); } },
  { expect: "evidence_artifact_reused", name: "artifact_path_reuse", mutate: (m) => { const p = findPass(m, "action-loading-busy", "visual"); p.artifact = structuredClone(findPass(m, "action-focused", "visual").artifact); } },
  { expect: "evidence_artifact_content_reused", name: "artifact_content_reuse", mutate: (m, a) => { const source = findPass(m, "action-focused", "visual"); const target = findPass(m, "action-loading-busy", "visual"); fs.copyFileSync(path.join(a, source.artifact.path), path.join(a, target.artifact.path)); refresh(target, a); } },
  { expect: "evidence_scenario_unknown", name: "unknown_scenario", mutate: (m) => { findPass(m, "action-focused", "dom").scenario_id = "unknown-scenario"; } },
  { expect: "runtime_manifest_profile_unknown", name: "unknown_profile", mutate: (m) => { m.records[0].profile_id = "unknown-profile"; } },
  { expect: "evidence_artifact_integrity", name: "forged_hash", mutate: (m) => { findPass(m, "action-focused", "visual").artifact.sha256 = `sha256:${"0".repeat(64)}`; } },
  { expect: "evidence_artifact_missing", name: "missing_artifact", mutate: (m) => { findPass(m, "action-focused", "visual").artifact.path = "runtime/missing.png"; } },
  { expect: "evidence_artifact_type_invalid", name: "directory_artifact", mutate: (m, a) => { const p = findPass(m, "action-focused", "visual"); p.artifact.path = "runtime/directory.png"; fs.mkdirSync(path.join(a, p.artifact.path)); } },
  { expect: "evidence_artifact_escape", name: "outside_artifact", mutate: (m) => { findPass(m, "action-focused", "visual").artifact.path = "../outside.png"; } },
  { expect: "evidence_dom_content_mismatch", name: "pressed_dom_false", mutate: (m, a) => { const p = findPass(m, "toggle-focused-pressed", "dom"); const f = path.join(a, p.artifact.path); const d = JSON.parse(fs.readFileSync(f)); d.attributes["aria-pressed"] = "false"; writeJson(f, d); refresh(p, a); } },
  { expect: "evidence_dom_content_mismatch", name: "disabled_dom_false", mutate: (m, a) => { const p = findPass(m, "action-disabled-busy", "dom"); const f = path.join(a, p.artifact.path); const d = JSON.parse(fs.readFileSync(f)); d.attributes.disabled = "false"; writeJson(f, d); refresh(p, a); } },
  { expect: "evidence_runtime_identity_mismatch", name: "activation_key_mismatch", mutate: (m, a) => { const p = findPass(m, "action-focused", "dom"); const f = path.join(a, p.artifact.path); const d = JSON.parse(fs.readFileSync(f)); d.activation_key = "Space"; writeJson(f, d); refresh(p, a); } },
  { expect: "evidence_recorded_at_mismatch", name: "stale_runtime", mutate: (m) => { m.recorded_at = "2000-01-01T00:00:00.000Z"; for (const record of m.records) for (const pass of record.passes) pass.recorded_at = m.recorded_at; } },
  { expect: "evidence_dom_schema_invalid", name: "unexpected_certification", mutate: (m, a) => { const p = findPass(m, "action-focused", "dom"); const f = path.join(a, p.artifact.path); const d = JSON.parse(fs.readFileSync(f)); d.certification = true; writeJson(f, d); refresh(p, a); } },
  { expect: "evidence_dom_schema_invalid", name: "dom_extra_nested_field", mutate: (m, a) => { mutateJsonArtifact(m, a, "action-focused", "dom", (d) => { d.attributes.certification = "true"; }); } },
  { expect: "evidence_dom_schema_invalid", name: "dom_null_type", mutate: (m, a) => { mutateJsonArtifact(m, a, "action-focused", "dom", (d) => { d.active = null; }); } },
  { expect: "evidence_dom_schema_invalid", name: "dom_missing_key", mutate: (m, a) => { mutateJsonArtifact(m, a, "action-focused", "dom", (d) => { delete d.activation_count; }); } },
  { expect: "evidence_ax_schema_invalid", name: "ax_extra_nested_field", mutate: (m, a) => { mutateJsonArtifact(m, a, "action-focused", "ax", (d) => { d.properties.certification = true; }); } },
  { expect: "evidence_ax_schema_invalid", name: "ax_null_type", mutate: (m, a) => { mutateJsonArtifact(m, a, "action-focused", "ax", (d) => { d.properties.focused = null; }); } },
  { expect: "evidence_ax_schema_invalid", name: "ax_missing_key", mutate: (m, a) => { mutateJsonArtifact(m, a, "action-focused", "ax", (d) => { delete d.role; }); } },
  { expect: "capture_session_receipt_mismatch", name: "receipt_tamper", mutate: (m, a) => { const f = path.join(a, "capture-session.json"); const r = JSON.parse(fs.readFileSync(f)); r.nonce = "0".repeat(64); writeJson(f, r); } },
  { expect: "capture_session_schema_invalid", name: "receipt_source_missing", mutate: (_m, a) => { const f = path.join(a, "capture-session.json"); const r = JSON.parse(fs.readFileSync(f)); delete r.source; writeJson(f, r); } },
  { expect: "runtime_manifest_schema_invalid", name: "completed_session_source_missing", mutate: (m) => { delete m.session.source; } },
  { expect: "evidence_visual_schema_invalid", name: "visual_session_source_missing", mutate: (m, a) => { const p = findPass(m, "action-focused", "visual"); const f = path.join(a, p.artifact.path.replace(/\.png$/, ".visual.json")); const d = JSON.parse(fs.readFileSync(f)); delete d.capture_session.source; writeJson(f, d); } },
  { expect: "evidence_dom_schema_invalid", name: "dom_session_source_missing", mutate: (m, a) => { mutateJsonArtifact(m, a, "action-focused", "dom", (d) => { delete d.capture_session.source; }); } },
  { expect: "evidence_ax_schema_invalid", name: "ax_session_source_missing", mutate: (m, a) => { mutateJsonArtifact(m, a, "action-focused", "ax", (d) => { delete d.capture_session.source; }); } },
  { expect: "capture_session_receipt_mismatch", name: "isolated_session_replay", mutate: (_m, a) => { fs.copyFileSync(path.join(alternate.artifactRoot, "capture-session.json"), path.join(a, "capture-session.json")); } },
  { expect: "capture_session_missing", name: "receipt_missing", mutate: (m, a) => { fs.rmSync(path.join(a, "capture-session.json")); } },
  { expect: "capture_session_mismatch", name: "cross_session_artifact_mix", mutate: (m, a) => { const target = findPass(m, "action-focused", "dom"); const sourceManifest = JSON.parse(fs.readFileSync(alternate.manifest)); const source = findPass(sourceManifest, "action-focused", "dom"); fs.copyFileSync(path.join(alternate.artifactRoot, source.artifact.path), path.join(a, target.artifact.path)); refresh(target, a); } },
  { expect: "capture_session_mismatch", name: "visual_cross_session_replay", mutate: (m, a) => { const target = findPass(m, "action-focused", "visual"); const sourceManifest = JSON.parse(fs.readFileSync(alternate.manifest)); const source = findPass(sourceManifest, "action-focused", "visual"); fs.copyFileSync(path.join(alternate.artifactRoot, source.artifact.path), path.join(a, target.artifact.path)); fs.copyFileSync(path.join(alternate.artifactRoot, source.artifact.path.replace(/\.png$/, ".visual.json")), path.join(a, target.artifact.path.replace(/\.png$/, ".visual.json"))); refresh(target, a); } },
  { expect: "capture_session_mismatch", name: "artifact_revision_drift", mutate: (m, a) => { mutateJsonArtifact(m, a, "action-focused", "dom", (d) => { d.capture_session.revision = "0".repeat(40); }); } },
  { expect: "capture_session_mismatch", name: "artifact_environment_drift", mutate: (m, a) => { mutateJsonArtifact(m, a, "action-focused", "dom", (d) => { d.capture_session.environment.browser = "Different browser"; }); } },
  { expect: "capture_session_mismatch", name: "artifact_attempt_drift", mutate: (m, a) => { mutateJsonArtifact(m, a, "action-focused", "dom", (d) => { d.capture_session.attempt += 1; }); } },
  { expect: "capture_session_time_outside", name: "artifact_time_outside_session", mutate: (m, a) => { for (const channel of ["dom", "ax"]) { const p = mutateJsonArtifact(m, a, "action-focused", channel, (d) => { d.captured_at = "2000-01-01T00:00:00.000Z"; }); p.recorded_at = "2000-01-01T00:00:00.000Z"; } findPass(m, "action-focused", "visual").recorded_at = "2000-01-01T00:00:00.000Z"; } },
  { expect: "capture_session_time_outside", name: "completed_before_started", mutate: (m) => { m.session.completed_at = "2000-01-01T00:00:00.000Z"; m.recorded_at = m.session.completed_at; } },
  { expect: "at_evidence_unverified", name: "fake_at", mutate: (m) => { findPass(m, "action-focused", "ax").channel = "at"; } },
  { expect: "runtime_manifest_identity_mismatch", name: "run_identity_mismatch", mutate: (m) => { findPass(m, "action-focused", "dom").run.id = "different-run"; } },
  { expect: "capture_source_drift", name: "source_drift", mutate: (_m, _a, root) => { fs.appendFileSync(path.join(root, "profiles/editorial/tokens.dtcg.json"), "\n"); } },
];

const base = prepareCanonical();
const alternate = prepareCanonical();
const results = cases.map((testCase) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `stylegallery-state-artifacts-${testCase.name}-`));
  try {
    fs.cpSync(base.root, root, { recursive: true });
    const artifactRoot = path.join(root, "artifacts");
    const manifestFile = path.join(artifactRoot, "runtime-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestFile));
    testCase.mutate?.(manifest, artifactRoot, root);
    writeJson(manifestFile, manifest);
    const child = spawnSync(process.execPath, [validator, "--root", path.join(root, "profiles"), "--artifact-root", artifactRoot, "--runtime-manifest", manifestFile, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
    const output = JSON.parse(child.stdout);
    const actual = codes(output);
    const ok = testCase.valid ? child.status === 0 && output.ok === true : child.status !== 0 && output.ok === false && actual.includes(testCase.expect);
    return {
      actual: {
        codes: actual,
        ...(testCase.valid && !ok ? { findings: output.failures.slice(0, 10) } : {}),
        status: child.status,
      },
      expected: testCase.expect ?? "valid",
      name: testCase.name,
      ok,
    };
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

const closedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-state-artifacts-closed-"));
fs.cpSync(base.root, closedRoot, { recursive: true });
fs.writeFileSync(path.join(closedRoot, "artifacts/runtime/unmanifested.txt"), "rogue");
const closed = spawnSync(process.execPath, [finalizer, "--root", path.join(closedRoot, "profiles"), "--artifact-root", path.join(closedRoot, "artifacts"), "--json"], { cwd: repositoryRoot, encoding: "utf8" });
const closedOutput = JSON.parse(closed.stdout);
results.push({ actual: { codes: codes(closedOutput), status: closed.status }, expected: "runtime_artifact_unmanifested", name: "unmanifested_closed_set", ok: closed.status !== 0 && codes(closedOutput).includes("runtime_artifact_unmanifested") });
results.push({ actual: { codes: codes(closedOutput), status: closed.status }, expected: "capture_session_replay", name: "session_replay", ok: closed.status !== 0 && codes(closedOutput).includes("capture_session_replay") });
fs.rmSync(closedRoot, { force: true, recursive: true });

const revisionRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-state-revision-"));
try {
  const receiptFile = path.join(revisionRoot, "capture-session.json");
  const child = spawnSync(process.execPath, [creator, "--root", sourceProfiles, "--output", receiptFile, "--json"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, GITHUB_SHA: "0".repeat(40) },
  });
  const output = JSON.parse(child.stdout);
  results.push({
    actual: { codes: codes(output), receiptWritten: fs.existsSync(receiptFile), status: child.status },
    expected: "capture_revision_mismatch",
    name: "github_sha_mismatch",
    ok: child.status !== 0 && codes(output).includes("capture_revision_mismatch") && !fs.existsSync(receiptFile),
  });
} finally {
  fs.rmSync(revisionRoot, { force: true, recursive: true });
}
fs.rmSync(base.root, { force: true, recursive: true });
fs.rmSync(alternate.root, { force: true, recursive: true });

const failures = results.filter((result) => !result.ok).map((result) => `${result.name}:${result.expected}`);
const report = { adversarial: results.length - 1, failures, ok: failures.length === 0, results };
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
