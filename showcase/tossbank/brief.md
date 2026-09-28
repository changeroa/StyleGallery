---
type: Showcase Brief
title: Toss Bank, unofficial study
description: A dark Korean bank home: a blue-grey hero with an original mascot and product carousel, then a long three-column news grid beside a sticky company column.
brand_study: true
subject: Toss Bank
source_capture: site-compiler/out/packs/tossbank (2026-09-21, 1440x900, 3,923px)
---

# Toss Bank, unofficial study

## Direction

Reference: the captured tossbank.com home. Mood: night-mode finance magazine - a soft sky fading to near-black and bright pastel thumbnails as the only color. Signature: an original seedling-coin mascot floats in the hero, and the news grid keeps loading real cards on demand.

## System

- Type: Pretendard Variable, 600 headlines at -0.04em, 15px body.
- Palette: ground `#101216`, card `#1b1e24`, text `#f2f4f6`, secondary `#b0b8c1`, blue `#3182f6`, hero sky `#8494a8 -> #101216`, seven pastel thumbnail grounds.
- Motion density: mascot float loop, mascot scroll drift, staggered card rise, hero copy swap.

## Techniques

- [Gradient atmosphere](../../expression/techniques/gradient-atmosphere.md) for the sky-to-black hero.
- Original SVG icon compositions on pastel gradients replace 3D renders.

## Layout Floor

The document scrolls under a fixed 52px glass header. The company column is `position: sticky` inside the grid, not fixed. The grid goes 3, 2, then 1 column; the side column hides below 860px.

## Comparison With The Original

Reviewed side by side at 1440x900 against 3 capture frames (`.tmp/compare/tossbank.jpg`).

- Matches: the blue-grey to black hero with a left two-line headline, white pill CTA, and two round arrows; a character floating right; a sticky company column at the left edge; a three-column news grid of rounded cards with bright thumbnails over dark caption blocks.
- Deliberate differences: the mascot is an original seedling-coin character, not the site's characters; thumbnails are flat original SVG icons instead of 3D renders; all headlines and article titles are newly written. The grid is generated and "load more" appends real cards.
- Remaining gaps: the original's hero shows the news heading within the first viewport; the study's hero is taller (88vh), pushing the grid lower. Study 2,385px vs 3,923px because fewer rows load initially.
