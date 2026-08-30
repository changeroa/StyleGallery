---
type: State Management Guide
title: State Management Planning Workflow
description: Workflow for classifying application state before choosing patterns or libraries.
domain: state-management
lifecycle: experimental
provenance_kind: local
---

# State Management Planning Workflow

Primary role: planning workflow.

## Repository Boundary

This workflow plans application runtime state. It does not select spatial Layout patterns, visual states, animations, backend storage models, or a mandatory framework.

## Reusable Method

1. Inventory the mutable facts required by the user task.
2. Remove values that can be derived from existing authority.
3. Name the authoritative owner for every remaining fact.
4. Declare each value's lifetime and reset boundary.
5. Name all readers, writers, and accepted events.
6. Describe legal transitions and invariants.
7. Separate pure derivation from asynchronous effects.
8. Declare persistence, synchronization, conflicts, and recovery.
9. Choose the smallest pattern stack and reject unnecessary global ownership.
10. Record the verification matrix and implementation handoff.

Implementation handoff:

```txt
Consumer reference: not_applicable
Consumer reference reason: This generic State Management planning workflow declares no consumer-specific reference record.
Primary user task:
State inventory:
Authoritative owners:
Lifetime and reset boundaries:
Readers, writers, and events:
Derived values:
Transitions and invariants:
Effects and cancellation:
Persistence and synchronization:
Conflict and recovery policy:
Pattern stack:
Rejected alternatives:
Verification plan:
```

## Opinionated Guidance

Choose storage after authority and lifetime are known. A globally reachable store is a transport mechanism, not proof that the store should own the value.

## Platform-Specific Guidance

Document platform lifecycle differences such as browser navigation, server rendering and hydration, native process suspension, multi-window behavior, or game-engine scene changes only when the consuming surface requires them.

## Unsupported Absolutes

Do not claim that all state belongs locally, globally, in the URL, or on the server. The correct owner depends on authority, lifetime, identity, and write paths.

## Verification Contract

Complete the [State Brief](state-brief.md), then run the smallest relevant cases from the [State Verification Matrix](verification-matrix.md). The handoff must name at least one failure or stale-result case when asynchronous work exists.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery method.
- No upstream source fields apply.

## IA Navigation

Parent: [State Management](../index.md).
Next: [State Management Decision Tree](decision-tree.md).
