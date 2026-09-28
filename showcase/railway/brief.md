---
type: Showcase Brief
title: Railway, unofficial study
description: A dark night-journey deploy page: a painted dusk hero with stars, ridges, and a train crossing below a serif headline, a translucent logo wall, chaptered sections with a draggable service canvas, streaming logs, scaling bars, a wine-colored quote panel, a departures board of numbers, and an "All aboard" pill.
brand_study: true
subject: Railway
source_capture: site-compiler/out/packs/railway
---

# Railway, unofficial study

## Direction

Reference: the captured railway.com home (2026-09-21, 1440x900, 12,212px). Mood: a night train - violet sky, sunset band, dark land. Signature: the hero illustration is drawn in CSS and SVG with a train actually crossing, and the service canvas lets you drag cards while the wires follow.

## System

- Type: Newsreader serif for headlines, Inter for UI, JetBrains Mono for tags, logs, and the departures board.
- Palette: ground `#0d0b16`, panel `#16132a`, text `#f2f0fa`, dim `#b3aec8`, violet `#8a5cff`; hero sky `#1a1440 -> #c2507a -> #f39a6a`; chapter panels warm brown, green, wine; board amber `#ffcf7a`.
- Motion density: star twinkle, train loop (both paused offscreen), draggable cards, log stream, bar changes, counters.

## Techniques

- Painted scene from stacked gradients, SVG ridges, and radial-gradient stars.
- Chapter tags in mono above serif chapter heads.

## Layout Floor

Sticky dark header; the service canvas becomes a stacked list below 760px; splits, quotes, and the board collapse.

## Comparison With The Original

Reviewed side by side at 1440x900 against 6 capture frames (`.tmp/compare/railway.jpg`).

- Matches: a dark sticky header with text links; a large rounded hero panel with a night sky, a centered serif headline, a one-line sub, and a violet Deploy button beside a dark Agents button; a translucent logo band; chapter sections with small mono tags and two-line serif heads over dark panels; a wine-colored testimonial panel with bordered quote cards; a centered serif stat headline over a black cell board with amber numbers; a warm-to-violet closing card with a glossy gradient pill.
- Deliberate differences: the hero is an original CSS/SVG dusk scene with a moving train rather than the capture's pixel-art sky over a product window; the service canvas is draggable; logs and bars update live; copy, customers, and numbers are fictional; the cookie banner over every capture frame is omitted.
- Remaining gaps: study 3,718px vs 12,212px; the original's split-flap board has many rows of live totals and a large link footer.
