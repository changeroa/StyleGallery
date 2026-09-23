---
type: Domain Guide
title: Adaptive Navigation Across Platforms
description: Compare window adaptation, modal presentation, and Back ownership while preserving task identity across native and web surfaces.
domain: platform-guides
lifecycle: experimental
provenance_kind: local
platform: Apple applications, Android applications, Windows applications, and web adaptations
platform_version: dated official documentation; consumer OS, SDK, and browser versions required
reviewed_on: 2026-09-21
---

# Adaptive Navigation Across Platforms

Primary role: comparative navigation and adaptation guide.

## Repository Boundary

This page compares named platform conventions. It owns no CSS breakpoints, product visuals, or shared navigation implementation. Layout remains responsible for spatial constraints; [State Management](../design-engineering/state-management/index.md) owns route identity, drafts, and persistence.

## Reusable Method

Describe the current task independently of presentation: selected object, query, draft, parent destination, and active blocking surface. Then name which of those facts must survive a window change. Choose the target presentation and its navigation contract from available space and task needs, rather than from a device label.

### Dated Source Comparison

| Platform source | Bounded observation | Web adaptation question |
| --- | --- | --- |
| [Apple HIG layout](https://developer.apple.com/design/human-interface-guidelines/layout) | The guidance covers changing windows/displays, system safe areas, and text-size changes. | Does the task survive a changed content area and larger text? |
| [Apple HIG modality](https://developer.apple.com/design/human-interface-guidelines/modality) | Modal presentation is a scoped change of interaction context with dismissal obligations. | Which part of the workflow intentionally suspends background interaction? |
| [Apple HIG popovers](https://developer.apple.com/design/human-interface-guidelines/popovers) | Popover guidance is platform-specific and recommends a different presentation in compact iOS/iPadOS views. | Can the presentation change while preserving the same edit and explicit close policy? |
| [Android window size classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes) | Width and height are classified separately from available app space. The reviewed page includes compact, medium, expanded, large, and extra-large width classes. | Does the decision consider usable height as well as width? |
| [Android predictive Back](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture) | Enabled callbacks have scoped Back responsibilities; gesture handling and observation are distinct concerns. | Which active layer consumes Back, and does observation accidentally change navigation? |
| [Windows responsive techniques](https://learn.microsoft.com/en-us/windows/apps/design/layout/responsive-design) | Adaptation can change composition and presentation of controls as available space changes. | Does every required destination remain available after the transformation? |

Read on 2026-09-21. These are live documentation snapshots, not SDK pins. Android's reviewed window guidance was updated 2026-08-04 and predictive Back guidance 2026-09-18. Apple page bodies were inspected through their official documentation JSON because the HTML reader exposed a JavaScript shell. Native implementation claims require a named OS/API and an actual native run.

### Navigation Actions Are Different Operations

| Action | State it should address | Failure from conflation |
| --- | --- | --- |
| Browser/native Back | Navigation history according to the host contract | Closing a dialog and leaving the route in one action. |
| Parent/Up navigation | A defined parent destination | Assuming a direct-link visitor has a matching history entry. |
| Surface dismissal | Visibility and ownership of a temporary surface | Discarding a draft because a surface resized or changed form. |
| Operation cancellation | The actual pending operation and its acknowledgement | A closing animation falsely reports that a write was cancelled. |
| Selection change | Identity of the item being inspected | Selecting another item silently overwrites unsaved work. |

This table is a local comparison framework, not a common native dispatch algorithm. Each host retains its own semantics.

### Worked Adaptation: Detail Pane Becomes A Route

A document browser shows list and detail together when both fit. With less room, the selected document occupies the primary view. Record the selection once and derive presentation from it. Preserve the list query and any draft; do not create a second editor instance solely because a presentation boundary changed.

If a selection is encoded in the URL, decide whether presenting the same selection in a second pane creates a navigation event. A resize itself should not invent a new task history entry under this proposal. Direct links, browser refresh, and a missing selected document need explicit outcomes.

When a popover becomes a modal editor, re-evaluate focus containment and dismissal. A stored boolean such as `isPopoverOpen` does not describe whether the current surface is modal, what it edits, or which host receives Back. Represent the task and presentation separately.

## Opinionated Guidance

Prefer task-preserving transformations: keep identity and editable data stable while rearranging presentation. Define navigation with state transitions that a reviewer can inspect. Avoid copying a platform's numeric size boundaries into CSS without a separate content-fit rationale.

## Platform-Specific Guidance

Android density-independent units, Apple points/safe areas, Windows effective sizing, and browser CSS pixels belong to different target contracts. A visual resemblance does not establish unit equivalence. On the web, use [Layout's existing routes](../layout/index.md) to choose the spatial composition and verify it at the actual parent constraints.

Predictive Back progress and cancellation are native host behavior. A browser animation cannot by itself claim equivalent integration. For keyboard and focus adaptation, continue to [Input And Focus](input-and-focus.md).

## Unsupported Absolutes

A wide window does not identify a desktop device. A compact surface does not require a particular native component. A native Back callback is not interchangeable with browser history. A successful resize screenshot does not prove state continuity.

## Verification Contract

Proposed cases: resize while editing; open a direct detail link; navigate Back with an inner dialog open; cancel a native Back gesture; rotate with an onscreen keyboard present; enlarge text until a two-pane arrangement no longer fits; remove the selected item remotely.

For each case, record route/history, selected identity, draft value, active surface, and focused element before and after. Native claims need native execution; browser cases establish only the browser adaptation. No native or web execution is claimed here. Re-review when a cited convention, SDK, or navigation owner changes.

## Source, License, And Attribution

Locally authored synthesis of the linked Apple, Google, and Microsoft documentation, inspected 2026-09-21. No platform artwork, code, or distinctive source examples are reproduced. `consumer_reference: not_applicable` because no consumer navigation record is selected.

## IA Navigation

Parent: [Platform Guides](index.md).
Next: [Preferences And Accessibility](preferences-and-accessibility.md).
