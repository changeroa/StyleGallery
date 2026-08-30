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
  createMaterialManifest,
  materialAdmissionPolicy,
  materialStableRefForPath,
  materialVersionIdForSource,
  validateMaterialManifest,
} from "./material-admission.mjs";
import {
  MATERIAL_REGISTRY_PATH,
  generateMaterialRegistry,
  loadMaterialRegistry,
  readManifestBoundMaterial,
  validateMaterialRegistry,
  writeMaterialRegistry,
} from "./material-registry.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const v1RegistryPath = path.join(repositoryRoot, "consumer-reference/agent-native/registry.json");
const registryPath = path.join(repositoryRoot, MATERIAL_REGISTRY_PATH);
const sealedRegistryBytes = fs.readFileSync(registryPath);
const temporaryRoots = new Set();
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const codes = (result) => result.failures.map(({ code }) => code);

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, timeout: 30_000, ...options });
}
function git(root, args) {
  const result = run("git", ["-C", root, ...args]);
  assert.equal(result.status, 0, result.stderr);
}
function recomputeManifestVersion(manifest) {
  const payload = structuredClone(manifest);
  delete payload.version_id;
  return `${manifest.stable_ref}@sha256:${sha256(Buffer.from(canonicalize(payload), "utf8"))}`;
}
function createCompleteRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-material-registry-"));
  temporaryRoots.add(root);
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "material@example.invalid"]);
  git(root, ["config", "user.name", "Material Harness"]);
  for (const { repository_path } of materialAdmissionPolicy.allowed_materials) {
    const target = path.join(root, repository_path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(repositoryRoot, repository_path), target);
  }
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "material fixture"]);
  return root;
}
function resign(manifest) {
  const result = structuredClone(manifest);
  result.version_id = recomputeManifestVersion(result);
  return result;
}
function validate(root, manifest) { return validateMaterialRegistry({ repositoryRoot: root, manifest }); }

function assertIndependentEntry(root, record) {
  const bytes = fs.readFileSync(path.join(root, record.repository_path));
  const sourceHash = sha256(bytes);
  assert.equal(record.source_sha256, sourceHash);
  assert.equal(record.byte_length, bytes.byteLength);
  assert.equal(record.stable_ref, materialStableRefForPath(record.repository_path));
  assert.equal(record.version_id, materialVersionIdForSource(record.stable_ref, sourceHash));
  const route = materialAdmissionPolicy.allowed_materials.find(({ repository_path }) => repository_path === record.repository_path);
  assert.deepEqual({ domain: record.domain, lifecycle: record.lifecycle }, { domain: route.domain, lifecycle: route.lifecycle });
  assert.equal(record.media_type, materialAdmissionPolicy.media_type);
}

test.after(() => { for (const root of temporaryRoots) fs.rmSync(root, { recursive: true, force: true }); });

test("generated registry is canonical, exact, source-bound, complete, and v1-isolated", () => {
  const beforeV1 = fs.readFileSync(v1RegistryPath);
  const generated = generateMaterialRegistry({ repositoryRoot });
  assert.equal(generated.materials.length, 144);
  assert.deepEqual(validateMaterialRegistry({ repositoryRoot, manifest: generated }), { ok: true, failures: [], materials: generated.materials });
  assert.equal(generated.version_id, recomputeManifestVersion(generated));
  assert.equal(generated.admission_policy_ref, materialAdmissionPolicy.stable_ref);
  assert.equal(generated.admission_policy_version_id, materialAdmissionPolicy.version_id);
  assert.deepEqual(generated.materials.map(({ stable_ref }) => stable_ref), [...generated.materials.map(({ stable_ref }) => stable_ref)].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))));
  for (const record of generated.materials) assertIndependentEntry(repositoryRoot, record);
  const required = [
    "layout/index.md", "motion/index.md", "motion/practice-reference.md", "motion/review-workflow.md", "motion/vocabulary.md",
    "design-engineering/index.md", "design-engineering/consumer-migration-readiness.md", "design-engineering/interface-craft.md",
    "game-ui/index.md", "game-ui/classification.md", "game-ui/reference-record.md", "game-ui/screen-hierarchy.md",
    "game-ui/unity/architecture.md", "game-ui/unity/cli-loop.md", "game-ui/unity/org-wiki.md", "game-ui/unity/repository-map.md", "game-ui/unity/ui-systems.md",
    "platform-guides/index.md", "platform-guides/apple-interaction.md", "state-management/index.md", "state-management/catalog.md",
    "state-management/guides/decision-tree.md", "state-management/guides/state-brief.md",
    "state-management/patterns/derivation/derived-state.md", "state-management/patterns/ownership/server-state-cache.md",
    "state-management/recipes/search-and-filter.md", "patterns/index.md", "patterns/centering/center.md",
  ];
  assert.equal(required.every((entry) => generated.materials.some(({ repository_path }) => repository_path === entry)), true);
  const serialized = canonicalize(generated);
  assert.equal(generated.materials.every((record) => Object.keys(record).sort().join(",") === "byte_length,domain,lifecycle,media_type,record_kind,repository_path,schema_version,source_sha256,stable_ref,version_id"), true);
  for (const record of generated.materials) {
    const sourceBody = fs.readFileSync(path.join(repositoryRoot, record.repository_path), "utf8");
    assert.equal(serialized.includes(sourceBody), false, `source body leaked: ${record.repository_path}`);
  }
  assert.equal(serialized.includes("tokens.dtcg"), false);
  assert.equal(serialized.includes("reference-profiles/governed-local"), false);
  assert.equal(serialized.includes("profile.json"), false);
  assert.deepEqual(fs.readFileSync(v1RegistryPath), beforeV1);
});

