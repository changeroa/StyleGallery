import fs from "node:fs";
import path from "node:path";
import { artifactMetadata } from "./artifact-metadata.mjs";
import { sameJson, withinSession } from "./capture-session-contract.mjs";
import { parseStrictJson } from "./strict-json.mjs";

function finding(code, file, message) {
  return { code, message, path: file };
}

function isInside(base, target) {
  const relative = path.relative(base, target);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function isSafeArtifactPath(reference) {
  return typeof reference === "string"
    && reference.length > 0
    && !path.posix.isAbsolute(reference)
    && !path.win32.isAbsolute(reference)
    && !reference.includes("\\")
    && !reference.includes("?")
    && !reference.includes("#")
    && !/^[A-Za-z][A-Za-z\d+.-]*:/.test(reference)
    && path.posix.normalize(reference) === reference
    && !reference.split("/").some((segment) => segment === "." || segment === "..");
}

function validateIntegrity(pass, bytes, evidenceFile, failures) {
  const actual = artifactMetadata(bytes, pass.artifact.media_type);
  if (actual.sha256 !== pass.artifact.sha256 || actual.byte_length !== pass.artifact.byte_length) failures.push(finding("evidence_artifact_integrity", evidenceFile, `${pass.id} hash or byte length does not match`));
  if (pass.channel === "visual") {
    if (!actual.width || !actual.height) failures.push(finding("evidence_png_invalid", evidenceFile, `${pass.id} is not a valid PNG with IHDR dimensions`));
    else if (actual.width !== pass.artifact.width || actual.height !== pass.artifact.height) failures.push(finding("evidence_png_dimensions_mismatch", evidenceFile, `${pass.id} PNG dimensions do not match`));
  }
  return actual;
}

function observedDomValue(document, key) {
  if (key === "active") return String(document.active);
  if (key === "role") return document.role;
  return document.attributes?.[key];
}

function validateDom(document, pass, scenario, fixture, profileId, evidenceFile, failures) {
  if (document.schema_version !== "1.0" || document.channel !== "dom" || document.profile_id !== profileId || document.scenario_id !== pass.scenario_id || document.semantic_mode !== scenario.semantic_mode) {
    failures.push(finding("evidence_dom_identity_mismatch", evidenceFile, `${pass.id} DOM identity does not match its pass`));
  }
  if (document.activation_key !== fixture.activation_key) failures.push(finding("evidence_runtime_identity_mismatch", evidenceFile, `${pass.id} activation key differs from the canonical fixture`));
  for (const [key, expected] of Object.entries(scenario.expected.dom)) if (observedDomValue(document, key) !== expected) failures.push(finding("evidence_dom_content_mismatch", evidenceFile, `${pass.id} DOM ${key} differs from canonical state`));
  const visual = JSON.stringify([...(document.visual_states ?? [])].sort());
  if (visual !== JSON.stringify([...scenario.expected.visual].sort())) failures.push(finding("evidence_dom_content_mismatch", evidenceFile, `${pass.id} visual states differ from canonical state`));
  const expectedActivations = scenario.expected.activation === "allowed" ? 1 : 0;
  if (document.activation_count !== expectedActivations) failures.push(finding("evidence_dom_content_mismatch", evidenceFile, `${pass.id} activation result differs from canonical state`));
}

function validateAx(document, pass, scenario, fixture, profileId, evidenceFile, failures) {
  if (document.schema_version !== "1.0" || document.channel !== "ax" || document.profile_id !== profileId || document.scenario_id !== pass.scenario_id || document.semantic_mode !== scenario.semantic_mode || document.name !== fixture.label) {
    failures.push(finding("evidence_ax_identity_mismatch", evidenceFile, `${pass.id} AX identity does not match its pass`));
  }
  if (document.role !== scenario.expected.ax.role) failures.push(finding("evidence_ax_content_mismatch", evidenceFile, `${pass.id} AX role differs from canonical state`));
  for (const [key, expected] of Object.entries(scenario.expected.ax)) {
    const actual = key === "role" ? document.role : document.properties?.[key];
    if (actual !== expected) failures.push(finding("evidence_ax_content_mismatch", evidenceFile, `${pass.id} AX ${key} differs from canonical state`));
  }
}

function validateVisual(document, pass, scenario, profileId, actual, evidenceFile, failures) {
  if (document.schema_version !== "1.0" || document.channel !== "visual" || document.profile_id !== profileId || document.scenario_id !== pass.scenario_id || document.semantic_mode !== scenario.semantic_mode) {
    failures.push(finding("evidence_visual_identity_mismatch", evidenceFile, `${pass.id} visual identity does not match its pass`));
  }
  if (document.source_sha256 !== pass.session?.source?.sha256) failures.push(finding("capture_source_mismatch", evidenceFile, `${pass.id} visual source digest differs from its capture session`));
  const expectedImage = { path: path.posix.basename(pass.artifact.path), ...actual };
  if (!sameJson(document.image, expectedImage)) failures.push(finding("evidence_visual_image_mismatch", evidenceFile, `${pass.id} visual metadata does not match its PNG`));
}

function parseArtifactJson(bytes, pass, scenario, fixture, profileId, evidenceFile, failures, schemas, session) {
  let document;
  try {
    document = parseStrictJson(bytes.toString("utf8"));
  } catch (error) {
    failures.push(finding("evidence_json_invalid", evidenceFile, `${pass.id} is not structured JSON: ${error instanceof Error ? error.message : String(error)}`));
    return undefined;
  }
  const validate = pass.channel === "dom" ? schemas.dom : pass.channel === "ax" ? schemas.ax : undefined;
  if (validate && !validate(document)) {
    const code = pass.channel === "dom" ? "evidence_dom_schema_invalid" : "evidence_ax_schema_invalid";
    for (const error of validate.errors ?? []) failures.push(finding(code, evidenceFile, `${pass.id} ${error.instancePath || "/"} ${error.message}`));
    return undefined;
  }
  if (!sameJson(document.capture_session, pass.session)) failures.push(finding("capture_session_mismatch", evidenceFile, `${pass.id} artifact session differs from its pass`));
  if (document.captured_at !== pass.recorded_at) failures.push(finding("evidence_recorded_at_mismatch", evidenceFile, `${pass.id} recorded_at is not derived from artifact content`));
  if (session && !withinSession(document.captured_at, session.started_at, session.completed_at)) failures.push(finding("capture_session_time_outside", evidenceFile, `${pass.id} was not captured within its session`));
  if (pass.channel === "dom") validateDom(document, pass, scenario, fixture, profileId, evidenceFile, failures);
  else if (pass.channel === "ax") validateAx(document, pass, scenario, fixture, profileId, evidenceFile, failures);
  else failures.push(finding("evidence_channel_content_unknown", evidenceFile, `${pass.id} has no structured content contract`));
  return document;
}

function readArtifact(pass, artifactRoot, evidenceFile, failures) {
  const reference = pass.artifact?.path;
  if (!isSafeArtifactPath(reference)) {
    failures.push(finding("evidence_artifact_escape", evidenceFile, `${pass.id} artifact path is unsafe`));
    return undefined;
  }
  const root = path.resolve(artifactRoot);
  const target = path.resolve(root, reference);
  if (!isInside(root, target) || !fs.existsSync(target)) {
    failures.push(finding("evidence_artifact_missing", evidenceFile, `${pass.id} artifact is missing`));
    return undefined;
  }
  const metadata = fs.lstatSync(target);
  if (metadata.isSymbolicLink()) {
    failures.push(finding("evidence_artifact_symlink", evidenceFile, `${pass.id} artifact must not be a symlink`));
    return undefined;
  }
  if (!metadata.isFile()) {
    failures.push(finding("evidence_artifact_type_invalid", evidenceFile, `${pass.id} artifact must be a regular file`));
    return undefined;
  }
  const realRoot = fs.realpathSync(root);
  const realTarget = fs.realpathSync(target);
  if (!isInside(realRoot, realTarget) || realTarget !== path.join(realRoot, reference)) {
    failures.push(finding("evidence_artifact_redirect", evidenceFile, `${pass.id} artifact resolves through a redirect`));
    return undefined;
  }
  return fs.readFileSync(realTarget);
}

function parseVisualMetadata(pass, artifactRoot, scenario, profileId, actual, evidenceFile, failures, schemas, session) {
  const reference = pass.artifact.path.replace(/\.png$/, ".visual.json");
  const bytes = readArtifact({ artifact: { path: reference }, id: `${pass.id}-metadata` }, artifactRoot, evidenceFile, failures);
  if (!bytes) return undefined;
  let document;
  try {
    document = parseStrictJson(bytes.toString("utf8"));
  } catch (error) {
    failures.push(finding("evidence_visual_json_invalid", evidenceFile, `${pass.id} visual metadata is not structured JSON: ${error instanceof Error ? error.message : String(error)}`));
    return undefined;
  }
  if (!schemas.visual(document)) {
    for (const error of schemas.visual.errors ?? []) failures.push(finding("evidence_visual_schema_invalid", evidenceFile, `${pass.id} ${error.instancePath || "/"} ${error.message}`));
    return undefined;
  }
  if (!sameJson(document.capture_session, pass.session)) failures.push(finding("capture_session_mismatch", evidenceFile, `${pass.id} visual metadata session differs from its pass`));
  if (document.captured_at !== pass.recorded_at) failures.push(finding("evidence_recorded_at_mismatch", evidenceFile, `${pass.id} recorded_at is not derived from visual metadata`));
  if (session && !withinSession(document.captured_at, session.started_at, session.completed_at)) failures.push(finding("capture_session_time_outside", evidenceFile, `${pass.id} visual metadata was not captured within its session`));
  validateVisual(document, pass, scenario, profileId, actual, evidenceFile, failures);
  return document;
}

export function validateEvidenceArtifacts({ artifactRoot, evidence, evidenceFile, fixture, profileId, schemas, session, states }) {
  const failures = [];
  const scenarios = new Map(states.scenarios.map((scenario) => [scenario.id, scenario]));
  const fixtures = new Map(fixture.scenarios.map((scenario) => [scenario.id, scenario]));
  const capturedTimes = new Map();
  for (const pass of evidence.passes ?? []) {
    const scenario = scenarios.get(pass.scenario_id);
    const runtimeFixture = fixtures.get(pass.scenario_id);
    if (!scenario || !runtimeFixture || !pass.artifact?.media_type) continue;
    const bytes = readArtifact(pass, artifactRoot, evidenceFile, failures);
    if (!bytes) continue;
    const actual = validateIntegrity(pass, bytes, evidenceFile, failures);
    if (pass.artifact.media_type === "application/json") {
      const document = parseArtifactJson(bytes, pass, scenario, runtimeFixture, profileId, evidenceFile, failures, schemas, session);
      if (document?.captured_at) {
        if (!capturedTimes.has(pass.scenario_id)) capturedTimes.set(pass.scenario_id, new Set());
        capturedTimes.get(pass.scenario_id).add(document.captured_at);
      }
    } else if (pass.channel === "visual") {
      const document = parseVisualMetadata(pass, artifactRoot, scenario, profileId, actual, evidenceFile, failures, schemas, session);
      if (document?.captured_at) {
        if (!capturedTimes.has(pass.scenario_id)) capturedTimes.set(pass.scenario_id, new Set());
        capturedTimes.get(pass.scenario_id).add(document.captured_at);
      }
    }
  }
  for (const [scenarioId, times] of capturedTimes) {
    if (times.size !== 1) failures.push(finding("capture_session_time_mismatch", evidenceFile, `${scenarioId} visual, DOM, and AX captured_at values differ`));
    const capturedAt = [...times][0];
    for (const pass of evidence.passes.filter((entry) => entry.scenario_id === scenarioId)) if (pass.recorded_at !== capturedAt) failures.push(finding("evidence_recorded_at_mismatch", evidenceFile, `${pass.id} recorded_at is not derived from its scenario artifacts`));
  }
  return failures;
}
