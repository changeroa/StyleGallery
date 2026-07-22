import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { canonicalSourceManifest, digest } from "../../../scripts/page-evidence-contract.mjs";
import {
  cleanupFixture,
  finalizeSession,
  initializeConsumer,
  startSession,
  writeJson,
  writeRunner,
} from "../../../scripts/page-evidence-fixture.mjs";

const styleGalleryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const validator = path.join(styleGalleryRoot, "scripts", "validate-consumer-conformance.mjs");

function runValidator(root, record, { artifactRoot, priorManifest } = {}) {
  const args = [validator, "--root", root, "--record", record];
  if (artifactRoot) args.push("--artifact-root", artifactRoot);
  if (priorManifest) args.push("--prior-manifest", priorManifest);
  args.push("--json");
  const child = spawnSync(process.execPath, args, { cwd: styleGalleryRoot, encoding: "utf8" });
  let output;
  try { output = JSON.parse(child.stdout); }
  catch { output = { failures: [], parse_error: child.stderr || child.stdout }; }
  return { output, status: child.status };
}

function codes(child) {
  return child?.report?.failures?.map((entry) => entry.code)
    ?? child?.output?.failures?.map((entry) => entry.code)
    ?? [];
}

function outcome(name, expected, child, observe = {}) {
  const actualCodes = codes(child);
  const childOk = expected === "ok:true"
    ? child?.status === 0 && (child.report?.ok === true || child.output?.ok === true)
    : child?.status !== 0 && actualCodes.includes(expected);
  const ok = childOk && !Object.values(observe).includes(false);
  return { actual: { codes: actualCodes, status: child?.status, ...observe }, expected, name, ok };
}

function sourceManifest(fixture) {
  const failures = [];
  const source = canonicalSourceManifest(fixture.root, fixture.relevantSources, failures);
  if (!source || failures.length > 0) throw new Error(`source fixture failed: ${JSON.stringify(failures)}`);
  return source;
}

function createSession(fixture, template, options = {}) {
  const artifactName = options.artifactName ?? "migration";
  const scenarioId = options.scenarioId ?? "migration-round-trip";
  const session = {
    artifactRoot: path.join(fixture.root, "evidence", artifactName),
    handoffFile: path.join(fixture.root, "records", `${artifactName}-handoff.json`),
    recordFile: path.join(fixture.root, "records", `${artifactName}.json`),
    runId: options.runId ?? `run-${artifactName}`,
    scenarioId,
    sessionId: options.sessionId ?? `session-${artifactName}`,
  };
  const value = structuredClone(template);
  const styleGalleryRevision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: styleGalleryRoot, encoding: "utf8" }).trim();
  value.id = `${artifactName}-migration`;
  value.consumer = { relevant_sources: fixture.relevantSources, repository: fixture.repository, revision: fixture.revision };
  value.page_evidence = { manifest: `evidence/${artifactName}/page-evidence-manifest.json`, status: "applicable" };
  value.scenarios[0] = {
    ...value.scenarios[0],
    argv: ["node", "tests/page.spec.js"],
    evidence_method: "browser",
    id: scenarioId,
    result_artifact: `evidence/${artifactName}/runner/${scenarioId}.json`,
    run_id: session.runId,
    session_id: session.sessionId,
    source_digest: sourceManifest(fixture).sha256,
  };
  for (const dimension of Object.values(value.migration_dimensions)) if (dimension.status === "applicable") dimension.scenario_ids = [scenarioId];
  for (const mapping of value.adoption_mappings) {
    mapping.scenario_ids = [scenarioId];
    mapping.stylegallery.revision = styleGalleryRevision;
  }
  options.mutateRecord?.(value);
  writeJson(session.recordFile, value);
  writeJson(session.handoffFile, { consumer_conformance_record: `records/${artifactName}.json`, consumer_migration_readiness: "declared" });
  return session;
}

