---
type: Worked Example
title: Full-Viewport Scene Navigation
description: A fixed-page product showcase with discrete chapter navigation, input ownership, history, and ordinary reading recovery.
---

# Full-Viewport Scene Navigation

A whole page presented as three screen transitions. In scene mode, document `scrollY` stays at zero; wheel, keyboard, chapter links, and swipes over the device art select a chapter. A single device shell persists across the sequence.

## Run

From the repository root:

```sh
python3 -m http.server 4175 --directory examples
```

Open `http://localhost:4175/scene-navigation/`. Use `#instantly` or `#everywhere` for direct entry. Add `?reading=1` to start with all chapters in source order.

```sh
node --test examples/scene-navigation/test-input.mjs examples/scroll-story/test-contract.mjs
```

## Interaction Contract

- Wheel over the stage: aggregate 60 pixels, one chapter per burst, rearm after 180 milliseconds of silence. No wrap at either edge. These are experimental local values.
- Keys: arrows, Page Up/Down, Home/End, Space/Shift+Space. Tab and native button/link Space activation remain native. Editable and overflowing copy regions retain their input.
- Touch: vertical swipe over decorative art only, at least 55 pixels; horizontal/pinch gestures remain available. Copy is a separate native overflow region. Previous/next and chapter controls provide visible alternatives.
- History: each chapter change pushes its fragment; Back/Forward and direct links restore selection. Presentation can be retargeted immediately; no animation lock delays state.
- Focus: keep the initiating control focused, or move focus from an outgoing panel to the incoming heading. Inactive chapters are inert and unavailable to accessibility APIs in scene mode.
- Escape or “Read all chapters”: normal document reading. No script, height below 540 pixels, or width below 320 pixels also uses ordinary reading. Reduced motion retains chapter navigation with immediate transitions.

The controller exposes `window.sceneDemo.state` and `destroy()` for local diagnostics. Destroy removes listeners and document scroll locking. The page has no perpetual animation loop, autoplay, external media, or dependency download.

## Ownership And Source

For explicit browser regression checks, run `await sceneDemo.runChecks()` in developer tools. Its 46 assertions cover navigation, document position, semantic availability, focus, input exemptions, cancellation, long copy, reading escape, and teardown. It changes history and destroys the controller; reload afterward. Synthetic events test arbitration, while [verification](verification.md) records the separately injected browser input and viewport cases.

Layout composition: viewport shell with a `minmax(0, 1fr)` stage, overlaid chapter panels, explicit native copy overflow, and source-order reading fallback. It composes existing spatial responsibilities and adds no Layout pattern. Motion owns chapter state and interruption. Design Engineering owns the original Flow art, typography, colors, and device treatments. Platform Guides owns the target verification matrix.

Read [Motion's recipe](../../motion/interaction-recipes.md#full-viewport-scene-navigation), [Motion Brief](../../motion/motion-brief.md#fixed-viewport-navigation-extension), and [verification](verification.md). Compare [pinned scroll chapters](../scroll-story/README.md): those advance document position and release their sticky stage; this example selects discrete scenes without a scroll track. Neither example infers the original Toss site's rendering technology.

Implementation handoff: `consumer_reference: not_applicable` because this standalone product example selects no consumer profile or reference record. No design-terminology records are used. This is repository-only example code; npm distributes the governed guidance and retrieval tools, not these assets or runtime modules.
