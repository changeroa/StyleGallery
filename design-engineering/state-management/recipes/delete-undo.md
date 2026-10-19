---
type: Domain Guide
title: Deletion And Supported Undo
description: Remove the intended entity and provide recovery that matches actual backend capabilities.
aliases: ["undo delete","delete with undo","삭제 취소","실행 취소"]
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Deletion And Supported Undo

## Repository Boundary

Remove the intended entity and provide recovery that matches actual backend capabilities. This is a consumer interaction composition in Design Engineering. Spatial structure comes from [List Detail](../../../recipes/list-detail.md); this recipe adds no reusable Layout behavior.

## Reusable Method

### Selected Pattern Stack

[ID selection](../patterns/id-selection.md), [single flight](../patterns/single-flight.md), optionally [optimistic overlay](../patterns/optimistic-overlay.md).

### Ownership And Event Flow

The collection owner tracks entities by ID. A per-entity deletion operation owns request identity and outcome. Confirmation owns a decision; an undo operation owns a real restore token or an explicitly cancellable pre-commit deletion.

Activate → confirm if required → submit deletion → reconcile acknowledgement → recover focus. Offer Undo only when a backend restore or a declared delayed-commit cancellation exists. A UI-only inverse patch cannot undo a committed deletion.

### Composition And Substitution

Use pending-until-confirmed deletion by default in this recipe. An optimistic overlay is substitutable only with a recovery contract. Confirmation and Undo solve different product decisions and are not interchangeable by appearance.

### Acceptance Sequences

| Sequence | Expected outcome |
| --- | --- |
| Cancel confirmation | No deletion effect; return focus to invoker |
| Fail definitively while filters change | Keep or restore the intended ID without reverting unrelated data |
| Lose response after submission | Mark outcome uncertain and reconcile before repeating |
| Delete the last row | Show empty state and move focus to a logical heading |
| Undo expires or restoration fails | Explain failure and reconcile actual collection state |

### Confirmation Versus Reversal

[WCAG Error Prevention, SC 3.3.4](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) was rechecked 2026-10-19 against the 2024 WCAG 2.2 Recommendation. For its scoped legal/financial, user-controlled stored-data, and test-response submissions, at least one of three conditions applies: reversibility, input checking with correction opportunity, or review/confirmation with correction before finalization. This is a normative alternative set, not a study showing Undo always beats confirmation.

Local decision: prefer supported recovery for frequent reversible low-cost actions; use explicit review before genuinely consequential irreversible commitment. Keep the existing backend contract decisive. A five-second toast cannot make an irreversible write reversible, and a confirm dialog cannot establish the accuracy of the submitted snapshot. Test expiry, failed restoration, unknown outcome, and focus after deleting the last item.

## Opinionated Guidance

Keep the ownership boundaries visible when composing the patterns. One screen can combine these mechanisms without making every value global. Record the rejected alternative and its user-visible cost in the [state brief](../state-brief.md).

## Platform-Specific Guidance

Restore focus after confirmation and after removal of the invoker. Announce the affected entity and the real undo availability; animation completion must not authorize deletion.

## Unsupported Absolutes

These acceptance sequences are proposed integration checks, not captured product evidence. Pattern model tests do not prove this entire screen, its backend, or its focus behavior.

## Verification Contract

Adapt every acceptance row to the consumer and record actual results with the [verification matrix](../verification.md). Include the ordinary successful task and at least one interrupted task. The initial handoff is `consumer_reference: not_applicable` because this fictional recipe selects no consumer profile or conformance record.

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](index.md).
Next: [Continue the state management route](../verification.md).
