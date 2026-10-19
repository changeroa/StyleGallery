import Ajv from "ajv";
import { initAudit, checkAudit } from "./audit-kit.mjs";
import { runAuditStatus } from "./stylegallery-audit.mjs";

const localRead = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
export const auditToolDefinitions = [
  {
    name: "audit_init",
    description: "Write consumer-owned audit.md and ledger.json, pre-listing universal/adapt HIG and slop ids. Never overwrites existing files.",
    inputSchema: { type: "object", additionalProperties: false, required: ["url"], properties: {
      url: { type: "string", minLength: 1 }, out: { type: "string", minLength: 1 },
    } },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "audit_check",
    description: "Run shared showcase checks and every machine slop rule on a URL or HTML file in Chromium. Activates controls; use a test instance. Returns measurements, not a usability certification.",
    inputSchema: { type: "object", additionalProperties: false, required: ["target"], properties: {
      target: { type: "string", minLength: 1 },
      viewports: { type: "array", minItems: 1, maxItems: 10, uniqueItems: true, items: { type: "integer", minimum: 320, maximum: 7680 } },
    } },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  {
    name: "audit_status",
    description: "Validate a consumer-owned audit ledger and report severity/status counts, verification progress, and optional principle coverage.",
    inputSchema: { type: "object", additionalProperties: false, required: ["ledger"], properties: {
      ledger: { type: "string", minLength: 1 }, principles: { type: "string", minLength: 1 },
    } },
    annotations: localRead,
  },
];
const ajv = new Ajv({ allErrors: true, strict: true });
const validators = new Map(auditToolDefinitions.map((tool) => [tool.name, ajv.compile(tool.inputSchema)]));

export async function invokeAuditTool(name, input, { signal } = {}) {
  const validate = validators.get(name);
  if (!validate || !validate(input)) return { ok: false, operation: name, failures: [{ code: "audit_input_invalid", message: validate ? ajv.errorsText(validate.errors) : "unknown audit tool" }] };
  try {
    if (name === "audit_init") return initAudit(input.url, { out: input.out });
    if (name === "audit_check") return await checkAudit(input.target, { viewports: input.viewports, signal });
    return runAuditStatus([input.ledger, "--json", ...(input.principles ? ["--principles", input.principles] : [])]).report;
  } catch (error) { return { ok: false, operation: name, failures: [{ code: `${name}_failed`, message: error.message }] }; }
}
