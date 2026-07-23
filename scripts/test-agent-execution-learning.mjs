import {
  bytes,
  callExport,
  failFromCall,
  fixedNow,
  hasAnyText,
  idOf,
  isObject,
  payload,
  pick,
  result,
  stateOf,
} from "./test-agent-execution-fixtures.mjs";

export async function exerciseLearning(modules, state) {
  const rows = [];
  const proposalInput = {
    claim: { stableRef: "sg:claim/retrieval-improvement", text: "The fixture retriever preserves citation coverage." },
    changes: [{ path: "retriever.strategy", value: "hybrid" }],
    evidence: [{ receiptId: pick(state.receipt, ["receiptId", "receipt_id", "id"]), stableRef: "sg:evidence/execution-fixture" }],
    proposer: "agent:proposer",
    proposalId: "sg:proposal/retrieval-improvement",
    sourceTask: idOf(state.task, "sg:task/execution-fixture"),
    validation: { status: "PASS", validator: "agent:validator", version: "validator@v1" },
  };
  const proposalCall = await callExport(modules.learning, "learning", "createProposal", proposalInput);
  const proposal = proposalCall.ok ? payload(proposalCall.value) : null;
  const directPromotionCall = await callExport(modules.learning, "learning", "promoteProposal", { proposal });
  const directPromotion = directPromotionCall.ok ? payload(directPromotionCall.value) : null;
  rows.push(directPromotionCall.ok
    ? result(
      "promotion_requires_verify_and_decision",
      "proposal cannot promote before an independent verification and accepted governance decision",
      directPromotion,
      !(isObject(directPromotion) && (directPromotion.promoted === true || directPromotion.status === "PROMOTED")),
    )
    : failFromCall("promotion_requires_verify_and_decision", "proposal cannot promote before an independent verification and accepted governance decision", directPromotionCall));
  if (!proposalCall.ok) {
    rows.push(failFromCall("learning_proposal_is_immutable_and_provenanced", "proposal records claim, evidence, validation, proposer, and proposed change", proposalCall));
    return rows;
  }
  rows.push(result(
    "learning_proposal_is_immutable_and_provenanced",
    "proposal records claim, evidence, validation, proposer, and proposed change",
    proposal,
    isObject(proposal)
      && isObject(pick(proposal, ["claim"]))
      && Array.isArray(pick(proposal, ["evidence", "evidenceLinks", "evidence_links"]))
      && isObject(pick(proposal, ["validation"]))
      && typeof pick(proposal, ["proposer", "proposedBy", "proposed_by"]) === "string"
      && Array.isArray(pick(proposal, ["changes", "patch", "delta"])),
  ));

  const sameActorCall = await callExport(modules.learning, "learning", "verifyProposal", {
    proposal,
    verifier: "agent:proposer",
    verifierActor: "agent:proposer",
    evidence: proposalInput.evidence,
    validation: proposalInput.validation,
  });
  const sameActor = sameActorCall.ok ? payload(sameActorCall.value) : null;
  rows.push(sameActorCall.ok
    ? result(
      "learning_verification_requires_independence",
      "proposer cannot satisfy the independent verification gate",
      sameActor,
      !(isObject(sameActor) && (sameActor.verified === true || sameActor.status === "VERIFIED" || sameActor.ok === true)),
    )
    : failFromCall("learning_verification_requires_independence", "proposer cannot satisfy the independent verification gate", sameActorCall));

  const verifyCall = await callExport(modules.learning, "learning", "verifyProposal", {
    independentOf: "agent:proposer",
    proposal,
    verifier: "agent:verifier",
    verifierActor: "agent:verifier",
    evidence: [{ ...proposalInput.evidence[0], independentGroup: "verification-group" }],
    validation: { status: "PASS", validator: "agent:validator", version: "validator@v1" },
  });
  const verification = verifyCall.ok ? payload(verifyCall.value) : null;
  rows.push(verifyCall.ok
    ? result(
      "learning_verification_is_independent_and_validated",
      "different actor supplies positive verification with passing validation",
      verification,
      isObject(verification)
        && (pick(verification, ["verified", "isVerified"]) === true || stateOf(verification) === "VERIFIED" || stateOf(verification) === "verified")
        && typeof pick(verification, ["verifier", "verifiedBy", "verified_by"]) === "string"
        && pick(verification, ["verifier", "verifiedBy", "verified_by"]) !== pick(proposal, ["proposer", "proposedBy", "proposed_by"]),
    )
    : failFromCall("learning_verification_is_independent_and_validated", "different actor supplies positive verification with passing validation", verifyCall));

  const decisionCall = await callExport(modules.learning, "learning", "decideProposal", {
    decision: "ACCEPT",
    governanceDecision: { actor: "governor:test", decision: "ACCEPT", scope: "retriever", decidedAt: fixedNow },
    proposal,
    verification,
  });
  const decision = decisionCall.ok ? payload(decisionCall.value) : null;
  rows.push(decisionCall.ok
    ? result(
      "learning_governance_decision_is_explicit",
      "promotion is gated by an explicit accepted governance decision",
      decision,
      isObject(decision) && hasAnyText(decision, ["decision", "status", "disposition"], ["ACCEPT", "ACCEPTED", "accepted"]),
    )
    : failFromCall("learning_governance_decision_is_explicit", "promotion is gated by an explicit accepted governance decision", decisionCall));

  const registryBefore = { entries: [{ stableRef: "sg:retriever/fixture", versionId: "sg:retriever/fixture@sha256:4444444444444444444444444444444444444444444444444444444444444444" }] };
  const registryDigestBefore = bytes(registryBefore);
  const promotionCall = await callExport(modules.learning, "learning", "promoteProposal", {
    decision,
    governanceDecision: decision,
    proposal,
    registry: registryBefore,
    verification,
  });
  const promotion = promotionCall.ok ? payload(promotionCall.value) : null;
  rows.push(promotionCall.ok
    ? result(
      "learning_promotion_never_auto_asserts_truth",
      "accepted promotion creates a new governed version/receipt without mutating prior registry or asserting factual truth",
      promotion,
      isObject(promotion)
        && (promotion.promoted === true || hasAnyText(promotion, ["status", "state"], ["PROMOTED", "promoted"]))
        && bytes(registryBefore) === registryDigestBefore
        && pick(promotion, ["autoTruth", "auto_truth", "truthAccepted", "truth_accepted"]) !== true,
    )
    : failFromCall("learning_promotion_never_auto_asserts_truth", "accepted promotion creates a new governed version/receipt without mutating prior registry or asserting factual truth", promotionCall));
  return rows;
}
