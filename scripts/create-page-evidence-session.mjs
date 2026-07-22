#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addSchemaFindings,
  canonicalSourceManifest,
  compilePageEvidenceSchemas,
  dirtyRelevantSources,
  finding,
  gitIdentity,
  metadata,
  normalizeReference,
  PAGE_EVIDENCE_RECEIPT,
  readJsonFile,
  resolveContained,
} from "./page-evidence-contract.mjs";

const styleGalleryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = { artifactRoot: undefined, json: false, record: undefined, root: undefined };
const failures = [];

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") options.json = true;
  else if (["--artifact-root", "--record", "--root"].includes(argument)) {
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) failures.push(finding("argument_value_required", `${argument} requires a value`, "<cli>"));
    else {
      if (argument === "--artifact-root") options.artifactRoot = path.resolve(process.cwd(), value);
      if (argument === "--record") options.record = value;
      if (argument === "--root") options.root = path.resolve(process.cwd(), value);
      index += 1;
    }
  } else failures.push(finding("argument_unknown", `unsupported argument ${argument}`, "<cli>"));
}

for (const [name, value] of [["--root", options.root], ["--record", options.record], ["--artifact-root", options.artifactRoot]]) {
  if (!value) failures.push(finding("argument_value_required", `${name} is required`, "<cli>"));
}

let schemas;
try { schemas = compilePageEvidenceSchemas(path.join(styleGalleryRoot, "consumer-reference/schema")); }
catch (error) { failures.push(finding("page_evidence_schema_invalid", error instanceof Error ? error.message : String(error), "consumer-reference/schema")); }

let artifactReference;
if (options.root && options.artifactRoot) {
  artifactReference = normalizeReference(options.root, options.artifactRoot);
  if (!artifactReference) failures.push(finding("page_evidence_artifact_escape", "artifact root must be inside the consumer repository", options.artifactRoot));
  else {
    const resolved = resolveContained({ allowMissing: true, expectedType: "directory", prefix: "page_evidence_artifact", reference: artifactReference, root: options.root }, failures);
    if (resolved && fs.existsSync(resolved.file) && fs.readdirSync(resolved.file).length > 0) failures.push(finding("page_evidence_session_replay", "artifact root must be empty before session start", artifactReference));
  }
}

let record;
let recordReference;
if (options.root && options.record) {
  recordReference = normalizeReference(options.root, options.record);
  if (!recordReference) failures.push(finding("page_evidence_conformance_escape", "conformance record must be inside the consumer repository", options.record));
  else record = readJsonFile({ prefix: "page_evidence_conformance", reference: recordReference, root: options.root }, failures);
}

const consumer = record?.value?.consumer;
const sourcePaths = consumer?.relevant_sources;
const browserScenarios = Array.isArray(record?.value?.scenarios)
  ? record.value.scenarios.filter((scenario) => scenario?.evidence_method === "browser")
  : [];
if (!consumer || typeof consumer.repository !== "string" || !/^[a-f0-9]{40}$/.test(consumer.revision ?? "") || !Array.isArray(sourcePaths)) {
  failures.push(finding("page_evidence_conformance_invalid", "conformance record must declare consumer repository, revision, and relevant_sources", recordReference ?? "<conformance-record>"));
}
if (browserScenarios.length === 0) failures.push(finding("page_evidence_intent_missing", "conformance record must declare at least one browser scenario", recordReference ?? "<conformance-record>"));

const scenarioIds = browserScenarios.map((scenario) => scenario.id);
const sessionIds = new Set(browserScenarios.map((scenario) => scenario.session_id));
const runIds = new Set(browserScenarios.map((scenario) => scenario.run_id));
if (new Set(scenarioIds).size !== scenarioIds.length || scenarioIds.some((id) => typeof id !== "string")) failures.push(finding("page_evidence_intent_invalid", "browser scenario IDs must be unique strings", recordReference ?? "<conformance-record>"));
if (sessionIds.size !== 1 || runIds.size !== 1 || [...sessionIds, ...runIds].some((identity) => typeof identity !== "string" || identity.length === 0)) {
  failures.push(finding("page_evidence_intent_identity_mismatch", "all page scenarios must use one nonempty session and run identity", recordReference ?? "<conformance-record>"));
}

const git = options.root ? gitIdentity(options.root, failures) : undefined;
if (git && consumer) {
  if (git.revision !== consumer.revision || (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== git.revision)) failures.push(finding("page_evidence_revision_mismatch", "conformance revision must equal checked-out Git HEAD", recordReference));
  if (git.repository && git.repository !== consumer.repository) failures.push(finding("page_evidence_repository_mismatch", "conformance repository differs from the Git remote identity", recordReference));
}

let source;
if (options.root && Array.isArray(sourcePaths)) {
  source = canonicalSourceManifest(options.root, sourcePaths, failures);
  if (source) {
    const dirty = dirtyRelevantSources(options.root, sourcePaths);
    if (dirty.length > 0) failures.push(finding("page_evidence_source_dirty", `relevant sources must be clean tracked files: ${dirty.join(", ")}`, options.root));
    if (browserScenarios.some((scenario) => scenario.source_digest !== source.sha256)) failures.push(finding("page_evidence_source_mismatch", "browser scenario source_digest must equal the relevant-source aggregate", recordReference));
  }
}

const receipt = record && source && git && sessionIds.size === 1 && runIds.size === 1 ? {
  attempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? 1),
  branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || git.branch,
  conformance_record: metadata(record.bytes, "application/json", recordReference),
  environment: {
    kind: "browser_evidence",
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    producer: "stylegallery_page_evidence",
  },
  intended_scenario_ids: scenarioIds,
  nonce: crypto.randomBytes(32).toString("hex"),
  record_kind: "page_evidence_session",
  repository: consumer.repository,
  revision: consumer.revision,
  run_id: [...runIds][0],
  schema_version: "1.0",
  session_id: [...sessionIds][0],
  source,
  started_at: new Date().toISOString(),
} : undefined;
if (receipt && schemas) addSchemaFindings(schemas.session, receipt, PAGE_EVIDENCE_RECEIPT, "page_evidence_session_schema_invalid", failures);

const receiptFile = options.artifactRoot ? path.join(options.artifactRoot, PAGE_EVIDENCE_RECEIPT) : undefined;
if (failures.length === 0 && receiptFile) {
  fs.mkdirSync(options.artifactRoot, { recursive: true });
  fs.writeFileSync(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
}
const result = {
  failures,
  intendedScenarios: receipt?.intended_scenario_ids.length ?? 0,
  ok: failures.length === 0,
  receipt: receiptFile,
  sessionId: receipt?.session_id,
  sourceSha256: receipt?.source.sha256,
};
if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else if (result.ok) process.stdout.write(`created page evidence session ${result.sessionId}\n`);
else process.stderr.write(`${failures.map((issue) => `${issue.code}: ${issue.path}: ${issue.message}`).join("\n")}\n`);
if (!result.ok) process.exitCode = 1;
