import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseStrictJson } from "./strict-json.mjs";

export const CAPTURE_DIRECTORY = "design-engineering/reference-profiles/governed-local/captures";
export const CAPTURE_MAX_BYTES = 1024 * 1024;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const CAPTURE_NAME = /^sha256-([a-f0-9]{64})\.capture\.json$/;
const REQUIRED_CAPTURE_OWNERS = Object.freeze(["editorial-reference-profile", "terminal-reference-profile", "runtime-manifest"]);

export class EvidenceCaptureError extends Error {
  constructor(code, message, capturePath) {
    super(message);
    this.name = "EvidenceCaptureError";
    this.code = code;
    if (capturePath !== undefined) this.path = capturePath;
  }
}

function fail(code, message, capturePath) {
  throw new EvidenceCaptureError(code, message, capturePath);
}

function digest(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function equal(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function checkedReference(reference) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) fail("capture_reference_invalid", "capture reference must be an object");
  const capturePath = reference.path;
  const components = typeof capturePath === "string" ? capturePath.split("/") : [];
  const expectedPrefix = `${CAPTURE_DIRECTORY}/`;
  if (typeof capturePath !== "string" || !capturePath.startsWith(expectedPrefix)
    || path.posix.isAbsolute(capturePath) || path.win32.isAbsolute(capturePath) || capturePath.includes("\\")
    || path.posix.normalize(capturePath) !== capturePath
    || components.some((component) => component === "" || component === "." || component === "..")) {
    fail("capture_path_escape", "capture path must be normalized and contained by the governed capture directory", capturePath);
  }
  const relative = capturePath.slice(expectedPrefix.length);
  if (relative.includes("/")) fail("capture_path_escape", "capture records cannot be nested below the governed capture directory", capturePath);
  const name = CAPTURE_NAME.exec(relative);
  if (!name) fail("capture_path_invalid", "capture filename must be sha256-<digest>.capture.json", capturePath);
  if (!DIGEST.test(reference.sha256 ?? "")) fail("capture_digest_invalid", "capture reference sha256 is invalid", capturePath);
  if (`sha256:${name[1]}` !== reference.sha256) fail("capture_filename_digest_mismatch", "capture filename and declared digest differ", capturePath);
  if (!Number.isSafeInteger(reference.byte_length) || reference.byte_length < 1 || reference.byte_length > CAPTURE_MAX_BYTES) {
    fail("capture_byte_length_bounds", `capture byte length must be between 1 and ${CAPTURE_MAX_BYTES}`, capturePath);
  }
  return { byte_length: reference.byte_length, path: capturePath, sha256: reference.sha256 };
}

function checkAbort(signal, capturePath) {
  if (signal?.aborted) fail("capture_cancelled", "capture resolution was cancelled", capturePath);
}

