---
type: Showcase Brief
title: Tesla Model 3 - unofficial brand study
description: Full-bleed vehicle stages, a centered transparent header, three-stat rows, one blue button, a range estimator, and a live SVG configurator.
brand_study: true
subject: Tesla Model 3
source_capture: site-compiler/out/packs/tesla-model3
---

## Direction

Tesla's vehicle-page register: each section is a full-viewport stage with a centered title at the top, the car in the middle, and a row of three large stats with two equal-width buttons at the bottom. A thin wide-tracked wordmark and a centered text nav sit on a transparent header that turns solid after the first stage. Everything else is white, soft grey, and one blue.

## System

- Type: Inter 400-500; titles are medium weight, never bold. The wordmark is plain text, not the logo.
- Color: ink #171a20, grey #5c5e62, soft #f4f4f4, blue #3e6ae1 for the primary action only.
- Shape: 4px radii, equal-width buttons (264px), round paint chips with an offset blue ring when selected.
- The car is one SVG symbol; paint is currentColor and wheel rims read a custom property. All prices, ranges, and performance figures are invented.

## Techniques

- Stage template: title / car / stats-and-actions in a three-row grid at 100svh; cars settle upward on scroll.
- Header turns from transparent to blurred white after the first stage.
- Range estimator: segmented wheel and climate choices plus a speed slider feed an invented formula into a large output.
- Configurator: paint and wheel chips recolour the drawing and update the price, announced in a polite status.

## Layout Floor

The fixed header height is covered by --sg-header for hash targets. Every order, drive, and account action is an honest demo button; motion is scroll-linked and removed under reduced motion.

## Comparison With The Original

No frame-by-frame comparison was possible. The capture in `site-compiler/out/packs/tesla-model3` recorded an "Access Denied" error page (900px, one frame) instead of the vehicle page, so the study is built from the brand's public vehicle-page conventions rather than from observed frames.

- Matches: not verifiable against this capture.
- Deliberate differences: no photography, logo, or copy is reused; the car is drawn, and every figure is invented.
- Remaining gaps: re-capture the page from an unblocked network, then compare stage order, stat rows, and header behaviour.
