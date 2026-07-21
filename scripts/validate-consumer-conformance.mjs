#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import {
  MIGRATION_DIMENSIONS,
  consumerConformanceSchemaFindings,
  isNormalizedRepositoryPath,
  validateConsumerConformanceSemantics,
  validateConsumerPageEvidenceSemantics,
  validateConsumerPageIntentSemantics,
} from "./consumer-conformance-contract.mjs";
import { parseStrictJson } from "./strict-json.mjs";
import { addDateTimeFormat } from "./json-schema-formats.mjs";
import {
  addSchemaFindings,
  compilePageEvidenceSchemas,
  digest,
  gitIdentity,
  normalizeReference,
  PAGE_EVIDENCE_MANIFEST,
  readJsonFile,
  resolveContained,
} from "./page-evidence-contract.mjs";
import { MAX_ARTIFACT_FILE_BYTES } from "./page-artifact-metadata.mjs";

const styleGalleryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(styleGalleryRoot, "consumer-reference", "schema", "consumer-conformance-record.schema.json");
const pageSchemaRoot = path.join(styleGalleryRoot, "consumer-reference", "schema");
const pageValidator = path.join(styleGalleryRoot, "scripts", "validate-page-evidence.mjs");
const runtimeTimeout = Math.min(120_000, Math.max(100, Number.parseInt(process.env.STYLEGALLERY_RUNTIME_TIMEOUT_MS ?? "120000", 10) || 120_000));

function finding(code, message, recordPath) {
  return { code, message, path: recordPath };
}

function parseArguments(argv) {
  const options = { artifactRoot: undefined, json: false, priorManifest: undefined, record: undefined, root: process.cwd() };
  const failures = [];
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") options.json = true;
    else if (["--artifact-root", "--prior-manifest", "--record", "--root"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) failures.push(finding("argument_value_required", `${argument} requires a value`, "<cli>"));
      else {
        if (argument === "--artifact-root") options.artifactRoot = value;
        if (argument === "--prior-manifest") options.priorManifest = value;
        if (argument === "--record") options.record = value;
        if (argument === "--root") options.root = value;
        index += 1;
      }
    } else failures.push(finding("argument_unknown", `unsupported argument ${argument}`, "<cli>"));
  }
  if (!options.record) failures.push(finding("argument_value_required", "--record requires a normalized JSON path", "<cli>"));
  return { failures, options };
}

function containedRecord(rootArgument, recordArgument, failures) {
  const root = path.resolve(process.cwd(), rootArgument);
  if (!fs.existsSync(root) || !fs.lstatSync(root).isDirectory() || fs.realpathSync(root) !== root) {
    failures.push(finding("consumer_conformance_root_invalid", "consumer root must be a real directory without filesystem redirects", rootArgument));
    return undefined;
  }
  if (!isNormalizedRepositoryPath(recordArgument, { jsonOnly: true })) {
    failures.push(finding("consumer_conformance_record_path_invalid", "--record must be a normalized repository-relative JSON path", recordArgument));
    return undefined;
  }
  const resolved = path.resolve(root, recordArgument);
  const relative = path.relative(root, resolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || !fs.existsSync(resolved)) {
    failures.push(finding("consumer_conformance_record_path_invalid", "consumer conformance record must exist inside the consumer root", recordArgument));
    return undefined;
  }
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (fs.lstatSync(current).isSymbolicLink()) {
      failures.push(finding("consumer_conformance_record_path_invalid", "consumer conformance record must not traverse a symlink", recordArgument));
      return undefined;
    }
  }
  if (!fs.lstatSync(resolved).isFile() || fs.realpathSync(resolved) !== resolved) {
    failures.push(finding("consumer_conformance_record_path_invalid", "consumer conformance record must be a contained regular file", recordArgument));
    return undefined;
  }
  return { recordPath: relative.split(path.sep).join("/"), resolved, root };
}

