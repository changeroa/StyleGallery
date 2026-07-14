const governedProfileSources = [
  "design-engineering/reference-profiles/governed-local/editorial/profile.json",
  "design-engineering/reference-profiles/governed-local/editorial/tokens.dtcg.json",
  "design-engineering/reference-profiles/governed-local/editorial/local-foundations.json",
  "design-engineering/reference-profiles/governed-local/terminal/profile.json",
  "design-engineering/reference-profiles/governed-local/terminal/tokens.dtcg.json",
  "design-engineering/reference-profiles/governed-local/terminal/local-foundations.json",
];

const componentStateSources = ["components/*.component.json", "states/*.states.json", "fixtures/*.fixture.json", "evidence/*.evidence.json"];
const componentStateArtifacts = ["editorial", "terminal"].flatMap((profile) =>
  ["state-matrix.md", "keyboard-matrix.md", "evidence-coverage.md"].map(
    (artifact) => `design-engineering/reference-profiles/governed-local/${profile}/generated/${artifact}`,
  ),
);

function matrixRows(governance, family) {
  return governance
    .split("\n")
    .filter((candidate) => /^ {0,3}\|/.test(candidate) && candidate.trimStart().startsWith(`| ${family} |`))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

function codeListValues(cell, finalAnd) {
  if (typeof cell !== "string" || cell.length === 0) return null;
  const parts = cell.split(", ");
  if (finalAnd) {
    const last = parts.at(-1);
    if (parts.length < 2 || !last?.startsWith("and ")) return null;
    parts[parts.length - 1] = last.slice(4);
  } else if (parts.some((part) => part.startsWith("and "))) {
    return null;
  }
  const actual = [];
  for (const part of parts) {
    const match = part.match(/^`([^`]+)`$/);
    if (!match) return null;
    actual.push(match[1]);
  }
  return actual;
}

function hasExpectedValues(actual, expected) {
  if (!actual) return false;
  return actual.length === expected.length && new Set(actual).size === expected.length && expected.every((value) => actual.includes(value));
}

export function referenceOwnershipFailures(governance) {
  const failures = [];
  const profileRows = matrixRows(governance, "Governed local reference profiles");
  if (profileRows.length !== 1) {
    failures.push("GOVERNANCE.md: Governed local reference profiles row must appear exactly once");
  } else {
    const profileRow = profileRows[0];
    if (!hasExpectedValues(codeListValues(profileRow[1], false), governedProfileSources)) failures.push("GOVERNANCE.md: governed local reference profile sources must be the six explicit canonical profile files");
    if (profileRow[2] !== "Manual" || profileRow[3] !== "None") failures.push("GOVERNANCE.md: governed local reference profiles must be manual sources with no generated artifacts");
  }
  const stateRows = matrixRows(governance, "Component-state evidence matrices");
  if (stateRows.length !== 1) {
    failures.push("GOVERNANCE.md: Component-state evidence matrices row must appear exactly once");
  } else {
    const stateRow = stateRows[0];
    const sourceCell = stateRow[1];
    const sourcePrefix = "Each profile's declared ";
    const sourceSuffix = " records";
    const sourceValues = sourceCell?.startsWith(sourcePrefix) && sourceCell.endsWith(sourceSuffix)
      ? codeListValues(sourceCell.slice(sourcePrefix.length, -sourceSuffix.length), true)
      : null;
    if (!hasExpectedValues(sourceValues, componentStateSources)) failures.push("GOVERNANCE.md: component-state evidence sources must be the four declared record families");
    if (!hasExpectedValues(codeListValues(stateRow[3], false), componentStateArtifacts)) failures.push("GOVERNANCE.md: component-state generated artifacts must be the six declared matrices");
  }
  return failures;
}
