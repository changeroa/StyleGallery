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
import {
  countMaterialContextTokens,
  MATERIAL_CONTEXT_DEFAULT_TOKENS,
  materialContextCacheKey,
} from "./material-context.mjs";
import { materialAdmissionPolicy } from "./material-admission.mjs";
import { createMaterialOperationRegistry } from "./material-operation-registry.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const manifestPath = path.join(repositoryRoot, "consumer-reference/agent-native/v2/material-registry.json");
const v1Root = path.join(repositoryRoot, "consumer-reference/agent-native");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const registry = createMaterialOperationRegistry({ repositoryRoot });
const invoke = (input) => registry.invoke("material-context", input);
const code = (response) => response.failures?.[0]?.code;

function runGit(root, args) {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", timeout: 30_000 });
  assert.equal(result.status, 0, result.stderr);
}
function temporaryRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-material-context-"));
  for (const route of materialAdmissionPolicy.allowed_materials) {
    const target = path.join(root, route.repository_path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(repositoryRoot, route.repository_path), target);
  }
  const targetManifest = path.join(root, "consumer-reference/agent-native/v2/material-registry.json");
  fs.mkdirSync(path.dirname(targetManifest), { recursive: true });
  fs.copyFileSync(manifestPath, targetManifest);
  runGit(root, ["init", "-q"]);
  runGit(root, ["add", "."]);
  return root;
}
function rebind(root, repositoryPaths) {
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
function stableFailure(response, expectedCode, ...secrets) {
  assert.equal(response.ok, false);
  assert.equal(code(response), expectedCode);
  const bytes = canonicalize(response);
  assert.doesNotMatch(bytes, /\.md|cause|details|stack/);
  for (const secret of secrets) assert.equal(bytes.includes(secret), false);
}
function refs(response) {
  return response.result.untrusted_retrieval.excerpts.map(({ source }) => source.stable_ref);
}
function treeHash(root) {
  const files = [];
  for (const route of materialAdmissionPolicy.allowed_materials) files.push(route.repository_path);
  files.push("consumer-reference/agent-native/v2/material-registry.json");
  return sha256(Buffer.from(files.sort().map((file) => `${file}\0${sha256(fs.readFileSync(path.join(root, file)))}\n`).join("")));
}

const v1Expected = new Map([
  ["registry.json", "70107a28225ee893b0d32df8e2a3c69bed747992bf7e92a0ca5431df4605d8b0"],
  ["scripts/identity.mjs", "377c673a9ecd1fe7fb6a3b17774309b7415d9bf85c123595b0ff05ddb36f6638"],
  ["scripts/queries.mjs", "394cbe2ffb3eb6448d3fa10d79ff5ed9f910ff12805a7ec30d4eaa7fb17c3a3f"],
  ["scripts/registry.mjs", "209b3584604bd8bc4de8d27bf95dac50a13317096fcafb2bd86615e6b1bdfd03"],
  ["scripts/retrieval.mjs", "822c2347e4be7d63bed6365f0f896c42e75c20c40b9ec8ae0c23fbfa4690a756"],
]);

test("material-context is a separate read-only v2 operation", () => {
  assert.deepEqual(registry.operations.map(({ name }) => name), ["material-context", "material-discover", "material-get", "material-search"]);
  const operation = registry.operations.find(({ name }) => name === "material-context");
  assert.equal(operation.read_only, true);
  assert.equal(operation.effect_class, "NONE");
  assert.equal(operation.input_schema.properties.budget_tokens.default, 8192);
});

test("repeated calls are canonical-byte deterministic and default equals 8192", () => {
  const first = invoke({ query: "consumer migration", budget_tokens: 8192 });
  const second = invoke({ query: "consumer migration", budget_tokens: 8192 });
  const implicit = invoke({ query: "consumer migration" });
  assert.equal(first.ok, true);
  assert.equal(canonicalize(first), canonicalize(second));
  assert.equal(canonicalize(first), canonicalize(implicit));
  assert.equal(first.result.budget.limit_tokens, MATERIAL_CONTEXT_DEFAULT_TOKENS);
  assert.equal(first.result.cache_key, materialContextCacheKey(first.result));
  assert.equal(Object.keys(first.result).filter((key) => key === "member_manifest").length, 1);
  assert.ok(Array.isArray(first.result.member_manifest));
  assert.deepEqual(first.result.member_manifest, first.result.untrusted_retrieval.excerpts.map(({ source }) => ({
    stable_ref: source.stable_ref,
    version_id: source.version_id,
    sha256: source.sha256,
  })));
  assert.equal(new Set(first.result.member_manifest.map(({ stable_ref }) => stable_ref)).size, first.result.member_manifest.length);
  assert.equal(Object.hasOwn(first.result, "member_refs"), false);
  assert.equal(first.result.budget.used_tokens, countMaterialContextTokens(first.result));
});

test("256, 8192, and 32768 budgets are envelope-bounded with monotonic ranked membership", () => {
  const matrix = [256, 8192, 32768].map((budget_tokens) => invoke({ query: "layout", budget_tokens }));
  for (let index = 0; index < matrix.length; index += 1) {
    const response = matrix[index];
    const budget = [256, 8192, 32768][index];
    assert.equal(response.ok, true);
    assert.ok(response.result.budget.used_tokens <= budget);
    assert.equal(response.result.budget.used_tokens, Math.ceil(Buffer.byteLength(canonicalize(response), "utf8") / 4));
    assert.equal(response.result.cache_key, materialContextCacheKey(response.result));
    assert.match(response.result.cache_key, /^sha256:[a-f0-9]{64}$/);
  }
  assert.deepEqual(refs(matrix[1]).slice(0, refs(matrix[0]).length), refs(matrix[0]));
  assert.deepEqual(refs(matrix[2]).slice(0, refs(matrix[1]).length), refs(matrix[1]));
  assert.ok(refs(matrix[1]).length > refs(matrix[0]).length);
  assert.ok(refs(matrix[2]).length >= refs(matrix[1]).length);
  const search = registry.invoke("material-search", { query: "layout", limit: 100 });
  assert.deepEqual(refs(matrix[2]), search.result.results.slice(0, refs(matrix[2]).length).map(({ source }) => source.stable_ref));
});

test("tiny envelope remains valid and every excerpt has independently verifiable byte provenance", () => {
  const tiny = invoke({ query: "layout", budget_tokens: 256 });
  assert.equal(tiny.ok, true);
  assert.equal(tiny.result.untrusted_retrieval.excerpts.length, 0);
  assert.equal(tiny.result.untrusted_retrieval.truncated, true);
  const response = invoke({ query: "consumer migration", budget_tokens: 8192 });
  for (const excerpt of response.result.untrusted_retrieval.excerpts) {
    const record = manifest.materials.find(({ stable_ref }) => stable_ref === excerpt.source.stable_ref);
    const source = fs.readFileSync(path.join(repositoryRoot, record.repository_path));
    const start = excerpt.source.byte_offset;
    const end = start + excerpt.source.byte_length;
    assert.equal(Buffer.from(excerpt.content, "utf8").equals(source.subarray(start, end)), true);
    assert.equal(excerpt.source.version_id, record.version_id);
    assert.equal(excerpt.source.sha256, sha256(source));
    assert.equal(excerpt.truncated, end < record.byte_length);
  }
});

test("UTF-8 truncation preserves CJK, combining marks, astral code points, lengths, and offsets", () => {
  const root = temporaryRepository();
  try {
    const target = path.join(root, "layout/index.md");
    const body = "---\ntitle: Utfprobe\n---\n# Utfprobe\n" + "utfprobe 界 e\u0301 😀 ".repeat(1000);
    fs.writeFileSync(target, body);
    rebind(root, ["layout/index.md"]);
    const response = createMaterialOperationRegistry({ repositoryRoot: root }).invoke("material-context", { query: "utfprobe", budget_tokens: 512 });
    assert.equal(response.ok, true);
    assert.equal(response.result.untrusted_retrieval.excerpts.length, 1);
    const excerpt = response.result.untrusted_retrieval.excerpts[0];
    assert.equal(excerpt.truncated, true);
    assert.doesNotMatch(excerpt.content, /\uFFFD/);
    assert.equal(Buffer.byteLength(excerpt.content, "utf8"), excerpt.source.byte_length);
    assert.equal(excerpt.source.byte_offset, 0);
    assert.equal(Buffer.from(excerpt.content).equals(Buffer.from(body).subarray(0, excerpt.source.byte_length)), true);
    assert.doesNotThrow(() => new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(excerpt.content)));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("query normalization and ranking ties produce identical canonical selection", () => {
  const plain = invoke({ query: "layout", budget_tokens: 8192 });
  const normalized = invoke({ query: "ＬＡＹＯＵＴ!!!", budget_tokens: 8192 });
  assert.equal(canonicalize(plain), canonicalize(normalized));
  assert.equal(plain.result.normalized_query, "layout");
  const ranked = registry.invoke("material-search", { query: "layout", limit: 100 }).result.results;
  for (let index = 1; index < refs(plain).length; index += 1) {
    const previous = plain.result.untrusted_retrieval.excerpts[index - 1];
    const current = plain.result.untrusted_retrieval.excerpts[index];
    const left = ranked.find(({ source }) => source.stable_ref === previous.source.stable_ref);
    const right = ranked.find(({ source }) => source.stable_ref === current.source.stable_ref);
    if (left.score === right.score) assert.ok(left.identity.stable_ref < right.identity.stable_ref);
  }
});

test("source and manifest changes invalidate keys; stale source fails before context", () => {
  const root = temporaryRepository();
  try {
    const local = createMaterialOperationRegistry({ repositoryRoot: root });
    const before = local.invoke("material-context", { query: "layout", budget_tokens: 8192 });
    assert.equal(before.ok, true);
    fs.appendFileSync(path.join(root, "layout/index.md"), "\nlayout cache change\n");
    stableFailure(local.invoke("material-context", { query: "layout", budget_tokens: 8192 }), "material_source_hash_mismatch", root);
    rebind(root, ["layout/index.md"]);
    const sourceChanged = local.invoke("material-context", { query: "layout", budget_tokens: 8192 });
    assert.equal(sourceChanged.ok, true);
    assert.notEqual(sourceChanged.result.cache_key, before.result.cache_key);
    const priorHead = sourceChanged.result.heads.manifest_version_id;
    fs.appendFileSync(path.join(root, "motion/index.md"), "\nunrelatedheadtoken\n");
    rebind(root, ["motion/index.md"]);
    const headChanged = local.invoke("material-context", { query: "layout", budget_tokens: 8192 });
    assert.equal(headChanged.ok, true);
    assert.notEqual(headChanged.result.heads.manifest_version_id, priorHead);
    assert.notEqual(headChanged.result.cache_key, sourceChanged.result.cache_key);
    const targetManifest = path.join(root, "consumer-reference/agent-native/v2/material-registry.json");
    const staleManifest = JSON.parse(fs.readFileSync(targetManifest, "utf8"));
    staleManifest.version_id = `${staleManifest.stable_ref}@sha256:${"0".repeat(64)}`;
    fs.writeFileSync(targetManifest, canonicalize(staleManifest));
    stableFailure(local.invoke("material-context", { query: "layout", budget_tokens: 8192 }), "material_manifest_version_invalid", root);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("budget, query, trust merge, path, and manifest override failures are stable and distinct", () => {
  for (const budget_tokens of [255, 32769, 1.5, "8192"]) stableFailure(invoke({ query: "layout", budget_tokens }), "material_context_budget_invalid");
  stableFailure(invoke({ query: "" }), "material_query_empty");
  stableFailure(invoke({ query: "a".repeat(4097) }), "material_query_oversized");
  stableFailure(invoke({ query: "layout", trust_records: [] }), "material_context_trust_merge_forbidden");
  stableFailure(invoke({ query: "layout", merge_trust: true }), "material_context_trust_merge_forbidden");
  stableFailure(invoke({ query: "layout", validation: {} }), "material_context_trust_merge_forbidden");
  stableFailure(invoke({ query: "layout", policy: {} }), "material_context_trust_merge_forbidden");
  stableFailure(invoke({ query: "layout", repository_path: "private/source.md" }), "material_context_repository_path_forbidden", "private/source.md");
  stableFailure(invoke({ query: "layout", source_path: "private/source.md" }), "material_context_repository_path_forbidden", "private/source.md");
  stableFailure(invoke({ query: "layout", manifest_override: {} }), "material_context_manifest_override_forbidden");
  assert.equal(new Set(["material_context_budget_invalid", "material_context_trust_merge_forbidden", "material_context_repository_path_forbidden", "material_context_manifest_override_forbidden"]).size, 4);
});

test("material excerpts remain an explicit untrusted retrieval section with no trust record shapes", () => {
  const response = invoke({ query: "consumer migration", budget_tokens: 8192 });
  assert.equal(response.ok, true);
  assert.equal(response.result.untrusted_retrieval.classification, "untrusted_material_excerpts");
  assert.equal(response.result.untrusted_retrieval.retrieval_only, true);
  const forbiddenKeys = new Set(["claim", "claims", "evidence", "governance", "policy_dispositions", "trust_records", "validations"]);
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbiddenKeys.has(key), false, `forbidden trust key ${key}`);
      visit(child);
    }
  };
  visit(response.result);
  assert.ok(response.result.untrusted_retrieval.excerpts.every((excerpt) => Object.keys(excerpt).sort().join(",") === "content,material_ref,source,truncated"));
  const altered = structuredClone(response.result);
  altered.untrusted_retrieval.excerpts[0].content += "x";
  assert.notEqual(materialContextCacheKey(altered), response.result.cache_key);
});

test("v1 context implementation, trust registry, schemas, and goldens remain byte-frozen", () => {
  for (const [relative, expected] of v1Expected) {
    const target = relative.startsWith("scripts/") ? path.join(repositoryRoot, "scripts/agent-native", relative.slice(8)) : path.join(v1Root, relative);
    assert.equal(sha256(fs.readFileSync(target)), expected, relative);
  }
  const v1Registry = JSON.parse(fs.readFileSync(path.join(v1Root, "registry.json"), "utf8"));
  const trustKinds = new Set(["claim", "evidence_link", "validation_report", "governance_decision", "policy_disposition"]);
  for (const record of v1Registry.records ?? []) {
    if (!trustKinds.has(record.record_kind)) continue;
    assert.equal(Object.keys(record).some((key) => key.startsWith("material") || key === "untrusted_retrieval"), false);
  }
});

test("operation performs no writes and retains no hidden source cache between calls", () => {
  const before = treeHash(repositoryRoot);
  let reads = 0;
  const sourceReader = (descriptor) => { reads += 1; return fs.readFileSync(descriptor); };
  const instrumented = createMaterialOperationRegistry({ repositoryRoot, sourceReader });
  assert.equal(instrumented.invoke("material-context", { query: "consumer migration", budget_tokens: 512 }).ok, true);
  const firstReads = reads;
  assert.ok(firstReads >= manifest.materials.length);
  assert.equal(instrumented.invoke("material-context", { query: "consumer migration", budget_tokens: 512 }).ok, true);
  assert.ok(reads >= firstReads * 2);
  assert.equal(treeHash(repositoryRoot), before);
});

test("a valid manifest/source/index switch during the first get read fails as one transaction", () => {
  const root = temporaryRepository();
  try {
    const sourcePath = path.join(root, "layout/index.md");
    const registryPath = path.join(root, "consumer-reference/agent-native/v2/material-registry.json");
    const sourceA = fs.readFileSync(sourcePath);
    const manifestA = fs.readFileSync(registryPath);
    const sourceB = Buffer.from(sourceA);
    sourceB[0] = sourceB[0] === 0x58 ? 0x59 : 0x58;
    fs.writeFileSync(sourcePath, sourceB);
    rebind(root, ["layout/index.md"]);
    const manifestB = fs.readFileSync(registryPath);
    fs.writeFileSync(sourcePath, sourceA);
    fs.writeFileSync(registryPath, manifestA);
    runGit(root, ["add", "."]);
    let reads = 0;
    const sourceReader = (descriptor) => {
      reads += 1;
      if (reads === manifest.materials.length + 1) {
        fs.writeFileSync(sourcePath, sourceB);
        fs.writeFileSync(registryPath, manifestB);
        runGit(root, ["add", "."]);
      }
      return fs.readFileSync(descriptor);
    };
    const response = createMaterialOperationRegistry({ repositoryRoot: root, sourceReader })
      .invoke("material-context", { query: "layout", budget_tokens: 8192 });
    stableFailure(response, "material_context_transaction_drift", root);
    assert.equal(Object.hasOwn(response, "result"), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a coherent transition after search and before get normalizes to transaction drift", () => {
  const root = temporaryRepository();
  try {
    const sourcePath = path.join(root, "layout/index.md");
    const registryPath = path.join(root, "consumer-reference/agent-native/v2/material-registry.json");
    const sourceA = fs.readFileSync(sourcePath);
    const manifestA = fs.readFileSync(registryPath);
    const sourceB = Buffer.from(sourceA);
    sourceB[0] = sourceB[0] === 0x58 ? 0x59 : 0x58;
    fs.writeFileSync(sourcePath, sourceB);
    rebind(root, ["layout/index.md"]);
    const manifestB = fs.readFileSync(registryPath);
    fs.writeFileSync(sourcePath, sourceA);
    fs.writeFileSync(registryPath, manifestA);
    runGit(root, ["add", "."]);
    let inventoryCalls = 0;
    const gitRunner = (command, args, options) => {
      const result = spawnSync(command, args, options);
      inventoryCalls += 1;
      if (inventoryCalls === 2) {
        fs.writeFileSync(sourcePath, sourceB);
        fs.writeFileSync(registryPath, manifestB);
        runGit(root, ["add", "."]);
      }
      return result;
    };
    const response = createMaterialOperationRegistry({ repositoryRoot: root, gitRunner })
      .invoke("material-context", { query: "layout", budget_tokens: 8192 });
    stableFailure(response, "material_context_transaction_drift", root);
    assert.equal(Object.hasOwn(response, "result"), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("coherent A-to-B transitions at first, middle, and last search reads normalize to transaction drift", () => {
  for (const switchRead of [1, Math.ceil(manifest.materials.length / 2), manifest.materials.length]) {
    const root = temporaryRepository();
    try {
      const sourcePath = path.join(root, "layout/index.md");
      const registryPath = path.join(root, "consumer-reference/agent-native/v2/material-registry.json");
      const sourceA = fs.readFileSync(sourcePath);
      const manifestA = fs.readFileSync(registryPath);
      const sourceB = Buffer.from(sourceA);
      sourceB[0] = sourceB[0] === 0x58 ? 0x59 : 0x58;
      fs.writeFileSync(sourcePath, sourceB);
      rebind(root, ["layout/index.md"]);
      const manifestB = fs.readFileSync(registryPath);
      fs.writeFileSync(sourcePath, sourceA);
      fs.writeFileSync(registryPath, manifestA);
      runGit(root, ["add", "."]);
      let reads = 0;
      const sourceReader = (descriptor) => {
        reads += 1;
        if (reads === switchRead) {
          fs.writeFileSync(sourcePath, sourceB);
          fs.writeFileSync(registryPath, manifestB);
          runGit(root, ["add", "."]);
        }
        return fs.readFileSync(descriptor);
      };
      const response = createMaterialOperationRegistry({ repositoryRoot: root, sourceReader })
        .invoke("material-context", { query: "layout", budget_tokens: 8192 });
      stableFailure(response, "material_context_transaction_drift", root);
      assert.equal(Object.hasOwn(response, "result"), false);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
});

test("coherent transitions before and during final reverify emit no mixed result", () => {
  for (const switchRead of [manifest.materials.length + 1, manifest.materials.length + 2]) {
    const root = temporaryRepository();
    try {
      const sourcePath = path.join(root, "layout/index.md");
      const registryPath = path.join(root, "consumer-reference/agent-native/v2/material-registry.json");
      fs.appendFileSync(sourcePath, "\nuniquefinalphaseprobe\n");
      rebind(root, ["layout/index.md"]);
      const sourceA = fs.readFileSync(sourcePath);
      const manifestA = fs.readFileSync(registryPath);
      const sourceB = Buffer.from(sourceA);
      sourceB[0] = sourceB[0] === 0x58 ? 0x59 : 0x58;
      fs.writeFileSync(sourcePath, sourceB);
      rebind(root, ["layout/index.md"]);
      const manifestB = fs.readFileSync(registryPath);
      fs.writeFileSync(sourcePath, sourceA);
      fs.writeFileSync(registryPath, manifestA);
      runGit(root, ["add", "."]);
      let reads = 0;
      const sourceReader = (descriptor) => {
        reads += 1;
        const bytes = fs.readFileSync(descriptor);
        if (reads === switchRead) {
          fs.writeFileSync(sourcePath, sourceB);
          fs.writeFileSync(registryPath, manifestB);
          runGit(root, ["add", "."]);
        }
        return bytes;
      };
      const response = createMaterialOperationRegistry({ repositoryRoot: root, sourceReader })
        .invoke("material-context", { query: "uniquefinalphaseprobe", budget_tokens: 8192 });
      stableFailure(response, "material_context_transaction_drift", root);
      assert.equal(Object.hasOwn(response, "result"), false);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
});

test("unchanged manifest preserves ordinary stale-source errors for context and standalone reads", () => {
  const root = temporaryRepository();
  try {
    fs.appendFileSync(path.join(root, "layout/index.md"), "stale without manifest transition");
    const local = createMaterialOperationRegistry({ repositoryRoot: root });
    stableFailure(local.invoke("material-context", { query: "layout", budget_tokens: 8192 }), "material_source_hash_mismatch", root);
    stableFailure(local.invoke("material-search", { query: "layout", limit: 5 }), "material_source_hash_mismatch", root);
    stableFailure(local.invoke("material-get", { reference: "sg:domain/layout", length: 64 }), "material_source_hash_mismatch", root);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("context excerpts an admitted 70038-byte source without widening standalone get", () => {
  const root = temporaryRepository();
  try {
    const target = path.join(root, "layout/index.md");
    const prefix = Buffer.from("# Layout largeprobe\n\nlargeprobe ", "utf8");
    const body = Buffer.concat([prefix, Buffer.alloc(70_038 - prefix.byteLength, 0x61)]);
    assert.equal(body.byteLength, 70_038);
    fs.writeFileSync(target, body);
    rebind(root, ["layout/index.md"]);
    const local = createMaterialOperationRegistry({ repositoryRoot: root });
    const response = local.invoke("material-context", { query: "largeprobe", budget_tokens: 8192 });
    assert.equal(response.ok, true);
    assert.ok(response.result.budget.used_tokens <= 8192);
    const excerpt = response.result.untrusted_retrieval.excerpts[0];
    assert.equal(excerpt.source.byte_offset, 0);
    assert.ok(excerpt.source.byte_length <= 65_536);
    assert.equal(excerpt.truncated, true);
    assert.equal(Buffer.from(excerpt.content).equals(body.subarray(0, excerpt.source.byte_length)), true);
    stableFailure(local.invoke("material-get", { reference: excerpt.source.stable_ref, length: 65_537 }), "material_length_invalid");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("context snapshots only own plain data properties and never invokes accessors", () => {
  let getters = 0;
  const accessor = { budget_tokens: 256 };
  Object.defineProperty(accessor, "query", { enumerable: true, get() { getters += 1; return getters % 2 ? "layout" : "motion"; } });
  const setter = { query: "layout" };
  Object.defineProperty(setter, "budget_tokens", { enumerable: true, set() { getters += 1; } });
  const inherited = Object.create({ query: "layout", budget_tokens: 256 });
  const changedPrototype = { query: "layout", budget_tokens: 256, __proto__: { trust_records: [] } };
  const jsonPrototypeKey = JSON.parse('{"query":"layout","budget_tokens":256,"__proto__":{"trust_records":[]}}');
  const symbol = { query: "layout", budget_tokens: 256, [Symbol("trust")]: [] };
  const deepAccessor = { query: "layout", budget_tokens: 256, trust_records: [{}] };
  Object.defineProperty(deepAccessor.trust_records[0], "claim", { enumerable: true, get() { getters += 1; return {}; } });
  const deepPrototype = { query: "layout", budget_tokens: 256, trust_records: [Object.create({ claim: {} })] };
  for (const input of [accessor, setter, inherited, changedPrototype, jsonPrototypeKey, symbol, deepAccessor, deepPrototype]) {
    const first = invoke(input);
    const second = invoke(input);
    stableFailure(first, "material_context_input_unsafe");
    assert.equal(canonicalize(first), canonicalize(second));
  }
  assert.equal(getters, 0);
  const plain = { query: "layout", budget_tokens: 256 };
  assert.equal(invoke(plain).ok, true);
  assert.equal(canonicalize(invoke(plain)), canonicalize(invoke(plain)));
});
