---
type: Domain Guide
title: Token Semantics And Resolution
description: Compare semantic roles, references, groups, resolver contexts, and runtime values without treating their names as interchangeable.
domain: design-terminology
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-09-21
---

# Token Semantics And Resolution

Primary role: source-specific token terminology comparison.

## Repository Boundary

This page compares vocabulary and the decisions obscured by ambiguous token names. It imports no token values, themes, or compiler behavior. [Consumer Reference](../consumer-reference/index.md) owns interchange/evidence infrastructure; consumer profiles own their values and implementation. Layout's token boundary remains unchanged.

Canonical term and relation records live in [Cross-System Term Cases](conflict-cases.md). This guide explains their use; it does not establish a second term registry.

## Reusable Method

When a handoff says “alias,” “semantic,” or “theme,” identify whether it refers to design intent, a reference edge, organization, context selection, or a runtime representation. Record the named source before choosing an equivalence relation. Inspect the exported structure separately from the visual result.

### Sources And Distinctions

| Source | Source-backed distinction | Question for a handoff |
| --- | --- | --- |
| [Fluent 2 tokens](https://fluent2.microsoft.design/design-tokens) | Global tokens hold context-independent values; alias tokens add semantic meaning. | Does “alias” name a semantic layer in this system? |
| [DTCG Format 2025.10](https://www.designtokens.org/tr/2025.10/format/) | A token value may reference another token; groups organize records. | Does “alias” name a reference relationship in an interchange document? |
| [Carbon color overview](https://carbondesignsystem.com/elements/color/overview/) | Color tokens preserve roles across themes while assigned values can change. | Is the role stable across every theme being compared? |
| [Carbon color usage](https://carbondesignsystem.com/elements/color/usage/) | Contextual color tokens depend on the layer where they are used. | Is the surrounding layer part of value resolution? |
| [DTCG Resolver 2025.10](https://www.designtokens.org/tr/2025.10/resolver/) | Modifiers conditionally select sources through contexts; ordered resolution determines the resulting token set. | Where are the selected contexts and conflict order recorded? |
| [CSS Custom Properties Level 1](https://www.w3.org/TR/css-variables-1/) | Custom properties participate in CSS runtime value substitution and the cascade. | Which original semantics and metadata remain after translation? |

All six source surfaces were inspected on 2026-09-21. DTCG 2025.10 modules are Community Group reports, not W3C Recommendations. The Fluent and Carbon pages are dated system documentation, not guarantees about every package release.

### Alias Is Not One Decision

The recorded `fluent.alias-token` / `dtcg.alias` relation is `partial_overlap`. A semantic token may use a reference, but a reference edge does not itself prove a semantic role. A reference between two raw values illustrates the non-semantic region; a consumer's exported semantic value may be flattened and no longer retain its reference edge.

The `fluent.alias-token` / `carbon.color-token` relation is also scoped overlap. Both can express role-oriented color decisions, but their vocabularies and non-color coverage differ. This is not permission to rename one system's tokens after another's or assert that their role sets are identical.

### Grouping Is Not Context Selection

The recorded `dtcg.resolver-modifier` / `dtcg.group` relation is `not_comparable` for organization-versus-resolution. Ask where a context is selected, where sources are ordered, and where a group is merely a path. A directory or group named `dark` does not independently explain how a consumer chooses dark appearance.

This distinction also prevents confusing a token system's theme with a user's complete preference state. A selected theme does not determine text scaling, reduced motion, or every platform accessibility preference; those adaptation decisions belong to [Platform Guides](../platform-guides/preferences-and-accessibility.md).

### Worked Handoff: Same Color, Different Meaning

Two consumer roles happen to resolve to the same displayed color in one theme. Preserve the roles separately when their purposes differ. Equality of an output value is evidence of that output only; it does not justify merging source concepts.

| Handoff field | Proposed content | Why it matters |
| --- | --- | --- |
| Source term | Source-qualified identifier and locator | Keeps a role name attached to its own vocabulary. |
| Comparison scope | The particular translation being considered | Prevents a local mapping from becoming universal equivalence. |
| Context | Theme, layer, or resolver inputs actually selected | Makes value resolution reproducible. |
| Output representation | Target format and adapter version | Separates serialization from semantic intent. |
| Retained/lost information | Role, reference edges, metadata, and unsupported structures | Exposes lossy translation. |
| Verification | Structural check plus rendered state evidence if appearance is claimed | Avoids treating a valid file as a usable component. |

The fields are a local analysis aid. They do not expand this repository's closed token adapter or admit arbitrary DTCG features into existing schemas.

## Opinionated Guidance

Prefer source-qualified names in cross-system discussions. Before merging tokens, compare responsibilities across contexts, not just matching values in a screenshot. Keep compiler inputs explicit enough that another consumer can explain how an output was obtained.

## Platform-Specific Guidance

An exported custom property, native resource, or tool variable can consume translated design information without preserving the full source contract. The concrete adapter owns unit conversion, missing features, and runtime context. Comparative vocabulary cannot certify that adapter.

## Unsupported Absolutes

A reference is not proof of semantic intent. A group is not automatically a theme selector. The same value is not the same role. A valid DTCG document is not a declaration that StyleGallery supports every feature in that document.

## Verification Contract

Recheck both source locators for each relied-on relation and record the scope and direction. Probe a matching value with different roles, a changed theme, a contextual layer change, and a flattened export. Inspect the actual adapter if making a round-trip or runtime claim.

These are proposed checks. Only source readings and Markdown record consistency are claimed here; no token pipeline or product rendering was executed. Re-review when a vocabulary, module version, or adapter contract changes.

## Source, License, And Attribution

Locally authored synthesis; no source token values or upstream expression are copied. Terminology reliance: `fluent.alias-token`, `fluent.global-token`, `carbon.color-token`, `dtcg.alias`, `dtcg.token`, `dtcg.group`, `dtcg.resolver-modifier`, and `css.custom-property`. Relations used: `partial_overlap`, `implementation_representation`, and `not_comparable`. Named sources were rechecked 2026-09-21; local relations remain author judgments, not independent semantic approval. `consumer_reference: not_applicable` because no consumer profile or adapter record is selected.

## IA Navigation

Parent: [Design Terminology](index.md).
Next: [Typography Semantics](typography-semantics.md).
