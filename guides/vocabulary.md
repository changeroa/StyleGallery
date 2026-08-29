---
type: Planning Guide
title: Controlled Vocabulary
description: Canonical terminology, aliases, deprecated terms, and scannability rules for StyleGallery.
---

# Controlled Vocabulary

Use this page when a term affects routing, metadata, search, claim records, workflow handoff, or review decisions. Prefer the canonical term in headings, frontmatter, validator output, and route labels. Use aliases only when explaining reader-facing alternatives.

Primary role: vocabulary and scannability contract.

## Canonical Terms

- Canonical: `domain`
  - Concept: top-level knowledge ownership
  - Definition: A governed StyleGallery decision surface with a named scope, exclusions, lifecycle, source-of-truth, validator, and review owner.
  - Use for: Layout, Motion, Design Engineering, Game UI, Platform Guides, State Management, root routing, and `domain` frontmatter on governed leaves.
- Canonical: `category`
  - Concept: domain-local browse placement
  - Definition: A canonical grouping inside one domain; it cannot change the owning domain or its evidence boundary.
  - Use for: Layout pattern families and future domain-local indexes after a governed need is established.
- Canonical: `pattern`
  - Concept: reusable domain primitive
  - Definition: A bounded contract that solves one primary problem inside its owning domain.
  - Use for: Layout files under `patterns/`, State Management files under `state-management/patterns/`, domain-local catalogs, pattern stacks, and primitive references.
- Canonical: `recipe`
  - Concept: domain-local composition
  - Definition: A common use-case composition that assigns named responsibilities to a pattern stack.
  - Use for: Layout screen compositions under `recipes/`, State Management flow compositions under `state-management/recipes/`, planning flow, and pattern-to-recipe dependency records.
- Canonical: `state owner`
  - Concept: mutable-fact authority
  - Definition: The one declared authority that accepts writes and determines the current value for a mutable fact within a named boundary.
  - Use for: State briefs, State Management patterns, recipes, and implementation handoffs.
- Canonical: `state lifetime`
  - Concept: validity interval
  - Definition: The interval and boundary across which a state value remains valid before reset, eviction, replacement, or migration.
  - Use for: Component, feature, navigation, session, persistence, and remote-cache decisions.
- Canonical: `derived state`
  - Concept: computed projection
  - Definition: A value computed from authoritative inputs without an independent writer.
  - Use for: Selectors, projections, totals, filtering, eligibility, and dirty-state computation.
- Canonical: `logical transition`
  - Concept: accepted state change
  - Definition: A named event and rule that maps an accepted current state to a next state while preserving declared invariants.
  - Use for: State Management transition contracts; use Motion terminology for the animation that communicates the result.
- Canonical: `gate`
  - Concept: quality decision contract
  - Definition: A named quality contract that decides whether a claim is admissible and which evidence can support it.
  - Use for: Files under `quality/gates/` and review decisions.
- Canonical: `claim`
  - Concept: review assertion
  - Definition: A statement about layout, design, accessibility, evidence, rationale, or harmony that needs a warrant and boundary.
  - Use for: Quality records, design rationale, and implementation handoff.
- Canonical: `evidence family`
  - Concept: evidence class
  - Definition: A class of support for a claim, such as mechanical, rendered, accessibility, interpretive, empirical, source, or debt evidence.
  - Use for: Gate records and evidence index entries.
- Canonical: `scroll ownership`
  - Concept: scroll responsibility
  - Definition: The named element or region that owns scrolling, fixed behavior, sticky behavior, and height determination.
  - Use for: Pattern frontmatter, layout briefs, recipes, and handoffs.
- Canonical: `harmony`
  - Concept: content layout fit
  - Definition: The fit between content hierarchy, spatial rhythm, visual weight, constraints, accessibility precedence, and pattern boundaries.
  - Use for: Webpage generation workflow and the harmony evaluation gate.
- Canonical: `debt`
  - Concept: accepted unresolved risk
  - Definition: A known limitation that is accepted with a boundary, owner, and verification or follow-up path.
  - Use for: Evidence records, implementation handoff, and quality-gate decisions.
- Canonical: `consumer reference`
  - Concept: optional consumer record handoff
  - Definition: A required handoff field that either declares one repository-local JSON record or gives a sentence reason for non-applicability.
  - Use for: Consumer-owned visual or component guidance without moving values into Layout.
- Canonical: `maturity`
  - Concept: consumer reference lifecycle
  - Definition: The lifecycle state of a consumer reference item: experimental, stable, or deprecated.
  - Use for: Lifecycle and support decisions; never as a synonym for artifact mode.
