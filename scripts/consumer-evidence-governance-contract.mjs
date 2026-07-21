import { immutableActionPins } from "./governance-policy-contract.mjs";
import { workflowActionFailures } from "./workflow-action-contract.mjs";

const validatePath = ".github/workflows/validate.yml";
const freshnessPath = ".github/workflows/evidence-freshness.yml";

function workflowJob(workflow, id) {
  const marker = `  ${id}:\n`;
  const start = workflow.indexOf(marker);
  if (start === -1) return "";
  const remainder = workflow.slice(start + marker.length);
  const next = remainder.search(/^  [a-zA-Z0-9_-]+:/m);
  return marker + (next === -1 ? remainder : remainder.slice(0, next));
}

function missing(relative, content, fragments) {
  return fragments.flatMap(([fragment, label = fragment]) => content.includes(fragment) ? [] : [`${relative}: missing ${label}`]);
}

function missingCommands(relative, content, fragments) {
  const commands = content.split("\n").map((line) => line.trim()).filter(Boolean);
  return fragments.flatMap(([fragment, label = fragment]) => commands.some((command) => {
    let candidate = command;
    const assignment = /^[A-Za-z_][A-Za-z0-9_]*=(?:"(?:[^"\\]|\\.)*"|'[^']*'|[^\s]+)?\s+/;
    if (candidate.startsWith("env ")) candidate = candidate.slice(4);
    while (true) {
      const withoutUnset = candidate.replace(/^-u\s+[A-Za-z_][A-Za-z0-9_]*\s+/, "");
      if (withoutUnset !== candidate) {
        candidate = withoutUnset;
        continue;
      }
      const withoutAssignment = candidate.replace(assignment, "");
      if (withoutAssignment === candidate) break;
      candidate = withoutAssignment;
    }
    if (candidate !== fragment && !candidate.startsWith(`${fragment} `)) return false;
    const suffix = candidate.slice(fragment.length);
    return !/(?:&&|\|\||[;&|])/.test(suffix);
  }) ? [] : [`${relative}: missing ${label}`]);
}

function hasIf(lines, indentation) {
  const pattern = new RegExp(`^ {${indentation}}(?:-\\s+)?["']?if["']?:\\s*`);
  return lines.some((line) => pattern.test(line));
}

function hasLiteralDisabledIf(lines, indentation) {
  const pattern = new RegExp(`^ {${indentation}}(?:-\\s+)?["']?if["']?:\\s*(?:false|['"]false['"]|\\$\\{\\{\\s*false\\s*\\}\\})(?:\\s+#.*)?$`, "i");
  return lines.some((line) => pattern.test(line));
}

