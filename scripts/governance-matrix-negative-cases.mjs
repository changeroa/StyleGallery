function matrixRow(governance, family) {
  return governance.split("\n").find((line) => line.startsWith(`| ${family} |`));
}

function duplicateRow(governance, row, replacement = row) {
  return governance.replace(row, `${row}\n${replacement}`);
}

function mutateCell(row, index, mutate) {
  const cells = row.split("|");
  cells[index] = ` ${mutate(cells[index].trim())} `;
  return cells.join("|");
}

function reverseCodeValues(cell) {
  const values = [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1]).reverse();
  return values.map((value) => `\`${value}\``).join(", ");
}

export function governanceMatrixCases(governance) {
  const profileRow = matrixRow(governance, "Governed local reference profiles");
  const stateRow = matrixRow(governance, "Component-state evidence matrices");
  if (!profileRow || !stateRow) throw new Error("canonical governance fixture must contain both reference ownership rows");

  const conflictingProfileRow = profileRow.replace(
    "`design-engineering/reference-profiles/governed-local/editorial/profile.json`",
    "`design-engineering/reference-profiles/governed-local/**`",
  );
  const reorderedProfileRow = mutateCell(profileRow, 2, reverseCodeValues);
  const reorderedStateSources = mutateCell(stateRow, 2, (cell) => {
    const values = reverseCodeValues(cell);
    return `Each profile's declared ${values.replace(/, ([^,]+)$/, ", and $1")} records`;
  });
  const reorderedStateRow = mutateCell(reorderedStateSources, 4, reverseCodeValues);

  return [
    {
      name: "duplicate_governed_profile_row",
      mutate: { "GOVERNANCE.md": duplicateRow(governance, profileRow) },
      expect: "GOVERNANCE.md: Governed local reference profiles row must appear exactly once",
    },
    {
      name: "conflicting_duplicate_governed_profile_row",
      mutate: { "GOVERNANCE.md": duplicateRow(governance, profileRow, conflictingProfileRow) },
      expect: "GOVERNANCE.md: Governed local reference profiles row must appear exactly once",
    },
    {
      name: "duplicate_component_state_row",
      mutate: { "GOVERNANCE.md": duplicateRow(governance, stateRow) },
      expect: "GOVERNANCE.md: Component-state evidence matrices row must appear exactly once",
    },
    {
      name: "duplicate_both_reference_rows",
      mutate: { "GOVERNANCE.md": duplicateRow(duplicateRow(governance, profileRow), stateRow) },
      expect: "GOVERNANCE.md: Governed local reference profiles row must appear exactly once",
    },
    {
      name: "profile_source_extra_prose",
      mutate: { "GOVERNANCE.md": governance.replace(profileRow, mutateCell(profileRow, 2, (cell) => `${cell} plus every generated matrix and evidence receipt`)) },
      expect: "GOVERNANCE.md: governed local reference profile sources must be the six explicit canonical profile files",
    },
    {
      name: "profile_artifact_extra_prose",
      mutate: { "GOVERNANCE.md": governance.replace(profileRow, mutateCell(profileRow, 4, (cell) => `${cell} plus every generated matrix`)) },
      expect: "GOVERNANCE.md: governed local reference profiles must be manual sources with no generated artifacts",
    },
    {
      name: "component_source_extra_prose",
      mutate: { "GOVERNANCE.md": governance.replace(stateRow, mutateCell(stateRow, 2, (cell) => `${cell} plus every related record`)) },
      expect: "GOVERNANCE.md: component-state evidence sources must be the four declared record families",
    },
    {
      name: "component_artifact_extra_prose",
      mutate: { "GOVERNANCE.md": governance.replace(stateRow, mutateCell(stateRow, 4, (cell) => `${cell} plus every generated matrix and evidence receipt`)) },
      expect: "GOVERNANCE.md: component-state generated artifacts must be the six declared matrices",
    },
    {
      name: "reordered_reference_matrix_cells",
      mutate: { "GOVERNANCE.md": governance.replace(profileRow, reorderedProfileRow).replace(stateRow, reorderedStateRow) },
      expect: null,
    },
  ];
}
