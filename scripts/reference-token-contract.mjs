const allowedTypes = new Set(["border", "color", "dimension", "duration"]);
const aliasPattern = /^\{([a-z0-9]+(?:[.-][a-z0-9]+)*)\}$/;
const tokenNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const unsafePathSegments = new Set(["__proto__", "constructor", "prototype"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finding(code, tokenPath, message) {
  return { code, message, path: tokenPath || "<root>" };
}

function validatePathSegment(segment, tokenPath) {
  if (unsafePathSegments.has(segment)) return [finding("token_path_segment_unsafe", tokenPath, `path segment ${segment} is unsafe for the pinned adapter`)];
  if (!tokenNamePattern.test(segment)) return [finding("token_name_invalid", tokenPath, "token names must use lowercase kebab-case")];
  return [];
}

function exactKeys(value, allowed, tokenPath) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => finding("token_value_property_unknown", tokenPath, `unsupported value property ${key}`));
}

function validateDimension(value, tokenPath) {
  if (!isObject(value)) return [finding("token_value_invalid", tokenPath, "dimension must be an object")];
  const failures = exactKeys(value, new Set(["unit", "value"]), tokenPath);
  if (typeof value.value !== "number" || !Number.isFinite(value.value)) failures.push(finding("token_value_invalid", tokenPath, "dimension value must be finite"));
  if (!["px", "rem"].includes(value.unit)) failures.push(finding("token_unit_unsupported", tokenPath, "dimension unit must be px or rem"));
  return failures;
}

function validateDuration(value, tokenPath) {
  if (!isObject(value)) return [finding("token_value_invalid", tokenPath, "duration must be an object")];
  const failures = exactKeys(value, new Set(["unit", "value"]), tokenPath);
  if (typeof value.value !== "number" || !Number.isFinite(value.value) || value.value < 0) failures.push(finding("token_value_invalid", tokenPath, "duration value must be non-negative and finite"));
  if (!["ms", "s"].includes(value.unit)) failures.push(finding("token_unit_unsupported", tokenPath, "duration unit must be ms or s"));
  return failures;
}

function validateColor(value, tokenPath) {
  if (!isObject(value)) return [finding("token_value_invalid", tokenPath, "color must be an object")];
  const failures = exactKeys(value, new Set(["alpha", "colorSpace", "components"]), tokenPath);
  const validComponents = Array.isArray(value.components) && value.components.length === 3 && value.components.every((component) => typeof component === "number" && component >= 0 && component <= 1);
  if (value.colorSpace !== "srgb" || !validComponents || (value.alpha !== undefined && (typeof value.alpha !== "number" || value.alpha < 0 || value.alpha > 1))) {
    failures.push(finding("token_value_invalid", tokenPath, "color must use bounded sRGB components and optional alpha"));
  }
  return failures;
}

function parseReference(value, expectedType, tokenPath) {
  const match = typeof value === "string" ? aliasPattern.exec(value) : null;
  if (!match) return { failures: [finding("alias_whole_required", tokenPath, "references must be whole-token curly aliases")], references: [] };
  return { failures: [], references: [{ expectedType, source: tokenPath, target: match[1] }] };
}

function validateBorder(value, tokenPath) {
  if (!isObject(value)) return { failures: [finding("token_value_invalid", tokenPath, "border must be an object")], references: [] };
  const failures = exactKeys(value, new Set(["color", "style", "width"]), tokenPath);
  const references = [];
  if (value.style !== "solid") failures.push(finding("token_value_invalid", tokenPath, "only the tested solid border style is supported"));
  if (typeof value.color === "string") {
    const result = parseReference(value.color, "color", tokenPath);
    failures.push(...result.failures);
    references.push(...result.references);
  } else failures.push(...validateColor(value.color, tokenPath));
  if (typeof value.width === "string") {
    const result = parseReference(value.width, "dimension", tokenPath);
    failures.push(...result.failures);
    references.push(...result.references);
  } else failures.push(...validateDimension(value.width, tokenPath));
  return { failures, references };
}

function validateDirectValue(token) {
  if (typeof token.value === "string") return parseReference(token.value, token.type, token.path);
  if (token.type === "border") return validateBorder(token.value, token.path);
  if (token.type === "color") return { failures: validateColor(token.value, token.path), references: [] };
  if (token.type === "dimension") return { failures: validateDimension(token.value, token.path), references: [] };
  return { failures: validateDuration(token.value, token.path), references: [] };
}

