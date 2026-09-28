---
type: Showcase Brief
title: Baemin (배달의민족), unofficial study
description: A full-screen food-scene intro for a delivery app: painted tabletops, huge mint display type, store buttons, and a right-edge scene rail.
brand_study: true
subject: Baemin
source_capture: site-compiler/out/packs/baemin (2026-09-21 capture is an app shell (one 900px viewport); live retry 2026-09-28 also returned one viewport)
---

# Baemin (배달의민족), unofficial study

## Direction

Reference: the captured baemin.com landing, which shows one full-screen food photo with giant mint two-line copy, a two-line sub, three white store buttons, a right tick rail, and a down chevron. Signature: the study extends that single screen into five snap-scrolled scenes, each a painted tabletop that settles its zoom as it arrives, with the rail tracking the scene.

## System

- Type: Black Han Sans for display (a free, heavy Korean display face, not the brand's own typeface), Pretendard for UI.
- Palette: mint `#3fe0d0` on dark painted wood, white store buttons, a deep teal closing scene `#0f1f1e`.
- Motion density: scene zoom settle, rail sync, chevron nudge, proximity scroll snap (off under reduced motion).

## Techniques

- Painted SVG tabletop scenes composed from the shared product-art kit.
- Scroll snap with an in-page rail of anchors.

## Layout Floor

Each scene is at least one viewport tall with proximity snap. The header is fixed and transparent; the rail hides below 700px.

## Comparison With The Original

Reviewed side by side at 1440x900 against the 2 available capture frames (`.tmp/compare/baemin.jpg`); the source is an app-shell landing that reports a single viewport, so only the first screen exists to compare.

- Matches: a full-screen food scene with the wordmark top-left and three small external links top-right, a giant two-line mint display headline, a two-line mint sub, three white store buttons (App Store, Google Play, QR), a right-edge tick rail with a long active tick, and a centered down chevron.
- Deliberate differences: food photography becomes purpose-drawn SVG dishes (noodle bowl, grill, brunch plate, rice bowl) on painted wood; copy is newly written in the brand's short, playful register; the display face is Black Han Sans rather than the brand's own typeface. The single screen is extended to five snap scenes.
- Remaining gaps: drawn food cannot carry the appetite of the original's photography.
