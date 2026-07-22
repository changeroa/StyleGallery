#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { canonicalSourceManifest } from "./page-evidence-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = process.cwd();
const temporaryRoot = path.join(workspaceRoot, ".tmp");
const syntheticBranch = "main";
const syntheticRepository = "example/stylegallery-page-evidence-ci";
const sourcePaths = [
  "playwright.config.mjs",
  "tests/consumer-conformance.spec.mjs",
  "tests/fixtures/consumer-conformance-scenarios.mjs",
  "tests/helpers/render-consumer-conformance.mjs",
];

function trustedTemporaryRoot() {
  const resolvedWorkspace = path.resolve(workspaceRoot);
  if (fs.realpathSync(resolvedWorkspace) !== resolvedWorkspace) throw new Error("workspace root must not be a filesystem redirect");
  if (!fs.existsSync(temporaryRoot)) fs.mkdirSync(temporaryRoot);
  const stat = fs.lstatSync(temporaryRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink() || fs.realpathSync(temporaryRoot) !== temporaryRoot) throw new Error(".tmp must be a real directory inside the workspace");
  return temporaryRoot;
}

function containedPath({ base, candidate, label }) {
  if (base === temporaryRoot) trustedTemporaryRoot();
  const resolved = path.resolve(workspaceRoot, candidate);
  const relative = path.relative(base, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(label + " must be inside " + base);
  return resolved;
}

function run({ args, command, cwd }) {
  const child = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (child.status !== 0) throw new Error(command + " " + args.join(" ") + " failed (" + child.status + ")\n" + child.stdout + child.stderr);
  return child.stdout.trim();
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
}

function parseArguments() {
  const command = process.argv[2];
  const values = {};
  for (let index = 3; index < process.argv.length; index += 2) {
    const name = process.argv[index];
    const value = process.argv[index + 1];
    if (!name?.startsWith("--") || !value || value.startsWith("--")) throw new Error("invalid argument pair at " + (name ?? "<missing>"));
    values[name.slice(2)] = value;
  }
  if (!["prepare", "verify-session", "package", "cleanup"].includes(command)) throw new Error("first argument must be prepare, verify-session, package, or cleanup");
  return { command, values };
}

function prepare(values) {
  const consumerRoot = containedPath({ base: temporaryRoot, candidate: values["consumer-root"], label: "--consumer-root" });
  const recordFile = containedPath({ base: consumerRoot, candidate: values.record, label: "--record" });
  const artifactRoot = containedPath({ base: consumerRoot, candidate: values["artifact-root"], label: "--artifact-root" });
  if (fs.existsSync(consumerRoot)) throw new Error("--consumer-root must not already exist");
  if (!fs.statSync(path.join(repositoryRoot, "node_modules")).isDirectory()) throw new Error("node_modules must exist before preparing the consumer");

  fs.mkdirSync(consumerRoot, { recursive: true });
  run({ command: "git", args: ["init", "-b", syntheticBranch], cwd: consumerRoot });
  run({ command: "git", args: ["config", "user.email", "page-evidence-ci@example.invalid"], cwd: consumerRoot });
  run({ command: "git", args: ["config", "user.name", "StyleGallery page-evidence CI"], cwd: consumerRoot });
  run({ command: "git", args: ["remote", "add", "origin", `https://github.com/${syntheticRepository}.git`], cwd: consumerRoot });

  for (const reference of sourcePaths) {
    const destination = path.join(consumerRoot, reference);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(repositoryRoot, reference), destination, fs.constants.COPYFILE_EXCL);
  }
  fs.symlinkSync(path.join(repositoryRoot, "node_modules"), path.join(consumerRoot, "node_modules"), "dir");
  run({ command: "git", args: ["add", ...sourcePaths], cwd: consumerRoot });
  run({ command: "git", args: ["commit", "-m", "test: prepare consumer page evidence"], cwd: consumerRoot });

  const revision = run({ command: "git", args: ["rev-parse", "HEAD"], cwd: consumerRoot });
  const sourceFailures = [];
  const source = canonicalSourceManifest(consumerRoot, sourcePaths, sourceFailures);
  if (!source || sourceFailures.length > 0) throw new Error("source manifest failed: " + JSON.stringify(sourceFailures));
  const runId = process.env.GITHUB_RUN_ID ? "github-" + process.env.GITHUB_RUN_ID : "local-" + revision.slice(0, 12);
  const sessionId = "page-evidence-" + crypto.randomUUID();
  const scenarioId = "responsive-layout";
  const reference = (file) => path.relative(consumerRoot, file).split(path.sep).join("/");

  writeJson(recordFile, {
    claim_boundary: "Synthetic CI evidence for the copied consumer-conformance probe; not product certification.",
    consumer: {
      relevant_sources: sourcePaths,
      repository: syntheticRepository,
      revision,
    },
    id: "stylegallery-consumer-page-evidence-ci",
    page_evidence: {
      manifest: reference(path.join(artifactRoot, "page-evidence-manifest.json")),
      status: "applicable",
    },
    record_kind: "consumer_migration_conformance",
    scenarios: [{
      assertions: ["The selected responsive layout case passes its browser assertions."],
      argv: ["npx", "playwright", "test", "tests/consumer-conformance.spec.mjs", "--project=chromium", "--grep", "state-w1024-focus"],
      evidence_method: "browser",
      exit_code: 0,
      id: scenarioId,
      observable_actions: ["Render and capture state-w1024-focus in Chromium."],
      result_artifact: reference(path.join(artifactRoot, "runner", scenarioId + ".json")),
      run_id: runId,
      session_id: sessionId,
      source_digest: source.sha256,
    }],
    schema_version: "1.0",
  });
  return { artifactRoot, consumerRoot, recordFile, revision, sourceSha256: source.sha256 };
}

