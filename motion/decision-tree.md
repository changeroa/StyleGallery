---
type: Domain Guide
title: Motion Decision Tree
description: Choose a motion responsibility from a user task, state change, and failure case.
domain: motion
lifecycle: experimental
provenance_kind: local
---

# Motion Decision Tree

Primary role: motion selection workflow.

## Repository Boundary

Use this route to decide whether a product interaction needs motion and which behavior contract to write. Layout continues to own final geometry, semantic order, and scrolling. This route selects a responsibility, not a timing preset.

## Reusable Method

1. Write the before and after state without animation. If either is unusable, fix that state first.
2. Name the information motion would add: acknowledgement, continuity, progress, or guidance. If none is needed, use an immediate update.
3. Choose the first matching responsibility below; compose only when one transition has multiple explicit jobs.
4. Complete the [Motion Brief](motion-brief.md), including interruption and a reduced-motion path.
5. Use an [Interaction Recipe](interaction-recipes.md) and verify through the [Review Workflow](review-workflow.md).

## Selection Table

| Observed task | Choose | Failure to prevent | First verification |
| --- | --- | --- | --- |
| Explain an already rendered effect | [Vocabulary](vocabulary.md) | Inferring an API from appearance | Exact, ambiguous, and unknown observations |
| Acknowledge a command | [Action feedback](interaction-recipes.md#action-feedback) | Decorative feedback mistaken for successful completion | Pending, success, failure, repeated activation |
| Show or hide supporting content | [Disclosure](interaction-recipes.md#disclosure) | Hidden content retaining focus or delayed access to content | Keyboard activation and reversal |
| Enter or dismiss a modal task | [Modal transition](interaction-recipes.md#modal-transition) | Focus or input blocking tied to an animation timer | Focus entry, cancellation, return |
| Preserve identity when items move | [Reorder and filter](interaction-recipes.md#reorder-and-filter) | Visual movement changing logical reading order | Stable identity and focused-item removal |
| Explain an operation that takes time | [Progress and completion](interaction-recipes.md#progress-and-completion) | An invented percentage or success before confirmation | Delayed result, cancellation, failure |
| Follow direct manipulation | [Drag and settle](interaction-recipes.md#drag-and-settle) | A cancelled gesture committing data | Release, reversal, cancellation, alternative input |
| Decorate an idle surface | [Practice Reference](practice-reference.md) | Repetition competing with the user's task | Compare against removal and reduced motion |

## Worked Selection

A search result list changes after a filter selection. The task is to understand which results remain; it is not to watch every row arrive. Choose reorder/filter only if stable result identities can be preserved. Keep the filter control focused. Announce the resulting count separately from any visual interpolation. When no results remain, present an actionable empty state immediately. If identity cannot be mapped reliably, replace the list without implying continuity.

The decision record is a proposal until tested on the consuming product. It does not establish that motion improves search comprehension.

## Opinionated Guidance

Prefer one explanatory event over a sequence of unrelated effects. Evaluate high-frequency interactions with realistic repetition; a first-use recording can hide accumulated cost.

## Platform-Specific Guidance

Choose implementation APIs only after the behavior contract. Native gestures, browser navigation, scroll timelines, and animation libraries have different cancellation and lifetime behavior. Platform adaptation starts at [Platform Guides](../platform-guides/index.md).

## Unsupported Absolutes

An immediate update is a valid outcome. A recipe name does not imply a spring, compositor execution, fixed duration, or proven usability improvement.

## Verification Contract

For the selected row, verify normal completion, interruption, repeated input, the reduced-motion path, and a failed or empty result where relevant. Record the actual outcome separately from the expected outcome. Revisit this route when a task cannot find a suitable contract or two recipes imply conflicting ownership.

## Source, License, And Attribution

Locally authored selection workflow based on this domain's existing vocabulary and review contracts. No external code or expressive examples are adapted.

## IA Navigation

Parent: [Motion](index.md).
Next: [Motion Brief](motion-brief.md).
