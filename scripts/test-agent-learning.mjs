#!/usr/bin/env node
import { createVersionId, parseVersionId } from "./agent-native/identity.mjs";
import {
  createProposal,
  decideProposal,
  promoteProposal,
  verifyProposal,
} from "./agent-native/learning.mjs";

function omitVersion(record) {
  const payload = structuredClone(record);
  delete payload.version_id;
  delete payload.versionId;
  return payload;
}

function reversion(record, changes) {
  const payload = { ...omitVersion(record), ...changes };
  return {
    ...payload,
    version_id: createVersionId({ stable_ref: payload.stable_ref, payload }),
  };
}

function isVersioned(record, kind) {
  if (!record || record.record_kind !== kind || typeof record.version_id !== "string") return false;
  try {
    parseVersionId({
      payload: omitVersion(record),
      stable_ref: record.stable_ref,
      version_id: record.version_id,
    });
    return Object.isFrozen(record);
  } catch {
    return false;
  }
}

function rejected(call) {
  try {
    const value = call();
    return value?.promoted !== true && (value?.ok === false || value?.status === "BLOCKED");
  } catch (error) {
    return typeof error?.code === "string" && error.code.startsWith("learning_");
  }
}

function result(id, ok, detail) {
  return { id, ok, detail };
}

const proposalInput = {
  claim: {
    stable_ref: "sg:claim/retrieval-improvement",
    text: "The retriever preserves citation coverage.",
  },
  changes: [{ path: "retriever.strategy", value: "hybrid" }],
  evidence: [{
    independence_group: "capture-a",
    source_ref: "sg:source/execution-fixture",
    stable_ref: "sg:evidence/retrieval-proposal",
  }],
  proposer: "agent:proposer",
  proposal_id: "sg:proposal/retrieval-improvement",
  source_task: "sg:task/execution-fixture",
  validation: {
    status: "PASS",
    validator: "agent:proposal-validator",
    validator_version: "validator@v1",
  },
};

const proposal = createProposal(proposalInput);
const verification = verifyProposal({
  evidence: [{
    independence_group: "capture-b",
    source_ref: "sg:source/independent-fixture",
    stable_ref: "sg:evidence/retrieval-verification",
  }],
  independent_of: "agent:proposer",
  proposal,
  validation: {
    status: "PASS",
    validator: "agent:independent-validator",
    validator_version: "validator@v2",
  },
  verifier: "agent:verifier",
});
const decision = decideProposal({
  decision: "ACCEPT",
  governance_decision: {
    actor: "governor:review-board",
    decided_at: "2026-07-23T00:00:00.000Z",
  },
  proposal,
  verification,
});

const validPromotion = promoteProposal({
  governance_decision: decision,
  proposal,
  verification,
});
const proposalV2 = createProposal({
  ...proposalInput,
  changes: [{ path: "retriever.strategy", value: "semantic" }],
});
const forgedProposal = {
  ...structuredClone(proposal),
  changes: [{ path: "retriever.strategy", value: "forged" }],
};
const forgedVerification = {
  ...structuredClone(verification),
  verifier: "agent:forger",
  verifier_actor: "agent:forger",
};
const wrongKindVerification = reversion(verification, {
  record_kind: "evidence_link",
});
const wrongLinkDecision = reversion(decision, {
  verification_ref: "sg:validation/unrelated-verification",
});
const wrongKindDecision = reversion(decision, {
  record_kind: "learning_verification",
});
const forgedDecision = {
  ...structuredClone(decision),
  actor: "governor:forger",
};
const aliasInjectedDecision = {
  ...structuredClone(decision),
  versionId: `sg:governance/alias@sha256:${"0".repeat(64)}`,
};
const tamperedEvidence = structuredClone(verification.evidence);
tamperedEvidence[0].source_ref = "sg:source/tampered-fixture";
const verificationWithTamperedEvidence = reversion(verification, {
  evidence: tamperedEvidence,
});

