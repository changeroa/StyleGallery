import fs from "node:fs";
import path from "node:path";
import { parseStrictJson } from "./strict-json.mjs";

const referenceKinds = Object.freeze({
  component: { field: "component_records", pattern: /^components\/[a-z0-9-]+\.component\.json$/, required: 1 },
  evidence: { field: "evidence_records", pattern: /^evidence\/[a-z0-9-]+\.evidence\.json$/, required: 1 },
  fixture: { field: "fixture_records", pattern: /^fixtures\/[a-z0-9-]+\.fixture\.json$/, required: 1 },
  generated: { field: "generated_records", pattern: /^generated\/[a-z0-9-]+\.md$/, required: 3 },
  states: { field: "state_records", pattern: /^states\/[a-z0-9-]+\.states\.json$/, required: 1 },
});

function finding(code, file, message) {
  return { code, message, path: file };
}

function isInside(base, target) {
  const relative = path.relative(base, target);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function isNormalizedRelative(reference) {
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

function resolveReference(profileRoot, reference, kind, profileFile, failures) {
  const definition = referenceKinds[kind];
  if (!isNormalizedRelative(reference)) {
    failures.push(finding("profile_reference_outside", profileFile, `${definition.field} contains an unsafe reference`));
    return undefined;
  }
  if (!definition.pattern.test(reference)) {
    failures.push(finding("profile_reference_unknown", profileFile, `${definition.field} contains unknown reference ${reference}`));
    return undefined;
  }
  const target = path.resolve(profileRoot, reference);
  if (!isInside(profileRoot, target)) {
    failures.push(finding("profile_reference_outside", profileFile, `${reference} escapes its profile`));
    return undefined;
  }
  if (!fs.existsSync(target)) {
    failures.push(finding("profile_reference_missing", profileFile, `${reference} does not exist`));
    return undefined;
  }
  const metadata = fs.lstatSync(target);
  if (metadata.isSymbolicLink()) {
    failures.push(finding("profile_reference_symlink", profileFile, `${reference} must not be a symlink`));
    return undefined;
  }
  if (!metadata.isFile()) {
    failures.push(finding("profile_reference_type_invalid", profileFile, `${reference} must be a regular file`));
    return undefined;
  }
  const realRoot = fs.realpathSync(profileRoot);
  const realTarget = fs.realpathSync(target);
  if (!isInside(realRoot, realTarget)) {
    failures.push(finding("profile_reference_outside", profileFile, `${reference} resolves outside its profile`));
    return undefined;
  }
  if (realTarget !== path.join(realRoot, reference)) {
    failures.push(finding("profile_reference_redirect", profileFile, `${reference} resolves through a redirect`));
    return undefined;
  }
  if (kind === "generated") return { path: realTarget, reference };
  try {
    return { path: realTarget, reference, value: parseStrictJson(fs.readFileSync(realTarget, "utf8")) };
  } catch (error) {
    failures.push(finding("profile_reference_json_invalid", reference, error instanceof Error ? error.message : String(error)));
    return undefined;
  }
}

function resolveFixtureLinks(resolved, profileFile, failures) {
  const fixture = resolved.fixture[0];
  const component = resolved.component[0];
  const states = resolved.states[0];
  if (!fixture || !component || !states) return;
  for (const [field, expected] of [["component_record", component.path], ["state_record", states.path]]) {
    const reference = fixture.value[field];
    const safe = typeof reference === "string"
      && reference.length > 0
      && !path.posix.isAbsolute(reference)
      && !path.win32.isAbsolute(reference)
      && !reference.includes("\\")
      && !reference.includes("?")
      && !reference.includes("#")
      && !/^[A-Za-z][A-Za-z\d+.-]*:/.test(reference)
      && path.posix.normalize(reference) === reference;
    if (!safe) {
      failures.push(finding("fixture_reference_invalid", fixture.reference, `${field} must be normalized and profile-local`));
      continue;
    }
    const actual = path.resolve(path.dirname(fixture.path), reference);
    if (actual !== expected) failures.push(finding("fixture_reference_mismatch", fixture.reference, `${field} does not resolve to the profile-declared record`));
  }
  if (fixture.value.profile_id !== component.value.profile_id || fixture.value.profile_id !== states.value.profile_id) {
    failures.push(finding("profile_identity_mismatch", profileFile, "fixture links cross profile identities"));
  }
}

export function resolveProfileRecords(profileRoot, failures) {
  const profileFile = path.join(profileRoot, "profile.json");
  if (!fs.existsSync(profileFile) || fs.lstatSync(profileFile).isSymbolicLink() || !fs.lstatSync(profileFile).isFile()) {
    failures.push(finding("profile_file_invalid", profileFile, "profile.json must be a regular non-symlink file"));
    return undefined;
  }
  let profile;
  try {
    profile = parseStrictJson(fs.readFileSync(profileFile, "utf8"));
  } catch (error) {
    failures.push(finding("profile_json_invalid", profileFile, error instanceof Error ? error.message : String(error)));
    return undefined;
  }
  const resolved = {};
  for (const [kind, definition] of Object.entries(referenceKinds)) {
    const references = profile[definition.field];
    if (!Array.isArray(references)) {
      failures.push(finding("profile_reference_required", profileFile, `${definition.field} must contain exactly ${definition.required} references`));
      resolved[kind] = [];
      continue;
    }
    if (new Set(references).size !== references.length) failures.push(finding("profile_reference_duplicate", profileFile, `${definition.field} must not repeat references`));
    if (references.length !== definition.required) failures.push(finding("profile_reference_required", profileFile, `${definition.field} must contain exactly ${definition.required} references`));
    resolved[kind] = references.map((reference) => resolveReference(profileRoot, reference, kind, profileFile, failures)).filter(Boolean);
  }
  for (const record of [resolved.component[0], resolved.evidence[0], resolved.fixture[0], resolved.states[0]].filter(Boolean)) {
    if (record.value.profile_id !== profile.id) failures.push(finding("profile_identity_mismatch", record.reference, `record profile_id must equal ${profile.id}`));
  }
  resolveFixtureLinks(resolved, profileFile, failures);
  return { profile, profileFile, records: resolved };
}
