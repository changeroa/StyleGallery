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
    if (reference.startsWith("./") || reference.startsWith("docker://")) continue;
    if (!/^[^@\s]+@[a-f0-9]{40}$/i.test(reference)) failures.push(`${relative}: floating or unlabeled action ref ${line.trim().replace(/^-\s*/, "")}`);
  }
  return failures;
}

export function checkoutCredentialFailures(workflow, relative) {
  const failures = [];
  const lines = workflow.split("\n");
  for (const [index, line] of lines.entries()) {
    const usesEntry = mappingEntry(line);
    if (usesEntry?.key !== "uses" || !usesEntry.value.startsWith("actions/checkout@")) continue;
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
  const lines = workflow.split("\n");
  return [
    ...actionRefFailures(lines, relative),
    ...checkoutCredentialFailures(workflow, relative),
    ...permissionFailures(lines, relative),
  ];
}
