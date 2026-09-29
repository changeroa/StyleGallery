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

The dictionary's example durations and prompts are reference choices, not StyleGallery defaults or measured performance guarantees. Its naming is not a replacement for the [Motion Vocabulary](vocabulary.md).

[Run all 41 local examples](https://style.gallery/examples/category/guide/?q=Motion%20Prompt). Every effect and combination has its own execution page, timeline scrubber, restart, pause, reverse, final-state control, and reduced-motion alternative. Local examples use StyleGallery's theme rather than copying the reference site's presentation.

### Complete Effect Inventory

| No. | Source effect | Local execution |
| --- | --- | --- |
| 1 | Fade in | [페이드 인](https://style.gallery/examples/guide/motion-prompt-fade/) |
| 2 | Slide in | [슬라이드 인](https://style.gallery/examples/guide/motion-prompt-slide/) |
| 3 | Scale in | [스케일 인](https://style.gallery/examples/guide/motion-prompt-scale/) |
| 4 | Mask reveal | [마스크 리빌](https://style.gallery/examples/guide/motion-prompt-mask/) |
| 5 | Overshoot | [오버슈트](https://style.gallery/examples/guide/motion-prompt-over/) |
| 6 | Bounce | [바운스](https://style.gallery/examples/guide/motion-prompt-bounce/) |
| 7 | Pulse | [펄스](https://style.gallery/examples/guide/motion-prompt-pulse/) |
| 8 | Shake | [셰이크](https://style.gallery/examples/guide/motion-prompt-shake/) |
| 9 | Stagger | [스태거](https://style.gallery/examples/guide/motion-prompt-stagger/) |
| 10 | Typewriter | [타이프라이터](https://style.gallery/examples/guide/motion-prompt-type/) |
| 11 | Tracking animation | [트래킹 애니메이션](https://style.gallery/examples/guide/motion-prompt-tracking/) |
| 12 | Trim paths | [트림 패스](https://style.gallery/examples/guide/motion-prompt-line/) |
| 13 | Zoom in | [줌 인](https://style.gallery/examples/guide/motion-prompt-zoom/) |
| 14 | Panning | [패닝](https://style.gallery/examples/guide/motion-prompt-pan/) |
| 15 | Position inside mask | [프레임 내부 이동](https://style.gallery/examples/guide/motion-prompt-crop/) |
| 16 | Parallax | [패럴랙스](https://style.gallery/examples/guide/motion-prompt-parallax/) |
| 17 | Cross dissolve | [크로스 디졸브](https://style.gallery/examples/guide/motion-prompt-dissolve/) |
| 18 | Wipe | [와이프](https://style.gallery/examples/guide/motion-prompt-wipe/) |
| 19 | Push | [푸시](https://style.gallery/examples/guide/motion-prompt-push/) |
| 20 | Iris reveal | [아이리스 리빌](https://style.gallery/examples/guide/motion-prompt-iris/) |
| 21 | Rotation | [로테이션](https://style.gallery/examples/guide/motion-prompt-rotate/) |
| 22 | Floating | [플로팅](https://style.gallery/examples/guide/motion-prompt-float/) |
| 23 | Morphing | [모핑](https://style.gallery/examples/guide/motion-prompt-morph/) |
| 24 | Blur reveal | [블러 리빌](https://style.gallery/examples/guide/motion-prompt-blur/) |
| 25 | Linear | [리니어](https://style.gallery/examples/guide/motion-prompt-linear/) |
| 26 | Ease in | [이즈 인](https://style.gallery/examples/guide/motion-prompt-easein/) |
| 27 | Ease out | [이즈 아웃](https://style.gallery/examples/guide/motion-prompt-easeout/) |
| 28 | Ease in out | [이즈 인 아웃](https://style.gallery/examples/guide/motion-prompt-easeboth/) |
| 29 | Text scramble | [텍스트 스크램블](https://style.gallery/examples/guide/motion-prompt-scramble/) |
| 30 | Karaoke highlight | [가라오케 하이라이트](https://style.gallery/examples/guide/motion-prompt-karaoke/) |
| 31 | Word by word | [워드 바이 워드](https://style.gallery/examples/guide/motion-prompt-wordreveal/) |
| 32 | Line by line reveal | [라인 바이 라인 리빌](https://style.gallery/examples/guide/motion-prompt-linereveal/) |
| 33 | Text wave | [텍스트 웨이브](https://style.gallery/examples/guide/motion-prompt-charwave/) |
| 34 | Character flip | [캐릭터 플립](https://style.gallery/examples/guide/motion-prompt-charflip/) |
| 35 | Count up | [카운트업](https://style.gallery/examples/guide/motion-prompt-countup/) |
| 36 | Text stroke reveal | [텍스트 스트로크 리빌](https://style.gallery/examples/guide/motion-prompt-textstroke/) |

### Complete Combination Inventory

| No. | Source combination | Local execution |
| --- | --- | --- |
| 1 | Zoom and fade | [제품을 부드럽게 보여주기](https://style.gallery/examples/guide/motion-prompt-soft-zoom/) |
| 2 | Upward slide and fade | [제목이 올라오며 나타나기](https://style.gallery/examples/guide/motion-prompt-title-slide/) |
| 3 | Overshoot and rotation | [로고가 돌면서 톡 나타나기](https://style.gallery/examples/guide/motion-prompt-logo-pop/) |
| 4 | Tracking contraction and fade | [넓게 퍼진 글자가 모이기](https://style.gallery/examples/guide/motion-prompt-tracking-title/) |
| 5 | Staggered image and title | [사진 다음에 제목 등장](https://style.gallery/examples/guide/motion-prompt-image-title/) |

### Source And Verification Boundary

Source review: 2026-09-29. The public page, all 36 rendered effects, all five rendered combinations, and their Web Animations tracks were inspected. The first definition file contains 28 effects; a second script adds eight text effects. The local inventory checks both sets and the five combination presets rather than trusting the headline count alone.

The local implementations preserve the observed durations, delays, repetitions, keyframe sequence, and moving properties. Two corrections are explicit: the reference's whole-timeline step easing hides intermediate count-up and scramble values; the local versions step each segment so those values appear. Theme colors and image-example materials differ intentionally. Image combinations reuse an existing project photograph instead of the reference's schematic placeholder.

These are independent implementations with attribution to Motion Prompt / @ssaengcho, not a distribution of its source bundle, prompt collection, or a claim of an upstream license. The website repository records source-file hashes and captured tracks alongside its coverage tests. Chromium observations are not a cross-browser or native-platform conformance claim.

## Domain Contract

See [StyleGallery Domains](../DOMAINS.md) for lifecycle, provenance, page membership, and staleness rules.

## IA Navigation

Parent: [StyleGallery](../index.md).
Next: [Motion Decision Tree](decision-tree.md).
