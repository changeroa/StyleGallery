---
type: State Management Guide
title: State Verification Matrix
description: Failure-oriented verification cases for application-state contracts.
domain: state-management
lifecycle: experimental
provenance_kind: local
---

# State Verification Matrix

## Repository Boundary

This matrix verifies declared state contracts. It does not replace accessibility review, visual QA, backend correctness testing, or product-specific acceptance criteria.

## Reusable Method

Select only the dimensions relevant to the pattern or recipe:

| Dimension | Cases |
| --- | --- |
| Initialization | cold start, restored state, missing state, invalid persisted state |
| Lifetime | component remount, route change, reload, sign-out, account switch |
| Derivation | empty inputs, changed dependencies, removed entity, reordered collection |
| Async ordering | fast response, slow response, out-of-order response, cancellation, duplicate completion |
| Failure | request rejection, timeout, partial success, retry, permanent failure |
| Optimism | acknowledgement, rejection, rollback, server correction, repeated action |
| Synchronization | second tab or window, reconnect, remote update, conflicting writer |
| Identity | changed key, missing key, duplicate key, stale entity reference |
| Platform boundary | history navigation, hydration, suspension, resume, scene or document replacement when claimed |

Acceptance checks:

- One authoritative value is observable after every accepted event.
- Derived state never becomes an independently mutable copy.
- A stale asynchronous completion cannot overwrite a newer accepted result.
- Reset behavior matches the declared lifetime.
- Optimistic work either commits, rolls back, or reconciles by a named rule.
- Invalid persisted data fails closed or migrates through a declared path.
- Recovery leaves the user with an understandable next action when product UI is in scope.

## Independence Boundary

This matrix is an author-checkable contract audit. It can show that implementation behavior agrees with declared authority, lifetime, transition, and recovery rules, but it cannot independently establish product suitability, user outcomes, distributed-system correctness, or the truth of the rules themselves. Claims beyond contract conformance require an appropriate [shared quality gate and independent evidence family](../../quality/index.md).

## Opinionated Guidance

Prefer invariant and transition assertions over snapshots of an entire store. Test public events and observable outcomes before private implementation details.

## Platform-Specific Guidance

Run browser history and hydration cases only for browser consumers, multi-window cases only when supported, and suspension or scene lifecycle cases only for platforms that claim them.

## Unsupported Absolutes

Passing this matrix does not prove distributed consistency, full accessibility, product suitability, or correctness outside the declared state boundary.

## Verification Contract

Every pattern must select at least initialization, lifetime, and failure cases. Async patterns additionally select ordering; optimistic patterns select acknowledgement and rejection; persisted or multi-writer patterns select synchronization and conflict cases.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery verification method.
- No upstream source fields apply.

## IA Navigation

Parent: [State Management](../index.md).
Next: [State Management Catalog](../catalog.md).
