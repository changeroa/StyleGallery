import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { isPlainObject } from "./consumer-reference-schema.mjs";
import { validatePortableTokens } from "./reference-token-contract.mjs";

const layoutSourceSha = "775430bbaf4ee208a642220f440f6926d79c90a3";
const requiredResetFields = ["body_margin", "box_sizing", "figure_margin"];

function hash(content) {
  return `sha256:${crypto.createHash("sha256").update(content).digest("hex")}`;
}

function finding(code, relative, message) {
  return { code, message, path: relative };
}

function isInside(base, target) {
  const relative = path.relative(base, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function readJson({ failures, kind, relative, root }) {
  const absolute = path.resolve(root, relative);
  if (!fs.existsSync(absolute)) {
    failures.push(finding(`${kind}_unresolved`, relative, "profile artifact must exist beside profile.json"));
    return null;
  }
  const realRoot = fs.realpathSync(root);
  const realTarget = fs.realpathSync(absolute);
  if (!isInside(realRoot, realTarget)) {
    failures.push(finding(`${kind}_symlink_escape`, relative, "profile artifact resolves outside the repository root"));
    return null;
  }
  if (realTarget !== path.join(realRoot, relative)) {
    failures.push(finding(`${kind}_redirect`, relative, "profile artifact must remain at its exact sibling path"));
    return null;
  }
  if (!fs.statSync(realTarget).isFile()) {
    failures.push(finding(`${kind}_type_invalid`, relative, "profile artifact must be a regular JSON file"));
    return null;
  }
  const bytes = fs.readFileSync(realTarget);
  try {
    return { bytes, value: JSON.parse(bytes.toString("utf8")) };
  } catch (error) {
    failures.push(finding(`${kind}_json_invalid`, relative, error instanceof Error ? error.message : String(error)));
    return null;
  }
}

export function validateReferenceProfile({ item, relative, root }) {
  const failures = [];
  const add = (code, message) => failures.push(finding(code, relative, message));
  if (item.profile_kind !== "governed_local") add("profile_kind_governed_local", "profile_kind must be governed_local");
  if (item.artifact_mode !== "governed_local") add("profile_artifact_mode_governed_local", "governed-local profiles cannot be external consumers");
  if (item.maturity !== "experimental") add("profile_maturity_experimental", "governed-local profiles must remain experimental");
  if (item.example_only !== true) add("profile_example_only_required", "governed-local profiles must be example_only");
  if (item.default !== false) add("profile_default_forbidden", "governed-local profiles cannot be implicit or default");
  if (item.layout_source_sha !== layoutSourceSha) add("profile_layout_source_sha_required", `layout_source_sha must pin ${layoutSourceSha}`);
  if (typeof item.related_fixture_set_id !== "string" || item.related_fixture_set_id.length === 0) add("profile_related_fixture_set_required", "related_fixture_set_id is required");
  if (!isPlainObject(item.selection) || item.selection.required !== true || item.selection.method !== "profile_path") add("profile_explicit_selection_required", "selection must require an explicit profile_path");
  if (!isPlainObject(item.environment_assumptions) || typeof item.environment_assumptions.user_agent_styles !== "string" || item.environment_assumptions.user_agent_styles.length === 0) {
    add("profile_ua_assumption_required", "user-agent style assumptions must be explicit");
  }
  const reset = isPlainObject(item.environment_assumptions) ? item.environment_assumptions.reset : null;
  if (!isPlainObject(reset) || requiredResetFields.some((field) => typeof reset[field] !== "string" || reset[field].length === 0)) {
    add("profile_reset_assumptions_required", "body, box-sizing, and figure reset assumptions must be explicit");
  }
  if (item.tokens !== "tokens.dtcg.json") add("profile_tokens_path_required", "tokens must resolve to the sibling tokens.dtcg.json");
  if (item.local_foundations !== "local-foundations.json") add("profile_foundations_path_required", "foundations must resolve to the sibling local-foundations.json");

  const directory = path.posix.dirname(relative);
  const tokenRelative = path.posix.join(directory, "tokens.dtcg.json");
  const foundationRelative = path.posix.join(directory, "local-foundations.json");
  const tokenDocument = readJson({ failures, kind: "profile_tokens", relative: tokenRelative, root });
  const foundations = readJson({ failures, kind: "profile_foundations", relative: foundationRelative, root });
  if (tokenDocument) {
    for (const tokenFailure of validatePortableTokens(tokenDocument.value).failures) {
      failures.push(finding(tokenFailure.code, tokenRelative, tokenFailure.message));
    }
  }
  if (foundations) {
    if (!isPlainObject(foundations.value)
      || foundations.value.profile_id !== item.id
      || typeof foundations.value.identity !== "string"
      || !isPlainObject(foundations.value.bindings)) {
      failures.push(finding("profile_foundations_invalid", foundationRelative, "foundations require matching profile_id, identity, and bindings"));
    }
  }

  const summary = tokenDocument && foundations ? {
    foundationHash: hash(foundations.bytes),
    id: item.id,
    identity: foundations.value.identity,
    layoutSourceSha: item.layout_source_sha,
    relatedFixtureSetId: item.related_fixture_set_id,
    tokenHash: hash(tokenDocument.bytes),
  } : null;
  return { failures, summary };
}

export function validateReferenceProfileSet(summaries) {
  if (summaries.length < 2) return [];
  const failures = [];
  const unique = (field) => new Set(summaries.map((summary) => summary[field])).size;
  if (unique("layoutSourceSha") !== 1) failures.push(finding("profile_layout_source_mismatch", "<profiles>", "profiles must share one Layout source SHA"));
  if (unique("relatedFixtureSetId") !== 1) failures.push(finding("profile_related_set_mismatch", "<profiles>", "profiles must share one related fixture set"));
  if (unique("identity") !== summaries.length) failures.push(finding("profile_identity_not_distinct", "<profiles>", "adversarial profiles must declare distinct identities"));
  if (unique("tokenHash") !== summaries.length) failures.push(finding("profile_tokens_not_distinct", "<profiles>", "adversarial profiles must have distinct token bytes"));
  if (unique("foundationHash") !== summaries.length) failures.push(finding("profile_foundations_not_distinct", "<profiles>", "adversarial profiles must have distinct foundation bytes"));
  return failures;
}
