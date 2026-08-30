---
type: State Management Matrix
title: State Pattern To Recipe Matrix
description: Matrix of pattern roles and substitution risk across State Management recipes.
domain: state-management
lifecycle: experimental
provenance_kind: local
---

# State Pattern To Recipe Matrix

## Repository Boundary

This matrix describes State Management composition roles. It does not claim runtime adoption, performance, accessibility, or library compatibility.

## Reusable Method

Legend:

- `E` = essential: replacing it changes the recipe's authority or transition model.
- `H` = helper: supports a local subproblem without defining the recipe.
- `S` = substitutable: a documented alternative can fill the same responsibility.
- `-` = not part of the recommended stack.

| Recipe | Local draft | URL owned | Server cache | Derived state | Explicit transitions | Optimistic mutation |
| --- | --- | --- | --- | --- | --- | --- |
| [Search And Filter](search-and-filter.md) | S | E | E | H | - | - |
| [Editable Form](editable-form.md) | E | - | S | H | E | - |
| [Optimistic List](optimistic-list.md) | - | - | E | H | H | E |

Substitution risks:

| Recipe | Primary risk |
| --- | --- |
| Search And Filter | Replacing URL ownership with an untracked local mirror breaks reload, history, and shareability. |
| Editable Form | Removing the draft/baseline split can mutate accepted data before commit; removing explicit transitions can admit duplicate or stale completion. |
| Optimistic List | Removing operation identity or reconciliation can roll back unrelated later work or leave the cache divergent. |

## Opinionated Guidance

An essential slot can still be replaced, but only by another mechanism that preserves the same authority, lifetime, transition, and recovery contract.

## Platform-Specific Guidance

The URL slot is browser-oriented. Other navigation systems may substitute a document or navigation owner if the same reconstruction and history responsibilities are preserved.

## Unsupported Absolutes

Matrix membership does not prove a pattern is required in every product flow with the same label.

## Verification Contract

When substituting a pattern, rerun the recipe's initialization, lifetime, async ordering, and failure cases and document which invariant remains equivalent.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery composition matrix.
- No upstream source fields apply.

## IA Navigation

Parent: [State Management Recipes](index.md).
Next: [Search And Filter](search-and-filter.md).
