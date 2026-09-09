---
type: Domain Guide
title: Motion Interaction Recipes
description: State-based product motion recipes for feedback, disclosure, modal transitions, rearrangement, progress, and dragging.
domain: motion
lifecycle: experimental
provenance_kind: local
---

# Motion Interaction Recipes

Primary role: motion behavior catalog.

## Repository Boundary

These recipes describe product behavior and failure cases. They compose with Layout instead of supplying reusable spatial CSS or visual defaults. Start with a [Motion Brief](motion-brief.md); use [Vocabulary](vocabulary.md) for the visual effect's name.

## Reusable Method

Choose the task below, assign semantic and presentation owners, implement the immediate state change first, and then test any visual interpolation against that baseline. The traces below are expected behavior, not evidence of a tested implementation.

### Action Feedback

Use for a command whose acknowledgement and completion are different events.

`ready → pending → success | error`; a retry is a new request. Press feedback may acknowledge input immediately, but a success treatment waits for actual confirmation. Decide explicitly whether repeated activation is ignored, queued, or replaces the request. Keep essential status available without motion. Test delayed completion, duplicate input, failure, and a response arriving after navigation.

### Disclosure

Use for optional content controlled by a nearby trigger. A native `details`/`summary` baseline can be enough:

```html
<details>
  <summary>Delivery restrictions</summary>
  <p>Some destinations need an additional delivery day.</p>
</details>
```

If a custom disclosure is necessary, keep the trigger's expanded state consistent with content availability. The [APG disclosure contract](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) describes button activation and state semantics. When closing while focus is inside, move focus to an available logical target before hiding it. Test repeated toggle, long content, and removal of the trigger. Avoid fixed maximum heights that clip real content; Layout owns intrinsic sizing.

### Modal Transition

Use when a temporary task must block the surrounding interface. Assign one owner to opening, focus placement, blocking, cancellation, and focus return. An entrance effect may decorate this change; semantic availability must not wait for an arbitrary timeout. If exit animation is retained, define whether the dialog remains modal until cleanup and how reopening supersedes a pending close.

The [APG modal dialog guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) supplies the web interaction baseline. Test close during entry, reopen during exit, nested overlays, trigger removal, and reduced motion. After final close there must be no surviving blocker or focus trap.

### Reorder And Filter

Use when the same identifiable items move or are removed. Commit the intended logical order, retain stable item keys, and interpolate presentation only where the source/destination mapping is valid. Preserve focused items; if one disappears, choose a documented neighboring item or controlling filter. Do not reorder DOM solely to produce a pleasing stagger.

Trace: filter A → filter B → late A data → B remains current. Test empty results, long item labels, list updates during movement, keyboard navigation, and a focused item's removal. An immediate redraw is the fallback when continuity cannot be established.

### Progress And Completion

Use when an ongoing operation needs visible status. Show determinate progress only when backed by a meaningful measurement; otherwise use a pending state. Completion, failure, and cancellation come from the operation, independently of the progress decoration.

