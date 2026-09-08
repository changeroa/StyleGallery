---
type: Domain Guide
title: Platform Adaptation Workflow
description: Compare a native convention with a target implementation through source, capability, fallback, and evidence records.
domain: platform-guides
lifecycle: experimental
provenance_kind: local
---

# Platform Adaptation Workflow

Primary role: platform comparison planning and handoff.

## Repository Boundary

Use a platform convention as a sourced comparison for a named task. The native platform owns its convention; the target's standards and actual runtime determine the adaptation. This workflow does not make a visual imitation equivalent to native behavior.

## Reusable Method

1. Name the task and target: native application, browser, embedded web view, or game engine.
2. Select [Apple](apple-interaction.md), [Android](android-interaction.md), or [Windows](windows-interaction.md) by source platform.
3. Record an official source, exact page section, version or dated reading, and re-review trigger.
4. Separate the observed/native fact from the transferable interaction question.
5. Choose an adaptation and an explicit fallback using the [Compatibility Matrix](compatibility-matrix.md).
6. Execute the target-specific acceptance cases and record what was not tested.

## Adaptation Record

| Field | Required content |
| --- | --- |
| Task | The user action, intended outcome, and affected state |
| Source context | Platform, OS/API or documentation version, source URL/section, review date |
| Source claim | The precise native fact supported by that source |
| Target context | Browser/OS/framework/device/input and relevant versions |
| Transferable question | What problem the convention helps investigate |
| Target decision | Implement, adapt, omit, or defer with a reason |
| Capability gap | Missing API, different input model, permission, or semantic difference |
| Fallback | A complete task path when the preferred capability is absent |
| Verification | Actions, expected and actual behavior, artifacts, source/build identity |
| Freshness | Source/API change or failed observation that triggers re-review |
| Handoff | `consumer_reference` record or `not_applicable` with a reason |

## Worked Comparison: Returning From Detail

Native source: Android's [predictive Back documentation](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture), reviewed 2026-09-08, describes gesture preview and cancellation. Transferable question: can a person understand and cancel a return before committing it?

Web decision: use the application's documented list/detail route and normal browser history. Restore the list's selection and relevant search state on return. Provide a visible return link where the task needs it. Do not intercept browser/system gestures merely to reproduce a preview.

Fallback: direct entry to a detail URL has no assumed prior list history; its visible parent link goes to the known collection route. Verification cases: navigate from a filtered list, return with browser Back, enter detail directly, cancel a local dialog before leaving, and return after the selected item is removed.

Actual result: `not_run`; this is a fictional adaptation proposal. `consumer_reference: not_applicable` because no consumer record is selected. The comparison claims neither native gesture support nor tested browser history restoration.

## Opinionated Guidance

Preserve the task and recovery path before reproducing the native effect. When a capability is absent, document an intentional complete alternative rather than a partially functioning control.

## Platform-Specific Guidance

The source platform and target platform are separate fields even when both run on the same device. A browser on Android does not expose every Android application API. A web view's embedding host may own navigation and permissions.

## Unsupported Absolutes

An official source establishes its own guidance, not target conformance. Similar appearance, shared vocabulary, or a matching API name is insufficient evidence of equivalent behavior.

## Verification Contract

A completed adaptation distinguishes source fact, local inference, target implementation, and actual observation. Verify unavailable capabilities, interrupted navigation, relevant preferences, and all claimed inputs. Re-review on a source change, target API change, or failed acceptance case; a review date alone is not proof of continuing support.

## Source, License, And Attribution

Locally authored comparison method and fictional example. The linked Android source was rechecked on 2026-09-08; prose and examples are independently written. Source access does not establish device execution.

## IA Navigation

Parent: [Platform Guides](index.md).
Next: [Platform Compatibility Matrix](compatibility-matrix.md).
