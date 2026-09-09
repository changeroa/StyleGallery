---
type: Example Guide
title: Scroll Story Lab
description: Runnable product stories with continuous scroll progress, bounded media loading, CSS scrubbing, and static reading alternatives.
---

# Scroll Story Lab

Build a product story where scrolling enlarges a phone and changes its screen, or rotates a product through illustrated frames. Begin at [Motion's scroll-driven story](../../motion/interaction-recipes.md#scroll-driven-story), inspect this lab, then substitute your own content and assets.

## Run And Explore

For a page that stays fixed while wheel/keys/swipe select chapters, open [Scene Navigation](../scene-navigation/README.md). It uses discrete chapter state, history, and input arbitration instead of this lab's document scroll track. The Flow scene also has a persistent device treatment; [follow-up verification](../scene-navigation/verification.md) records that later change separately.

From the repository root:

```sh
python3 -m http.server 4175 --directory examples
```

Open `http://127.0.0.1:4175/scroll-story/` for the example selector and `http://127.0.0.1:4175/toss-homepage-clone/#send` for Flow's three chapters.

| Example | Solves | Implementation | Failure cases |
| --- | --- | --- | --- |
| Flow money journey | Ordered product chapters in one pinned stage | [Shared controller](../toss-homepage-clone/story/controller.mjs), [timeline](../toss-homepage-clone/story/timeline.mjs), [product CSS](../toss-homepage-clone/story/story.css) | Reverse, skip, reload, long copy, short viewport |
| Headphones | Same scene contract with different content and bounded media | [Sequence loader](sequence.mjs), [application](app.mjs), twelve original SVG drawings | Stale decode, missing frame, cache, disposal |
| Native CSS scrub | Continuous rotation from start through middle to end | [CSS adapter](styles.css) | Unsupported timeline or reduced-motion preference retains poster |

The selector links a live example, its source, and failure/verification notes. The CSS example is a single-object scrub, not a second implementation of the complete three-scene semantic controller. Both product stories are related local examples, not independent consumers.

## Scene And Layout Contract

The document owns vertical scroll. The example composes existing stack, content-limiter, overlay-stack, and sticky responsibilities; no new reusable Layout pattern is admitted. A stage occupies the available viewport minus its declared header offset. The example's scroll distance is 2.6 stage heights, with scene centers at 0, 0.5, and 1. The controller derives presentation from position and never cancels wheel, touch, or keyboard scrolling.

The example owns the sticky containing block, track length, offset, and release boundary. Motion owns interpolation and semantic availability. Product values own the gradients, typography, device artwork, color, and framing. The likely breaking case is text exceeding stage height: the controller switches to ordinary reading instead of clipping it. Animated mode requires at least 900 CSS pixels of available inline space and 570 pixels of stage height; these are local content constraints.

## Static And Accessible Reading

All chapters exist as semantic HTML. No script, constrained viewports, excessive copy, or reduced motion retain a normal document. A visible reading-mode control exposes all chapters; the skip link precedes the changing stage. In enhanced mode the active chapter alone remains available to interaction/accessibility APIs. Artwork is decorative and the changing panels contain no exclusive actions. No scroll-linked live announcements are emitted.

## Media Manifest And Budget

The local sources are `assets/headphones-00.svg` through `assets/headphones-11.svg` in numeric order: twelve original 480×480 vector drawings with a consistent viewBox and no external dependencies. Frame 00 is the startup poster; static chapters also show frames 06 and 11. There is no video or third-party asset license dependency.

The loader permits one pending decode and retains at most three decoded frame objects. At 480×480×4 bytes, a simple raster estimate is 921,600 bytes per frame and 2,764,800 bytes for three cached frames. Browser caches, displayed images, the in-flight decode, SVG internals, and GPU allocations are additional; this is not measured total memory. An eight-second example timeout selects the last good frame/poster, and stale requests cannot overwrite a newer requested frame. The sequence has only twelve illustrative steps and does not claim film-quality smoothness.

For production assets, declare download bytes, frame dimensions/count, codec/alpha, poster, crop, timeout and decoded-memory estimates before choosing a renderer. [Design Engineering's media handoff](../../design-engineering/worked-examples.md#product-story-and-media-handoff) owns that product decision.

## Verification

Run the deterministic state and asynchronous-loader tests:

```sh
node --test examples/scroll-story/test-contract.mjs
```

At a roomy desktop viewport, the lab exposes `await window.storyLab.runChecks()` in browser developer tools. It exercises progress landmarks, both directions, semantic availability, pinned geometry, content growth, RTL width, and idle updates, then restores the initial scroll position. It does not run automatically. [qa.mjs](qa.mjs) contains the browser checks; [verification.md](verification.md) records observed and untested cases.

The lab inspection hook exposes update count and maximum JavaScript update duration. These are diagnostic measurements, not compositor frame-rate measurements or a universal performance threshold. Test exact device/input traces before setting a product budget.

## Implementation Handoff

Consumer reference: not_applicable
Consumer reference reason: These locally authored examples select no consumer-reference profile or evidence record.

No design-terminology records were used. The domain documents remain experimental; this lab does not promote domain lifecycle or claim adoption.
