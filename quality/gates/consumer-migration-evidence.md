---
type: Quality Gate
title: Consumer Migration Evidence Gate
description: Blocking contract for consumer-owned migration conformance and page evidence.
---

# Consumer Migration Evidence Gate

Use this gate only for a declared consumer migration. Ordinary implementation handoffs keep the existing consumer-reference applicability contract and do not need a migration record.

## Required Contract

Record:

```txt
Consumer migration conformance: declared
Consumer migration conformance record: path/to/consumer-conformance.json
Consumer revision:
Relevant source inventory:
Thirteen migration-dimension classifications:
Runtime scenario results:
Adoption mappings:
Page evidence: applicable | not_applicable
Deviations:
Debt and review dates:
Claim boundary:
Decision: pass | block
```

The record path is normalized, repository-relative JSON inside the consuming repository. The record follows the [consumer conformance schema](../../consumer-reference/schema/consumer-conformance-record.schema.json) and the [receiver contract](../../consumer-reference/contract.md).

## Blocking Conditions

Block when any of the following is true:

- any of the thirteen migration dimensions is absent rather than explicitly `applicable` or `not_applicable`;
- an applicable dimension has no declared runtime scenario, or a scenario has a nonzero exit, missing result artifact, mismatched run/session identity, or stale source digest;
- an adoption mapping lacks a pinned StyleGallery revision and anchor, concrete local target, local decision, scenario link, or declared deviations and debt;
- page evidence is applicable but its source inventory, revision, browser scenario catalog, repository, run, session, artifact hashes, or finalized manifest does not match the conformance record;
- a source changes between session creation and finalization, an artifact escapes the evidence root, a symlink or unmanifested artifact is accepted, or evidence is reused across sessions;
- expired blocking evidence or malformed freshness metadata is presented as current;
- the handoff implies that passing validator or browser checks proves complete accessibility, product correctness, usability, or approval.

## Evidence Decision

Pass means only that the declared migration contract and its named evidence agree at the pinned consumer and StyleGallery revisions. It does not mean the migration is universally correct or that omitted behavior is safe. Reviewers still decide whether the inventory and `not_applicable` reasons are credible.

Use [Consumer Migration Evidence](../evidence/consumer-migration.md) to interpret runtime, browser, freshness, and review channels. Use [Executable Evidence](../evidence/executable-evidence.md) for the repository-wide distinction between structural enforcement and human judgment.

## IA Navigation

Parent: [Gate Contracts](index.md).
Next: [Consumer Migration Evidence](../evidence/consumer-migration.md).
