import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { canonicalize, deepFreeze } from "../canonical-json.mjs";
import {
  createMaterialManifest,
  materialAdmissionPolicy,
  materialStableRefForPath,
  materialVersionIdForSource,
  resolveMaterialRecord,
  validateMaterialManifest,
} from "./material-admission.mjs";

export const MATERIAL_REGISTRY_PATH = "consumer-reference/agent-native/v2/material-registry.json";
const REGULAR_MODES = new Set(["100644", "100755"]);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export class MaterialRegistryError extends TypeError {
  constructor(code, message, sourcePath) {
    super(message);
    this.name = "MaterialRegistryError";
    this.code = code;
    if (sourcePath !== undefined) this.path = sourcePath;
  }
}

function fail(code, message, sourcePath) { throw new MaterialRegistryError(code, message, sourcePath); }
function resultFailure(code, message, sourcePath) {
  return deepFreeze({ ok: false, failures: [{ code, message, ...(sourcePath === undefined ? {} : { path: sourcePath }) }], materials: [] });
}
function assertOptions(options, allowed) {
  if (!options || typeof options !== "object" || Array.isArray(options)) fail("material_registry_option_invalid", "options must be an object");
  const unexpected = Object.keys(options).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) fail("material_registry_option_invalid", `unsupported option: ${unexpected[0]}`);
  if (typeof options.repositoryRoot !== "string" || options.repositoryRoot.length === 0) fail("material_repository_invalid", "repositoryRoot must be a non-empty string");
}
function realpath(fileSystem, target) {
  const implementation = fileSystem.realpathSync.native ?? fileSystem.realpathSync;
  return implementation.call(fileSystem.realpathSync, target);
}
function repositoryState(repositoryRoot) {
  const resolvedRoot = path.resolve(repositoryRoot);
  let stats;
  try { stats = fs.lstatSync(resolvedRoot); } catch (error) { fail("material_repository_invalid", `repository root is unavailable: ${error.message}`); }
  if (!stats.isDirectory() || stats.isSymbolicLink()) fail("material_repository_invalid", "repository root must be a non-symlink directory");
  return { resolvedRoot, canonicalRoot: realpath(fs, resolvedRoot) };
}
function trackedInventory(repositoryRoot) {
  const result = spawnSync("git", ["-C", repositoryRoot, "ls-files", "-s", "-z", "--"], {
    encoding: "buffer", maxBuffer: 16 * 1024 * 1024, timeout: 30_000,
  });
  if (result.status !== 0) fail("material_inventory_failed", result.error?.message ?? (result.stderr.toString("utf8").trim() || "git ls-files failed"));
  const entries = new Map();
  const text = result.stdout.subarray(0, result.stdout.at(-1) === 0 ? result.stdout.length - 1 : result.stdout.length).toString("utf8");
  for (const encoded of text.split("\0").filter(Boolean)) {
    const tab = encoded.indexOf("\t");
    const metadata = encoded.slice(0, tab).split(" ");
    if (tab < 0 || metadata.length !== 3) fail("material_inventory_failed", "Git inventory entry is malformed");
    entries.set(encoded.slice(tab + 1), { mode: metadata[0], stage: metadata[2] });
  }
  return entries;
}
function inspectPath(root, repositoryPath) {
  let current = root.resolvedRoot;
  let stats;
  try {
    for (const component of repositoryPath.split("/")) {
      current = path.join(current, component);
      stats = fs.lstatSync(current);
      if (stats.isSymbolicLink()) fail("material_path_symlink", "material path components must not be symlinks", repositoryPath);
    }
  } catch (error) {
    if (error instanceof MaterialRegistryError) throw error;
    fail("material_path_unavailable", `tracked material path is unavailable: ${error.message}`, repositoryPath);
  }
  if (!stats.isFile()) fail("material_path_not_regular", "material path must be a regular file", repositoryPath);
  const canonicalTarget = realpath(fs, current);
  const expectedTarget = path.resolve(root.canonicalRoot, ...repositoryPath.split("/"));
  if (canonicalTarget !== expectedTarget || !canonicalTarget.startsWith(`${root.canonicalRoot}${path.sep}`)) {
    fail("material_path_escape", "material canonical path escapes the repository root", repositoryPath);
  }
  return { target: current, canonicalTarget, dev: stats.dev, ino: stats.ino };
}
function readInspected(inspection, repositoryPath) {
  let descriptor;
  try {
    descriptor = fs.openSync(inspection.target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    const descriptorStats = fs.fstatSync(descriptor);
    const currentStats = fs.lstatSync(inspection.target);
    if (!descriptorStats.isFile() || currentStats.isSymbolicLink() || !currentStats.isFile()
      || descriptorStats.dev !== inspection.dev || descriptorStats.ino !== inspection.ino
      || currentStats.dev !== inspection.dev || currentStats.ino !== inspection.ino
      || realpath(fs, inspection.target) !== inspection.canonicalTarget) {
      fail("material_path_race", "material path identity changed after preflight", repositoryPath);
    }
    return fs.readFileSync(descriptor);
  } catch (error) {
    if (error instanceof MaterialRegistryError) throw error;
    const code = error?.code === "ELOOP" || error?.code === "ENOENT" ? "material_path_race" : "material_read_failed";
    fail(code, `material could not be read safely: ${error.message}`, repositoryPath);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function preflightAll(repositoryRoot) {
  const root = repositoryState(repositoryRoot);
  const inventory = trackedInventory(repositoryRoot);
  const inspections = new Map();
  for (const route of materialAdmissionPolicy.allowed_materials) {
    const entry = inventory.get(route.repository_path);
    if (!entry) fail("material_path_untracked", "material path is absent from tracked Git inventory", route.repository_path);
    if (!REGULAR_MODES.has(entry.mode) || entry.stage !== "0") fail("material_git_mode_invalid", "material Git index entry must be a stage-zero regular blob", route.repository_path);
  }
  for (const route of materialAdmissionPolicy.allowed_materials) inspections.set(route.repository_path, inspectPath(root, route.repository_path));
  return inspections;
}

export function generateMaterialRegistry(options) {
  assertOptions(options, new Set(["repositoryRoot"]));
  const inspections = preflightAll(options.repositoryRoot);
  const materials = materialAdmissionPolicy.allowed_materials.map((route) => {
    const bytes = readInspected(inspections.get(route.repository_path), route.repository_path);
    const source_sha256 = sha256(bytes);
    const stable_ref = materialStableRefForPath(route.repository_path);
    return {
      schema_version: "2.0",
      record_kind: "material",
      stable_ref,
      version_id: materialVersionIdForSource(stable_ref, source_sha256),
      repository_path: route.repository_path,
      media_type: materialAdmissionPolicy.media_type,
      source_sha256,
      byte_length: bytes.byteLength,
      lifecycle: route.lifecycle,
      domain: route.domain,
    };
  });
  const manifest = createMaterialManifest(materials);
  const validation = validateMaterialManifest({ repositoryRoot: options.repositoryRoot, manifest });
  if (!validation.ok) fail(validation.failures[0].code, validation.failures[0].message, validation.failures[0].path);
  if (validation.materials.length !== materialAdmissionPolicy.allowed_materials.length) fail("material_registry_cardinality_invalid", "generated registry does not contain the sealed allow-set");
  return manifest;
}

export function validateMaterialRegistry(options) {
  assertOptions(options, new Set(["repositoryRoot", "manifest"]));
  if (!Object.hasOwn(options, "manifest")) return resultFailure("material_manifest_invalid", "manifest is required");
  const result = validateMaterialManifest({ repositoryRoot: options.repositoryRoot, manifest: options.manifest });
  if (!result.ok) return result;
  if (result.materials.length !== materialAdmissionPolicy.allowed_materials.length) return resultFailure("material_registry_cardinality_invalid", "material registry must contain exactly the sealed allow-set");
  const actual = new Set(result.materials.map(({ repository_path }) => repository_path));
  const missing = materialAdmissionPolicy.allowed_materials.find(({ repository_path }) => !actual.has(repository_path));
  if (missing) return resultFailure("material_registry_path_set_invalid", "material registry is missing an admitted policy path", missing.repository_path);
  return result;
}

export function loadMaterialRegistry(options) {
  assertOptions(options, new Set(["repositoryRoot"]));
  const target = path.join(path.resolve(options.repositoryRoot), ...MATERIAL_REGISTRY_PATH.split("/"));
  let bytes;
  try {
    const stats = fs.lstatSync(target);
    if (!stats.isFile() || stats.isSymbolicLink()) fail("material_registry_file_invalid", "material registry must be a regular non-symlink file", MATERIAL_REGISTRY_PATH);
    bytes = fs.readFileSync(target);
  } catch (error) {
    if (error instanceof MaterialRegistryError) throw error;
    fail("material_registry_file_invalid", `material registry is unavailable: ${error.message}`, MATERIAL_REGISTRY_PATH);
  }
  let manifest;
  try { manifest = JSON.parse(bytes.toString("utf8")); } catch (error) { fail("material_registry_json_invalid", error.message, MATERIAL_REGISTRY_PATH); }
  if (!bytes.equals(Buffer.from(canonicalize(manifest), "utf8"))) fail("material_registry_canonical_invalid", "material registry bytes must be canonical JSON", MATERIAL_REGISTRY_PATH);
  const validation = validateMaterialRegistry({ repositoryRoot: options.repositoryRoot, manifest });
  if (!validation.ok) fail(validation.failures[0].code, validation.failures[0].message, validation.failures[0].path);
  return deepFreeze(manifest);
}

function inspectOutputParent(repositoryRoot, fileSystem) {
  const root = repositoryState(repositoryRoot);
  let current = root.resolvedRoot;
  const parentComponents = path.dirname(MATERIAL_REGISTRY_PATH).split("/");
  for (const component of parentComponents) {
    current = path.join(current, component);
    try { fileSystem.mkdirSync(current, { mode: 0o755 }); } catch (error) { if (error.code !== "EEXIST") fail("material_registry_output_parent_invalid", `output parent cannot be created: ${error.message}`, MATERIAL_REGISTRY_PATH); }
    let stats;
    try { stats = fileSystem.lstatSync(current); } catch (error) { fail("material_registry_output_parent_invalid", `output parent is unavailable: ${error.message}`, MATERIAL_REGISTRY_PATH); }
    if (stats.isSymbolicLink()) fail("material_registry_output_parent_symlink", "output parent components must not be symlinks", MATERIAL_REGISTRY_PATH);
    if (!stats.isDirectory()) fail("material_registry_output_parent_invalid", "output parent components must be directories", MATERIAL_REGISTRY_PATH);
    const canonical = realpath(fileSystem, current);
    const expected = path.resolve(root.canonicalRoot, ...path.relative(root.resolvedRoot, current).split(path.sep));
    if (canonical !== expected || (canonical !== root.canonicalRoot && !canonical.startsWith(`${root.canonicalRoot}${path.sep}`))) {
      fail("material_registry_output_parent_escape", "output parent must remain inside the repository", MATERIAL_REGISTRY_PATH);
    }
  }
  const stats = fileSystem.lstatSync(current);
  return { path: current, canonical: realpath(fileSystem, current), dev: stats.dev, ino: stats.ino };
}

function parentUnchanged(parent, fileSystem) {
  try {
    const stats = fileSystem.lstatSync(parent.path);
    return stats.isDirectory() && !stats.isSymbolicLink() && stats.dev === parent.dev && stats.ino === parent.ino && realpath(fileSystem, parent.path) === parent.canonical;
  } catch { return false; }
}

function inspectOutputTarget(target, fileSystem) {
  let stats;
  try { stats = fileSystem.lstatSync(target); } catch (error) {
    if (error.code === "ENOENT") return { exists: false };
    fail("material_registry_output_invalid", `output target is unavailable: ${error.message}`, MATERIAL_REGISTRY_PATH);
  }
  if (stats.isSymbolicLink()) fail("material_registry_output_symlink", "output target must not be a symlink", MATERIAL_REGISTRY_PATH);
  if (!stats.isFile()) fail("material_registry_output_type_invalid", "output target must be a regular file", MATERIAL_REGISTRY_PATH);
  return { exists: true, dev: stats.dev, ino: stats.ino };
}

function readOutputTarget(target, expected, fileSystem) {
  let descriptor;
  try {
    descriptor = fileSystem.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    const stats = fileSystem.fstatSync(descriptor);
    const current = fileSystem.lstatSync(target);
    if (!stats.isFile() || current.isSymbolicLink() || !current.isFile()
      || (expected?.exists && (stats.dev !== expected.dev || stats.ino !== expected.ino || current.dev !== expected.dev || current.ino !== expected.ino))) {
      fail("material_registry_output_race", "output target identity changed during read", MATERIAL_REGISTRY_PATH);
    }
    return fileSystem.readFileSync(descriptor);
  } catch (error) {
    if (error instanceof MaterialRegistryError) throw error;
    const code = error.code === "ELOOP" ? "material_registry_output_symlink" : "material_registry_output_read_failed";
    fail(code, `output target cannot be read safely: ${error.message}`, MATERIAL_REGISTRY_PATH);
  } finally { if (descriptor !== undefined) fileSystem.closeSync(descriptor); }
}

function postWriteValidation(repositoryRoot, manifest, expectedBytes, target, parent, fileSystem) {
  if (!parentUnchanged(parent, fileSystem)) fail("material_registry_output_parent_race", "output parent identity changed during publication", MATERIAL_REGISTRY_PATH);
  const targetState = inspectOutputTarget(target, fileSystem);
  if (!targetState.exists) fail("material_registry_postwrite_invalid", "published registry is missing", MATERIAL_REGISTRY_PATH);
  const finalBytes = readOutputTarget(target, targetState, fileSystem);
  if (!finalBytes.equals(expectedBytes)) fail("material_registry_postwrite_invalid", "published registry bytes differ from generated canonical bytes", MATERIAL_REGISTRY_PATH);
  let persisted;
  try { persisted = JSON.parse(finalBytes.toString("utf8")); } catch (error) { fail("material_registry_postwrite_invalid", `published registry JSON is invalid: ${error.message}`, MATERIAL_REGISTRY_PATH); }
  if (canonicalize(persisted) !== finalBytes.toString("utf8") || canonicalize(persisted) !== canonicalize(manifest)) {
    fail("material_registry_postwrite_invalid", "published registry is not the generated canonical manifest", MATERIAL_REGISTRY_PATH);
  }
  const validation = validateMaterialRegistry({ repositoryRoot, manifest: persisted });
  if (!validation.ok) {
    const first = validation.failures[0];
    const trackingCodes = new Set(["material_path_untracked", "material_git_mode_invalid", "material_inventory_failed"]);
    const code = trackingCodes.has(first.code) ? "material_registry_postwrite_tracking_drift" : "material_registry_postwrite_source_drift";
    fail(code, `post-write validation failed: ${first.code}`, first.path);
  }
}

export function writeMaterialRegistry(options) {
  assertOptions(options, new Set(["repositoryRoot", "fileSystem"]));
  const fileSystem = options.fileSystem ?? fs;
  if (!fileSystem || typeof fileSystem !== "object") fail("material_registry_option_invalid", "fileSystem must implement the filesystem contract");
  const manifest = generateMaterialRegistry({ repositoryRoot: options.repositoryRoot });
  const bytes = Buffer.from(canonicalize(manifest), "utf8");
  const parent = inspectOutputParent(options.repositoryRoot, fileSystem);
  const target = path.join(parent.path, path.basename(MATERIAL_REGISTRY_PATH));
  const initial = inspectOutputTarget(target, fileSystem);
  let changed = true;
  if (initial.exists) changed = !readOutputTarget(target, initial, fileSystem).equals(bytes);
  let temporary;
  let descriptor;
  try {
    if (changed) {
      temporary = path.join(parent.path, `.material-registry.json.${process.pid}.${randomBytes(12).toString("hex")}`);
      try {
        descriptor = fileSystem.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
        fileSystem.writeFileSync(descriptor, bytes);
        fileSystem.fsyncSync(descriptor);
        fileSystem.fchmodSync(descriptor, 0o644);
      } catch (error) {
        fail("material_registry_output_write_failed", `temporary registry write failed: ${error.message}`, MATERIAL_REGISTRY_PATH);
      } finally {
        if (descriptor !== undefined) { fileSystem.closeSync(descriptor); descriptor = undefined; }
      }
      if (!parentUnchanged(parent, fileSystem)) fail("material_registry_output_parent_race", "output parent changed before publication", MATERIAL_REGISTRY_PATH);
      const current = inspectOutputTarget(target, fileSystem);
      if (initial.exists !== current.exists || (initial.exists && (initial.dev !== current.dev || initial.ino !== current.ino))) {
        if (current.exists && readOutputTarget(target, current, fileSystem).equals(bytes)) changed = false;
        else fail("material_registry_output_race", "output target changed before publication", MATERIAL_REGISTRY_PATH);
      }
      if (changed) {
        try { fileSystem.renameSync(temporary, target); temporary = undefined; }
        catch (error) {
          const code = parentUnchanged(parent, fileSystem) ? "material_registry_output_publish_failed" : "material_registry_output_parent_race";
          fail(code, `atomic registry publication failed: ${error.message}`, MATERIAL_REGISTRY_PATH);
        }
        let parentDescriptor;
        try { parentDescriptor = fileSystem.openSync(parent.path, fs.constants.O_RDONLY); fileSystem.fsyncSync(parentDescriptor); }
        catch (error) { fail("material_registry_output_sync_failed", `output directory sync failed: ${error.message}`, MATERIAL_REGISTRY_PATH); }
        finally { if (parentDescriptor !== undefined) fileSystem.closeSync(parentDescriptor); }
      }
    }
    postWriteValidation(options.repositoryRoot, manifest, bytes, target, parent, fileSystem);
  } finally {
    if (descriptor !== undefined) fileSystem.closeSync(descriptor);
    if (temporary !== undefined) { try { fileSystem.unlinkSync(temporary); } catch (error) { if (error.code !== "ENOENT") throw error; } }
  }
  return deepFreeze({ changed, byte_length: bytes.byteLength, path: MATERIAL_REGISTRY_PATH, sha256: sha256(bytes), version_id: manifest.version_id });
}

export function readManifestBoundMaterial(options) {
  assertOptions(options, new Set(["repositoryRoot", "manifest", "reference"]));
  const validation = validateMaterialRegistry({ repositoryRoot: options.repositoryRoot, manifest: options.manifest });
  if (!validation.ok) fail(validation.failures[0].code, validation.failures[0].message, validation.failures[0].path);
  const record = resolveMaterialRecord({ manifest: options.manifest, reference: options.reference });
  const inspection = inspectPath(repositoryState(options.repositoryRoot), record.repository_path);
  const bytes = readInspected(inspection, record.repository_path);
  if (sha256(bytes) !== record.source_sha256) fail("material_source_hash_mismatch", "material bytes do not match source_sha256", record.repository_path);
  if (bytes.byteLength !== record.byte_length) fail("material_byte_length_mismatch", "material bytes do not match byte_length", record.repository_path);
  return { record, bytes };
}
