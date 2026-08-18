#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

import { canonicalize } from "../canonical-json.mjs";
import {
  createMaterialManifest,
  materialAdmissionPolicy,
  materialStableRefForPath,
  materialVersionIdForSource,
  resolveMaterialRecord,
  validateMaterialAdmissionPolicy,
  validateMaterialManifest,
} from "./material-admission.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const v1RegistryPath = path.join(repositoryRoot, "consumer-reference", "agent-native", "registry.json");
const v1SchemaDirectory = path.join(repositoryRoot, "consumer-reference", "agent-native", "schema");
const v2Directory = path.join(repositoryRoot, "consumer-reference", "agent-native", "v2");
const temporaryRoots = new Set();
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const EXPECTED_PATH_COUNT = 126;
const EXPECTED_PATHS_NEWLINE_SHA256 = "897c48cb3dec29fdb210e99c91d1fdfe24ea70562ba182143495b476909d2744";

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, timeout: 30_000, ...options });
}
function git(root, args) {
  const result = run("git", ["-C", root, ...args]);
  assert.equal(result.status, 0, result.stderr);
}
function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
function route(repositoryPath) {
  const entry = materialAdmissionPolicy.allowed_materials.find((candidate) => candidate.repository_path === repositoryPath);
  assert.ok(entry, `test requested an unapproved path: ${repositoryPath}`);
  return entry;
}
function sourceRecord(root, repositoryPath, overrides = {}) {
  const bytes = fs.readFileSync(path.join(root, repositoryPath));
  const stable_ref = materialStableRefForPath(repositoryPath);
  const source_sha256 = sha256(bytes);
  const admitted = route(repositoryPath);
  return {
    schema_version: "2.0", record_kind: "material", stable_ref,
    version_id: materialVersionIdForSource(stable_ref, source_sha256),
    repository_path: repositoryPath, media_type: "text/markdown", source_sha256,
    byte_length: bytes.length, lifecycle: admitted.lifecycle, domain: admitted.domain,
    ...overrides,
  };
}
function syntheticRecord(repositoryPath, overrides = {}) {
  const stable_ref = materialStableRefForPath(repositoryPath);
  const admitted = route(repositoryPath);
  const source_sha256 = "0".repeat(64);
  return {
    schema_version: "2.0", record_kind: "material", stable_ref,
    version_id: materialVersionIdForSource(stable_ref, source_sha256),
    repository_path: repositoryPath, media_type: "text/markdown", source_sha256,
    byte_length: 0, lifecycle: admitted.lifecycle, domain: admitted.domain,
    ...overrides,
  };
}
function codes(result) { return result.failures.map(({ code }) => code); }
function validate(root, materials, options = {}) {
  return validateMaterialManifest({ repositoryRoot: root, manifest: createMaterialManifest(materials), ...options });
}
function createRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-material-admission-"));
  temporaryRoots.add(root);
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "material@example.invalid"]);
  git(root, ["config", "user.name", "Material Harness"]);
  const files = {
    "AGENTS.md": "# Agents\n", "CATALOG.md": "# Catalog\n", "DOMAINS.md": "# Domains\n", "GOVERNANCE.md": "# Governance\n",
    "GUIDE.md": "# Guide\n", "README.md": "# Readme\n", "index.md": "# Index\n", "log.md": "# Log\n",
    "layout/index.md": "# Layout\n", "motion/index.md": "# Motion\n", "design-engineering/index.md": "# Design Engineering\n",
    "game-ui/index.md": "# Game UI\n", "platform-guides/index.md": "# Platform Guides\n",
    "patterns/index.md": "<!-- generated -->\n# Patterns\n", "patterns/centering/center.md": "# Pattern\n",
    "recipes/article-page.md": "# Article\n", "recipes/dashboard.md": "# Dashboard\n", "recipes/list-detail.md": "# List detail\n",
    "guides/layout-brief.md": "# Brief\n", "quality/index.md": "# Quality\n",
    "consumer-reference/index.md": "# Consumer Reference\n", "consumer-reference/contract.md": "# Contract\n",
    "consumer-reference/agent-native/README.md": "# Agent Native\n",
    ".omo/private.md": "secret\n", "tests/private.md": "test\n", "consumer-reference/fixtures/private.md": "fixture\n",
    "consumer-reference/schema/private.md": "schema\n", "consumer-reference/baselines/private.md": "baseline\n",
    "design-engineering/reference-profiles/profile.json": "{\"token\":\"red\"}\n", "scripts/private.md": "internal\n",
    "data/internal/private.md": "internal data\n", "private.md": "unapproved\n", "arbitrary.js": "export default 1;\n",
  };
  for (const [relativePath, content] of Object.entries(files)) write(root, relativePath, content);
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "fixture"]);
  return root;
}

