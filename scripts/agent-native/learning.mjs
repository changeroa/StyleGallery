import { deepFreeze } from "./canonical-json.mjs";
import { parseStableRef } from "./identity.mjs";
import {
  LearningError, assertEvidenceRecords, assertLearningRecord, assertLink, assertValidationRecord,
  compactLearning, copyLearning, failLearning, learningObject, makeEvidenceRecords,
  makeLearningRecord, makeValidationRecord, nextLearningRegistry, own, stableLearningRef,
  textLearning,
} from "./learning-records.mjs";

const ACCEPTED = new Set(["ACCEPT", "ACCEPTED", "APPROVE", "APPROVED"]);
const DECISIONS = new Set([...ACCEPTED, "REJECT", "REJECTED", "DENY", "DENIED", "DEFER", "DEFERRED"]);

export { LearningError };

function slug(ref) {
  return ref.slice(ref.indexOf("/") + 1);
}

function requireRefKind(ref, kind, path) {
  if (parseStableRef(ref).kind !== kind) {
    failLearning("learning_record_kind_invalid", `${path} must use sg:${kind}/...`, path);
  }
  return ref;
}

function actorOf(value, path) {
  return textLearning(
    own(value, "verifier", "verifier_actor", "verifierActor", "verified_by", "verifiedBy", "actor", "subject"),
    path,
  ).trim();
}

function blocked(code, message, fields = {}) {
  return deepFreeze({ ...fields, code, message, ok: false, status: "BLOCKED" });
}

function decisionOf(value) {
  const decision = typeof value === "string" ? value : own(value, "decision", "status", "disposition");
  return typeof decision === "string" ? decision.toUpperCase() : undefined;
}

function assertProposal(value) {
  const proposal = assertLearningRecord(value, "learning_proposal", "proposal");
  requireRefKind(proposal.stable_ref, "proposal", "proposal.stable_ref");
  const proposer = textLearning(proposal.proposer, "proposal.proposer");
  if (proposer !== proposer.trim()) {
    failLearning("learning_actor_invalid", "proposal.proposer must be canonical", "proposal.proposer");
  }
  learningObject(proposal.claim, "proposal.claim");
  if (!Array.isArray(proposal.changes) || proposal.changes.length === 0) {
    failLearning("learning_changes_required", "proposal requires at least one proposed change", "proposal.changes");
  }
  assertEvidenceRecords(proposal.evidence, undefined, "proposal.evidence");
  assertValidationRecord(proposal.validation, undefined, "proposal.validation");
  return proposal;
}

function proposalOf(input) {
  const proposal = assertProposal(own(input, "proposal"));
  return { proposal, proposalRef: proposal.stable_ref };
}

function assertVerification(value, proposal) {
  const verification = assertLearningRecord(value, "learning_verification", "verification");
  requireRefKind(verification.stable_ref, "validation", "verification.stable_ref");
  assertLink(verification, "proposal_ref", proposal.stable_ref, "verification");
  assertLink(verification, "proposal_version_id", proposal.version_id, "verification");
  const verifier = actorOf(verification, "verification.verifier");
  if (verifier === proposal.proposer || verification.independent !== true || verification.verified !== true) {
    failLearning("learning_verification_requires_independence", "verification must be independent from the proposer", "verification.verifier");
  }
  assertLink(verification, "independent_of", proposal.proposer, "verification");
  const bindings = { proposal_ref: proposal.stable_ref, proposal_version_id: proposal.version_id };
  assertEvidenceRecords(verification.evidence, bindings, "verification.evidence");
  const validation = assertValidationRecord(verification.validation, bindings, "verification.validation");
  if (validation.validator === proposal.proposer) {
    failLearning("learning_verification_requires_independence", "proposal author cannot validate its verification", "verification.validation.validator");
  }
  return verification;
}

function assertDecision(value, proposal, verification) {
  const governance = assertLearningRecord(value, "governance_decision", "governance_decision");
  requireRefKind(governance.stable_ref, "governance", "governance_decision.stable_ref");
  assertLink(governance, "proposal_ref", proposal.stable_ref, "governance_decision");
  assertLink(governance, "proposal_version_id", proposal.version_id, "governance_decision");
  assertLink(governance, "verification_ref", verification.stable_ref, "governance_decision");
  assertLink(governance, "verification_version_id", verification.version_id, "governance_decision");
  const actor = actorOf(governance, "governance_decision.actor");
  if (actor === proposal.proposer || actor === verification.verifier) {
    failLearning("learning_governance_requires_independence", "proposal author or verifier cannot govern the same proposal", "governance_decision.actor");
  }
  if (!DECISIONS.has(decisionOf(governance))) {
    failLearning("learning_decision_invalid", "governance decision has an unsupported disposition", "governance_decision.decision");
  }
  return governance;
}

export function createProposal(input) {
  const source = learningObject(input, "createProposal");
  const ref = requireRefKind(stableLearningRef(
    own(source, "stable_ref", "stableRef", "proposal_id", "proposalId"),
    "createProposal.stable_ref",
  ), "proposal", "createProposal.stable_ref");
  const claim = learningObject(own(source, "claim"), "createProposal.claim");
  const changes = own(source, "changes", "patch", "delta");
  if (!Array.isArray(changes) || changes.length === 0) {
    failLearning("learning_changes_required", "proposal requires at least one proposed change", "changes");
  }
  const proposer = textLearning(own(source, "proposer", "proposed_by", "proposedBy"), "proposer").trim();
  const evidence = makeEvidenceRecords(own(source, "evidence", "evidence_links", "evidenceLinks"), {
    path: "evidence",
    slug: `${slug(ref)}-proposal-evidence`,
  });
  const validation = makeValidationRecord(own(source, "validation"), {
    path: "validation",
    stableRef: `sg:validation/${slug(ref)}-proposal`,
  });
  return makeLearningRecord(source, ref, "learning_proposal", {
    changes: copyLearning(changes),
    claim: copyLearning(claim),
    evidence,
    proposal_id: ref,
    proposer,
    source_task: copyLearning(own(source, "source_task", "sourceTask", "task_id", "taskId")),
    status: "PROPOSED",
    validation,
  });
}

