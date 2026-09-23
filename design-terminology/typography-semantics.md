---
type: Domain Guide
title: Typography Roles, Styles, And Representations
description: Compare named type roles, native scaling behavior, composite token records, and CSS output without inventing universal size mappings.
domain: design-terminology
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-09-21
---

# Typography Roles, Styles, And Representations

Primary role: typography vocabulary comparison.

## Repository Boundary

This guide compares source-specific meanings. It defines no StyleGallery type scale, font choice, size, density, or visual token. Product typography belongs to its consumer; Layout owns spatial behavior. [Term Cases](conflict-cases.md) is the canonical record for the term identifiers and relations used here.

## Reusable Method

Identify whether “style” means a semantic role, a bundle of values, a collection of role slots, a native scaling behavior, or a runtime declaration. Compare sources at that level. Then record what information is lost when the result is serialized or rendered elsewhere.

### Source Findings

| Source | Bounded meaning | Boundary to retain |
| --- | --- | --- |
| [Apple HIG typography](https://developer.apple.com/design/human-interface-guidelines/typography) | Text styles combine typographic attributes into a hierarchy and participate in system text-size adaptation. | A single exported size does not encode the complete native scaling behavior. |
| [Fluent 2 typography](https://fluent2.microsoft.design/typography) | The type ramp supplies named styles and roles for a selected target platform. | A role label does not specify one universal font or numeric size across platforms. |
| [Material 3 in Compose](https://developer.android.com/develop/ui/compose/designsystems/material3#typography) | The `Typography` class models the Material 3 type scale using named style slots. | This is the system's Compose implementation surface, not an interchange specification. |
| [DTCG typography type](https://www.designtokens.org/tr/2025.10/format/#typography) | The composite record includes family, size, weight, letter spacing, and line height. | The record does not itself implement platform text scaling. |
| [CSS font shorthand](https://www.w3.org/TR/css-fonts-4/#font-prop) | `font` is a runtime shorthand over defined font properties and line height. | It does not encode every typographic property or the original role metadata. |

Read on 2026-09-21. Apple content was inspected through the official documentation JSON. Material and Fluent references are dated product documentation. DTCG Format 2025.10 is a Community Group report; CSS Fonts Level 4 is a standards-track publication. Actual font availability and rendering require target evidence.

### Comparing A Style With A Record

`apple.text-style` and `dtcg.typography` have `partial_overlap` for exchanging typographic attributes. Some attributes can be represented in both. Apple's style is also connected to native text-size behavior, while an interchange record can describe styles outside Apple's system. An exporter must explain the scope of a match.

`css.font` → `dtcg.typography` is an `implementation_representation` relation scoped to partial typography output. A consumer must emit additional properties such as letter spacing separately when needed and retain provenance outside the shorthand. This relation does not promise a reversible conversion.

### Comparing Role Collections

`material3.typography` and `fluent.type-ramp` have `partial_overlap` for named typography roles. Both help organize hierarchy, but the role inventories, defaults, and implementation surfaces differ. Matching two names containing “body” does not prove equivalent intended use or visual results.

A collection of styles and one style are different abstraction levels. Before declaring `broader_than`, demonstrate proper set containment with comparable instances; a class that contains fields is not automatically a broader semantic concept than those fields.

### Worked Handoff: Dense Review Surface

A consumer wants more records visible while retaining readable annotations and controls. Separate the density decision from typography translation. Density might change spacing, optional detail, or command presentation; it need not mean scaling every font down.

| Decision | Evidence to request | Translation failure |
| --- | --- | --- |
| Role mapping | Task purpose and named source roles | Similar labels map headings to ordinary labels. |
| Value representation | Output properties and units | A composite style loses a required property. |
| Scaling | Target user setting and the resulting style behavior | A static export ignores larger-text settings. |
| Font fallback | Actual fonts and representative scripts | A role looks acceptable only with a locally installed font. |
| Reading hierarchy | Long and localized content on the target surface | Compact labels obscure the main task. |

This is a proposed consumer investigation, not evidence that a particular type scale improves reading speed. For product adaptation, use [Preferences And Accessibility](../platform-guides/preferences-and-accessibility.md); for editing behavior, use [Text Input And Internationalization](../design-engineering/text-input-and-internationalization.md).

## Opinionated Guidance

Preserve semantic roles even when two styles currently share values. Judge a translation by the declared task, retained attributes, and target scaling behavior. Treat a visual match at one size as a narrow observation.

## Platform-Specific Guidance

Points, CSS pixels, and scale-aware native units must be interpreted by the selected runtime. Native text-style names do not become CSS breakpoints or shared Layout tokens. Font fallback and script shaping require actual rendering; a vocabulary comparison cannot establish them.

## Unsupported Absolutes

A type ramp is not a universal accessibility standard. A typography token is not a complete native text-style behavior. CSS `font` is not a lossless export of all typography information. More visible rows do not prove higher task efficiency.

## Verification Contract

Record source roles, relation scope, output representation, scaling inputs, and any omitted information. Probe default and enlarged text, missing fonts, long labels, multiple scripts, and the actual target's line metrics. Keep file validation separate from visual and user-task evidence.

These probes are unexecuted. Source meaning was reviewed; runtime rendering and reading performance were not measured. Re-review when role definitions, format versions, platform scaling, or adapter behavior changes.

## Source, License, And Attribution

Locally authored synthesis without imported type values or source examples. Terminology reliance: `apple.text-style`, `fluent.type-ramp`, `material3.typography`, `dtcg.typography`, and `css.font`; relation types: `partial_overlap` and `implementation_representation`. Named sources were rechecked 2026-09-21; this is author review, not independent semantic approval. `consumer_reference: not_applicable` because no consumer typography record is selected.

## IA Navigation

Parent: [Design Terminology](index.md).
Next: [Token Semantics And Resolution](token-semantics.md).
