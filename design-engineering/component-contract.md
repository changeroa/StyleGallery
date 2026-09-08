---
type: Domain Guide
title: Component Contract
description: Define product component semantics, states, events, asynchronous ownership, and verification before visual treatment.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Component Contract

Primary role: product component implementation handoff.

## Repository Boundary

This contract describes consumer-owned behavior. It does not create a shared component library, new Layout primitive, or default visual values. Existing profile records have their own closed schema; this planning template cannot substitute for their evidence records.

## Reusable Method

Start with semantic HTML or the platform's native control. Name the public inputs, emitted events, internal state, and owner of persisted data. Then describe each transition and its observable outcome. Use the [Worked Examples](worked-examples.md) to check common failure paths.

## Contract Template

| Field | Required answer |
| --- | --- |
| Task | The user action and the outcome the component supports |
| Semantics | Element/control, accessible name, description, value, relationships |
| Inputs | Data and callbacks, required/optional values, identity and revision |
| Outputs | Events, payload meaning, when they are emitted, who commits the result |
| State | Initial, active, selected, disabled, pending, empty, error, completed as applicable |
| State ownership | Controlled inputs versus internal temporary state; reconciliation rule |
| Input and focus | Keyboard, pointer, touch, focus entry/return and unavailable actions |
| Async ownership | Request identity, duplicate action policy, stale result handling, cancellation |
| Content | Empty, long, localized, unbroken and unavailable data |
| Spatial composition | Layout source, parent constraints, scroll owner and overflow behavior |
| Presentation | Product-owned values, density, visual hierarchy and optional motion brief |
| Lifecycle | Creation, navigation, rerender, removal, event/listener cleanup |
| Evidence | Expected behavior, actual result, runtime, source revision and artifacts |
| Handoff | `consumer_reference` record or `not_applicable` with a reason |

## Worked Contract: Save Action

Task: persist the current editable document. The form owns the draft; the save operation owns a submitted snapshot; the server owns the persisted result. A success for snapshot A must not mark newer draft B as saved.

| Current state | Event | Next state | Required effect |
| --- | --- | --- | --- |
| Clean | Edit | Dirty | Keep entered values; mark unsaved changes |
| Dirty | Submit valid draft A | Saving A | Capture A and a request identity; acknowledge pending |
| Saving A | Submit again | Saving A | Apply the declared duplicate policy; this example ignores the duplicate |
| Saving A | Edit to B | Saving A with dirty B | Preserve B and distinguish it from submitted A |
| Saving A | Matching success | Clean if draft still A; otherwise dirty B | Record persisted A without discarding B |
| Saving A | Matching failure | Dirty current draft with error | Keep values and offer retry |
| Any | Stale response | Unchanged | Ignore responses outside the active operation |
| Any | Unmount/navigation | Disposed | Stop UI updates; cancellation does not imply the server rolled back |

Implementation sketch, independent of framework:

```text
on submit:
  if a request is active: return
  validate the current draft
  copy the draft into submittedSnapshot
  create requestIdentity
  start persistence(requestIdentity, submittedSnapshot)
on result(identity, result):
  if disposed or identity is not active: return
  clear the active request
  if successful: set persistedSnapshot to submittedSnapshot
  else: expose a recoverable error
  derive dirty state by comparing current draft with persistedSnapshot
```

A real application also defines revision conflicts, server normalization, and retry semantics. The sketch is not a distributed consistency protocol. Its handoff is `consumer_reference: not_applicable` because this fictional example selects no consumer profile or conformance record.

## Opinionated Guidance

Use state names that expose meaningful differences. Two booleans can accidentally permit “saved and failed”; a state transition table helps reveal impossible combinations. Do not merge input validity, request state, and persisted revision into one visual status.

## Platform-Specific Guidance

For web forms, preserve native label and form relationships. Validate custom semantics against the applicable [accessibility evidence gate](../quality/gates/accessibility-evidence.md). Framework scheduling, request abort behavior, and server idempotency require separate implementation evidence.

## Unsupported Absolutes

A state table does not prove accessibility, successful persistence, race freedom, or device coverage. Cancelling a client request does not prove its remote side effects stopped.

## Verification Contract

Resolve responses out of order, edit during saving, fail then retry, activate repeatedly, and remove the component before completion. Inspect both persisted and displayed values. Include keyboard-only operation, long content, and constrained parents. Record actual outcomes; the table above is an unexecuted reference contract. Review when a public input, event, or state meaning changes.

## Source, License, And Attribution

Locally authored contract and pseudocode; no framework or upstream implementation is copied. Shared quality gates own evidence admissibility.

## IA Navigation

Parent: [Design Engineering](index.md).
Next: [Design Engineering Worked Examples](worked-examples.md).
