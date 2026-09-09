---
type: Domain Guide
title: Motion Brief
description: Author a product-owned transition contract with interruption, preference, and evidence requirements.
domain: motion
lifecycle: experimental
provenance_kind: local
---

# Motion Brief

Primary role: motion implementation handoff template.

## Repository Boundary

This brief records one product-owned behavior. Its timings, distances, and treatments never become reusable Layout values. Use the [Decision Tree](decision-tree.md) before filling it in.

## Reusable Method

Complete every field, using `unknown` for missing observations and a reason for non-applicability. A blank field is not an accepted exception.

```yaml
interaction: # a user action and the state it changes
purpose: # the information motion adds
frequency: # observed or estimated, with its basis
trigger: # input, data event, navigation, or scroll progress
semantic_owner: # who commits the real application state
presentation_owner: # who starts, retargets, cancels, and disposes motion
layout_owner: # final geometry and scroll responsibility
states: # initial, in-flight, completed, failed, cancelled
identity: # stable object or item key, if continuity is claimed
parameters: # product-local values and why they are being tried
interruption: # reverse, retarget, finish, or cancel, and from which state
focus_and_input: # entry, availability during motion, exit, fallback target
reduced_motion: # equivalent state/feedback without unnecessary movement
teardown: # navigation, removal, preference change, and stale callbacks
verification: # exact actions, expected outcomes, runtime and artifacts
observed_result: # not_run until evidence exists
boundary: # what those observations cannot establish
review_trigger: # source/API change, a failed case, or reader task
consumer_reference: not_applicable
consumer_reference_reason: This blank template selects no consumer reference record.
```

## Filled Example: Search Status Feedback

| Field | Example decision |
| --- | --- |
| Interaction and purpose | Submit a search; distinguish waiting, zero results, results, and failure |
| Frequency | Unknown; measure in the consuming search task |
| Semantic owner | Search controller; only the active request may replace results |
| Presentation owner | Status component; progress decoration may stop independently |
| Layout owner | Consumer's result region; [Feed](../patterns/stacking/feed.md) can own vertical repetition |
| Transition | Idle → pending → results/empty/error; a new query supersedes the old request |
| Parameters | No movement needed for the baseline; a loading treatment is an optional later hypothesis |
| Interruption | Query B supersedes query A; A's late completion is ignored |
| Focus | Remains on the initiating control unless the user moves it |
| Reduced motion | Static pending text and the same final result or error |
| Teardown | Abort where supported and reject stale completion by request identity |
| Verification | Submit A, submit B, resolve B, then resolve A; B remains presented |
| Observed result | `not_run`: illustrative contract, not captured product evidence |
| Review trigger | The product changes its request lifecycle, navigation, or status announcement |

Example handoff: `consumer_reference: not_applicable` because no profile or consumer evidence record is selected. A real consumer replaces this with its applicable repository-relative record or its own reason.

## Scroll Story Extension

For scroll-linked scenes, fill these fields in addition to the general brief:

```yaml
scroll_owner: document
stage_owner: # sticky containing block and offset
start_and_distance: # measured start, positive distance, zero-distance alternative
scene_ranges: # each chapter's entry, hold, exit, and semantic availability
resize_policy: # recompute geometry and fall back when content cannot fit
direct_entry: # derive state from restored scroll position without replay
static_path: # source-order reading, no script, reduced motion, explicit user choice
media_budget: # poster, dimensions, cache, decode concurrency, timeout, fallback
performance_protocol: # exact runtime, input trace, measurements and local targets
```

See [Scroll-driven story](interaction-recipes.md#scroll-driven-story) and the [worked lab](../examples/scroll-story/README.md). A brief must distinguish view-entry triggers from continuous scroll progress.

## Opinionated Guidance

Write cancellation before tuning curves. An animation completion callback should report presentation completion; it should not be the sole authority for network success, focus cleanup, or saving data.

## Platform-Specific Guidance

Record actual browser, OS, input mode, and relevant animation-library version in the consumer's verification record. A preference query indicates a requested behavior; it does not prove the implemented alternative is comfortable.

## Unsupported Absolutes

No fixed timing, animation technology, or one reduced-motion treatment works for every brief. A filled template is not executed evidence.

## Verification Contract

The brief is ready to implement when every state has an owner, every interruption has a resulting state, and every acceptance claim names an observable. Execution must add artifacts and pass/fail results. Use the [Review Workflow](review-workflow.md) for findings and retesting.

## Source, License, And Attribution

Locally authored template and fictional search scenario. The existing domain contracts provide its evidence boundary.

## IA Navigation

Parent: [Motion](index.md).
Next: [Motion Interaction Recipes](interaction-recipes.md).