function startedSession(fixture, template, options) {
  const session = createSession(fixture, template, options);
  const start = startSession(fixture, session);
  if (start.status !== 0) throw new Error(`session start failed: ${JSON.stringify(start.report)}`);
  return session;
}

function isolated(template, run) {
  const fixture = initializeConsumer();
  try { return run(fixture, template); }
  finally { cleanupFixture(fixture); }
}

export function initializeCompletedConsumer(template) {
  const fixture = initializeConsumer();
  try {
    const session = startedSession(fixture, template);
    const finalized = finalizeSession(fixture, session, writeRunner(fixture, session));
    if (finalized.status !== 0) throw new Error(`session finalize failed: ${JSON.stringify(finalized.report)}`);
    return { ...fixture, artifactRoot: session.artifactRoot, recordReference: "records/migration.json" };
  } catch (error) {
    cleanupFixture(fixture);
    throw error;
  }
}

export function cleanupCompletedConsumer(fixture) {
  cleanupFixture(fixture);
}

function mutatedCompletedPacket(template, { caseName, expected, mutateRecord }) {
  return isolated(template, (fixture, source) => {
    const session = startedSession(fixture, source, { artifactName: caseName });
    const finalized = finalizeSession(fixture, session, writeRunner(fixture, session));
    if (finalized.status !== 0) throw new Error(`session finalize failed: ${JSON.stringify(finalized.report)}`);
    const value = JSON.parse(fs.readFileSync(session.recordFile, "utf8"));
    mutateRecord(value);
    writeJson(session.recordFile, value);
    return outcome(caseName, expected, runValidator(fixture.root, `records/${caseName}.json`, { artifactRoot: session.artifactRoot }));
  });
}