function executableRunText(workflow) {
  const lines = workflow.split("\n");
  const commands = [];
  const stepsLine = lines.findIndex((line) => /^\s*steps:\s*$/.test(line));
  if (stepsLine === -1) return "";
  const stepsIndent = lines[stepsLine].match(/^\s*/)[0].length;
  for (let index = stepsLine + 1; index < lines.length;) {
    const start = lines[index].match(new RegExp(`^ {${stepsIndent + 2}}-\\s+`));
    if (!start) {
      if (lines[index].trim() && lines[index].match(/^\s*/)[0].length <= stepsIndent) break;
      index += 1;
      continue;
    }
    let end = index + 1;
    while (end < lines.length && !new RegExp(`^ {${stepsIndent + 2}}-\\s+`).test(lines[end]) && (!lines[end].trim() || lines[end].match(/^\s*/)[0].length > stepsIndent)) end += 1;
    const step = lines.slice(index, end);
    if (!hasIf(step, stepsIndent + 2) && !hasIf(step, stepsIndent + 4)) {
      const runIndex = step.findIndex((line) => new RegExp(`^(?: {${stepsIndent + 2}}-\\s+| {${stepsIndent + 4}})run:`).test(line));
      if (runIndex !== -1) {
        const match = step[runIndex].match(/^\s*(?:-\s+)?run:\s*(.*)$/);
        const scalar = match[1].replace(/\s+#.*$/, "").trim();
        if (scalar && !["|", ">", "|-", ">-"].includes(scalar)) commands.push(scalar);
        if (["|", ">", "|-", ">-"].includes(scalar)) {
          const blockCommands = [];
          let heredoc;
          for (const raw of step.slice(runIndex + 1)) {
            const command = raw.trim();
            if (!command || command.startsWith("#")) continue;
            if (heredoc) {
              if (command === heredoc) heredoc = undefined;
              continue;
            }
            const opener = command.match(/<<-?\s*['"]?([A-Za-z0-9_]+)['"]?/);
            blockCommands.push(command.replace(/\s+#.*$/, "").trim());
            if (opener) heredoc = opener[1];
          }
          if (scalar.startsWith(">")) commands.push(blockCommands.join(" "));
          else commands.push(...blockCommands);
        }
      }
    }
    index = end;
  }
  const logicalCommands = [];
  let logical = "";
  for (const command of commands) {
    logical = logical ? `${logical} ${command}` : command;
    if (logical.endsWith("\\")) {
      logical = logical.slice(0, -1).trimEnd();
      continue;
    }
    logicalCommands.push(logical);
    logical = "";
  }
  if (logical) logicalCommands.push(logical);
  return logicalCommands.join("\n");
}

export function consumerEvidenceGovernanceFailures({ evidence, freshnessWorkflow, governance, validationWorkflow }) {
  const failures = [];
  failures.push(...missing("GOVERNANCE.md", governance, [
    ["scheduled_stale_audit: deferred"],
    ["scheduled_evidence_audit: active_advisory"],
    ["Decision: run a weekly advisory audit only for evidence records that already declare `expires_at` or `review_by`."],
    ["No repository-wide maximum age or inferred time-to-live applies."],
    ["Malformed records and auditor failures remain blocking even though due-date findings are advisory."],
    [freshnessPath],
    ["Monday at 05:00 UTC"],
  ]));
  failures.push(...missing("quality/evidence/executable-evidence.md", evidence, [
    ["Explicit evidence deadlines are audited weekly without inventing a repository-wide maximum age."],
    ["Malformed records and auditor failures remain blocking even though due-date findings are advisory."],
  ]));
  const validationCommands = executableRunText(workflowJob(validationWorkflow, "validate"));
  failures.push(...missingCommands(`${validatePath}: validate`, validationCommands, [
    ["node -c scripts/consumer-evidence-governance-contract.mjs"],
    ["node -c scripts/json-schema-formats.mjs"],
    ["node -c scripts/consumer-conformance-contract.mjs"],
    ["node -c scripts/validate-consumer-conformance.mjs"],
    ["node -c scripts/test-validate-consumer-conformance.mjs"],
    ["node -c consumer-reference/fixtures/consumer-conformance/e2e-fixture.mjs"],
    ["node -c scripts/page-evidence-contract.mjs"],
    ["node -c scripts/page-evidence-fixture.mjs"],
    ["node -c scripts/create-page-evidence-session.mjs"],
    ["node -c scripts/finalize-page-evidence.mjs"],
    ["node -c scripts/validate-page-evidence.mjs"],
    ["node -c scripts/test-validate-page-evidence.mjs"],
    ["node -c scripts/audit-evidence-freshness.mjs"],
    ["node -c scripts/test-audit-evidence-freshness.mjs"],
    ["node -c tests/fixtures/consumer-conformance-scenarios.mjs"],
    ["node -c tests/helpers/render-consumer-conformance.mjs"],
    ["node -c tests/consumer-conformance.spec.mjs"],
    ["node -c scripts/test-consumer-conformance-sentinel.mjs"],
    ["node scripts/test-validate-consumer-conformance.mjs --case valid-runtime-proof --json"],
    ["node scripts/test-validate-consumer-conformance.mjs --json"],
    ["node scripts/test-validate-page-evidence.mjs --json"],
    ["node scripts/test-audit-evidence-freshness.mjs --json"],
    [`node -e 'JSON.parse(require("fs").readFileSync("consumer-reference/schema/consumer-conformance-record.schema.json"))'`],
    [`node -e 'JSON.parse(require("fs").readFileSync("consumer-reference/schema/page-evidence-session.schema.json"))'`],
    [`node -e 'JSON.parse(require("fs").readFileSync("consumer-reference/schema/page-evidence-manifest.schema.json"))'`],
  ]));

  const blocking = workflowJob(validationWorkflow, "consumer-conformance");
  if (!blocking) failures.push(`${validatePath}: missing consumer-conformance job`);
  else {
    if (hasLiteralDisabledIf(blocking.split("\n"), 4)) failures.push(`${validatePath}: consumer-conformance job must be enabled`);
    if (hasIf(blocking.split("\n"), 4)) failures.push(`${validatePath}: consumer-conformance job must be unconditional`);
    if (hasIf(blocking.split("\n"), 6) || hasIf(blocking.split("\n"), 8)) failures.push(`${validatePath}: consumer-conformance: required command steps must be unconditional`);
    if (/^\s+continue-on-error:/m.test(blocking)) failures.push(`${validatePath}: consumer-conformance must be blocking`);
    failures.push(...missing(`${validatePath}: consumer-conformance`, blocking, [
      ["mcr.microsoft.com/playwright:v1.61.0-noble@sha256:57b65fdc9ceabe0ef613124c7bbe2babcf9362c4d85e382fe3b03604e84b428a"],
    ]));
    failures.push(...missingCommands(`${validatePath}: consumer-conformance`, executableRunText(blocking), [
      ["npx playwright test tests/consumer-conformance.spec.mjs --project=chromium --reporter=line"],
      ["node scripts/test-consumer-conformance-sentinel.mjs --json"],
    ]));
  }
  const capture = workflowJob(validationWorkflow, "consumer-page-evidence");
  if (!capture) failures.push(`${validatePath}: missing consumer-page-evidence job`);
  else {
    if (!/^\s+continue-on-error:\s*true\s*$/m.test(capture)) failures.push(`${validatePath}: consumer-page-evidence must be nonblocking`);
    failures.push(...missing(`${validatePath}: consumer-page-evidence`, capture, [
      ["CONSUMER_CONFORMANCE_CAPTURE_DIR: .tmp/consumer-page-evidence"],
      ["actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02"],
      ["retention-days: 14"],
    ]));
    failures.push(...missingCommands(`${validatePath}: consumer-page-evidence`, executableRunText(capture), [
      ["node scripts/create-page-evidence-session.mjs"],
      ["npx playwright test tests/consumer-conformance.spec.mjs --project=chromium --reporter=line"],
      ["node scripts/finalize-page-evidence.mjs"],
      ["node scripts/validate-page-evidence.mjs"],
    ]));
  }

  failures.push(...missing(freshnessPath, freshnessWorkflow, [
    ["workflow_dispatch:"],
    ["cron: '0 5 * * 1'", "Monday 05:00 UTC schedule"],
    ["contents: read"],
    ["persist-credentials: false"],
    ["evidence-freshness-report.json", "JSON report"],
    ["::warning file=", "GitHub warning emission"],
    ["if: always()", "always-upload evidence"],
    ["actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02", "immutable upload action"],
    ["retention-days: 14", "14-day retention"],
  ]));
  failures.push(...missing(freshnessPath, executableRunText(freshnessWorkflow), [
    ["scripts/audit-evidence-freshness.mjs", "freshness auditor"],
    ["--record consumer-reference/baselines/calibration.json", "explicit calibration record inventory"],
    ["--mode advisory"],
  ]));
  if (/continue-on-error\s*:/i.test(freshnessWorkflow)) failures.push(`${freshnessPath}: continue-on-error is forbidden because malformed records and tool failures must block`);
  for (const pin of immutableActionPins) {
    if ((pin.includes("actions/checkout") || pin.includes("actions/setup-node") || pin.includes("actions/upload-artifact")) && !freshnessWorkflow.includes(pin)) {
      failures.push(`${freshnessPath}: missing immutable action pin ${pin}`);
    }
  }
  failures.push(...workflowActionFailures(freshnessWorkflow, freshnessPath));
  return failures;
}
