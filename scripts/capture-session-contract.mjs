import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { resolveProfileRecords } from "./profile-record-contract.mjs";
import { parseStrictJson } from "./strict-json.mjs";

export const captureSourcePaths = Object.freeze([
  "package-lock.json",
  "package.json",
  "playwright.config.mjs",
  "consumer-reference/schema/ax-evidence.schema.json",
  "consumer-reference/schema/capture-session.schema.json",
  "consumer-reference/schema/component-capture-record.v2.schema.json",
  "consumer-reference/schema/component-evidence-record.v2.schema.json",
  "consumer-reference/schema/component-runtime-manifest.v2.schema.json",
  "consumer-reference/schema/dom-evidence.schema.json",
  "consumer-reference/schema/evidence-record.schema.json",
  "consumer-reference/schema/governed-button-component-state.schema.json",
  "consumer-reference/schema/governed-button-profile.schema.json",
  "consumer-reference/schema/governed-button-runtime-fixture.schema.json",
  "consumer-reference/schema/runtime-evidence-manifest.schema.json",
  "consumer-reference/schema/visual-evidence.schema.json",
  "scripts/artifact-metadata.mjs",
  "scripts/capture-session-contract.mjs",
  "scripts/component-state-contract.mjs",
  "scripts/component-state-semantics.mjs",
  "scripts/create-component-state-session.mjs",
  "scripts/evidence-artifact-contract.mjs",
  "scripts/evidence-capture-contract.mjs",
  "scripts/evidence-version-projection.mjs",
  "scripts/profile-record-contract.mjs",
  "scripts/strict-json.mjs",
  "scripts/test-component-evidence-v2-integration.mjs",
  "scripts/test-evidence-v2-projection.mjs",
  "scripts/test-validate-component-state-artifacts.mjs",
  "scripts/test-validate-component-state.mjs",
  "scripts/visual-expectation-contract.mjs",
  "tests/component-state-evidence.spec.mjs",
  "tests/helpers/render-component-state.mjs",
]);

function finding(code, file, message) {
  return { code, message, path: file };
}

export function sha256(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

export function repositoryGitArgs(repositoryRoot, ...args) {
  return ["-c", `safe.directory=${repositoryRoot}`, ...args];
}

function repositoryGitInvocation(repositoryRoot, ...args) {
  const workTree = fs.realpathSync(repositoryRoot);
  const dotGit = path.join(workTree, ".git");
  const dotGitStat = fs.lstatSync(dotGit);
  let gitDirectory;
  if (dotGitStat.isDirectory() && !dotGitStat.isSymbolicLink()) {
    gitDirectory = fs.realpathSync(dotGit);
  } else if (dotGitStat.isFile() && !dotGitStat.isSymbolicLink()) {
    const match = /^gitdir: ([^\r\n]+)\r?\n?$/.exec(fs.readFileSync(dotGit, "utf8"));
    if (!match) throw new Error("repository Git directory binding is invalid");
    gitDirectory = fs.realpathSync(path.resolve(workTree, match[1]));
  } else {
    throw new Error("repository Git directory binding is invalid");
  }
  const commonDirectoryFile = path.join(gitDirectory, "commondir");
  const commonDirectory = fs.existsSync(commonDirectoryFile)
    ? fs.realpathSync(path.resolve(gitDirectory, fs.readFileSync(commonDirectoryFile, "utf8").trim()))
    : gitDirectory;
  const objectDirectory = fs.realpathSync(path.join(commonDirectory, "objects"));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
  Object.assign(env, {
    GIT_ALTERNATE_OBJECT_DIRECTORIES: "",
    GIT_CONFIG_COUNT: "0",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_OBJECT_DIRECTORY: objectDirectory,
    GIT_OPTIONAL_LOCKS: "0",
  });
  return {
    args: [`--git-dir=${gitDirectory}`, `--work-tree=${workTree}`, "--no-replace-objects", "-c", `safe.directory=${workTree}`, ...args],
    options: { cwd: workTree, env },
  };
}

function repositoryGit(repositoryRoot, args, options = {}) {
  const invocation = repositoryGitInvocation(repositoryRoot, ...args);
  return execFileSync("git", invocation.args, { ...invocation.options, ...options, env: invocation.options.env });
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function profileSourceFiles(profileRoot) {
  if (!fs.existsSync(profileRoot)) return [];
  const sources = [];
  const profiles = fs.readdirSync(profileRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(profileRoot, entry.name, "profile.json")))
    .sort((left, right) => compare(left.name, right.name));
  for (const profile of profiles) {
    const profileFile = path.join(profileRoot, profile.name, "profile.json");
    const record = parseStrictJson(fs.readFileSync(profileFile, "utf8"));
    const references = [
      "profile.json",
      record.local_foundations,
      record.tokens,
      ...(record.component_records ?? []),
      ...(record.fixture_records ?? []),
      ...(record.state_records ?? []),
    ];
    for (const reference of references) {
      if (typeof reference !== "string") continue;
      if (path.posix.isAbsolute(reference) || path.win32.isAbsolute(reference) || reference.includes("\\") || path.posix.normalize(reference) !== reference || reference.split("/").some((segment) => segment === "." || segment === "..")) {
        throw new Error(`unsafe profile source reference ${profile.name}/${reference}`);
      }
      sources.push({
        file: path.join(profileRoot, profile.name, reference),
        logicalPath: `profiles/${profile.name}/${reference.split(path.sep).join("/")}`,
      });
    }
  }
  return sources;
}

export function relevantSourceFiles(repositoryRoot, profileRoot) {
  return [
    ...captureSourcePaths.map((reference) => ({ file: path.join(repositoryRoot, reference), logicalPath: reference })),
    ...profileSourceFiles(profileRoot),
  ].sort((left, right) => compare(left.logicalPath, right.logicalPath));
}

export function canonicalSourceManifest(repositoryRoot, profileRoot) {
  const files = relevantSourceFiles(repositoryRoot, profileRoot).map(({ file, logicalPath }) => {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`capture source must be a regular non-symlink file: ${logicalPath}`);
    const bytes = fs.readFileSync(file);
    return { byte_length: bytes.length, path: logicalPath, sha256: sha256(bytes) };
  });
  return { files, sha256: sha256(Buffer.from(JSON.stringify(files))) };
}

