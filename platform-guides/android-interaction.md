---
type: Domain Guide
title: Android Interaction As A Comparative Reference
description: Source-bounded Android Back and adaptive-window guidance with explicit web translation and failure cases.
domain: platform-guides
lifecycle: experimental
provenance_kind: local
platform: Android applications
platform_version: dated official documentation; target OS and AndroidX versions required
reviewed_on: 2026-09-08
---

# Android Interaction As A Comparative Reference

Primary role: Android platform comparison guide.

## Repository Boundary

This guide compares Android application behavior with a consumer's target. It does not equate Android APIs with browser APIs or prescribe Material visual treatment. Record the actual OS, AndroidX/UI stack, and target device before implementation.

## Reusable Method

Use the [Adaptation Workflow](adaptation-workflow.md). Choose a specific native concern below, inspect its source, then write the target behavior and fallback independently of native visuals.

## Source-Bounded Conventions

| Concern | Official source and bounded fact | Transferable question |
| --- | --- | --- |
| Back preview | [Predictive Back](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture) describes previewing a destination and cancelling a gesture; custom handling depends on the application stack | Is the destination understandable, and does cancelling preserve the current state? |
| Back ownership | The same source describes enabled callbacks and one recipient for a Back gesture | Which active layer consumes Back, and when does control return to the outer navigation owner? |
| Window adaptation | [Window size classes](https://developer.android.com/develop/adaptive-apps/guides/use-window-size-classes) classify available application window space for adaptive decisions | Does the screen adapt to its available space while preserving selection and task state? |
| Navigation transformation | [Responsive navigation](https://developer.android.com/develop/ui/views/layout/build-responsive-navigation) discusses changing navigation presentation with window conditions | Can the user reach the same destinations after presentation changes? |

These pages were read on 2026-09-08. They are a dated documentation set, not a pin of every Android release or package. Verify the implementation details for the selected runtime.

## Worked Adaptation: Compact List And Expanded Detail

Task: inspect a collection on a resizable surface. Native comparison: available window space can change the presentation. Target web decision: compose [List Detail](../recipes/list-detail.md), retain selected identity in application state, and let the Layout owner choose the fit constraint. Android's native units and class boundaries are not CSS breakpoints.

On a tight surface, the detail route can replace the list visually while preserving the query and selection. On a roomy surface, both can be visible. Returning must resolve a missing selected item explicitly. Changing presentation must not duplicate the current route or save unrelated navigation history entries.

| Action | Expected target behavior |
| --- | --- |
| Resize with item B selected | B remains the selected detail |
| Return to the list | Previous query remains available |
| Cancel an inner dialog | Dialog closes once; outer route stays put |
| Open detail directly | Parent navigation works without assuming prior history |

This is an unexecuted web proposal, not evidence of an Android build.

## Opinionated Guidance

Map Back, Up/parent navigation, dialog dismissal, and operation cancellation separately. They may share an icon or button position while changing different state.

## Platform-Specific Guidance

Android gesture progress, callback dispatch, activities, and AndroidX navigation belong to native or embedding-host code. A browser adaptation should use its supported navigation semantics. Record any web-view host integration as a separate implementation dependency.

## Unsupported Absolutes

Android window classes are not universal web breakpoints. A browser Back action is not necessarily an application's parent destination. A cancel animation does not prove the underlying operation was cancelled.

## Verification Contract

Test gesture completion/cancellation on the declared native device when claiming native behavior. For a web adaptation, test actual browser history, direct links, resizes, input modes, and dialog focus independently. Review when any cited convention or target navigation implementation changes.

## Source, License, And Attribution

Locally authored synthesis of the official Android pages linked above, rechecked 2026-09-08. No source code, tables, or native visual assets are reproduced. `consumer_reference: not_applicable` because this reference guide selects no consumer implementation record.

## IA Navigation

Parent: [Platform Guides](index.md).
Next: [Platform Compatibility Matrix](compatibility-matrix.md).