export function verifyProposal(input) {
  const source = learningObject(input, "verifyProposal");
  const { proposal, proposalRef } = proposalOf(source);
  const verifier = actorOf(source, "verifier");
  const independentOf = own(source, "independent_of", "independentOf");
  if (verifier === proposal.proposer || (independentOf !== undefined && independentOf !== proposal.proposer)) {
    return blocked("learning_verification_requires_independence", "verifier must be independent from proposer", {
      independent: false, verified: false, verifier,
    });
  }
  const bindings = { proposal_ref: proposalRef, proposal_version_id: proposal.version_id };
  const evidence = makeEvidenceRecords(own(source, "evidence", "evidence_links", "evidenceLinks"), {
    bindings,
    path: "evidence",
    slug: `${slug(proposalRef)}-verification-evidence`,
  });
  const validation = makeValidationRecord(own(source, "validation"), {
    bindings,
    path: "validation",
    stableRef: `sg:validation/${slug(proposalRef)}-verification-report`,
  });
  if (validation.validator === proposal.proposer) {
    return blocked("learning_verification_requires_independence", "proposal author cannot validate its verification", {
      independent: false, verified: false, verifier,
    });
  }
  const ref = `sg:validation/${slug(proposalRef)}-verification`;
  return makeLearningRecord(source, ref, "learning_verification", {
    evidence,
    independent: true,
    independent_of: proposal.proposer,
    proposal_ref: proposalRef,
    proposal_version_id: proposal.version_id,
    status: "VERIFIED",
    validation,
    verified: true,
    verifier,
    verifier_actor: verifier,
  });
}

export function decideProposal(input) {
  const source = learningObject(input, "decideProposal");
  const { proposal, proposalRef } = proposalOf(source);
  const verification = assertVerification(own(source, "verification"), proposal);
  const provided = learningObject(
    own(source, "governance_decision", "governanceDecision") ?? source,
    "governanceDecision",
  );
  const decision = textLearning(own(source, "decision") ?? decisionOf(provided), "decision").toUpperCase();
  if (!DECISIONS.has(decision)) failLearning("learning_decision_invalid", "decision is unsupported", "decision");
  const actor = actorOf(provided, "governanceDecision.actor");
  if (actor === proposal.proposer || actor === verification.verifier) {
    return blocked("learning_governance_requires_independence", "proposal author or verifier cannot govern the same proposal", { actor });
  }
  const ref = `sg:governance/${slug(proposalRef)}-decision`;
  return makeLearningRecord(source, ref, "governance_decision", {
    actor,
    decided_at: copyLearning(own(provided, "decided_at", "decidedAt")),
    decision,
    proposal_ref: proposalRef,
    proposal_version_id: proposal.version_id,
    status: decision,
    verification_ref: verification.stable_ref,
    verification_version_id: verification.version_id,
  });
}

export function promoteProposal(input) {
  const source = learningObject(input, "promoteProposal");
  const { proposal, proposalRef } = proposalOf(source);
  const rawVerification = own(source, "verification") ?? own(proposal, "verification");
  if (!rawVerification) return blocked("learning_promotion_requires_verification", "promotion requires verification", { promoted: false, proposal_ref: proposalRef });
  const verification = assertVerification(rawVerification, proposal);
  const rawGovernance = own(source, "governance_decision", "governanceDecision")
    ?? (typeof own(source, "decision") === "object" ? own(source, "decision") : undefined);
  if (!rawGovernance) return blocked("learning_promotion_requires_governance", "promotion requires governance", { promoted: false, proposal_ref: proposalRef });
  const governance = assertDecision(rawGovernance, proposal, verification);
  if (!ACCEPTED.has(decisionOf(governance))) {
    return blocked("learning_promotion_requires_governance", "promotion requires an accepted decision", { promoted: false, proposal_ref: proposalRef });
  }
  const targetRef = stableLearningRef(
    own(source, "target_stable_ref", "targetStableRef", "target_ref", "targetRef")
      ?? own(proposal, "target_stable_ref", "targetStableRef")
      ?? own(proposal.claim, "stable_ref", "stableRef"),
    "target_stable_ref",
  );
  const version = makeLearningRecord({}, targetRef, "governed_version", {
    changes: copyLearning(proposal.changes),
    claim: copyLearning(proposal.claim),
    evidence: copyLearning(verification.evidence),
    governance_decision_version_id: governance.version_id,
    proposal_ref: proposalRef,
    proposal_version_id: proposal.version_id,
    verification_version_id: verification.version_id,
  });
  const receipt = makeLearningRecord({}, `sg:governance/${slug(proposalRef)}-promotion`, "promotion_receipt", {
    governed_version_id: version.version_id,
    governance_decision_version_id: governance.version_id,
    outcome: "PROMOTED",
    proposal_ref: proposalRef,
    proposal_version_id: proposal.version_id,
    verification_version_id: verification.version_id,
  });
  return deepFreeze(compactLearning({
    promoted: true,
    proposal_ref: proposalRef,
    receipt,
    registry: nextLearningRegistry(own(source, "registry"), targetRef, version.version_id),
    status: "PROMOTED",
    version,
    version_id: version.version_id,
  }));
}

export const createLearningProposal = createProposal, verifyLearningProposal = verifyProposal;
export const decideLearningProposal = decideProposal, promoteLearningProposal = promoteProposal;