- Canonical: `artifact mode`
  - Concept: consumer reference storage role
  - Definition: How a consumer reference artifact is held, independently of its maturity.
  - Use for: Schema-only, consumer-local, governed-local, or external-consumer records.
- Canonical: `warrant`
  - Concept: claim reasoning
  - Definition: The reason an evidence family can support a claim in a specific context.
  - Use for: Quality gates and design rationale.
- Canonical: `boundary`
  - Concept: claim limitation
  - Definition: The explicit limit of what a page, pattern, gate, source, image, test, or screenshot proves.
  - Use for: Gate records, evidence pages, and implementation handoff.

## Aliases

- Alias: `area` -> `domain`
  - Use only in reader-facing explanation; policy and metadata use `domain`.
- Alias: `section` -> `category`
  - Use only for document structure or explanatory prose, not canonical placement metadata.
- Alias: `primitive` -> `pattern`
  - Use `primitive` only when contrasting individual domain patterns with recipes.
- Alias: `layout primitive` -> `pattern`
  - Use in explanatory prose only; canonical records should use `pattern`.
- Alias: `screen recipe` -> `recipe`
  - Use when a reader might confuse recipes with CSS snippets.
- Alias: `quality gate` -> `gate`
  - Use in navigation labels; canonical records may use `gate`.
- Alias: `visual reference` -> `GPT Image reference`
  - Use `GPT Image reference` when the generated-image workflow is specifically involved.

## Deprecated Terms

- Deprecated: `component` -> `pattern`
  - Reason: In Layout and State Management, component implies visual or framework ownership; the domains own portable problem contracts.
- Deprecated: `template` -> `recipe`
  - Reason: Template implies copy-paste completeness; recipes are starting compositions.
- Deprecated: `proof` -> `evidence`
  - Reason: Proof overstates what screenshots, tests, generated images, or sources can establish unless the gate names the boundary.
- Deprecated: `style guide` -> `controlled vocabulary`
  - Reason: The vocabulary stabilizes decision language; it does not define brand voice.
- Deprecated: `library` -> `domain`
  - Reason: Library does not name ownership, exclusions, lifecycle, or review responsibility.

## Local-Only Terms

- Local-only: `OKF`
  - Meaning: The repository's knowledge-bundle structure.
  - Boundary: Use only for bundle maps, indexes, and repository organization.
- Local-only: `pattern stack`
  - Meaning: The ordered set of patterns selected for a screen or section.
  - Boundary: Do not use it as a synonym for final product styling.
- Local-only: `section job`
  - Meaning: A content block's role in a webpage decision path, such as hook, explain, prove, compare, convert, navigate, or retain.
  - Boundary: Use in webpage generation, not in every pattern file.
- Local-only: `consumer component`
  - Meaning: A component owned by an opted-in consuming product or Design Engineering reference.
  - Boundary: Never use it to rename a Layout pattern or move component authority into shared infrastructure.

## Scannability Checklist

- Use headings for decision boundaries, not decorative grouping.
- Keep lists short enough to scan; split a long list by task or concept when it carries more than one decision.
- Put the canonical term first, then aliases or boundaries.
- Prefer descriptive link text that names the destination decision, not generic text such as "here" or "more."
- Keep each paragraph to one idea when it explains policy or routing.
- Use tables only when comparison across columns is the reader's task; use lists for simple sequences.
- Put boundaries near the claim they limit so a reader does not have to infer them from another page.

## Vale Proposal

Prose linting should wait until the vocabulary is stable.

When the terms above stop changing, add Vale as a proposal first:

- Add accepted terms to a Vale vocabulary `accept.txt`.
- Add deprecated terms to `reject.txt` only after each replacement is documented here.
- Start with report-only checks for `Vale.Terms` and `Vale.Avoid`.
- Promote lint failures only after README, GUIDE, recipes, gates, and pattern frontmatter are aligned.

## Source Notes

- [Google paragraph structure guidance](https://developers.google.com/style/paragraph-structure) supports short, single-idea paragraphs for scannability.
- [Google cross-reference guidance](https://developers.google.com/style/cross-references) supports descriptive link text.
- [Microsoft scannable content guidance](https://learn.microsoft.com/en-us/style-guide/scannable-content/) supports headings, lists, sidebars, and tables as scan aids.
- [Microsoft headings guidance](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings) treats headings as structure and scan entry points.
- [Vale vocabulary guidance](https://vale.sh/docs/keys/vocab) distinguishes accepted and rejected vocabulary terms.