function readStrictJson(file, code, displayPath, failures) {
  try {
    if (fs.lstatSync(file).size > MAX_ARTIFACT_FILE_BYTES) throw new Error(`file exceeds ${MAX_ARTIFACT_FILE_BYTES} bytes`);
    return parseStrictJson(fs.readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(finding(code, error instanceof Error ? error.message : String(error), displayPath));
    return undefined;
  }
}

function uniqueFindings(findings) {
  return [...new Map(findings.map((entry) => [`${entry.code}:${entry.path}:${entry.message}`, entry])).values()];
}

function runGit(root, args, encoding = "utf8") {
  return spawnSync("git", ["-c", `safe.directory=${path.resolve(root)}`, ...args], { cwd: root, encoding });
}

function firstFilesystemRedirect(root) {
  const pending = [root];
  while (pending.length > 0) {
    const directory = pending.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink()) return path.relative(root, target).split(path.sep).join("/");
      if (stat.isDirectory()) pending.push(target);
    }
  }
  return undefined;
}

function executePinnedScenario(root, revision, scenario, expectedResult, failures) {
  if (!Array.isArray(scenario?.argv) || scenario.argv.length === 0 || scenario.argv.some((argument) => typeof argument !== "string" || argument.length === 0)) return false;
  const [executable, ...args] = scenario.argv;
  if (executable !== "node") {
    failures.push(finding("runtime_command_executable_invalid", `scenario ${scenario.id ?? "<unknown>"} must use the governed Node runtime`, scenario.id ?? "<scenario>"));
    return undefined;
  }
  const entrypoint = args[0];
  if (!isNormalizedRepositoryPath(entrypoint ?? "") || entrypoint.startsWith("-") || !/\.(?:c?js|mjs)$/.test(entrypoint)) {
    failures.push(finding("runtime_command_argv_unsafe", `scenario ${scenario.id ?? "<unknown>"} may not override the governed Node permission boundary`, scenario.id ?? "<scenario>"));
    return undefined;
  }
  const temporaryRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-consumer-command-")));
  const checkout = path.join(temporaryRoot, "checkout");
  let worktreeAdded = false;
  try {
    const add = runGit(root, ["worktree", "add", "--detach", checkout, revision]);
    if (add.status !== 0) {
      failures.push(finding("runtime_command_checkout_failed", `scenario ${scenario.id ?? "<unknown>"} could not check out the pinned revision`, scenario.id ?? "<scenario>"));
      return false;
    }
    worktreeAdded = true;
    const redirect = firstFilesystemRedirect(checkout);
    if (redirect) {
      failures.push(finding("runtime_command_checkout_symlink", `scenario ${scenario.id ?? "<unknown>"} checkout contains filesystem redirect ${redirect}`, redirect));
      return undefined;
    }
    const resultFile = path.resolve(checkout, scenario.result_artifact);
    fs.rmSync(resultFile, { force: true });
    const child = spawnSync(process.execPath, ["--permission", `--allow-fs-read=${checkout}`, `--allow-fs-write=${checkout}`, ...args], {
      cwd: checkout,
      env: {
        CI: "1",
        LANG: "C",
        LC_ALL: "C",
        PATH: process.env.PATH ?? "",
        STYLEGALLERY_RESULT_ARTIFACT: scenario.result_artifact,
        STYLEGALLERY_RUNTIME_CONTEXT: JSON.stringify(expectedResult),
      },
      killSignal: "SIGKILL",
      shell: false,
      stdio: "ignore",
      timeout: runtimeTimeout,
    });
    if (child.error || child.status !== 0) {
      const outcome = child.error?.code === "ETIMEDOUT" ? "timed out" : child.signal ? `received ${child.signal}` : `exited ${child.status ?? "without a status"}`;
      failures.push(finding("runtime_command_failed", `scenario ${scenario.id ?? "<unknown>"} ${outcome} at the pinned revision`, scenario.id ?? "<scenario>"));
      return undefined;
    }
    try {
      const stat = fs.lstatSync(resultFile);
      if (stat.size > MAX_ARTIFACT_FILE_BYTES) throw new Error(`result exceeds ${MAX_ARTIFACT_FILE_BYTES} bytes`);
      if (!stat.isFile() || stat.isSymbolicLink() || !fs.realpathSync(resultFile).startsWith(`${fs.realpathSync(checkout)}${path.sep}`)) throw new Error("result is not a contained regular file");
      return parseStrictJson(fs.readFileSync(resultFile, "utf8"));
    } catch (error) {
      failures.push(finding("runtime_command_result_missing", `scenario ${scenario.id ?? "<unknown>"} did not produce a valid result artifact: ${error instanceof Error ? error.message : String(error)}`, scenario.result_artifact));
      return undefined;
    }
  } finally {
    if (worktreeAdded) {
      const removed = runGit(root, ["worktree", "remove", "--force", "--force", checkout]);
      if (removed.status !== 0) {
        try { fs.rmSync(checkout, { force: true, recursive: true }); } catch {}
        runGit(root, ["worktree", "prune", "--expire", "now"]);
        const registered = runGit(root, ["worktree", "list", "--porcelain"]);
        if (registered.status !== 0 || registered.stdout.includes(checkout)) failures.push(finding("runtime_command_cleanup_failed", `scenario ${scenario.id ?? "<unknown>"} worktree cleanup failed`, scenario.id ?? "<scenario>"));
      }
    }
    fs.rmSync(temporaryRoot, { force: true, recursive: true });
  }
}

