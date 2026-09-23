---
type: Domain Guide
title: Accessible Motion And Equivalent Feedback
description: Separate motion preferences, automatic updates, flashing, and semantic feedback before designing reduced-motion behavior.
domain: motion
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-09-21
---

# Accessible Motion And Equivalent Feedback

Primary role: source-backed motion accessibility decision guide.

## Repository Boundary

This page owns product-motion decisions and their evidence requirements. Shared [accessibility evidence](../quality/evidence/accessibility.md) governs conformance claims. No motion values or decorative declarations become reusable Layout CSS.

## Reusable Method

Inventory each effect by trigger, duration, affected area, information conveyed, and available controls. Evaluate the separate source conditions below; one reduced-motion media query is not a complete accessibility review. Then specify an equivalent path that exposes the same information and actions with less movement.

### What The Sources Establish

| Source | Bounded finding | Decision it informs |
| --- | --- | --- |
| [WCAG 2.2 SC 2.3.3 explanation](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) | The AAA criterion concerns disabling interaction-triggered motion animation unless essential. | Identify extra movement induced by scrolling, dragging, expanding, or changing routes. |
| [SC 2.2.2 explanation](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) | The A criterion has distinct conditions for automatically moving information and automatically updating information. The latter has no five-second exception. | Audit rotating content and live updates separately from a short transition. |
| [SC 2.3.1 explanation](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) | Flash evaluation includes frequency and defined area/luminance thresholds. | A pause button cannot substitute for evaluating flashing content. |
| [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion) | `prefers-reduced-motion` exposes a preference; it does not select an application-specific replacement. | Author the replacement and verify preference changes. |
| [SC 4.1.3 explanation](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | Status information can require programmatic exposure without moving focus. | Preserve feedback when a spinner, movement, or success effect disappears. |

WCAG Understanding pages are informative explanations of the [normative WCAG 2.2 requirements](https://www.w3.org/TR/WCAG22/). Media Queries Level 5 is a Working Draft. These sources do not establish implementation support for a particular browser or certify a product.

### Classify Before Replacing

| Product behavior | Local replacement proposal | Failure to look for |
| --- | --- | --- |
| Scroll-linked zoom into a product detail | Keep the reading sequence; switch details at explicit boundaries or expose them together. | Essential copy is available only at an intermediate animation frame. |
| Reordering a list | Update the order and selection immediately; provide a concise completion message if needed. | Visual order changes while reading order or selected identity does not. |
| Loading shimmer | Use a stationary placeholder and textual waiting state. | The placeholder is mistaken for loaded content or the request appears to have stopped. |
| Modal entrance | Present the usable modal immediately, with the same focus and dismissal contract. | Focus is delayed until a completion event that never fires in reduced mode. |
| Automatically advancing announcement | Provide durable stop/control behavior appropriate to the applicable criterion. | Moving focus elsewhere restarts an update the user had paused. |
| Success celebration | Retain the durable success state and next action. | Removing confetti also removes the only completion signal. |

These are proposed product choices, not W3C-prescribed recipes. A fade is another effect to evaluate; reducing translation does not prove that every replacement is comfortable.

### Preference Changes During Work

Record whether an in-product setting inherits the system preference or further reduces motion. Define how an active effect settles when the effective preference changes. The settlement must preserve the current task, release transient visual resources, and make the destination usable. Avoid replaying an entrance merely because the preference changed back.

Separate pausing the presentation from pausing the underlying process. A dashboard may stop replacing visible figures while data collection continues. A resumed display must say whether it shows current information or replays buffered history. For transaction feedback, stopping an animation never means a server write was cancelled.

## Opinionated Guidance

Start with a complete stationary interaction, then add motion with a named explanatory purpose. This makes the no-motion path directly inspectable. Keep user-chosen pauses durable across focus changes and make preference controls reachable before the effect they govern.

Do not infer an accessibility need from a device class. The effective preference, explicit user action, and actual interaction matter more than a touch/desktop label.

## Platform-Specific Guidance

Web CSS and script-driven effects need a coordinated preference owner. Native Reduce Motion behavior belongs to its named OS/API; see [Preferences And Accessibility](../platform-guides/preferences-and-accessibility.md). Animated media, canvas, and embedded content require their own controls and evidence because disabling a CSS transition does not govern them.

## Unsupported Absolutes

“Under five seconds is accessible,” “a crossfade is always safe,” and “the media query makes the page WCAG AA compliant” are unsupported. A criterion's conformance level is not a reason to claim that another criterion covers its behavior.

## Verification Contract

The following cases are unexecuted test designs. Record actual outcomes in the consumer's evidence, including source revision, browser/OS, input, effective preference, and the asserted result.

| Case | Required observation |
| --- | --- |
| Reduced motion is active before load | Essential content and actions appear without waiting for motion. |
| Preference changes halfway through a transition | The active task settles once; no stranded overlay, stale focus, or rejected-promise error remains. |
| Keyboard activates the same action | The destination and feedback match the pointer path. |
| Animation support is removed | The state transition still completes. |
| User pauses automatic information, then tabs away | The pause persists; resumption follows the documented policy. |
| Visual completion feedback is removed | The result remains available visually and through relevant assistive technology. |

Source inspection verifies the criterion distinctions. DOM checks can verify state and focus; recordings can reveal movement. Neither alone establishes vestibular comfort or screen-reader announcement behavior. Re-review when source conditions, effect ownership, or the target runtime changes.

## Source, License, And Attribution

Locally authored synthesis. All linked external sources were inspected on 2026-09-21. No upstream prose, example code, or assets are reproduced. `consumer_reference: not_applicable` because this guide selects no consumer implementation record.

## IA Navigation

Parent: [Motion](index.md).
Next: [Interruption And Retargeting](interruption-and-retargeting.md).
