# State Management

The State Management domain owns framework-neutral guidance for deciding where application runtime state lives, how it changes, how copies coordinate, and how those decisions are verified.

## Scope Boundary

In scope: application-state classification, source-of-truth ownership, lifetime and reset boundaries, stored-versus-derived decisions, logical transitions, asynchronous effects, persistence, synchronization, conflict handling, recovery, and verification.

Out of scope: spatial layout, animation, visual component-state treatment, backend database consistency, API design, product-specific business rules, and claims that one state library is universally correct.

## Use This Domain When

Application developers and architecture reviewers use this domain to plan or review one runtime-state boundary. Documentation contributors use it to decide whether a recurring state responsibility deserves a pattern or a recipe.

- A pattern owns one reusable state problem, such as draft ownership, derivation, or optimistic reconciliation.
- A recipe assigns several patterns distinct roles in one user flow.
- A state plan is ready for implementation handoff when the [State Brief](guides/state-brief.md) names every mutable fact's authority, lifetime, writers, transition or synchronization needs, recovery behavior, rejected alternatives, and verification cases.

## Routes

- Start with the [State Management Planning Workflow](guides/planning-workflow.md) when the state problem is not yet clear.
- Use the [State Management Decision Tree](guides/decision-tree.md) to classify authority, lifetime, writers, and synchronization needs.
- Fill the [State Brief](guides/state-brief.md) before selecting a pattern stack.
- Browse the [State Management Catalog](catalog.md) when the state problem or pattern name is known.
- Browse [State Management Patterns](patterns/index.md) for reusable decision contracts.
- Compose common application flows with [State Management Recipes](recipes/index.md).
- Inspect pattern coverage in the [Pattern To Recipe Matrix](recipes/pattern-to-recipe-matrix.md).
- Verify failure and recovery behavior with the [State Verification Matrix](guides/verification-matrix.md).

## Documents

Planning and verification:

- [State Management Planning Workflow](guides/planning-workflow.md)
- [State Management Decision Tree](guides/decision-tree.md)
- [State Brief](guides/state-brief.md)
- [State Verification Matrix](guides/verification-matrix.md)
- [State Management Catalog](catalog.md)

Patterns:

- [State Management Patterns](patterns/index.md)
- [Local Draft State](patterns/ownership/local-draft-state.md)
- [URL-Owned State](patterns/ownership/url-owned-state.md)
- [Server-State Cache](patterns/ownership/server-state-cache.md)
- [Derived State](patterns/derivation/derived-state.md)
- [Explicit Transition Model](patterns/transitions/explicit-transition-model.md)
- [Optimistic Mutation](patterns/synchronization/optimistic-mutation.md)

Recipes:

- [State Management Recipes](recipes/index.md)
- [Pattern To Recipe Matrix](recipes/pattern-to-recipe-matrix.md)
- [Search And Filter](recipes/search-and-filter.md)
- [Editable Form](recipes/editable-form.md)
- [Optimistic List](recipes/optimistic-list.md)

## State Management Principles

1. Name one authoritative owner for each mutable fact.
2. Derive values when they can be computed reliably from existing authority.
3. Make lifetime and reset boundaries explicit before choosing storage.
4. Describe legal events and transitions instead of scattering unrelated setters.
5. Keep asynchronous effects outside pure state derivation and define cancellation or stale-result behavior.
6. Treat persistence and synchronization as separate responsibilities from in-memory ownership.
7. Define conflict, rollback, and recovery behavior before optimistic or multi-writer updates.
8. Keep canonical guidance framework-neutral; library-specific examples remain bounded derivatives.

## Pattern Contract

Each State Management pattern names:

```txt
Pattern name
Category
Primary state problem
When to use
State owner and source of truth
Readers, writers, and accepted events
Lifetime and reset boundary
Stored versus derived values
Allowed transitions and invariants
Asynchronous effects and cancellation
Persistence and synchronization
Conflict, failure, and recovery behavior
Framework-neutral example
Verification contract
Composition notes
Anti-patterns
```

## Domain Relationships

- Layout owns spatial structure produced from state.
- Motion owns animation used to communicate a state change.
- Design Engineering owns product-level visual and interaction-state decisions.
- Game UI owns engine-specific interface architecture; it may apply these state contracts without making them engine-universal.
- Consumer Reference remains shared non-domain infrastructure and does not own application state behavior.

## Domain Contract

See [StyleGallery Domains](../DOMAINS.md) for lifecycle, page membership, provenance, and review ownership.

## IA Navigation

Parent: [StyleGallery](../index.md).
Next: [State Management Planning Workflow](guides/planning-workflow.md).