test("isolated writer is fixed-path, canonical, atomic, deterministic, and clean on second write", () => {
  const root = createCompleteRepository();
  const first = generateMaterialRegistry({ repositoryRoot: root });
  const firstWrite = writeMaterialRegistry({ repositoryRoot: root });
  const target = path.join(root, MATERIAL_REGISTRY_PATH);
  const firstBytes = fs.readFileSync(target);
  const secondWrite = writeMaterialRegistry({ repositoryRoot: root });
  const secondBytes = fs.readFileSync(target);
  assert.deepEqual(firstBytes, Buffer.from(canonicalize(first), "utf8"));
  assert.deepEqual(secondBytes, firstBytes);
  assert.equal(firstWrite.changed, true);
  assert.equal(secondWrite.changed, false);
  assert.equal(firstWrite.path, MATERIAL_REGISTRY_PATH);
  assert.deepEqual(loadMaterialRegistry({ repositoryRoot: root }), first);
  assert.throws(() => loadMaterialRegistry({ repositoryRoot: root, path: "README.md" }), (error) => error.code === "material_registry_option_invalid");
  assert.deepEqual(fs.readFileSync(registryPath), sealedRegistryBytes);
});

test("output and parent symlinks are rejected without touching external sentinels", () => {
  const outputRoot = createCompleteRepository();
  const outputTarget = path.join(outputRoot, MATERIAL_REGISTRY_PATH);
  fs.mkdirSync(path.dirname(outputTarget), { recursive: true });
  const outputSentinel = path.join(outputRoot, "external-output.json");
  fs.writeFileSync(outputSentinel, "sentinel-output");
  fs.symlinkSync(outputSentinel, outputTarget);
  assert.throws(() => writeMaterialRegistry({ repositoryRoot: outputRoot }), (error) => error.code === "material_registry_output_symlink");
  assert.equal(fs.readFileSync(outputSentinel, "utf8"), "sentinel-output");

  const parentRoot = createCompleteRepository();
  const parent = path.join(parentRoot, "consumer-reference/agent-native/v2");
  const external = path.join(parentRoot, "external-parent");
  fs.mkdirSync(external);
  fs.symlinkSync(external, parent);
  assert.throws(() => writeMaterialRegistry({ repositoryRoot: parentRoot }), (error) => error.code === "material_registry_output_parent_symlink");
  assert.equal(fs.existsSync(path.join(external, "material-registry.json")), false);
});

