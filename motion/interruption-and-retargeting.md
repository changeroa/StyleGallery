---
type: Domain Guide
title: Interruption And Retargeting
description: Keep semantic intent, presented motion, cancellation, and teardown consistent under repeated input.
domain: motion
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-09-21
---

# Interruption And Retargeting

Primary role: motion lifecycle and ownership guide.

## Repository Boundary

This page describes presentation behavior when an interaction is interrupted. Application state and request authority remain in [State Management](../design-engineering/state-management/index.md). A presentation controller cannot silently cancel a transaction or overwrite newer semantic intent.

## Reusable Method

For each transition, record four independent facts: the committed application state, the current user intent, the presented visual state, and the current transition identity. Choose which fact authorizes each callback. A visible intermediate frame is not necessarily a valid application state.

### Source Findings

| Source | Bounded finding | Consequence |
| --- | --- | --- |
| [Web Animations, cancellation](https://www.w3.org/TR/web-animations-1/#canceling-an-animation-section) | Cancelling a non-idle animation rejects its current finished promise with `AbortError` and resets timing state. | Treat expected cancellation separately from an implementation failure. |
| [Web Animations, playback](https://www.w3.org/TR/web-animations-1/#the-animation-interface) | Play, pause, reverse, finish, and cancel are distinct operations. | Select an operation by desired lifecycle behavior, not its convenient name. |
| [CSS Transitions Level 2](https://www.w3.org/TR/css-transitions-2/) | Transition events include cancellation; entry styling can be supplied with `@starting-style` when prior rendered styling is absent. | A normal end event is not the only exit path. |
| [View Transitions Level 1](https://www.w3.org/TR/css-view-transitions-1/#viewtransition) | Skipping the visual transition does not prevent its DOM update callback. | Visual cancellation is not transaction rollback. |
| [Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/#the-pointercancel-event) | A pointer stream can be cancelled by the user agent. | A drag needs an explicit cancellation path, not only pointer-up handling. |

These are specification contracts at the documents read on 2026-09-21. Draft maturity and API presence do not prove behavior on a target browser; name the tested implementation separately.

### Choose The Interruption Policy

| Policy | Suitable local scenario | Cost or boundary |
| --- | --- | --- |
| Retarget from current presentation | A panel is asked to close before it finishes opening. | Sample or preserve the current pose; do not restart from a stale endpoint. |
| Reverse the same effect | The underlying states and path are genuinely reversible. | Reversing visual time cannot undo committed external effects. |
| Settle immediately | Motion is disabled, the surface is disposed, or presentation continuity is unimportant. | Preserve semantic state and focus even when no animation runs. |
| Coalesce pending presentation | Several updates describe only the newest displayed reading. | Do not drop independent operation acknowledgements. |
| Queue meaningful steps | The user explicitly needs a sequential demonstration. | Provide interruption or escape; state which queued events can be discarded. |

The policy is a product proposal. Keep the queue bounded and its meaning explicit. A list of queued animations is not an audit log of business actions.

### Worked Race: Open, Close, Open

The user opens a details pane, closes it during entrance, and opens it again during exit. Give each new intent an identity. The oldest entrance completion may release its own animation handle, but it cannot mark the current pane closed, move focus, or remove the latest pane instance.

| Event | Owner action | Invariant |
| --- | --- | --- |
| Open A | Commit open intent; establish an accessible pane and entrance effect. | Required semantics do not wait for an effect to finish. |
| Close B during A | Invalidate A's authority; choose the exit policy and focus destination. | A's completion cannot restore open intent. |
| Open C during B | Invalidate B; retarget or settle from the current presentation. | B cannot remove C's DOM instance. |
| B's delayed completion | Clean up only B's resources. | Current intent remains C. |
| Dispose surface | Invalidate all callbacks; release listeners and handles. | No later callback changes focus or another surface. |

Specify when leaving content stops accepting input. If an exiting visual remains on screen after the semantic close, it must not leave a second active focus surface. Conversely, a modal's focus containment must remain correct until the chosen modal-close operation occurs. Review that timing with the [native interaction contract](../design-engineering/native-interaction-contracts.md).

## Opinionated Guidance

Prefer one owner per animated property and one lifecycle owner per surface. When multiple effects compose, explicitly name the composite rule and cleanup ownership. Do not use a timer equal to a nominal duration as the authority for saving data, unlocking an action, or removing a currently reused element.

For direct manipulation, preserve the position reached by the user. Whether a release should preserve velocity, overshoot, or snap is a local perceptual decision; no spring parameter follows from this ownership model.

## Platform-Specific Guidance

CSS events, Web Animations promises, framework unmount hooks, and native gesture callbacks have different lifecycle semantics. Bind them through the same declared policy without claiming interchangeable APIs. Coordinate reduced-motion settlement through [Accessible Motion](accessible-motion.md).

## Unsupported Absolutes

`cancel()` does not mean “restore the original screen.” A resolved animation promise does not prove a server operation succeeded. A reverse animation does not guarantee that focus, history, or side effects were reversed.

## Verification Contract

Run repeated input at several points in the effect, including immediately before completion. The points are race probes, not statistically representative samples. Record request/intent identity, callback identity, final state, focused element, and remaining active effects.

Exercise normal completion, cancellation, reversal, removal, reduced-motion change, and pointer cancellation. Inject a late callback from the previous transition and verify it cannot remove or refocus the current instance. Compare the no-animation path against the same semantic outcomes.

These are unexecuted scenarios. A model test can prove callback acceptance rules in that model; actual event order and visual continuity require browser evidence. Re-review after a lifecycle adapter or animation API changes.

## Source, License, And Attribution

Locally authored synthesis of the linked specifications, inspected 2026-09-21. No upstream implementation is copied. `consumer_reference: not_applicable` because the example specifies a proposed interaction and selects no consumer record.

## IA Navigation

Parent: [Motion](index.md).
Next: [Rendering And Performance](rendering-and-performance.md).
