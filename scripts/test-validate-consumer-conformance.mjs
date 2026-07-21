#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  endToEndCaseNames,
  runEndToEndCase,
} from "../consumer-reference/fixtures/consumer-conformance/e2e-fixture.mjs";
import { MIGRATION_DIMENSIONS, validateConsumerConformanceSemantics } from "./consumer-conformance-contract.mjs";
import { canonicalSourceManifest } from "./page-evidence-contract.mjs";
import { parseStrictJson } from "./strict-json.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(repositoryRoot, "consumer-reference", "fixtures", "consumer-conformance");
const validator = path.join(repositoryRoot, "scripts", "validate-consumer-conformance.mjs");
const contractCases = Object.freeze([
  ["omitted-dimension", "migration_dimension_required"],
  ["applicable-without-scenario", "migration_dimension_scenario_required"],
  ["source-regex-runtime-proof", "runtime_evidence_method_invalid"],
  ["orphan-adoption-scenario", "adoption_scenario_unknown"],
  ["malformed-local-target", "adoption_consumer_target_invalid"],
  ["unpinned-stylegallery-revision", "adoption_stylegallery_revision_unpinned"],
  ["unknown-stylegallery-revision", "adoption_stylegallery_revision_unknown"],
  ["missing-stylegallery-path", "adoption_stylegallery_path_missing"],
  ["missing-stylegallery-anchor", "adoption_stylegallery_anchor_missing"],
  ["debt-without-lifecycle", "adoption_debt_incomplete"],
]);
const runtimeCases = Object.freeze([
  ["missing-source", "consumer_source_missing"],
  ["symlink-source", "consumer_source_symlink"],
  ["checkout-symlink", "runtime_command_checkout_symlink"],
  ["missing-result-artifact", "runtime_result_artifact_missing"],
  ["symlink-result-artifact", "runtime_result_artifact_symlink"],
  ["invalid-result-artifact-json", "runtime_result_artifact_json_invalid"],
  ["fabricated-result-artifact", "runtime_result_artifact_mismatch"],
  ["fabricated-repository", "consumer_repository_mismatch"],
  ["fabricated-revision", "consumer_revision_unknown"],
  ["fabricated-source-digest", "runtime_source_digest_mismatch"],
  ["nonzero-command", "runtime_command_failed"],
  ["forged-noop-result", "runtime_command_result_missing"],
  ["github-repository-spoof", "consumer_repository_mismatch", { GITHUB_REPOSITORY: "example/spoof" }],
]);
const documentedLifecycleCase = "documented-page-evidence-lifecycle";

function parseArguments(argv) {
  const options = { caseName: undefined, json: false };
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") options.json = true;
    else if (argument === "--case") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--case requires a case name");
      options.caseName = value;
      index += 1;
    } else throw new Error(`unsupported argument ${argument}`);
  }
  return options;
}

function sameSet(actual, expected) {
  return actual.length === expected.length && new Set(actual).size === expected.length && expected.every((entry) => actual.includes(entry));
}

function readJson(file) {
  return parseStrictJson(fs.readFileSync(file, "utf8"));
}

function validateInventory(manifest) {
  const expectedKeys = ["id", "invalid_cases", "schema_record", "schema_version", "valid_records"];
  const encodedCases = Array.isArray(manifest.invalid_cases)
    ? manifest.invalid_cases.map((entry) => Object.keys(entry).length === 2 ? `${entry.name}:${entry.expected_code}` : "")
    : [];
  const expectedEncoded = [...contractCases, ...runtimeCases].map(([name, code]) => `${name}:${code}`);
  const entries = fs.readdirSync(fixtureRoot, { withFileTypes: true });
  const closedFiles = entries.every((entry) => entry.isFile())
    && sameSet(entries.map((entry) => entry.name), ["e2e-fixture.mjs", "manifest.json", "runtime-proof.mjs", "valid-migration-result.json", "valid-migration.json"]);
  return Object.keys(manifest).length === expectedKeys.length
    && sameSet(Object.keys(manifest), expectedKeys)
    && manifest.id === "consumer-conformance-fixture-inventory"
    && manifest.schema_version === "1.0"
    && manifest.schema_record === "consumer-reference/schema/consumer-conformance-record.schema.json"
    && Array.isArray(manifest.valid_records)
    && sameSet(manifest.valid_records, ["valid-migration.json"])
    && sameSet(encodedCases, expectedEncoded)
    && closedFiles;
}

