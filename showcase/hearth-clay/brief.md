---
type: Showcase Brief
title: Hearth Clay
description: A fictional pottery studio page on the Warm Print direction, built to prove the richness floor - a drawn scene or live product surface on every screen, calm calibrated type, and a page that answers the pointer.
brand_study: false
---

# Hearth Clay

## Direction

Built only from the Creative Build Route: [Showcase](../README.md), the [Expression Direction Brief](../../expression/direction-brief.md), the [Warm Print Direction](../../expression/directions/warm-print.md), and the techniques it links.

```yaml
subject: a two-wheel pottery studio selling small-batch stoneware and running evening classes
memory: a sunlit shelf of cobalt, oat, ash, and rust pots, and a pot that changes glaze as you choose
reference: independent craft-shop websites and printed studio catalogues; take the calm grid and the objects-first pages
register: plain, warm, specific; days of the week and temperatures instead of adjectives
type:
  display: Bricolage Grotesque 800, largest clamp(2.6rem, 1.5rem + 3.4vw, 4.6rem) = 73.6px at 1440, tracking -0.03em, line height 1.02
  body: Newsreader 400, 17px, line height 1.55 (largest / body = 4.3)
  label: IBM Plex Mono 500, 12px uppercase, tracking 0.1em, preceded by a hairline
palette: paper #f4efe6, panel #ebe4d6, ink #141210, dim #5b534a, cobalt glaze #1f4bff (accent), terracotta #9a4f1f (numbers)
texture: none; the drawn objects carry the texture
atmosphere: a single window-light wedge behind the hero shelf
imagery: hero shelf scene; glaze marquee; four drawn product plates; the live glaze studio pot; three process scenes (wheel, trimming, kiln); studio interior; three journal plates; street map
response: every link, button, swatch, schedule row, and card changes state in 200ms (kit response layer); cards lift and their plate eases in on hover; swatches scale
surface_detail: rounded clip frames on every scene (sg-frame), edge-faded glaze marquee, hairlines under labels, between facts, schedule rows, hours, and footer
motion_density: one split-word entrance, 600ms rises on arrival, hero shelves drift at two depths with scroll, one ambient marquee paused offscreen
length: about 8 screens at 1440 - hero, shop, glaze studio, process, classes, journal, visit, footer
signature: the glaze studio, where form and glaze buttons redraw a pot under kiln light
constraints: all images drawn inline in SVG so offline and no-script reading keep every picture; passes check-showcase with --richness error
consumer_reference: not_applicable
consumer_reference_reason: A showcase work selects no consumer reference record.
```

## System

Warm Print values, calibrated with [Display Type Calibration](../../expression/techniques/display-type-calibration.md): display type is 4.3 times the body, not the 12.5rem the direction used to allow.

## Techniques

- [Image Weight](../../expression/techniques/image-weight.md): one drawn slot per screen, every scene in a rounded `sg-frame` clip and marked `data-surface`.
- [Drawn Products](../../expression/techniques/drawn-products.md): four pot symbols (`vase`, `bowl`, `cup`, `jar`) filled with `currentColor`, shaded with one gradient overlay, and reused everywhere by `<use>`.
- [Live Product Demos](../../expression/techniques/live-product-demos.md): the glaze studio.
- [Masks, Clips, And Hairlines](../../expression/techniques/surface-detail.md): marquee edge fade, rounded clips, hairlines.

## Layout Floor

Sticky header of 68px with `--sg-header: 84px`; hash targets land below it. Grids collapse to one column below 900px. All drawings are inline SVG, so the page reads fully with scripts and remote fonts blocked.

## Measured Result

Measured on 2026-09-28 at 1440x900 with the profiler behind [Measured Expression Benchmarks](../../expression/measured-benchmarks.md):

- Largest text 73px over a 17px body (ratio 4.3; measured originals: median 3.95, p75 5.5).
- 56 elements with transitions over about 7 screens (floor: 4 per screen; measured originals: median 76 per page).
- 11 masked or clipped elements and 45 hairline borders (measured originals: medians 12 and 24).
- Gradient area 4% (measured originals: median 3.9%); drawn SVG covers 25% of the page.
- `node scripts/check-showcase.mjs --work hearth-clay --richness error` passes: no empty screen at 1440x900.
