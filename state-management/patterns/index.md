# State Management Patterns

## Repository Boundary

These patterns describe application runtime-state responsibilities. They do not own Layout CSS, visual component states, backend schemas, product business rules, or library-specific APIs.

## Reusable Method

Choose one pattern for each primary state problem and compose patterns only when authority, derivation, transitions, or synchronization are genuinely separate responsibilities.

Ownership:

- [Local Draft State](ownership/local-draft-state.md)
- [URL-Owned State](ownership/url-owned-state.md)
- [Server-State Cache](ownership/server-state-cache.md)

Derivation:

- [Derived State](derivation/derived-state.md)

Transitions:

- [Explicit Transition Model](transitions/explicit-transition-model.md)

Synchronization:

- [Optimistic Mutation](synchronization/optimistic-mutation.md)

## Opinionated Guidance

A pattern should solve one primary state problem. Do not turn a product's complete store shape into a reusable pattern.

## Platform-Specific Guidance

Platform storage, navigation, process, window, and lifecycle behavior must be declared by the consuming implementation.

## Unsupported Absolutes

No pattern is a universal architecture or a requirement to install a particular dependency.

## Verification Contract

Each pattern names authority, lifetime, readers, writers, transitions, failure behavior, and the relevant cases from the [State Verification Matrix](../guides/verification-matrix.md).

## Source, License, And Attribution

- Provenance: locally authored StyleGallery pattern index.
- No upstream source fields apply.

## IA Navigation

Parent: [State Management](../index.md).
Next: [Local Draft State](ownership/local-draft-state.md).