export class SourceManifestVerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SourceManifestVerificationError";
    this.code = code;
  }
}

function sourceFailure(code, message) {
  throw new SourceManifestVerificationError(code, message);
}

function validateRecordedSourcePath(logicalPath, profileRoot, repositoryRoot) {
  if (typeof logicalPath !== "string" || path.posix.isAbsolute(logicalPath) || path.win32.isAbsolute(logicalPath)
    || logicalPath.includes("\\") || path.posix.normalize(logicalPath) !== logicalPath
    || logicalPath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    sourceFailure("source_path_invalid", "recorded source path is invalid");
  }
  const profilePrefix = "profiles/";
  const repositoryPath = logicalPath.startsWith(profilePrefix)
    ? path.posix.join(path.relative(repositoryRoot, profileRoot).split(path.sep).join("/"), logicalPath.slice(profilePrefix.length))
    : logicalPath;
  if (repositoryPath.startsWith("../") || path.posix.isAbsolute(repositoryPath) || path.posix.normalize(repositoryPath) !== repositoryPath) {
    sourceFailure("source_path_invalid", "recorded source path escapes the repository");
  }
  return repositoryPath;
}

function gitCommitTree(repositoryRoot, revision) {
  if (!/^[a-f0-9]{40}$/.test(revision ?? "")) sourceFailure("source_revision_invalid", "source revision must be a full lowercase Git object ID");
  let commitType;
  let commit;
  try {
    commitType = repositoryGit(repositoryRoot, ["cat-file", "-t", revision], {
      encoding: "utf8", maxBuffer: 1024, stdio: ["ignore", "pipe", "pipe"], timeout: 30_000,
    }).trim();
    commit = repositoryGit(repositoryRoot, ["cat-file", "commit", revision], {
      encoding: "utf8", maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"], timeout: 30_000,
    });
  } catch {
    sourceFailure("source_revision_unavailable", "source revision metadata is unavailable");
  }
  if (commitType !== "commit") sourceFailure("source_revision_not_commit", "source revision is not a commit");
  const match = /^tree ([a-f0-9]{40})$/m.exec(commit);
  if (!match) sourceFailure("source_commit_invalid", "source commit has no canonical tree");
  try {
    const treeType = repositoryGit(repositoryRoot, ["cat-file", "-t", match[1]], {
      encoding: "utf8", maxBuffer: 1024, stdio: ["ignore", "pipe", "pipe"], timeout: 30_000,
    }).trim();
    if (treeType !== "tree") sourceFailure("source_commit_invalid", "source commit tree is invalid");
  } catch (error) {
    if (error instanceof SourceManifestVerificationError) throw error;
    sourceFailure("source_revision_unavailable", "source revision metadata is unavailable");
  }
  return match[1];
}

