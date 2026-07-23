import { deepFreeze } from "./canonical-json.mjs";
import { createStableRef, createVersionId, parseStableRef, parseVersionId } from "./identity.mjs";

const CONTROL_KEYS = new Set([
  "record_kind", "schema_version", "stable_ref", "stableRef", "version_id", "versionId",
]);
const PASSING = new Set(["PASS", "PASSED", "VALID", "VALIDATED", "OK"]);

export class LearningError extends TypeError {
  constructor(code, message, path = "") {
    super(message);
    this.name = "LearningError";
    this.code = code;
    if (path) this.path = path;
  }
}

export function failLearning(code, message, path = "") {
  throw new LearningError(code, message, path);
}

export function own(value, ...keys) {
  if (!value || typeof value !== "object") return undefined;
  for (const key of keys) if (Object.hasOwn(value, key)) return value[key];
  return undefined;
}

export function learningObject(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failLearning("learning_object_required", `${path} expects an object`, path);
  }
  return value;
}

export function copyLearning(value) {
  if (value === undefined || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => (item === undefined ? null : copyLearning(item)));
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, copyLearning(item)]),
  );
}

export function compactLearning(fields) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}

export function textLearning(value, path) {
  if (typeof value !== "string" || value.trim() === "") {
    failLearning("learning_text_required", `${path} must be a non-empty string`, path);
  }
  return value;
}

export function stableLearningRef(value, path, fallback) {
  try {
    return createStableRef(value ?? fallback);
  } catch (error) {
    failLearning("learning_stable_ref_invalid", error instanceof Error ? error.message : String(error), path);
  }
}

function canonicalFields(source) {
  return Object.fromEntries(
    Object.entries(source)
      .filter(([key, value]) => !CONTROL_KEYS.has(key) && value !== undefined)
      .map(([key, value]) => [key, copyLearning(value)]),
  );
}

export function makeLearningRecord(input, stableRef, recordKind, fields) {
  const source = learningObject(input, recordKind);
  if (source.record_kind !== undefined && source.record_kind !== recordKind) {
    failLearning("learning_record_kind_invalid", `${recordKind} cannot be created from ${source.record_kind}`, "record_kind");
  }
  if (source.schema_version !== undefined && source.schema_version !== "1.0") {
    failLearning("learning_schema_version_invalid", "learning records require schema_version 1.0", "schema_version");
  }
  const stable_ref = stableLearningRef(stableRef, "stable_ref");
  const payload = {
    schema_version: "1.0",
    record_kind: recordKind,
    stable_ref,
    ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
  };
  const version_id = createVersionId({ stable_ref, payload });
  const supplied = own(source, "version_id", "versionId");
  if (supplied !== undefined && supplied !== version_id) {
    failLearning("learning_version_mismatch", "version_id does not match immutable content", "version_id");
  }
  return deepFreeze({ ...copyLearning(payload), version_id });
}

export function assertLearningRecord(value, recordKind, path = recordKind) {
  const source = learningObject(value, path);
  if (Object.hasOwn(source, "stableRef") || Object.hasOwn(source, "versionId")) {
    failLearning("learning_record_alias_forbidden", `${path} must use canonical identity keys`, path);
  }
  if (source.record_kind !== recordKind) {
    failLearning("learning_record_kind_invalid", `${path} must be ${recordKind}`, `${path}.record_kind`);
  }
  if (source.schema_version !== "1.0") {
    failLearning("learning_schema_version_invalid", `${path} must use schema_version 1.0`, `${path}.schema_version`);
  }
  const stable_ref = stableLearningRef(own(source, "stable_ref", "stableRef"), `${path}.stable_ref`);
  const version_id = own(source, "version_id", "versionId");
  const payload = copyLearning(source);
  delete payload.version_id;
  delete payload.versionId;
  try {
    parseVersionId({ payload, stable_ref, version_id });
  } catch (error) {
    failLearning(
      "learning_record_version_invalid",
      `${path} VersionID does not bind its canonical bytes: ${error instanceof Error ? error.message : String(error)}`,
      `${path}.version_id`,
    );
  }
  return deepFreeze(copyLearning(source));
}

function canonicalAliases(source) {
  const fields = canonicalFields(source);
  const aliases = [
    ["independence_group", "independentGroup"],
    ["proposal_ref", "proposalRef"],
    ["proposal_version_id", "proposalVersionId"],
    ["receipt_id", "receiptId"],
    ["source_ref", "sourceRef"],
    ["source_version_id", "sourceVersionId"],
  ];
  for (const [canonical, alias] of aliases) {
    if (fields[canonical] === undefined && fields[alias] !== undefined) fields[canonical] = fields[alias];
    delete fields[alias];
  }
  return fields;
}

