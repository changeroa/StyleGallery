---
type: State Management Pattern
title: Explicit Transition Model
description: Restrict state changes to named events, legal transitions, and declared effects.
domain: state-management
lifecycle: experimental
provenance_kind: local
category: transitions
primary_state_problem: scattered writes permit contradictory or illegal state combinations
---

# Explicit Transition Model

## Repository Boundary

This pattern owns logical application-state transitions. Motion owns animation between rendered states, and product domains own the business rules that determine which transitions are allowed.

## Reusable Method

- State: the minimum facts needed to distinguish meaningful modes.
- Events: named occurrences accepted by the owner.
- Transition: a pure mapping from current state and accepted event to next state or rejection.
- Invariants: combinations that must always hold.
- Effects: commands emitted after a transition, with completion represented as later events.
- Recovery: explicit events for retry, cancel, rollback, timeout, or reset.

Example trace:

```txt
idle --submit--> submitting
submitting --resolved--> accepted
submitting --rejected--> editable-with-error
submitting --cancel--> editable
```

## Opinionated Guidance

Use explicit transitions when booleans can contradict each other, when an event is legal only in some modes, or when async completion must be tied to the request that produced it.

## Platform-Specific Guidance

Reducer, actor, statechart, message-loop, and engine update implementations may encode this method differently. The documented events and invariants remain the portable contract.

## Unsupported Absolutes

Not every toggle needs a formal machine. Use the smallest representation that makes illegal combinations and recovery paths visible.

## Verification Contract

Verify every accepted transition, rejection of illegal events, invariant preservation, effect emission, duplicate completion, stale completion, cancellation, and reset.

## Composition Notes

Compose with [Local Draft State](../ownership/local-draft-state.md) for form workflows and [Optimistic Mutation](../synchronization/optimistic-mutation.md) for provisional remote writes.

## Anti-patterns

- Independent booleans such as `loading`, `success`, and `error` that can all be true.
- Effects that mutate state without returning through a named event.
- Completion events that cannot be associated with the request or version they complete.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery pattern.
- No upstream source fields apply.

## IA Navigation

Parent: [State Management Patterns](../index.md).
Next: [Optimistic Mutation](../synchronization/optimistic-mutation.md).
