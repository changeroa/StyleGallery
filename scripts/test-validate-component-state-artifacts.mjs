#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { artifactMetadata } from "./artifact-metadata.mjs";
import { captureSourcePaths, relevantSourceFiles, sessionLink, sha256, verifySourceManifest } from "./capture-session-contract.mjs";
import { makePng, syntheticImage } from "./component-state-artifact-fixture.mjs";
import { EvidenceCaptureError, resolveEvidenceCapture } from "./evidence-capture-contract.mjs";
import { resolveProfileRecords } from "./profile-record-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(repositoryRoot, "consumer-reference/fixtures/component-evidence-v1");
const sourceProfiles = path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local");
const validator = path.join(repositoryRoot, "scripts/validate-component-state.mjs");
const finalizer = path.join(repositoryRoot, "scripts/finalize-component-state-evidence.mjs");
const captureDirectory = "design-engineering/reference-profiles/governed-local/captures";

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

function isolatedAuthoringRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-authoring-repository-"));
  for (const reference of captureSourcePaths) {
    const target = path.join(root, reference);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(repositoryRoot, reference), target);
  }
  fs.symlinkSync(path.join(repositoryRoot, "node_modules"), path.join(root, "node_modules"));
  const git = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
  let result = git("init", "--quiet");
  if (result.status !== 0) throw new Error(`isolated git init failed: ${result.stderr}`);
  result = git("config", "user.name", "Source Contract");
  if (result.status !== 0) throw new Error(`isolated git config failed: ${result.stderr}`);
  result = git("config", "user.email", "source-contract@example.invalid");
  if (result.status !== 0) throw new Error(`isolated git config failed: ${result.stderr}`);
  result = git("add", "--", ...captureSourcePaths);
  if (result.status !== 0) throw new Error(`isolated git add failed: ${result.stderr}`);
  result = git("commit", "--quiet", "-m", "isolated current authoring sources");
  if (result.status !== 0) throw new Error(`isolated git commit failed: ${result.stderr}`);
  return { creator: path.join(root, "scripts/create-component-state-session.mjs"), root };
}

function commitHistoricalInventoryFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-historical-inventory-"));
  const profileRoot = path.join(root, "profiles");
  const git = (...args) => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    if (result.status !== 0) throw new Error(`historical inventory Git command failed: ${result.stderr}`);
    return result.stdout.trim();
  };
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(profileRoot, "archived"), { recursive: true });
  fs.writeFileSync(path.join(root, "historical-extra.txt"), "historical bytes\n");
  fs.writeFileSync(path.join(root, "scripts/capture-session-contract.mjs"), [
    "export const captureSourcePaths = Object.freeze([",
    '  "historical-extra.txt",',
    '  "scripts/capture-session-contract.mjs",',
    "]);",
    "",
  ].join("\n"));
  writeJson(path.join(profileRoot, "archived/profile.json"), {
    component_records: [], fixture_records: [], local_foundations: "local.json", state_records: [], tokens: "tokens.json",
  });
  writeJson(path.join(profileRoot, "archived/local.json"), { historical: true });
  writeJson(path.join(profileRoot, "archived/tokens.json"), { historical: true });
  git("init", "--quiet");
  git("config", "user.name", "Historical Inventory");
  git("config", "user.email", "historical-inventory@example.invalid");
  git("add", ".");
  git("commit", "--quiet", "-m", "historical inventory");
  const revision = git("rev-parse", "HEAD");
  const repositoryPaths = [
    "historical-extra.txt",
    "profiles/archived/local.json",
    "profiles/archived/profile.json",
    "profiles/archived/tokens.json",
    "scripts/capture-session-contract.mjs",
  ];
  const files = repositoryPaths.map((repositoryPath) => {
    const bytes = fs.readFileSync(path.join(root, repositoryPath));
    return { byte_length: bytes.length, path: repositoryPath, sha256: sha256(bytes) };
  }).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const source = { files, sha256: sha256(Buffer.from(JSON.stringify(files))) };
  fs.writeFileSync(path.join(root, "historical-extra.txt"), "new head bytes\n");
  fs.writeFileSync(path.join(root, "scripts/capture-session-contract.mjs"), 'export const captureSourcePaths = Object.freeze(["new-head-only.txt"]);\n');
  fs.writeFileSync(path.join(root, "new-head-only.txt"), "new head\n");
  git("add", ".");
  git("commit", "--quiet", "-m", "replace inventory");
  return { profileRoot, revision, root, source };
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
  const isolatedRepository = isolatedAuthoringRepository();
  const created = spawnSync(process.execPath, [isolatedRepository.creator, "--root", profileRoot, "--output", receiptFile, "--json"], { cwd: isolatedRepository.root, encoding: "utf8" });
  fs.rmSync(isolatedRepository.root, { force: true, recursive: true });
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
  { expect: "capture_session_receipt_mismatch", name: "receipt_tamper", mutate: (_m, a) => { const f = path.join(a, "capture-session.json"); const r = JSON.parse(fs.readFileSync(f)); r.nonce = "0".repeat(64); writeJson(f, r); } },
  { expect: "capture_session_schema_invalid", name: "receipt_source_missing", mutate: (_m, a) => { const f = path.join(a, "capture-session.json"); const r = JSON.parse(fs.readFileSync(f)); delete r.source; writeJson(f, r); } },
  { expect: "runtime_manifest_schema_invalid", name: "completed_session_source_missing", mutate: (m) => { delete m.session.source; } },
  { expect: "evidence_visual_schema_invalid", name: "visual_session_source_missing", mutate: (m, a) => { const p = findPass(m, "action-focused", "visual"); const f = path.join(a, p.artifact.path.replace(/\.png$/, ".visual.json")); const d = JSON.parse(fs.readFileSync(f)); delete d.capture_session.source; writeJson(f, d); } },
  { expect: "evidence_dom_schema_invalid", name: "dom_session_source_missing", mutate: (m, a) => { mutateJsonArtifact(m, a, "action-focused", "dom", (d) => { delete d.capture_session.source; }); } },
  { expect: "evidence_ax_schema_invalid", name: "ax_session_source_missing", mutate: (m, a) => { mutateJsonArtifact(m, a, "action-focused", "ax", (d) => { delete d.capture_session.source; }); } },
  { expect: "capture_session_receipt_mismatch", name: "isolated_session_replay", mutate: (_m, a) => { fs.copyFileSync(path.join(alternate.artifactRoot, "capture-session.json"), path.join(a, "capture-session.json")); } },
  { expect: "capture_session_missing", name: "receipt_missing", mutate: (_m, a) => { fs.rmSync(path.join(a, "capture-session.json")); } },
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

const captureNames = fs.readdirSync(path.join(repositoryRoot, captureDirectory)).filter((name) => name.endsWith(".capture.json")).sort();
assert.equal(captureNames.length, 1, "exactly one Commit-A capture fixture must exist");
const recordedCapturePath = path.join(repositoryRoot, captureDirectory, captureNames[0]);
const recordedCapture = JSON.parse(fs.readFileSync(recordedCapturePath, "utf8"));
const omittedFiles = recordedCapture.session.source.files.filter((entry) => entry.path !== "package.json");
const omittedSource = { files: omittedFiles, sha256: sha256(Buffer.from(JSON.stringify(omittedFiles))) };
const omittedResult = verifySourceManifest(omittedSource, repositoryRoot, sourceProfiles, {
  mode: "recorded-revision",
  revision: recordedCapture.session.revision,
});
results.push({
  actual: omittedResult.code,
  expected: "source_inventory_mismatch",
  name: "recorded_revision_source_inventory_closed_set",
  ok: omittedResult.ok === false && omittedResult.code === "source_inventory_mismatch",
});

const rogueGitRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-rogue-git-"));
const rogueGitDirectory = path.join(rogueGitRoot, "objects.git");
const rogueObjectDirectory = path.join(rogueGitRoot, "objects");
fs.mkdirSync(rogueObjectDirectory);
const rogueInit = spawnSync("git", ["init", "--bare", "--quiet", rogueGitDirectory], { encoding: "utf8" });
assert.equal(rogueInit.status, 0, `rogue Git fixture init failed: ${rogueInit.stderr}`);
const hostileGit = {
  GIT_ALTERNATE_OBJECT_DIRECTORIES: rogueObjectDirectory,
  GIT_COMMON_DIR: rogueGitDirectory,
  GIT_CONFIG_COUNT: "1",
  GIT_CONFIG_KEY_0: "core.worktree",
  GIT_CONFIG_VALUE_0: rogueGitRoot,
  GIT_DIR: rogueGitDirectory,
  GIT_INDEX_FILE: path.join(rogueGitRoot, "index"),
  GIT_OBJECT_DIRECTORY: rogueObjectDirectory,
  GIT_WORK_TREE: rogueGitRoot,
};
const previousGit = Object.fromEntries(Object.keys(hostileGit).map((key) => [key, process.env[key]]));
Object.assign(process.env, hostileGit);
const hostileResult = verifySourceManifest(recordedCapture.session.source, repositoryRoot, sourceProfiles, {
  mode: "recorded-revision",
  revision: recordedCapture.session.revision,
});
for (const [key, value] of Object.entries(previousGit)) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
fs.rmSync(rogueGitRoot, { force: true, recursive: true });
results.push({
  actual: hostileResult,
  expected: "authenticated recorded revision despite hostile Git environment",
  name: "recorded_revision_ignores_repository_redirect_environment",
  ok: hostileResult.ok === true && hostileResult.revision === recordedCapture.session.revision,
});

const historical = commitHistoricalInventoryFixture();
try {
  const historicalResult = verifySourceManifest(historical.source, historical.root, historical.profileRoot, {
    mode: "recorded-revision",
    revision: historical.revision,
  });
  results.push({
    actual: historicalResult,
    expected: "historical inventory authenticated from recorded revision",
    name: "recorded_revision_derives_historical_inventory",
    ok: historicalResult.ok === true && historicalResult.revision === historical.revision,
  });
} finally {
  fs.rmSync(historical.root, { force: true, recursive: true });
}

const noGitRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-recorded-capture-no-git-"));
try {
  const relativeCapture = path.posix.join(captureDirectory, captureNames[0]);
  const copiedCapture = path.join(noGitRoot, relativeCapture);
  fs.mkdirSync(path.dirname(copiedCapture), { recursive: true });
  fs.copyFileSync(recordedCapturePath, copiedCapture);
  const bytes = fs.readFileSync(copiedCapture);
  let error;
  try {
    resolveEvidenceCapture({
      reference: { byte_length: bytes.length, path: relativeCapture, sha256: sha256(bytes) },
      repositoryRoot: noGitRoot,
      sourceValidationMode: "recorded-revision",
    });
  } catch (caught) {
    error = caught;
  }
  results.push({
    actual: error instanceof EvidenceCaptureError ? error.code : String(error),
    expected: "capture_source_drift",
    name: "recorded_revision_without_git_fails_closed",
    ok: error instanceof EvidenceCaptureError && error.code === "capture_source_drift" && !error.message.includes(noGitRoot),
  });
} finally {
  fs.rmSync(noGitRoot, { force: true, recursive: true });
}

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
  const isolatedRepository = isolatedAuthoringRepository();
  const child = spawnSync(process.execPath, [isolatedRepository.creator, "--root", sourceProfiles, "--output", receiptFile, "--json"], {
    cwd: isolatedRepository.root,
    encoding: "utf8",
    env: { ...process.env, GITHUB_SHA: "0".repeat(40) },
  });
  fs.rmSync(isolatedRepository.root, { force: true, recursive: true });
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
