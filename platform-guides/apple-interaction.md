---
type: Domain Guide
title: Apple Interaction As A Comparative Reference
description: Bounded comparison of Apple interaction themes with explicit web-adaptation and provenance limits.
domain: platform-guides
lifecycle: experimental
source_repository: https://github.com/emilkowalski/skills
source_path: skills/apple-design/SKILL.md
source_revision: 220e8607c90b17337d210125777b7b695f26c221
platform: Apple platforms
platform_version: verify-current
reviewed_on: 2026-09-08
---

# Apple Interaction As A Comparative Reference

Primary role: platform comparison guide.

## Repository Boundary

This page uses selected Apple-platform interaction themes as comparative questions. It does not reproduce Apple guidance, establish affiliation, prescribe imitation, or treat a native implementation value as valid for the web.

Current official Apple documentation is required for Apple-specific claims. Current web standards and browser documentation are required for web adaptation. Local rendered, device, accessibility, and performance evidence is required for product conclusions.

## Reusable Method

For each proposed comparison:

1. Name the user task, platform, OS/API version, input method, and state transition.
2. Describe the observable behavior without branded terminology.
3. Identify the platform convention and its current official source.
4. Separate the reusable interaction question from native implementation details.
5. Define the web adaptation, including unavailable or materially different capabilities.
6. Verify the adapted behavior on its real surface and record what remains unproven.

## Official Source Review And Worked Adaptation

Official [HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion) and [HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) were rechecked on 2026-09-08 through Apple's documentation data for [Motion](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/motion.json) and [Accessibility](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json). This is a dated living-document review, not a pin of shipped OS behavior. The motion guidance supports purposeful, optional motion and cancellation; it does not supply universal web animation parameters.

Worked proposal: a web settings disclosure opens immediately and keeps its trigger operable. Optional movement communicates the revealed region. Under reduced motion, the same content and controls remain available without unnecessary movement. Use [Motion Disclosure](../motion/interaction-recipes.md#disclosure) for the behavior contract and the [Adaptation Workflow](adaptation-workflow.md) for the source/target record.

Expected cases: open and close by keyboard, reverse while opening, enlarge the text, hide content while focus is inside, and change the motion preference. Actual result: `not_run`; this proposal is not a tested Apple or browser implementation. `consumer_reference: not_applicable` because the worked proposal selects no consumer-owned record.

## Comparative Questions

| Theme | Question to investigate | Required evidence | Boundary |
| --- | --- | --- | --- |
| Response | Does feedback begin close enough to input to preserve cause and effect? | Interaction recording and input-state trace | No universal latency value is implied. |
| Direct manipulation | Does the presented state follow, cancel, and resume from user input coherently? | Repeated drag/reversal test on target input modes | One-to-one tracking is not always required. |
| Interruption | Can new input redirect a transition without jumping or locking control? | Mid-transition retarget and reversal evidence | Springs are one option, not a requirement. |
| Velocity continuity | Does release-to-settle behavior avoid an observable seam? | Gesture and presented-state recording | Native velocity APIs and web libraries differ. |
| Spatial consistency | Can the reader understand where content came from and where it returns? | Before/intermediate/after render plus source/focus order | Visual path cannot override semantic order. |
| Recoverability | Can a user cancel, reverse, undo, or safely recover where the task requires it? | Task and error-path evidence | Confirmation is not universally preferable to undo. |
| Wayfinding | Can the interface answer location, available destinations, contents, and exit? | Navigation task evidence | Familiar platform placement may not transfer across products. |
| Soft boundaries | Would progressive resistance communicate a limit better than a hard stop? | Comparative prototype and input/device evidence | The resistance curve is not standardized across platforms. |
| Multimodal feedback | Do visual, audio, and haptic cues share a clear cause and useful purpose? | Device timing and accessibility evidence | Web haptics/audio are not native equivalents and may be unavailable. |
| Adaptive presentation | Does the interface remain usable across text size, contrast, transparency, motion preference, input, and viewport changes? | Relevant preference and constraint matrix | A platform feature name does not prove web accessibility. |

## Opinionated Guidance

Momentum-aware settling, source-anchored transitions, progressive boundary resistance, and carefully coordinated feedback can be useful hypotheses for directly manipulated interfaces. Translucent materials, system typography, haptics, and visual delight are product and platform choices outside reusable Layout pattern CSS.

## Platform-Specific Guidance

- iOS/macOS gesture physics, native spring APIs, Dynamic Type, system materials, haptics, and SwiftUI/UIKit behavior must be labeled as Apple-specific.
- Any value described as shipped by Apple requires a direct, current official source and version.
- A web mapping must identify browser support, input differences, accessibility behavior, and fallback semantics.
- `backdrop-filter`, the Vibration API, web media queries, and JavaScript animation libraries are not equivalents merely because they can approximate one visible effect.

## Unsupported Absolutes

- Do not call an upstream formula or parameter an exact Apple implementation without a primary official source.
- Do not require direct manipulation to track one-to-one in every context.
- Do not require audio and haptic events on one exact frame as a universal web contract.
- Do not claim translucent chrome is generally superior to opaque structure.
- Do not adopt a single spring configuration as a safe default across tasks.
- Do not import a named set of Apple principles as StyleGallery's shared principles.
- Do not infer native behavior, platform affiliation, or accessibility from visual similarity.

## Verification Contract

Record the official platform source and version, the web-standard or browser source for adaptation, the exact target devices and input modes, relevant user preferences, and the observed pass/fail behavior. Use a real interactive prototype for interaction claims. State explicitly when native behavior cannot be reproduced or verified on the web.

Review this page when Apple changes the cited convention, the web platform changes the adaptation surface, the source revision changes, or local testing contradicts the guidance. `platform_version: verify-current` prevents this experimental page from masquerading as a version-pinned platform contract.

## Source, License, And Attribution

- Upstream inspiration: [apple-design/SKILL.md](https://github.com/emilkowalski/skills/blob/220e8607c90b17337d210125777b7b695f26c221/skills/apple-design/SKILL.md)
- Snapshot: `220e8607c90b17337d210125777b7b695f26c221`
- Upstream license: MIT, Copyright (c) 2026 Emil Kowalski.
- Reuse form: independent method rewrite; upstream prose, tables, code, exact-value sequences, Apple/WWDC-derived expression, and quotations were not retained.
- Evidence boundary: the upstream artifact is a practitioner interpretation and provenance record, not an official Apple or web-platform source.

## IA Navigation

Parent: [Platform Guides](index.md).
Next: [Layout](../layout/index.md).