const rows = [
  result(
    "immutable_chain_is_fully_versioned",
    isVersioned(proposal, "learning_proposal")
      && proposal.evidence.every((item) => isVersioned(item, "evidence_link"))
      && isVersioned(proposal.validation, "validation_report")
      && isVersioned(verification, "learning_verification")
      && verification.evidence.every((item) => isVersioned(item, "evidence_link"))
      && isVersioned(verification.validation, "validation_report")
      && isVersioned(decision, "governance_decision")
      && decision.proposal_version_id === proposal.version_id
      && decision.verification_version_id === verification.version_id,
    "proposal, evidence, validation, verification, and decision have content-bound VersionIDs",
  ),
  result(
    "valid_independent_chain_promotes",
    validPromotion.promoted === true
      && isVersioned(validPromotion.version, "governed_version")
      && validPromotion.version.proposal_version_id === proposal.version_id
      && validPromotion.version.verification_version_id === verification.version_id
      && validPromotion.version.governance_decision_version_id === decision.version_id,
    "a correctly linked independent chain produces one governed version",
  ),
  result(
    "self_verification_is_rejected",
    rejected(() => verifyProposal({
      evidence: proposalInput.evidence,
      proposal,
      validation: proposalInput.validation,
      verifier: "agent:proposer",
    })),
    "the proposer cannot verify its own proposal",
  ),
  result(
    "whitespace_cannot_bypass_self_verification",
    rejected(() => verifyProposal({
      evidence: proposalInput.evidence,
      proposal,
      validation: proposalInput.validation,
      verifier: " agent:proposer ",
    })),
    "actor identity is canonicalized before the independence comparison",
  ),
  result(
    "forged_proposal_bytes_are_rejected",
    rejected(() => promoteProposal({ governance_decision: decision, proposal: forgedProposal, verification })),
    "changing proposal bytes without minting a matching VersionID is rejected",
  ),
  result(
    "forged_verification_bytes_are_rejected",
    rejected(() => promoteProposal({ governance_decision: decision, proposal, verification: forgedVerification })),
    "changing verification bytes without minting a matching VersionID is rejected",
  ),
  result(
    "stale_verification_is_rejected",
    rejected(() => promoteProposal({ governance_decision: decision, proposal: proposalV2, verification })),
    "verification and governance for an older proposal version cannot promote a newer proposal",
  ),
  result(
    "wrong_kind_verification_is_rejected",
    rejected(() => promoteProposal({ governance_decision: decision, proposal, verification: wrongKindVerification })),
    "a content-valid record with the wrong semantic kind cannot stand in for verification",
  ),
  result(
    "wrong_governance_link_is_rejected",
    rejected(() => promoteProposal({ governance_decision: wrongLinkDecision, proposal, verification })),
    "governance must bind the exact verification StableRef and VersionID",
  ),
  result(
    "wrong_kind_governance_is_rejected",
    rejected(() => promoteProposal({ governance_decision: wrongKindDecision, proposal, verification })),
    "a content-valid record with the wrong semantic kind cannot stand in for governance",
  ),
  result(
    "forged_governance_bytes_are_rejected",
    rejected(() => promoteProposal({ governance_decision: forgedDecision, proposal, verification })),
    "changing governance bytes without minting a matching VersionID is rejected",
  ),
  result(
    "nested_evidence_bytes_are_rejected",
    rejected(() => promoteProposal({ governance_decision: decision, proposal, verification: verificationWithTamperedEvidence })),
    "an outer-valid verification cannot hide evidence whose bytes no longer match its VersionID",
  ),
  result(
    "unbound_identity_alias_is_rejected",
    rejected(() => promoteProposal({ governance_decision: aliasInjectedDecision, proposal, verification })),
    "canonical learning records reject alternate identity fields that are not part of their VersionID",
  ),
  result(
    "verification_actor_cannot_govern_same_proposal",
    rejected(() => decideProposal({
      decision: "ACCEPT",
      governance_decision: { actor: "agent:verifier" },
      proposal,
      verification,
    })),
    "independent verification and governance remain separate actors",
  ),
];

const report = {
  contract: "agent-native-governed-learning-integrity",
  ok: rows.every((row) => row.ok),
  results: rows,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.ok ? 0 : 1;
