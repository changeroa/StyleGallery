#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  canonicalSourceManifest,
  repositoryGitArgs,
  sourceManifestMatches,
} from "./capture-session-contract.mjs";
import { compileSchemas } from "./component-state-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profileRoot = path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local");
const schemaRoot = path.join(repositoryRoot, "consumer-reference/schema");
const first = canonicalSourceManifest(repositoryRoot, profileRoot);
const second = canonicalSourceManifest(repositoryRoot, profileRoot);

assert.equal(first.sha256, second.sha256, "source manifest digest must be deterministic");
assert.deepEqual(first.files, second.files, "source manifest files must be stable");
assert(first.files.some((entry) => entry.path === "tests/component-state-evidence.spec.mjs"), "capture browser code must be bound");
assert(first.files.some((entry) => entry.path === "playwright.config.mjs"), "Playwright capture configuration must be bound");
assert(first.files.some((entry) => entry.path === "package.json"), "capture dependency declarations must be bound");
assert(first.files.some((entry) => entry.path === "package-lock.json"), "exact capture dependencies must be bound");
assert(first.files.some((entry) => entry.path === "scripts/artifact-metadata.mjs"), "capture artifact metadata code must be bound");
assert(first.files.some((entry) => entry.path === "scripts/visual-expectation-contract.mjs"), "visual expectation selection must be bound");
assert(!first.files.some((entry) => entry.path === "scripts/finalize-component-state-evidence.mjs"), "post-capture finalization must not invalidate captured source identity");
assert(!first.files.some((entry) => entry.path === "scripts/validate-component-state.mjs"), "post-capture enforcement must not invalidate captured source identity");
assert(first.files.some((entry) => entry.path.endsWith("/profile.json")), "profile declarations must be bound");
assert(first.files.some((entry) => entry.path.endsWith("/tokens.dtcg.json")), "profile token inputs must be bound");
assert.equal(sourceManifestMatches(first, repositoryRoot, profileRoot), true, "canonical source manifest must match itself");
const revisionArgs = repositoryGitArgs(repositoryRoot, "rev-parse", "HEAD");
assert.deepEqual(revisionArgs, ["-c", `safe.directory=${repositoryRoot}`, "rev-parse", "HEAD"], "repository Git trust must be scoped to the exact checkout");
assert.equal(
  execFileSync("git", revisionArgs, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, GIT_TEST_ASSUME_DIFFERENT_OWNER: "1" },
  }).trim(),
  execFileSync("git", revisionArgs, { cwd: repositoryRoot, encoding: "utf8" }).trim(),
  "repository Git reads must trust only the exact checkout when container ownership differs",
);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-source-contract-"));
try {
  const copiedProfiles = path.join(tempRoot, "profiles");
  const copiedRepository = path.join(tempRoot, "repository");
  fs.cpSync(profileRoot, copiedProfiles, { recursive: true });
  for (const entry of first.files.filter((candidate) => !candidate.path.startsWith("profiles/"))) {
    const source = path.join(repositoryRoot, entry.path);
    const target = path.join(copiedRepository, entry.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  const copied = canonicalSourceManifest(copiedRepository, copiedProfiles);
  assert.equal(copied.sha256, first.sha256, "profile-root location must not change the source digest");
  const tokenFile = path.join(copiedProfiles, "editorial/tokens.dtcg.json");
  fs.appendFileSync(tokenFile, "\n");
  assert.equal(sourceManifestMatches(copied, copiedRepository, copiedProfiles), false, "profile source drift must invalidate the manifest");
  fs.copyFileSync(path.join(profileRoot, "editorial/tokens.dtcg.json"), tokenFile);
  const configFile = path.join(copiedRepository, "playwright.config.mjs");
  const config = fs.readFileSync(configFile, "utf8").replace("viewport: { height: 768, width: 1024 },", "deviceScaleFactor: 2,\n    viewport: { height: 768, width: 1024 },");
  fs.writeFileSync(configFile, config);
  assert.equal(sourceManifestMatches(copied, copiedRepository, copiedProfiles), false, "deviceScaleFactor drift must invalidate the source manifest before it can double screenshot pixels");

  const copiedSchemas = path.join(tempRoot, "schemas");
  fs.cpSync(schemaRoot, copiedSchemas, { recursive: true });
  const captureSchema = path.join(copiedSchemas, "capture-session.schema.json");
  const schemaSource = fs.readFileSync(captureSchema, "utf8");
  fs.writeFileSync(captureSchema, schemaSource.replace('"title":', '"title": "shadowed title",\n  "title":'));
  assert.throws(
    () => compileSchemas(copiedSchemas),
    (error) => error?.code === "component_schema_json_invalid" && error?.path === captureSchema,
    "duplicate component schema properties must fail strict compilation with a named error",
  );
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

process.stdout.write(`${JSON.stringify({ files: first.files.length, ok: true, sha256: first.sha256 }, null, 2)}\n`);
