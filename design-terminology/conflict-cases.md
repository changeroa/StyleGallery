---
type: Domain Guide
title: Cross-System Term Cases
description: Typed-relation term records and three representative cross-system scenarios with non-equivalence boundaries.
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
3. Assign one relation type per pair per scope.
4. Write the non-equivalence boundary: where substitution breaks.
5. Stamp `reviewed_on`; re-verify when any involved source revises its term.

## Term Records

| Term | Source (kind) | Concept | Status | Scope | Reviewed on |
| --- | --- | --- | --- | --- | --- |
| `figma.variable` | Figma (`design-tool`) | named-design-value | current | file- or collection-bound | 2026-08-18 |
| `figma.mode` | Figma (`design-tool`) | theme-context | current | variable collection | 2026-08-18 |
| `figma.component` | Figma (`design-tool`) | tool-instance-model | current | file-bound | 2026-08-18 |
| `dtcg.token` | DTCG Format (`specification`) | interchange-record | current | format-bound | 2026-08-18 |
| `css.custom-property` | CSS (web platform) | runtime-value-slot | current | document/runtime | 2026-08-18 |
| `polaris.token` | Polaris (`design-system`) | published-design-value | current | system-wide | 2026-08-18 |
| `carbon.pattern` | Carbon (`design-system`) | workflow-guidance | current | system-wide | 2026-08-18 |
| `polaris.pattern` | Polaris (`design-system`) | workflow-guidance | current | system-wide | 2026-08-18 |
| `stylegallery.pattern` | StyleGallery (`pattern-library`) | spatial-primitive | current | repository | 2026-08-18 |
| `primitive` (shared usage) | multiple systems | base-layer-input | current | per-system | 2026-08-18 |
| `hig.material` | Apple HIG (`platform-guideline`) | visual-surface-treatment | current | OS platforms | 2026-08-18 |
| `material.system` | Google (`design-system`) | system-collection-name | current | brand-wide | 2026-08-18 |
| `styleguide` (historical) | industry history | visual-style-governance | historical | org-wide | 2026-08-18 |
| `designsystem` (general) | industry usage | layered-system-collection | current | org-wide | 2026-08-18 |
| `foundation` (layer label) | Material, Fluent, Carbon, Polaris | base-layer-label | current | per-system | 2026-08-18 |
| `variant` / `mode` / `state` / `theme` | tool, code, tokens | theme-variant-context | current | per-surface | 2026-08-18 |

## Recorded Relations

| From | To | Type | Boundary |
| --- | --- | --- | --- |
| `figma.variable` | `dtcg.token` | `partial_overlap` | Exportable variables intersect the format; tool features such as modes exceed it, and not every variable is a portable token |
| `figma.variable` | `css.custom-property` | `implementation_representation` | Variables can bind to custom properties in codegen; the binding is a representation path, not semantic identity |
| `dtcg.token` | `css.custom-property` | `implementation_representation` | Custom properties are one serialization target for token values and also hold non-design values |
| `polaris.token` | `dtcg.token` | `implementation_representation` | The format is one representation of Polaris's published values; the system, not the format, owns the values |
| `figma.mode` | `variant`/`theme` cluster | `near_equivalent` | Modes, tool variants, component states, and token themes overlap as context switching but diverge in binding level |
| `figma.component` | code component | `same_label_different_meaning` | Tool instance model versus shipped code unit; swapping definitions breaks handoff |
| `figma.component` | system component | `same_label_different_meaning` | A tool construct versus a published system unit with API and support |
| `carbon.pattern` | `stylegallery.pattern` | `partial_overlap` | Both are reusable solutions above atomic controls; Carbon patterns are workflow guidance, StyleGallery patterns are spatial primitives |
| `carbon.pattern` | `polaris.pattern` | `near_equivalent` | Both name system-level workflow guidance with content and maturity differences |
| `carbon.pattern` | Carbon component | `broader_than` | Within Carbon, patterns compose components into flows; the containment is system-scoped |
| `primitive` | `foundation` terms | `near_equivalent` | Shared base-layer usage across systems with unstable extension: sometimes tokens, sometimes atoms |
| `hig.material` | `material.system` | `same_label_different_meaning` | HIG names visual surface treatments; Material names a design system; the shared label is coincidence |
| `styleguide` | `designsystem` | `partial_overlap` | Era- and org-scoped: a historical style guide governs visual style; a design system layers foundations, code, and governance; both labels coexist |
| `foundation` (Material) | `foundation` (Fluent, Carbon, Polaris) | `near_equivalent` | Near-equivalent layer labels whose contents each system decides independently |

## Scenario A: Component vs Pattern

Question: is a component a pattern; at what level do `primitive`, `component`, and `pattern` sit?

Query phrasing covered: `component versus pattern terminology`, `difference between component and pattern across design systems`.

Answer shape: per system, not universal. In Carbon, `pattern` is `broader_than` its components within Carbon's scope; `carbon.pattern` and `stylegallery.pattern` share the reusable-solution region only as `partial_overlap`; `primitive` is `near_equivalent` to foundation terms with an unstable extension. A merged one-line definition would erase these boundaries.

## Scenario B: Variable vs Design Token vs CSS Custom Property

Question: are Figma's `variable`, DTCG's `token`, and CSS's `custom property` the same thing?

Query phrasing covered: `figma variable design token custom property`. This is the same-label different-meaning case.

Answer shape: no single equivalence holds. The three terms come from different source kinds (`design-tool`, `specification`, web platform mechanism) with different concepts: named-design-value, interchange-record, runtime-value-slot. `figma.variable` → `dtcg.token` is `partial_overlap`; `dtcg.token` → `css.custom-property` is `implementation_representation`. Substitution breaks in both directions: tool modes do not survive export, and custom properties carry non-design values.

## Scenario C: Style Guide vs Design System

Question: is a `style guide` the same as a `design system`?

Query phrasing covered: `style guide versus design system`.

Answer shape: no; `partial_overlap` scoped by era and organization. The historical `styleguide` record carries `historical_scope`: org-wide visual governance, dominant before layered systems with code and tokens; `introduced_in`/`deprecated_in` are not globally datable because adoption is per-organization, which is exactly why the relation is not `renamed_to`. Named-source evidence: the four recorded design systems each publish foundations-plus-components-plus-guidance, which no cited historical style guide scope covers.

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

For each relation, verify both cited sources still use the recorded terms and meanings, the typed relation and boundary still hold, `reviewed_on` is current for the claim, and every case names at least two sources in tension.

## Source, License, And Attribution

This page is a locally authored relation record with locally written summaries. Cited sources remain authoritative for their own definitions; no upstream definitional prose is reproduced.

## IA Navigation

Parent: [Design Terminology](index.md).
Next: [StyleGallery Domains](../DOMAINS.md).
