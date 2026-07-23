import { canonicalize, cloneAndFreeze, deepFreeze } from "./canonical-json.mjs";
import { parseStableRef, parseVersionId } from "./identity.mjs";

export class ImmutableStoreError extends TypeError {
  constructor(code, message, path = "") {
    super(message);
    this.name = "ImmutableStoreError";
    this.code = code;
    if (path) this.path = path;
  }
}

function fail(code, message, path) {
  throw new ImmutableStoreError(code, message, path);
}

function recordRef(record) {
  const stable_ref = record?.stable_ref ?? record?.stableRef;
  const version_id = record?.version_id ?? record?.versionId;
  if (typeof stable_ref !== "string") fail("store_stable_ref_required", "append requires a StableRef", "stable_ref");
  if (typeof version_id !== "string") fail("store_version_id_required", "append requires a VersionID", "version_id");
  parseStableRef(stable_ref);
  parseVersionId({ version_id, stable_ref, payload: record });
  return { stable_ref, version_id };
}

function cloneRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("store_record_invalid", "append requires an object record");
  try { canonicalize(value); } catch (error) { fail(error.code ?? "store_record_invalid", error.message); }
  return cloneAndFreeze(value);
}

function compare(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/** Create an append-only in-memory store exposing only frozen copies. */
export function createImmutableStore(input = {}) {
  const byVersion = new Map();
  const byStableRef = new Map();
  const initial = input.entries ?? input.records ?? [];
  if (!Array.isArray(initial)) fail("store_entries_required", "store entries must be an array", "entries");

  const append = (candidate) => {
    const value = !candidate?.stable_ref && !candidate?.stableRef
      ? (candidate?.object ?? candidate?.record ?? candidate?.value ?? candidate)
      : candidate;
    const { stable_ref, version_id } = recordRef(value);
    const frozen = cloneRecord(value);
    const existing = byVersion.get(version_id);
    if (existing) {
      if (canonicalize(existing) !== canonicalize(frozen)) fail("store_version_conflict", "VersionID is already bound to different immutable bytes", "version_id");
      return existing;
    }
    byVersion.set(version_id, frozen);
    const versions = byStableRef.get(stable_ref) ?? [];
    byStableRef.set(stable_ref, [...versions, frozen]);
    return frozen;
  };

  for (const entry of initial) append(entry);

  const entries = () => [...byVersion.values()].sort((left, right) => compare(left.stable_ref ?? left.stableRef, right.stable_ref ?? right.stableRef) || compare(left.version_id ?? left.versionId, right.version_id ?? right.versionId));
  const resolve = (reference) => {
    const value = typeof reference === "string" ? reference : reference?.stable_ref ?? reference?.stableRef ?? reference?.version_id ?? reference?.versionId;
    if (typeof value !== "string") fail("store_reference_required", "resolve requires a StableRef or VersionID");
    if (value.includes("@sha256:")) {
      parseVersionId(value);
      return byVersion.get(value);
    }
    try { parseStableRef(value); } catch (error) { fail(error.code ?? "store_reference_invalid", error.message); }
    const versions = byStableRef.get(value) ?? [];
    return versions.length === 0 ? undefined : versions[versions.length - 1];
  };

  const snapshot = () => deepFreeze({ entries: entries(), size: byVersion.size });
  return deepFreeze({
    append,
    get: resolve,
    resolve,
    has: (reference) => resolve(reference) !== undefined,
    entries: snapshot,
    listEntries: snapshot,
    all: snapshot,
    snapshot,
    get size() { return byVersion.size; },
  });
}

export const createStore = createImmutableStore;

export function appendImmutable(input) {
  if (!input || typeof input !== "object") fail("store_input_required", "appendImmutable requires {store, record}");
  const store = input.store ?? input.target;
  const record = input.record ?? input.object ?? input.value;
  if (!store || typeof store.append !== "function") fail("store_required", "appendImmutable requires an immutable store", "store");
  return store.append(record);
}

export const appendObject = appendImmutable;
