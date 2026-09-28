---
type: Showcase Brief
title: Rivian - unofficial brand study
description: A floating rounded header, giant model names behind drawn vehicles, pill buttons, dusk landscapes, a charge estimator, and four earth-tone tiles.
brand_study: true
subject: Rivian
source_capture: site-compiler/out/packs/rivian
---

## Direction

Rivian's homepage register: a floating rounded white header bar inset from the edges with a wide-tracked wordmark and a gold pill, a full-bleed hero carousel, then a light grey lineup where each model name is set enormous and the vehicle overlaps the bottom of the letters. The page moves through blue-grey, a snow ridge, charcoal charging and software sections, four earth-tone tiles, and a dusk desert mission.

## System

- Type: Inter at 700-800 with tight tracking for headlines; the wordmark is plain text with wide tracking, not the logo.
- Color: paper #eceeed, mist #dfe5e8, ink #111, charcoal #0f1112, gold #f2b33d for the demo-drive pill, subscribe, and charging accents; tiles in mustard, sage, brick, and steel blue.
- Shape: full pills for every button, round arrow buttons, 22-24px card radii, 14px header radius.
- Vehicles are two SVG side-profile symbols recoloured with currentColor; landscapes are CSS gradients. Model names (S7, S3, T7), prices, ranges, and ratings are invented.

## Techniques

- Manual hero carousel with arrows and a pill dot indicator whose active dot stretches; slides swap drawn scenes and copy, announced politely.
- Giant name behind the vehicle: negative top margin pulls the SVG over the type; scroll progress rolls each vehicle in from the left.
- Paint swatches recolour the drawn vehicle through one custom property.
- Kit tabs for Technology / Performance / Design; the performance speed gauge counts up once on view.
- Charge estimator: a range input drives an invented charge curve, a gold meter, and an output.
- Forms validate the email and then say honestly that nothing was sent.

## Layout Floor

The sticky header is inset and its height is covered by --sg-header for hash targets. Every buy, booking, and video action is an honest demo. The hero never autoplays; motion is scroll-linked or one-shot and removed under reduced motion.

## Comparison With The Original

Reviewed side by side at 1440x900 against 8 capture frames (`.tmp/compare/rivian.jpg`). A consent panel and dark scrim cover part of every capture frame.

- Matches: the floating rounded white header with a wide-tracked wordmark and gold pill; a full-bleed hero with left-aligned white headline, outline pill, round arrows, and a pill dot indicator; a blue-grey tabbed section with a filled active tab; a snowy safety band; charcoal charging and software sections; four earth-tone tiles with round arrow buttons; a dusk mission section with a dark play pill; legal footnotes at the end.
- Deliberate differences: photography becomes drawn SVG vehicles and gradient landscapes; model names (S7, S3, T7), prices, ranges, and the safety award are invented; the capture's "RIVIAN" letters on a building become nothing (no logo use). The lineup shows all three models in sequence rather than one pinned name per 2,500px.
- Remaining gaps: the original's photographic depth and the video in the tabbed card are not reproduced; study 10,110px vs 17,041px.
