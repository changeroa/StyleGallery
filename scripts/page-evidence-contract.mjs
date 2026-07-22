import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import Ajv2020 from "ajv/dist/2020.js";
import { artifactMetadata, MAX_ARTIFACT_FILE_BYTES } from "./page-artifact-metadata.mjs";
import { addDateTimeFormat } from "./json-schema-formats.mjs";
import { parseStrictJson } from "./strict-json.mjs";

export const PAGE_EVIDENCE_CLAIM = "Page evidence is claim-scoped runtime evidence, not visual-regression approval or accessibility certification.";
export const PAGE_EVIDENCE_MANIFEST = "page-evidence-manifest.json";
export const PAGE_EVIDENCE_RECEIPT = "page-evidence-session.json";
export const PAGE_EVIDENCE_MAX_PACKET_BYTES = 256 * 1024 * 1024;

export function finding(code, message, recordPath) {
  return { code, message, path: recordPath };
}

export function digest(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function metadata(bytes, mediaType, reference) {
  const result = artifactMetadata(bytes, mediaType);
  return { ...result, path: reference, sha256: result.sha256.replace(/^sha256:/, "") };
}

export function sameJson(left, right) {
  return isDeepStrictEqual(left, right);
}

export function sameStringSet(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && new Set(left).size === left.length && left.every((entry) => right.includes(entry));
}

export function safeRelativePath(reference) {
  return typeof reference === "string"
    && reference.length > 0
    && !path.posix.isAbsolute(reference)
    && !path.win32.isAbsolute(reference)
    && !reference.includes("\\")
    && !reference.includes("?")
    && !reference.includes("#")
    && !/^[A-Za-z][A-Za-z\d+.-]*:/.test(reference)
    && path.posix.normalize(reference) === reference
    && !reference.split("/").some((segment) => segment === "." || segment === "..");
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export function normalizeReference(root, candidate) {
  const absolute = path.isAbsolute(candidate) ? path.resolve(candidate) : path.resolve(root, candidate);
  const reference = path.relative(path.resolve(root), absolute).split(path.sep).join("/");
  return safeRelativePath(reference) ? reference : undefined;
}

export function resolveContained({ allowMissing = false, expectedType = "file", prefix, reference, root }, failures) {
  const absoluteRoot = path.resolve(root);
  if (!fs.existsSync(absoluteRoot) || !fs.lstatSync(absoluteRoot).isDirectory()) {
    failures.push(finding(`${prefix}_root_invalid`, "trust root must be an existing directory", absoluteRoot));
    return undefined;
  }
  if (fs.lstatSync(absoluteRoot).isSymbolicLink() || fs.realpathSync(absoluteRoot) !== absoluteRoot) {
    failures.push(finding(`${prefix}_redirect`, "trust root must not be a filesystem redirect", absoluteRoot));
    return undefined;
  }
  if (!safeRelativePath(reference)) {
    failures.push(finding(`${prefix}_escape`, "path must be normalized and repository-relative", String(reference)));
    return undefined;
  }
  const target = path.resolve(absoluteRoot, reference);
  if (!isInside(absoluteRoot, target)) {
    failures.push(finding(`${prefix}_escape`, "path escapes its trust root", reference));
    return undefined;
  }
  let current = absoluteRoot;
  const segments = reference.split("/");
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) {
      if (allowMissing) return { file: target, reference };
      failures.push(finding(`${prefix}_missing`, "required file is missing", reference));
      return undefined;
    }
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) {
      failures.push(finding(`${prefix}_symlink`, "path must not traverse a symbolic link", reference));
      return undefined;
    }
    const final = index === segments.length - 1;
    if ((!final && !stat.isDirectory()) || (final && expectedType === "file" && !stat.isFile()) || (final && expectedType === "directory" && !stat.isDirectory())) {
      failures.push(finding(`${prefix}_type_invalid`, `path must resolve to a regular ${expectedType}`, reference));
      return undefined;
    }
  }
  const canonical = path.join(fs.realpathSync(absoluteRoot), ...segments);
  if (fs.realpathSync(target) !== canonical) {
    failures.push(finding(`${prefix}_redirect`, "path resolves through a filesystem redirect", reference));
    return undefined;
  }
  return { file: target, reference };
}

