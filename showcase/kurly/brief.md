---
type: Showcase Brief
title: Kurly, unofficial study
description: A calm purple grocery home: promo strip, two-tier header that compresses to a sticky nav, a pausable hero carousel, a coupon band, and four-column product shelves with a working cart counter.
brand_study: true
subject: Kurly
source_capture: site-compiler/out/packs/kurly (2026-09-21, 1440x900, 3,244px)
---

# Kurly, unofficial study

## Direction

Reference: the captured kurly.com home. Mood: premium grocery - purple trust, lots of white, soft studio product shots. Signature: shopping feels real - every 담기 button increments the header cart badge and announces it, and shelves slide with a round next button.

## System

- Type: Pretendard Variable, 600 centered shelf titles at 26px with a chevron, 15px product names clamped to two lines. The brand name is set as plain text in the page face; no logo is drawn.
- Palette: purple `#5f0080`, lavender `#f4ecfa`, ink `#333333`, sale `#c4410e`, struck price `#767676`.
- Motion density: hero crossfade every 5s (visible only, pausable), product zoom on hover, cart badge pop.

## Techniques

- Shared product-art kit for studio-style product imagery on soft grounds.
- Carousel with an explicit pause control and live counter.

## Layout Floor

The category bar is `position: sticky`; shelves scroll horizontally inside their track. The floating side panel only shows at 1260px and wider. The capture's first-purchase popup becomes an inline coupon band.

## Comparison With The Original

Reviewed side by side at 1440x900 against 2 capture frames (`.tmp/compare/kurly.jpg`).

- Matches: purple promo strip, utility links, brand row with purple-outlined search and three icons with a cart badge, a category bar, a full-width burgundy hero with a pause and counter pill at bottom right, centered shelf titles with chevrons, and four-column product shelves with outlined add-to-cart buttons.
- Deliberate differences: the first-purchase popup that covers the capture is turned into an inline lavender coupon band; hero still life is three drawn product tiles; the brand name is plain text, not the logo.
- Remaining gaps: the original's photographic still life gives the hero depth the drawn tiles do not.
