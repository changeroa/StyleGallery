---
type: State Management Guide
title: State Brief
description: Requirements template for state ownership, lifetime, transitions, effects, and recovery.
domain: state-management
lifecycle: experimental
provenance_kind: local
---

# State Brief

## Repository Boundary

This brief records state responsibilities before implementation. It does not authorize product styling, Layout changes, backend data models, or consumer-reference defaults.

## Reusable Method

```txt
Primary user task:
Mutable facts:
Authoritative owner for each fact:
Why each stored value cannot be derived:
Identity and keying:
Lifetime:
Reset boundary:
Readers:
Writers:
Accepted events:
Legal transitions:
Invariants:
Asynchronous effects:
Cancellation and stale-result rule:
Persistence:
Synchronization peers:
Ordering and conflict policy:
Failure and recovery:
Sensitive values excluded from URL or persistence:
Selected patterns:
Rejected patterns and reasons:
Verification cases:
Consumer reference: not_applicable
Consumer reference reason: This blank State Brief declares no consumer-specific reference record.
```

Minimum required fields:

- Pure local interaction: owner, lifetime, reset, writers, derived values, verification.
- Remote read: server authority, cache identity, freshness, cancellation, failure, verification.
- Remote write: transition, idempotency assumption, acknowledgement, conflict, rollback or reconciliation.
- Persistent or multi-writer state: serialization boundary, versioning, conflict policy, recovery, sensitive-value review.

## Opinionated Guidance

Treat blank ownership, lifetime, and recovery fields as unresolved design work rather than filling them with a library name.

## Platform-Specific Guidance

When URL, local storage, native preferences, files, or engine scenes participate, record their platform lifecycle and security limitations explicitly.

## Unsupported Absolutes

This brief does not require every application to use reducers, state machines, normalized stores, persistence, or optimistic updates.

## Verification Contract

Each stored value must have one named authority and reset boundary. Each asynchronous writer must have a stale-result or ordering rule. Each optimistic path must declare both commit and recovery behavior.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery template.
- No upstream source fields apply.

## IA Navigation

Parent: [State Management](../index.md).
Next: [State Verification Matrix](verification-matrix.md).
