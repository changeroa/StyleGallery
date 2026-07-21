---
type: Domain Guide
title: Consumer Migration Readiness
description: Evidence-bound method for deciding whether a consumer migration preserves its declared behavior.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Consumer Migration Readiness

Use this method only when an existing consumer is being migrated and its behavior must remain demonstrably equivalent. It turns migration intent into a consumer-owned conformance record and executable page evidence without making StyleGallery the owner of product code or visual values.

## Repository Boundary

The consuming repository owns its conformance record, source paths, runtime scenarios, evidence artifacts, adoption mappings, deviations, debt, and approval decision. StyleGallery supplies an experimental method, closed schemas, and validators. It does not certify the consumer, define product defaults, or turn a local adoption into a shared standard.

Ordinary implementation handoffs remain unchanged and may use `Consumer reference: not_applicable` with a sentence reason. Only a migration handoff that elects this method adds `Consumer migration conformance: declared` and one normalized repository-relative JSON record path.

## Reusable Method

1. Inventory the old and new consumer behavior before changing implementation.
2. Create one consumer-local record using the [consumer conformance schema](../consumer-reference/schema/consumer-conformance-record.schema.json).
3. Explicitly classify every migration dimension as `applicable` with runtime scenario IDs or `not_applicable` with a sentence reason.
4. Map each adopted StyleGallery source anchor to a concrete local component, selector, or module plus its local decision, deviations, debt, and scenario IDs.
5. Execute the named unit, integration, or browser command. A prose checklist, screenshot, or generated fixture alone is not runtime proof.
6. For page work, create one source-bound evidence session, execute the browser matrix, finalize the manifest, and validate the completed session against the conformance record.
7. Review the [consumer migration evidence gate](../quality/gates/consumer-migration-evidence.md). Block migration when required evidence is missing, stale, cross-session, source-drifted, or failed.

## Migration Dimension Contract

The record must classify exactly these thirteen dimensions:

| Dimension | What the consumer must preserve or explicitly exclude |
| --- | --- |
| `behavior_inventory` | The complete named behavior surface being migrated. |
| `route_parity` | Routes, entry points, and navigation outcomes. |
| `field_parity` | Accepted fields, output fields, validation, and serialization. |
| `action_parity` | User and programmatic actions plus observable outcomes. |
| `state_transitions` | Allowed state changes, guards, and terminal states. |
| `contract_precedence` | Which rule wins when old, new, and local contracts conflict. |
| `direct_mutation` | Effects of direct state or model mutation. |
| `indirect_mutation` | Effects reached through events, adapters, or dependent modules. |
| `persistence_round_trip` | Save, reload, serialization, and restoration behavior. |
| `reset_boundary` | What reset clears, preserves, and returns to defaults. |
| `exact_time_boundary` | Inclusive or exclusive timing behavior at exact boundaries. |
| `defaults_tri_state_mapping` | Mapping among absent, explicit default, and explicit non-default values. |
| `atomic_batch_behavior` | All-or-nothing behavior, ordering, and rollback for grouped changes. |

An `applicable` dimension references at least one declared runtime scenario. A `not_applicable` dimension includes a concrete sentence reason. Silence is never a classification.

## Opinionated Guidance

- Prefer the smallest scenario that proves an observable outcome over broad internal coverage.
- Pin both the consumer revision and each adopted StyleGallery revision; a branch name or moving tag is insufficient.
- Record local deviations honestly. Conformance means the declared boundary is internally consistent, not that every StyleGallery suggestion was copied.
- Treat expired debt as a decision trigger. Do not rewrite evidence timestamps to make a stale review appear current.
- Keep page evidence tied to the exact source inventory and browser run that produced it.

## Platform-Specific Guidance

Browser page evidence uses the required viewport set `320`, `375`, `768`, `1024`, and `1440` pixels plus the declared container, content, state, overlay, and page-scale cases. Platform-specific raster identity may supplement computed assertions, but it cannot replace semantic, focus, overflow, or contrast checks and cannot imply cross-platform pixel equivalence.

## Unsupported Absolutes

Passing this method does not prove complete accessibility, product correctness, usability, visual quality, independent adoption, cross-browser equivalence, or owner approval. Synthetic fixtures prove validator behavior only. A pinned revision proves source identity, not source authority or consumer suitability.

## Verification Contract

The minimum verification chain is:

```txt
consumer source inventory
  -> conformance record with 13 explicit classifications
  -> executable scenarios with zero exit and result artifacts
  -> adoption mappings with pinned StyleGallery anchors
  -> optional source-bound page-evidence manifest
  -> consumer migration evidence gate decision
```

Validate a record without applicable page evidence directly:

```sh
node <stylegallery-root>/scripts/validate-consumer-conformance.mjs \
  --root <consumer-root> \
  --record <record.json> \
  --json
```

Unit and integration scenarios declare a shell-free Node `argv` array beginning with `node`. The validator checks out the exact consumer revision in an isolated worktree, enables Node's permission model without child-process, worker, native-addon, or WASI grants, supplies only `PATH`, `CI=1`, deterministic locale flags, `STYLEGALLERY_RESULT_ARTIFACT`, and `STYLEGALLERY_RUNTIME_CONTEXT`, and requires the command to create that result artifact during the run. Commands may read and write only inside the isolated checkout, must be self-contained at the pinned revision, and cannot override the governed permission flags. The validator does not reuse the caller's `node_modules` or forward caller secrets.

When `page_evidence.status` is `applicable`, use one artifact root for the complete lifecycle. Start the source-bound session before the browser run, write each runner result beneath that artifact root, finalize the session, and then validate the record against the completed artifacts:

```sh
node <stylegallery-root>/scripts/create-page-evidence-session.mjs \
  --root <consumer-root> \
  --record <record.json> \
  --artifact-root <artifact-root> \
  --json

node <stylegallery-root>/scripts/finalize-page-evidence.mjs \
  --root <consumer-root> \
  --artifact-root <artifact-root> \
  --runner-result <runner-result.json> \
  --review-by <RFC3339-date-time> \
  --json

node <stylegallery-root>/scripts/validate-consumer-conformance.mjs \
  --root <consumer-root> \
  --record <record.json> \
  --artifact-root <artifact-root> \
  --json
```

`<record.json>` resolves from `<consumer-root>`, and each `<runner-result.json>` resolves from `<artifact-root>`. The completed manifest must match the consumer repository, revision, relevant source set, browser scenario set, run/session identities, and source digests. The StyleGallery checkout used for validation must contain every pinned StyleGallery revision; a shallow checkout that omits a historical pin fails closed. See [Consumer Migration Evidence](../quality/evidence/consumer-migration.md) for what each channel can and cannot support.

## Source, License, And Attribution

This is a StyleGallery-local method. It has no external source snapshot and intentionally declares `provenance_kind: local` rather than upstream repository metadata.

## IA Navigation

Parent: [Design Engineering](index.md).
Next: [Consumer Migration Evidence Gate](../quality/gates/consumer-migration-evidence.md).