function git(root, ...args) {
  return execFileSync("git", ["-c", `safe.directory=${root}`, ...args], { cwd: root, encoding: "utf8" }).trim();
}

function writeFile(root, reference, content) {
  const file = path.join(root, reference);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function runtimeResult(value, overrides = {}) {
  const scenario = value.scenarios[0];
  return {
    argv: scenario.argv,
    evidence_method: scenario.evidence_method,
    exit_code: scenario.exit_code,
    record_kind: "consumer_migration_scenario_result",
    recorded_at: "2026-07-21T00:00:00Z",
    repository: value.consumer.repository,
    revision: value.consumer.revision,
    run_id: scenario.run_id,
    scenario_id: scenario.id,
    schema_version: "1.0",
    session_id: scenario.session_id,
    source_digest: scenario.source_digest,
    status: "passed",
    ...overrides,
  };
}

function initializeRuntimeFixture(source) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-consumer-runtime-")));
  execFileSync("git", ["init", "-b", "main"], { cwd: root, stdio: "ignore" });
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "user.name", "StyleGallery fixture");
  git(root, "remote", "add", "origin", "https://github.com/example/consumer-web.git");
  writeFile(root, "src/app.js", "export const app = true;\n");
  writeFile(root, "src/styles.css", ".app { display: block; }\n");
  writeFile(root, "tests/migration.mjs", `import fs from "node:fs";\nimport path from "node:path";\nimport { spawnSync } from "node:child_process";\nif (process.argv.includes("--lock-worktree")) { const locked = spawnSync("git", ["worktree", "lock", "."]); if (locked.status !== 0) process.exit(18); }\nconst reference = process.env.STYLEGALLERY_RESULT_ARTIFACT;\nconst context = JSON.parse(process.env.STYLEGALLERY_RUNTIME_CONTEXT);\nconst file = path.resolve(process.cwd(), reference);\nfs.mkdirSync(path.dirname(file), { recursive: true });\nif (process.argv.includes("--oversized-result")) { const descriptor = fs.openSync(file, "wx"); fs.ftruncateSync(descriptor, 67108865); fs.closeSync(descriptor); process.exit(0); }\nfs.writeFileSync(file, JSON.stringify({ ...context, record_kind: "consumer_migration_scenario_result", recorded_at: "2026-07-21T00:00:00Z", schema_version: "1.0", status: "passed" }, null, 2) + "\\n", { flag: "wx" });\n`);
  writeFile(root, "tests/failing.mjs", "process.exit(17);\n");
  writeFile(root, "tests/hanging.mjs", "setInterval(() => {}, 1000);\n");
  writeFile(root, "tests/noop.mjs", "// Intentionally produces no result artifact.\n");
  git(root, "add", "src/app.js", "src/styles.css", "tests/migration.mjs", "tests/failing.mjs", "tests/hanging.mjs", "tests/noop.mjs");
  git(root, "commit", "-m", "fixture sources");
  const cleanRevision = git(root, "rev-parse", "HEAD");
  fs.symlinkSync("app.js", path.join(root, "src/linked.js"));
  git(root, "add", "src/linked.js");
  git(root, "commit", "-m", "fixture symlink source");
  const symlinkRevision = git(root, "rev-parse", "HEAD");
  git(root, "reset", "--hard", cleanRevision);

  const value = structuredClone(source);
  value.consumer = {
    relevant_sources: ["src/app.js", "src/styles.css", "tests/migration.mjs"],
    repository: "example/consumer-web",
    revision: git(root, "rev-parse", "HEAD"),
  };
  const styleGalleryRevision = git(repositoryRoot, "rev-parse", "HEAD");
  for (const mapping of value.adoption_mappings) mapping.stylegallery.revision = styleGalleryRevision;
  const sourceFailures = [];
  const manifest = canonicalSourceManifest(root, value.consumer.relevant_sources, sourceFailures);
  if (!manifest || sourceFailures.length > 0) throw new Error(`runtime fixture source manifest failed: ${JSON.stringify(sourceFailures)}`);
  value.scenarios[0] = {
    ...value.scenarios[0],
    argv: ["node", "tests/migration.mjs"],
    evidence_method: "integration",
    result_artifact: "evidence/results/migration-round-trip.json",
    source_digest: manifest.sha256,
  };
  writeFile(root, value.scenarios[0].result_artifact, `${JSON.stringify(runtimeResult(value), null, 2)}\n`);
  writeFile(root, "evidence/results/fabricated.json", `${JSON.stringify(runtimeResult(value, { scenario_id: "fabricated-scenario" }), null, 2)}\n`);
  const failing = structuredClone(value);
  failing.scenarios[0].argv = ["node", "tests/failing.mjs"];
  failing.scenarios[0].result_artifact = "evidence/results/nonzero-command.json";
  writeFile(root, failing.scenarios[0].result_artifact, `${JSON.stringify(runtimeResult(failing), null, 2)}\n`);
  const noop = structuredClone(value);
  noop.scenarios[0].argv = ["node", "tests/noop.mjs"];
  noop.scenarios[0].result_artifact = "evidence/results/forged-noop-result.json";
  writeFile(root, noop.scenarios[0].result_artifact, `${JSON.stringify(runtimeResult(noop), null, 2)}\n`);
  writeFile(root, "evidence/results/invalid.json", "{not json}\n");
  fs.symlinkSync("migration-round-trip.json", path.join(root, "evidence/results/redirect.json"));
  return { root, symlinkRevision, value };
}

