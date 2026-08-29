#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { canonicalize } from "../canonical-json.mjs";
import { parseStableRef } from "../identity.mjs";
import { materialAdmissionPolicy } from "./material-admission.mjs";
import {
  materialIdentityForRecord,
  parseMaterialStableRef,
} from "./material-identity.mjs";
import { createMaterialOperationRegistry } from "./material-operation-registry.mjs";
import {
  MATERIAL_GET_MAX_BYTES,
  MATERIAL_QUERY_MAX_BYTES,
  MATERIAL_SEARCH_WEIGHTS,
  materialGet,
  materialSearch,
  tokenizeMaterialText,
} from "./material-queries.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const manifestPath = path.join(repositoryRoot, "consumer-reference/agent-native/v2/material-registry.json");
const v1RegistryPath = path.join(repositoryRoot, "consumer-reference/agent-native/registry.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const registry = createMaterialOperationRegistry({ repositoryRoot });
const invoke = (operation, input = {}) => registry.invoke(operation, input);
const code = (result) => result.failures?.[0]?.code;
const recordForPath = (repositoryPath) => manifest.materials.find((record) => record.repository_path === repositoryPath);

function runGit(root, args) {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", timeout: 30_000 });
  assert.equal(result.status, 0, result.stderr);
}
function temporaryRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-material-query-"));
  for (const route of materialAdmissionPolicy.allowed_materials) {
    const source = path.join(repositoryRoot, ...route.repository_path.split("/"));
    const target = path.join(root, ...route.repository_path.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  const targetManifest = path.join(root, "consumer-reference/agent-native/v2/material-registry.json");
  fs.mkdirSync(path.dirname(targetManifest), { recursive: true });
  fs.copyFileSync(manifestPath, targetManifest);
  runGit(root, ["init", "-q"]);
  runGit(root, ["add", "."]);
  return root;
}
function assertStableFailure(result, expectedCode, ...secrets) {
  assert.equal(result.ok, false);
  assert.equal(code(result), expectedCode);
  const bytes = canonicalize(result);
  assert.doesNotMatch(bytes, /repository_path|\.md|---|# |cause|details|stack/);
  for (const secret of secrets) assert.equal(bytes.includes(secret), false);
}
function rebindSources(root, repositoryPaths) {
  const target = path.join(root, "consumer-reference/agent-native/v2/material-registry.json");
  const value = JSON.parse(fs.readFileSync(target, "utf8"));
  for (const repositoryPath of repositoryPaths) {
    const record = value.materials.find((entry) => entry.repository_path === repositoryPath);
    const bytes = fs.readFileSync(path.join(root, repositoryPath));
    record.source_sha256 = sha256(bytes);
    record.byte_length = bytes.byteLength;
    record.version_id = `${record.stable_ref}@sha256:${record.source_sha256}`;
  }
  const payload = { ...value };
  delete payload.version_id;
  value.version_id = `${value.stable_ref}@sha256:${sha256(Buffer.from(canonicalize(payload), "utf8"))}`;
  fs.writeFileSync(target, canonicalize(value));
  runGit(root, ["add", "."]);
}
function replaceWithCopy(target) {
  const replacement = `${target}.replacement`;
  fs.copyFileSync(target, replacement);
  fs.unlinkSync(target);
  fs.renameSync(replacement, target);
}

test("v2 identity grammar is closed and v1 rejects every v2 kind", () => {
  for (const reference of [
    "sg:domain/layout",
    "sg:page/path-sha256-" + "a".repeat(64),
    "sg:pattern/path-sha256-" + "b".repeat(64),
    "sg:material/path-sha256-" + "c".repeat(64),
  ]) {
    assert.equal(parseMaterialStableRef(reference).schema_version, "2.0");
    assert.throws(() => parseStableRef(reference), { code: "stable_ref_invalid" });
  }
  for (const reference of ["sg:domain/unknown", "sg:domain/Layout", "sg:page/foo", "sg:material/path-sha256-abc", "sg:domain/layout@sha256:" + "a".repeat(64), "sg:v1/domain/layout"])
    assert.throws(() => parseMaterialStableRef(reference), { code: "material_stable_ref_invalid" });
  assert.throws(() => parseMaterialStableRef({ schema_version: "1.0", stable_ref: "sg:domain/layout" }), { code: "material_identity_version_invalid" });
});

test("material-discover returns exactly the six governed domains and deterministic projected identities", () => {
  const first = invoke("material-discover");
  const second = invoke("material-discover");
  assert.equal(first.ok, true);
  assert.equal(canonicalize(first), canonicalize(second));
  assert.deepEqual(first.result.domains.map(({ identity }) => identity.stable_ref), [
    "sg:domain/design-engineering", "sg:domain/game-ui", "sg:domain/layout", "sg:domain/motion", "sg:domain/platform-guides", "sg:domain/state-management",
  ]);
  const layout = recordForPath("layout/index.md");
  const page = recordForPath("patterns/index.md");
  const pattern = recordForPath("patterns/centering/center.md");
  const statePattern = recordForPath("state-management/patterns/derivation/derived-state.md");
  assert.equal(materialIdentityForRecord(layout).stable_ref, "sg:domain/layout");
  assert.equal(materialIdentityForRecord(page).kind, "page");
  assert.equal(materialIdentityForRecord(pattern).kind, "pattern");
  assert.equal(materialIdentityForRecord(statePattern).kind, "pattern");
  assert.equal(materialIdentityForRecord(pattern).stable_ref, materialIdentityForRecord(pattern).stable_ref);
  assert.equal(materialIdentityForRecord(pattern).source_ref, pattern.stable_ref);
});

test("search normalization preserves attached Unicode marks and delimits standalone marks", () => {
  assert.deepEqual(tokenizeMaterialText("ＦＯＯ１２３, foo!"), ["foo123", "foo"]);
  assert.deepEqual(tokenizeMaterialText("Cafe\u0301 CAFÉ"), ["café", "café"]);
  assert.deepEqual(tokenizeMaterialText("布局。東京"), ["布局", "東京"]);
  assert.deepEqual(tokenizeMaterialText("𝔘nicode 𐐀𐐨"), ["unicode", "𐐨𐐨"]);
  assert.deepEqual(tokenizeMaterialText("कि की"), ["कि", "की"]);
  assert.notEqual(tokenizeMaterialText("कि")[0], tokenizeMaterialText("की")[0]);
  assert.deepEqual(tokenizeMaterialText("عَرَبِيّ"), ["عَرَبِيّ"]);
  assert.deepEqual(tokenizeMaterialText("\u0301alpha \u0300 beta"), ["alpha", "beta"]);
  for (const query of ["布局", "Cafe\u0301", "कि", "की", "عَرَبِيّ", "𝔘nicode", "𐐀𐐨"]) {
    const first = invoke("material-search", { query, limit: 10 });
    const second = invoke("material-search", { query, limit: 10 });
    assert.equal(first.ok, true);
    assert.equal(canonicalize(first), canonicalize(second));
  }
  const plain = invoke("material-search", { query: "Layout", limit: 10 });
  const normalized = invoke("material-search", { query: "ＬＡＹＯＵＴ!!!", limit: 10 });
  assert.equal(canonicalize(plain.result.results), canonicalize(normalized.result.results));
});

test("known Layout ranking uses title=16 path=8 body=1 unique-token field membership", () => {
  const response = invoke("material-search", { query: "Layout", limit: 100 });
  assert.equal(response.ok, true);
  assert.deepEqual(response.result.weights, MATERIAL_SEARCH_WEIGHTS);
  assert.equal(response.result.results[0].identity.stable_ref, "sg:domain/layout");
  const layout = response.result.results.find(({ identity }) => identity.stable_ref === "sg:domain/layout");
  const source = fs.readFileSync(path.join(repositoryRoot, "layout/index.md"), "utf8");
  const title = /^(?:title:\s*|#{1,6}\s+)(.+)$/m.exec(source)[1];
  const expected = Number(new Set(tokenizeMaterialText(title)).has("layout")) * 16
    + Number(new Set(tokenizeMaterialText("layout/index.md")).has("layout")) * 8
    + Number(new Set(tokenizeMaterialText(source)).has("layout"));
  assert.equal(layout.score, expected);
  assert.equal(layout.score, 25);
  assert.deepEqual(layout.match_counts, { title: 1, path: 1, body: 1 });
});

test("paths-only search preserves ranking while projecting repository-relative paths", () => {
  const standard = invoke("material-search", { query: "Layout", limit: 5 });
  const projected = invoke("material-search", { query: "Layout", limit: 5, paths_only: true });
  assert.equal(projected.ok, true);
  assert.equal(projected.result.paths_only, true);
  assert.equal(Object.hasOwn(projected.result, "results"), false);
  assert.deepEqual(projected.result.paths, standard.result.results.map(({ identity }) => {
    const record = manifest.materials.find((candidate) => candidate.stable_ref === identity.source_ref || candidate.stable_ref === identity.stable_ref);
    assert(record);
    return record.repository_path;
  }));
  assert.ok(projected.result.paths.every((candidate) => !path.isAbsolute(candidate) && !candidate.split("/").includes("..")));
  assert.equal(canonicalize(projected), canonicalize(invoke("material-search", { paths_only: true, limit: 5, query: "Layout" })));
  assert.equal(Object.hasOwn(invoke("material-search", { query: "Layout", paths_only: false }).result, "paths_only"), false);
  assertStableFailure(invoke("material-search", { query: "Layout", paths_only: "true" }), "material_paths_only_invalid");
});

test("public domain leaf queries resolve to npm-portable repository paths", () => {
  const cases = [
    ["interface craft critique", "design-engineering/interface-craft.md"],
    ["game screen hierarchy", "game-ui/screen-hierarchy.md"],
    ["unity architecture", "game-ui/unity/architecture.md"],
    ["unity cli loop", "game-ui/unity/cli-loop.md"],
    ["motion review workflow", "motion/review-workflow.md"],
    ["Apple interaction", "platform-guides/apple-interaction.md"],
  ];
  for (const [query, expected] of cases) {
    const response = invoke("material-search", { query, limit: 5, paths_only: true });
    assert.equal(response.ok, true);
    assert.equal(response.result.paths[0], expected, query);
  }
});

test("duplicate query and field occurrences are idempotent", () => {
  const single = invoke("material-search", { query: "layout", limit: 100 }).result;
  const duplicate = invoke("material-search", { query: "layout layout layout", limit: 100 }).result;
  assert.equal(canonicalize(single.results), canonicalize(duplicate.results));
  assert.deepEqual(duplicate.scoring_tokens, ["layout"]);
  assert.equal(single.results.find(({ identity }) => identity.stable_ref === "sg:domain/layout").match_counts.body, 1);
});

test("synthetic equal scores tie strictly by projected StableRef", () => {
  const root = temporaryRepository();
  try {
    const paths = ["motion/index.md", "game-ui/index.md"];
    for (const repositoryPath of paths) fs.appendFileSync(path.join(root, repositoryPath), "\nzzztietoken\nzzztietoken\n");
    rebindSources(root, paths);
    const results = createMaterialOperationRegistry({ repositoryRoot: root }).invoke("material-search", { query: "zzztietoken", limit: 10 }).result.results;
    assert.equal(results.length, 2);
    assert.equal(results[0].score, 1);
    assert.equal(results[1].score, 1);
    assert.ok(results[0].identity.stable_ref < results[1].identity.stable_ref);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("raw UTF-8 query cap has exact boundaries and oversized precedes token-empty", () => {
  const absent = path.join(os.tmpdir(), "stylegallery-absent-" + process.pid);
  assert.throws(() => materialSearch({ repositoryRoot: absent, input: { query: "" } }), { code: "material_query_empty" });
  assert.throws(() => materialSearch({ repositoryRoot: absent, input: { query: "---" } }), { code: "material_query_empty" });
  for (const query of [" ".repeat(4097), "!".repeat(4097), "Ａ".repeat(1366), "\u0301".repeat(2049)]) {
    assert.ok(Buffer.byteLength(query, "utf8") > MATERIAL_QUERY_MAX_BYTES);
    assert.throws(() => materialSearch({ repositoryRoot: absent, input: { query } }), { code: "material_query_oversized" });
  }
  assert.throws(() => materialSearch({ repositoryRoot: absent, input: { query: "a".repeat(4096) } }), { code: "material_repository_invalid" });
  assert.throws(() => materialSearch({ repositoryRoot: absent, input: { query: "é".repeat(2048) } }), { code: "material_repository_invalid" });
  assert.throws(() => materialSearch({ repositoryRoot: absent, input: { query: " ".repeat(4096) } }), { code: "material_query_empty" });
  assert.throws(() => materialSearch({ repositoryRoot: absent, input: { query: "\u0301".repeat(2048) } }), { code: "material_query_empty" });
  for (const limit of [0, 101, 1.5, "2"])
    assert.throws(() => materialSearch({ repositoryRoot: absent, input: { query: "layout", limit } }), { code: "material_search_limit_invalid" });
});

test("material-get returns exact manifest-bound UTF-8 bytes and deterministic pages", () => {
  const record = recordForPath("layout/index.md");
  const identity = materialIdentityForRecord(record);
  const source = fs.readFileSync(path.join(repositoryRoot, record.repository_path));
  const first = invoke("material-get", { reference: identity.stable_ref, offset: 0, length: 1024 });
  assert.equal(first.ok, true);
  assert.deepEqual(Buffer.from(first.result.bytes_base64, "base64"), source.subarray(0, 1024));
  assert.equal(Buffer.from(first.result.content, "utf8").equals(source.subarray(0, 1024)), true);
  assert.equal(first.result.source.source_sha256, sha256(source));
  const second = invoke("material-get", { reference: identity.stable_ref, offset: first.result.next_offset, length: 1024 });
  const secondAgain = invoke("material-get", { reference: identity.stable_ref, offset: first.result.next_offset, length: 1024 });
  assert.equal(canonicalize(second), canonicalize(secondAgain));
  const pages = [];
  let offset = 0;
  while (offset < source.byteLength) {
    let end = Math.min(source.byteLength, offset + 1024);
    while (end < source.byteLength && (source[end] & 0xc0) === 0x80) end -= 1;
    const page = invoke("material-get", { reference: identity.stable_ref, offset, length: end - offset });
    assert.equal(page.ok, true);
    pages.push(Buffer.from(page.result.bytes_base64, "base64"));
    offset = page.result.next_offset ?? source.byteLength;
  }
  assert.deepEqual(Buffer.concat(pages), source);
  const bySourceRef = invoke("material-get", { reference: record.stable_ref, offset: 0, length: 1024 });
  assert.equal(canonicalize(bySourceRef.result), canonicalize(first.result));
});

test("get rejects malformed/ranged requests before data read and unknown refs without leakage", () => {
  const absent = path.join(os.tmpdir(), "stylegallery-absent-" + process.pid);
  for (const [input, expected] of [
    [{ reference: "layout/index.md" }, "material_reference_invalid"],
    [{ reference: "../layout/index.md" }, "material_reference_invalid"],
    [{ reference: ".omo/private.md" }, "material_reference_invalid"],
    [{ reference: "sg:domain/layout@sha256:" + "a".repeat(64) }, "material_reference_invalid"],
    [{ reference: "sg:domain/layout", offset: -1 }, "material_offset_invalid"],
    [{ reference: "sg:domain/layout", offset: 1.5 }, "material_offset_invalid"],
    [{ reference: "sg:domain/layout", offset: Number.MAX_SAFE_INTEGER, length: 2 }, "material_range_overflow"],
    [{ reference: "sg:domain/layout", length: 0 }, "material_length_invalid"],
    [{ reference: "sg:domain/layout", length: MATERIAL_GET_MAX_BYTES + 1 }, "material_length_invalid"],
    [{ reference: "sg:domain/layout", length: 1.5 }, "material_length_invalid"],
  ]) assert.throws(() => materialGet({ repositoryRoot: absent, input }), { code: expected });
  assertStableFailure(invoke("material-get", { reference: "sg:page/path-sha256-" + "f".repeat(64) }), "material_reference_not_found");
  assertStableFailure(invoke("material-get", { reference: "sg:domain/layout", offset: recordForPath("layout/index.md").byte_length + 1 }), "material_offset_past_end");
});

test("get rejects start and end boundaries that split multibyte UTF-8", () => {
  const candidate = manifest.materials.map((record) => ({ record, bytes: fs.readFileSync(path.join(repositoryRoot, record.repository_path)) }))
    .find(({ bytes }) => bytes.some((byte) => (byte & 0xc0) === 0x80));
  assert.ok(candidate);
  const continuation = candidate.bytes.findIndex((byte) => (byte & 0xc0) === 0x80);
  const start = invoke("material-get", { reference: candidate.record.stable_ref, offset: continuation, length: 1 });
  assertStableFailure(start, "material_utf8_split_start");
  const codePointStart = continuation - 1;
  const end = invoke("material-get", { reference: candidate.record.stable_ref, offset: codePointStart, length: 1 });
  assertStableFailure(end, "material_utf8_split_end");
});

test("get resolves metadata before source reads and reads only its target", () => {
  let reads = 0;
  const reader = (descriptor) => { reads += 1; return fs.readFileSync(descriptor); };
  assert.throws(() => materialGet({ repositoryRoot, input: { reference: "sg:page/path-sha256-" + "f".repeat(64) }, sourceReader: reader }), { code: "material_reference_not_found" });
  assert.equal(reads, 0);
  const result = materialGet({ repositoryRoot, input: { reference: "sg:domain/layout", length: 64 }, sourceReader: reader });
  assert.equal(result.length, 64);
  assert.equal(reads, 1);
});

test("unrelated drift does not suppress get; target drift, tracking, and symlinks fail", () => {
  const root = temporaryRepository();
  try {
    fs.appendFileSync(path.join(root, "patterns/grid-repetition/page-grid.md"), "unrelated drift");
    const sameRegistry = createMaterialOperationRegistry({ repositoryRoot: root });
    assert.equal(sameRegistry.invoke("material-get", { reference: "sg:domain/layout", length: 64 }).ok, true);
    assertStableFailure(sameRegistry.invoke("material-get", { reference: "sg:page/path-sha256-" + "f".repeat(64) }), "material_reference_not_found");
    assertStableFailure(sameRegistry.invoke("material-search", { query: "layout", limit: 5 }), "material_source_hash_mismatch");
    fs.appendFileSync(path.join(root, "layout/index.md"), "target drift");
    assertStableFailure(sameRegistry.invoke("material-get", { reference: "sg:domain/layout" }), "material_source_hash_mismatch");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
  for (const [mutate, expected] of [
    [(root, _target, relative) => runGit(root, ["rm", "--cached", "-q", "--", relative]), "material_path_untracked"],
    [(_root, target) => { fs.unlinkSync(target); fs.symlinkSync(path.join(repositoryRoot, "README.md"), target); }, "material_path_symlink"],
  ]) {
    const isolated = temporaryRepository();
    try {
      mutate(isolated, path.join(isolated, "layout/index.md"), "layout/index.md");
      assertStableFailure(createMaterialOperationRegistry({ repositoryRoot: isolated }).invoke("material-get", { reference: "sg:domain/layout" }), expected);
    } finally { fs.rmSync(isolated, { recursive: true, force: true }); }
  }
});

test("descriptor replacement races fail get and search without partial output", () => {
  for (const operation of ["material-get", "material-search"]) {
    const root = temporaryRepository();
    try {
      const firstPath = operation === "material-get" ? "layout/index.md" : manifest.materials[0].repository_path;
      let reads = 0;
      const sourceReader = (descriptor) => {
        reads += 1;
        const bytes = fs.readFileSync(descriptor);
        if (reads === 1) replaceWithCopy(path.join(root, firstPath));
        return bytes;
      };
      const raced = createMaterialOperationRegistry({ repositoryRoot: root, sourceReader }).invoke(operation,
        operation === "material-get" ? { reference: "sg:domain/layout" } : { query: "layout", limit: 5 });
      assertStableFailure(raced, "material_source_race", root, firstPath);
      assert.equal(Object.hasOwn(raced, "result"), false);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
});

test("public failures redact deployment paths, syscall text, caller values, and source names", () => {
  const missingRoot = path.join(os.tmpdir(), `private-deployment-${process.pid}-do-not-leak`);
  assertStableFailure(createMaterialOperationRegistry({ repositoryRoot: missingRoot }).invoke("material-discover"), "material_repository_invalid", missingRoot, "private-deployment");
  const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), "renamed-private-root-"));
  try {
    assertStableFailure(createMaterialOperationRegistry({ repositoryRoot: emptyRoot }).invoke("material-discover"), "material_registry_file_invalid", emptyRoot, "renamed-private-root");
  } finally { fs.rmSync(emptyRoot, { recursive: true, force: true }); }
  assertStableFailure(registry.invoke("secret/caller-operation", {}), "material_operation_unknown", "secret/caller-operation");
  const root = temporaryRepository();
  try {
    const target = path.join(root, "consumer-reference/agent-native/v2/material-registry.json");
    fs.writeFileSync(target, "{private malformed registry");
    assertStableFailure(createMaterialOperationRegistry({ repositoryRoot: root }).invoke("material-discover"), "material_registry_json_invalid", root, "private malformed registry");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
  const unreadableRoot = temporaryRepository();
  try {
    const secret = path.join(unreadableRoot, "layout/index.md");
    const sourceReader = () => { throw new Error(`EACCES: ${secret}`); };
    assertStableFailure(createMaterialOperationRegistry({ repositoryRoot: unreadableRoot, sourceReader }).invoke("material-get", { reference: "sg:domain/layout" }), "material_read_failed", unreadableRoot, secret, "EACCES");
  } finally { fs.rmSync(unreadableRoot, { recursive: true, force: true }); }
  const missingSourceRoot = temporaryRepository();
  try {
    const secret = path.join(missingSourceRoot, "layout/index.md");
    fs.unlinkSync(secret);
    assertStableFailure(createMaterialOperationRegistry({ repositoryRoot: missingSourceRoot }).invoke("material-get", { reference: "sg:domain/layout" }), "material_path_unavailable", missingSourceRoot, secret);
  } finally { fs.rmSync(missingSourceRoot, { recursive: true, force: true }); }
});

test("all v2 operations are read-only and invocation mutates neither registry nor source bodies", () => {
  assert.deepEqual(registry.operations.map(({ name }) => name), ["material-context", "material-discover", "material-get", "material-search"]);
  assert.ok(registry.operations.every(({ read_only, effect_class }) => read_only === true && effect_class === "NONE"));
  const beforeRegistry = fs.readFileSync(manifestPath);
  const beforeSources = manifest.materials.map(({ repository_path }) => sha256(fs.readFileSync(path.join(repositoryRoot, repository_path))));
  assert.equal(invoke("material-discover").ok, true);
  assert.equal(invoke("material-search", { query: "layout", limit: 3 }).ok, true);
  assert.equal(invoke("material-get", { reference: "sg:domain/layout", length: 64 }).ok, true);
  assert.deepEqual(fs.readFileSync(manifestPath), beforeRegistry);
  assert.deepEqual(manifest.materials.map(({ repository_path }) => sha256(fs.readFileSync(path.join(repositoryRoot, repository_path)))), beforeSources);
  assert.equal(sha256(fs.readFileSync(v1RegistryPath)), "70107a28225ee893b0d32df8e2a3c69bed747992bf7e92a0ca5431df4605d8b0");
});
