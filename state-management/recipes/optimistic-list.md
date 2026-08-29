---
type: State Management Recipe
title: Optimistic List State
description: Compose server-owned collection data with provisional mutations and safe reconciliation.
domain: state-management
lifecycle: experimental
provenance_kind: local
---

# Optimistic List State

## Repository Boundary

This recipe owns provisional client collection behavior. It does not guarantee backend idempotency, distributed ordering, authorization, destructive-action safety, or list Layout.

## Reusable Method

Recommended pattern stack:

- Essential: [Server-State Cache](../patterns/ownership/server-state-cache.md) for the authoritative collection snapshot.
- Essential: [Optimistic Mutation](../patterns/synchronization/optimistic-mutation.md) for provisional add, edit, remove, or reorder operations.
- Helper: [Explicit Transition Model](../patterns/transitions/explicit-transition-model.md) for operation lifecycle and retry.
- Helper: [Derived State](../patterns/derivation/derived-state.md) for the visible collection projected from snapshot plus pending operations.

Authority map:

```txt
accepted collection -> server-state cache
pending user intent -> operation ledger
visible collection -> derived projection
acknowledgement or rejection -> reconciliation event
```

## Opinionated Guidance

Project pending operations over the latest accepted snapshot instead of overwriting the whole cache with an old rollback copy. Give each operation identity sufficient to match acknowledgement, retry, and conflict behavior.

## Platform-Specific Guidance

Offline queues, background sync, process termination, and multiple tabs require stronger durability and coordination than an in-memory optimistic overlay.

## Unsupported Absolutes

Optimism is not suitable for every destructive, financial, permissioned, or irreversible action. Product risk can require explicit pending confirmation.

## Verification Contract

Verify provisional add/edit/remove, acknowledgement, rejection, authoritative correction, out-of-order acknowledgement, duplicate action, refetch during pending work, subsequent edits to the same entity, list reorder, and retry behavior.

Rejected alternatives:

- Whole-cache snapshot rollback: rejected because it can erase unrelated accepted or later changes.
- Silent failure: rejected because provisional intent needs a visible recovery path when product UI is in scope.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery recipe.
- No upstream source fields apply.

## IA Navigation

Parent: [State Management Recipes](index.md).
Next: [State Verification Matrix](../guides/verification-matrix.md).