const cases = {
  "end-to-end-consumer": (template) => isolated(template, (fixture, source) => {
    const session = startedSession(fixture, source);
    const finalized = finalizeSession(fixture, session, writeRunner(fixture, session));
    if (finalized.status !== 0) throw new Error(`session finalize failed: ${JSON.stringify(finalized.report)}`);
    const handoff = JSON.parse(fs.readFileSync(session.handoffFile, "utf8"));
    const child = runValidator(fixture.root, handoff.consumer_conformance_record, { artifactRoot: session.artifactRoot });
    return outcome("end-to-end-consumer", "ok:true", child, {
      artifactRootOutsideStyleGallery: !session.artifactRoot.startsWith(styleGalleryRoot),
      checkedDimensions: child.output.checkedDimensions,
      checkedMappings: child.output.checkedMappings,
      checkedPageArtifacts: child.output.checkedPageArtifacts,
      checkedPageScenarios: child.output.checkedPageScenarios,
      handoffLinked: handoff.consumer_migration_readiness === "declared" && handoff.consumer_conformance_record === "records/migration.json",
      pageSessionId: child.output.pageSessionId,
    });
  }),
  "missing-mapping": (template) => isolated(template, (fixture, source) => {
    const session = startedSession(fixture, source, { mutateRecord: (value) => {
      const unit = { ...value.scenarios[0], evidence_method: "unit", id: "unit-migration", result_artifact: "evidence/results/unit-migration.json" };
      value.scenarios.push(unit);
      value.adoption_mappings[0].scenario_ids = [unit.id];
    } });
    const finalized = finalizeSession(fixture, session, writeRunner(fixture, session));
    if (finalized.status !== 0) throw new Error(`session finalize failed: ${JSON.stringify(finalized.report)}`);
    return outcome("missing-mapping", "page_evidence_adoption_mapping_missing", runValidator(fixture.root, "records/migration.json", { artifactRoot: session.artifactRoot }));
  }),
  "applicable-without-runtime": (template) => isolated(template, (fixture, source) => {
    const session = createSession(fixture, source, { mutateRecord: (value) => { value.scenarios[0].evidence_method = "unit"; } });
    fs.mkdirSync(session.artifactRoot, { recursive: true });
    return outcome("applicable-without-runtime", "page_evidence_runtime_scenario_required", runValidator(fixture.root, "records/migration.json", { artifactRoot: session.artifactRoot }));
  }),
  "dirty-source": (template) => isolated(template, (fixture, source) => {
    const session = createSession(fixture, source);
    fs.appendFileSync(path.join(fixture.root, fixture.relevantSources[0]), "// dirty\n");
    return outcome("dirty-source", "page_evidence_source_dirty", startSession(fixture, session));
  }),
  "failed-runner": (template) => isolated(template, (fixture, source) => {
    const session = startedSession(fixture, source);
    return outcome("failed-runner", "page_evidence_runner_failed", finalizeSession(fixture, session, writeRunner(fixture, session, { status: "failed" })));
  }),
  "cross-session-reuse": (template) => isolated(template, (fixture, source) => {
    const target = startedSession(fixture, source, { artifactName: "target" });
    const alternate = startedSession(fixture, source, { artifactName: "alternate" });
    const targetRunner = writeRunner(fixture, target);
    const alternateRunner = writeRunner(fixture, alternate);
    fs.copyFileSync(alternateRunner.runnerFile, targetRunner.runnerFile);
    fs.copyFileSync(path.join(alternate.artifactRoot, alternateRunner.artifactReference), path.join(target.artifactRoot, targetRunner.artifactReference));
    return outcome("cross-session-reuse", "page_evidence_session_mismatch", finalizeSession(fixture, target, targetRunner));
  }),
  "unmanifested-artifact": (template) => isolated(template, (fixture, source) => {
    const session = startedSession(fixture, source);
    const runner = writeRunner(fixture, session);
    fs.writeFileSync(path.join(session.artifactRoot, "rogue.png"), "rogue");
    return outcome("unmanifested-artifact", "page_evidence_artifact_unmanifested", finalizeSession(fixture, session, runner));
  }),
  "reuse-source-drift": (template) => isolated(template, (fixture, source) => {
    const prior = startedSession(fixture, source, { artifactName: "prior" });
    const priorFinalized = finalizeSession(fixture, prior, writeRunner(fixture, prior));
    if (priorFinalized.status !== 0) throw new Error(`prior finalize failed: ${JSON.stringify(priorFinalized.report)}`);
    fs.appendFileSync(path.join(fixture.root, fixture.relevantSources[0]), "// next revision\n");
    execFileSync("git", ["add", fixture.relevantSources[0]], { cwd: fixture.root });
    execFileSync("git", ["commit", "-m", "next fixture revision"], { cwd: fixture.root, stdio: "ignore" });
    fixture.revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: fixture.root, encoding: "utf8" }).trim();
    const current = startedSession(fixture, source, { artifactName: "current" });
    const priorManifest = path.join(prior.artifactRoot, "page-evidence-manifest.json");
    const evidence = {
      kind: "reused",
      prior_manifest_sha256: digest(fs.readFileSync(priorManifest)),
      prior_run_id: prior.runId,
      prior_scenario_id: prior.scenarioId,
      prior_session_id: prior.sessionId,
    };
    const runner = writeRunner(fixture, current, { evidence, writeArtifact: false });
    return outcome("reuse-source-drift", "page_evidence_reuse_source_mismatch", finalizeSession(fixture, current, runner, priorManifest));
  }),
  "source-set-mismatch": (template) => mutatedCompletedPacket(template, {
    caseName: "source-set-mismatch",
    expected: "page_evidence_source_set_mismatch",
    mutateRecord: (value) => { value.consumer.relevant_sources = value.consumer.relevant_sources.slice(0, 1); },
  }),
  "repository-mismatch": (template) => mutatedCompletedPacket(template, {
    caseName: "repository-mismatch",
    expected: "page_evidence_repository_mismatch",
    mutateRecord: (value) => { value.consumer.repository = "other/consumer"; },
  }),
  "revision-mismatch": (template) => mutatedCompletedPacket(template, {
    caseName: "revision-mismatch",
    expected: "page_evidence_revision_mismatch",
    mutateRecord: (value) => { value.consumer.revision = "0".repeat(40); },
  }),
  "source-digest-mismatch": (template) => mutatedCompletedPacket(template, {
    caseName: "source-digest-mismatch",
    expected: "page_evidence_source_mismatch",
    mutateRecord: (value) => { value.scenarios[0].source_digest = "0".repeat(64); },
  }),
  "intent-scenario-mismatch": (template) => mutatedCompletedPacket(template, {
    caseName: "intent-scenario-mismatch",
    expected: "page_evidence_intent_scenario_mismatch",
    mutateRecord: (value) => {
      const additional = { ...value.scenarios[0], id: "secondary-browser", result_artifact: "evidence/intent-scenario-mismatch/runner/secondary-browser.json" };
      value.scenarios.push(additional);
      value.migration_dimensions.route_parity.scenario_ids.push(additional.id);
      value.adoption_mappings[0].scenario_ids.push(additional.id);
    },
  }),
  "review-by-missing": (template) => isolated(template, (fixture, source) => {
    const session = startedSession(fixture, source, { artifactName: "review-by-missing" });
    const finalized = finalizeSession(fixture, session, writeRunner(fixture, session));
    if (finalized.status !== 0) throw new Error(`session finalize failed: ${JSON.stringify(finalized.report)}`);
    const manifestFile = path.join(session.artifactRoot, "page-evidence-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    delete manifest.review_by;
    writeJson(manifestFile, manifest);
    return outcome("review-by-missing", "page_evidence_manifest_schema_invalid", runValidator(fixture.root, "records/review-by-missing.json", { artifactRoot: session.artifactRoot }));
  }),
  "manifest-network-url": (template) => isolated(template, (fixture, source) => {
    const session = createSession(fixture, source, { artifactName: "manifest-network-url", mutateRecord: (value) => {
      value.page_evidence.manifest = "https://example.com/page-evidence-manifest.json";
    } });
    fs.mkdirSync(session.artifactRoot, { recursive: true });
    const child = runValidator(fixture.root, "records/manifest-network-url.json", { artifactRoot: session.artifactRoot });
    return outcome("manifest-network-url", "consumer_conformance_schema_invalid", child, {
      noRuntimeExecution: child.output.checkedRuntimeCommands === 0,
    });
  }),
  "manifest-symlink": (template) => isolated(template, (fixture, source) => {
    const session = startedSession(fixture, source, { artifactName: "manifest-symlink" });
    const finalized = finalizeSession(fixture, session, writeRunner(fixture, session));
    if (finalized.status !== 0) throw new Error(`session finalize failed: ${JSON.stringify(finalized.report)}`);
    const manifest = path.join(session.artifactRoot, "page-evidence-manifest.json");
    const redirected = path.join(session.artifactRoot, "redirected-manifest.json");
    fs.renameSync(manifest, redirected);
    fs.symlinkSync(redirected, manifest);
    return outcome("manifest-symlink", "page_evidence_manifest_symlink", runValidator(fixture.root, "records/manifest-symlink.json", { artifactRoot: session.artifactRoot }));
  }),
  "artifact-root-redirect": (template) => isolated(template, (fixture, source) => {
    const session = startedSession(fixture, source, { artifactName: "artifact-root-redirect" });
    const finalized = finalizeSession(fixture, session, writeRunner(fixture, session));
    if (finalized.status !== 0) throw new Error(`session finalize failed: ${JSON.stringify(finalized.report)}`);
    const redirected = `${session.artifactRoot}-redirected`;
    fs.renameSync(session.artifactRoot, redirected);
    fs.symlinkSync(redirected, session.artifactRoot);
    return outcome("artifact-root-redirect", "page_evidence_artifact_symlink", runValidator(fixture.root, "records/artifact-root-redirect.json", { artifactRoot: session.artifactRoot }));
  }),
};

export const endToEndCaseNames = Object.freeze(Object.keys(cases));

export function runEndToEndCase(name, template) {
  return cases[name](template);
}
