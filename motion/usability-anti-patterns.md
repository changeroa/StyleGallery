---
type: Domain Guide
title: Motion Usability Anti-Patterns
description: Review loading barriers, captured scrolling, invisible first-screen content, and uncontrolled loops without turning house taste into universal timing rules.
domain: motion
lifecycle: experimental
source_repository: leonxlnx/taste-skill
source_path: skills/taste-skill/references/motion.md
source_revision: b9ca2fd8047f4c72d7da90ebc1c1203e57c72cd2
---

# Motion Usability Anti-Patterns

Primary role: product-motion usability review guide.

## Repository Boundary

This Motion page reviews whether movement prevents reading, navigation, or control. It adds no reusable Layout CSS and implements no catalog detector. The machine rule id `slop.blocked-first-paint` will be added to the catalog by a separate PR; this page neither defines its threshold nor adds that entry.

## Reusable Method

Start from the user's first task and identify every condition that delays content, captures input, or repeats without consent. Record the responsible state owner in a [Motion Brief](motion-brief.md). Test the readable, stationary path before evaluating the effect's appearance.

### Loading barriers

A preloader becomes a usability problem when already available content is withheld for a counter or entrance sequence. Show the document's useful content while optional media loads. If an operation truly blocks a task, describe its real state, expose recovery, and finish the waiting state on that operation's completion rather than on decorative playback.

An entry gate that demands a click, sound choice, or gesture before any explanation hides the purpose of the page. Put optional presentation controls beside usable content. Where a genuine eligibility or consent boundary is necessary, explain it and provide the required accessible path; do not infer from this guide that all such gates are decorative.

The taste-skill study (model panel) found preloaders in 60 of 99 captures and entry gates in 10 of 99. These observations motivate inspection, not a universal latency budget or proof of causation.

### Input ownership

Wheel/scroll hijacking replaces expected document movement with scene control or consumes input without a visible result. Check whether the visitor can find the next section, use keyboard navigation, follow a hash, and leave the scene. Prefer bounded scenes driven by native scroll position. For deliberate fixed-scene navigation, use the separate [full-viewport scene contract](interaction-recipes.md#full-viewport-scene-navigation), with explicit controls and a reading escape; a smooth-scroll library is not evidence that this contract holds.

The taste-skill study (model panel) reports usability scores of 6.01 for captured-wheel experiences versus 6.50 for scrolling pages. Those are model judgments on an observational gallery sample, not measured human task performance.

### Hidden first-screen text

First-screen text left at `opacity: 0` after load can strand the reader behind a reveal that never starts or completes. Inspect ancestors as well as text nodes: a visible child cannot escape a transparent parent. Make essential copy readable in base HTML/CSS. Enhancement should not make completion, focus, or the next action depend on a successful animation callback.

Exercise script failure, missing animation support, reduced motion before load, and preference changes during playback. A DOM node's presence is insufficient evidence of readability. The taste-skill study (model panel) inspected captures through 4.5 seconds after load; this is its observation window, not a proposed local detector deadline.

### Uncontrolled repetition

Infinite loops without reduced-motion behavior can keep a decorative distraction running throughout the task. Inventory CSS, script, canvas, video, and embedded loops rather than checking only one media query. Provide the equivalent stationary information, respect the effective preference on initial load and changes, and preserve any user pause. Suspend discretionary work offscreen and in hidden documents.

Use [Accessible Motion](accessible-motion.md) to distinguish reduced-motion preferences from pause/stop/hide obligations and status feedback. A reduced-motion rule alone does not establish accessibility conformance.

## Opinionated Guidance

Require a stated task benefit before delaying content or taking ownership of input. Review the successful reading path and the failure path together. A simpler effect is useful only if its replacement preserves the content and control the reader needs.

## Platform-Specific Guidance

Test wheel and trackpad input separately from touch and keyboard. Browser history, native scroll, focus, and assistive-technology reading have different ownership from a canvas scene. Record browser/OS and effective motion preference; no single Chromium capture proves native-platform behavior.

## Unsupported Absolutes

Not every preloader is artificial, every gate optional, or every pinned scene scroll hijacking. Nor does a short animation automatically make a page usable. The cited model-panel comparisons cannot prove causation or establish a universal timing limit.

## Verification Contract

These are test designs, not executed product evidence. Record actual results, source revision, environment, and observed state:

- Before load, subscribe to content readiness and animation completion/cancellation with bounded timeouts; verify useful first-screen copy is visible independently of decorative completion.
- With scripts blocked or enhancement failing, verify the reading path and essential actions remain available.
- With reduced motion active before load and changed during playback, verify stationary content, retained feedback, released overlays, and no stranded zero-opacity text.
- With wheel, trackpad, keyboard, touch, hashes, and back navigation, verify bounded movement, visible progress, focus ownership, and a reachable exit.
- Pause a loop, leave and return to the viewport or tab, and verify the user pause remains in effect and offscreen work follows the declared policy.

Use event/state signals rather than fixed sleeps in automated checks. Review screenshots for visibility and use runtime input tests for navigation. Re-review on a source revision, ownership change, or failed task.

## Source, License, And Attribution

Independent method rewrite of [taste-skill's motion reference, especially section 9](https://github.com/leonxlnx/taste-skill/blob/b9ca2fd8047f4c72d7da90ebc1c1203e57c72cd2/skills/taste-skill/references/motion.md), MIT, Leonxlnx, 2026. Measurements and panel limits were checked against [research sections 1 and 12](https://github.com/leonxlnx/taste-skill/blob/b9ca2fd8047f4c72d7da90ebc1c1203e57c72cd2/skills/taste-skill/references/research.md) on 2026-10-19. No upstream sentences, tables, or code are reproduced. Task-based review steps and integration with existing Motion contracts are local synthesis. `consumer_reference: not_applicable` because this guidance selects no implementation record.

## IA Navigation

Parent: [Motion](index.md).
Next: [Motion Review Workflow](review-workflow.md).