test("atomic writer cleans partial temp files and rejects post-write source and index drift", () => {
  const partialRoot = createCompleteRepository();
  const partialFs = new Proxy(fs, { get(target, property) {
    if (property === "writeFileSync") return (descriptor, bytes) => {
      if (typeof descriptor === "number") { fs.writeSync(descriptor, bytes.subarray(0, 17)); throw new Error("injected partial write"); }
      return fs.writeFileSync(descriptor, bytes);
    };
    return target[property];
  } });
  assert.throws(() => writeMaterialRegistry({ repositoryRoot: partialRoot, fileSystem: partialFs }), (error) => error.code === "material_registry_output_write_failed");
  const partialParent = path.join(partialRoot, "consumer-reference/agent-native/v2");
  assert.equal(fs.existsSync(path.join(partialRoot, MATERIAL_REGISTRY_PATH)), false);
  assert.deepEqual(fs.readdirSync(partialParent), []);

  const sourceRoot = createCompleteRepository();
  let sourceMutated = false;
  const sourceRaceFs = new Proxy(fs, { get(target, property) {
    if (property === "renameSync") return (from, to) => {
      fs.renameSync(from, to);
      if (!sourceMutated) { fs.appendFileSync(path.join(sourceRoot, "motion/index.md"), "drift\n"); sourceMutated = true; }
    };
    return target[property];
  } });
  assert.throws(() => writeMaterialRegistry({ repositoryRoot: sourceRoot, fileSystem: sourceRaceFs }), (error) => error.code === "material_registry_postwrite_source_drift");

  const indexRoot = createCompleteRepository();
  let indexMutated = false;
  const indexRaceFs = new Proxy(fs, { get(target, property) {
    if (property === "renameSync") return (from, to) => {
      fs.renameSync(from, to);
      if (!indexMutated) { git(indexRoot, ["rm", "--cached", "--quiet", "motion/index.md"]); indexMutated = true; }
    };
    return target[property];
  } });
  assert.throws(() => writeMaterialRegistry({ repositoryRoot: indexRoot, fileSystem: indexRaceFs }), (error) => error.code === "material_registry_postwrite_tracking_drift");
});

test("atomic writer detects parent swap and leaves external target untouched", () => {
  const root = createCompleteRepository();
  const parent = path.join(root, "consumer-reference/agent-native/v2");
  const moved = path.join(root, "v2-original");
  const external = path.join(root, "external-swap");
  fs.mkdirSync(external);
  fs.writeFileSync(path.join(external, "material-registry.json"), "external-sentinel");
  let swapped = false;
  const raceFs = new Proxy(fs, { get(target, property) {
    if (property === "renameSync") return (from, to) => {
      if (!swapped) { fs.renameSync(parent, moved); fs.symlinkSync(external, parent); swapped = true; }
      return fs.renameSync(from, to);
    };
    if (property === "lstatSync") return (targetPath) => {
      if (swapped && targetPath === parent) {
        const symlinkStats = fs.lstatSync(parent);
        fs.unlinkSync(parent);
        fs.renameSync(moved, parent);
        return symlinkStats;
      }
      return fs.lstatSync(targetPath);
    };
    return target[property];
  } });
  assert.throws(() => writeMaterialRegistry({ repositoryRoot: root, fileSystem: raceFs }), (error) => error.code === "material_registry_output_parent_race");
  assert.equal(fs.readFileSync(path.join(external, "material-registry.json"), "utf8"), "external-sentinel");
  assert.equal(fs.readdirSync(parent).filter((name) => name.startsWith(".material-registry.json.")).length, 0);
});

test("manifest-bound reads reject paths and recheck source bytes", () => {
  const root = createCompleteRepository();
  const manifest = generateMaterialRegistry({ repositoryRoot: root });
  const record = manifest.materials.find(({ repository_path }) => repository_path === "layout/index.md");
  const result = readManifestBoundMaterial({ repositoryRoot: root, manifest, reference: record.stable_ref });
  assert.deepEqual(result.bytes, fs.readFileSync(path.join(root, record.repository_path)));
  assert.equal(result.record.stable_ref, record.stable_ref);
  assert.throws(() => readManifestBoundMaterial({ repositoryRoot: root, manifest, reference: "layout/index.md" }), (error) => error.code === "material_reference_invalid");
  fs.appendFileSync(path.join(root, record.repository_path), "stale\n");
  assert.throws(() => readManifestBoundMaterial({ repositoryRoot: root, manifest, reference: record.stable_ref }), (error) => error.code === "material_source_hash_mismatch");
});

