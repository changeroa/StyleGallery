---
type: Domain Guide
title: Game UI Screen Recipes
description: Engine-neutral screen compositions with player task, lifetime, input, state, recovery, and acceptance cases.
domain: game-ui
lifecycle: experimental
provenance_kind: local
---

# Game UI Screen Recipes

Primary role: game screen composition catalog.

## Repository Boundary

These are fictional compositions of [Screen Hierarchy](screen-hierarchy.md) roles. They prescribe no engine tree, artwork, or reusable Layout CSS. Use the [Decision Tree](decision-tree.md) to select by player task; record real references with the [Reference Record](reference-record.md).

## Reusable Method

For the selected recipe, name the persistent owner, screen or entity owner, active input recipient, exceptional states, and exit behavior. Each acceptance case below is an expected result awaiting consumer execution.

## Play Status And Input

Primary classes: `hud` and separately classified `input-surface` regions. A session-owned HUD presents player status, objectives, and contextual prompts. Entity-linked markers follow entity lifetime; virtual controls own their active press/drag state. HUD data observes gameplay authority rather than predicting confirmed rewards or inventory changes.

Keep critical state understandable when an effect is absent. Distinguish zero value from unavailable data. Record how spectator, respawn, controller disconnection, and menus change visibility and input routing.

Acceptance case: open a blocking menu while an action is held; release the action, close the menu, and confirm no stuck input remains. Destroy a marked entity and confirm its marker and subscriptions are removed.

## Pause And Navigation

Primary class: `navigation`. A screen host owns destinations; a pause overlay owns its focus scope and return target. The simulation/session owner decides whether play pauses. Audio, background input, and timers have explicit policies.

Preserve navigation selection when opening settings and returning. Loading a new destination invalidates old screen callbacks. Cancel should consume one active layer at a time.

Acceptance case: pause → settings → confirmation → cancel three times. Verify each step closes only the intended layer and restores the previous selection. For network play, verify the UI does not claim the world is paused when it continues.

## Blocking Decisions And Connection

Primary classes: `dialog` or `system-status`. A modal host owns blocking and focus; a connection service owns retry state. Keep message, available actions, retry state, and outcome distinct. Only block input that conflicts with the required decision.

Reconnection success must reconcile the current screen, which may differ from the screen present at failure. A retry response from an earlier attempt cannot dismiss a newer failure. Define whether a system notice supersedes, queues behind, or composes with an existing modal.

Acceptance case: lose connection during an inventory operation, open a system notice, then receive an old retry response. The current error/operation state remains authoritative and dismissal leaves no invisible blocker.

## Inventory And Comparison

Primary class: `inventory`. A screen owns filters, selection, and focus history. The data service owns item identity and confirmed equipment; a detail region owns the selected item's presentation. List/grid cells receive explicit data and selection state.

Compare by stable item identity, not cell position. Separate selected, equipped, unavailable, pending, and failed states. Preserve selection where possible after filtering or sorting; document a fallback when the item disappears.

Acceptance case: select item A, request equip, select B, then resolve A. A's result updates inventory truth while detail remains on B. Test empty inventory, maximum content, long localized attributes, and a disabled first item.

## Results And Progression

Primary class: `progression`. The completed-match/session record owns final values; presentation may stage reveal of those values. Reveal completion does not grant rewards. Skip reveals the confirmed final state once; replaying a presentation cannot duplicate a grant.

Distinguish provisional, confirmed, and unavailable results. Preserve a readable result summary after a flourish. A disconnected client must not present an unconfirmed reward as owned.

Acceptance case: skip twice, navigate away, and reopen results. The grant count stays unchanged, and the same authoritative result is shown. Test zero rewards and a reward list longer than the visible region.

## Offers And Acquisition

Primary class: `commerce`. The catalog owns offer identity, the purchase service owns transaction outcome, and the UI owns selection and acknowledgement. Show the item, total cost, currency, and eligibility before commitment. Pending, rejected, cancelled, expired, and fulfilled are different states.

Do not derive success from a button effect or optimistic currency subtraction. Reconcile price/availability changes before accepting a commitment. Duplicate input must follow the transaction contract.

Acceptance case: change availability between selection and submission, fail a request, and retry. The UI explains the current offer and never reports an unconfirmed acquisition. Actual payments and platform purchasing rules require consumer-specific verification.

## Teaching And Narrative

Primary classes: `tutorial` or `narrative`. A step/story controller owns progress; presentation owns text, highlight, voice/subtitle synchronization, and skip controls. Identify whether gameplay continues and whether a teaching step intentionally restricts input.

A tutorial must explain a usable alternative when the expected device is absent. Narrative skip semantics distinguish advancing one line, finishing a scene, and suppressing future presentation. Progress must not depend only on a reveal animation finishing.

Acceptance case: switch input mode midway through a tutorial, interrupt dialogue with a system modal, and return. Prompts match the current input, the story/step index remains correct, and required instructions can still be read.

## Opinionated Guidance

Keep screens thin enough that authoritative data survives their teardown when needed. Give each modal, transient effect, and world marker an explicit owner even when they share visual treatment.

## Platform-Specific Guidance

Map roles through the engine-specific guides. Safe areas, scaling, text shaping, controller focus, and accessibility capabilities require the actual engine, version, and target platform. A browser prototype is not evidence of console or engine behavior.

## Unsupported Absolutes

These recipes are not a universal game UX taxonomy, tested architecture, or proof of accessibility. A successful screenshot cannot prove operation integrity, input isolation, or teardown.

## Verification Contract

Run the chosen acceptance case with every declared input, target aspect ratios/safe areas, long localization, error/empty states, and interruptions. Record observed results in the [Verification Workflow](verification-workflow.md). `consumer_reference: not_applicable` applies here because these fictional compositions select no consumer record. Review when a runtime observation contradicts an ownership or recovery rule.

## Source, License, And Attribution

Locally authored fictional recipes with no copied game assets or implementation. Player classes and hierarchy roles come from this domain's local contracts.

## IA Navigation

Parent: [Game UI](index.md).
Next: [Game UI Verification Workflow](verification-workflow.md).
