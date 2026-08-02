const requirements = [
  ["consumer-reference/contract.md", "## Promotion Boundary"],
  ["consumer-reference/contract.md", "[shared-experimental promotion policy](policies/shared-experimental.json)"],
  ["consumer-reference/contract.md", "[promotion RFC schema](schema/promotion-rfc.schema.json)"],
  ["consumer-reference/contract.md", "`>=2` independent-consumer gateway applies only to consumer-local → shared-experimental invariant eligibility."],
  ["consumer-reference/contract.md", "Shared stable has no numeric adoption threshold"],
  ["consumer-reference/contract.md", "may waive adoption count only"],
  ["consumer-reference/contract.md", "They are not accepted or promoted RFCs."],
  ["consumer-reference/contract.md", "boolean aliases are invalid"],
  ["consumer-reference/contract.md", "zero adopter attestations"],
  ["consumer-reference/contract.md", "cannot be silently relabeled experimental"],
  ["consumer-reference/index.md", "[Promotion RFC schema](schema/promotion-rfc.schema.json)"],
  ["consumer-reference/index.md", "[Shared-experimental promotion policy](policies/shared-experimental.json)"],
  ["consumer-reference/fixtures/promotion/manifest.json", '"id": "promotion-fixture-inventory"'],
  ["quality/evidence/executable-evidence.md", "Promotion governance remains a closed JSON-only, invariant-scoped, deferred example contract."],
  ["quality/evidence/executable-evidence.md", "Synthetic validation does not authenticate adoption, organizations, owners, support capacity, provenance, or a promotion decision"],
  ["consumer-reference/policies/shared-experimental.json", '"review_independence": "single_account"'],
  ["consumer-reference/policies/shared-experimental.json", '"promotion_occurred": false'],
  ["consumer-reference/policies/shared-experimental.json", '"adopter_attestations": 0'],
  ["consumer-reference/policies/shared-experimental.json", '"stable_numeric_threshold": null'],
];

const secondaryDocs = ["DOMAINS.md", "GOVERNANCE.md"];
const proseOwnerLink = "[canonical promotion contract](consumer-reference/contract.md#promotion-boundary)";
const policyOwnerLink = "[canonical JSON promotion policy](consumer-reference/policies/shared-experimental.json)";
const conflictingPromotionProse = [
  /shared stable (?:has|uses) a numeric adoption threshold/i,
  /Editorial and terminal are independent consumers/i,
  /promotion records (?:may|can) use YAML/i,
  /may be silently relabeled (?:shared-)?experimental/i,
  /durable adopter attestations/i,
];

export function promotionGovernanceFailures(read) {
  const failures = requirements
    .filter(([relative, text]) => !read(relative).includes(text))
    .map(([relative, text]) => `${relative}: missing ${text}`);

  for (const relative of secondaryDocs) {
    const content = read(relative);
    if (!content.includes(proseOwnerLink)) {
      failures.push(`${relative}: missing canonical promotion contract link consumer-reference/contract.md#promotion-boundary`);
    }
    if (!content.includes(policyOwnerLink)) {
      failures.push(`${relative}: missing canonical JSON promotion policy link consumer-reference/policies/shared-experimental.json`);
    }
    if (relative === "GOVERNANCE.md" && content.includes("Stable uses an adoption threshold.")) {
      failures.push("GOVERNANCE.md: missing Shared stable has no numeric adoption threshold");
    } else if (conflictingPromotionProse.some((pattern) => pattern.test(content))) {
      failures.push(`${relative}: promotion prose duplicates or conflicts with canonical owner consumer-reference/contract.md#promotion-boundary`);
    }
  }

  return failures;
}
