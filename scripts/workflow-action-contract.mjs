export function checkoutCredentialFailures(workflow, relative) {
  const failures = [];
  const lines = workflow.split("\n");
  for (const [index, line] of lines.entries()) {
    if (!line.trim().startsWith("uses: actions/checkout@")) continue;
    const indentation = line.length - line.trimStart().length;
    let credentialsPersist = true;
    for (const following of lines.slice(index + 1)) {
      if (following.trim() === "") continue;
      const followingIndentation = following.length - following.trimStart().length;
      if (followingIndentation < indentation || (followingIndentation === indentation && following.trim().startsWith("uses:"))) break;
      if (followingIndentation > indentation && following.trim() === "persist-credentials: false") credentialsPersist = false;
    }
    if (credentialsPersist) failures.push(`${relative}: every actions/checkout step must set persist-credentials: false`);
  }
  return failures;
}
