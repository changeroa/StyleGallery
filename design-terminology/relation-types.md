---
type: Domain Guide
title: Design Term Relations
description: Typed semantic relation model between design terms from different named sources, and the term record shape.
domain: design-terminology
lifecycle: experimental
---

# Design Term Relations

Primary role: typed term relation model.

## Repository Boundary

This guide defines the closed set of typed relations used to judge how two design terms relate, and the shape of a term record. It does not decide which external definition is correct, and its types never rename StyleGallery's own terms. Relations are judgments recorded with evidence, not standards.

## Reusable Method

1. Record both terms with their sources, kinds, and concepts.
2. Choose exactly one relation type from the closed set below.
3. Write the boundary statement: the specific scope in which the relation holds and where it breaks.
4. Stamp `reviewed_on`; a relation without a date is unverified.
5. Re-verify the relation whenever either source revises the term.

## Relation Types

| Relation type | Meaning | Invariants | Required boundary statement |
| --- | --- | --- | --- |
| `equivalent_within_scope` | The two terms denote the same concept inside one named scope | Symmetric; a named scope must exist and be recorded | The scope, and what changes outside it |
| `near_equivalent` | Mostly overlapping meaning with known divergences | Symmetry must be declared per record; the axis creating the divergence must be named | The divergences and their axis |
| `partial_overlap` | Some instances satisfy both terms; others satisfy only one | Symmetric; both the common region and each non-common region must be recorded | Which instances fall on each side |
| `broader_than` | The first term's extension properly contains the second's | Directional; the reverse side must hold `narrower_than` when recorded from the other term; a counterexample direction must exist | The contained region and a counterexample direction |
| `narrower_than` | Inverse of `broader_than` | Directional; must be the inverse of the paired `broader_than` record | Same as above, inverted |
| `implementation_representation` | One term is a way the other is serialized, stored, or consumed | Directional and fixed: the from-term is the representation, the to-term is the semantic concept; the direction must not flip between records of the same pair | The representation direction and what is lost or added |
| `renamed_to` | A source replaced one label with another | Intra-source temporal: both terms must belong to one named source, with a dated or versioned rename event | The rename event and both statuses |
| `deprecated_in_favor_of` | A source withdrew one term in favor of another | Requires a deprecation basis and a replacement source of record | The withdrawal scope and migration note |
| `same_label_different_meaning` | Identical labels, distinct concepts | Requires evidence that label is identical while concept or scope differs | Both meanings and the confusion risk |
| `not_comparable` | No meaningful relation holds at the cited scopes | Symmetric; the comparison axis that fails must be named | Why comparison fails |

### Forbidden Error States

A relation record is invalid when any of the following holds:

- The same term pair records `broader_than` and `narrower_than` simultaneously in one direction (these are inverse views, not two facts).
- The same pair and scope records `equivalent_within_scope` and `not_comparable` (or any other contradiction) at once.
- `renamed_to` lacks a time or version basis for the rename event.
- Either term lacks an official, named source.
- The boundary field is empty or restates the type without adding scope.

These rules are the human contract for v0.1; when the structured registry lands, they become validator rules unchanged.

## Term Record Shape

```yaml
term_id: figma.variable
label: Variable
source: figma            # named source from source-vocabularies
source_kind: design-tool # from source-kinds
concept: named-design-value
status: current          # current | deprecated | historical | unknown
scope: file-or-collection-bound
reviewed_on: 2026-08-18
relations:
  - target: dtcg.token
    type: partial_overlap
    boundary: >
      Some tool variables export as interchange tokens, but tool features
      such as modes exceed the format, and not every variable is a
      portable design token.
```

In v0.1 this shape is authored as the Markdown tables in [Cross-System Term Cases](conflict-cases.md). A machine-readable registry holding terms, concepts, sources, and relations is a prerequisite for promoting this domain beyond `experimental`; until then Material v2 answers document search only, not structured crosswalk queries.

## Opinionated Guidance

- One relation type per pair, per scope; two relations for the same pair require two named scopes.
- `partial_overlap` with a stated boundary beats an unqualified equivalence.
- A relation between different source kinds must say what the kind difference contributes.
- Reject a recorded relation whose boundary restates the type without adding scope.

## Platform-Specific Guidance

Relations involving a platform guideline source cite that platform's surface; deeper convention comparison routes to [Platform Guides](../platform-guides/index.md).

## Unsupported Absolutes

- A relation is not a standard and binds no source.
- Popularity does not decide `broader_than`.
- Tool-layer feature names do not settle system-layer relations.
- Absence of a relation between two terms is not evidence of equivalence.

## Verification Contract

Every recorded relation names two term records, one type from the closed set, a non-trivial boundary, and a review date; verify both sources still use the terms as recorded before promotion.

## Source, License, And Attribution

This page is a locally authored model. Cited sources remain authoritative for their own definitions; no upstream prose is reproduced.

## IA Navigation

Parent: [Design Terminology](index.md).
Next: [Cross-System Term Cases](conflict-cases.md).