function remoteIdentity(remote) {
  const cleaned = remote.trim().replace(/\.git$/, "");
  const scp = cleaned.match(/^[^@]+@[^:]+:(.+)$/);
  if (scp) return scp[1];
  try { return new URL(cleaned).pathname.replace(/^\//, ""); }
  catch { return undefined; }
}

function pinnedSourceManifest(root, revision, references, failures) {
  if (!Array.isArray(references) || references.length === 0 || new Set(references).size !== references.length) return undefined;
  const revisionCheck = runGit(root, ["cat-file", "-e", `${revision}^{commit}`]);
  if (revisionCheck.status !== 0) {
    failures.push(finding("consumer_revision_unknown", "consumer revision must resolve to a commit in the repository", revision));
    return undefined;
  }
  const files = [];
  for (const reference of [...references].sort()) {
    if (!isNormalizedRepositoryPath(reference)) continue;
    const tree = runGit(root, ["ls-tree", "-z", revision, "--", reference], "buffer");
    const entry = tree.status === 0 ? tree.stdout.toString("utf8").split("\0").find((line) => line.endsWith(`\t${reference}`)) : undefined;
    if (!entry) {
      failures.push(finding("consumer_source_missing", "relevant source is missing from the pinned revision", reference));
      continue;
    }
    const [metadata] = entry.split("\t", 1);
    const [mode, type] = metadata.split(" ");
    if (mode === "120000") {
      failures.push(finding("consumer_source_symlink", "relevant source must not be a symbolic link", reference));
      continue;
    }
    if (type !== "blob") {
      failures.push(finding("consumer_source_type_invalid", "relevant source must be a regular file", reference));
      continue;
    }
    const blob = runGit(root, ["show", `${revision}:${reference}`], "buffer");
    if (blob.status !== 0) {
      failures.push(finding("consumer_source_unreadable", "relevant source could not be read from the pinned revision", reference));
      continue;
    }
    files.push({ byte_length: blob.stdout.length, path: reference, sha256: digest(blob.stdout) });
  }
  return files.length === references.length ? { files, sha256: digest(Buffer.from(JSON.stringify(files))) } : undefined;
}

function markdownAnchors(bytes) {
  const occurrences = new Map();
  return bytes.toString("utf8").split("\n").flatMap((line) => {
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/)?.[1];
    if (!heading) return [];
    const base = heading
      .replace(/`([^`]*)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .toLowerCase()
      .replace(/[^a-z0-9 _-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    const occurrence = occurrences.get(base) ?? 0;
    occurrences.set(base, occurrence + 1);
    return [occurrence === 0 ? `#${base}` : `#${base}-${occurrence}`];
  });
}

function validateStyleGallerySources(value, recordPath, failures) {
  const mappings = Array.isArray(value?.adoption_mappings) ? value.adoption_mappings : [];
  let checked = 0;
  for (const [index, mapping] of mappings.entries()) {
    const source = mapping?.stylegallery;
    if (!source || !/^[a-f0-9]{40}$/.test(source.revision ?? "") || !isNormalizedRepositoryPath(source.path)) continue;
    const revision = runGit(styleGalleryRoot, ["cat-file", "-e", `${source.revision}^{commit}`]);
    if (revision.status !== 0) {
      failures.push(finding("adoption_stylegallery_revision_unknown", `adoption mapping ${index} revision does not resolve in StyleGallery`, recordPath));
      continue;
    }
    const tree = runGit(styleGalleryRoot, ["ls-tree", "-z", source.revision, "--", source.path], "buffer");
    const entry = tree.status === 0 ? tree.stdout.toString("utf8").split("\0").find((line) => line.endsWith(`\t${source.path}`)) : undefined;
    if (!entry) {
      failures.push(finding("adoption_stylegallery_path_missing", `adoption mapping ${index} path is missing from its pinned StyleGallery revision`, source.path));
      continue;
    }
    const [metadata] = entry.split("\t", 1);
    const [mode, type] = metadata.split(" ");
    if (mode === "120000" || type !== "blob") {
      failures.push(finding("adoption_stylegallery_path_invalid", `adoption mapping ${index} path must be a regular StyleGallery file`, source.path));
      continue;
    }
    const blob = runGit(styleGalleryRoot, ["show", `${source.revision}:${source.path}`], "buffer");
    if (blob.status !== 0) {
      failures.push(finding("adoption_stylegallery_path_unreadable", `adoption mapping ${index} path could not be read from StyleGallery`, source.path));
      continue;
    }
    if (!markdownAnchors(blob.stdout).includes(source.anchor)) {
      failures.push(finding("adoption_stylegallery_anchor_missing", `adoption mapping ${index} anchor is missing from its pinned StyleGallery file`, `${source.path}${source.anchor}`));
      continue;
    }
    checked += 1;
  }
  return checked;
}

function validateRuntimeEvidence({ recordPath, root, validateResult, value }, failures) {
  const consumer = value?.consumer;
  const scenarios = Array.isArray(value?.scenarios) ? value.scenarios : [];
  if (!consumer || typeof consumer.repository !== "string" || typeof consumer.revision !== "string" || !Array.isArray(consumer.relevant_sources)) return 0;

  const gitFailures = [];
  const identity = gitIdentity(root, gitFailures);
  for (const issue of gitFailures) failures.push(finding("consumer_git_invalid", issue.message, issue.path));
  if (identity) {
    const remote = runGit(root, ["config", "--get", "remote.origin.url"]);
    const repositories = new Set([identity.repository, remote.status === 0 ? remoteIdentity(remote.stdout) : undefined].filter(Boolean));
    if (repositories.size === 0) failures.push(finding("consumer_repository_unverifiable", "consumer repository requires a verifiable Git remote identity", recordPath));
    else if (!repositories.has(consumer.repository)) failures.push(finding("consumer_repository_mismatch", "consumer repository differs from the Git repository identity", recordPath));
  }

  const source = pinnedSourceManifest(root, consumer.revision, consumer.relevant_sources, failures);
  if (source) {
    for (const scenario of scenarios) {
      if (scenario?.source_digest !== source.sha256) failures.push(finding("runtime_source_digest_mismatch", `scenario ${scenario?.id ?? "<unknown>"} source digest differs from the pinned relevant sources`, recordPath));
    }
  }

  let checked = 0;
  let executed = 0;
  for (const scenario of scenarios) {
    if (!isNormalizedRepositoryPath(scenario?.result_artifact, { jsonOnly: true })) continue;
    const result = readJsonFile({ prefix: "runtime_result_artifact", reference: scenario.result_artifact, root }, failures);
    if (!result) continue;
    checked += 1;
    if (scenario.evidence_method === "browser" && value.page_evidence?.status === "applicable") continue;
    if (!validateResult(result.value)) {
      for (const error of validateResult.errors ?? []) failures.push(finding("runtime_result_artifact_schema_invalid", `${error.instancePath || "/"} ${error.message}`, scenario.result_artifact));
      continue;
    }
    const expected = {
      argv: scenario.argv,
      evidence_method: scenario.evidence_method,
      exit_code: scenario.exit_code,
      repository: consumer.repository,
      revision: consumer.revision,
      run_id: scenario.run_id,
      scenario_id: scenario.id,
      session_id: scenario.session_id,
      source_digest: scenario.source_digest,
    };
    if (Object.entries(expected).some(([key, expectedValue]) => Array.isArray(expectedValue)
      ? !Array.isArray(result.value[key]) || expectedValue.length !== result.value[key].length || expectedValue.some((entry, index) => result.value[key][index] !== entry)
      : result.value[key] !== expectedValue)) {
      failures.push(finding("runtime_result_artifact_mismatch", `scenario ${scenario.id ?? "<unknown>"} result artifact identity differs from the conformance record`, scenario.result_artifact));
    }
    const executedResult = identity && source ? executePinnedScenario(root, consumer.revision, scenario, expected, failures) : undefined;
    if (executedResult !== undefined) {
      executed += 1;
      if (!validateResult(executedResult)) {
        for (const error of validateResult.errors ?? []) failures.push(finding("runtime_command_result_invalid", `${error.instancePath || "/"} ${error.message}`, scenario.result_artifact));
      } else if (!isDeepStrictEqual(executedResult, result.value)) {
        failures.push(finding("runtime_result_artifact_execution_mismatch", `scenario ${scenario.id ?? "<unknown>"} stored result differs from the result produced at the pinned revision`, scenario.result_artifact));
      }
    }
  }
  return { checked, executed };
}

function runPageValidator({ artifactRoot, manifest, priorManifest, root }, failures) {
  const args = [pageValidator, "--root", root, "--artifact-root", artifactRoot, "--manifest", manifest];
  if (priorManifest) args.push("--prior-manifest", priorManifest);
  args.push("--json");
  const child = spawnSync(process.execPath, args, { cwd: styleGalleryRoot, encoding: "utf8" });
  let report;
  try {
    report = parseStrictJson(child.stdout);
  } catch (error) {
    failures.push(finding("page_evidence_validator_output_invalid", error instanceof Error ? error.message : String(error), manifest));
    return undefined;
  }
  if (Array.isArray(report?.failures)) failures.push(...report.failures);
  if (child.status !== 0 && report?.failures?.length === 0) failures.push(finding("page_evidence_validator_failed", "page evidence validator exited without a finding", manifest));
  return report;
}

function validatePageEvidence({ artifactRootArgument, priorManifestArgument, recordPath, root, value }, failures) {
  if (value?.page_evidence?.status !== "applicable") return undefined;
  const intentFindings = validateConsumerPageIntentSemantics(value, recordPath);
  failures.push(...intentFindings);
  if (intentFindings.some((entry) => entry.code === "page_evidence_runtime_scenario_required")) return undefined;
  if (!artifactRootArgument) {
    failures.push(finding("page_evidence_artifact_root_required", "applicable page evidence requires --artifact-root", value.page_evidence.manifest ?? "<page-evidence>"));
    return undefined;
  }
  const artifactReference = normalizeReference(root, artifactRootArgument);
  if (!artifactReference) {
    failures.push(finding("page_evidence_artifact_escape", "artifact root must be a normalized path inside the consumer root", artifactRootArgument));
    return undefined;
  }
  const artifact = resolveContained({ expectedType: "directory", prefix: "page_evidence_artifact", reference: artifactReference, root }, failures);
  const expectedManifest = `${artifactReference}/${PAGE_EVIDENCE_MANIFEST}`;
  if (value.page_evidence.manifest !== expectedManifest) {
    failures.push(finding("page_evidence_manifest_path_mismatch", `page evidence manifest must equal ${expectedManifest}`, value.page_evidence.manifest));
    return undefined;
  }
  const manifest = readJsonFile({ prefix: "page_evidence_manifest", reference: expectedManifest, root }, failures);
  if (!artifact || !manifest) return undefined;
  let schemas;
  try {
    schemas = compilePageEvidenceSchemas(pageSchemaRoot);
  } catch (error) {
    failures.push(finding("page_evidence_schema_invalid", error instanceof Error ? error.message : String(error), "consumer-reference/schema"));
    return undefined;
  }
  if (!addSchemaFindings(schemas.manifest, manifest.value, manifest.reference, "page_evidence_manifest_schema_invalid", failures)) return undefined;
  failures.push(...validateConsumerPageEvidenceSemantics(value, manifest.value, recordPath));

  let priorManifest;
  if (priorManifestArgument) {
    const reference = normalizeReference(root, priorManifestArgument);
    const prior = reference ? resolveContained({ expectedType: "file", prefix: "page_evidence_reuse_manifest", reference, root }, failures) : undefined;
    if (!reference) failures.push(finding("page_evidence_reuse_manifest_escape", "prior manifest must be a normalized path inside the consumer root", priorManifestArgument));
    priorManifest = prior?.file;
  }
  if (priorManifestArgument && !priorManifest) return undefined;
  return runPageValidator({ artifactRoot: artifact.file, manifest: manifest.file, priorManifest, root }, failures);
}

const { failures: argumentFailures, options } = parseArguments(process.argv);
const failures = [...argumentFailures];
const record = options.record ? containedRecord(options.root, options.record, failures) : undefined;
const schema = readStrictJson(schemaPath, "consumer_conformance_schema_invalid", "consumer-reference/schema/consumer-conformance-record.schema.json", failures);
const value = record ? readStrictJson(record.resolved, "consumer_conformance_json_invalid", record.recordPath, failures) : undefined;
let checkedRuntimeArtifacts = 0;
let checkedRuntimeCommands = 0;
let checkedStyleGallerySources = 0;
let recordSchemaValid = false;

if (schema && value !== undefined) {
  try {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addDateTimeFormat(ajv);
    ajv.addSchema(schema);
    const validate = ajv.getSchema(schema.$id);
    const validateResult = ajv.compile({ $ref: `${schema.$id}#/$defs/runtimeResult` });
    const schemaValid = validate(value);
    recordSchemaValid = schemaValid;
    if (!schemaValid) failures.push(...consumerConformanceSchemaFindings(validate.errors, record.recordPath));
    else {
      failures.push(...validateConsumerConformanceSemantics(value, record.recordPath));
      checkedStyleGallerySources = validateStyleGallerySources(value, record.recordPath, failures);
      const runtimeEvidence = validateRuntimeEvidence({ recordPath: record.recordPath, root: record.root, validateResult, value }, failures);
      checkedRuntimeArtifacts = runtimeEvidence.checked;
      checkedRuntimeCommands = runtimeEvidence.executed;
    }
  } catch (error) {
    failures.push(finding("consumer_conformance_schema_invalid", error instanceof Error ? error.message : String(error), "consumer-reference/schema/consumer-conformance-record.schema.json"));
  }
}

const pageReport = record && value !== undefined && recordSchemaValid
  ? validatePageEvidence({ artifactRootArgument: options.artifactRoot, priorManifestArgument: options.priorManifest, recordPath: record.recordPath, root: record.root, value }, failures)
  : undefined;

const uniqueFailures = uniqueFindings(failures);
const result = {
  checkedDimensions: value && typeof value.migration_dimensions === "object" && value.migration_dimensions !== null
    ? MIGRATION_DIMENSIONS.filter((name) => Object.hasOwn(value.migration_dimensions, name)).length
    : 0,
  checkedMappings: Array.isArray(value?.adoption_mappings) ? value.adoption_mappings.length : 0,
  checkedRuntimeArtifacts,
  checkedRuntimeCommands,
  checkedScenarios: Array.isArray(value?.scenarios) ? value.scenarios.length : 0,
  checkedStyleGallerySources,
  checkedPageArtifacts: pageReport?.artifactCount ?? 0,
  checkedPageScenarios: pageReport?.scenarioCount ?? 0,
  failures: uniqueFailures,
  ok: uniqueFailures.length === 0,
  pageSessionId: pageReport?.sessionId ?? null,
  record: record?.recordPath ?? options.record ?? null,
};
if (options.json) console.log(JSON.stringify(result, null, 2));
else if (result.ok) console.log(`ok: ${result.checkedDimensions} migration dimensions, ${result.checkedMappings} adoption mappings`);
else console.error(result.failures.map((entry) => `${entry.code}: ${entry.path}: ${entry.message}`).join("\n"));
process.exitCode = result.ok ? 0 : 1;