function mutatedRuntimeRecord(name, source, fixture) {
  const value = structuredClone(source);
  if (name === "missing-source") value.consumer.relevant_sources[0] = "src/missing.js";
  else if (name === "symlink-source") {
    value.consumer.relevant_sources[0] = "src/linked.js";
    value.consumer.revision = fixture.symlinkRevision;
  }
  else if (name === "checkout-symlink") value.consumer.revision = fixture.symlinkRevision;
  else if (name === "missing-result-artifact") value.scenarios[0].result_artifact = "evidence/results/missing.json";
  else if (name === "symlink-result-artifact") value.scenarios[0].result_artifact = "evidence/results/redirect.json";
  else if (name === "invalid-result-artifact-json") value.scenarios[0].result_artifact = "evidence/results/invalid.json";
  else if (name === "fabricated-result-artifact") value.scenarios[0].result_artifact = "evidence/results/fabricated.json";
  else if (name === "fabricated-repository") value.consumer.repository = "fabricated/consumer";
  else if (name === "fabricated-revision") value.consumer.revision = "0".repeat(40);
  else if (name === "fabricated-source-digest") value.scenarios[0].source_digest = "0".repeat(64);
  else if (name === "nonzero-command") {
    value.scenarios[0].argv = ["node", "tests/failing.mjs"];
    value.scenarios[0].result_artifact = "evidence/results/nonzero-command.json";
  }
  else if (name === "forged-noop-result") {
    value.scenarios[0].argv = ["node", "tests/noop.mjs"];
    value.scenarios[0].result_artifact = "evidence/results/forged-noop-result.json";
  }
  else if (name === "github-repository-spoof") value.consumer.repository = "example/spoof";
  else throw new Error(`unknown runtime fixture case ${name}`);
  return value;
}

