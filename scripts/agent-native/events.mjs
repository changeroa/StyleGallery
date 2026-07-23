import { cloneAndFreeze, canonicalize, hashCanonical } from "./canonical-json.mjs";

function sourceObject(value, name) {
  if (Array.isArray(value)) return { events: value };
  if (!value || typeof value !== "object") throw new TypeError(`${name} expects an object`);
  return value;
}

function pick(value, ...keys) {
  if (!value || typeof value !== "object") return undefined;
  for (const key of keys) if (Object.hasOwn(value, key)) return value[key];
  return undefined;
}

function eventId(event) {
  return pick(event, "event_id", "eventId", "id", "stable_ref", "stableRef");
}

function parentIds(event) {
  const parents = pick(event, "parents", "parent_ids", "parentIds");
  if (parents === undefined || parents === null) return [];
  if (!Array.isArray(parents)) throw new TypeError("event parents must be an array");
  return [...new Set(parents.map((parent) => {
    if (typeof parent !== "string" || parent.length === 0) throw new TypeError("event parent IDs must be non-empty strings");
    return parent;
  }))].sort();
}

function canonicalFreeze(value) {
  return cloneAndFreeze(JSON.parse(canonicalize(value)));
}

function normalizeEvent(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("event must be an object");
  const copy = structuredClone(input);
  const id = eventId(copy);
  if (id !== undefined && (typeof id !== "string" || id.length === 0)) throw new TypeError("event ID must be a non-empty string");
  const stableRef = pick(copy, "stable_ref", "stableRef");
  const parents = parentIds(copy);
  delete copy.eventId;
  delete copy.event_id;
  delete copy.parentIds;
  delete copy.parent_ids;
  delete copy.parents;
  delete copy.id;
  delete copy.stableRef;
  delete copy.stable_ref;
  const body = { ...copy, parents };
  if (stableRef !== undefined) body.stable_ref = stableRef;
  const stableId = typeof id === "string" && id.length > 0 ? id : `sg:event/${hashCanonical(body).slice("sha256:".length)}`;
  return { event_id: stableId, parents, ...body };
}

function normalizedEvents(value) {
  const source = sourceObject(value, "event collection");
  const events = pick(source, "events", "items", "entries");
  if (!Array.isArray(events)) throw new TypeError("events must be an array");
  const result = [];
  const byId = new Map();
  for (const item of events) {
    const normalized = normalizeEvent(item);
    const id = normalized.event_id;
    const previous = byId.get(id);
    if (previous) {
      if (canonicalize(previous) !== canonicalize(normalized)) throw new TypeError(`event ${id} is immutable`);
      continue;
    }
    byId.set(id, normalized);
    result.push(normalized);
  }
  const ids = new Set(result.map((item) => item.event_id));
  const visiting = new Set();
  const visited = new Set();
  const eventById = new Map(result.map((item) => [item.event_id, item]));
  const visit = (id) => {
    if (visiting.has(id)) throw new TypeError(`event cycle includes ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const parent of eventById.get(id).parents) if (eventById.has(parent)) visit(parent);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of ids) visit(id);
  return result;
}

/**
 * Append one event to an immutable causal event collection. Existing IDs are
 * idempotent only when their canonical bytes are identical; a changed payload
 * is rejected rather than silently rewriting history.
 */
export function appendEvent(input) {
  const source = sourceObject(input, "appendEvent");
  const existing = normalizedEvents(source);
  const appended = normalizeEvent(pick(source, "event") ?? source);
  const existingById = new Map(existing.map((item) => [item.event_id, item]));
  const previous = existingById.get(appended.event_id);
  if (previous && canonicalize(previous) !== canonicalize(appended)) throw new TypeError(`event ${appended.event_id} is immutable`);
  if (previous) return canonicalFreeze(existing);
  return canonicalFreeze(normalizedEvents({ events: [...existing, appended] }));
}

export const appendCausalEvent = appendEvent;

/** Return the deterministic leaf IDs of an append-only causal DAG. */
export function eventHeads(input) {
  const events = normalizedEvents(input);
  const ids = new Set(events.map((item) => item.event_id));
  const referenced = new Set(events.flatMap((item) => item.parents.filter((parent) => ids.has(parent))));
  return canonicalFreeze([...ids].filter((id) => !referenced.has(id)).sort());
}

export const getEventHeads = eventHeads;
