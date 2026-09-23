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

For reusable ownership and transition mechanisms, use the [State Management catalog](state-management/index.md). The [submitted snapshot pattern](state-management/patterns/submitted-snapshot.md) provides an executable model of the save contract below.

## Contract Template

| Field | Required answer |
| --- | --- |
| Task | The user action and the outcome the component supports |
| Semantics | Element/control, accessible name, description, value, relationships |
| Inputs | Data and callbacks, required/optional values, identity and revision |
| Outputs | Events, payload meaning, when they are emitted, who commits the result |
| State | Initial, active, selected, disabled, pending, empty, error, completed as applicable |
| State ownership | Controlled inputs versus internal temporary state; reconciliation rule |
| Input and focus | Keyboard, pointer, touch, focus entry/return and unavailable actions; for any drag operation, the separate single-pointer and keyboard alternatives |
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

## Drag Operations Need Two Alternatives

When a component commits a value through dragging (reorder, slider thumb, resize handle, board column move), answer the Input and focus field once per input path:

| Path | Required answer |
| --- | --- |
| Drag | What previews, what release commits, what cancellation restores |
| Single pointer without dragging | Which click or tap controls reach the same committed value, and where they are visible without hover |
| Keyboard | Which keys reach the same committed value, and where focus rests afterwards |

[WCAG 2.2 Success Criterion 2.5.7](https://www.w3.org/TR/WCAG22/#dragging-movements) (Level AA) is the named source for the second row. Its Understanding document evaluates it independently from keyboard operation, so a keyboard handler does not answer it and pointer-only buttons do not answer the keyboard row. The criterion excepts dragging that is essential and functionality the user agent determines without author modification; a custom slider, sortable list, or pan surface owns all three rows. A swipe or flick is not an acceptable second row because it is still a path-based gesture. All paths emit the same output event with the same payload meaning, so validation, duplicate policy, and stale-result handling are not bypassed by the alternative. The motion and cancellation side is in [Drag And Settle](../motion/interaction-recipes.md#drag-and-settle).

This contract names what to declare. It does not establish conformance; that requires the consuming product's rendered behavior under the [accessibility evidence gate](../quality/gates/accessibility-evidence.md). [Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) is a different criterion for the size of those pointer controls and is measured in CSS pixels, not platform dp or pt.

## Opinionated Guidance

Use state names that expose meaningful differences. Two booleans can accidentally permit “saved and failed”; a state transition table helps reveal impossible combinations. Do not merge input validity, request state, and persisted revision into one visual status.

## Platform-Specific Guidance

For web forms, preserve native label and form relationships. Validate custom semantics against the applicable [accessibility evidence gate](../quality/gates/accessibility-evidence.md). Framework scheduling, request abort behavior, and server idempotency require separate implementation evidence.

## Unsupported Absolutes

A state table does not prove accessibility, successful persistence, race freedom, or device coverage. Cancelling a client request does not prove its remote side effects stopped.

## Verification Contract

Resolve responses out of order, edit during saving, fail then retry, activate repeatedly, and remove the component before completion. Inspect both persisted and displayed values. Include keyboard-only operation, long content, and constrained parents. For a drag operation, complete the task by drag, by click or tap without movement, and by keyboard, then compare the committed value, emitted event, and focus position. Record actual outcomes; the table above is an unexecuted reference contract. Review when a public input, event, or state meaning changes.

## Source, License, And Attribution

Locally authored contract and pseudocode; no framework or upstream implementation is copied. WCAG 2.2 (W3C Recommendation, 12 December 2024) and the informative Understanding pages for Success Criteria 2.5.7 (updated 10 August 2026) and 2.5.8 were rechecked on 2026-09-19 for the statements attributed to them; the three-path table is local synthesis and has not been executed against a product. Shared quality gates own evidence admissibility.

## IA Navigation

Parent: [Design Engineering](index.md).
Next: [Design Engineering Worked Examples](worked-examples.md).
