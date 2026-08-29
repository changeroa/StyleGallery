---
type: State Management Pattern
title: Optimistic Mutation
description: Expose a provisional result while preserving acknowledgement, reconciliation, and rollback.
domain: state-management
lifecycle: experimental
provenance_kind: local
category: synchronization
primary_state_problem: a remote write should feel immediate without hiding its provisional status or recovery path
---

# Optimistic Mutation

## Repository Boundary

This pattern owns the client-side provisional overlay and its resolution. It does not guarantee server acceptance, distributed consistency, idempotency, authorization, or product suitability for optimistic behavior.

## Reusable Method

- Authority: the remote system remains canonical after acknowledgement.
- Provisional state: a mutation record identifies the intended change, affected cache key, base version, and client operation identity.
- Apply: expose a deterministic provisional projection.
- Commit: reconcile the acknowledgement and authoritative response.
- Reject: roll back or refetch by a named policy.
- Conflict: preserve enough identity and baseline information to avoid reverting unrelated later changes.
- Retry: define whether the operation is safe to repeat and how duplicates are recognized.

## Opinionated Guidance

Use optimism only when rejection is recoverable and the user can understand provisional or failed status. Prefer pending confirmation when failure would be costly, destructive, or difficult to reverse.

## Platform-Specific Guidance

Offline queues, background synchronization, process termination, and multi-tab coordination require platform-specific storage and delivery guarantees beyond this pattern.

## Unsupported Absolutes

Optimistic updates are not inherently faster, safer, or better. They trade perceived latency for reconciliation complexity and recovery obligations.

## Verification Contract

Verify immediate apply, acknowledgement, rejection, rollback, authoritative correction, duplicate action, out-of-order acknowledgements, subsequent local edits, refetch, offline interruption when claimed, and operation retry.

## Composition Notes

Compose with [Server-State Cache](../ownership/server-state-cache.md) and usually [Explicit Transition Model](../transitions/explicit-transition-model.md). Use [Optimistic List](../../recipes/optimistic-list.md) for collection behavior.

## Anti-patterns

- Overwriting the whole cache from a stale rollback snapshot.
- Hiding rejection without restoring or reconciling user intent.
- Retrying a non-idempotent operation without an operation identity.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery pattern.
- No upstream source fields apply.

## IA Navigation

Parent: [State Management Patterns](../index.md).
Next: [State Management Recipes](../../recipes/index.md).