export function validatePortableTokens(document) {
  const failures = [];
  const references = [];
  const tokens = [];
  if (!isObject(document)) return { failures: [finding("token_document_object_required", "", "token document must be an object")], tokens };

  function walk(node, segments, inheritedType) {
    if (!isObject(node)) {
      failures.push(finding("token_node_object_required", segments.join("."), "groups and tokens must be objects"));
      return;
    }
    const tokenPath = segments.join(".");
    if (Object.hasOwn(node, "$description") && typeof node.$description !== "string") failures.push(finding("token_description_invalid", tokenPath, "$description must be a string"));
    const serialized = JSON.stringify(node);
    if (/"(?:resolver|modifiers?|themes?)"\s*:/.test(serialized)) failures.push(finding("token_resolver_forbidden", tokenPath, "resolvers, modifiers, and themes are outside the portable subset"));
    const reserved = Object.keys(node).filter((key) => key.startsWith("$"));
    if (reserved.includes("$extends")) failures.push(finding("token_extends_forbidden", tokenPath, "$extends is outside the portable subset"));
    if (reserved.includes("$ref")) failures.push(finding("token_json_pointer_forbidden", tokenPath, "JSON Pointer references are outside the portable subset"));
    for (const key of reserved.filter((key) => !["$description", "$type", "$value", "$extends", "$ref"].includes(key))) {
      failures.push(finding("token_unknown_reserved", tokenPath, `unsupported reserved field ${key}`));
    }
    const declaredType = node.$type;
    if (declaredType !== undefined && !allowedTypes.has(declaredType)) failures.push(finding("token_type_unsupported", tokenPath, `unsupported token type ${String(declaredType)}`));
    const effectiveType = allowedTypes.has(declaredType) ? declaredType : inheritedType;
    if (Object.hasOwn(node, "$value")) {
      const allowed = new Set(["$description", "$type", "$value"]);
      for (const key of Object.keys(node).filter((key) => !allowed.has(key) && !key.startsWith("$"))) failures.push(finding("token_property_unknown", tokenPath, `token contains child property ${key}`));
      if (!effectiveType) failures.push(finding("token_type_required", tokenPath, "token requires an allowed explicit or inherited type"));
      else tokens.push({ path: tokenPath, type: effectiveType, value: node.$value });
      return;
    }
    const children = Object.entries(node).filter(([key]) => !key.startsWith("$"));
    if (children.length === 0) failures.push(finding("token_group_empty", tokenPath, "group must contain at least one token"));
    for (const [key, child] of children) {
      failures.push(...validatePathSegment(key, [...segments, key].join(".")));
      walk(child, [...segments, key], effectiveType);
    }
  }

  for (const [key, node] of Object.entries(document)) {
    if (key.startsWith("$")) failures.push(finding("token_unknown_reserved", "", `root field ${key} is unsupported`));
    else {
      failures.push(...validatePathSegment(key, key));
      walk(node, [key], undefined);
    }
  }
  for (const token of tokens) {
    const result = validateDirectValue(token);
    failures.push(...result.failures);
    references.push(...result.references);
  }
  const byPath = new Map(tokens.map((token) => [token.path, token]));
  for (const reference of references) {
    const target = byPath.get(reference.target);
    if (!target) failures.push(finding("alias_dangling", reference.source, `alias target ${reference.target} does not exist`));
    else if (target.type !== reference.expectedType) failures.push(finding("alias_type_mismatch", reference.source, `alias target ${reference.target} has type ${target.type}`));
  }
  const edges = new Map(references.filter((reference) => byPath.has(reference.target)).map((reference) => [reference.source, reference.target]));
  for (const start of edges.keys()) {
    const seen = new Set();
    let cursor = start;
    while (edges.has(cursor)) {
      if (seen.has(cursor)) {
        failures.push(finding("alias_cycle", start, "alias graph contains a cycle"));
        break;
      }
      seen.add(cursor);
      cursor = edges.get(cursor);
    }
  }
  const uniqueFailures = [...new Map(failures.map((item) => [`${item.code}:${item.path}:${item.message}`, item])).values()];
  return { failures: uniqueFailures, tokens: tokens.sort((left, right) => left.path.localeCompare(right.path)) };
}
