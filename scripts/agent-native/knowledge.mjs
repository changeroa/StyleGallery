import { createVersionId } from "./identity.mjs";
import { deepFreeze } from "./canonical-json.mjs";

const CONTROL_KEYS = new Set(["schema_version", "record_kind", "kind", "type", "version_id", "versionId"]);

function clone(value) {
  return value === undefined ? value : structuredClone(value);
}

function own(input, ...keys) {
  for (const key of keys) if (Object.hasOwn(input, key)) return input[key];
  return undefined;
}

function requiredObject(input, name) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError(`${name} expects an object parameter`);
  return input;
}

function stableRefOf(input, name) {
  const stableRef = own(input, "stable_ref", "stableRef");
  if (typeof stableRef !== "string" || stableRef.length === 0) throw new TypeError(`${name}.stable_ref is required`);
  return stableRef;
}

function canonicalFields(input, stableRef, recordKind) {
  const fields = {};
  for (const [key, value] of Object.entries(input)) {
    if (!CONTROL_KEYS.has(key) && key !== "stable_ref" && key !== "stableRef") fields[key] = clone(value);
  }
  return { schema_version: "1.0", record_kind: recordKind, stable_ref: stableRef, ...fields };
}

function createRecord(input, recordKind, name) {
  const source = requiredObject(input, name);
  const stableRef = stableRefOf(source, name);
  const record = canonicalFields(source, stableRef, recordKind);
  const versionId = createVersionId({ stableRef, payload: record });
  if (typeof versionId !== "string" || !/^sg:[^@]+@sha256:[a-f0-9]{64}$/.test(versionId)) {
    throw new TypeError(`${name} received an invalid VersionID from the identity kernel`);
  }
  const supplied = own(source, "version_id", "versionId");
  if (supplied !== undefined && supplied !== versionId) throw new TypeError(`${name}.version_id does not match its content`);
  return deepFreeze({ ...record, version_id: versionId });
}

export function createClaim(input) {
  return createRecord(input, "claim", "createClaim");
}

export const makeClaim = createClaim;

export function createEvidenceLink(input) {
  const source = requiredObject(input, "createEvidenceLink");
  const normalized = { ...source };
  const aliases = [
    ["claim_ref", "claimRef"],
    ["claim_version", "claimVersion"],
    ["source_ref", "sourceRef"],
    ["source_version", "sourceVersion"],
    ["independence_group", "independenceGroup"],
  ];
  for (const [canonical, alias] of aliases) {
    if (!Object.hasOwn(normalized, canonical) && Object.hasOwn(normalized, alias)) normalized[canonical] = normalized[alias];
    delete normalized[alias];
  }
  const polarity = own(normalized, "polarity", "stance");
  if (typeof polarity === "string") normalized.polarity = polarity.toUpperCase();
  return createRecord(normalized, "evidence_link", "createEvidenceLink");
}

export const makeEvidenceLink = createEvidenceLink;
export const createEvidence = createEvidenceLink;
export const makeEvidence = createEvidenceLink;

export function createAttestation(input) {
  const source = requiredObject(input, "createAttestation");
  const normalized = { ...source };
  if (!Object.hasOwn(normalized, "claim_ref") && Object.hasOwn(normalized, "claimRef")) normalized.claim_ref = normalized.claimRef;
  if (!Object.hasOwn(normalized, "claim_version") && Object.hasOwn(normalized, "claimVersion")) normalized.claim_version = normalized.claimVersion;
  if (typeof normalized.polarity === "string") normalized.polarity = normalized.polarity.toUpperCase();
  delete normalized.claimRef;
  delete normalized.claimVersion;
  return createRecord(normalized, "attestation", "createAttestation");
}

export const makeAttestation = createAttestation;

export function createValidationReport(input) {
  const source = requiredObject(input, "createValidationReport");
  const normalized = { ...source };
  if (!Object.hasOwn(normalized, "claim_ref") && Object.hasOwn(normalized, "claimRef")) normalized.claim_ref = normalized.claimRef;
  if (!Object.hasOwn(normalized, "claim_version") && Object.hasOwn(normalized, "claimVersion")) normalized.claim_version = normalized.claimVersion;
  if (!Object.hasOwn(normalized, "validator_version") && Object.hasOwn(normalized, "validatorVersion")) normalized.validator_version = normalized.validatorVersion;
  if (typeof normalized.status === "string") normalized.status = normalized.status.toUpperCase();
  delete normalized.claimRef;
  delete normalized.claimVersion;
  delete normalized.validatorVersion;
  return createRecord(normalized, "validation_report", "createValidationReport");
}