function secureRead(repositoryRoot, reference, signal) {
  checkAbort(signal, reference.path);
  const root = path.resolve(repositoryRoot);
  let rootStat;
  try { rootStat = fs.lstatSync(root); }
  catch (error) { fail("capture_root_unavailable", `repository root is unavailable: ${error.message}`, reference.path); }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) fail("capture_canonical_escape", "repository root must be a non-symlink directory", reference.path);
  const realRoot = fs.realpathSync.native(root);

  const components = reference.path.split("/");
  const walked = [];
  let current = root;
  let finalStat;
  for (let index = 0; index < components.length; index += 1) {
    current = path.join(current, components[index]);
    try { finalStat = fs.lstatSync(current); }
    catch (error) { fail("capture_missing", `capture path component is unavailable: ${error.message}`, reference.path); }
    if (finalStat.isSymbolicLink()) fail(index === components.length - 1 ? "capture_file_symlink" : "capture_ancestor_symlink", "capture path components must not be symlinks", reference.path);
    if (index < components.length - 1 && !finalStat.isDirectory()) fail("capture_ancestor_type_invalid", "capture ancestors must be directories", reference.path);
    walked.push({ ctimeMs: finalStat.ctimeMs, dev: finalStat.dev, file: current, ino: finalStat.ino });
  }
  if (!finalStat?.isFile()) fail("capture_file_type_invalid", "capture must be a regular file", reference.path);

  const target = path.join(root, ...components);
  const realTarget = fs.realpathSync.native(target);
  const expectedTarget = path.join(realRoot, ...components);
  if (realTarget !== expectedTarget || !realTarget.startsWith(`${path.join(realRoot, CAPTURE_DIRECTORY)}${path.sep}`)) {
    fail("capture_canonical_escape", "capture canonical path escapes its governed root", reference.path);
  }

  let descriptor;
  try {
    descriptor = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0));
  } catch (error) {
    fail(error?.code === "ELOOP" ? "capture_file_symlink" : "capture_open_failed", `capture cannot be opened safely: ${error.message}`, reference.path);
  }
  try {
    const before = fs.fstatSync(descriptor);
    if (!before.isFile()) fail("capture_file_type_invalid", "opened capture must be a regular file", reference.path);
    const selected = walked.at(-1);
    if (before.dev !== selected.dev || before.ino !== selected.ino) fail("capture_file_replaced", "opened capture differs from the authenticated path", reference.path);
    if (before.size !== reference.byte_length) fail("capture_byte_length_mismatch", "capture byte length differs from its reference", reference.path);
    const bytes = Buffer.allocUnsafe(reference.byte_length);
    let offset = 0;
    while (offset < bytes.length) {
      checkAbort(signal, reference.path);
      const count = fs.readSync(descriptor, bytes, offset, bytes.length - offset, offset);
      if (count === 0) break;
      offset += count;
    }
    if (offset !== reference.byte_length) fail("capture_byte_length_mismatch", "capture ended before its declared byte length", reference.path);
    const after = fs.fstatSync(descriptor);
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) {
      fail("capture_file_replaced", "capture changed while it was being read", reference.path);
    }
    for (const selectedComponent of walked) {
      let currentStat;
      try { currentStat = fs.lstatSync(selectedComponent.file); }
      catch { fail("capture_file_replaced", "capture path changed while it was being read", reference.path); }
      if (currentStat.isSymbolicLink() || currentStat.dev !== selectedComponent.dev || currentStat.ino !== selectedComponent.ino || currentStat.ctimeMs !== selectedComponent.ctimeMs) {
        fail("capture_file_replaced", "capture path changed while it was being read", reference.path);
      }
    }
    const actualDigest = digest(bytes);
    if (actualDigest !== reference.sha256) fail("capture_digest_mismatch", "capture content digest differs from its reference", reference.path);
    checkAbort(signal, reference.path);
    return {
      actual: { byte_length: bytes.length, sha256: actualDigest },
      bytes,
      fingerprint: { ctimeMs: after.ctimeMs, dev: after.dev, ino: after.ino, mtimeMs: after.mtimeMs, size: after.size },
    };
  } finally { fs.closeSync(descriptor); }
}

function validateSourceManifest(source, capturePath) {
  if (!source || !Array.isArray(source.files) || source.files.length === 0 || !DIGEST.test(source.sha256 ?? "")) {
    fail("capture_source_invalid", "capture source manifest is incomplete", capturePath);
  }
  const paths = new Set();
  for (const file of source.files) {
    if (!file || typeof file.path !== "string" || paths.has(file.path) || !DIGEST.test(file.sha256 ?? "")
      || !Number.isSafeInteger(file.byte_length) || file.byte_length < 1) {
      fail("capture_source_invalid", "capture source entries must have unique paths, digests, and byte lengths", capturePath);
    }
    paths.add(file.path);
  }
  if (digest(Buffer.from(JSON.stringify(source.files))) !== source.sha256) fail("capture_source_digest_mismatch", "capture source manifest digest is invalid", capturePath);
}

