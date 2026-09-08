---
type: Domain Guide
title: Cross-System Term Cases
description: Directly sourced terms and scoped relations for tool values, runtime representations, components, patterns, and historical formats.
domain: design-terminology
lifecycle: experimental
---

# Cross-System Term Cases

Primary role: applied cross-system term relation record.

## Repository Boundary

This page applies the typed relation model to recorded term records and conflict scenarios. It does not rename StyleGallery's own terms, and its relations are working judgments with boundaries, not claims that one source's definition is correct. V0.1 records these as Markdown; the structured registry is a promotion prerequisite.

## Reusable Method

1. Name the sources in tension and the shared term.
2. Record each side as a term record with source, kind, concept, status, and scope.
3. Assign one relation type per pair per explicit scope and declare its direction.
4. Write the non-equivalence boundary: where substitution breaks.
5. Stamp `reviewed_on`; re-verify when any involved source revises its term.

## Term Records

| Term | Label | Source (kind) | Concept | Status | Scope | Reviewed on |
| --- | --- | --- | --- | --- | --- | --- |
| `figma.variable` | Variable | [Figma](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes) (`design-tool`) | named-design-value | current | variable collection; dated help page | 2026-09-08 |
| `figma.mode` | Mode | [Figma](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes) (`design-tool`) | value-context | current | values selected within a collection | 2026-09-08 |
| `figma.collection` | Collection | [Figma](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes) (`design-tool`) | variable-organization | current | collection containing variables and modes | 2026-09-08 |
| `figma.component` | Component | [Figma](https://help.figma.com/hc/en-us/articles/360038662654-Guide-to-components-in-Figma) (`design-tool`) | tool-instance-model | current | reusable design object and its instances | 2026-09-08 |
| `dtcg.token` | Token | [DTCG](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/#design-token) (`specification`) | interchange-record | current | Format Module 2025.10 | 2026-09-08 |
| `dtcg.group` | Group | [DTCG](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/#groups) (`specification`) | token-organization | current | Format Module 2025.10 | 2026-09-08 |
| `dtcg.token.draft2` | Token | [DTCG](https://www.designtokens.org/tr/second-editors-draft/format/#design-token) (`specification`) | interchange-record | historical | Second Editors' Draft, 2022-06-14 | 2026-09-08 |
| `css.custom-property` | Custom property | [CSSWG](https://www.w3.org/TR/css-variables-1/#defining-variables) (`web-platform`) | runtime-value-slot | current | CSS Custom Properties Level 1 | 2026-09-08 |
| `carbon.component` | Component | [Carbon](https://carbondesignsystem.com/all-about-carbon/what-is-carbon/) (`design-system`) | published-ui-building-block | current | Carbon design and implementation resources | 2026-09-08 |
| `carbon.pattern` | Pattern | [Carbon](https://carbondesignsystem.com/patterns/overview/) (`design-system`) | workflow-guidance | current | Carbon patterns catalog | 2026-09-08 |
| `stylegallery.pattern` | Pattern | [StyleGallery](../layout/index.md) (`pattern-library`) | spatial-primitive | current | repository Layout corpus | 2026-09-08 |

The external locators and local Layout contract were rechecked on the dates shown. Current status is bounded by the named source/version, not a promise about every later release. Concept labels are local classification summaries.

## Recorded Relations

| From | To | Type | Scope | Direction | Boundary | Reviewed on |
| --- | --- | --- | --- | --- | --- | --- |
| `figma.variable` | `dtcg.token` | `partial_overlap` | value-interchange | symmetric | Exportable design values overlap; Figma prototype values need not be tokens, while the format has composite structures not supplied by one scalar variable | 2026-09-08 |
| `css.custom-property` | `dtcg.token` | `implementation_representation` | token-to-css-output | directional | A custom property can consume a translated token value; it also holds non-design values and does not preserve the entire token record | 2026-09-08 |
| `figma.collection` | `dtcg.group` | `partial_overlap` | value-organization | symmetric | Both organize named values; a Figma collection includes modes, while a format group can nest groups and carry format-specific metadata | 2026-09-08 |
| `figma.mode` | `dtcg.group` | `not_comparable` | context-versus-containment | symmetric | A mode selects value context; a group organizes token records. Containment alone does not choose the active context | 2026-09-08 |
| `figma.component` | `carbon.component` | `same_label_different_meaning` | handoff-artifact-identity | symmetric | A reusable tool object and a system-published UI unit share a label; a design instance is not by itself the system's implementation contract | 2026-09-08 |
| `carbon.pattern` | `stylegallery.pattern` | `partial_overlap` | reusable-interface-guidance | symmetric | Both describe reusable interface arrangements; Carbon includes task sequences and flows, while StyleGallery Layout covers spatial constraints without those interaction contracts | 2026-09-08 |
| `carbon.component` | `carbon.pattern` | `not_comparable` | catalog-unit-subtyping | symmetric | Composition is not set containment: a workflow can use components without being a broader class whose instances include component instances | 2026-09-08 |
| `dtcg.token.draft2` | `dtcg.token` | `near_equivalent` | versioned-token-concept | symmetric | The named-value interchange concept overlaps; the 2022 draft and 2025.10 format have different conformance details, so historical files need version-specific validation | 2026-09-08 |

## Scenario A: Component Versus Pattern

Query phrasing: `component versus pattern terminology`, `difference between component and pattern across design systems`.

Distinguish Figma's design object from Carbon's published component before comparing either with a pattern. `figma.component` and `carbon.component` use `same_label_different_meaning`. Within Carbon, components participate in patterns; composition does not establish the set-theoretic `broader_than` relation. Carbon and StyleGallery patterns have `partial_overlap` within reusable interface guidance, with different behavioral boundaries.

## Scenario B: Variable, Design Token, And CSS Custom Property

Query phrasing: `figma variable design token custom property`.

These are different labels from three source kinds. Their relation is not the same-label case. `figma.variable` and `dtcg.token` have `partial_overlap`; `css.custom-property` → `dtcg.token` is `implementation_representation`, with the representation first. A tool-to-code binding requires a consumer-owned translation; it does not establish equivalence or guarantee a lossless round trip.

## Scenario C: Historical And Current Token Formats

Query phrasing: `historical design token format`, `DTCG second editors draft versus 2025.10`.

The retained 2022 source describes a historical draft. The versioned 2025.10 source describes an intended-for-implementation format. Both remain records; a common label does not make their file contracts identical. The relation is `near_equivalent` for the concept, not `renamed_to`: the label did not change. Neither Community Group report is a W3C Recommendation.

## Scenario D: Style Guide Versus Design System

Query phrasing: `style guide versus design system`.

Result: insufficient context until an organization and dated source are named on both sides. “Industry history” cannot stand in for a specific historical style guide. Do not create a universal rename or deprecation event; request the two sources and then use the [Comparison Workflow](comparison-workflow.md).

## Opinionated Guidance

- Resolve a conflict only after naming every source involved; silent resolution creates the next conflict.
- Prefer surface-prefixed translations over merged definitions when handing off.
- StyleGallery's own [Controlled Vocabulary](../guides/vocabulary.md) stays authoritative inside this repository.
- Add a case only with at least two named, cited sources in genuine tension.

## Platform-Specific Guidance

When a case involves a platform guideline source, cite that platform's surface and route deeper convention comparison to [Platform Guides](../platform-guides/index.md); engine terms route to Game UI; motion terms to Motion.

## Unsupported Absolutes

- A working relation is not a standard.
- One source's revision does not obligate others to follow.
- A recorded case does not close the conflict outside its boundary.
- Tool feature names do not settle system-layer definitions.

## Verification Contract

Run `node scripts/validate-design-terminology.mjs --json` and its fixtures after editing. Verify both direct source locators, the comparison scope, direction, and boundary. The validator checks record shape and graph invariants; semantic accuracy still requires source review. Re-review when a named source changes the cited meaning.

## Source, License, And Attribution

Locally authored summaries and judgments, with direct source links per term. Rechecked 2026-09-08: Figma variables/components, DTCG 2025.10 and second draft, CSS Custom Properties Level 1, Carbon system/pattern pages, and the local Layout hub. No source prose or code samples are copied. This is an author source review, not independent semantic approval.

## IA Navigation

Parent: [Design Terminology](index.md).
Next: [Design Term Comparison Workflow](comparison-workflow.md).
