---
type: Showcase Brief
title: Rebellions, unofficial study
description: A dark-to-light AI chip company home: a drawn server chassis hero with product tabs and a single lime CTA, a slate slogan block, hairline split scenes (performance racks, model tiles with a comparison bar, a stepped software stack, a hardware lineup), partners, a quote, updates, and a contact tile.
brand_study: true
subject: Rebellions
source_capture: site-compiler/out/packs/rebellions (2026-09-21, 1440x900, 8,241px)
---

# Rebellions, unofficial study

## Direction

Reference: the captured rebellions.ai home. Mood: engineered and quiet - slate, pale grey, hairlines, and one fluorescent lime. Signature: the header flips from dark to light as light scenes pass under it, and every product visual is drawn hardware rather than a render.

## System

- Type: Inter Tight 400 for headlines at -0.03em, IBM Plex Mono for labels and chips, Pretendard for Korean.
- Palette: slate `#262b31`, deep `#1c2025`, paper `#f3f5f7`, ink `#15181b`, lime `#b6ff3b` (darker `#5a8f00` on light for contrast), hairlines `#dde2e7`.
- Motion density: hero chassis zoom on scroll, rack LEDs (visible only), comparison bars, stack spread on hover, header theme flip.

## Techniques

- [Scroll choreography](../../motion/techniques/scroll-choreography.md) for the hero zoom.
- Header theme switch by testing which section sits under the header.

## Layout Floor

Sticky header over a static notice bar. Split scenes use a 576px text column with a hairline; they stack below 960px. Product names, partners, and the quote are invented.

## Comparison With The Original

Reviewed side by side at 1440x900 against 8 capture frames (`.tmp/compare/rebellions.jpg`).

- Matches: a slate notice bar with lime side ticks, a dark header with a lime contact cell; a dark hero with greyscale server hardware, product name bottom-left, a lime rectangular CTA bottom-right, and a product tab row; a slate slogan block with a short lime rule; pale-grey split scenes with a 576px text column and hairline (racks, model tiles with a comparison panel, a stepped software stack with a lime top layer, a hardware lineup); partner wordmarks; a centered quote with lime quote marks; update cards with black chips; a contact block with a large plus tile.
- Deliberate differences: the hardware is drawn SVG and CSS; product names, models, partners, and the quote are invented; the header flips light over pale scenes.
- Remaining gaps: the original's photographic racks and chips have more metal detail.