function validateCapture(capture, expected, capturePath) {
  if (!capture || capture.schema_version !== "2.0" || capture.record_kind !== "component_capture" || !DIGEST.test(capture.capture_id ?? "")) {
    fail("capture_record_invalid", "capture record identity is invalid", capturePath);
  }
  validateSourceManifest(capture.session?.source, capturePath);
  if (!equal(capture.environment, capture.session?.environment)) fail("capture_environment_mismatch", "capture and session environments differ", capturePath);
  if (capture.run?.id !== capture.session?.session_id || capture.run?.revision !== capture.session?.revision || capture.run?.attempt !== capture.session?.attempt) {
    fail("capture_run_mismatch", "capture run does not join its session", capturePath);
  }
  if (expected.expectedSource !== undefined && !equal(capture.session.source, expected.expectedSource)) fail("capture_source_drift", "capture source differs from the expected source manifest", capturePath);
  if (expected.expectedSession !== undefined && !equal(capture.session, expected.expectedSession)) fail("capture_session_mismatch", "capture session differs from the expected session", capturePath);
  if (expected.expectedRun !== undefined && !equal(capture.run, expected.expectedRun)) fail("capture_run_mismatch", "capture run differs from the expected run", capturePath);
  if (expected.expectedEnvironment !== undefined && !equal(capture.environment, expected.expectedEnvironment)) fail("capture_environment_mismatch", "capture environment differs from the expected environment", capturePath);
}

function resolveOnce(options) {
  const reference = checkedReference(options.reference);
  const read = secureRead(options.repositoryRoot, reference, options.signal);
  let capture;
  try { capture = parseStrictJson(read.bytes.toString("utf8")); }
  catch (error) { fail("capture_json_invalid", `capture is not strict JSON: ${error.message}`, reference.path); }
  validateCapture(capture, options, reference.path);
  return { ...read, capture, reference };
}

export function resolveEvidenceCapture(options) {
  if (!options || typeof options.repositoryRoot !== "string") fail("capture_root_invalid", "repositoryRoot is required");
  const first = resolveOnce(options);
  return {
    actual: first.actual,
    capture: first.capture,
    reference: first.reference,
    use(useOptions = {}) {
      try {
        const next = resolveOnce({ ...options, ...useOptions, reference: first.reference });
        if (!equal(next.fingerprint, first.fingerprint) || !equal(next.capture, first.capture)) fail("capture_file_replaced", "capture changed after initial resolution", first.reference.path);
        return { actual: next.actual, capture: next.capture, reference: next.reference };
      } catch (error) {
        if (error instanceof EvidenceCaptureError && error.code !== "capture_cancelled" && error.code !== "capture_file_replaced") {
          fail("capture_file_replaced", `capture failed use-time revalidation: ${error.code}`, first.reference.path);
        }
        throw error;
      }
    },
  };
}

export function resolveSharedEvidenceCapture(options) {
  if (!Array.isArray(options?.consumers) || options.consumers.length === 0) fail("capture_consumers_required", "at least one capture consumer is required");
  const owners = new Set();
  for (const consumer of options.consumers) {
    if (!consumer || typeof consumer.owner !== "string" || owners.has(consumer.owner)) fail("capture_consumer_duplicate", "capture consumers must have unique owners");
    owners.add(consumer.owner);
  }
  const unknownOwners = [...owners].filter((owner) => !REQUIRED_CAPTURE_OWNERS.includes(owner));
  if (unknownOwners.length > 0) fail("capture_owner_unknown", `unknown capture owner: ${unknownOwners.sort().join(", ")}`);
  const missingOwners = REQUIRED_CAPTURE_OWNERS.filter((owner) => !owners.has(owner));
  if (missingOwners.length > 0) fail("capture_owner_missing", `missing required capture owner: ${missingOwners.join(", ")}`);
  const references = new Set(options.consumers.map((consumer) => JSON.stringify(checkedReference(consumer.reference))));
  if (references.size !== 1) fail("capture_reference_multiple", "all profiles and the runtime manifest must reference one shared capture");
  const artifactCaptureIds = new Set(options.artifactCaptureIds ?? []);
  if (artifactCaptureIds.size > 1) fail("capture_artifact_mix", "artifacts from different captures cannot be accepted together");
  const resolved = resolveEvidenceCapture({ ...options, reference: options.consumers[0].reference });
  if (options.consumers.some((consumer) => consumer.capture_id !== resolved.capture.capture_id)) fail("capture_identity_mismatch", "consumer capture identity does not match the resolved capture", resolved.reference.path);
  if (artifactCaptureIds.size === 1 && !artifactCaptureIds.has(resolved.capture.capture_id)) fail("capture_artifact_mix", "artifact capture identity differs from the resolved capture", resolved.reference.path);
  return { ...resolved, consumers: options.consumers.map((consumer) => consumer.owner) };
}