test("one source mutation changes only its record and manifest identity", () => {
  const root = createCompleteRepository();
  const before = generateMaterialRegistry({ repositoryRoot: root });
  fs.appendFileSync(path.join(root, "motion/index.md"), "\nmutation\n");
  const after = generateMaterialRegistry({ repositoryRoot: root });
  const changed = before.materials.filter((record, index) => canonicalize(record) !== canonicalize(after.materials[index]));
  assert.deepEqual(changed.map(({ repository_path }) => repository_path), ["motion/index.md"]);
  assert.notEqual(before.version_id, after.version_id);
  assert.equal(after.materials.find(({ repository_path }) => repository_path === "motion/index.md").byte_length, before.materials.find(({ repository_path }) => repository_path === "motion/index.md").byte_length + 10);
  assert.equal(validate(root, before).failures[0].code, "material_source_hash_mismatch");
  assert.equal(validate(root, after).ok, true);
});

test("negative manifests fail dedicated structural codes before source acceptance", () => {
  const root = createCompleteRepository();
  const good = generateMaterialRegistry({ repositoryRoot: root });
  const first = good.materials[0];
  let reads = 0;
  const checked = (manifest) => validateMaterialManifest({ repositoryRoot: root, manifest, readFile: (fd) => { reads += 1; return fs.readFileSync(fd); } });

  const reordered = resign({ ...good, materials: [good.materials[1], good.materials[0], ...good.materials.slice(2)] });
  assert.deepEqual(codes(checked(reordered)), ["material_manifest_order_invalid"]);
  const duplicate = resign({ ...good, materials: [good.materials[0], { ...good.materials[0] }, ...good.materials.slice(2)] });
  assert.deepEqual(codes(checked(duplicate)), ["material_identity_duplicate", "material_path_duplicate"]);
  assert.deepEqual(codes(checked({ ...good, admission_policy_version_id: `${materialAdmissionPolicy.stable_ref}@sha256:${"0".repeat(64)}` })), ["material_manifest_policy_mismatch"]);
  assert.deepEqual(codes(checked({ ...good, version_id: `${good.stable_ref}@sha256:${"0".repeat(64)}` })), ["material_manifest_version_invalid"]);

  const malformedCases = [
    [{ ...first, source_sha256: "bad" }, "material_hash_invalid"],
    [{ ...first, byte_length: -1 }, "material_length_invalid"],
    [{ ...first, version_id: `${first.stable_ref}@sha256:${"0".repeat(64)}` }, "material_version_invalid"],
  ];
  for (const [record, expected] of malformedCases) {
    const manifest = resign({ ...good, materials: [record, ...good.materials.slice(1)] });
    assert.equal(codes(checked(manifest))[0], expected);
  }
  assert.equal(reads, 0);
});

test("excluded, untracked, symlink, and path escape vectors remain rejected before reads", () => {
  const root = createCompleteRepository();
  const stable_ref = materialStableRefForPath("layout/index.md");
  const base = { schema_version: "2.0", record_kind: "material", stable_ref, version_id: materialVersionIdForSource(stable_ref, "0".repeat(64)), media_type: "text/markdown", source_sha256: "0".repeat(64), byte_length: 0, lifecycle: "stable", domain: "layout" };
  for (const [repository_path, expected] of [["tests/private.md", "material_path_test_excluded"], ["../escape.md", "material_path_escape"], ["private.md", "material_path_unapproved"]]) {
    const result = validateMaterialManifest({ repositoryRoot: root, manifest: createMaterialManifest([{ ...base, repository_path }]) });
    assert.equal(codes(result)[0], expected);
  }

  fs.rmSync(path.join(root, "layout/index.md"));
  fs.symlinkSync("../motion/index.md", path.join(root, "layout/index.md"));
  assert.throws(() => generateMaterialRegistry({ repositoryRoot: root }), (error) => error.code === "material_path_symlink");

  const stagedRoot = createCompleteRepository();
  fs.rmSync(path.join(stagedRoot, "layout/index.md"));
  fs.symlinkSync("../motion/index.md", path.join(stagedRoot, "layout/index.md"));
  git(stagedRoot, ["add", "layout/index.md"]);
  assert.throws(() => generateMaterialRegistry({ repositoryRoot: stagedRoot }), (error) => error.code === "material_git_mode_invalid");

  const untrackedRoot = createCompleteRepository();
  git(untrackedRoot, ["rm", "--cached", "--quiet", "layout/index.md"]);
  assert.throws(() => generateMaterialRegistry({ repositoryRoot: untrackedRoot }), (error) => error.code === "material_path_untracked");
});
