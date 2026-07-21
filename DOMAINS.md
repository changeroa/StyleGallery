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

## Page Manifest

| Domain | Manual hub | Governed leaves |
| --- | --- | --- |
| Layout | `layout/index.md` | Existing `GUIDE.md`, Layout-specific `guides/*.md`, and `recipes/*.md`; generated `patterns/**/*.md` and `CATALOG.md` remain at current paths. Shared `quality/**/*.md` infrastructure governs every domain without becoming a Layout leaf. |
| Motion | `motion/index.md` | `motion/vocabulary.md`, `motion/review-workflow.md`, `motion/practice-reference.md` |
| Design Engineering | `design-engineering/index.md` | `design-engineering/interface-craft.md` |
| Game UI | `game-ui/index.md` | `game-ui/classification.md`, `game-ui/screen-hierarchy.md`, `game-ui/reference-record.md`, `game-ui/unity/architecture.md`, `game-ui/unity/ui-systems.md`, `game-ui/unity/cli-loop.md`, `game-ui/unity/repository-map.md`, `game-ui/unity/org-wiki.md` |
| Platform Guides | `platform-guides/index.md` | `platform-guides/apple-interaction.md` |

## Shared Non-Domain Infrastructure

[Consumer Reference](consumer-reference/index.md) is shared schema, provenance, routing, and evidence infrastructure outside the five-domain contract. It owns no profile implementation or visual values and cannot add a sixth domain row. Consumer or profile records may depend on Layout; Layout and its generated corpus cannot import those records.

## External Adaptation Contract

The initial five domain leaves are independent method rewrites inspired by [emilkowalski/skills](https://github.com/emilkowalski/skills) at snapshot `220e8607c90b17337d210125777b7b695f26c221`. Other adapted leaves record their own repositories and revisions in page metadata.

- Each externally adapted leaf records `source_repository`, exact `source_path`, and the full `source_revision`. Locally authored synthesis leaves state that boundary in their attribution section and omit upstream metadata.
- A full SHA identifies source content; it does not prove publisher authenticity or local quality.
- The local pages do not retain upstream prose, tables, code samples, distinctive examples, or distinctive sequence.
- Apple/WWDC-derived expression and quotations attributed to other authors, including the Paul Graham quotation noted during review, are excluded.
- If recognizable upstream expression is added later, preserve the full upstream MIT notice and record the copied material separately before merge.
- Tracked repository documents must not depend on `.omo/`; stable upstream blob links and tracked repository contracts carry contributor-facing provenance.

## Promotion And Staleness

External adaptations begin `experimental`. Promotion to `stable` requires a demonstrated reader or review task, evidence that the document improves that task, a named review owner, and no unresolved provenance or platform-version debt. Remove or revise a page when its source revision changes materially, a platform claim becomes stale, a local quality gate contradicts it, or a reader test shows the route is misleading.

Consumer-reference maturity is governed independently from artifact mode. Stable records cannot have ended support, and related repository fixtures are not independent adoption evidence.

## IA Navigation

Parent: [StyleGallery](index.md).
Next: [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md) for ownership and validator policy.
