---
type: State Management Catalog
title: State Management Catalog
description: Manual lookup of experimental State Management patterns and recipes.
domain: state-management
lifecycle: experimental
provenance_kind: local
---

# State Management Catalog

Primary role: pattern and recipe lookup.

## Repository Boundary

This catalog indexes State Management guidance only. It does not extend Layout pattern CSS, prescribe a product architecture, or make a named state library canonical.

## Reusable Method

Choose the narrowest pattern that owns the actual state problem, then use a recipe only when several patterns must cooperate for one user flow.

## Patterns

| Pattern | Category | Primary problem |
| --- | --- | --- |
| [Local Draft State](patterns/ownership/local-draft-state.md) | Ownership | Keep incomplete user edits separate from the accepted baseline. |
| [URL-Owned State](patterns/ownership/url-owned-state.md) | Ownership | Make navigable state authoritative in the URL. |
| [Server-State Cache](patterns/ownership/server-state-cache.md) | Ownership | Represent a time-bounded local snapshot of server-owned data. |
| [Derived State](patterns/derivation/derived-state.md) | Derivation | Compute a value without creating a second mutable source of truth. |
| [Explicit Transition Model](patterns/transitions/explicit-transition-model.md) | Transitions | Restrict state changes to named events and legal transitions. |
| [Optimistic Mutation](patterns/synchronization/optimistic-mutation.md) | Synchronization | Expose a provisional result while preserving commit or rollback behavior. |

## Recipes

- [Search And Filter](recipes/search-and-filter.md)
- [Editable Form](recipes/editable-form.md)
- [Optimistic List](recipes/optimistic-list.md)

## Opinionated Guidance

Do not choose a pattern by matching a library API. Choose it by authority, lifetime, writers, transition risk, and recovery needs.

## Platform-Specific Guidance

Browser URL, history, storage, and lifecycle behavior must be labeled as browser-specific. Native, desktop, game-engine, and server-rendered consumers must document their corresponding platform boundary.

## Unsupported Absolutes

This catalog does not claim that global state is always harmful, that state machines are always necessary, or that server-state tools replace application-state design.

## Verification Contract

Every linked pattern must declare authority, lifetime, mutation path, failure behavior, and a verification route. Every recipe must identify its essential patterns and rejected alternatives.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery synthesis.
- No external prose, code, or examples were adapted for this page.

## IA Navigation

Parent: [State Management](index.md).
Next: [State Management Patterns](patterns/index.md).