Trace: pending → cancellation requested → confirmed cancelled or completed; do not promise cancellation succeeded before the operation confirms it. Essential information persists beyond a transient flourish. Use urgent alerts sparingly; [APG alert guidance](https://www.w3.org/WAI/ARIA/apg/patterns/alert/) distinguishes announcements from focus-taking dialogs.

### Drag And Settle

Use when direct manipulation previews a change before commitment. Separate the preview value from the committed value. Release on a valid target commits; cancellation restores or reconciles with the current model. A new gesture retargets from the presented position where continuity is intended. Provide a task-equivalent non-drag operation.

Test release inside/outside, cancellation, pointer loss, a changing destination, and repeated reversal. Focus and the selected item must remain traceable while visual position changes. The engine or browser adapter owns gesture events; the product owns acceptance of the new value.

### Scroll-Driven Story

Use when a visitor explores a product through ordered visual chapters: scroll a phone into view, enlarge the device, change its screen, then release the scene into the next section. The story is presentation; scrolling must not commit a payment or other application action.

| Responsibility | Contract | Failure to exercise |
| --- | --- | --- |
| Scroll reveal | Entry triggers a time-based effect; declare once or replay | Re-enter, preference change, content hidden before script starts |
| Scroll scrub | Position continuously determines a bounded progress value | Reverse, jump over a segment, load at the middle |
| Pinned story | Document scroll advances a locally sticky stage | Short viewport, long copy, wrong ancestor overflow, release boundary |
| Layered parallax | Each decorative layer maps progress to a bounded displacement | Cropping, text overlap, reduced-motion alternative |
| Media sequence | Progress requests an image frame or media time | Slow decode, stale completion, missing frame, unavailable media |

The [Scroll Story Lab](../examples/scroll-story/README.md) links runnable Flow and headphones examples, a native CSS scrub, source files, and observed verification. It implements scrub, pinning, scene crossfades, and a small image sequence. Parallax and video seeking remain contracts rather than claimed executed examples.

#### Scene Composition Contract

Layout owns document scroll, the containing block, sticky offset, available stage height, and track distance. Motion owns progress, scene ranges, continuity, and teardown. The consuming product owns imagery, typography, colors, and visual values. First compose `stack`, `content-limiter`, and `overlay-stack` responsibilities with local sticky positioning; a new Layout pattern requires a distinct demonstrated spatial failure.

Record `start`, `distance`, `scene_ranges`, `resize_policy`, `direct_entry`, `static_path`, and `media_budget` alongside the [Motion Brief](motion-brief.md). For positive distance, clamp `(scroll_position - start) / distance` to `[0, 1]`; a nonpositive distance selects the static path. Derive the entire scene from current progress, not from which callbacks have already fired. This makes reversal and skipped segments well defined.

The worked three-scene example centers chapters at progress 0, 0.5, and 1. Copy crossfades between centers while decorative scale and position interpolate. These values are local choices, not universal timing or easing defaults. No wheel interception or artificial scroll smoothing is needed for the example.

#### Implementation And Fallback

Choose the smallest rendering mechanism that meets the contract. CSS scroll/view timelines suit declarative interpolation; a scheduled JavaScript renderer can coordinate semantic availability and decoded media. Feature detection only chooses an implementation candidate, not a supported-device claim. The lab demonstrates CSS continuous rotation separately from its JavaScript three-scene controller; it does not claim visual parity between them.

Keep all chapters in ordinary semantic HTML before enhancement. In animated mode, only the presented chapter is available to interaction and accessibility APIs; a visible reading-mode control exposes every chapter in order. Provide a skip link outside the changing panels. Do not put essential actions only inside a fading chapter. Narrow or low windows, overflowing copy, no script, and reduced motion must retain a readable path. React to preference changes during use.

Cache geometry on layout changes, batch scroll updates, and avoid a perpetual idle animation loop. Recompute on resize, delayed fonts/images, and history restoration. Dispose observers, queued frames, and stale media callbacks on removal. A restored page must recompute from its restored position.

#### Media Contract

Record frame order, dimensions, poster, compression, source/license, decoded-memory estimate, cache limit, concurrent decode limit, timeout, and fallback. A successful older decode must never replace a newer requested frame. Retain a poster or last good frame while loading or after failure. Keep essential text outside the image. For video, additionally define duration readiness, seek granularity, pending-seek replacement, and seek failure; selecting `currentTime` is not proof of frame-accurate delivery.

The lab uses twelve locally drawn 480×480 SVG illustrations, one in-flight decode, three cached frames, and an eight-second example timeout. These low-detail illustrations verify the loading lifecycle, not photographic quality or production video performance.

#### Verification Trace

Exercise `0 → 0.5 → 1 → 0.5 → 0`, direct entry at 0.5, and jumps across both scene boundaries. Compare presented state at the same progress in both directions. Also exercise resize mid-scene, text growth, image failure, a slow obsolete request, idle updates, reading-mode activation, preference changes, and teardown. Record browser and OS separately from emulated viewport/input. A screenshot proves one state; performance and perceptual continuity need separate evidence.

Technical sources rechecked on 2026-09-09: [W3C Scroll-driven Animations draft](https://www.w3.org/TR/scroll-animations-1/), [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), and [image decode](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode). These support the API distinctions and decode lifecycle; they do not establish local frame rate, comfort, or adoption.

## Opinionated Guidance

For frequent operations, compare with removing motion before increasing its complexity. When two recipes compose, one controller must arbitrate the shared state rather than letting competing completion callbacks decide it.

## Platform-Specific Guidance

For the web, [`prefers-reduced-motion`](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion) is a preference signal. Define the alternative per recipe and respond to preference changes during use. API support, native gesture physics, and rendering performance require the exact target runtime.

## Unsupported Absolutes

These recipes establish no universal duration, spring configuration, frame rate, device coverage, or aesthetic result. A static snippet does not prove animated or assistive-technology behavior.

## Verification Contract

For each implemented recipe record before, intermediate, interrupted, and final states; logical order and focus; reduced-motion behavior; and completion/error cleanup. Source inspection can check declared ownership. Rendered interaction and assistive-technology behavior require the consuming application. Review when an API changes or a trace fails.

The [Interaction Lab](../examples/domain-interactions/README.md) provides a bounded web implementation of feedback, native disclosure, modal dismissal, stale search results, reward reveal, and range-input preview. Its [verification notes](../examples/domain-interactions/verification.md) record exercised states and preferences; they do not establish coverage for every possible implementation of these recipes.

## Source, License, And Attribution

Locally authored recipes and HTML. The linked W3C APG pages and Media Queries Level 5 were rechecked on 2026-09-08 for the specific semantics and preference signal above. No upstream examples or timing prescriptions are copied.

## IA Navigation

Parent: [Motion](index.md).
Next: [Motion Review Workflow](review-workflow.md).
