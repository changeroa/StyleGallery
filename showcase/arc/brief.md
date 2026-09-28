---
type: Showcase Brief
title: Arc, unofficial study
description: A playful indigo browser page: grainy blue ground, a scalloped pastel banner, a centered headline with download buttons, one pinned browser window whose sidebar color and page change with scroll, a cream quote band between scallops, and a closing CTA.
brand_study: true
subject: Arc
source_capture: site-compiler/out/packs/arc
---

# Arc, unofficial study

## Direction

Reference: the captured arc.net home (2026-09-21, 1440x900, 6,035px). Mood: a zine on blue risograph paper. Signature: the browser window stays pinned while the day passes - the sidebar shifts coral, lilac, orange, green and the page swaps from photos to an event, a shop, and a drawing board.

## System

- Type: Space Grotesk 700 for display, Fraunces for serif moments, IBM Plex Mono for handles.
- Palette: indigo `#2f37e8`, deep `#1f25b0`, cream `#fff8e6`, ink `#121433`, sidebar states `#ff8a8a`, `#b9b4ff`, orange-coral, green.
- Texture: SVG noise at 0.5 overlay on the blue ground.
- Motion density: split hero, scroll-derived window state (four stages), reveal quotes.

## Techniques

- [Scroll choreography](../../motion/techniques/scroll-choreography.md) for the pinned window.
- Scalloped edges from repeating radial-gradient masks.

## Layout Floor

Sticky nav and banner; the window track is sticky only with JavaScript and motion; otherwise all four panes stack as a static list. Quotes go 4, 2, 1 columns.

## Comparison With The Original

Reviewed side by side at 1440x900 against 6 capture frames (`.tmp/compare/arc.jpg`).

- Matches: grainy indigo ground, a sticky nav with a star mark over a pastel gradient banner with a scalloped lower edge and a black pill button, a centered bold headline with a small serif press line, white and navy download buttons, one large browser window whose sidebar color changes (coral, lilac, orange, green) while the page swaps between photos, an event poster, a shop, and a drawing board with a pen palette, a cream quote band between scallops with outlined mono handles, and a centered closing CTA.
- Deliberate differences: the window state is driven by scroll position through a pinned track; photographs are gradient tiles; the follow-up product is unnamed; quotes and handles are fictional.
- Remaining gaps: the original's window content is photographic and richer; the study's panes are flatter.
