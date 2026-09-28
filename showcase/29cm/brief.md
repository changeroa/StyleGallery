---
type: Showcase Brief
title: 29CM, unofficial study
description: An editorial Korean select shop: an oversized header nav that shrinks on scroll, a three-panel hero, and a long feed of full-height brand columns beside two curation columns of product rows.
brand_study: true
subject: 29CM
source_capture: site-compiler/out/packs/29cm (2026-09-21, 1440x900, 12,659px)
---

# 29CM, unofficial study

## Direction

Reference: the captured 29cm.co.kr home. Mood: magazine-meets-catalogue, black type on white, color only in imagery. Signature: the header reads like a masthead - large bold section names that compress to 15px as you scroll - and each brand gets a full-height column with its name set in thin uppercase.

## System

- Type: Inter for Latin mastheads (700) and thin brand names (300), Pretendard for Korean titles.
- Palette: ground `#ffffff`, ink `#000000`, grey `#5d5d5d`, hairlines `#e4e4e4`, discount `#d9401a`.
- Motion density: header compression, hero zoom on hover, like toggles with counts.

## Techniques

- Shared product-art kit for all imagery; hero panels use drawn textures (knit stripes, gradients).
- Hairline column grid: brand column plus two curation columns per block.

## Layout Floor

The header is `position: sticky`. Blocks are three columns at desktop, two below 960px (brand column spans), and one below 600px. The capture's privacy-notice modal is omitted.

## Comparison With The Original

Reviewed side by side at 1440x900 against 3 capture frames (`.tmp/compare/29cm.jpg`).

- Matches: the small 29CM mark left of a masthead-sized bold section nav with an uppercase category row and italic Event/Lookbook; a three-panel hero with a dark knit texture and label on the left, lilac and cream panels with display captions; header compression on scroll; a feed of full-height brand columns with thin uppercase names beside two curation columns with square images, bold titles, and three product rows with red discounts and hearts.
- Deliberate differences: masthead section names, brands, and products are invented; photography is replaced by drawn products; the privacy-incident modal that covers every capture frame is omitted.
- Remaining gaps: the study has four feed blocks (4,042px) against the original's much longer run (12,659px); the drawn imagery cannot match the original's fashion photography.
