#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  canonicalIntended,
  canonicalSourceManifest,
  dirtyRelevantSources,
  sha256,
} from "./capture-session-contract.mjs";
import { compileSchemas } from "./component-state-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = {
  json: false,
  output: undefined,
  profileRoot: path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local"),
};
const failures = [];

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") options.json = true;
  else if (["--output", "--root"].includes(argument)) {
    const value = process.argv[index + 1];
    if (!value) failures.push({ code: "argument_value_required", message: `${argument} requires a value`, path: "<cli>" });
    else {
      if (argument === "--output") options.output = path.resolve(value);
      if (argument === "--root") options.profileRoot = path.resolve(value);
      index += 1;
    }
  } else failures.push({ code: "argument_unknown", message: `unsupported argument ${argument}`, path: "<cli>" });
}

if (!options.output) failures.push({ code: "argument_value_required", message: "--output is required", path: "<cli>" });
else if (path.basename(options.output) !== "capture-session.json") failures.push({ code: "capture_session_path_invalid", message: "receipt filename must be capture-session.json", path: options.output });
else if (fs.existsSync(options.output)) failures.push({ code: "capture_session_replay", message: "capture session receipt already exists and cannot be overwritten", path: options.output });

function git(...args) {
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim();
}

const executable = chromium.executablePath();
const revisionSegment = executable.split(path.sep).find((segment) => /^chromium(?:_headless_shell)?-\d+$/.test(segment));
const packageJson = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));
const intended = canonicalIntended(options.profileRoot, failures);
const revision = git("rev-parse", "HEAD");
if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== revision) failures.push({ code: "capture_revision_mismatch", message: `GITHUB_SHA ${process.env.GITHUB_SHA} does not match checked-out HEAD ${revision}`, path: repositoryRoot });
let source;
try {
  source = canonicalSourceManifest(repositoryRoot, options.profileRoot);
  const dirty = dirtyRelevantSources(repositoryRoot, options.profileRoot);
  if (dirty.length > 0) failures.push({ code: "capture_source_dirty", message: `relevant capture sources must be committed: ${dirty.join(", ")}`, path: repositoryRoot });
} catch (error) {
  failures.push({ code: "capture_source_unreadable", message: error instanceof Error ? error.message : String(error), path: options.profileRoot });
}
const receipt = {
  attempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? 1),
  branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || git("branch", "--show-current") || "detached",
  environment: {
    browser: execFileSync(executable, ["--version"], { encoding: "utf8" }).trim(),
    browser_revision: revisionSegment ?? path.basename(executable),
    container_image: process.env.SENTINEL_CONTAINER_IMAGE ?? `local-host:${os.release()}`,
    kind: "browser",
    lockfile_sha256: sha256(fs.readFileSync(path.join(repositoryRoot, "package-lock.json"))),
    node: process.version,
    platform: process.platform === "linux" && process.arch === "x64" ? "linux/amd64" : `${process.platform}/${process.arch}`,
    playwright: packageJson.devDependencies["@playwright/test"],
    viewport: "1024x768",
  },
  intended,
  nonce: crypto.randomBytes(32).toString("hex"),
  record_kind: "component_state_capture_session",
  repository: process.env.GITHUB_REPOSITORY ?? "changeroa/StyleGallery",
  revision,
  schema_version: "1.0",
  session_id: crypto.randomUUID(),
  source,
  started_at: new Date().toISOString(),
};

const schemas = compileSchemas(path.join(repositoryRoot, "consumer-reference/schema"));
if (!schemas.capture(receipt)) {
  for (const error of schemas.capture.errors ?? []) failures.push({ code: "capture_session_schema_invalid", message: `${error.instancePath || "/"} ${error.message}`, path: options.output ?? "<cli>" });
}
if (failures.length === 0) {
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(receipt, null, 2)}\n`);
}
const result = { failures, intendedArtifacts: intended.reduce((sum, profile) => sum + profile.scenarios.reduce((count, scenario) => count + scenario.channels.length, 0), 0), ok: failures.length === 0, receipt: options.output };
if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else if (result.ok) process.stdout.write(`created component-state capture session ${receipt.session_id}\n`);
else process.stderr.write(`${failures.map((failure) => `${failure.code}: ${failure.path}: ${failure.message}`).join("\n")}\n`);
if (!result.ok) process.exitCode = 1;
