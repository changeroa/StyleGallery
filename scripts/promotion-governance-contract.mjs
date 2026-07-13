const requirements = [
  ["GOVERNANCE.md", "The StyleGallery-local `>=2` independent-consumer gateway applies only to consumer-local → shared-experimental invariant eligibility."],
  ["GOVERNANCE.md", "Shared stable has no numeric adoption threshold"],
  ["GOVERNANCE.md", "may waive adoption count only"],
  ["GOVERNANCE.md", "zero durable adopter attestations and record no promotion"],
  ["GOVERNANCE.md", "never be silently relabeled shared-experimental"],
  ["DOMAINS.md", "### Consumer Reference Promotion"],
  ["DOMAINS.md", "Promotion records are JSON-only"],
  ["consumer-reference/contract.md", "They are not accepted or promoted RFCs."],
  ["consumer-reference/contract.md", "boolean aliases are invalid"],
  ["consumer-reference/index.md", "[Promotion RFC schema](schema/promotion-rfc.schema.json)"],
  ["consumer-reference/index.md", "[Shared-experimental promotion policy](policies/shared-experimental.json)"],
  ["consumer-reference/fixtures/promotion/manifest.json", '"id": "promotion-fixture-inventory"'],
  ["quality/evidence/executable-evidence.md", "Promotion governance remains a closed JSON-only, invariant-scoped, deferred example contract."],
  ["quality/evidence/executable-evidence.md", "Synthetic validation does not authenticate adoption, organizations, owners, support capacity, provenance, or a promotion decision"],
  [".github/workflows/validate.yml", "node -c scripts/promotion-fixture-inventory.mjs"],
  [".github/workflows/validate.yml", "node -c scripts/promotion-boundary-test-contract.mjs"],
  ["consumer-reference/policies/shared-experimental.json", '"review_independence": "single_account"'],
  ["consumer-reference/policies/shared-experimental.json", '"promotion_occurred": false'],
  ["consumer-reference/policies/shared-experimental.json", '"adopter_attestations": 0'],
  ["consumer-reference/policies/shared-experimental.json", '"stable_numeric_threshold": null'],
];

export function promotionGovernanceFailures(read) {
  return requirements
    .filter(([relative, text]) => !read(relative).includes(text))
    .map(([relative, text]) => `${relative}: missing ${text}`);
}
