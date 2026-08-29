---
type: Domain Manifest
title: StyleGallery Domains
description: Canonical domain ownership, scope, lifecycle, page membership, and provenance policy.
---

# StyleGallery Domains

Primary role: domain manifest.

This manifest is the source of truth for top-level StyleGallery domains. A domain owns a coherent decision surface; a category is a domain-local browse placement and must not be used as a synonym for domain.

## Domain Contract

| Domain | Hub | Lifecycle | Owns | Does not own | Review owner |
| --- | --- | --- | --- | --- | --- |
| Layout | [Layout](layout/index.md) | `stable` and `generated` | Spatial patterns, recipes, planning, constraints, and scroll ownership. | Product motion, visual treatment, or platform imitation. | Pattern-data owner |
| Motion | [Motion](motion/index.md) | `experimental` | Motion naming, review procedure, and bounded practice guidance. | Universal prescriptions or reusable Layout CSS. | Motion domain owner |
| Design Engineering | [Design Engineering](design-engineering/index.md) | `experimental` | Product-layer craft questions and evidence-bearing decisions. | A second shared principle system or taste as proof. | Design Engineering domain owner |
| Game UI | [Game UI](game-ui/index.md) | `experimental` | Game-interface classification, hierarchy, reference records, and implementation guides nested by engine. | Reusable Layout CSS or claims that one engine structure is universal. | Game UI domain owner |
| Platform Guides | [Platform Guides](platform-guides/index.md) | `experimental` | Comparative references for a named platform and version context. | Affiliation, brand imitation, or authority over web standards. | Platform Guides domain owner |
| State Management | [State Management](state-management/index.md) | `experimental` | Framework-neutral application-state ownership, lifetime, derivation, logical transitions, synchronization, recovery, and verification. | Spatial Layout, transition animation, visual component states, backend consistency, product business rules, or universal library prescriptions. | State Management domain owner |

## Page Manifest

| Domain | Manual hub | Governed leaves |
| --- | --- | --- |
| Layout | `layout/index.md` | Existing `GUIDE.md`, Layout-specific `guides/*.md`, and `recipes/*.md`; generated `patterns/**/*.md` and `CATALOG.md` remain at current paths. Shared `quality/**/*.md` infrastructure governs every domain without becoming a Layout leaf. |
| Motion | `motion/index.md` | `motion/vocabulary.md`, `motion/review-workflow.md`, `motion/practice-reference.md` |
| Design Engineering | `design-engineering/index.md` | `design-engineering/interface-craft.md`, `design-engineering/consumer-migration-readiness.md`, `design-engineering/reference-profiles/index.md`, `design-engineering/reference-profiles/governed-local/index.md`, `design-engineering/reference-profiles/external-adaptation/index.md` |
| Game UI | `game-ui/index.md` | `game-ui/classification.md`, `game-ui/screen-hierarchy.md`, `game-ui/reference-record.md`, `game-ui/unity/architecture.md`, `game-ui/unity/ui-systems.md`, `game-ui/unity/cli-loop.md`, `game-ui/unity/repository-map.md`, `game-ui/unity/org-wiki.md` |
| Platform Guides | `platform-guides/index.md` | `platform-guides/apple-interaction.md` |
| State Management | `state-management/index.md` | `state-management/catalog.md`, `state-management/guides/planning-workflow.md`, `state-management/guides/decision-tree.md`, `state-management/guides/state-brief.md`, `state-management/guides/verification-matrix.md`, `state-management/patterns/index.md`, `state-management/patterns/ownership/local-draft-state.md`, `state-management/patterns/ownership/url-owned-state.md`, `state-management/patterns/ownership/server-state-cache.md`, `state-management/patterns/derivation/derived-state.md`, `state-management/patterns/transitions/explicit-transition-model.md`, `state-management/patterns/synchronization/optimistic-mutation.md`, `state-management/recipes/index.md`, `state-management/recipes/pattern-to-recipe-matrix.md`, `state-management/recipes/search-and-filter.md`, `state-management/recipes/editable-form.md`, `state-management/recipes/optimistic-list.md` |

## Shared Non-Domain Infrastructure

[Consumer Reference](consumer-reference/index.md) is shared schema, provenance, routing, evidence, lifecycle, and machine-retrieval infrastructure outside the six-domain contract. Its source-bound material v2 index classifies admitted pages by these six domains but does not own their prose. It owns no profile implementation, visual values, application-state behavior, or product CSS and cannot add another domain row. Consumer or profile records may depend on Layout; Layout and its generated corpus cannot import consumer-reference, profile, material-registry, or transport records.

## External Adaptation Contract

The externally adapted leaves in the initial five-domain snapshot are independent method rewrites inspired by [emilkowalski/skills](https://github.com/emilkowalski/skills) at snapshot `220e8607c90b17337d210125777b7b695f26c221`. Other adapted leaves record their own repositories and revisions in page metadata. State Management leaves are locally authored StyleGallery methods with `provenance_kind: local` and no upstream source fields.

- Each externally adapted leaf records `source_repository`, exact `source_path`, and the full `source_revision`. Locally authored synthesis leaves state that boundary in their attribution section and omit upstream metadata.
- A full SHA identifies source content; it does not prove publisher authenticity or local quality.
- The local pages do not retain upstream prose, tables, code samples, distinctive examples, or distinctive sequence.
- Apple/WWDC-derived expression and quotations attributed to other authors, including the Paul Graham quotation noted during review, are excluded.
- If recognizable upstream expression is added later, preserve the full upstream MIT notice and record the copied material separately before merge.
- Tracked repository documents must not depend on `.omo/`; stable upstream blob links and tracked repository contracts carry contributor-facing provenance.

`design-engineering/consumer-migration-readiness.md` is the separately declared StyleGallery-local leaf. It uses `provenance_kind: local`, carries no external source fields, and remains experimental. Its presence does not change the external-adaptation inventory or make its consumer-local method universal policy.

## Lifecycle And Staleness

External adaptations begin `experimental`. Domain lifecycle changes are repository-owner decisions based on whether the bounded scope remains coherent, provenance and platform-version obligations are current, and machine-checkable contracts have relevant validator coverage. User studies, reader tasks, adoption counts, and attestations are neither required nor sufficient for a domain lifecycle change. Remove or revise a page when its source revision changes materially, a platform claim becomes stale, a local quality gate contradicts it, or its route or boundary no longer matches the domain contract.

### Consumer Reference Promotion

This separate contract governs consumer-reference invariant sharing only; it does not govern domain or page lifecycle. Consumer-reference promotion does not add a domain. The [canonical promotion contract](consumer-reference/contract.md#promotion-boundary) owns the full human-readable boundary, and the [canonical JSON promotion policy](consumer-reference/policies/shared-experimental.json) owns machine policy. As a boundary summary: the `>=2` gateway applies only to consumer-local → shared-experimental invariant eligibility; Editorial and terminal are related examples in one fixture set; Shared stable has no numeric adoption threshold; and Normative correctness may waive adoption count only. A failed stable contract is never silently relabeled experimental. Promotion records are JSON-only, and the committed examples remain synthetic with zero adopter attestations.

## IA Navigation

Parent: [StyleGallery](index.md).
Next: [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md) for ownership and validator policy.
