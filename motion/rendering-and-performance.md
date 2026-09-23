---
type: Domain Guide
title: Motion Rendering And Performance
description: Diagnose animation cost and choose native transition mechanisms with measurable behavior and complete fallbacks.
domain: motion
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-09-21
---

# Motion Rendering And Performance

Primary role: source-backed rendering diagnosis and mechanism selection.

## Repository Boundary

This guide owns questions about the delivery of product motion. It does not grant reusable Layout CSS animation properties, establish universal frame budgets, or treat a trace from one machine as proof for every device. Use the existing [Practice Reference](practice-reference.md) for the boundary between mechanics and taste.

## Reusable Method

Describe the visible failure before choosing a faster-looking API: input responds late, geometry jumps, frames arrive irregularly, content is blank during decoding, or the wrong state appears. Record the target browser/device, surface size, concurrent work, and source revision. Select evidence that distinguishes these failures.

### Source Findings

| Source | What it supports | What it does not establish |
| --- | --- | --- |
| [web.dev animation guide](https://web.dev/articles/animations-guide) | Rendering work depends on the properties and effects involved; inspect paint and compositing behavior. | That a property or library always runs on a GPU. |
| [Layout thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing) | Interleaved style writes and geometry reads can force synchronous layout; batching can avoid repeated work. | That every geometry read is a defect. |
| [Chrome runtime performance](https://developer.chrome.com/docs/devtools/performance) | Recorded frames and main-thread work can locate a runtime bottleneck. | Hardware equivalence between throttling and an actual device. |
| [View Transitions Level 1](https://www.w3.org/TR/css-view-transitions-1/) | Same-document transitions wrap a DOM update and expose distinct update, readiness, and finish promises. | Route state, data consistency, or a universal cross-document contract. |
| [Scroll-driven Animations](https://www.w3.org/TR/scroll-animations-1/) | Scroll progress and view progress are distinct timeline models. | That a visually scrubbed sequence has correct reading order or accessibility. |
| [CSS Transitions Level 2](https://www.w3.org/TR/css-transitions-2/#defining-before-change-style) | `@starting-style` supplies entry styling for relevant newly rendered elements. | Correct exit teardown, focus handling, or support in an unspecified runtime. |

These are dated source readings, not a compatibility table. The linked standards-track documents include work in progress; check the selected browser and feature combination before making a shipping claim.

### Match The Mechanism To The Responsibility

| Responsibility | Candidate | First failure probe |
| --- | --- | --- |
| Animate one local state difference | CSS transition with a static endpoint | Disable transitions; the endpoint must still be correct. |
| Control an effect's playback lifecycle | Web Animations | Interrupt and dispose it; verify cleanup and promise handling. |
| Visually connect a replaced DOM state | Same-document View Transition | Skip the transition; the DOM update must still occur once. |
| Bind presentation to a scroll interval | Native scroll/view timeline where supported | Remove support; content must remain readable in order. |
| Coordinate media decoding with chapters | Consumer-owned controller | Delay or fail a frame decode; preserve a readable fallback. |

This selection table is a local reasoning aid. It does not rank CSS, JavaScript, or native APIs by universal speed.

### A Diagnostic Sequence

1. Reproduce the failure with representative content and a repeatable input sequence. Save the initial state, not just the final screenshot.
2. Inspect the slow interval: input queueing, script execution, style/layout, paint, compositing, and media work where the tooling exposes them.
3. Change one suspected cost while retaining the same task and information. For a suspected layout loop, batch the same reads before writes rather than removing the interaction.
4. Compare trace intervals and final behavior. Report both improvements and regressions; averaging the entire page can hide the bad interval.
5. Repeat on a declared target device when the claim concerns that device. Keep emulation and real-device observations separate.

For continuous motion, inspect frame delivery during the effect. For input responsiveness, use [Loading And Feedback](../design-engineering/loading-and-feedback.md) and its distinction between next paint and completed work. A responsive first frame can precede an unsuccessful operation.

### View Transition Failure Contract

Treat the DOM update as the essential operation. `updateCallbackDone` reports that update's result; `ready` can reject when an animation cannot start; visual skipping can still lead to successful completion. Handle the promises relevant to the selected API version and keep route/focus error handling independent of decoration. The [specification interface](https://www.w3.org/TR/css-view-transitions-1/#viewtransition) is the source for these distinctions.

Local probes: request a second navigation before the first effect ends, remove a named element, use a duplicate transition name, fail the update callback, and resize during capture. Determine which failures skip only the effect and which prevent the destination update. Do not infer business success from the existence of a transition object.

## Opinionated Guidance

Choose the smallest effect that explains the state change. Promote an element or retain a large snapshot only when the measured benefit justifies its lifetime and resource cost. Reducing the work is often easier to explain than adding coordination machinery, but retain evidence for the actual tradeoff.

## Platform-Specific Guidance

DevTools UI and event names change; record tool/browser versions and retain raw traces. A native timeline needs a source-bound fallback, especially for media chapters with independent decoding. Follow [Scroll-driven Story](interaction-recipes.md#scroll-driven-story) for reading, scroll ownership, and runnable examples.

## Unsupported Absolutes

An average FPS value cannot prove every frame arrived on time. Smooth video playback of a capture cannot establish input latency. A compositor-friendly effect does not remove image decode, memory, script, or accessibility costs.

## Verification Contract

Report the initial failure, task-preserving comparison, target environment, raw artifact locator, observed difference, and remaining limitations. Keep source-derived expectations separate from measured timings. Test the static path, rapid input, cold and warm media/cache conditions, and reduced motion when relevant.

The sequence above is a proposed diagnostic protocol; this documentation change captures no runtime performance evidence. Re-review when the effect, content scale, browser feature, or target hardware changes.

## Source, License, And Attribution

Locally authored synthesis. The linked official browser guidance and specifications were inspected 2026-09-21; no source code, figures, or tables are reproduced. `consumer_reference: not_applicable` because no consumer implementation or performance record is selected.

## IA Navigation

Parent: [Motion](index.md).
Next: [Motion Review Workflow](review-workflow.md).
