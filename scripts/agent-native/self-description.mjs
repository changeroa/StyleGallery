import crypto from "node:crypto";
import { deepFreeze, hashCanonical } from "./canonical-json.mjs";
import { createVersionId } from "./identity.mjs";

export const AGENT_REF = "sg:agent/stylegallery";
export const CONFORMANCE_PROFILE_REF = "sg:profile/agent-native-read-conformance";

export class SelfDescriptionError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = "SelfDescriptionError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new SelfDescriptionError(code, message);
}

function byRef(fixture, stableRef) {
  const record = fixture.records.find((item) => item.stable_ref === stableRef);
  if (!record) fail("self_description_record_missing", `required fixture record ${stableRef} is missing`);
  return record;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function receiptVersion(receipt) {
  const payload = { ...receipt };
  delete payload.version_id;
  delete payload.versionId;
  return createVersionId({ stableRef: receipt.stable_ref, payload });
}

/**
 * Verify an execution receipt without executing its command again.  The
 * receipt is an immutable, content-addressed observation: its fixture source
 * VersionID, command, normalized result digest, and independent verifier are
 * all checked before a conformance claim can be projected as verified.
 */
export function verifyConformanceReceipt({ fixture, receipt, source }) {
  if (!receipt || receipt.record_kind !== "execution_receipt") {
    fail("self_description_receipt_kind_invalid", "conformance evidence must be an execution receipt");
  }
  if (!source || source.record_kind !== "executable_fixture") {
    fail("self_description_receipt_source_invalid", "execution receipt must reference an executable fixture");
  }
  if (receipt.fixture_ref !== fixture.fixture_ref) {
    fail("self_description_receipt_fixture_mismatch", "execution receipt fixture_ref does not match the loaded fixture");
  }
  if (receipt.fixture_record_ref !== source.stable_ref || receipt.fixture_version_id !== source.version_id) {
    fail("self_description_receipt_version_mismatch", "execution receipt is not bound to the executable fixture VersionID");
  }
  if (receipt.command !== source.command) {
    fail("self_description_receipt_command_mismatch", "execution receipt command does not match the executable fixture");
  }
  const result = receipt.result;
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    fail("self_description_receipt_result_invalid", "execution receipt must contain a normalized result object");
  }
  if (result.exit_code !== source.expected?.exit_code || result.report_ok !== source.expected?.report_ok) {
    fail("self_description_receipt_result_mismatch", "execution receipt result does not match fixture expectations");
  }
  const expectedStderrHash = sha256(String(source.expected?.stderr ?? ""));
  if (result.stderr_sha256 !== expectedStderrHash) {
    fail("self_description_receipt_stderr_mismatch", "execution receipt stderr digest does not match fixture expectations");
  }
  if (typeof result.stderr_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(result.stderr_sha256)) {
    fail("self_description_receipt_digest_invalid", "execution receipt stderr digest must be lowercase sha256 hex");
  }
  if (receipt.result_sha256 !== hashCanonical(result)) {
    fail("self_description_receipt_result_digest_mismatch", "execution receipt result_sha256 does not match canonical result bytes");
  }
  if (receipt.version_id !== receiptVersion(receipt)) {
    fail("self_description_receipt_version_digest_mismatch", "execution receipt VersionID does not match immutable receipt bytes");
  }
  const verification = receipt.verification;
  if (!verification || verification.status !== "PASS" || verification.method !== "captured-command-result") {
    fail("self_description_receipt_unverified", "execution receipt must carry a PASS captured-command verification");
  }
  const verifier = fixture.records.find((record) => record.stable_ref === verification.verifier_ref);
  if (!verifier || verifier.record_kind !== "validator" || verifier.validator_version !== verification.verifier_version) {
    fail("self_description_receipt_verifier_invalid", "execution receipt verifier is not a fixture validator version");
  }
  return deepFreeze({ receipt, source, verifier });
}

function conformanceClaims(fixture, profile) {
  const refs = Array.isArray(profile.claim_refs) ? profile.claim_refs : [];
  return refs.map((claimRef) => {
    const claim = byRef(fixture, claimRef);
    const evidence = fixture.records.filter((record) => record.record_kind === "evidence_link" && record.claim_ref === claimRef);
    const sources = evidence.map((link) => byRef(fixture, link.source_ref));
    if (sources.length === 0 || sources.some((source) => source.record_kind !== "executable_fixture")) {
      fail("self_description_evidence_not_executable", `conformance claim ${claimRef} must point only at executable fixture evidence`);
    }
    const validations = fixture.records.filter((record) => record.record_kind === "validation_report" && record.claim_ref === claimRef);
    const execution_receipts = sources.map((source) => {
      const receipts = fixture.records.filter((record) => record.record_kind === "execution_receipt" && record.fixture_record_ref === source.stable_ref);
      if (receipts.length !== 1) {
        fail("self_description_execution_receipt_missing", `conformance source ${source.stable_ref} must have exactly one immutable execution receipt`);
      }
      return verifyConformanceReceipt({ fixture, receipt: receipts[0], source });
    });
    return { claim, evidence, executable_sources: sources, execution_receipts, validations };
  });
}

function operationSummary(operation) {
  return {
    adapters: operation.adapters,
    effect_class: operation.effect_class,
    idempotent: operation.idempotent,
    name: operation.name,
    read_only: operation.read_only,
    stable_ref: operation.stable_ref,
    version_id: operation.version_id,
  };
}

export function createSelfDescription({ fixture, operations }) {
  if (!fixture || !Array.isArray(fixture.records) || !fixture.manifest) {
    fail("self_description_fixture_invalid", "self-description requires an immutable fixture");
  }
  if (!Array.isArray(operations)) fail("self_description_operations_invalid", "operations must be an array");
  const agent = byRef(fixture, AGENT_REF);
  const conformanceProfile = byRef(fixture, CONFORMANCE_PROFILE_REF);
  if (conformanceProfile.conformance_level !== "fixture_verified") {
    fail("self_description_profile_unverified", "conformance profile must declare fixture_verified only after receipt verification");
  }
  const summaries = operations.map(operationSummary).sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  return deepFreeze({
    agent,
    conformance: {
      claims: conformanceClaims(fixture, conformanceProfile),
      profile: conformanceProfile,
      status: "fixture_verified",
    },
    manifest: {
      entry_count: fixture.manifest.entries.length,
      manifest_ref: fixture.manifest.manifest_ref,
      sha256: fixture.manifest.sha256,
      version_id: fixture.manifest.version_id,
    },
    operation_digest: hashCanonical(summaries),
    operations: summaries,
    protocol_surfaces: {
      a2a: { mode: "task_projection", protocol: "A2A v1" },
      ag_ui: { mode: "event_projection", protocol: "AG-UI 0.0.57" },
      cli: { commands: summaries.filter((item) => item.adapters.includes("cli")).map((item) => item.name), format: "json" },
      mcp: { mode: "read_only", operations: summaries.filter((item) => item.read_only).map((item) => item.name), protocol: "MCP v1" },
    },
    schema_version: "1.0",
  });
}

export const describeAgentNative = createSelfDescription;
export const createConformanceProfile = createSelfDescription;
