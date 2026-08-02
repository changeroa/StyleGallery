#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  CAPTURE_MAX_BYTES,
  EvidenceCaptureError,
  resolveEvidenceCapture,
  resolveSharedEvidenceCapture,
} from "./evidence-capture-contract.mjs";

const CAPTURE_DIRECTORY = "design-engineering/reference-profiles/governed-local/captures";
const sha256 = (bytes) => `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
const stable = (value) => JSON.stringify(value, null, 2) + "\n";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-capture-contract-"));
  const captureRoot = path.join(root, CAPTURE_DIRECTORY);
  fs.mkdirSync(captureRoot, { recursive: true });
  const sourceFiles = [{ byte_length: 2, path: "package.json", sha256: `sha256:${"1".repeat(64)}` }];
  const source = { files: sourceFiles, sha256: sha256(Buffer.from(JSON.stringify(sourceFiles))) };
  const environment = {
    browser: "chromium", browser_revision: "1228", container_image: "none", kind: "browser",
    lockfile_sha256: `sha256:${"3".repeat(64)}`, node: "v22.18.0", platform: "darwin-arm64",
    playwright: "1.61.0", viewport: "1024x768",
  };
  const session = {
    attempt: 1, branch: "task", environment, nonce: "4".repeat(64), receipt_sha256: `sha256:${"5".repeat(64)}`,
    revision: "6".repeat(40), session_id: "12345678-1234-4123-8123-123456789abc", source,
    started_at: "2026-07-31T00:00:00.000Z",
  };
  const run = { attempt: 1, id: session.session_id, repository: "local/StyleGallery", revision: session.revision, source: "local" };
  const capture = {
    schema_version: "2.0", record_kind: "component_capture", capture_id: `sha256:${"7".repeat(64)}`,
    profile_id: "shared-component-state", environment, run, session,
  };
  const bytes = Buffer.from(stable(capture));
  const digest = sha256(bytes);
  const reference = {
    byte_length: bytes.length,
    path: `${CAPTURE_DIRECTORY}/sha256-${digest.slice(7)}.capture.json`,
    sha256: digest,
  };
  fs.writeFileSync(path.join(root, reference.path), bytes);
  const consumers = ["editorial-reference-profile", "terminal-reference-profile", "runtime-manifest"].map((owner) => ({
    capture_id: capture.capture_id, owner, reference: structuredClone(reference),
  }));
  return { bytes, capture, consumers, environment, reference, root, run, session, source };
}

function code(action) {
  try { action(); } catch (error) {
    assert(error instanceof EvidenceCaptureError, `unexpected error: ${error}`);
    return error.code;
  }
  return undefined;
}

function rewrite(root, capture, reference, transform = (value) => value) {
  const next = transform(structuredClone(capture));
  const bytes = Buffer.from(stable(next));
  const digest = sha256(bytes);
  const nextReference = { byte_length: bytes.length, path: `${CAPTURE_DIRECTORY}/sha256-${digest.slice(7)}.capture.json`, sha256: digest };
  fs.writeFileSync(path.join(root, nextReference.path), bytes);
  return { capture: next, reference: nextReference };
}

function shared(input, overrides = {}) {
  return resolveSharedEvidenceCapture({
    consumers: input.consumers,
    expectedEnvironment: input.environment,
    expectedRun: input.run,
    expectedSession: input.session,
    expectedSource: input.source,
    repositoryRoot: input.root,
    ...overrides,
  });
}

test("one content-addressed capture resolves for both profiles and the runtime manifest", () => {
  const input = fixture();
  try {
    const resolved = shared(input);
    assert.equal(resolved.consumers.length, 3);
    assert.equal(resolved.reference.path, input.reference.path);
    assert.equal(resolved.actual.sha256, sha256(input.bytes));
    assert.equal(resolved.actual.byte_length, input.bytes.length);
    assert.deepEqual(resolved.capture, input.capture);
    assert.deepEqual(resolved.use().capture, input.capture, "use-time validation must return the same joined capture");
    const reordered = shared(input, { consumers: [...input.consumers].reverse() });
    assert.deepEqual(reordered.capture, input.capture, "owner-set closure must be independent of consumer ordering");
  } finally { fs.rmSync(input.root, { recursive: true, force: true }); }
});

test("editorial-only capture consumers fail closed with the missing-owner code", () => {
  const input = fixture();
  try {
    const consumers = input.consumers.filter((consumer) => consumer.owner === "editorial-reference-profile");
    assert.equal(code(() => shared(input, { consumers })), "capture_owner_missing");
  } finally { fs.rmSync(input.root, { recursive: true, force: true }); }
});

test("an arbitrary sole capture owner fails closed with the unknown-owner code", () => {
  const input = fixture();
  try {
    const consumers = [{ ...structuredClone(input.consumers[0]), owner: "arbitrary-owner" }];
    assert.equal(code(() => shared(input, { consumers })), "capture_owner_unknown");
  } finally { fs.rmSync(input.root, { recursive: true, force: true }); }
});

test("omitting terminal capture ownership fails closed", () => {
  const input = fixture();
  try {
    const consumers = input.consumers.filter((consumer) => consumer.owner !== "terminal-reference-profile");
    assert.equal(code(() => shared(input, { consumers })), "capture_owner_missing");
  } finally { fs.rmSync(input.root, { recursive: true, force: true }); }
});

test("omitting runtime-manifest capture ownership fails closed", () => {
  const input = fixture();
  try {
    const consumers = input.consumers.filter((consumer) => consumer.owner !== "runtime-manifest");
    assert.equal(code(() => shared(input, { consumers })), "capture_owner_missing");
  } finally { fs.rmSync(input.root, { recursive: true, force: true }); }
});

test("an extra unknown owner fails before shared capture acceptance", () => {
  const input = fixture();
  try {
    const consumers = [...input.consumers, { ...structuredClone(input.consumers[0]), owner: "unknown-owner" }];
    assert.equal(code(() => shared(input, { consumers })), "capture_owner_unknown");
  } finally { fs.rmSync(input.root, { recursive: true, force: true }); }
});

test("unsafe paths fail without reading outside the governed capture root", () => {
  const input = fixture();
  try {
    const outside = path.join(input.root, "outside.capture.json");
    fs.writeFileSync(outside, "outside-secret");
    const attempts = ["../outside.capture.json", `${CAPTURE_DIRECTORY}/../outside.capture.json`, path.resolve(outside), "design-engineering\\reference-profiles\\governed-local\\captures\\bad.capture.json"];
    for (const unsafe of attempts) {
      assert.equal(code(() => resolveEvidenceCapture({ reference: { ...input.reference, path: unsafe }, repositoryRoot: input.root })), "capture_path_escape");
    }
    assert.equal(fs.readFileSync(outside, "utf8"), "outside-secret");
  } finally { fs.rmSync(input.root, { recursive: true, force: true }); }
});

test("an ancestor-directory symlink fails with a stable no-follow code", () => {
  const input = fixture();
  try {
    const realGoverned = path.join(input.root, "real-governed");
    fs.renameSync(path.join(input.root, "design-engineering/reference-profiles/governed-local"), realGoverned);
    fs.symlinkSync(realGoverned, path.join(input.root, "design-engineering/reference-profiles/governed-local"), "dir");
    assert.equal(code(() => resolveEvidenceCapture({ reference: input.reference, repositoryRoot: input.root })), "capture_ancestor_symlink");
  } finally { fs.rmSync(input.root, { recursive: true, force: true }); }
});

test("a final-file symlink fails with a distinct stable no-follow code", () => {
  const input = fixture();
  try {
    const target = path.join(input.root, input.reference.path);
    const real = `${target}.real`;
    fs.renameSync(target, real);
    fs.symlinkSync(real, target, "file");
    assert.equal(code(() => resolveEvidenceCapture({ reference: input.reference, repositoryRoot: input.root })), "capture_file_symlink");
  } finally { fs.rmSync(input.root, { recursive: true, force: true }); }
});

test("canonical root redirects are rejected", () => {
  const input = fixture();
  const alias = `${input.root}-alias`;
  try {
    fs.symlinkSync(input.root, alias, "dir");
    assert.equal(code(() => resolveEvidenceCapture({ reference: input.reference, repositoryRoot: alias })), "capture_canonical_escape");
  } finally { fs.rmSync(alias, { force: true }); fs.rmSync(input.root, { recursive: true, force: true }); }
});

test("digest, filename digest, byte length, and bounded reads are enforced independently", () => {
  const input = fixture();
  try {
    assert.equal(code(() => resolveEvidenceCapture({ reference: { ...input.reference, sha256: `sha256:${"0".repeat(64)}` }, repositoryRoot: input.root })), "capture_filename_digest_mismatch");
    const target = path.join(input.root, input.reference.path);
    fs.writeFileSync(target, Buffer.concat([input.bytes, Buffer.from(" ")]));
    assert.equal(code(() => resolveEvidenceCapture({ reference: input.reference, repositoryRoot: input.root })), "capture_byte_length_mismatch");
    fs.writeFileSync(target, Buffer.alloc(input.bytes.length, 0x78));
    assert.equal(code(() => resolveEvidenceCapture({ reference: input.reference, repositoryRoot: input.root })), "capture_digest_mismatch");
    assert.equal(code(() => resolveEvidenceCapture({ reference: { ...input.reference, byte_length: CAPTURE_MAX_BYTES + 1 }, repositoryRoot: input.root })), "capture_byte_length_bounds");
  } finally { fs.rmSync(input.root, { recursive: true, force: true }); }
});

test("source, session, run, environment, and shared identity joins have stable failures", () => {
  const cases = [
    ["expectedSource", (input) => ({ ...input.source, sha256: `sha256:${"8".repeat(64)}` }), "capture_source_drift"],
    ["expectedSession", (input) => ({ ...input.session, session_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }), "capture_session_mismatch"],
    ["expectedRun", (input) => ({ ...input.run, id: "other" }), "capture_run_mismatch"],
    ["expectedEnvironment", (input) => ({ ...input.environment, platform: "other" }), "capture_environment_mismatch"],
  ];
  for (const [key, mutate, expected] of cases) {
    const input = fixture();
    try { assert.equal(code(() => shared(input, { [key]: mutate(input) })), expected); }
    finally { fs.rmSync(input.root, { recursive: true, force: true }); }
  }
  const input = fixture();
  try {
    const bad = structuredClone(input.consumers); bad[0].capture_id = `sha256:${"9".repeat(64)}`;
    assert.equal(code(() => shared(input, { consumers: bad })), "capture_identity_mismatch");
  } finally { fs.rmSync(input.root, { recursive: true, force: true }); }
});

test("duplicate or second references and cross-capture artifact mixes fail before acceptance", () => {
  const input = fixture();
  try {
    assert.equal(code(() => shared(input, { consumers: [...input.consumers, structuredClone(input.consumers[0])] })), "capture_consumer_duplicate");
    const second = rewrite(input.root, input.capture, input.reference, (capture) => { capture.capture_id = `sha256:${"a".repeat(64)}`; return capture; });
    const mixedConsumers = structuredClone(input.consumers);
    mixedConsumers[1] = { capture_id: second.capture.capture_id, owner: mixedConsumers[1].owner, reference: second.reference };
    assert.equal(code(() => shared(input, { consumers: mixedConsumers })), "capture_reference_multiple");
    assert.equal(code(() => shared(input, { artifactCaptureIds: [input.capture.capture_id, second.capture.capture_id] })), "capture_artifact_mix");
  } finally { fs.rmSync(input.root, { recursive: true, force: true }); }
});

test("replacement of an authenticated path before use fails use-time revalidation", () => {
  const input = fixture();
  try {
    const resolved = shared(input);
    const target = path.join(input.root, input.reference.path);
    const replacement = `${target}.replacement`;
    fs.writeFileSync(replacement, Buffer.alloc(input.bytes.length, 0x79));
    fs.renameSync(replacement, target);
    assert.equal(code(() => resolved.use()), "capture_file_replaced");
  } finally { fs.rmSync(input.root, { recursive: true, force: true }); }
});

test("FIFO substitution is rejected without polling or blocking", { skip: process.platform === "win32" }, () => {
  const input = fixture();
  try {
    const target = path.join(input.root, input.reference.path);
    fs.rmSync(target);
    const result = spawnSync("mkfifo", [target], { stdio: "ignore", timeout: 2_000 });
    assert.equal(result.status, 0);
    assert.equal(code(() => resolveEvidenceCapture({ reference: input.reference, repositoryRoot: input.root })), "capture_file_type_invalid");
  } finally { fs.rmSync(input.root, { recursive: true, force: true }); }
});

test("cancellation is bounded and a later independent resolution resumes cleanly", () => {
  const input = fixture();
  try {
    const controller = new AbortController();
    controller.abort();
    assert.equal(code(() => resolveEvidenceCapture({ reference: input.reference, repositoryRoot: input.root, signal: controller.signal })), "capture_cancelled");
    assert.deepEqual(resolveEvidenceCapture({ reference: input.reference, repositoryRoot: input.root }).capture, input.capture);
  } finally { fs.rmSync(input.root, { recursive: true, force: true }); }
});
