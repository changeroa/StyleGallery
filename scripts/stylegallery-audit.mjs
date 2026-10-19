// `stylegallery audit <subcommand>`: audit ledger tooling. Subcommands are registered in
// AUDIT_SUBCOMMANDS so later work (audit init, audit check) adds one entry without touching
// the top-level CLI dispatch.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

import { parseOptions, failure, report } from "./stylegallery-cli.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const LEDGER_SCHEMA_PATH = path.join(packageRoot, "quality", "audit", "ledger.schema.json");
export const LEDGER_STATUSES = ["open", "fixing", "fixed", "verified", "wont_fix"];

let ledgerValidator;
function validatorForLedger() {
  if (!ledgerValidator) {
    // strictRequired is off because the status rules use if/then `required` on sibling properties.
    const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
    ledgerValidator = ajv.compile(JSON.parse(fs.readFileSync(LEDGER_SCHEMA_PATH, "utf8")));
  }
  return ledgerValidator;
}

function readJson(file, code) {
  let text;
  try { text = fs.readFileSync(path.resolve(file), "utf8"); } catch (error) { return { error: { code: `${code}_unreadable`, message: `cannot read ${file}: ${error.code ?? error.message}` } }; }
  try { return { value: JSON.parse(text) }; } catch (error) { return { error: { code: `${code}_json_invalid`, message: `${file} is not valid JSON: ${error.message}` } }; }
}

// Schema validation plus the cross-record rules JSON Schema cannot express.
export function validateLedger(ledger) {
  const validate = validatorForLedger();
  if (!validate(ledger)) {
    return validate.errors.map((error) => ({ code: "ledger_schema_invalid", message: `${error.instancePath || "/"} ${error.message}`, path: error.instancePath || "/" }));
  }
  const failures = [];
  const principleIds = new Set();
  const violationIds = new Set();
  ledger.principles.forEach((principle, index) => {
    if (principleIds.has(principle.principle_id)) failures.push({ code: "ledger_principle_duplicate", message: `principle ${principle.principle_id} is listed more than once`, path: `/principles/${index}/principle_id` });
    principleIds.add(principle.principle_id);
    principle.violations.forEach((violation, violationIndex) => {
      if (violationIds.has(violation.violation_id)) failures.push({ code: "ledger_violation_duplicate", message: `violation ${violation.violation_id} is listed more than once`, path: `/principles/${index}/violations/${violationIndex}/violation_id` });
      violationIds.add(violation.violation_id);
    });
  });
  return failures;
}

// Accepts ["hig.a.b", ...], [{ id | principle_id }, ...], or { principles: <either form> }.
export function principleIdsFrom(value) {
  const list = Array.isArray(value) ? value : value?.principles;
  if (!Array.isArray(list)) return null;
  const ids = list.map((entry) => (typeof entry === "string" ? entry : entry?.principle_id ?? entry?.id));
  return ids.every((id) => typeof id === "string" && id.length > 0) ? [...new Set(ids)] : null;
}

export function summarizeLedger(ledger, expectedPrincipleIds) {
  const byStatus = Object.fromEntries(LEDGER_STATUSES.map((status) => [status, 0]));
  const bySeverity = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  let total = 0;
  for (const principle of ledger.principles) {
    for (const violation of principle.violations) {
      total += 1;
      byStatus[violation.status] += 1;
      bySeverity[violation.severity] += 1;
    }
  }
  const actionable = total - byStatus.wont_fix;
  const listed = ledger.principles.map(({ principle_id }) => principle_id);
  const coverage = expectedPrincipleIds === undefined ? null : {
    expected: expectedPrincipleIds.length,
    missing: expectedPrincipleIds.filter((id) => !listed.includes(id)),
    unlisted: listed.filter((id) => !expectedPrincipleIds.includes(id)),
  };
  return {
    subject: ledger.subject,
    updated_on: ledger.updated_on,
    principles: {
      total: listed.length,
      without_violations: ledger.principles.filter(({ violations }) => violations.length === 0).map(({ principle_id }) => principle_id),
    },
    violations: { total, by_status: byStatus, by_severity: bySeverity, actionable },
    percent_verified: actionable === 0 ? null : Math.round((byStatus.verified / actionable) * 1000) / 10,
    principle_coverage: coverage,
  };
}