function policyVersion(policy) {
  const payload = { ...policy };
  delete payload.version_id;
  return `${policy.stable_ref}@sha256:${sha256(Buffer.from(canonicalize(payload), "utf8"))}`;
}

test.after(() => { for (const root of temporaryRoots) fs.rmSync(root, { force: true, recursive: true }); });

test("policy is closed, versioned, exact, and seals all 126 current paths", () => {
  const policySchema = JSON.parse(fs.readFileSync(path.join(v2Directory, "schema", "admission-policy.schema.json"), "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  assert.equal(ajv.validate(policySchema, materialAdmissionPolicy), true, JSON.stringify(ajv.errors));
  assert.equal(materialAdmissionPolicy.version_id, policyVersion(materialAdmissionPolicy));
  assert.deepEqual(validateMaterialAdmissionPolicy(materialAdmissionPolicy), { ok: true, failures: [] });
  assert.equal(validateMaterialAdmissionPolicy({ ...materialAdmissionPolicy, extra: true }).ok, false);
  assert.equal(validateMaterialAdmissionPolicy({ ...materialAdmissionPolicy, version_id: `${materialAdmissionPolicy.stable_ref}@sha256:${"0".repeat(64)}` }).ok, false);
  const paths = materialAdmissionPolicy.allowed_materials.map(({ repository_path }) => repository_path);
  assert.equal(paths.length, EXPECTED_PATH_COUNT);
  assert.equal(new Set(paths).size, EXPECTED_PATH_COUNT);
  assert.equal(sha256(`${paths.join("\n")}\n`), EXPECTED_PATHS_NEWLINE_SHA256);
  assert.equal(materialAdmissionPolicy.allowed_materials.find(({ repository_path }) => repository_path === "consumer-reference/agent-native/README.md").lifecycle, "experimental");
  assert.equal(Object.hasOwn(materialAdmissionPolicy, "public_roots"), false);
});

test("actual repository manifest admits exactly 126 paths with deterministic identities and source versions", () => {
  const materials = materialAdmissionPolicy.allowed_materials.map(({ repository_path }) => sourceRecord(repositoryRoot, repository_path));
  const manifest = createMaterialManifest(materials);
  const result = validateMaterialManifest({ repositoryRoot, manifest });
  assert.equal(result.ok, true, JSON.stringify(result.failures));
  assert.equal(result.materials.length, EXPECTED_PATH_COUNT);
  assert.deepEqual(result.materials.map(({ stable_ref }) => stable_ref), [...result.materials.map(({ stable_ref }) => stable_ref)].sort());
  for (const record of result.materials) {
    assert.equal(record.stable_ref, materialStableRefForPath(record.repository_path));
    assert.equal(record.version_id, `${record.stable_ref}@sha256:${record.source_sha256}`);
    assert.deepEqual(Object.keys(record).sort(), ["byte_length", "domain", "lifecycle", "media_type", "record_kind", "repository_path", "schema_version", "source_sha256", "stable_ref", "version_id"]);
  }
});

test("manifest is closed, policy-bound, and bytewise ordered", () => {
  const root = createRepository();
  const records = [sourceRecord(root, "layout/index.md"), sourceRecord(root, "patterns/index.md")];
  const manifest = createMaterialManifest(records);
  assert.equal(manifest.admission_policy_ref, materialAdmissionPolicy.stable_ref);
  assert.equal(manifest.admission_policy_version_id, materialAdmissionPolicy.version_id);
  assert.equal(validateMaterialManifest({ repositoryRoot: root, manifest: { ...manifest, admission_policy_version_id: `${materialAdmissionPolicy.stable_ref}@sha256:${"0".repeat(64)}` } }).ok, false);
  const reversed = { ...manifest, materials: [...manifest.materials].reverse() };
  const payload = { ...reversed }; delete payload.version_id;
  reversed.version_id = `${reversed.stable_ref}@sha256:${sha256(Buffer.from(canonicalize(payload), "utf8"))}`;
  let reads = 0;
  const result = validateMaterialManifest({ repositoryRoot: root, manifest: reversed, readFile: (fd) => { reads += 1; return fs.readFileSync(fd); } });
  assert.deepEqual(codes(result), ["material_manifest_order_invalid"]);
  assert.equal(reads, 0);
});

test("StableRef derives from normalized path and VersionID changes only with exact source bytes", () => {
  const first = materialStableRefForPath("layout/index.md");
  assert.equal(first, materialStableRefForPath("layout/index.md"));
  assert.notEqual(first, materialStableRefForPath("motion/index.md"));
  const hashA = sha256(Buffer.from("a"));
  const hashB = sha256(Buffer.from("b"));
  assert.equal(materialVersionIdForSource(first, hashA), `${first}@sha256:${hashA}`);
  assert.notEqual(materialVersionIdForSource(first, hashA), materialVersionIdForSource(first, hashB));
  const root = createRepository();
  const record = sourceRecord(root, "layout/index.md", { stable_ref: materialStableRefForPath("motion/index.md") });
  record.version_id = materialVersionIdForSource(record.stable_ref, record.source_sha256);
  assert.deepEqual(codes(validate(root, [record])), ["material_stable_ref_path_mismatch"]);
});

test("future files below formerly broad prefixes remain unapproved", () => {
  const root = createRepository();
  for (const candidate of ["patterns/future.md", "quality/future.md", "consumer-reference/future.md"]) {
    write(root, candidate, "# Future\n"); git(root, ["add", candidate]);
    const stable_ref = materialStableRefForPath(candidate);
    const bytes = fs.readFileSync(path.join(root, candidate));
    const record = { schema_version: "2.0", record_kind: "material", stable_ref, version_id: materialVersionIdForSource(stable_ref, sha256(bytes)), repository_path: candidate, media_type: "text/markdown", source_sha256: sha256(bytes), byte_length: bytes.length, lifecycle: "stable", domain: "shared" };
    const result = validateMaterialManifest({ repositoryRoot: root, manifest: createMaterialManifest([record]) });
    assert.deepEqual(codes(result), ["material_path_unapproved"]);
  }
});

test("exclusion precedence is deterministic and occurs before reads", () => {
  const root = createRepository();
  const external = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-material-external-")); temporaryRoots.add(external);
  const cases = [
    ["", "material_path_invalid"], ["file:///tmp/a.md", "material_path_absolute"], ["C:\\tmp\\a.md", "material_path_absolute"],
    ["guides//layout-brief.md", "material_path_not_normalized"], ["guides/./layout-brief.md", "material_path_not_normalized"],
    ["../outside.md", "material_path_escape"], [".omo/private.js", "material_path_omo_excluded"], ["tests/private.js", "material_path_test_excluded"],
    ["consumer-reference/fixtures/private.js", "material_path_fixture_excluded"], ["consumer-reference/schema/private.js", "material_path_schema_excluded"],
    ["consumer-reference/baselines/private.js", "material_path_baseline_excluded"], ["design-engineering/reference-profiles/profile.json", "material_profile_values_excluded"],
    ["scripts/private.md", "material_path_internal_excluded"], ["arbitrary.js", "material_type_not_markdown"], ["private.md", "material_path_unapproved"],
  ];
  for (const [repository_path, expected] of cases) {
    const stable_ref = materialStableRefForPath("layout/index.md");
    const record = { schema_version: "2.0", record_kind: "material", stable_ref, version_id: materialVersionIdForSource(stable_ref, "0".repeat(64)), repository_path, media_type: "text/markdown", source_sha256: "0".repeat(64), byte_length: 0, lifecycle: "stable", domain: "shared" };
    let reads = 0;
    const result = validateMaterialManifest({ repositoryRoot: root, manifest: createMaterialManifest([record]), readFile: () => { reads += 1; return Buffer.alloc(0); } });
    assert.equal(codes(result)[0], expected, `${repository_path}: ${JSON.stringify(result.failures)}`);
    assert.equal(reads, 0);
  }
});

test("Git inventory and modes are checked before filesystem inspection", () => {
  const root = createRepository();
  fs.symlinkSync(path.join(root, "layout/index.md"), path.join(root, "recipes/form-flow.md"));
  const untracked = syntheticRecord("recipes/form-flow.md");
  const noInspect = new Proxy(fs, { get(target, property) { if (["lstatSync", "realpathSync", "openSync"].includes(String(property))) return () => assert.fail(`filesystem inspected via ${String(property)}`); return target[property]; } });
  assert.deepEqual(codes(validate(root, [untracked], { fileSystem: noInspect })), ["material_path_untracked"]);

  fs.rmSync(path.join(root, "recipes/article-page.md"));
  fs.symlinkSync("../layout/index.md", path.join(root, "recipes/article-page.md"));
  git(root, ["add", "recipes/article-page.md"]);
  assert.deepEqual(codes(validate(root, [syntheticRecord("recipes/article-page.md")])), ["material_git_mode_invalid"]);

  fs.rmSync(path.join(root, "recipes/dashboard.md"));
  fs.symlinkSync("../layout/index.md", path.join(root, "recipes/dashboard.md"));
  assert.deepEqual(codes(validate(root, [syntheticRecord("recipes/dashboard.md")])), ["material_path_symlink"]);
});

test("manifest-wide late invalid preflight reads no earlier member", () => {
  const root = createRepository();
  const valid = sourceRecord(root, "layout/index.md");
  fs.rmSync(path.join(root, "recipes/list-detail.md"));
  git(root, ["rm", "--cached", "--quiet", "recipes/list-detail.md"]);
  const missing = syntheticRecord("recipes/list-detail.md");
  let reads = 0;
  const result = validate(root, [valid, missing], { readFile: () => { reads += 1; return Buffer.alloc(0); } });
  assert.deepEqual(codes(result), ["material_path_untracked"]);
  assert.equal(reads, 0);
});

test("post-open descriptor identity rejects a parent-directory swap before content read", () => {
  const root = createRepository();
  const external = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-material-race-")); temporaryRoots.add(external);
  write(external, "list-detail.md", "# External\n");
  const record = sourceRecord(root, "recipes/list-detail.md");
  let swapped = false; let reads = 0;
  const raceFs = new Proxy(fs, { get(target, property) {
    if (property === "openSync") return (targetPath, flags) => {
      if (!swapped) { fs.renameSync(path.join(root, "recipes"), path.join(root, "recipes-original")); fs.symlinkSync(external, path.join(root, "recipes")); swapped = true; }
      return fs.openSync(targetPath, flags);
    };
    return target[property];
  } });
  const result = validate(root, [record], { fileSystem: raceFs, readFile: (fd) => { reads += 1; return fs.readFileSync(fd); } });
  assert.deepEqual(codes(result), ["material_path_race"]);
  assert.equal(reads, 0);
});

test("runtime material resolution accepts StableRefs only", () => {
  const root = createRepository();
  const record = sourceRecord(root, "layout/index.md");
  const manifest = createMaterialManifest([record]);
  assert.equal(resolveMaterialRecord({ manifest, reference: record.stable_ref }).stable_ref, record.stable_ref);
  assert.throws(() => resolveMaterialRecord({ manifest, reference: "layout/index.md" }), (error) => error.code === "material_reference_invalid");
});

test("closed records, duplicate identities and duplicate paths fail before reads", () => {
  const root = createRepository();
  const good = sourceRecord(root, "layout/index.md");
  let reads = 0;
  const readFile = () => { reads += 1; return Buffer.alloc(0); };
  assert.deepEqual(codes(validateMaterialManifest({ repositoryRoot: root, manifest: { ...createMaterialManifest([good]), extra: true }, readFile })), ["material_manifest_schema_invalid"]);
  assert.deepEqual(codes(validate(root, [{ ...good, content: "forbidden" }], { readFile })), ["material_schema_invalid"]);
  assert.deepEqual(codes(validate(root, [good, { ...good }], { readFile })), ["material_identity_duplicate", "material_path_duplicate"]);
  assert.equal(reads, 0);
});

test("bad hash, length, media, domain, lifecycle, identity, and source digest are exhaustive", () => {
  const root = createRepository();
  const good = sourceRecord(root, "layout/index.md");
  const cases = [
    [{ ...good, stable_ref: "material/good" }, "material_stable_ref_invalid"],
    [{ ...good, version_id: `${good.stable_ref}@sha256:${"f".repeat(64)}` }, "material_version_invalid"],
    [{ ...good, source_sha256: "bad" }, "material_hash_invalid"], [{ ...good, byte_length: -1 }, "material_length_invalid"],
    [{ ...good, media_type: "text/plain" }, "material_media_type_invalid"], [{ ...good, domain: "profiles" }, "material_domain_invalid"],
    [{ ...good, lifecycle: "canonical" }, "material_lifecycle_invalid"],
  ];
  for (const [record, expected] of cases) assert.equal(codes(validate(root, [record]))[0], expected);
  const badHash = { ...good, source_sha256: "0".repeat(64), version_id: materialVersionIdForSource(good.stable_ref, "0".repeat(64)) };
  assert.deepEqual(codes(validate(root, [badHash])), ["material_source_hash_mismatch"]);
  const badLength = { ...good, byte_length: 999 };
  assert.deepEqual(codes(validate(root, [badLength])), ["material_byte_length_mismatch"]);
});

test("v1 registry and schemas remain byte-frozen with no material operations", () => {
  const expected = {
    "registry.json":"70107a28225ee893b0d32df8e2a3c69bed747992bf7e92a0ca5431df4605d8b0", "agent-native.schema.json":"0675d61d57a8d12c724f6a97160f6bc4cf2f8abf91663adae0593e7a5a221871",
    "epistemic.schema.json":"ddfdd88692897b4cc17057fc7b0cb6222f69d078956ffb0344d288025cbab9d2", "execution.schema.json":"629dccc992fe166be3d1361ca8a2df5e4212f2c1b49ed18a1f153bcdf751725e",
    "identity.schema.json":"aeaa315790cd7b8349203e945d81e92b4939db7be990b82a996f9a85feb84340", "learning.schema.json":"98dfeb26a61929d3d0931641e0abfdb1e13d1b1776919c7f714f28e151e674cb",
    "manifest.schema.json":"47c4db495aa76c818d5cacab8cbe855e67717be96f264c234b518101709d41a7", "operation.schema.json":"7d41fbfbcb22ed591496a71b177321e5ea76f126d8b580f12b6ba2963498106d",
    "protocol-binding.schema.json":"b91987e0401be6d41937f370c9789483f0b08cde84841f5dc616e82fd6515ef6", "retrieval.schema.json":"8f17fbf5df6f730faa2eda83b00bac5868c4f1819c35808f28b46b2f9f4e7379",
  };
  assert.equal(sha256(fs.readFileSync(v1RegistryPath)), expected["registry.json"]);
  for (const [name, digest] of Object.entries(expected).slice(1)) assert.equal(sha256(fs.readFileSync(path.join(v1SchemaDirectory, name))), digest, name);
  assert.equal(Object.hasOwn(materialAdmissionPolicy, "operations"), false);
  assert.equal(materialAdmissionPolicy.allowed_materials.some(({ repository_path }) => repository_path.startsWith("design-engineering/reference-profiles/")), false);
  assert.equal(materialAdmissionPolicy.allowed_materials.every((entry) => Object.keys(entry).sort().join(",") === "domain,lifecycle,repository_path"), true);
  const frozenRuntimePaths = [
    "scripts/agent-native/cli-adapter.mjs", "scripts/agent-native/fixture.mjs", "scripts/agent-native/identity.mjs",
    "scripts/agent-native/mcp-adapter.mjs", "scripts/agent-native/queries.mjs", "scripts/agent-native/registry.mjs",
    "scripts/agent-native/retrieval.mjs", "scripts/sg.mjs", "scripts/sg-mcp.mjs",
  ];
  const runtimeDiff = run("git", ["-C", repositoryRoot, "diff", "--quiet", "HEAD", "--", ...frozenRuntimePaths]);
  assert.equal(runtimeDiff.status, 0, runtimeDiff.stderr);
});
