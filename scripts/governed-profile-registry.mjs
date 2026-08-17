import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { isPlainObject, validateItemSchema } from "./consumer-reference-schema.mjs";
import { resolveProfileRecords } from "./profile-record-contract.mjs";
import { validateReferenceProfile, validateReferenceProfileSet } from "./reference-profile-contract.mjs";
import { parseStrictJson } from "./strict-json.mjs";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const itemSchema = parseStrictJson(fs.readFileSync(path.join(moduleRoot, "consumer-reference/schema/item.schema.json"), "utf8"));
const governedButtonSchema = parseStrictJson(fs.readFileSync(path.join(moduleRoot, "consumer-reference/schema/governed-button-profile.schema.json"), "utf8"));
const validateFullItemSchema = new Ajv2020({ allErrors: true, strict: false }).compile(governedButtonSchema);

export const canonicalGovernedProfilePaths = Object.freeze([
  "design-engineering/reference-profiles/governed-local/editorial/profile.json",
  "design-engineering/reference-profiles/governed-local/terminal/profile.json",
]);

function finding(code, recordPath, message) {
  return { code, message, path: recordPath };
}

function isInside(base, target) {
  const relative = path.relative(base, target);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function resolveRegisteredFile(root, relative, failures) {
  if (!canonicalGovernedProfilePaths.includes(relative)) {
    failures.push(finding("profile_registry_unregistered", relative, "profile path is not in the canonical governed profile inventory"));
    return undefined;
  }
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, relative);
  if (!isInside(resolvedRoot, target) || target !== path.join(resolvedRoot, relative)) {
    failures.push(finding("profile_registry_path_invalid", relative, "registered profile path must remain normalized and repository-local"));
    return undefined;
  }
  let current = resolvedRoot;
  for (const segment of relative.split("/")) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) {
      failures.push(finding("profile_registry_missing", relative, "registered profile path does not exist"));
      return undefined;
    }
    if (fs.lstatSync(current).isSymbolicLink()) {
      failures.push(finding("profile_registry_symlink", relative, "registered profile path must not traverse a symlink"));
      return undefined;
    }
  }
  if (!fs.lstatSync(target).isFile()) {
    failures.push(finding("profile_registry_type_invalid", relative, "registered profile must be a regular JSON file"));
    return undefined;
  }
  const realRoot = fs.realpathSync(resolvedRoot);
  const realTarget = fs.realpathSync(target);
  if (!isInside(realRoot, realTarget) || realTarget !== path.join(realRoot, relative)) {
    failures.push(finding("profile_registry_redirect", relative, "registered profile must not resolve through a filesystem redirect"));
    return undefined;
  }
  return realTarget;
}

export function validateGovernedProfile({ relative, root }) {
  const failures = [];
  const file = resolveRegisteredFile(root, relative, failures);
  if (!file) return { failures, profile: undefined, summary: undefined };
  let profile;
  try {
    profile = parseStrictJson(fs.readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(finding("profile_json_invalid", relative, error instanceof Error ? error.message : String(error)));
    return { failures, profile: undefined, summary: undefined };
  }
  if (!validateFullItemSchema(profile)) {
    for (const error of validateFullItemSchema.errors ?? []) failures.push(finding("item_schema_invalid", relative, `${error.instancePath || "/"} ${error.message}`));
  }
  for (const issue of validateItemSchema(profile, itemSchema)) failures.push(finding(issue.code, relative, issue.message));
  const profileValidation = validateReferenceProfile({ item: profile, relative, root });
  failures.push(...profileValidation.failures);
  const records = resolveProfileRecords(path.dirname(file), failures);
  if (profile.handoff?.status !== "declared" || profile.handoff?.record !== relative) {
    failures.push(finding("profile_registry_handoff_mismatch", relative, "registered profile handoff must name its exact inventory path"));
  }
  if (records?.profile?.id !== profile.id) failures.push(finding("profile_identity_mismatch", relative, "resolved profile identity must match the validated registry item"));
  return { failures, profile, summary: profileValidation.summary };
}

export function validateGovernedProfileInventory({ root }) {
  const records = new Map();
  const failures = [];
  const summaries = [];
  const resolvedRoot = path.resolve(root);
  if (!fs.existsSync(resolvedRoot) || fs.lstatSync(resolvedRoot).isSymbolicLink() || !fs.lstatSync(resolvedRoot).isDirectory() || fs.realpathSync(resolvedRoot) !== resolvedRoot) {
    failures.push(finding("profile_registry_root_invalid", resolvedRoot, "governed profile repository root must be a regular non-symlink directory"));
    return { failures, records };
  }
  for (const relative of canonicalGovernedProfilePaths) {
    const result = validateGovernedProfile({ relative, root });
    records.set(relative, result);
    failures.push(...result.failures);
    if (result.summary) summaries.push(result.summary);
  }
  const identities = new Map();
  for (const [relative, result] of records) {
    if (!isPlainObject(result.profile) || typeof result.profile.id !== "string") continue;
    const previous = identities.get(result.profile.id);
    if (previous) failures.push(finding("profile_registry_identity_duplicate", relative, `profile identity duplicates ${previous}`));
    else identities.set(result.profile.id, relative);
  }
  failures.push(...validateReferenceProfileSet(summaries));
  const uniqueFailures = [...new Map(failures.map((issue) => [`${issue.code}:${issue.path}:${issue.message}`, issue])).values()];
  return { failures: uniqueFailures, records };
}

export function isIndependentPromotionProfile(profile) {
  return isPlainObject(profile)
    && profile.profile_kind === "governed_local"
    && profile.artifact_mode === "governed_local"
    && profile.fixture_independence === "independent"
    && !Object.hasOwn(profile, "related_fixture_set_id")
    && profile.example_only === false
    && profile.maturity !== "deprecated"
    && profile.support?.status === "active";
}