function gitTreePaths(repositoryRoot, revision, repositoryPath) {
  let output;
  try {
    output = repositoryGit(repositoryRoot, ["ls-tree", "-r", "-z", "--name-only", revision, "--", repositoryPath], {
      maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"], timeout: 30_000,
    });
  } catch {
    sourceFailure("source_inventory_unavailable", "recorded source inventory is unavailable");
  }
  if (output.length > 0 && output.at(-1) !== 0) sourceFailure("source_inventory_invalid", "recorded source inventory is invalid");
  return output.length === 0 ? [] : output.toString("utf8").slice(0, -1).split("\0");
}

function gitBytes(repositoryRoot, revision, repositoryPath) {
  let treeEntry;
  try {
    treeEntry = repositoryGit(repositoryRoot, ["ls-tree", "-z", revision, "--", repositoryPath], {
      maxBuffer: 1024 * 1024, stdio: ["ignore", "pipe", "pipe"], timeout: 30_000,
    });
  } catch {
    sourceFailure("source_blob_unavailable", "recorded source blob metadata is unavailable");
  }
  if (treeEntry.length === 0 || treeEntry.at(-1) !== 0) sourceFailure("source_blob_absent", "recorded source is absent from the revision");
  const match = /^(100644|100755) blob ([a-f0-9]{40})\t([^\0]+)\0$/.exec(treeEntry.toString("utf8"));
  if (!match || match[3] !== repositoryPath) sourceFailure("source_blob_invalid", "recorded source is not one regular Git blob");
  try {
    return repositoryGit(repositoryRoot, ["cat-file", "blob", match[2]], {
      maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"], timeout: 30_000,
    });
  } catch {
    sourceFailure("source_blob_unavailable", "recorded source blob is unavailable");
  }
}

function recordedProfileSourcePaths(repositoryRoot, profileRoot, revision) {
  const relativeRoot = path.relative(repositoryRoot, profileRoot).split(path.sep).join("/");
  if (relativeRoot === "" || relativeRoot.startsWith("../") || path.posix.isAbsolute(relativeRoot) || path.posix.normalize(relativeRoot) !== relativeRoot) {
    sourceFailure("source_profile_root_invalid", "profile source root is outside the repository");
  }
  const suffix = "/profile.json";
  const profileFiles = gitTreePaths(repositoryRoot, revision, relativeRoot)
    .filter((repositoryPath) => repositoryPath.startsWith(`${relativeRoot}/`) && repositoryPath.endsWith(suffix))
    .filter((repositoryPath) => !repositoryPath.slice(relativeRoot.length + 1, -suffix.length).includes("/"))
    .sort(compare);
  const sources = [];
  for (const repositoryPath of profileFiles) {
    const profileName = repositoryPath.slice(relativeRoot.length + 1, -suffix.length);
    let record;
    try { record = parseStrictJson(gitBytes(repositoryRoot, revision, repositoryPath).toString("utf8")); }
    catch (error) {
      if (error instanceof SourceManifestVerificationError) throw error;
      sourceFailure("source_inventory_invalid", "recorded profile source inventory is invalid");
    }
    const references = [
      "profile.json",
      record.local_foundations,
      record.tokens,
      ...(record.component_records ?? []),
      ...(record.fixture_records ?? []),
      ...(record.state_records ?? []),
    ];
    for (const reference of references) {
      if (typeof reference !== "string" || path.posix.isAbsolute(reference) || path.win32.isAbsolute(reference)
        || reference.includes("\\") || path.posix.normalize(reference) !== reference
        || reference.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
        sourceFailure("source_inventory_invalid", "recorded profile source inventory is invalid");
      }
      sources.push(`profiles/${profileName}/${reference}`);
    }
  }
  return sources;
}

