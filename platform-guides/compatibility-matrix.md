---
type: Domain Guide
title: Platform Compatibility Matrix
description: Separate transferable interaction intent from platform capabilities, target fallbacks, and required evidence.
domain: platform-guides
lifecycle: experimental
provenance_kind: local
---

# Platform Compatibility Matrix

Primary role: adaptation comparison and verification checklist.

## Repository Boundary

This matrix compares responsibilities, not API support versions. It is not a browser compatibility database. A row's target behavior is a proposed adaptation until verified on the consumer's named runtime.

## Reusable Method

Choose the relevant concern, read its platform source guide, record native facts and target decisions separately, and execute both the preferred and fallback paths. Use the [Adaptation Workflow](adaptation-workflow.md) for the handoff.

## Comparison Matrix

| Concern | Source route | Transferable intent | Target boundary and fallback | Required observation |
| --- | --- | --- | --- | --- |
| Motion preference | [Apple](apple-interaction.md) | Essential information remains available with less motion | Web preference handling belongs to [Motion recipes](../motion/interaction-recipes.md); retain static status | Change preference and interrupt an active transition |
| Return navigation | [Android](android-interaction.md) | Understand destination and preserve recoverable state | Browser history, parent links, and host Back are distinct; direct entry needs a known parent route | Normal return, direct entry, cancellation, missing prior item |
| Adaptive presentation | [Android](android-interaction.md) | Preserve the task as available space changes | Native units/class cutoffs do not define Layout breakpoints; use the target's content constraints | Resize without losing query, selection, or focus |
| Keyboard traversal | [Windows](windows-interaction.md) | Reach actions and move predictably within controls | Follow the chosen web semantic pattern; visible controls remain operable | Tab/reverse traversal, inner navigation, editing, dismissal |
| Shortcuts | [Windows](windows-interaction.md) | Efficient access to a named command | OS/browser-reserved keys may be unavailable; retain a visible command | Reserved key path, disabled command, active text editor |
| Multimodal feedback | [Apple](apple-interaction.md) | Communicate cause and result through available channels | Haptics/audio may be unavailable or inappropriate; retain essential visual/text feedback | Muted/unavailable channels and the actual target device |
| Translucent treatment | [Apple](apple-interaction.md) | Keep foreground hierarchy understandable | Native materials do not translate to CSS equivalence; an opaque treatment is a candidate fallback | Actual contrast/readability across backgrounds and preferences |

## Target Evidence Matrix

| Axis | Record | What a missing check means |
| --- | --- | --- |
| Runtime | Exact browser/app engine, OS, relevant library/SDK versions | No claim beyond the exercised runtime |
| Input | Keyboard, pointer, touch, controller, assistive technology as claimed | An untested mode is `not_run`, not a pass |
| Preferences | Motion, contrast, text sizing, other relevant settings | Source support does not prove local handling |
| Navigation | Direct entry, return, cancellation, nested overlays | A successful happy path leaves recovery unproven |
| Capability | Available, unavailable, denied, interrupted where relevant | Fallback behavior must be exercised independently |
| State | Normal, pending, failed, empty, stale or removed data | A screenshot of default state is insufficient |

## Scroll Story Target Cases

Use [Motion's scroll-story contract](../motion/interaction-recipes.md#scroll-driven-story) when the target is a browser scene controlled by scrolling. Record CSS timeline support at the tested version, feature-unavailable fallback, wheel/trackpad/keyboard/touch input actually used, browser history restoration, and resize/orientation changes. Viewport emulation is evidence of layout at that size, not of mobile hardware or touch physics.

Require readable static chapters when the stage cannot fit. Test reduced-motion changes during an active scene, not just the startup preference. The [Scroll Story Lab](../examples/scroll-story/README.md) supplies a target implementation and separates its observed results from untested runtime/device cases.

## Fixed-Viewport Scene Target Cases

The [scene-navigation contract](../motion/interaction-recipes.md#full-viewport-scene-navigation) adds input arbitration to scene rendering. Test wheel bursts and momentum tails, reverse gestures, horizontal input, modifier zoom, native copy scrolling at both edges, keyboard editing, visible navigation, direct hashes, and browser Back/Forward. Touch testing includes swipe start outside the owned art surface, cancellation, a second pointer, pinch zoom, and orientation changes.

The [worked example](../examples/scene-navigation/README.md) has desktop-emulated input evidence and an explicit reading escape. Physical trackpad behavior, browser chrome resizing on a phone, iOS Safari, Android, and assistive technology need separate actual-device runs. Never relabel CDP touch injection or a 375-pixel viewport as physical-device verification.

## Example Record

```yaml
concern: keyboard-traversal
source_guide: platform-guides/windows-interaction.md
target: # actual browser, OS, widget semantics and versions
decision: # the target interaction contract
fallback: # complete visible operation path
source_rechecked: # date and exact official locator
actual_result: not_run
limitations: # untested inputs, runtimes, and capabilities
consumer_reference: not_applicable
consumer_reference_reason: This blank comparison selects no consumer record.
```

## Opinionated Guidance

Test fallback paths deliberately rather than waiting for accidental unsupported hardware. A successful fallback should preserve the task, though its presentation may differ.

## Platform-Specific Guidance

Apple, Android, and Windows guide pages own their dated official-source sets. Recheck them for native claims and separately verify the target runtime. Game-engine adaptation routes to [Game UI](../game-ui/index.md).

## Unsupported Absolutes

No row claims visual, semantic, accessibility, or performance equivalence between platforms. No generic “mobile” or “desktop” label replaces the actual runtime/input matrix.

## Verification Contract

An adaptation is reviewable when each selected row has a target decision, fallback, observed result, and limitation. Missing capability or runtime evidence stays explicit. Review when a linked source, target capability, or failed user task changes the mapping.

The [Interaction Lab verification](../examples/domain-interactions/verification.md) records a macOS browser target for keyboard traversal, modal cancellation, history, content resizing, and reduced-motion preference changes. Small browser viewports are not mobile-device evidence; Android, iOS/iPadOS, Windows-native APIs, haptics, controllers, and assistive technology remain outside that run.

## Source, License, And Attribution

Locally authored comparison matrix derived from this domain's linked source reviews. Platform owners retain authority over their own conventions; no upstream table is reproduced.

## IA Navigation

Parent: [Platform Guides](index.md).
Next: [Platform Adaptation Workflow](adaptation-workflow.md).
