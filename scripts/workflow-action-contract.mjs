function indentation(line) {
  return line.length - line.trimStart().length;
}

function mappingKeyIndentation(line) {
  const sequencePrefix = line.match(/^\s*-\s+/);
  return sequencePrefix ? sequencePrefix[0].length : indentation(line);
}

function mappingEntry(line) {
  const match = line.trim().replace(/^-\s+/, "").match(/^(?:([A-Za-z][A-Za-z0-9_-]*)|'([^']*)'|"([^"]*)")\s*:\s*(.*)$/);
  if (!match) return null;
  return { key: match[1] ?? match[2] ?? match[3], value: match[4] };
}

function isMappingHeader(entry, key) {
  return entry?.key === key && (entry.value === "" || entry.value.startsWith("#"));
}

function isBlockScalarHeader(value) {
  return /^[|>](?:[+-]?[1-9]|[1-9]?[+-])?(?:\s+#.*)?$/.test(value);
}

function structuralLines(lines) {
  let blockScalarIndentation = null;
  return lines.map((line) => {
    if (line.trim() === "" || line.trimStart().startsWith("#")) return line;
    const lineIndentation = indentation(line);
    if (blockScalarIndentation !== null && lineIndentation > blockScalarIndentation) return "";
    blockScalarIndentation = null;
    const entry = mappingEntry(line);
    if (entry && isBlockScalarHeader(entry.value)) blockScalarIndentation = lineIndentation;
    return line;
  });
}

function notationFailures(lines, relative) {
  let actionBlockScalar = false;
  let anchorsOrAliases = false;
  let directives = false;
  let documentMarkers = false;
  let escapedDoubleQuotedKey = false;
  let explicitMappingKey = false;
  let flowCollectionValue = false;
  let flowSequenceMapping = false;
  let mergeKey = false;
  let tags = false;
  for (const line of lines) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    const lineIndentation = indentation(line);
    const trimmed = line.trim();
    const structural = trimmed.replace(/^-\s+/, "");
    if (lineIndentation === 0 && /^%(?:YAML|TAG)\b/.test(trimmed)) directives = true;
    if (lineIndentation === 0 && /^(?:---|\.\.\.)(?:\s+#.*)?$/.test(trimmed)) documentMarkers = true;
    if (/^\?(?:\s|$)/.test(structural)) explicitMappingKey = true;
    if (/^!\S*(?:\s|$)/.test(structural)) tags = true;
    if (/^[&*][^\s:[\]{},]+(?:\s|:|$)/.test(structural)) anchorsOrAliases = true;
    if (/^<<\s*:/.test(structural)) mergeKey = true;
    const quotedKey = trimmed.match(/^(?:-\s+)?"((?:[^"\\]|\\.)*)"\s*:/)?.[1];
    if (quotedKey?.includes("\\")) escapedDoubleQuotedKey = true;
    if (/^-\s*\{/.test(trimmed)) flowSequenceMapping = true;
    const entry = mappingEntry(line);
    if (/^[\[{]/.test(entry?.value ?? "") || (!/^-\s*\{/.test(trimmed) && /^[\[{]/.test(structural))) flowCollectionValue = true;
    if (/^!\S*(?:\s|$)/.test(entry?.value ?? "")) tags = true;
    if (/^[&*][^\s[\]{},]+(?:\s|$)/.test(entry?.value ?? "")) anchorsOrAliases = true;
    if (entry?.key === "uses" && isBlockScalarHeader(entry.value)) actionBlockScalar = true;
  }
  const failures = [];
  if (directives) failures.push(`${relative}: YAML directives are forbidden`);
  if (documentMarkers) failures.push(`${relative}: YAML document markers are forbidden`);
  if (explicitMappingKey) failures.push(`${relative}: explicit mapping keys are forbidden`);
  if (tags) failures.push(`${relative}: YAML tags are forbidden`);
  if (anchorsOrAliases) failures.push(`${relative}: YAML anchors and aliases are forbidden`);
  if (mergeKey) failures.push(`${relative}: YAML merge keys are forbidden`);
  if (actionBlockScalar) failures.push(`${relative}: block scalar action refs are forbidden`);
  if (flowCollectionValue) failures.push(`${relative}: flow-style collection values are forbidden`);
  if (flowSequenceMapping) failures.push(`${relative}: flow-style sequence mappings are forbidden`);
  if (escapedDoubleQuotedKey) failures.push(`${relative}: escape sequences in double-quoted mapping keys are forbidden`);
  return failures;
}

function directMappingLines(lines, headerIndex, headerIndentation) {
  const nested = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    const lineIndentation = indentation(line);
    if (lineIndentation <= headerIndentation) break;
    nested.push({ indentation: lineIndentation, trimmed: line.trim() });
  }
  if (nested.length === 0) return [];
  const directIndentation = Math.min(...nested.map((line) => line.indentation));
  return nested.filter((line) => line.indentation === directIndentation).map((line) => line.trimmed);
}

function actionRefFailures(lines, relative) {
  const failures = [];
  for (const line of lines) {
    const entry = mappingEntry(line);
    if (entry?.key !== "uses") continue;
    const reference = entry.value.match(/^([^\s#]+)/)?.[1];
    if (!reference) continue;
    if (reference.startsWith("./")) continue;
    if (reference.startsWith("docker://")) {
      failures.push(`${relative}: docker action refs are forbidden ${line.trim().replace(/^-\s*/, "")}`);
      continue;
    }
    if (!/^[^@\s]+@[a-f0-9]{40}$/i.test(reference)) failures.push(`${relative}: floating or unlabeled action ref ${line.trim().replace(/^-\s*/, "")}`);
  }
  return failures;
}

export function checkoutCredentialFailures(workflow, relative) {
  const failures = [];
  const lines = structuralLines(workflow.split("\n"));
  for (const [index, line] of lines.entries()) {
    const usesEntry = mappingEntry(line);
    if (usesEntry?.key !== "uses" || !/^actions\/checkout@/i.test(usesEntry.value)) continue;
    const usesIndentation = mappingKeyIndentation(line);
    const withHeaders = [];
    for (const [offset, following] of lines.slice(index + 1).entries()) {
      if (following.trim() === "" || following.trimStart().startsWith("#")) continue;
      const followingIndentation = indentation(following);
      if (followingIndentation < usesIndentation) break;
      if (followingIndentation === usesIndentation && isMappingHeader(mappingEntry(following), "with")) withHeaders.push(index + offset + 1);
    }
    const entries = withHeaders.length === 1 ? directMappingLines(lines, withHeaders[0], usesIndentation) : [];
    const credentialEntries = entries.map(mappingEntry).filter((entry) => entry?.key === "persist-credentials");
    const exactFalse = credentialEntries.length === 1 && /^false(?:\s+#.*)?$/.test(credentialEntries[0].value);
    if (!exactFalse) failures.push(`${relative}: every actions/checkout step must set persist-credentials: false`);
  }
  return failures;
}

function permissionFailures(lines, relative) {
  const failures = [];
  const headers = lines
    .map((line, index) => ({ entry: mappingEntry(line), index, indentation: indentation(line) }))
    .filter(({ entry }) => entry?.key === "permissions");
  if (headers.some((header) => header.indentation > 0)) failures.push(`${relative}: job-level permissions overrides are forbidden`);
  const topLevel = headers.filter((header) => header.indentation === 0);
  let exact = topLevel.length === 1 && isMappingHeader(topLevel[0].entry, "permissions");
  if (exact) {
    const entries = [];
    for (const line of lines.slice(topLevel[0].index + 1)) {
      if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
      if (indentation(line) === 0) break;
      entries.push(line.trim());
    }
    exact = entries.length === 1 && entries[0] === "contents: read";
  }
  if (!exact) failures.push(`${relative}: top-level permissions must be exactly contents: read`);
  return failures;
}

export function workflowActionFailures(workflow, relative) {
  const lines = structuralLines(workflow.split("\n"));
  return [
    ...notationFailures(lines, relative),
    ...actionRefFailures(lines, relative),
    ...checkoutCredentialFailures(workflow, relative),
    ...permissionFailures(lines, relative),
  ];
}
