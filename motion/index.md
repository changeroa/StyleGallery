# Motion

The Motion domain owns terminology, review procedure, and evidence-bounded practice guidance for product-layer motion.

## Scope Boundary

In scope: naming observable motion, reviewing declared behavior, distinguishing heuristics from measured contracts, and identifying evidence needs.

Out of scope: universal timing or easing rules, unmeasured performance claims, and permission to add animation or decorative properties to reusable Layout pattern CSS.

## Start Here

| Task | Route |
| --- | --- |
| Choose a behavior from the user task. | [Motion Decision Tree](decision-tree.md) |
| Record states, owners, interruption, and evidence. | [Motion Brief](motion-brief.md) |
| Build a scroll-driven product story and inspect runnable examples. | [Scroll-driven Story](interaction-recipes.md#scroll-driven-story) and [Scroll Story Lab](../examples/scroll-story/README.md) |
| Keep the page fixed while navigating between full-screen chapters. | [Full-viewport Scene Navigation](interaction-recipes.md#full-viewport-scene-navigation) and [runnable example](../examples/scene-navigation/README.md) |
| Apply feedback, disclosure, modal, reorder, progress, and drag contracts. | [Motion Interaction Recipes](interaction-recipes.md) |
| Copy a working GSAP ScrollTrigger and Lenis setup, pinned horizontal travel, or a CSS scroll-timeline scrub. | [Scroll Choreography Technique](techniques/scroll-choreography.md) |
| Copy split-word headline rises, scroll-lit paragraphs, count-ups, or a marquee. | [Kinetic Type Technique](techniques/kinetic-type.md) |

These workflows and worked cases are usable experimental guidance. Expected-result tables are test designs; actual product, engine, and reader evidence must be recorded separately. Review on a failed task, a source change, or a changed ownership contract.

## Documents

- [Motion Vocabulary](vocabulary.md) maps observed behavior to implementation-neutral terms while preserving ambiguity.
- [Motion Review Workflow](review-workflow.md) structures evidence-first review and remediation.
- [Motion Practice Reference](practice-reference.md) classifies mechanics, heuristics, platform notes, and unsupported claims.
- [Observed Choreography Transcription](observed-choreography.md) transcribes an observed scroll choreography into Scene Composition Contract vocabulary.

## Source-Backed Deep Dives

- [Accessible Motion And Equivalent Feedback](accessible-motion.md). Separate motion preferences, automatic updates, and equivalent feedback.
- [Interruption And Retargeting](interruption-and-retargeting.md). Resolve repeated input, cancellation, and stale completion callbacks.
- [Motion Rendering And Performance](rendering-and-performance.md). Choose native mechanisms and diagnose measured delivery failures.

## Visual Reference: Motion Prompt

[Motion Prompt by @ssaengcho](https://motion-prompt-ssaengcho.soldaeng-guri.chatgpt.site/#top) is an external Korean motion dictionary for comparing effects visually and describing the intended movement. Its interface lists 36 effects and five combinations across entrance/exit, emphasis, sequencing, space, scene transitions, shape/focus, timing, and text.

Use it to select an observable effect, then record the actual product behavior in the [Motion Brief](motion-brief.md): trigger, moving property, start/end state, interruption, reduced-motion alternative, and completion feedback. For example, distinguish moving an element from moving imagery inside a stationary frame, and distinguish changing opacity from revealing through a moving mask.

The dictionary's example durations and prompts are reference choices, not StyleGallery defaults or measured performance guarantees. Its naming is not a replacement for the [Motion Vocabulary](vocabulary.md). This link is a discovery reference, not a bundled implementation.

Source review: 2026-09-28. The public page and effect definitions were inspected; no source code, prompt collection, or artwork is reproduced here. Cross-browser behavior, accessibility, and every rendered combination have not been verified.

## Domain Contract

See [StyleGallery Domains](../DOMAINS.md) for lifecycle, provenance, page membership, and staleness rules.

## IA Navigation

Parent: [StyleGallery](../index.md).
Next: [Motion Decision Tree](decision-tree.md).