export const makeValidationReport = createValidationReport;

export function createGovernanceDecision(input) {
  const source = requiredObject(input, "createGovernanceDecision");
  const normalized = { ...source };
  if (!Object.hasOwn(normalized, "claim_ref") && Object.hasOwn(normalized, "claimRef")) normalized.claim_ref = normalized.claimRef;
  if (!Object.hasOwn(normalized, "claim_version") && Object.hasOwn(normalized, "claimVersion")) normalized.claim_version = normalized.claimVersion;
  if (!Object.hasOwn(normalized, "policy_version") && Object.hasOwn(normalized, "policyVersion")) normalized.policy_version = normalized.policyVersion;
  if (typeof normalized.decision === "string") normalized.decision = normalized.decision.toUpperCase();
  delete normalized.claimRef;
  delete normalized.claimVersion;
  delete normalized.policyVersion;
  return createRecord(normalized, "governance_decision", "createGovernanceDecision");
}

export const makeGovernanceDecision = createGovernanceDecision;

export function createPolicyDisposition(input) {
  const source = requiredObject(input, "createPolicyDisposition");
  const normalized = { ...source };
  if (!Object.hasOwn(normalized, "claim_ref") && Object.hasOwn(normalized, "claimRef")) normalized.claim_ref = normalized.claimRef;
  if (!Object.hasOwn(normalized, "claim_version") && Object.hasOwn(normalized, "claimVersion")) normalized.claim_version = normalized.claimVersion;
  if (!Object.hasOwn(normalized, "policy_version") && Object.hasOwn(normalized, "policyVersion")) normalized.policy_version = normalized.policyVersion;
  delete normalized.claimRef;
  delete normalized.claimVersion;
  delete normalized.policyVersion;
  return createRecord(normalized, "policy_disposition", "createPolicyDisposition");
}

export const makePolicyDisposition = createPolicyDisposition;

function linksFrom(input) {
  if (Array.isArray(input)) return input;
  const source = requiredObject(input, "aggregateEvidence");
  return own(source, "evidence_links", "evidenceLinks", "evidence") ?? [];
}

function polarityOf(link) {
  const value = own(link, "polarity", "stance", "direction");
  if (typeof value !== "string") return undefined;
  const polarity = value.toUpperCase();
  if (["SUPPORT", "SUPPORTED", "POSITIVE", "FOR"].includes(polarity)) return "SUPPORT";
  if (["REFUTE", "REFUTED", "NEGATIVE", "AGAINST", "CONTRADICT"].includes(polarity)) return "REFUTE";
  return undefined;
}

export function aggregateEvidence(input) {
  const source = Array.isArray(input) ? {} : requiredObject(input, "aggregateEvidence");
  const links = linksFrom(input).filter((link) => link && typeof link === "object");
  const support = links.filter((link) => polarityOf(link) === "SUPPORT");
  const refute = links.filter((link) => polarityOf(link) === "REFUTE");
  const state = support.length && refute.length ? "BOTH" : support.length ? "SUPPORTED" : refute.length ? "REFUTED" : "NEITHER";
  const groups = (items) => [...new Set(items.map((link) => own(link, "independence_group", "independenceGroup")).filter((value) => typeof value === "string"))].sort();
  return deepFreeze({
    claim_ref: own(source.claim, "stable_ref", "stableRef") ?? own(source, "claim_ref", "claimRef"),
    claim_version: own(source.claim, "version_id", "versionId") ?? own(source, "claim_version", "claimVersion"),
    state,
    evidence_state: state,
    support_count: support.length,
    refute_count: refute.length,
    support_groups: groups(support),
    refute_groups: groups(refute),
    evidence_links: links,
  });
}

export const aggregateEvidenceState = aggregateEvidence;
