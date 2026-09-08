---
type: Domain Guide
title: Design Term Comparison Workflow
description: Resolve source-specific terminology questions with a scoped relation, explicit uncertainty, and a reusable handoff.
domain: design-terminology
lifecycle: experimental
provenance_kind: local
---

# Design Term Comparison Workflow

Primary role: terminology lookup, authoring, and handoff route.

## Repository Boundary

This workflow answers what two named sources mean and how those meanings relate. Internal naming still belongs to [Controlled Vocabulary](../guides/vocabulary.md). Implementation behavior belongs to its owning domain. Document retrieval does not execute a structured terminology query.

## Reusable Method

1. Capture the exact question, both labels, intended audience, and comparison scope.
2. Identify each named source and [source kind](source-kinds.md). If either source is missing, report insufficient context.
3. Check [Recorded Sources](source-vocabularies.md) and open the direct term locators in [Term Cases](conflict-cases.md).
4. Record each label, concept, status, and version independently. Classify through [Concept Families](concept-families.md).
5. Select a [relation type](relation-types.md), direction, and non-trivial boundary. A composed-of relationship is not automatically subtyping.
6. Return the scoped result, term IDs, source recheck status, and a counterexample or missing observation.
7. For a new record, update the source inventory and term/relation tables, then run their validator and fixtures.

## Decision Table

| Situation | Result to produce |
| --- | --- |
| Identical labels, distinct meanings in two named sources | `same_label_different_meaning`, both meanings and the confusion risk |
| Shared region but source-specific features on both sides | `partial_overlap`, intersection and each side's difference |
| One form stores or consumes another concept | `implementation_representation`, representation first and the loss/addition boundary |
| Genuine set inclusion with a counterexample | `broader_than` or `narrower_than`, explicit direction |
| Meaning overlaps across versions or systems | `near_equivalent`, declared symmetry and the divergence axis |
| One source records a dated label replacement | `renamed_to`, same source and verifiable event |
| The proposed comparison uses incompatible axes | `not_comparable`, the axis mismatch |
| Source, scope, or meaning cannot be established | No relation recorded; say what evidence is missing |

## Handoff Template

```yaml
question: # the consumer's actual terminology question
term_ids: # exact identifiers from conflict-cases.md
relation_types: # closed types actually relied on
scope: # the recorded comparison scope
answer: # locally written scoped conclusion
boundary: # where substitution breaks
sources_rechecked: # date and source locators, or unverified
unknowns: # missing evidence, or none within the recorded scope
consumer_reference: not_applicable
consumer_reference_reason: This blank terminology template selects no consumer record.
```

## Worked Handoff

Question: can a CSS custom property be called the same thing as an interchange token?

Term identifiers: `css.custom-property`, `dtcg.token`. Relation type: `implementation_representation`, from the CSS representation to the token concept, in scope `token-to-css-output`. Answer: a custom property can consume a translated token value, but the runtime slot does not carry the full interchange record and can also store other values. Sources rechecked: the direct CSSWG and DTCG 2025.10 locators in [Term Cases](conflict-cases.md), 2026-09-08. Consumer reference: `not_applicable`, because this is a terminology explanation with no selected consumer record.

This judgment does not prove any actual converter preserves aliases, types, or metadata.

## Reader Verification Tasks

| Task | Expected result | Failure signal |
| --- | --- | --- |
| Compare Figma and Carbon “Component” | Two source-specific records and `same_label_different_meaning` | One merged definition |
| Compare variable, token, and custom property | `partial_overlap` plus representation-first mapping | Equivalence or reversed representation direction |
| Compare the second DTCG draft with 2025.10 | Historical/current version scopes and no invented rename | Treating the draft as the current implementation contract |
| Compare “style guide” and “design system” without organizations | Insufficient context; request the two sources | Universal history or deprecation claim |

These are expected lookup outcomes. A maintainer records actual reader task results and participant identity separately before claiming findability or promotion evidence.

## Opinionated Guidance

Resolve ambiguity explicitly; a qualified answer is more useful than an unsupported winner. Retain historical records with their own scopes when a current reading changes.

## Platform-Specific Guidance

Direct source authority is limited to its named platform, system, tool, or specification. A platform terminology comparison does not establish a target's support for the named feature.

## Unsupported Absolutes

Do not infer equivalence from an absent relation, source popularity, or shared spelling. A passing record validator cannot determine whether a semantic judgment is persuasive.

## Verification Contract

Verify table consistency mechanically and meaning against both sources. Run the reader tasks for an actual findability claim. Re-review when either source revises its term or a reader encounters an unresolved ambiguity. Stable promotion still requires the complete [domain promotion contract](index.md#promotion-to-stable).

## Source, License, And Attribution

Locally authored workflow relying on the term identifiers and relation types declared above. Named sources were rechecked through the direct locators in Term Cases on 2026-09-08. No upstream definitional prose is reproduced.

## IA Navigation

Parent: [Design Terminology](index.md).
Next: [Cross-System Term Cases](conflict-cases.md).