function applyBindings(fields, bindings, path) {
  for (const [key, expected] of Object.entries(bindings)) {
    if (fields[key] !== undefined && fields[key] !== expected) {
      failLearning("learning_link_mismatch", `${path}.${key} does not match its governed parent`, `${path}.${key}`);
    }
    fields[key] = expected;
  }
  return fields;
}

export function makeEvidenceRecords(values, options) {
  if (!Array.isArray(values) || values.length === 0) {
    failLearning("learning_evidence_required", "at least one evidence record is required", options.path);
  }
  return values.map((item, index) => {
    const path = `${options.path}/${index}`;
    const source = learningObject(item, path);
    const stableRef = stableLearningRef(
      own(source, "stable_ref", "stableRef"),
      `${path}.stable_ref`,
      `sg:evidence/${options.slug}-${index + 1}`,
    );
    if (parseStableRef(stableRef).kind !== "evidence") {
      failLearning("learning_record_kind_invalid", `${path}.stable_ref must use sg:evidence/...`, `${path}.stable_ref`);
    }
    const fields = applyBindings(canonicalAliases(source), options.bindings ?? {}, path);
    return makeLearningRecord(source, stableRef, "evidence_link", fields);
  });
}

export function makeValidationRecord(value, options) {
  const source = learningObject(value, options.path);
  const fields = canonicalAliases(source);
  if (fields.validator === undefined && fields.validator_actor !== undefined) fields.validator = fields.validator_actor;
  if (fields.validator_version === undefined && fields.version !== undefined) fields.validator_version = fields.version;
  delete fields.validator_actor;
  delete fields.version;
  fields.validator = textLearning(fields.validator, `${options.path}.validator`).trim();
  const status = textLearning(fields.status, `${options.path}.status`).toUpperCase();
  if (!PASSING.has(status)) {
    failLearning("learning_validation_not_passed", `${options.path} must have a passing status`, `${options.path}.status`);
  }
  fields.status = status;
  applyBindings(fields, options.bindings ?? {}, options.path);
  if (parseStableRef(options.stableRef).kind !== "validation") {
    failLearning("learning_record_kind_invalid", `${options.path}.stable_ref must use sg:validation/...`, `${options.path}.stable_ref`);
  }
  return makeLearningRecord(source, options.stableRef, "validation_report", fields);
}

export function assertLink(record, key, expected, path) {
  if (record[key] !== expected) {
    failLearning("learning_link_mismatch", `${path}.${key} must bind ${expected}`, `${path}.${key}`);
  }
}

export function assertEvidenceRecords(values, bindings, path = "evidence") {
  if (!Array.isArray(values) || values.length === 0) {
    failLearning("learning_evidence_required", `${path} requires at least one evidence record`, path);
  }
  return values.map((value, index) => {
    const record = assertLearningRecord(value, "evidence_link", `${path}/${index}`);
    if (parseStableRef(record.stable_ref).kind !== "evidence") {
      failLearning("learning_record_kind_invalid", `${path}/${index} must use sg:evidence/...`, `${path}/${index}/stable_ref`);
    }
    for (const [key, expected] of Object.entries(bindings ?? {})) assertLink(record, key, expected, `${path}/${index}`);
    return record;
  });
}

export function assertValidationRecord(value, bindings, path = "validation") {
  const record = assertLearningRecord(value, "validation_report", path);
  if (parseStableRef(record.stable_ref).kind !== "validation") {
    failLearning("learning_record_kind_invalid", `${path} must use sg:validation/...`, `${path}.stable_ref`);
  }
  if (!PASSING.has(String(record.status).toUpperCase())) {
    failLearning("learning_validation_not_passed", `${path} must have a passing status`, `${path}.status`);
  }
  const validator = textLearning(record.validator, `${path}.validator`);
  if (validator !== validator.trim()) {
    failLearning("learning_actor_invalid", `${path}.validator must be canonical`, `${path}.validator`);
  }
  for (const [key, expected] of Object.entries(bindings ?? {})) assertLink(record, key, expected, path);
  return record;
}

export function nextLearningRegistry(registry, targetRef, versionId) {
  if (registry === undefined) return undefined;
  const source = learningObject(registry, "registry");
  const entries = own(source, "entries");
  if (!Array.isArray(entries)) {
    failLearning("learning_registry_invalid", "registry.entries must be an array", "registry.entries");
  }
  const nextEntries = entries.map(copyLearning);
  const index = nextEntries.findIndex((entry) => own(entry, "stable_ref", "stableRef") === targetRef);
  const replacement = { stable_ref: targetRef, version_id: versionId };
  if (index === -1) nextEntries.push(replacement);
  else nextEntries[index] = { ...nextEntries[index], ...replacement };
  nextEntries.sort((a, b) => {
    const left = String(own(a, "stable_ref", "stableRef"));
    const right = String(own(b, "stable_ref", "stableRef"));
    return left < right ? -1 : left > right ? 1 : 0;
  });
  return deepFreeze({ ...copyLearning(source), entries: nextEntries });
}
