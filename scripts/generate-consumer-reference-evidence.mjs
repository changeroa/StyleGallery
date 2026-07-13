#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { resolveProfileRecords } from "./profile-record-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const options = { check: false, json: false, root: path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local") };
const failures = [];
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") options.json = true;
  else if (argument === "--check") options.check = true;
  else if (argument === "--root") {
    const value = process.argv[index + 1];
    if (!value) failures.push({ code: "argument_value_required", message: "--root requires a directory", path: "<cli>" });
    else { options.root = path.resolve(value); index += 1; }
  } else failures.push({ code: "argument_unknown", message: `unsupported argument ${argument}`, path: "<cli>" });
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isSorted(values) {
  return values.every((value, index) => index === 0 || compare(values[index - 1], value) <= 0);
}

function duplicateValues(values) {
  const seen = new Set();
  return [...new Set(values.filter((value) => seen.has(value) || !seen.add(value)))];
}

function escapeMarkdown(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("|", "&#124;")
    .replaceAll("`", "&#96;")
    .replace(/\r\n?|\n/g, "<br>");
}

function codeCell(value) {
  return `<code>${escapeMarkdown(value)}</code>`;
}

function markdownTable(headers, rows) {
  return [`| ${headers.map(escapeMarkdown).join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");
}

function frontmatter(title, description) {
  return `---\ntype: Generated Evidence\ntitle: ${JSON.stringify(String(title))}\ndescription: ${JSON.stringify(String(description))}\n---\n\n<!-- Generated from canonical JSON. Do not edit. -->`;
}

function navigation(parentLabel, parentPath, nextLabel, nextPath) {
  return `## IA Navigation\n\nParent: [${parentLabel}](${parentPath}).\nNext: [${nextLabel}](${nextPath}).`;
}

function renderStateMatrix(profile, states) {
  const rows = [...states.scenarios].sort((a, b) => compare(a.id, b.id)).map((scenario) => [
    codeCell(scenario.id),
    escapeMarkdown(scenario.semantic_mode),
    [...scenario.states].sort(compare).map(codeCell).join(", "),
    Object.entries(scenario.aria).sort(([left], [right]) => compare(left, right)).map(([name, value]) => codeCell(`aria-${name}=${value}`)).join("<br>") || "none",
    scenario.expected.visual.map(codeCell).join(", "),
    escapeMarkdown(scenario.expected.activation),
  ]);
  return `${frontmatter(`${profile} button state matrix`, "Compound state sets and channel expectations derived from canonical JSON.")}\n# ${escapeMarkdown(profile)} button state matrix\n\n${markdownTable(["Scenario", "Mode", "State set", "ARIA", "Visual", "Activation"], rows)}\n\n${navigation("Governed Local Profiles", "../../index.md", "Keyboard Matrix", "keyboard-matrix.md")}\n`;
}

function renderKeyboardMatrix(profile, component, fixture) {
  const fixtureByMode = new Map(fixture.scenarios.map((scenario) => [scenario.semantic_mode, scenario.id]));
  const rows = [...component.semantic_modes].sort((a, b) => compare(a.id, b.id)).map((mode) => [
    codeCell(mode.id), escapeMarkdown(mode.element), escapeMarkdown(mode.role), [...mode.keys].sort(compare).map(codeCell).join(", "), codeCell(mode.activation), fixtureByMode.has(mode.id) ? codeCell(fixtureByMode.get(mode.id)) : "not exercised",
  ]);
  return `${frontmatter(`${profile} button keyboard matrix`, "Keyboard behavior and live fixture coverage derived from canonical JSON.")}\n# ${escapeMarkdown(profile)} button keyboard matrix\n\n${markdownTable(["Mode", "Element", "Role", "Keys", "Behavior", "Runtime scenario"], rows)}\n\n${navigation("State Matrix", "state-matrix.md", "Evidence Coverage", "evidence-coverage.md")}\n`;
}

function renderEvidenceCoverage(profile, fixture, evidence) {
  const rows = [...fixture.scenarios].sort((a, b) => compare(a.id, b.id)).map((scenario) => {
    const passes = evidence.passes.filter((pass) => pass.scenario_id === scenario.id).sort((a, b) => compare(a.channel, b.channel));
    return [
      codeCell(scenario.id),
      scenario.required_channels.map(codeCell).join(", "),
      passes.map((pass) => codeCell(pass.channel)).join(", "),
      String(passes.length),
      passes.map((pass) => codeCell(pass.artifact.path)).join("<br>"),
    ];
  });
  return `${frontmatter(`${profile} button evidence coverage`, "Claim-scoped evidence channels and artifacts derived from canonical JSON.")}\n# ${escapeMarkdown(profile)} button evidence coverage\n\nClaim boundary: ${escapeMarkdown(evidence.claim_boundary)}\n\n${markdownTable(["Scenario", "Required channels", "Recorded channels", "Pass records", "Artifacts"], rows)}\n\n${navigation("Keyboard Matrix", "keyboard-matrix.md", "Reference Profiles", "../../../index.md")}\n`;
}

function generatedRowIds(content) {
  return content.split("\n").map((line) => /^\| <code>([^<]+)<\/code> \|/.exec(line)?.[1]).filter(Boolean);
}

function classifyDrift(file, expectedIds, expected, actual) {
  const ids = generatedRowIds(actual);
  for (const id of duplicateValues(ids)) failures.push({ code: "generated_duplicate_row", message: `${id} is duplicated`, path: file });
  if (!isSorted(ids)) failures.push({ code: "generated_unsorted", message: "generated rows must be sorted", path: file });
  const missing = expectedIds.filter((id) => !ids.includes(id));
  for (const id of missing) failures.push({ code: "generated_missing_row", message: `${id} is missing`, path: file });
  if (ids.length !== expectedIds.length) failures.push({ code: "generated_source_count_mismatch", message: `expected ${expectedIds.length} rows, found ${ids.length}`, path: file });
  if (actual !== expected) failures.push({ code: "generated_stale", message: "generated table differs from canonical JSON", path: file });
}

function writeOrCheck(file, expectedIds, content) {
  if (options.check) {
    if (!fs.existsSync(file)) failures.push({ code: "generated_missing", message: "generated table is missing", path: file });
    else classifyDrift(file, expectedIds, content, fs.readFileSync(file, "utf8"));
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

const profiles = fs.existsSync(options.root)
  ? fs.readdirSync(options.root, { withFileTypes: true }).filter((entry) => entry.isDirectory() && fs.existsSync(path.join(options.root, entry.name, "profile.json"))).map((entry) => entry.name).sort(compare)
  : [];
let generated = 0;
for (const profile of profiles) {
  const profileRoot = path.join(options.root, profile);
  const resolved = resolveProfileRecords(profileRoot, failures);
  if (!resolved) continue;
  const component = resolved.records.component[0]?.value;
  const fixture = resolved.records.fixture[0]?.value;
  const states = resolved.records.states[0]?.value;
  const evidence = resolved.records.evidence[0]?.value;
  if (!component || !fixture || !states || !evidence) continue;
  const scenarioIds = states.scenarios.map((scenario) => scenario.id);
  for (const id of duplicateValues(scenarioIds)) failures.push({ code: "scenario_duplicate", message: `${id} is duplicated`, path: profileRoot });
  if (!isSorted(scenarioIds)) failures.push({ code: "source_unsorted", message: "canonical scenario IDs must be sorted", path: profileRoot });
  const fixtureIds = fixture.scenarios.map((scenario) => scenario.id);
  for (const id of fixtureIds.filter((id) => !scenarioIds.includes(id))) failures.push({ code: "fixture_scenario_missing", message: `${id} has no canonical scenario`, path: profileRoot });
  const outputs = new Map([
    ["state-matrix.md", [[...scenarioIds].sort(compare), renderStateMatrix(profile, states)]],
    ["keyboard-matrix.md", [component.semantic_modes.map((mode) => mode.id).sort(compare), renderKeyboardMatrix(profile, component, fixture)]],
    ["evidence-coverage.md", [[...fixtureIds].sort(compare), renderEvidenceCoverage(profile, fixture, evidence)]],
  ]);
  for (const record of resolved.records.generated) {
    const output = outputs.get(path.basename(record.path));
    if (!output) { failures.push({ code: "generated_reference_unknown", message: `${record.reference} has no renderer`, path: resolved.profileFile }); continue; }
    writeOrCheck(record.path, output[0], output[1]);
    generated += 1;
  }
}
const uniqueFailures = [...new Map(failures.map((failure) => [`${failure.code}:${failure.path}:${failure.message}`, failure])).values()];
const result = { checkedProfiles: profiles.length, failures: uniqueFailures, generated, mode: options.check ? "check" : "write", ok: uniqueFailures.length === 0, warnings: [] };
if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else if (result.ok) process.stdout.write(`${options.check ? "checked" : "generated"} ${generated} consumer reference evidence tables\n`);
else process.stderr.write(`${result.failures.map((failure) => `${failure.code}: ${failure.path}: ${failure.message}`).join("\n")}\n`);
if (!result.ok) process.exitCode = 1;