function documentedLifecycleIsExecutable() {
  const document = fs.readFileSync(path.join(repositoryRoot, "design-engineering", "consumer-migration-readiness.md"), "utf8");
  const start = document.indexOf("## Verification Contract");
  const end = document.indexOf("## Source, License, And Attribution");
  const verification = document.slice(start, end);
  return [
    "create-page-evidence-session.mjs",
    "finalize-page-evidence.mjs",
    "validate-consumer-conformance.mjs",
    "--root <consumer-root>",
    "--record <record.json>",
    "--artifact-root <artifact-root>",
    "--runner-result <runner-result.json>",
    "--review-by <RFC3339-date-time>",
  ].every((fragment) => verification.includes(fragment));
}

function mutatedRecord(name, source) {
  const value = structuredClone(source);
  if (name === "omitted-dimension") delete value.migration_dimensions.exact_time_boundary;
  else if (name === "applicable-without-scenario") value.migration_dimensions.route_parity = { scenario_ids: [], status: "applicable" };
  else if (name === "source-regex-runtime-proof") value.scenarios[0].evidence_method = "source_regex";
  else if (name === "orphan-adoption-scenario") value.adoption_mappings[0].scenario_ids = ["missing-scenario"];
  else if (name === "malformed-local-target") value.adoption_mappings[0].consumer_target = { identity: "app shell", kind: "selector" };
  else if (name === "unpinned-stylegallery-revision") value.adoption_mappings[0].stylegallery.revision = "abc123";
  else if (name === "unknown-stylegallery-revision") value.adoption_mappings[0].stylegallery.revision = "0".repeat(40);
  else if (name === "missing-stylegallery-path") value.adoption_mappings[0].stylegallery.path = "recipes/missing.md";
  else if (name === "missing-stylegallery-anchor") value.adoption_mappings[0].stylegallery.anchor = "#missing-anchor";
  else if (name === "debt-without-lifecycle") value.adoption_mappings[0].debt = [{ summary: "Replace the temporary spacing bridge." }];
  else throw new Error(`unknown fixture case ${name}`);
  return value;
}

