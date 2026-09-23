# Design Engineering

The Design Engineering domain owns product-layer craft questions and verification methods without turning practitioner taste into shared policy.

## Scope Boundary

In scope: purpose, frequency, interaction detail, implementation review, prototyping, and evidence-bearing product decisions.

Out of scope: a second universal principle set, unsupported claims of beauty or adoption, and overrides of semantic, accessibility, Layout, or shared quality contracts.

## Start Here

| Task | Route |
| --- | --- |
| Route the uncertain product decision. | [Design Engineering Decision Tree](decision-tree.md) |
| Specify semantics, state, requests, and focus. | [Component Contract](component-contract.md) |
| Apply settings, search, and destructive-action contracts. | [Design Engineering Worked Examples](worked-examples.md) |

These workflows and worked cases are usable experimental guidance. Expected-result tables are test designs; actual product, engine, and reader evidence must be recorded separately. Review on a failed task, a source change, or a changed ownership contract.

## State Management

Choose [State Management](state-management/index.md) for UI state ownership, transitions, asynchronous consistency, and lifetime. The collection contains 12 patterns and four behavior recipes within this domain.

### Planning And Verification

- [State decision tree](state-management/decision-tree.md)
- [State brief](state-management/state-brief.md)
- [State verification matrix](state-management/verification.md)
- [State recipes and composition matrix](state-management/recipes/index.md)

### Ownership And Derivation

- [Single owner and controlled inputs](state-management/patterns/single-owner.md)
- [Derived state](state-management/patterns/derived-state.md)
- [Selection by stable identity](state-management/patterns/id-selection.md)

### Editing And Persistence

- [Draft and persisted baseline](state-management/patterns/draft-and-baseline.md)
- [Submitted snapshot](state-management/patterns/submitted-snapshot.md)
- [Unsaved navigation](state-management/patterns/unsaved-navigation.md)

### Asynchronous Consistency

- [Latest request wins](state-management/patterns/latest-request-wins.md)
- [Single flight](state-management/patterns/single-flight.md)
- [Optimistic overlay](state-management/patterns/optimistic-overlay.md)

### Navigation And Lifetime

- [URL state](state-management/patterns/url-state.md)
- [Identity reset](state-management/patterns/identity-reset.md)
- [Versioned restore](state-management/patterns/versioned-restore.md)

### Screen Compositions

- [Settings save](state-management/recipes/settings-save.md)
- [Search and detail](state-management/recipes/search-detail.md)
- [Multi-step form](state-management/recipes/multi-step-form.md)
- [Delete and supported undo](state-management/recipes/delete-undo.md)

## Documents

- [Interface Craft Decisions](interface-craft.md) connects product purpose, implementation detail, and verification without treating taste as proof.
- [Consumer Migration Readiness](consumer-migration-readiness.md) turns migration intent into a consumer-owned thirteen-dimension conformance record and executable evidence chain.
- [Reference Profiles](reference-profiles/index.md) provides two explicitly selected, related adversarial examples and a documentation-only external adaptation route.

## Relationship To Shared Quality

This domain proposes product-layer questions. [Quality Gates](../quality/index.md) remain the shared authority for claims, evidence families, accessibility precedence, rationale, and debt.

## Source-Backed Deep Dives

- [Native Interaction Contracts](native-interaction-contracts.md). Choose dialog, disclosure, menu, popover, and combobox behavior.
- [Text Input And Internationalization](text-input-and-internationalization.md). Preserve IME composition, text units, mixed direction, and editing intent.
- [Loading, Progress, And Feedback](loading-and-feedback.md). Separate pending work, accepted results, announcements, and responsiveness.

## Domain Contract

See [StyleGallery Domains](../DOMAINS.md) for lifecycle, provenance, page membership, and staleness rules.

## IA Navigation

Parent: [StyleGallery](../index.md).
Next: [Design Engineering Decision Tree](decision-tree.md).