function recordedCaptureSourcePaths(repositoryRoot, tree) {
  const source = gitBytes(repositoryRoot, tree, "scripts/capture-session-contract.mjs").toString("utf8");
  const declaration = /export const captureSourcePaths = Object\.freeze\(\[([\s\S]*?)\]\);/.exec(source);
  if (!declaration) sourceFailure("source_inventory_invalid", "recorded capture source inventory is invalid");
  const references = [];
  const stringLiteral = /"(?:\\.|[^"\\])*"/g;
  let offset = 0;
  for (const match of declaration[1].matchAll(stringLiteral)) {
    if (!/^[\s,]*$/.test(declaration[1].slice(offset, match.index))) sourceFailure("source_inventory_invalid", "recorded capture source inventory is invalid");
    let reference;
    try { reference = JSON.parse(match[0]); }
    catch { sourceFailure("source_inventory_invalid", "recorded capture source inventory is invalid"); }
    if (path.posix.isAbsolute(reference) || path.win32.isAbsolute(reference) || reference.includes("\\")
      || path.posix.normalize(reference) !== reference
      || reference.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
      sourceFailure("source_inventory_invalid", "recorded capture source inventory is invalid");
    }
    references.push(reference);
    offset = match.index + match[0].length;
  }
  if (references.length === 0 || !/^[\s,]*$/.test(declaration[1].slice(offset)) || new Set(references).size !== references.length) {
    sourceFailure("source_inventory_invalid", "recorded capture source inventory is invalid");
  }
  return references;
}

function expectedRecordedSourcePaths(repositoryRoot, profileRoot, tree) {
  return [...recordedCaptureSourcePaths(repositoryRoot, tree), ...recordedProfileSourcePaths(repositoryRoot, profileRoot, tree)].sort(compare);
}

export function verifySourceManifest(source, repositoryRoot, profileRoot, options = {}) {
  const mode = options.mode ?? "current-authoring";
  try {
    if (!source || !Array.isArray(source.files) || source.files.length === 0) sourceFailure("source_manifest_incomplete", "source manifest is incomplete");
    const immutableMode = mode === "recorded-revision" || mode === "candidate-authoring";
    let expectedPaths;
    let tree;
    if (mode === "current-authoring") {
      expectedPaths = relevantSourceFiles(repositoryRoot, profileRoot).map((entry) => entry.logicalPath);
    } else if (immutableMode) {
      tree = gitCommitTree(repositoryRoot, options.revision);
      if (mode === "candidate-authoring" && (!/^[a-f0-9]{40}$/.test(options.tree ?? "") || tree !== options.tree)) {
        sourceFailure("source_tree_mismatch", "candidate source tree differs from its explicit tree binding");
      }
      expectedPaths = expectedRecordedSourcePaths(repositoryRoot, profileRoot, tree);
    } else {
      sourceFailure("source_mode_invalid", "source verification mode is invalid");
    }
    if (!sameJson(source.files.map((entry) => entry?.path), expectedPaths)) {
      sourceFailure("source_inventory_mismatch", "source manifest inventory differs from the recorded inventory");
    }
    const files = source.files.map((entry) => {
      let bytes;
      if (mode === "current-authoring") {
        const selected = relevantSourceFiles(repositoryRoot, profileRoot).find((candidate) => candidate.logicalPath === entry.path);
        const stat = fs.lstatSync(selected.file);
        if (!stat.isFile() || stat.isSymbolicLink()) sourceFailure("source_file_invalid", "capture source must be a regular non-symlink file");
        bytes = fs.readFileSync(selected.file);
      } else {
        bytes = gitBytes(repositoryRoot, tree, validateRecordedSourcePath(entry.path, profileRoot, repositoryRoot));
      }
      const actual = { byte_length: bytes.length, path: entry.path, sha256: sha256(bytes) };
      if (!sameJson(actual, entry)) sourceFailure("source_bytes_mismatch", "source bytes differ from the authenticated revision");
      return actual;
    });
    const actual = { files, sha256: sha256(Buffer.from(JSON.stringify(files))) };
    if (!sameJson(actual, source)) sourceFailure("source_manifest_digest_mismatch", "source manifest digest differs");
    return { mode, ok: true, ...(immutableMode ? { revision: options.revision } : {}), ...(mode === "candidate-authoring" ? { tree: options.tree } : {}) };
  } catch (error) {
    const failure = error instanceof SourceManifestVerificationError
      ? error
      : new SourceManifestVerificationError("source_verification_failed", "source manifest verification failed");
    return { code: failure.code, error: failure.message, mode, ok: false, ...(["recorded-revision", "candidate-authoring"].includes(mode) ? { revision: options.revision } : {}), ...(mode === "candidate-authoring" ? { tree: options.tree } : {}) };
  }
}

