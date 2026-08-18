# Design Terminology

Design Terminology owns the decision surface that binds design terms to their named sources, classifies them by source kind and concept family, and judges typed semantic relations and conflicts between them.

## Scope Boundary

In scope: source-kind classification for named vocabulary sources, concept-family classification for design terms, a typed relation model between terms from different sources, source-bounded vocabulary inventories with freshness fields, and cross-system conflict cases.

Out of scope: StyleGallery's own canonical naming, actual UI behavior or implementation methods, accessibility rules, platform-specific interaction adaptation, universal prescriptions about which term is generally better, and authority over any external vocabulary.

This domain decides: which source a term belongs to, what kind of source that is, which concept family the term serves, and what typed relation holds between two terms with its boundary. It does not decide what StyleGallery calls things internally, whether an implementation is correct, or which external definition wins.

## Evidence And Research Boundary

V0.1 is a Markdown-only browsing and verification stage. Term records and typed relations are authored and reviewed as Markdown tables in [Cross-System Term Cases](conflict-cases.md); a machine-readable term, concept, source, and relation registry is a prerequisite for promotion beyond `experimental`. Material v2 currently exposes these pages through document search only; it does not answer structured crosswalk queries.

Representative questions this domain answers: are Figma's variable, the DTCG design token, and the CSS custom property the same thing; is a component a pattern; is a style guide the same as a design system; which of two clashing labels came from which source.

## Promotion To Stable

Promotion beyond `experimental` requires all of the following, each pass/fail checkable:

- A named review owner, secondary reviewer, freshness owner, and dispute resolver are recorded.
- A machine-readable registry with schema exists for terms, concepts, sources, and relations.
- A relation invariant validator derived from the forbidden error states in [Design Term Relations](relation-types.md) passes.
- Every term carries a direct source locator.
- Every relation names both sources and a non-trivial boundary.
- At least three representative user tasks are verified: judging same-label different-meaning, judging a cross-system relation, and separating a historical term from a current one.
- Representative findability queries return a target document or record.
- Unresolved semantic disputes: zero.
- Stale sources beyond their re-review trigger: zero.
- Usage evidence from at least one real human or agent consumer exists.

## Content Review Contract

Before any merge or promotion, a full semantic review covers every term and relation (not a sample) against this checklist:

- Is the source kind correct for each cited source?
- Does each term description match what its source actually supports?
- Is each relation type appropriate for its pair?
- Is each relation boundary sufficient?
- Are both terms compared at the same abstraction level?
- Is official-source authority overstated anywhere?
- Is each historical/current status correct?

The review result is recorded as: terms reviewed, relations reviewed, counts of accepted, revised, and unresolved items, reviewer name, and review date. Author self-audit alone does not satisfy this contract.

## Available Guides

- [Design Source Kinds](source-kinds.md) classifies what kind of thing a vocabulary source is before its terms are read.
- [Design Source Vocabularies](source-vocabularies.md) inventories named sources with kind, version boundary, status, and review date.
- [Design Concept Families](concept-families.md) classifies design terms by the decision each term serves.
- [Design Term Relations](relation-types.md) defines the typed relation model and the term record shape.
- [Cross-System Term Cases](conflict-cases.md) applies typed relations to recorded term records and conflict scenarios.

## Domain Contract

[Vocabulary](../guides/vocabulary.md) owns StyleGallery's canonical internal word set; Design Terminology compares the meanings and relations of terms used by external named sources. Platform Guides compares platform interaction conventions, not terminology; Motion owns motion terminology. Naming rationale: topology suggests a relation graph this domain does not yet provide; terminology is the accurate name for comparing definitions, usage scope, and conflicts. Scope decision: [Design Terminology Domain Scope Decision](../quality/claim-records/design-terminology-domain-scope.md).

## IA Navigation

Parent: [StyleGallery](../index.md).
Next: [Design Source Kinds](source-kinds.md).
