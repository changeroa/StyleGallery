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

function matrixRow(governance, family) {
  const line = governance.split("\n").find((candidate) => candidate.startsWith(`| ${family} |`));
  return line ? line.split("|").slice(1, -1).map((cell) => cell.trim()) : null;
}

function hasExactCodeValues(cell, expected) {
  if (typeof cell !== "string") return false;
  const actual = [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  return actual.length === expected.length && new Set(actual).size === expected.length && expected.every((value) => actual.includes(value));
}

export function referenceOwnershipFailures(governance) {
  const failures = [];
  const profileRow = matrixRow(governance, "Governed local reference profiles");
  if (profileRow) {
    if (!hasExactCodeValues(profileRow[1], governedProfileSources)) failures.push("GOVERNANCE.md: governed local reference profile sources must be the six explicit canonical profile files");
    if (profileRow[2] !== "Manual" || profileRow[3] !== "None") failures.push("GOVERNANCE.md: governed local reference profiles must be manual sources with no generated artifacts");
  }
  const stateRow = matrixRow(governance, "Component-state evidence matrices");
  if (stateRow) {
    if (!hasExactCodeValues(stateRow[1], componentStateSources)) failures.push("GOVERNANCE.md: component-state evidence sources must be the four declared record families");
    if (!hasExactCodeValues(stateRow[3], componentStateArtifacts)) failures.push("GOVERNANCE.md: component-state generated artifacts must be the six declared matrices");
  }
  return failures;
}
