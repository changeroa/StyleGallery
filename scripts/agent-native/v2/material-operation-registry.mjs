import { deepFreeze } from "../canonical-json.mjs";
import { materialContext } from "./material-context.mjs";
import { materialDiscover, materialGet, materialSearch } from "./material-queries.mjs";

export class MaterialOperationRegistryError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = "MaterialOperationRegistryError";
    this.code = code;
  }
}

const operations = deepFreeze([
  {
    schema_version: "2.0", name: "material-context", stable_ref: "sg:operation/material-context",
    read_only: true, effect_class: "NONE",
    input_schema: { type: "object", additionalProperties: false, required: ["query"], properties: { query: { type: "string" }, budget_tokens: { type: "integer", minimum: 256, maximum: 32768, default: 8192 } } },
  },
  {
    schema_version: "2.0", name: "material-discover", stable_ref: "sg:operation/material-discover",
    read_only: true, effect_class: "NONE", input_schema: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    schema_version: "2.0", name: "material-get", stable_ref: "sg:operation/material-get",
    read_only: true, effect_class: "NONE",
    input_schema: { type: "object", additionalProperties: false, required: ["reference"], properties: { reference: { type: "string" }, offset: { type: "integer", minimum: 0 }, length: { type: "integer", minimum: 1, maximum: 65536 } } },
  },
  {
    schema_version: "2.0", name: "material-search", stable_ref: "sg:operation/material-search",
    read_only: true, effect_class: "NONE",
    input_schema: { type: "object", additionalProperties: false, required: ["query"], properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100 } } },
  },
].sort((left, right) => left.name < right.name ? -1 : 1));

const PUBLIC_MESSAGES = Object.freeze({
  material_byte_length_mismatch: "material source identity does not match the manifest",
  material_context_accounting_failed: "material context accounting failed",
  material_context_budget_invalid: "budget_tokens must be an integer from 256 to 32768",
  material_context_budget_too_small: "budget cannot contain the material context envelope",
  material_context_input_unsafe: "material context input must contain only own plain data",
  material_context_manifest_override_forbidden: "material manifest override is forbidden",
  material_context_repository_path_forbidden: "repository path input is forbidden",
  material_context_transaction_drift: "material context transaction changed during retrieval",
  material_context_trust_merge_forbidden: "trust-record merge is forbidden",
  material_domain_set_invalid: "governed domain metadata is invalid",
  material_git_mode_invalid: "material source tracking is invalid",
  material_identity_version_invalid: "reference identity version is invalid",
  material_input_invalid: "operation input must be an object",
  material_input_unknown: "operation input contains an unsupported field",
  material_inventory_failed: "material source tracking is unavailable",
  material_length_invalid: "length must be an integer from 1 to 65536",
  material_manifest_cardinality_invalid: "material manifest metadata is invalid",
  material_manifest_duplicate: "material manifest metadata is invalid",
  material_manifest_invalid: "material manifest metadata is invalid",
  material_manifest_order_invalid: "material manifest metadata is invalid",
  material_manifest_path_set_invalid: "material manifest metadata is invalid",
  material_manifest_version_invalid: "material manifest metadata is invalid",
  material_offset_invalid: "offset must be a non-negative safe integer",
  material_offset_past_end: "offset is past the end of the material",
  material_operation_failed: "v2 material operation failed",
  material_operation_required: "operation name is required",
  material_operation_unknown: "unknown v2 material operation",
  material_path_escape: "material source containment is invalid",
  material_path_not_regular: "material source type is invalid",
  material_path_symlink: "material source type is invalid",
  material_path_unavailable: "material source is unavailable",
  material_path_untracked: "material source tracking is invalid",
  material_query_empty: "query must contain a Unicode word token",
  material_query_invalid: "query must be a valid Unicode string",
  material_query_oversized: "query exceeds 4096 UTF-8 bytes",
  material_range_overflow: "offset plus length exceeds the safe integer range",
  material_read_failed: "material source could not be read",
  material_read_invalid: "material source read is invalid",
  material_record_binding_invalid: "material manifest metadata is invalid",
  material_record_invalid: "material manifest metadata is invalid",
  material_reference_invalid: "reference must be a v2 material StableRef",
  material_reference_not_found: "v2 material StableRef is absent from the manifest",
  material_registry_canonical_invalid: "material registry metadata is invalid",
  material_registry_file_invalid: "material registry is unavailable",
  material_registry_json_invalid: "material registry metadata is invalid",
  material_registry_race: "material registry identity changed during read",
  material_repository_invalid: "material repository is unavailable",
  material_search_limit_invalid: "limit must be an integer from 1 to 100",
  material_source_hash_mismatch: "material source identity does not match the manifest",
  material_source_race: "material source identity changed during read",
  material_source_utf8_invalid: "material source is not valid UTF-8",
  material_utf8_split_end: "page end splits a UTF-8 code point",
  material_utf8_split_start: "offset splits a UTF-8 code point",
});
function failure(code) { return { code, message: PUBLIC_MESSAGES[code] ?? PUBLIC_MESSAGES.material_operation_failed }; }
function failed(operation, error) {
  const code = typeof error?.code === "string" && Object.hasOwn(PUBLIC_MESSAGES, error.code) ? error.code : "material_operation_failed";
  return deepFreeze({ ok: false, operation, failures: [failure(code)] });
}
function succeeded(operation, result) { return deepFreeze({ ok: true, operation, result }); }

export function createMaterialOperationRegistry({ repositoryRoot, fileSystem, sourceReader, gitRunner } = {}) {
  if (typeof repositoryRoot !== "string" || repositoryRoot.length === 0) throw new MaterialOperationRegistryError("material_repository_invalid", "repositoryRoot is required");
  const handlers = new Map([
    ["material-context", (input) => materialContext({ repositoryRoot, input, fileSystem, sourceReader, gitRunner })],
    ["material-discover", (input) => {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new MaterialOperationRegistryError("material_input_invalid", "input must be an object");
      if (Object.keys(input).length > 0) throw new MaterialOperationRegistryError("material_input_unknown", "material-discover accepts no input fields");
      return materialDiscover({ repositoryRoot, fileSystem });
    }],
    ["material-get", (input) => materialGet({ repositoryRoot, input, fileSystem, sourceReader, gitRunner })],
    ["material-search", (input) => materialSearch({ repositoryRoot, input, fileSystem, sourceReader, gitRunner })],
  ]);
  const invoke = (operation, input = {}) => {
    if (typeof operation !== "string" || operation.length === 0) return failed(null, new MaterialOperationRegistryError("material_operation_required", "operation name is required"));
    const handler = handlers.get(operation);
    if (!handler) return failed(null, new MaterialOperationRegistryError("material_operation_unknown", "unknown v2 material operation"));
    try { return succeeded(operation, handler(input)); } catch (error) { return failed(operation, error); }
  };
  return Object.freeze({ invoke, operations });
}

export function invokeMaterialOperation(operation, input, registry) {
  if (!registry || typeof registry.invoke !== "function") throw new MaterialOperationRegistryError("material_registry_invalid", "v2 material registry is required");
  return registry.invoke(operation, input);
}

export const materialOperationSpecs = operations;
