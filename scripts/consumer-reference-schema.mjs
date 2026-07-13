const fieldCodes = {
  artifact_mode: "artifact_mode_invalid",
  default: "profile_default_forbidden",
  example_only: "profile_example_only_required",
  fixture_independence: "fixture_independence_related",
  id: "item_id_invalid",
  layout_source_sha: "profile_layout_source_sha_required",
  local_foundations: "profile_foundations_path_required",
  maturity: "maturity_invalid",
  profile_kind: "profile_kind_governed_local",
  related_fixture_set_id: "profile_related_fixture_set_required",
  removal_trigger: "removal_trigger_invalid",
  replacement: "replacement_invalid",
  review_independence: "review_independence_single_account",
  schema_version: "schema_version_invalid",
  tokens: "profile_tokens_path_required",
};

export function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function scalarMatches(value, definition) {
  if (definition.type === "string" && typeof value !== "string") return false;
  if (definition.minLength !== undefined && Array.from(value).length < definition.minLength) return false;
  if (definition.pattern !== undefined && !new RegExp(definition.pattern).test(value)) return false;
  if (definition.const !== undefined && value !== definition.const) return false;
  return definition.enum === undefined || definition.enum.includes(value);
}

function unknownProperties(value, definitions) {
  return Object.keys(value).filter((key) => !Object.hasOwn(definitions, key));
}

function missingProperties(value, required) {
  return required.filter((key) => !Object.hasOwn(value, key));
}

function validateProfileObjects(item, schema, add) {
  if (Object.hasOwn(item, "environment_assumptions")) {
    const environment = item.environment_assumptions;
    const definition = schema.properties.environment_assumptions;
    if (!isPlainObject(environment)) {
      add("profile_environment_object_required", "environment_assumptions must be an object");
    } else {
      for (const property of unknownProperties(environment, definition.properties)) add("profile_environment_property_unknown", `unknown environment assumption ${property}`);
      if (!Object.hasOwn(environment, "user_agent_styles") || !scalarMatches(environment.user_agent_styles, definition.properties.user_agent_styles)) add("profile_ua_assumption_required", "user_agent_styles must be a non-empty string");
      const reset = environment.reset;
      if (!isPlainObject(reset)) {
        add("profile_reset_assumptions_required", "reset assumptions must be an object");
      } else {
        for (const property of unknownProperties(reset, definition.properties.reset.properties)) add("profile_reset_property_unknown", `unknown reset assumption ${property}`);
        for (const property of definition.properties.reset.required) {
          if (!Object.hasOwn(reset, property) || !scalarMatches(reset[property], definition.properties.reset.properties[property])) add("profile_reset_assumptions_required", `reset requires ${property}`);
        }
      }
    }
  }
  if (Object.hasOwn(item, "selection")) {
    const selection = item.selection;
    const definition = schema.properties.selection;
    if (!isPlainObject(selection)) {
      add("profile_selection_object_required", "selection must be an object");
    } else {
      for (const property of unknownProperties(selection, definition.properties)) add("profile_selection_property_unknown", `unknown selection property ${property}`);
      for (const property of definition.required) {
        if (!Object.hasOwn(selection, property) || !scalarMatches(selection[property], definition.properties[property])) add("profile_explicit_selection_required", `selection requires ${property}`);
      }
    }
  }
}

export function validateItemSchema(item, schema) {
  const findings = [];
  const add = (code, message) => findings.push({ code, message });
  if (!isPlainObject(item)) {
    add("item_object_required", "item must be a JSON object");
    return findings;
  }

  for (const property of unknownProperties(item, schema.properties)) {
    add("item_property_unknown", `unknown item property ${property}`);
  }
  for (const property of missingProperties(item, schema.required)) {
    add(property === "handoff" ? "handoff_required" : "item_field_required", `missing required field ${property}`);
  }
  for (const [property, code] of Object.entries(fieldCodes)) {
    if (Object.hasOwn(item, property) && !scalarMatches(item[property], schema.properties[property])) {
      add(code, `${property} does not satisfy the item schema`);
    }
  }

  if (Object.hasOwn(item, "owner")) {
    const definition = schema.properties.owner;
    if (!isPlainObject(item.owner)) {
      add("owner_object_required", "owner must be an object");
    } else {
      for (const property of unknownProperties(item.owner, definition.properties)) add("owner_property_unknown", `unknown owner property ${property}`);
      for (const property of missingProperties(item.owner, definition.required)) add(property === "name" ? "owner_name_required" : "owner_enforcement_placeholder", `owner requires ${property}`);
      if (Object.hasOwn(item.owner, "enforcement") && !scalarMatches(item.owner.enforcement, definition.properties.enforcement)) add("owner_enforcement_placeholder", "owner.enforcement must be placeholder");
      if (Object.hasOwn(item.owner, "name") && !scalarMatches(item.owner.name, definition.properties.name)) add("owner_name_invalid", "owner.name must be a non-empty string");
    }
  }

  if (Object.hasOwn(item, "support")) {
    const definition = schema.properties.support;
    if (!isPlainObject(item.support)) {
      add("support_object_required", "support must be an object");
    } else {
      for (const property of unknownProperties(item.support, definition.properties)) add("support_property_unknown", `unknown support property ${property}`);
      for (const property of missingProperties(item.support, definition.required)) add("support_status_required", `support requires ${property}`);
      if (Object.hasOwn(item.support, "status") && !scalarMatches(item.support.status, definition.properties.status)) add("support_status_invalid", "support.status must be active or ended");
    }
  }

  if (Object.hasOwn(item, "handoff")) {
    if (!isPlainObject(item.handoff)) {
      add("handoff_object_required", "handoff must be an object");
    } else {
      const variants = schema.properties.handoff.oneOf;
      const definition = variants.find((candidate) => candidate.properties.status.const === item.handoff.status);
      if (!definition) {
        add("handoff_status_invalid", "handoff status must be declared or not_applicable");
      } else {
        for (const property of unknownProperties(item.handoff, definition.properties)) add("handoff_property_unknown", `unknown handoff property ${property}`);
        for (const property of missingProperties(item.handoff, definition.required)) add(property === "record" ? "record_required" : "not_applicable_reason_sentence", `handoff requires ${property}`);
        if (definition.properties.record && Object.hasOwn(item.handoff, "record") && !scalarMatches(item.handoff.record, definition.properties.record)) add("record_schema_invalid", "record does not satisfy the schema path pattern");
        if (definition.properties.reason && Object.hasOwn(item.handoff, "reason") && !scalarMatches(item.handoff.reason, definition.properties.reason)) add("not_applicable_reason_sentence", "not_applicable requires the schema sentence rule");
      }
    }
  }

  validateProfileObjects(item, schema, add);

  if (item.maturity === "stable" && item.support?.status === "ended") add("stable_support_ended", "stable maturity cannot have ended support");
  if (item.maturity === "deprecated") {
    if (!Object.hasOwn(item, "replacement") || !Object.hasOwn(item, "removal_trigger")) add("deprecated_migration_required", "deprecated items require replacement and removal_trigger");
  }
  if (typeof item.review_independence === "boolean") add("review_independence_boolean", "review_independence does not accept boolean aliases");
  return findings;
}
