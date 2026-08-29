---
type: State Management Pattern
title: Server-State Cache
description: Represent a keyed, time-bounded local snapshot of server-owned data.
domain: state-management
lifecycle: experimental
provenance_kind: local
category: ownership
primary_state_problem: remote authority must be read locally without pretending the snapshot is canonical
---

# Server-State Cache

## Repository Boundary

This pattern describes client-side ownership of a remote snapshot. It does not define the remote database, API protocol, authorization model, cache library, or backend consistency guarantee.

## Reusable Method

- Authority: the named remote system remains canonical.
- Local owner: a cache entry keyed by normalized resource identity and request inputs.
- Lifetime: defined by active readers, freshness policy, invalidation, eviction, or session boundary.
- Readers: consumers of data, freshness, error, and in-flight metadata.
- Writers: fetch completion, invalidation, mutation acknowledgement, reconciliation, and eviction.
- Ordering: stale completions cannot replace a newer accepted version for the same key.
- Failure: retain, clear, or mark stale data by a declared policy instead of conflating absence with failure.

## Opinionated Guidance

Store remote snapshots and their lifecycle metadata together. Do not copy the same entity into unrelated feature stores unless the synchronization cost and authority rule are explicit.

## Platform-Specific Guidance

Server rendering, hydration, background refresh, offline behavior, process suspension, and platform cache limits require separate declarations.

## Unsupported Absolutes

A cache does not make stale data correct, and a server-state library does not eliminate the need to define identity, freshness, invalidation, and conflict behavior.

## Verification Contract

Verify cache miss, hit, stale hit, refresh, request failure, retry, cancellation, out-of-order completion, key change, invalidation, eviction, and any claimed hydration path.

## Composition Notes

Compose with [Derived State](../derivation/derived-state.md) for projections and with [Optimistic Mutation](../synchronization/optimistic-mutation.md) for provisional writes.

## Anti-patterns

- Treating a cached response as permanent local authority.
- Keying entries by incomplete request identity.
- Allowing an earlier request to overwrite a newer result.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery pattern.
- No upstream source fields apply.

## IA Navigation

Parent: [State Management Patterns](../index.md).
Next: [Derived State](../derivation/derived-state.md).
