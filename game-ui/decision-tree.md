---
type: Domain Guide
title: Game UI Decision Tree
description: Select player-task recipes, ownership boundaries, and engine routes from the screen's purpose.
domain: game-ui
lifecycle: experimental
provenance_kind: local
---

# Game UI Decision Tree

Primary role: game screen planning route.

## Repository Boundary

This route selects game-interface responsibilities independently of engine and art direction. The [Classification](classification.md) remains the local taxonomy; the [Screen Hierarchy](screen-hierarchy.md) defines ownership roles.

## Reusable Method

1. Write the player's question while the interface is visible.
2. Choose one primary task class from the table below.
3. Decide whether play continues and which input actions must be blocked.
4. Assign lifetime, focus, sorting, and state ownership.
5. Adapt a [Screen Recipe](screen-recipes.md), then run the [Verification Workflow](verification-workflow.md).

## Player Task Route

| Player question | Primary class | Recipe |
| --- | --- | --- |
| What is happening during play? | `hud` | [Play status and input](screen-recipes.md#play-status-and-input) |
| How do I perform an action? | `input-surface` | [Play status and input](screen-recipes.md#play-status-and-input) |
| Where can I go, pause, or leave? | `navigation` | [Pause and navigation](screen-recipes.md#pause-and-navigation) |
| What decision requires attention? | `dialog` | [Blocking decisions and connection](screen-recipes.md#blocking-decisions-and-connection) |
| Is the game ready or connected? | `system-status` | [Blocking decisions and connection](screen-recipes.md#blocking-decisions-and-connection) |
| What can I equip or compare? | `inventory` | [Inventory and comparison](screen-recipes.md#inventory-and-comparison) |
| What have I earned or unlocked? | `progression` | [Results and progression](screen-recipes.md#results-and-progression) |
| What can I obtain, and at what cost? | `commerce` | [Offers and acquisition](screen-recipes.md#offers-and-acquisition) |
| What should I learn next? | `tutorial` | [Teaching and narrative](screen-recipes.md#teaching-and-narrative) |
| What story is being presented? | `narrative` | [Teaching and narrative](screen-recipes.md#teaching-and-narrative) |

If a screen contains several tasks, classify regions independently. A purchase confirmation inside an inventory screen is a dialog owned by a commerce operation; it is not another inventory slot.

## Ownership Decisions

| Decision | Record before implementing |
| --- | --- |
| Lifetime | Application, session, scene, screen, entity, or one operation |
| Play relationship | Continues, pauses locally, or requests a networked pause; identify authority |
| Input | Active action map, focus owner, pointer/gamepad coexistence, cancellation |
| Ordering | Screen, HUD, world-linked, modal, or transient host; name competing hosts |
| Data | Authoritative state versus preview, selection, pending operation and stale data |
| Exit | What is restored, destroyed, retained, or reconciled |

## Worked Selection

A loadout screen shows owned equipment, character attributes, and a purchase button for an unavailable slot. Inventory is primary; comparison is a supporting region. The purchase flow is commerce and any confirmation is a modal decision. Closing the modal returns to the same slot. Losing connection updates operation status without clearing the loadout selection. A server response after the screen closes belongs to the operation owner, not a destroyed view.

## Opinionated Guidance

Separate the player's task from visual genre. Assign one cancellation owner for each active layer so the same Back/Cancel input does not dismiss a dialog and its parent screen together.

## Platform-Specific Guidance

For Unity, select the [UI System](unity/ui-systems.md), map [Architecture](unity/architecture.md), then use the [CLI Loop](unity/cli-loop.md) for the declared stack. Other engines retain these role contracts but require their own verified API mapping; no cross-engine runtime equivalence is claimed.

## Unsupported Absolutes

A pause menu does not imply multiplayer simulation can pause. Hierarchy order does not prove input blocking, focus, or sorting. A taxonomy label does not establish rendered behavior.

## Verification Contract

Check one ordinary screen, one overlay composition, and one unexpected interruption such as disconnection or scene teardown. Every active layer needs a named lifetime, input, sorting, and exit owner. Revisit the route if a real player task cannot be classified without forcing unrelated responsibilities together.

## Source, License, And Attribution

Locally authored route and fictional loadout case. It imports no game assets, third-party hierarchy, or engine code.

## IA Navigation

Parent: [Game UI](index.md).
Next: [Game UI Screen Recipes](screen-recipes.md).
