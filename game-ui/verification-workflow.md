---
type: Domain Guide
title: Game UI Verification Workflow
description: Convert a screen recipe into repeatable input, state, hierarchy, and teardown evidence.
domain: game-ui
lifecycle: experimental
provenance_kind: local
---

# Game UI Verification Workflow

Primary role: game-interface acceptance and evidence procedure.

## Repository Boundary

This workflow verifies a declared game-interface contract on a named runtime. It does not authenticate third-party captures or convert a hypothetical recipe into a real gallery reference. Shared [Quality Gates](../quality/index.md) determine what a claim's evidence can support.

## Reusable Method

1. Select a [Screen Recipe](screen-recipes.md), build/version, scene, starting data, and supported inputs.
2. Record the active hierarchy's lifetime, input, sorting, focus, and teardown owners.
3. Reset to known state before each scenario. Name any non-resettable external dependency.
4. Execute actions in order, including an exception or interruption.
5. Compare expected and actual state, selection, input recipient, and surviving objects.
6. Save artifacts with source/build identity; classify pass, fail, not-run, or not-applicable with a reason.

## Minimum Scenario Matrix

| Dimension | Scenario | Inspect |
| --- | --- | --- |
| Entry | Open by each supported input | Correct screen and initial focus/selection |
| Navigation | Visit first, middle, last, and unavailable actions | Predictable order, visible target, no unreachable required action |
| Modality | Open overlay above a screen, then another interruption | Exactly the intended input recipient; world input policy |
| Cancellation | Back/Cancel during entry, request, and exit | One-layer dismissal; no click-through or stale blocker |
| Content | Empty, long localized text, unbroken identifiers, many rows | Readable critical information and reachable actions |
| Surface | Target aspect ratios, safe areas, scaled UI, constrained window | No obscured controls or accidental scroll ownership |
| Data | Delay, fail, supersede, and complete requests out of order | Current identities and truthful operation status |
| Device | Switch/disconnect a claimed input device | Updated prompts and a viable recovery action |
| Lifetime | Reopen repeatedly and change scene/session | No duplicate handlers, surviving blockers, or stale view updates |

This is a selection matrix. A title that supports no touch input records touch as not applicable; it does not claim a touch pass.

## Worked Scenario: Inventory With Confirmation

Precondition: local fictional test data has two items, A and B. The inventory is open with A selected; no real commerce operation is involved.

| Step | Action | Expected observation |
| --- | --- | --- |
| 1 | Navigate to B and open its action dialog | B remains selected beneath the dialog; focus enters the dialog |
| 2 | Press Cancel once | Only the dialog closes; focus/selection returns to B |
| 3 | Reopen and trigger a delayed operation | Dialog exposes pending state and the declared duplicate-input behavior |
| 4 | Close/change the screen, then resolve the operation | Data owner reconciles the result; destroyed views do not update |
| 5 | Reopen inventory | Confirmed data appears; selection follows the documented restore policy |

Actual result: `not_run`. This procedure is a test design, not engine execution evidence.

A separate [web inventory adaptation](../examples/domain-interactions/README.md) exercises nested dismissal, delayed equipment responses after view closure, selection restoration, and reward reveal. Its [local browser results](../examples/domain-interactions/verification.md) are browser evidence only. The native-engine scenario above remains `not_run`.

## Evidence Record Template

```yaml
scenario: inventory-dialog-return
build_revision: # immutable source/build identity
runtime: # engine, UI stack, packages, OS, device
surface: # resolution, aspect ratio, safe area, UI scale, locale
input: # exercised mode and device
precondition: # scene, data, selection, connectivity
actions: # ordered, reproducible steps
expected: # visible state plus hierarchy/input assertions
actual: not_run
artifacts: # capture, recording, hierarchy trace, operation log
limitations: # missing channels, device scope, mocked dependencies
consumer_reference: not_applicable
consumer_reference_reason: This blank procedure selects no consumer-owned reference record.
```

## Opinionated Guidance

Capture hierarchy and input evidence together when a screenshot could hide the failure. A visually dismissed overlay with an active blocker is a failed dismissal, regardless of its appearance.

## Platform-Specific Guidance

For Unity use the source-pinned [CLI Loop](unity/cli-loop.md) and its UI-stack-specific capabilities. If a runner cannot inspect focus or controller routing, mark those checks not-run and collect them on the real engine surface.

## Unsupported Absolutes

A successful editor inspection does not prove player-build behavior. Mocked operation responses do not prove a live service works. Device and accessibility coverage must be named explicitly.

## Verification Contract

A completed record binds actions and actual outcomes to a build and runtime, includes exceptional-state evidence, and lists missing coverage. Failed required cases need remediation and rerun. A real gallery entry must also satisfy the [Reference Record](reference-record.md). Review when input routing, engine version, hierarchy ownership, or the recipe changes.

## Source, License, And Attribution

Locally authored test procedure and fictional inventory scenario. No real game reference, asset license, or runtime result is implied.

## IA Navigation

Parent: [Game UI](index.md).
Next: [Game UI Reference Record](reference-record.md).
