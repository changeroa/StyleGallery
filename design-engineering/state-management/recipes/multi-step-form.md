---
type: Domain Guide
title: Multi-Step Form With Retained Draft
description: Retain entered values across steps and guard progression and final submission.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Multi-Step Form With Retained Draft

## Repository Boundary

Retain entered values across steps and guard progression and final submission. This is a consumer interaction composition in Design Engineering. Spatial structure comes from [Form Flow](../../../recipes/form-flow.md); this recipe adds no reusable Layout behavior.

## Reusable Method

### Selected Pattern Stack

[single owner](../patterns/single-owner.md), [draft/baseline](../patterns/draft-and-baseline.md), [submitted snapshot](../patterns/submitted-snapshot.md), [unsaved navigation](../patterns/unsaved-navigation.md).

### Ownership And Event Flow

The flow owns all field values and current step; each field emits intents. Validity is derived from relevant fields. The final operation owns the submitted snapshot. Unmounting a step does not destroy the flow draft.

Edit → validate current step → advance if allowed. Back preserves values. Changing an earlier answer recomputes eligibility and invalidates dependent values under an explicit policy. Final Submit captures the whole valid draft once.

### Composition And Substitution

An in-memory step is enough when deep links are not a requirement; use URL state when they are. Versioned restore is optional for long flows and requires retention/privacy decisions. Do not persist request-pending flags.

### Acceptance Sequences

| Sequence | Expected outcome |
| --- | --- |
| Advance, go Back, revisit | Values persist; errors follow current validity |
| Change an earlier branching answer | Hidden dependent answers are cleared or excluded under declared policy |
| Deep-link to a later step | Guard prerequisites or redirect without silently submitting |
| Fail final submission | Retain all fields and provide a route to the relevant error |
| Edit while final save completes | Preserve later edits using snapshot semantics |

## Opinionated Guidance

Keep the ownership boundaries visible when composing the patterns. One screen can combine these mechanisms without making every value global. Record the rejected alternative and its user-visible cost in the [state brief](../state-brief.md).

## Platform-Specific Guidance

Announce step context and move focus to the step heading or first invalid field as appropriate. Step order, DOM order, and validation routes must agree.

## Unsupported Absolutes

These acceptance sequences are proposed integration checks, not captured product evidence. Pattern model tests do not prove this entire screen, its backend, or its focus behavior.

## Verification Contract

Adapt every acceptance row to the consumer and record actual results with the [verification matrix](../verification.md). Include the ordinary successful task and at least one interrupted task. The initial handoff is `consumer_reference: not_applicable` because this fictional recipe selects no consumer profile or conformance record.

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](index.md).
Next: [Continue the state management route](../verification.md).
