# State Management Recipes

## Repository Boundary

Recipes combine state patterns for a user flow. They do not prescribe screen Layout, visual treatment, backend architecture, or a framework package stack.

## Reusable Method

Start with the closest authority and transition model, replace any pattern that does not fit the real lifetime or failure contract, and record rejected alternatives.

- [Search And Filter](search-and-filter.md) combines local input, URL authority, server-owned results, and derived projections.
- [Editable Form](editable-form.md) combines an accepted baseline, local draft, explicit submit transitions, and recovery.
- [Optimistic List](optimistic-list.md) combines a server-state cache, provisional mutations, reconciliation, and derived ordering.
- [Pattern To Recipe Matrix](pattern-to-recipe-matrix.md) records essential, helper, and substitutable roles.

## Opinionated Guidance

Recipes are starting points. Preserve the problem contract and replace patterns instead of copying a whole store shape blindly.

## Platform-Specific Guidance

Navigation, persistence, offline delivery, hydration, suspension, and multi-window behavior remain consuming-platform decisions.

## Unsupported Absolutes

These recipes do not establish universal cache, form, optimistic, or synchronization architecture.

## Verification Contract

Each recipe must name its authorities, pattern roles, write paths, failure and recovery behavior, rejected alternatives, and relevant verification dimensions.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery recipe index.
- No upstream source fields apply.

## IA Navigation

Parent: [State Management](../index.md).
Next: [Pattern To Recipe Matrix](pattern-to-recipe-matrix.md).
