---
type: Domain Guide
title: Design Source Vocabularies
description: Freshness-bounded inventory of named vocabulary sources with source kind, vocabulary surface, version boundary, and review status.
domain: design-terminology
lifecycle: experimental
---

# Design Source Vocabularies

Primary role: named vocabulary source inventory.

## Repository Boundary

This page inventories the named sources whose terms this domain records, with the fields needed to re-verify each reading later. It records which surfaces each source publishes, not what any surface should contain. It does not adjudicate a universal definition of `design system` or rank sources.

## Reusable Method

1. Name the source and its owner.
2. Assign the source kind using [Design Source Kinds](source-kinds.md).
3. Record the published vocabulary surfaces as verbatim layer names.
4. Record the version boundary and status, and stamp `reviewed_on` and `retrieved_on`.
5. Re-verify before any promotion beyond `experimental`, and record what changed.

## Recorded Sources

| Source | Owner | Source kind | Vocabulary surface | Version boundary | Status | Reviewed on |
| --- | --- | --- | --- | --- | --- | --- |
| [Material 3](https://m3.material.io/foundations) | Google | `design-system` | `foundations`, `components`, `styles`, `design tokens` | Living site; reviewed page set below | current | 2026-08-18 |
| [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) | Apple | `platform-guideline` | `components`, `materials`, `layout`, patterns | OS release cycle; reviewed page set | current | 2026-08-18 |
| [Fluent 2](https://fluent2.microsoft.design/) | Microsoft | `design-system` | `foundations`, `components`, `patterns`, tokens | Living site; reviewed page set | current | 2026-08-18 |
| [Carbon](https://carbondesignsystem.com/) | IBM | `design-system` | `foundations` including tokens, `components`, `patterns` | Living site; reviewed page set | current | 2026-08-18 |
| [Polaris](https://polaris.shopify.com/) | Shopify | `design-system` | `foundations` including design tokens, `components`, `patterns`, `icons` | Living site; package versions for code | current | 2026-08-18 |
| [Design Tokens Format](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) | Design Tokens Community Group | `specification` | `token`, `group`, `alias` data model | Format Module 2025.10; Community Group report, not a W3C Recommendation | current | 2026-09-08 |
| [Figma](https://help.figma.com/hc/en-us) | Figma | `design-tool` | `variables`, `modes`, `components` as tool constructs | Product and help-center version | current | 2026-08-18 |

All entries cite official first-party URLs (`authority: official`); `retrieved_on` equals the corresponding `reviewed_on`. Entries retaining 2026-08-18 are prior bounded readings, not rechecked claims for the current session.

## Direct Sources For Current Term Records

The [Term Cases](conflict-cases.md) use this narrower source set, rechecked 2026-09-08. Locators in the term table point to the exact document or section, not a general vendor home page.

| Named source | Source kind | Reviewed surface and version | Re-review trigger |
| --- | --- | --- | --- |
| Figma | `design-tool` | [Variables, collections, modes](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes) and [components](https://help.figma.com/hc/en-us/articles/360038662654-Guide-to-components-in-Figma); dated help pages | Tool data model or cited help meaning changes |
| DTCG | `specification` | [2025.10 Format](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) and [Second Editors' Draft, 2022-06-14](https://www.designtokens.org/tr/second-editors-draft/format/) | A comparison changes version; retain the historical scope |
| CSSWG | `web-platform` | [CSS Custom Properties Level 1](https://www.w3.org/TR/css-variables-1/#defining-variables) | The cited runtime-value definition changes |
| Carbon | `design-system` | [What is Carbon](https://carbondesignsystem.com/all-about-carbon/what-is-carbon/) and [patterns overview](https://carbondesignsystem.com/patterns/overview/) | Component or pattern scope changes |
| StyleGallery | `pattern-library` | Local [Layout hub](../layout/index.md) and its repository contract | Layout ownership or pattern contract changes |

The DTCG 2022 reading is historical evidence of a draft, not an implementation recommendation. A direct locator and a recorded reading establish provenance for the local summary; independent semantic approval remains separate.

## Freshness Policy

Every recorded source carries: `source_url`, `source_kind`, a version boundary (specification version, product version, OS cycle, or dated reviewed page set), `status` in `current` / `deprecated` / `historical` / `unknown`, `reviewed_on`, and `retrieved_on`. Living sites without publishable versions record the reviewed page set and a re-review trigger. Terms with era history additionally record `introduced_in`, `deprecated_in`, `renamed_to`, and `historical_scope` in [Cross-System Term Cases](conflict-cases.md).

## Reading The Inventory

- Four of the seven broad browse sources are design systems; HIG is a platform guideline, DTCG is a specification, Figma is a tool. Horizontal comparison is valid only within a kind, or through typed relations with boundaries.
- `foundations` labels are near-equivalent as layer names, but each system decides what the layer contains.
- The DTCG row records an interchange format, not a published token set.
- Dates above are the reading bound; any later restructure is new evidence, not a back-fill.

## Opinionated Guidance

- Cite surfaces verbatim; do not translate one source's layer names into another's inside a record.
- Add a source only when its vocabulary surface is public, named, and officially linkable.
- Record doc-surface and code-package vocabulary separately when they diverge.
- Treat a renamed surface as new evidence with a new review date.

## Platform-Specific Guidance

Platform-owned sources appear here only for terminology records; interaction-convention comparison routes to [Platform Guides](../platform-guides/index.md).

## Unsupported Absolutes

- A source's layer count is not a maturity measure.
- Absence of a surface does not mean the source lacks that capability.
- This inventory does not verify any link resolves today beyond its recorded review date.
- Inclusion here is not an endorsement for product adoption.

## Verification Contract

Before promotion or material edit, re-verify each cited surface still exists and still publishes the recorded layer names; update `status` and `reviewed_on`; confirm no entry quotes upstream definitional text.

## Source, License, And Attribution

This page is locally authored. Every cited source remains the authority on its own vocabulary; links are usage evidence, and no upstream prose, tables, or code samples are reproduced.

## IA Navigation

Parent: [Design Terminology](index.md).
Next: [Design Concept Families](concept-families.md).