function runValidator(root, record, env = {}) {
  const child = spawnSync(process.execPath, [validator, "--root", root, "--record", record, "--json"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  let output;
  try {
    output = JSON.parse(child.stdout);
  } catch {
    output = { failures: [], parse_error: child.stderr || child.stdout };
  }
  return { output, status: child.status };
}

const options = parseArguments(process.argv);
const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-consumer-conformance-")));
const results = [];
let runtimeFixture;
try {
  const manifest = readJson(path.join(fixtureRoot, "manifest.json"));
  const inventoryOk = validateInventory(manifest) && fs.existsSync(path.join(repositoryRoot, manifest.schema_record));
  results.push({ actual: inventoryOk, expected: true, name: "closed-fixture-inventory", ok: inventoryOk });
  const valid = readJson(path.join(fixtureRoot, "valid-migration.json"));
  const selected = options.caseName ?? "all";
  for (const name of endToEndCaseNames) {
    if (selected === "all" || selected === name) results.push(runEndToEndCase(name, valid));
  }
  if (selected === "all" || selected === "valid-migration") {
    const codes = validateConsumerConformanceSemantics(valid, "valid-migration.json").map((entry) => entry.code);
    const checkedDimensions = Object.keys(valid.migration_dimensions ?? {}).length;
    const checkedMappings = valid.adoption_mappings?.length ?? 0;
    const ok = codes.length === 0 && checkedDimensions === MIGRATION_DIMENSIONS.length && checkedMappings === 1;
    results.push({ actual: { checkedDimensions, checkedMappings, codes }, expected: "valid static template, 13 dimensions, one mapping", name: "valid-migration", ok });
  }
  if (selected === "all" || selected === "stale-template-rebound") {
    const stale = structuredClone(valid);
    stale.adoption_mappings[0].stylegallery.revision = "0".repeat(40);
    const result = runEndToEndCase("end-to-end-consumer", stale);
    results.push({ ...result, expected: "dynamic record rebound to the current StyleGallery checkout", name: "stale-template-rebound" });
  }
  const contractTemplate = structuredClone(valid);
  const styleGalleryRevision = git(repositoryRoot, "rev-parse", "HEAD");
  for (const mapping of contractTemplate.adoption_mappings) mapping.stylegallery.revision = styleGalleryRevision;
  for (const [name, expectedCode] of contractCases) {
    if (selected !== "all" && selected !== name) continue;
    const record = path.join(tempRoot, `${name}.json`);
    fs.writeFileSync(record, `${JSON.stringify(mutatedRecord(name, contractTemplate), null, 2)}\n`);
    const child = runValidator(tempRoot, path.basename(record));
    const codes = child.output.failures?.map((entry) => entry.code) ?? [];
    const ok = child.status !== 0 && codes.includes(expectedCode);
    results.push({ actual: { codes, status: child.status }, expected: expectedCode, name, ok });
  }
  const runtimeTemplate = structuredClone(valid);
  runtimeTemplate.adoption_mappings[0].stylegallery.revision = "0".repeat(40);
  runtimeFixture = initializeRuntimeFixture(runtimeTemplate);
  if (selected === "all" || selected === "valid-runtime-proof") {
    const record = "records/valid-runtime-proof.json";
    writeFile(runtimeFixture.root, record, `${JSON.stringify(runtimeFixture.value, null, 2)}\n`);
    const child = runValidator(runtimeFixture.root, record);
    const ok = child.status === 0 && child.output.ok === true && child.output.checkedScenarios === 1;
    results.push({ actual: { codes: child.output.failures?.map((entry) => entry.code) ?? [], status: child.status }, expected: "runtime-bound record and exit:0", name: "valid-runtime-proof", ok });
  }
  for (const [name, expectedCode, env] of runtimeCases) {
    if (selected !== "all" && selected !== name) continue;
    const record = `records/${name}.json`;
    writeFile(runtimeFixture.root, record, `${JSON.stringify(mutatedRuntimeRecord(name, runtimeFixture.value, runtimeFixture), null, 2)}\n`);
    const child = runValidator(runtimeFixture.root, record, env);
    const codes = child.output.failures?.map((entry) => entry.code) ?? [];
    const ok = child.status !== 0 && codes.includes(expectedCode);
    results.push({ actual: { codes, status: child.status }, expected: expectedCode, name, ok });
  }
  if (selected === "all" || selected === "child-process-denied-cleanup") {
    const value = structuredClone(runtimeFixture.value);
    value.scenarios[0].argv = ["node", "tests/migration.mjs", "--lock-worktree"];
    value.scenarios[0].result_artifact = "evidence/results/locked-worktree-cleanup.json";
    writeFile(runtimeFixture.root, value.scenarios[0].result_artifact, `${JSON.stringify(runtimeResult(value), null, 2)}\n`);
    const record = "records/locked-worktree-cleanup.json";
    writeFile(runtimeFixture.root, record, `${JSON.stringify(value, null, 2)}\n`);
    const before = git(runtimeFixture.root, "worktree", "list", "--porcelain");
    const child = runValidator(runtimeFixture.root, record);
    const after = git(runtimeFixture.root, "worktree", "list", "--porcelain");
    const codes = child.output.failures?.map((entry) => entry.code) ?? [];
    const ok = child.status !== 0 && codes.includes("runtime_command_failed") && before === after;
    results.push({ actual: { codes, registeredWorktreesUnchanged: before === after, status: child.status }, expected: "child process denied and no registered temporary worktree", name: "child-process-denied-cleanup", ok });
  }
  if (selected === "all" || selected === "timed-out-command-cleanup") {
    const value = structuredClone(runtimeFixture.value);
    value.scenarios[0].argv = ["node", "tests/hanging.mjs"];
    value.scenarios[0].result_artifact = "evidence/results/timed-out-command.json";
    writeFile(runtimeFixture.root, value.scenarios[0].result_artifact, `${JSON.stringify(runtimeResult(value), null, 2)}\n`);
    const record = "records/timed-out-command.json";
    writeFile(runtimeFixture.root, record, `${JSON.stringify(value, null, 2)}\n`);
    const before = git(runtimeFixture.root, "worktree", "list", "--porcelain");
    const child = runValidator(runtimeFixture.root, record, { STYLEGALLERY_RUNTIME_TIMEOUT_MS: "100" });
    const after = git(runtimeFixture.root, "worktree", "list", "--porcelain");
    const codes = child.output.failures?.map((entry) => entry.code) ?? [];
    const ok = child.status !== 0 && codes.includes("runtime_command_failed") && before === after;
    results.push({ actual: { codes, registeredWorktreesUnchanged: before === after, status: child.status }, expected: "timeout and no registered temporary worktree", name: "timed-out-command-cleanup", ok });
  }
  if (selected === "all" || selected === "permission-override-denied") {
    const value = structuredClone(runtimeFixture.value);
    value.scenarios[0].argv = ["node", "--allow-child-process", "tests/migration.mjs"];
    value.scenarios[0].result_artifact = "evidence/results/permission-override.json";
    writeFile(runtimeFixture.root, value.scenarios[0].result_artifact, `${JSON.stringify(runtimeResult(value), null, 2)}\n`);
    const record = "records/permission-override.json";
    writeFile(runtimeFixture.root, record, `${JSON.stringify(value, null, 2)}\n`);
    const child = runValidator(runtimeFixture.root, record);
    const codes = child.output.failures?.map((entry) => entry.code) ?? [];
    const ok = child.status !== 0 && codes.includes("runtime_command_argv_unsafe") && child.output.checkedRuntimeCommands === 0;
    results.push({ actual: { checkedRuntimeCommands: child.output.checkedRuntimeCommands, codes, status: child.status }, expected: "permission override rejected before execution", name: "permission-override-denied", ok });
  }
  if (selected === "all" || selected === "permission-disable-denied") {
    const value = structuredClone(runtimeFixture.value);
    value.scenarios[0].argv = ["node", "--no-permission=false", "tests/migration.mjs"];
    value.scenarios[0].result_artifact = "evidence/results/permission-disable.json";
    writeFile(runtimeFixture.root, value.scenarios[0].result_artifact, `${JSON.stringify(runtimeResult(value), null, 2)}\n`);
    const record = "records/permission-disable.json";
    writeFile(runtimeFixture.root, record, `${JSON.stringify(value, null, 2)}\n`);
    const child = runValidator(runtimeFixture.root, record);
    const codes = child.output.failures?.map((entry) => entry.code) ?? [];
    const ok = child.status !== 0 && codes.includes("runtime_command_argv_unsafe") && child.output.checkedRuntimeCommands === 0;
    results.push({ actual: { checkedRuntimeCommands: child.output.checkedRuntimeCommands, codes, status: child.status }, expected: "permission disable rejected before execution", name: "permission-disable-denied", ok });
  }
  if (selected === "all" || selected === "permission-underscore-denied") {
    const value = structuredClone(runtimeFixture.value);
    value.scenarios[0].argv = ["node", "--allow_child_process", "tests/migration.mjs"];
    value.scenarios[0].result_artifact = "evidence/results/permission-underscore.json";
    writeFile(runtimeFixture.root, value.scenarios[0].result_artifact, `${JSON.stringify(runtimeResult(value), null, 2)}\n`);
    const record = "records/permission-underscore.json";
    writeFile(runtimeFixture.root, record, `${JSON.stringify(value, null, 2)}\n`);
    const child = runValidator(runtimeFixture.root, record);
    const codes = child.output.failures?.map((entry) => entry.code) ?? [];
    const ok = child.status !== 0 && codes.includes("runtime_command_argv_unsafe") && child.output.checkedRuntimeCommands === 0;
    results.push({ actual: { checkedRuntimeCommands: child.output.checkedRuntimeCommands, codes, status: child.status }, expected: "underscore permission override rejected before execution", name: "permission-underscore-denied", ok });
  }
  if (selected === "all" || selected === "permission-path-shaped-denied") {
    const value = structuredClone(runtimeFixture.value);
    value.scenarios[0].argv = ["node", "--allow-fs-read=/tmp/outside.mjs", "tests/migration.mjs"];
    value.scenarios[0].result_artifact = "evidence/results/permission-path-shaped.json";
    writeFile(runtimeFixture.root, value.scenarios[0].result_artifact, `${JSON.stringify(runtimeResult(value), null, 2)}\n`);
    const record = "records/permission-path-shaped.json";
    writeFile(runtimeFixture.root, record, `${JSON.stringify(value, null, 2)}\n`);
    const child = runValidator(runtimeFixture.root, record);
    const codes = child.output.failures?.map((entry) => entry.code) ?? [];
    const ok = child.status !== 0 && codes.includes("runtime_command_argv_unsafe") && child.output.checkedRuntimeCommands === 0;
    results.push({ actual: { checkedRuntimeCommands: child.output.checkedRuntimeCommands, codes, status: child.status }, expected: "path-shaped permission option rejected before execution", name: "permission-path-shaped-denied", ok });
  }
  if (selected === "all" || selected === "oversized-command-result") {
    const value = structuredClone(runtimeFixture.value);
    value.scenarios[0].argv = ["node", "tests/migration.mjs", "--oversized-result"];
    value.scenarios[0].result_artifact = "evidence/results/oversized-command-result.json";
    writeFile(runtimeFixture.root, value.scenarios[0].result_artifact, `${JSON.stringify(runtimeResult(value), null, 2)}\n`);
    const record = "records/oversized-command-result.json";
    writeFile(runtimeFixture.root, record, `${JSON.stringify(value, null, 2)}\n`);
    const child = runValidator(runtimeFixture.root, record);
    const codes = child.output.failures?.map((entry) => entry.code) ?? [];
    const ok = child.status !== 0 && codes.includes("runtime_command_result_missing") && child.output.checkedRuntimeCommands === 0;
    results.push({ actual: { checkedRuntimeCommands: child.output.checkedRuntimeCommands, codes, status: child.status }, expected: "oversized command result rejected before read", name: "oversized-command-result", ok });
  }
  if (selected === "all" || selected === documentedLifecycleCase) {
    const actual = documentedLifecycleIsExecutable();
    results.push({ actual, expected: true, name: documentedLifecycleCase, ok: actual });
  }
  const knownCase = selected === "all"
    || selected === "valid-migration"
    || selected === "valid-runtime-proof"
    || selected === "stale-template-rebound"
    || selected === documentedLifecycleCase
    || selected === "child-process-denied-cleanup"
    || selected === "timed-out-command-cleanup"
    || selected === "permission-override-denied"
    || selected === "permission-disable-denied"
    || selected === "permission-underscore-denied"
    || selected === "permission-path-shaped-denied"
    || selected === "oversized-command-result"
    || endToEndCaseNames.includes(selected)
    || contractCases.some(([name]) => name === selected)
    || runtimeCases.some(([name]) => name === selected);
  if (!knownCase) {
    results.push({ actual: selected, expected: "known case", name: "case-selection", ok: false });
  }
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
  if (runtimeFixture) fs.rmSync(runtimeFixture.root, { force: true, recursive: true });
}

const result = { ok: results.every((entry) => entry.ok), results };
if (options.json) console.log(JSON.stringify(result, null, 2));
else if (result.ok) console.log(`ok: ${results.length} consumer conformance fixture cases`);
else console.error(results.filter((entry) => !entry.ok).map((entry) => `${entry.name}: expected ${entry.expected}`).join("\n"));
process.exitCode = result.ok ? 0 : 1;