export function readJsonFile({ prefix, reference, root }, failures) {
  const resolved = readContainedBytes({ prefix, reference, root }, failures);
  if (!resolved) return undefined;
  try {
    return { ...resolved, value: parseStrictJson(resolved.bytes.toString("utf8")) };
  } catch (error) {
    failures.push(finding(`${prefix}_json_invalid`, error instanceof Error ? error.message : String(error), reference));
    return undefined;
  }
}

export function readContainedBytes({ prefix, reference, root }, failures) {
  const resolved = resolveContained({ expectedType: "file", prefix, reference, root }, failures);
  if (!resolved) return undefined;
  let descriptor;
  try {
    descriptor = fs.openSync(resolved.file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const before = fs.fstatSync(descriptor);
    const namedBefore = fs.lstatSync(resolved.file);
    if (!before.isFile() || before.dev !== namedBefore.dev || before.ino !== namedBefore.ino) throw new Error("file identity changed before read");
    if (before.size > MAX_ARTIFACT_FILE_BYTES) throw new Error(`file exceeds ${MAX_ARTIFACT_FILE_BYTES} bytes`);
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    const namedAfter = fs.lstatSync(resolved.file);
    if (before.dev !== after.dev || before.ino !== after.ino || after.dev !== namedAfter.dev || after.ino !== namedAfter.ino || after.size !== bytes.length) throw new Error("file identity changed during read");
    const expected = path.join(fs.realpathSync(path.resolve(root)), ...reference.split("/"));
    if (fs.realpathSync(resolved.file) !== expected) throw new Error("file path redirected during read");
    return { ...resolved, bytes };
  } catch (error) {
    failures.push(finding(`${prefix}_read_untrusted`, error instanceof Error ? error.message : String(error), reference));
    return undefined;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function readSchema(schemaRoot, name) {
  const file = path.join(schemaRoot, name);
  try {
    return parseStrictJson(fs.readFileSync(file, "utf8"));
  } catch (cause) {
    throw new Error(`${name} is not strict JSON: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
  }
}

export function compilePageEvidenceSchemas(schemaRoot) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addDateTimeFormat(ajv);
  const sessionSchema = readSchema(schemaRoot, "page-evidence-session.schema.json");
  const manifestSchema = readSchema(schemaRoot, "page-evidence-manifest.schema.json");
  ajv.addSchema(sessionSchema);
  ajv.addSchema(manifestSchema);
  return {
    manifest: ajv.getSchema(manifestSchema.$id),
    runner: ajv.compile({ $ref: `${manifestSchema.$id}#/$defs/runner_result` }),
    session: ajv.getSchema(sessionSchema.$id),
  };
}

export function addSchemaFindings(validate, value, recordPath, code, failures) {
  if (validate(value)) return true;
  for (const error of validate.errors ?? []) failures.push(finding(code, `${error.instancePath || "/"} ${error.message}`, recordPath));
  return false;
}

export function canonicalSourceManifest(root, references, failures) {
  if (!Array.isArray(references) || references.length === 0 || new Set(references).size !== references.length) {
    failures.push(finding("page_evidence_source_list_invalid", "relevant sources must be a nonempty unique path list", "<conformance-record>"));
    return undefined;
  }
  const files = [];
  let totalBytes = 0;
  for (const reference of [...references].sort()) {
    const resolved = readContainedBytes({ prefix: "page_evidence_source", reference, root }, failures);
    if (!resolved) continue;
    const size = resolved.bytes.length;
    totalBytes += size;
    if (size > MAX_ARTIFACT_FILE_BYTES || totalBytes > PAGE_EVIDENCE_MAX_PACKET_BYTES) {
      failures.push(finding("page_evidence_source_limit", "relevant sources exceed the bounded file or aggregate byte budget", reference));
      continue;
    }
    const bytes = resolved.bytes;
    files.push({ byte_length: bytes.length, path: reference, sha256: digest(bytes) });
  }
  return files.length === references.length ? { files, sha256: digest(Buffer.from(JSON.stringify(files))) } : undefined;
}

function git(root, ...args) {
  return execFileSync("git", ["-c", `safe.directory=${path.resolve(root)}`, ...args], { cwd: root, encoding: "utf8" }).trim();
}

function remoteIdentity(remote) {
  if (!remote) return undefined;
  const cleaned = remote.replace(/\.git$/, "");
  const scp = cleaned.match(/^[^@]+@[^:]+:(.+)$/);
  if (scp) return scp[1];
  try {
    const parsed = new URL(cleaned);
    return parsed.pathname.replace(/^\//, "");
  } catch {
    return undefined;
  }
}

export function gitIdentity(root, failures) {
  try {
    const canonical = git(root, "rev-parse", "--show-toplevel");
    if (path.resolve(canonical) !== path.resolve(root) || fs.realpathSync(canonical) !== path.resolve(root)) throw new Error("--root must be the canonical Git worktree root");
    let remote;
    try { remote = git(root, "config", "--get", "remote.origin.url"); } catch { remote = ""; }
    return {
      branch: git(root, "branch", "--show-current") || "detached",
      repository: remoteIdentity(remote),
      revision: git(root, "rev-parse", "HEAD"),
    };
  } catch (error) {
    failures.push(finding("page_evidence_git_invalid", error instanceof Error ? error.message : String(error), path.resolve(root)));
    return undefined;
  }
}

export function dirtyRelevantSources(root, references) {
  const dirty = [];
  for (const reference of references) {
    try { git(root, "ls-files", "--error-unmatch", "--", reference); }
    catch { dirty.push(`untracked:${reference}`); }
  }
  const status = git(root, "status", "--porcelain=v1", "--untracked-files=all", "--", ...references);
  return [...new Set([...dirty, ...status.split("\n").filter(Boolean)])].sort();
}

export function readReceipt(artifactRoot, schemas, failures) {
  const record = readJsonFile({ prefix: "page_evidence_session", reference: PAGE_EVIDENCE_RECEIPT, root: artifactRoot }, failures);
  if (!record) return undefined;
  const valid = addSchemaFindings(schemas.session, record.value, record.reference, "page_evidence_session_schema_invalid", failures);
  const artifact = metadata(record.bytes, "application/json", PAGE_EVIDENCE_RECEIPT);
  return { ...record, artifact, digest: artifact.sha256, valid };
}

export function withinSession(recordedAt, startedAt, completedAt) {
  const recorded = Date.parse(recordedAt);
  const started = Date.parse(startedAt);
  const completed = Date.parse(completedAt);
  return Number.isFinite(recorded) && Number.isFinite(started) && Number.isFinite(completed) && recorded >= started && recorded <= completed;
}

export function listArtifactFiles(root, failures) {
  const files = [];
  let visited = 0;
  let limitReported = false;
  let totalBytes = 0;
  function visit(directory, prefix = "", depth = 0) {
    if (depth > 16) {
      failures.push(finding("page_evidence_artifact_limit", "artifact tree exceeds the maximum directory depth", prefix));
      return;
    }
    const handle = fs.opendirSync(directory);
    try {
      let entry;
      while ((entry = handle.readSync()) !== null) {
        if (limitReported) return;
        const reference = prefix ? `${prefix}/${entry.name}` : entry.name;
        visited += 1;
        if (visited > 4096) {
          if (!limitReported) failures.push(finding("page_evidence_artifact_limit", "artifact tree exceeds 4096 entries", reference));
          limitReported = true;
          return;
        }
        const absolute = path.join(directory, entry.name);
        const stat = fs.lstatSync(absolute);
        if (stat.isSymbolicLink()) failures.push(finding("page_evidence_artifact_symlink", "artifact root must not contain symbolic links", reference));
        else if (stat.isDirectory()) visit(absolute, reference, depth + 1);
        else if (stat.isFile()) {
          totalBytes += stat.size;
          if (stat.size > MAX_ARTIFACT_FILE_BYTES || totalBytes > PAGE_EVIDENCE_MAX_PACKET_BYTES) {
            if (!limitReported) failures.push(finding("page_evidence_artifact_limit", "artifact packet exceeds the bounded file or aggregate byte budget", reference));
            limitReported = true;
            return;
          }
          files.push(reference);
        }
        else failures.push(finding("page_evidence_artifact_type_invalid", "artifact root contains a non-regular entry", reference));
      }
    } finally {
      handle.closeSync();
    }
  }
  visit(root);
  return files.sort();
}
