---
type: Domain Guide
title: Design Engineering Worked Examples
description: Apply component contracts to settings, asynchronous search, and destructive list actions with explicit recovery cases.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Design Engineering Worked Examples

Primary role: product interaction recipe collection.

## Repository Boundary

These fictional examples connect decisions to expected behavior. They are neither shipped components nor captured product evidence. Values and presentation belong to the consumer; the referenced Layout recipes retain their spatial boundaries.

The separate [Interaction Lab](../examples/domain-interactions/README.md) implements the save and search contracts as a local web prototype. Its [browser observations](../examples/domain-interactions/verification.md) apply to that exact example and source snapshot; they do not prove a consumer backend or the destructive-action recipe below.

## Reusable Method

Choose a matching user task, adapt its state ownership through the [Component Contract](component-contract.md), and execute the listed failure cases in the consuming application. The decision is incomplete until expected and actual results are recorded separately.

## Settings With Explicit Save

Task: edit preferences, inspect changes, and save intentionally. Compose the [SaaS Settings recipe](../recipes/saas-settings.md); let its selected patterns own page structure and scrolling. The form owns the editable draft, the operation owns the submitted snapshot, and persistence determines success.

Keep field errors beside their inputs and provide a route to the first relevant error. On network failure, retain all entered values. A successful save of an older snapshot must leave subsequent edits dirty. If leaving the screen can lose changes, define discard/cancel/save behavior and what happens if saving fails.

| Test | Expected behavior |
| --- | --- |
| Submit missing required input | Expose the error and retain other values |
| Submit, edit again, then receive success | Confirm the submitted snapshot; preserve later edits |
| Fail and retry | Keep the draft; issue the retry under the declared request policy |
| Cancel navigation with dirty data | Stay on the form with the same draft and a usable focus target |

Evidence still needed: keyboard/error announcement, persistence responses, and source-bound runtime capture. A prototype cannot prove real data was saved.

## Search With Detail Selection

Task: search a collection and inspect an item without losing the search context. Compose [List Detail](../recipes/list-detail.md). Separate query text, submitted query, active request, results, and selected item identity. Displayed detail must name the selected item even when the result set refreshes.

Keep typing responsive; a request for an older query cannot replace a newer result. Distinguish “no results” from loading and failure. On a tight surface, preserve selection and query when navigating between list and detail. If the selected item disappears, choose a documented empty detail or next-item policy instead of silently showing stale data.

| Test | Expected behavior |
| --- | --- |
| Submit A, then B; resolve B before A | Results remain for B after A arrives |
| Receive zero results | Show the submitted query and a recovery action |
| Resize with detail selected | Preserve selection and query; keep focus on a logical available target |
| Remove the selected item remotely | Explain its unavailability or choose the documented next target |

Evidence still needed: out-of-order response trace, selection identity, tight/wide rendered states, and input coverage. Motion is optional; use [Reorder and Filter](../motion/interaction-recipes.md#reorder-and-filter) only when it communicates stable identity.

## Destructive Action In A List

Task: remove a selected item with understandable consequences. Separate the initiating control, decision surface, pending operation, and final list update. Choose confirmation or undo from actual reversibility and product requirements. Do not offer undo when the backend cannot restore the item.

Name the affected item and scope. During pending deletion, prevent unintended duplicate operations according to the contract. Failure preserves the item and a recovery path. On success, return focus to an appropriate neighboring item or list heading if the invoker was removed. A dialog's visual exit must not leave a blocker behind.

| Test | Expected behavior |
| --- | --- |
| Cancel confirmation | No deletion; return to the invoker |
| Fail the operation | Explain failure and preserve the item |
| Succeed while filters change | Remove by stable identity, not old row position |
| Remove the final item | Present an empty state and a logical focus destination |

Evidence still needed: actual operation result, focus trace, dialog semantics, and recovery behavior. Use [Modal Transition](../motion/interaction-recipes.md#modal-transition) only for optional presentation.

## Implementation Handoff

```yaml
example: # settings-save, search-detail, or destructive-list-action
consumer_reference: not_applicable
consumer_reference_reason: These fictional examples select no consumer-owned profile or evidence record.
layout_source: # the selected recipe and the consumer's pinned revision
state_owner: # component, screen, and persistence responsibilities
acceptance_cases: # adapted rows above
observed_results: not_run
remaining_evidence: # actual runtime, input, device, and user evidence
```

## Product Story And Media Handoff

Start with an observation sheet for a product homepage: section job, reading order, scene boundaries, changing objects, media crop, and source-confidence level. Record an unknown rendering mechanism as unknown; cinematic appearance alone does not establish video, Canvas, WebGL, or a library.

| Decision | Product-owned record | Verification |
| --- | --- | --- |
| Typography and rhythm | Heading measure, copy length, spacing, contrast and image ratio | Real copy, text growth, narrow windows |
| Scene composition | Subject identity, crop and focal point, transparent layers, background transitions | First/middle/last and transition frames |
| Media export | Dimensions, frame order, codec/format, alpha, poster, source/license | Decode readiness and failed asset |
| Runtime budget | Download bytes, decoded-memory estimate, cache and concurrency limits | Slow requests, repeated reversal, idle work |
| Static equivalent | Every essential message in semantic HTML, explicit reading mode | No script, reduced motion, keyboard access |

Use the [Motion scene contract](../motion/interaction-recipes.md#scene-composition-contract) and compare the [Flow and headphones examples](../examples/scroll-story/README.md). Their shared controller demonstrates content substitution; both are related local examples and establish no independent adopter evidence. Their different typography, colors, and assets remain product choices.

Complete one representative scene before producing an entire video or image sequence. Review its composition and transition framing, then export at the target dimensions. A polished poster does not validate the intervening frames. This section is locally authored practice guidance, not adapted external visual expression.

### Persistent Subject And Page Navigation

The Flow story keeps one device shell mounted while its screen content and pose change with progress. The [Scene Navigation example](../examples/scene-navigation/README.md) carries that same identity principle into a page whose chapter selection changes while document position stays fixed. Background, text, device pose, and screen layers share one state owner. These are local product treatments, not profile values or reusable Layout CSS.

For this page type, add an input map and URL/history contract to the visual handoff. Specify which surface owns wheel/swipe, which copy regions retain native scrolling, how a focused outgoing action is recovered, and how the user reaches ordinary reading. Review intermediate frames as well as the endpoints; semantic availability must not depend on a visual completion callback.

## Opinionated Guidance

Preserve the user's work across recoverable failures. Status text should explain the real operation; motion and color alone are insufficient descriptions of what happened.

## Platform-Specific Guidance

Native navigation, browser history, component libraries, and platform controls differ. Record the exact implementation of cancellation and focus return rather than copying a screenshot's apparent behavior.

## Unsupported Absolutes

Confirmation is not always safer than undo. Optimistic updates are not always appropriate. A worked example does not certify a consumer migration or establish universal usability.

## Verification Contract

Execute all adapted acceptance rows plus long text, empty content, relevant constraints and preferences, and every claimed input method. For a migration use the larger [Migration Readiness](consumer-migration-readiness.md) contract. Review these examples when an observed failure lacks an owner or recovery action.

## Source, License, And Attribution

Locally authored scenarios and expected-result tables. Repository links provide spatial and evidence contracts, not proof that these scenarios have run.

## IA Navigation

Parent: [Design Engineering](index.md).
Next: [Interface Craft Decisions](interface-craft.md).
