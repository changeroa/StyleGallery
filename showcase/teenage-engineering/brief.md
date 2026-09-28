---
type: Showcase Brief
title: teenage engineering - unofficial brand study
description: White catalogue paper, near-black product stages, hairline grids, one orange knob, and a playable pocket sequencer.
brand_study: true
subject: teenage engineering
source_capture: site-compiler/out/packs/teenage-engineering
---

## Direction

teenage engineering's catalogue register: white paper, a small lowercase wordmark with label-style mono navigation, square corners everywhere, near-black full-width product stages alternating with off-white hairline grids, blue underlined text links for buying, and orange used like a single knob colour.

## System

- Type: Inter Tight (headlines and body, tight negative tracking), IBM Plex Mono (labels, navigation, prices).
- Color: paper #fff, off-white #f3f3f1, night #0e0e0e, orange #ff5a1f for knobs and indicators, link blue #0a56d6.
- No radii, no shadows except under the playable device; 1px dividers carry the grid.
- Devices are CSS boxes with coloured dials; product codes, names, and prices are invented. The wordmark is plain text, not the logo.

## Techniques

- Playable step sequencer: 16 pressed-state step buttons, play runs two bars through Web Audio (only after a click) with an orange playhead, then stops.
- Catalogue filter chips with aria-pressed and a polite result count; hidden items leave the hairline grid intact because borders live on each cell.
- Hover lifts the drawn device, not the card.

## Layout Floor

The header is not sticky, as in the capture. Sections are semantic with headings; every buy action is an honest demo button; the sequencer never loops forever and makes no sound without a click; reduced motion only removes transitions.

## Comparison With The Original

Reviewed side by side at 1440x900 against 8 capture frames (`.tmp/compare/teenage-engineering.jpg`).

- Matches: white paper with a small lowercase wordmark and mono label navigation; a full-width near-black product stage after the opening; square corners and hairline dividers; a product row on white with small names and "buy now" style text links at the end.
- Deliberate differences: the capture's hand-drawn comic hero, record sleeve, and product photography (sampler, mixer, sampler collage, speaker, pocket-unit row) are replaced by a playable CSS step sequencer, one drawn field unit, and a filterable catalogue of invented CSS devices. No logo, illustration, photo, product name, or copy is reused.
- Remaining gaps: the original runs five consecutive dark photo stages with product-lit drama; the study compresses them into one stage, so its dark-to-light rhythm is shorter (study about 2,100px vs about 14,000px).