function formatText(ledgerPath, value) {
  if (!value.summary) return `stylegallery audit status: ${ledgerPath} is invalid\n${value.failures.map((entry) => `  ${entry.code}: ${entry.message}`).join("\n")}\n`;
  const { summary } = value;
  const lines = [`Audit ledger ${ledgerPath}: ${summary.subject} (updated ${summary.updated_on})`];
  const empty = summary.principles.without_violations;
  lines.push(`Principles: ${summary.principles.total}; ${empty.length} with no violations triaged${empty.length ? `: ${empty.join(", ")}` : ""}`);
  lines.push(`Violations: ${summary.violations.total} (${LEDGER_STATUSES.map((status) => `${status} ${summary.violations.by_status[status]}`).join(", ")})`);
  lines.push(`Verified: ${summary.percent_verified === null ? "n/a" : `${summary.percent_verified}%`} of ${summary.violations.actionable} actionable (wont_fix excluded)`);
  if (summary.principle_coverage) {
    const { expected, missing, unlisted } = summary.principle_coverage;
    lines.push(`Principle coverage: ${expected - missing.length}/${expected} listed; missing ${missing.length}${missing.length ? `: ${missing.join(", ")}` : ""}`);
    if (unlisted.length) lines.push(`Not in the principle list: ${unlisted.join(", ")}`);
  }
  for (const entry of value.failures) lines.push(`FAIL ${entry.code}: ${entry.message}`);
  return `${lines.join("\n")}\n`;
}

export function runAuditStatus(args) {
  const parsed = parseOptions("audit status", args, { "--principles": { field: "principles" }, "--json": { field: "json", flag: true } });
  if (parsed.error) return parsed.error;
  if (parsed.positional.length !== 1) return failure("audit status", "argument_value_required", "give exactly one ledger file: stylegallery audit status <ledger.json>");
  const [ledgerPath] = parsed.positional;
  const { json, principles: principlesPath } = parsed.values;
  const finish = (value) => {
    const result = { ok: value.failures.length === 0, operation: "audit status", ledger: ledgerPath, ...value };
    const exitCode = result.ok ? 0 : 1;
    return { report: result, exitCode, output: json ? `${JSON.stringify(result, null, 2)}\n` : formatText(ledgerPath, result) };
  };

  const ledger = readJson(ledgerPath, "ledger");
  if (ledger.error) return finish({ failures: [ledger.error] });
  let expected;
  if (principlesPath !== undefined) {
    const principles = readJson(principlesPath, "principles");
    if (principles.error) return finish({ failures: [principles.error] });
    expected = principleIdsFrom(principles.value);
    if (!expected) return finish({ failures: [{ code: "principles_shape_invalid", message: `${principlesPath} must be an array of principle ids, an array of objects with id or principle_id, or an object with such a principles array` }] });
  }
  const failures = validateLedger(ledger.value);
  if (failures.length) return finish({ failures });
  const summary = summarizeLedger(ledger.value, expected);
  if (summary.principle_coverage?.missing.length) failures.push({ code: "audit_principles_missing", message: `${summary.principle_coverage.missing.length} principle(s) from ${principlesPath} are not in the ledger` });
  return finish({ summary, failures });
}

export const AUDIT_SUBCOMMANDS = {
  status: runAuditStatus,
};

export async function runAuditCli(args) {
  const [subcommand, ...rest] = args;
  const handler = AUDIT_SUBCOMMANDS[subcommand];
  if (!handler) return failure("audit", "argument_unknown", `unknown audit subcommand ${subcommand ?? "(none)"}; available: ${Object.keys(AUDIT_SUBCOMMANDS).join(", ")}`);
  return handler(rest);
}
