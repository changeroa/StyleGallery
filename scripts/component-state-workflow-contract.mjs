const artifactHarness = "node scripts/test-validate-component-state-artifacts.mjs";
const pinnedContainer = "mcr.microsoft.com/playwright:v1.61.0-noble@sha256:57b65fdc9ceabe0ef613124c7bbe2babcf9362c4d85e382fe3b03604e84b428a";
const sharedRoot = "$STATE_EVIDENCE_ROOT";

function jobSection(workflow, jobName) {
  const marker = `  ${jobName}:\n`;
  const start = workflow.indexOf(marker);
  if (start === -1) return "";
  const remainder = workflow.slice(start + marker.length);
  const nextJob = remainder.search(/^  [a-z0-9][a-z0-9-]*:\s*$/m);
  return nextJob === -1 ? remainder : remainder.slice(0, nextJob);
}

function normalized(line) {
  return line.trim().replace(/\s*\\$/, "");
}

function commandCount(section, command) {
  return section.split("\n").filter((line) => normalized(line).replace(/^(?:-\s+)?run:\s+/, "") === command).length;
}

function invocation(section, command) {
  const lines = section.split("\n");
  const starts = lines.flatMap((line, index) => normalized(line) === command ? [index] : []);
  if (starts.length !== 1) return [];
  const start = starts[0];
  const indentation = lines[start].search(/\S/);
  const block = [command];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].trim() && lines[index].search(/\S/) <= indentation) break;
    if (lines[index].trim()) block.push(normalized(lines[index]));
  }
  return block;
}

function hasAdjacentLines(section, first, second) {
  const lines = section.split("\n");
  return lines.some((line, index) => line === first && lines[index + 1] === second);
}

export function componentStateWorkflowFailures(workflow) {
  const failures = [];
  const validateJob = jobSection(workflow, "validate");
  const componentJob = jobSection(workflow, "component-state-evidence");
  const totalHarnesses = commandCount(workflow, artifactHarness);
  const componentHarnesses = commandCount(componentJob, artifactHarness);
  if (commandCount(validateJob, artifactHarness) > 0) failures.push("browser-dependent artifact/session harness must not run in validate job");
  if (componentHarnesses === 0) failures.push("component-state artifact/session harness must run in Playwright container job");
  if (totalHarnesses !== 1 || componentHarnesses !== 1) failures.push("artifact/session harness must run exactly once and only in component-state-evidence job");
  if (!hasAdjacentLines(componentJob, "    container:", `      image: ${pinnedContainer}`)) failures.push("component-state container.image must equal pinned Playwright digest");
  if (/runner\.temp|RUNNER_TEMP/.test(componentJob)) failures.push("component-state Playwright container job must not use runner temp paths");
  if (!hasAdjacentLines(componentJob, "    env:", "      STATE_EVIDENCE_ROOT: .tmp/consumer-reference-state")) failures.push("missing shared component-state workspace path STATE_EVIDENCE_ROOT: .tmp/consumer-reference-state");
  if (!componentJob.includes(`    env:\n      STATE_EVIDENCE_ROOT: .tmp/consumer-reference-state\n      SENTINEL_CONTAINER_IMAGE: ${pinnedContainer}`)) failures.push("component-state job must export the pinned Playwright image identity");

  const runtime = invocation(componentJob, `STATE_ARTIFACT_DIR="${sharedRoot}/runtime"`);
  if (!runtime.includes(`STATE_SESSION_RECEIPT="${sharedRoot}/capture-session.json"`)) failures.push("component-state runtime must bind receipt under shared root");
  const finalizer = invocation(componentJob, "node scripts/finalize-component-state-evidence.mjs");
  if (!finalizer.includes(`--artifact-root "${sharedRoot}"`)) failures.push("component-state finalizer must use shared artifact root");
  if (!finalizer.includes(`--output "${sharedRoot}/runtime-manifest.json"`)) failures.push("component-state finalizer must write manifest under shared root");
  const validator = invocation(componentJob, "node scripts/validate-component-state.mjs");
  if (!validator.includes(`--artifact-root "${sharedRoot}"`)) failures.push("component-state validator must use shared artifact root");
  if (!validator.includes(`--runtime-manifest "${sharedRoot}/runtime-manifest.json"`)) failures.push("component-state validator must read manifest under shared root");
  const creator = invocation(componentJob, "node scripts/create-component-state-session.mjs");
  if (!creator.includes(`--output "${sharedRoot}/capture-session.json"`)) failures.push("missing shared component-state workspace path --output \"$STATE_EVIDENCE_ROOT/capture-session.json\"");
  if (!componentJob.split("\n").includes("          path: ${{ env.STATE_EVIDENCE_ROOT }}/")) failures.push("missing shared component-state workspace path path: ${{ env.STATE_EVIDENCE_ROOT }}/");
  return failures;
}
