---
type: Showcase Brief
title: Framer, unofficial study
description: A black site-builder page: a live builder window whose blocks rearrange as an agent replies, an agent section with a transcript and step switcher, a nine-cell platform bento with vitals, cursors, uptime, and an A/B winner, a drawn site gallery, and customer story cards.
brand_study: true
subject: Framer
source_capture: site-compiler/out/packs/framer (2026-09-21, 1440x900, 10,858px)
---

# Framer, unofficial study

## Direction

Reference: the captured framer.com home. Mood: pure black, hairline cards, white and dark buttons, blue light. Signature: the hero window is not a video - its layout blocks actually reshuffle while the agent panel narrates what it changed.

## System

- Type: Inter 600 at -0.045em for headings, JetBrains Mono for transcripts.
- Palette: ground `#000000`, card `#0f0f10`, raised `#19191b`, text `#ffffff`, secondary `#a8a8ad`, blue `#0099ff`, violet `#9a6bff`, green `#3ddc84`.
- Motion density: split hero, block reshuffle (visible only), transcript lines, wandering cursors.

## Techniques

- CSS grid re-placement with transitions for the builder window.
- Bento with per-cell micro-visuals (vitals bars, gradient-text number, A/B badge).

## Layout Floor

Sticky black header; builder panel hides below 860px; bento goes 3, 2, 1 columns. The cookie banner over the capture is omitted.

## Comparison With The Original

Reviewed side by side at 1440x900 against 8 capture frames (`.tmp/compare/framer.jpg`).

- Matches: a pure-black page with a thin header (links left, Log in and a white Sign up right); a left-aligned bold multi-line hero with a white and a dark button over a large dark product window with a right-hand agent panel; an agent section pairing a transcript with step cards; a bento of dark hairline cards (performance vitals, CMS, SEO, collaboration cursors, a large uptime number, A/B test with a winner badge); a "built with" mosaic of site thumbnails with a See more button; a row of customer cards with "Read story" links; a dark footer.
- Deliberate differences: the product window's blocks rearrange live while the agent narrates instead of playing a video; step cards swap the transcript; site thumbnails and customers are invented and drawn; headings are newly written; the cookie banner over every capture frame is omitted.
- Remaining gaps: study 4,035px vs 10,858px; the original's community window section and large sitemap footer are omitted, and its gallery uses real site screenshots with far more detail.
