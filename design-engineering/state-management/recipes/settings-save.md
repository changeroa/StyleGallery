---
type: Domain Guide
title: Settings With Explicit Save
description: Edit and save preferences without losing later input or leaving with unsaved work.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Settings With Explicit Save

## Repository Boundary

Edit and save preferences without losing later input or leaving with unsaved work. This is a consumer interaction composition in Design Engineering. Spatial structure comes from [SaaS Settings](../../../recipes/saas-settings.md); this recipe adds no reusable Layout behavior.

## Reusable Method

### Selected Pattern Stack

[draft/baseline](../patterns/draft-and-baseline.md), [submitted snapshot](../patterns/submitted-snapshot.md), [single flight](../patterns/single-flight.md), [unsaved navigation](../patterns/unsaved-navigation.md).

### Ownership And Event Flow

The form owns draft; the server owns persisted data; the save attempt owns the snapshot; the router owns pending departure. Dirty is derived. Account changes invalidate the entire form generation.

Edit → validate → capture snapshot → save → reconcile acknowledgement → re-evaluate dirty. For Save-and-leave, leave only after successful reconciliation and only if no newer edits remain.

### Composition And Substitution

Explicit-save semantics require the snapshot and draft separation. A single-flight guard can share or ignore repeats; queuing requires a separately defined sequence of snapshots. Immediate autosave is a different recipe with debounce, ordering, and conflict rules.

### Acceptance Sequences

| Sequence | Expected outcome |
| --- | --- |
| Submit A, edit B, acknowledge A | Baseline A; draft B remains dirty; stay if leaving was requested |
| Save fails, then retry | Preserve draft and release the operation guard |
| Remote revision conflict | Preserve draft; offer reload/merge under consumer policy |
| Cancel departure | Keep draft and return focus to the invoker |

## Opinionated Guidance

Keep the ownership boundaries visible when composing the patterns. One screen can combine these mechanisms without making every value global. Record the rejected alternative and its user-visible cost in the [state brief](../state-brief.md).

## Platform-Specific Guidance

The form must connect errors to fields and announce completion without implying newer edits were saved. A disabled submit control is not the duplicate guard.

## Unsupported Absolutes

These acceptance sequences are proposed integration checks, not captured product evidence. Pattern model tests do not prove this entire screen, its backend, or its focus behavior.

## Verification Contract

Adapt every acceptance row to the consumer and record actual results with the [verification matrix](../verification.md). Include the ordinary successful task and at least one interrupted task. The initial handoff is `consumer_reference: not_applicable` because this fictional recipe selects no consumer profile or conformance record.

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](index.md).
Next: [Continue the state management route](../verification.md).
