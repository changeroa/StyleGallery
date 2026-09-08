---
type: Domain Guide
title: Motion Vocabulary
description: Evidence-bounded method and reference for naming observable interface motion.
domain: motion
lifecycle: experimental
source_repository: https://github.com/emilkowalski/skills
source_path: skills/animation-vocabulary/SKILL.md
source_revision: 220e8607c90b17337d210125777b7b695f26c221
---

# Motion Vocabulary

Primary role: motion terminology reference.

## Repository Boundary

This page helps a reader name observed motion. It does not prescribe implementation, authorize motion in reusable Layout CSS, or make a product-quality judgment.

The terms are implementation-neutral. A framework, operating-system behavior, or branded example may illustrate a term only when clearly labeled and separately verified.

## Reusable Method

1. Record what changes: presence, position, scale, shape, state, scroll relationship, or feedback.
2. Record what coordinates the change: time, sequence, input, velocity, or viewport progress.
3. Compare the observation with the closest term families below.
4. Return one exact term only when the observed cues distinguish it.
5. When multiple terms remain plausible, return ordered candidates and state the missing observation.
6. When nothing matches, return `unknown`; do not invent a canonical winner.

## Term Families

| Term | Observed cues | Distinguish from | Implementation-neutral meaning | Evidence boundary |
| --- | --- | --- | --- | --- |
| Fade | Visibility changes without a necessary spatial path. | Reveal | A gradual visibility change. | Does not imply opacity is the implementation. |
| Slide | The element follows a directional path into, out of, or within a region. | Shared-element transition | A positional transition without necessarily preserving identity across views. | Direction and clipping must be observed. |
| Scale transition | Apparent size changes around an origin. | Morph | Size changes while the element's basic identity remains stable. | Does not establish the correct origin or amount. |
| Reveal | A boundary progressively exposes content. | Fade | Visibility is controlled by an advancing edge, mask, or equivalent boundary. | The masking mechanism may be unknown. |
| Stagger | Similar elements begin related changes at distinct offsets. | Orchestration | A repeated sequence pattern, usually across peers. | The offset value is product-specific. |
| Orchestration | Several motion events form one coordinated sequence. | Stagger | Coordination may include different elements, jobs, and timings. | Intent must be documented, not inferred from timing alone. |
| Crossfade | One state loses visibility while another gains it in the same region. | Morph | Identity is exchanged rather than geometrically transformed. | Overlap and source order need inspection. |
| Shared-element transition | A recognizable element appears to retain identity between states or views. | Layout animation | Continuity connects a source representation with a destination representation. | Identity continuity is a perception claim requiring rendered evidence. |
| Layout animation | A spatial change is visually interpolated instead of appearing instantly. | Shared-element transition | Position or size changes within the layout state of an element. | Does not endorse animating layout-triggering CSS properties. |
| Scroll-driven motion | Progress corresponds to scroll progress. | Scroll reveal | The scroll position continuously controls progress rather than merely triggering entry. | Browser and input behavior require local testing. |
| Parallax | Layers appear to travel at different rates during a shared movement. | Ordinary scroll | Relative speed creates a depth cue. | Depth, comfort, and reduced-motion outcomes are not guaranteed. |
| Spring motion | Response is modeled as a target-seeking dynamic system rather than a fixed timeline. | Bounce | A spring may settle without visible overshoot. | Parameters and perceived duration remain implementation-specific. |
| Bounce | Motion overshoots or reverses before settling. | Spring motion | Visible overshoot is the defining cue, regardless of implementation. | Playfulness and appropriateness are product judgments. |
| Interruptible motion | New input redirects a change from its current presented state. | Restarted animation | Continuity is maintained when the target changes mid-flight. | Requires interaction evidence, not source inspection alone. |
| Rubber-band response | Movement continues beyond a boundary with increasing resistance, then returns. | Bounce | Resistance is tied to boundary overshoot and direct manipulation. | Platform examples are not a universal physics contract. |
| Jank | Motion visibly misses expected visual continuity. | Intentional stepped motion | The discontinuity is unintended and associated with delivery or computation limits. | Frame or performance evidence is needed to attribute cause. |

## Opinionated Guidance

The family ordering favors what a reader can observe before implementation details. It is useful for retrieval, but it is not a complete ontology. Add a term only when contrastive repository cases show that existing terms and aliases cannot express the distinction.

## Platform-Specific Guidance

Names tied to iOS, macOS, a browser API, Motion, Framer Motion, React, or a component library are examples or implementation facets. Keep the cross-platform term primary and label the platform context separately.

## Unsupported Absolutes

- Do not call this vocabulary authoritative outside StyleGallery.
- Do not force the nearest term when the observation is incomplete.
- Do not attach universal FPS, GPU, duration, easing, or reduced-motion rules to a definition.
- Do not infer implementation technology from rendered appearance alone.

## Verification Contract

A vocabulary lookup should exercise exact, ambiguous, and unknown cases. Pass requires one justified term, an ordered candidate set with a stated distinction, or `unknown`; invented winners fail. A new term also requires contrastive exact, ambiguous, and unknown cases showing that the current vocabulary cannot express the distinction.

## Source, License, And Attribution

- Upstream inspiration: [animation-vocabulary/SKILL.md](https://github.com/emilkowalski/skills/blob/220e8607c90b17337d210125777b7b695f26c221/skills/animation-vocabulary/SKILL.md)
- Snapshot: `220e8607c90b17337d210125777b7b695f26c221`
- Upstream license: MIT, Copyright (c) 2026 Emil Kowalski.
- Reuse form: independent method rewrite; upstream prose, tables, code, examples, and distinctive ordering were not retained.
- Evidence boundary: the upstream artifact records practitioner terminology; it does not prove local performance, accessibility, usability, or quality.

## IA Navigation

Parent: [Motion](index.md).
Next: [Motion Review Workflow](review-workflow.md).
