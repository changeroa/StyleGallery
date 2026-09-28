---
type: Showcase Brief
title: Musinsa, unofficial study
description: A dense black-and-white fashion commerce home: a compressing black header, three full-bleed editorial panels, collab chips, an orange promo band, and scrollable product rails with real like toggles.
brand_study: true
subject: Musinsa
source_capture: site-compiler/out/packs/musinsa (2026-09-21, 1440x900, 5,875px)
---

# Musinsa, unofficial study

## Direction

Reference: the captured musinsa.com home. Mood: street-fashion catalogue, black chrome around white, tight type. Signature: density done right - the header compresses by dropping the search row on scroll, rails snap horizontally, and every heart is a real toggle.

## System

- Type: Pretendard Variable, 800 section titles in two lines, 12-13px catalogue text, red discount and blue shipping labels.
- Palette: header `#000000`, ground `#ffffff`, discount `#d6260f`, shipping `#0b61d8`, promo `#c9502a`, running tab accent `#7fdc6a`.
- Motion density: header compression, panel image zoom on hover, floating promo icons, heart pop.

## Techniques

- Shared product-art kit for all product imagery; editorial panels use enlarged illustrations with a bottom scrim.
- Horizontal scroll-snap rails with keyboard focus.

## Layout Floor

The black header is `position: sticky`; rails scroll inside their own box so the document never overflows. Hero goes to one column at 760px.

## Comparison With The Original

Reviewed side by side at 1440x900 against 3 capture frames (`.tmp/compare/musinsa.jpg`).

- Matches: black header with category row, white search bar, and a curation tab row; three edge-to-edge editorial panels with two-line white captions; a dense collab chip grid; a benefits quick-link row; an orange promo band with a pill segment control; six-across product rails with brand, name, red discount, and blue shipping lines.
- Deliberate differences: model photography is replaced by enlarged original product illustrations; brands and products are invented; hearts and segment controls are real toggles. Below 1000px rails wrap into a grid so keyboard focus never lands on a half-clipped card.
- Remaining gaps: the original's photographic density and faces drive most of its energy; the study reads more graphic and calmer. Study 3,430px vs 5,875px.
