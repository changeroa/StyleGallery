---
type: Showcase Brief
title: Daangn, unofficial study
description: A neighborhood web home on soft grey: sticky search, category tiles, a ranked local feed that filters as you type, and a sticky map column with pulsing pins.
brand_study: true
subject: Daangn
source_capture: site-compiler/out/packs/daangn (2026-09-21, 1440x900, 2,918px)
---

# Daangn, unofficial study

## Direction

Reference: the captured daangn.com home. Mood: kitchen-table local, white cards on pale grey, carrot orange used sparingly. Signature: the feed is live - typing in the sticky search filters the ranked posts immediately, and the trending keyword rolls in the right column.

## System

- Type: Pretendard Variable, 700 section titles at 17px, 14px body, ellipsis single-line titles.
- Palette: ground `#f2f3f6`, card `#ffffff`, ink `#212124`, grey `#5e6168`, orange `#ff6f0f` (text uses `#c24e00` for contrast), multicolor category chips.
- Motion density: keyword roll, map pin pings, tile lift on hover.

## Techniques

- Shared product-art kit (`_kit/products.js`) replaces photographed thumbnails with original flat illustrations.
- A drawn SVG map replaces the real map tile.

## Layout Floor

Two-column grid (600px main, 316px side) centered at 1440; the search row and side column are `position: sticky`. Below 960px the side column drops under the header and stops sticking.

## Comparison With The Original

Reviewed side by side at 1440x900 against 2 capture frames (`.tmp/compare/daangn.jpg`).

- Matches: pale grey ground with white cards, a centered two-column body, orange carrot mark with a pill search, a green photographic banner, 4x2 category tiles with colored icons, a flame-titled ranked feed with right thumbnails, and a sticky right column with a trending dropdown and a map card with an orange chip.
- Deliberate differences: all posts and places are invented; thumbnails and banner are drawn; the map is a drawn SVG with pulsing pins; search filters the feed live.
- Remaining gaps: the original's banner is a photo with a stylized event wordmark; the study's is a painted gradient with plain type. Study 1,845px vs 2,918px because the footer sitemap is condensed.