export function sourceManifestMatches(source, repositoryRoot, profileRoot, options = {}) {
  return verifySourceManifest(source, repositoryRoot, profileRoot, options).ok;
}

export function dirtyRelevantSources(repositoryRoot, profileRoot) {
  const repositoryPrefix = `${path.resolve(repositoryRoot)}${path.sep}`;
  const tracked = relevantSourceFiles(repositoryRoot, profileRoot)
    .map(({ file }) => path.resolve(file))
    .filter((file) => file.startsWith(repositoryPrefix))
    .map((file) => path.relative(repositoryRoot, file));
  if (tracked.length === 0) return [];
  const output = repositoryGit(repositoryRoot, ["status", "--porcelain=v1", "--untracked-files=all", "--", ...tracked], { encoding: "utf8" });
  return output.split("\n").filter(Boolean).sort(compare);
}

export function sessionLink(receipt, receiptSha256) {
  return {
    attempt: receipt.attempt,
    branch: receipt.branch,
    environment: receipt.environment,
    nonce: receipt.nonce,
    receipt_sha256: receiptSha256,
    revision: receipt.revision,
    session_id: receipt.session_id,
    source: receipt.source,
    started_at: receipt.started_at,
  };
}

export function readCaptureSession(file, validate, failures) {
  if (!fs.existsSync(file)) {
    failures.push(finding("capture_session_missing", file, "capture session receipt is missing"));
    return undefined;
  }
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    failures.push(finding("capture_session_type_invalid", file, "capture session receipt must be a regular non-symlink file"));
    return undefined;
  }
  const bytes = fs.readFileSync(file);
  let receipt;
  try {
    receipt = parseStrictJson(bytes.toString("utf8"));
  } catch (error) {
    failures.push(finding("capture_session_json_invalid", file, error instanceof Error ? error.message : String(error)));
    return undefined;
  }
  if (!validate(receipt)) {
    for (const error of validate.errors ?? []) failures.push(finding("capture_session_schema_invalid", file, `${error.instancePath || "/"} ${error.message}`));
  }
  const digest = sha256(bytes);
  return {
    artifact: { byte_length: bytes.length, media_type: "application/json", path: "capture-session.json", sha256: digest },
    bytes,
    digest,
    link: sessionLink(receipt, digest),
    receipt,
  };
}

export function canonicalIntended(profileRoot, failures) {
  if (!fs.existsSync(profileRoot)) return [];
  const intended = [];
  for (const entry of fs.readdirSync(profileRoot, { withFileTypes: true }).filter((item) => item.isDirectory()).sort((left, right) => compare(left.name, right.name))) {
    const root = path.join(profileRoot, entry.name);
    if (!fs.existsSync(path.join(root, "profile.json"))) continue;
    const resolved = resolveProfileRecords(root, failures);
    const fixture = resolved?.records.fixture[0]?.value;
    if (!resolved || !fixture) continue;
    intended.push({
      profile_id: resolved.profile.id,
      profile_name: entry.name,
      scenarios: fixture.scenarios.map((scenario) => ({ channels: [...scenario.required_channels].sort(compare), id: scenario.id })).sort((left, right) => compare(left.id, right.id)),
    });
  }
  return intended;
}

export function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function withinSession(capturedAt, startedAt, completedAt) {
  const captured = Date.parse(capturedAt);
  const started = Date.parse(startedAt);
  const completed = Date.parse(completedAt);
  return Number.isFinite(captured) && Number.isFinite(started) && Number.isFinite(completed) && captured >= started && captured <= completed;
}
