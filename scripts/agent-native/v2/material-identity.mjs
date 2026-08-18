import { createHash } from "node:crypto";

import { deepFreeze } from "../canonical-json.mjs";

export const MATERIAL_STABLE_REF_KINDS = Object.freeze(["domain", "page", "pattern", "material"]);
const KIND_SET = new Set(MATERIAL_STABLE_REF_KINDS);
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PATH_ID = /^path-sha256-[a-f0-9]{64}$/;
const DOMAIN_IDS = new Set(["layout", "motion", "design-engineering", "game-ui", "platform-guides", "design-terminology"]);
const MATERIAL_ID = PATH_ID;

export class MaterialIdentityError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = "MaterialIdentityError";
    this.code = code;
  }
}

function fail(code, message) { throw new MaterialIdentityError(code, message); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function referenceOf(input) {
  if (typeof input === "string") return input;
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  return input.stable_ref ?? input.reference;
}

/** Parse only the closed v2 material identity grammar. This is deliberately not part of v1 identity.mjs. */
export function parseMaterialStableRef(input) {
  if (input && typeof input === "object" && Object.hasOwn(input, "schema_version") && input.schema_version !== "2.0") {
    fail("material_identity_version_invalid", "material identities require schema_version 2.0");
  }
  const reference = referenceOf(input);
  if (typeof reference !== "string") fail("material_stable_ref_required", "v2 StableRef must be a string");
  const match = /^sg:(domain|page|pattern|material)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(reference);
  if (!match || !KIND_SET.has(match[1])) fail("material_stable_ref_invalid", "reference is not a v2 material StableRef");
  const [, kind, id] = match;
  if ((kind === "domain" && !DOMAIN_IDS.has(id))
    || ((kind === "page" || kind === "pattern" || kind === "material") && !PATH_ID.test(id))) {
    fail("material_stable_ref_invalid", "reference is outside the closed v2 material identity grammar");
  }
  return deepFreeze({ schema_version: "2.0", stable_ref: reference, kind, id });
}

export function createMaterialStableRef({ kind, id }) {
  if (!KIND_SET.has(kind)) fail("material_stable_ref_kind_invalid", "unsupported v2 material StableRef kind");
  if (typeof id !== "string" || !KEBAB.test(id)) fail("material_stable_ref_id_invalid", "v2 material StableRef id must be kebab-case");
  return parseMaterialStableRef(`sg:${kind}/${id}`).stable_ref;
}

export function materialIdentityForRecord(record) {
  if (!record || typeof record !== "object" || !MATERIAL_ID.test(record.stable_ref?.replace(/^sg:material\//, "") ?? "")) {
    fail("material_record_identity_invalid", "record does not carry a v2 material source identity");
  }
  const repositoryPath = record.repository_path;
  if (typeof repositoryPath !== "string") fail("material_record_identity_invalid", "record has no bound source path");
  let kind = "page";
  let id = `path-sha256-${sha256(Buffer.from(repositoryPath, "utf8"))}`;
  const domainMatch = /^(layout|motion|design-engineering|game-ui|platform-guides|design-terminology)\/index\.md$/.exec(repositoryPath);
  if (domainMatch) { kind = "domain"; id = domainMatch[1]; }
  else if (/^patterns\/[^/]+\/[^/]+\.md$/.test(repositoryPath)) kind = "pattern";
  return deepFreeze({
    schema_version: "2.0",
    stable_ref: createMaterialStableRef({ kind, id }),
    kind,
    source_ref: record.stable_ref,
    source_version_id: record.version_id,
  });
}

export const parseV2StableRef = parseMaterialStableRef;