function verifySession(values) {
  const consumerRoot = containedPath({ base: temporaryRoot, candidate: values["consumer-root"], label: "--consumer-root" });
  const artifactRoot = containedPath({ base: consumerRoot, candidate: values["artifact-root"], label: "--artifact-root" });
  const receiptFile = path.join(artifactRoot, "page-evidence-session.json");
  const receipt = JSON.parse(fs.readFileSync(receiptFile, "utf8"));
  const expected = {
    branch: syntheticBranch,
    repository: syntheticRepository,
    revision: run({ command: "git", args: ["rev-parse", "HEAD"], cwd: consumerRoot }),
  };
  for (const [field, value] of Object.entries(expected)) {
    if (receipt[field] !== value) throw new Error(`page-evidence receipt ${field} must be ${value}, received ${receipt[field]}`);
  }
  return { ...expected, receiptFile };
}

function packagePacket(values) {
  const consumerRoot = containedPath({ base: temporaryRoot, candidate: values["consumer-root"], label: "--consumer-root" });
  const artifactRoot = containedPath({ base: consumerRoot, candidate: values["artifact-root"], label: "--artifact-root" });
  const output = containedPath({ base: temporaryRoot, candidate: values.output, label: "--output" });
  const outputRelativeToConsumer = path.relative(consumerRoot, output);
  if (!outputRelativeToConsumer.startsWith("..") && !path.isAbsolute(outputRelativeToConsumer)) throw new Error("--output must be outside --consumer-root");
  if (!fs.statSync(artifactRoot).isDirectory()) throw new Error("--artifact-root must be a directory");
  if (fs.existsSync(output)) throw new Error("--output must not already exist");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.cpSync(artifactRoot, output, { errorOnExist: true, force: false, recursive: true });
  return { output };
}

function cleanup(values) {
  const consumerRoot = containedPath({ base: temporaryRoot, candidate: values["consumer-root"], label: "--consumer-root" });
  if (fs.existsSync(consumerRoot)) {
    const stat = fs.lstatSync(consumerRoot);
    if (!stat.isDirectory() || stat.isSymbolicLink() || fs.realpathSync(consumerRoot) !== consumerRoot) throw new Error("--consumer-root must be a real directory before cleanup");
  }
  fs.rmSync(consumerRoot, { force: true, recursive: true });
  return { consumerRoot };
}

try {
  const { command, values } = parseArguments();
  const result = command === "prepare" ? prepare(values) : command === "verify-session" ? verifySession(values) : command === "package" ? packagePacket(values) : cleanup(values);
  process.stdout.write(JSON.stringify({ command, ok: true, ...result }, null, 2) + "\n");
} catch (error) {
  process.stderr.write((error instanceof Error ? error.message : String(error)) + "\n");
  process.exitCode = 1;
}
