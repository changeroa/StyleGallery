---
type: Shared Infrastructure Contract
title: Consumer Reference Receiver Contract
description: Required handoff seam for optional consumer-owned reference records.
lifecycle: stable
---

# Consumer Reference Receiver Contract

Every implementation handoff includes the consumer-reference field. Applicability is optional: a handoff either declares one record or states why no record applies.

## Handoff Shape

Declared reference:

```txt
Consumer reference: declared
Consumer reference record: consumer-reference/path/to/record.json
```

Not applicable:

```txt
Consumer reference: not_applicable
Consumer reference reason: This handoff does not require consumer-specific visual or component guidance.
```

`not_applicable` requires a sentence reason. A declared handoff points to exactly one canonical record and does not duplicate its owner, maturity, support, scope, or artifact data.

## Repository-Local Record Boundary

`declared` accepts only a normalized POSIX repository-relative path ending in `.json`. The path must exist beneath the current repository root and contain valid JSON. Absolute paths, URI schemes, network paths, query or fragment redirects, `..` segments, non-normalized paths, filesystem redirects, and symlink escapes are rejected.

External consumers keep their canonical record in their own repository and apply the same rule relative to that repository root. A StyleGallery handoff never resolves a network record.

## Record Semantics

- `maturity` describes lifecycle: `experimental`, `stable`, or `deprecated`.
- `artifact_mode` describes how the artifact is held: `schema_only`, `consumer_local`, `governed_local`, or `external_consumer`.
- Maturity and artifact mode are separate fields and cannot substitute for one another.
- `stable` cannot have ended support. `deprecated` requires a replacement and removal trigger.
- Repository-owned fixtures disclose `fixture_independence: "related"`; they do not count as independent consumers.
- Current ownership truth is `owner.enforcement: "placeholder"` and `review_independence: "single_account"`. Boolean aliases are not accepted.

## Ownership And Dependency

Consumer-reference infrastructure is owned by repository governance and validation review, currently represented by the same `@changeroa` placeholder account. This is one account, not independent review.

Dependency flows from a consumer or profile to Layout. `layout/**`, `patterns/**`, `scripts/pattern-data.mjs`, and `CATALOG.md` must not import consumer-reference records, profile data, tokens, decorative values, or themes.

## Promotion Boundary

`consumer-reference/policies/shared-experimental.json` is the canonical StyleGallery-local promotion policy. Its `>=2` independent-consumer gateway applies only to consumer-local → shared-experimental invariant eligibility. It does not promote visual identity and it does not define a stable threshold. Shared stable has no numeric adoption threshold.

An RFC must record invariant scope, claim-scoped and regression evidence, canonical independence basis, actual owner and support capacity, compatibility, known issues and exceptions, migration and deprecation readiness, rollback triggers, provenance debt, and an explicit deferred or rejected decision. Normative accessibility, security, standards, or correctness fixes may waive adoption count only; every other duty remains binding.

The tracked examples are synthetic `example_only: true`, `decision: "deferred"`, and have zero adopter attestations. They are not accepted or promoted RFCs. Editorial and terminal share one related fixture set and cannot be counted as independent. Review truth is the enum `review_independence: "single_account"`; boolean aliases are invalid.

Promotion data is JSON-only. Palette, typography, imagery, motion character, and component skin remain consumer-local. A stable contract whose evidence later fails must be restricted, maintained, rolled back, or deprecated with migration; it cannot be silently relabeled experimental.

The Chromium reference sentinel is an evidence probe, not a Layout theme or product conformance claim. Its proposed baseline is compared in the immutable `linux/amd64` Playwright image, CI never updates snapshots, and the ordinary sentinel remains nonblocking while `baseline_owner_approval` is `pending`. Twenty identical committed-workflow repeats calibrate repeatability; they do not substitute for explicit `@changeroa` baseline approval. Each aggregate run is derived from a zero exit record, the exact passing Playwright test identity, hash-verified PNG/DOM/AX bytes, and comparator proof written only after the zero-diff assertion passes; producer metadata cannot claim completion or a diff.

Completed-CI repository, workflow, run ID and attempt, SHA, and artifact-name fields are workflow-recorded, self-asserted metadata, not an external attestation. The self-asserted repository field names the canonical upstream changeroa/StyleGallery; the self-asserted execution_repository field names the actual GitHub Actions repository and is limited to changeroa/StyleGallery or ark-jo/StyleGallery. The committed calibration's external_verification object records an independently checked GitHub Actions run and artifact API identity; artifact.api_digest is distinct from committed_ci.raw_evidence_sha256. Future CI aggregates remain awaiting_external_verification until their uploaded artifact API identity is independently checked. Linux/amd64 repeatability is externally verified only for committed run 29260372260; it does not establish baseline-owner approval or product suitability. Baseline-owner approval remains unclaimed until the named owner explicitly approves it. Synthetic fixtures validate rejection and acceptance behavior only; they are not authenticated provenance.

The no-dependency validator blocks direct spellings and literal fragments assembled through concatenation, template literals, or `path.join`. This bounded static check does not claim general JavaScript data-flow analysis; guarded sources must not hide reference paths behind variables or runtime computation.

## IA Navigation

Parent: [Consumer Reference](index.md).
Next: [Executable Evidence Coverage](../quality/evidence/executable-evidence.md).
