---
type: Showcase Brief
title: Toss, unofficial study
description: A bright Korean fintech page told in pinned scroll stages - an inset hero that opens to full bleed, a pinned accordion, blur-to-focus copy, and a device pill that grows into the room.
brand_study: true
subject: Toss
source_capture: site-compiler/out/packs/toss-im (2026-09-10 and 2026-09-21, 1440x900, 50,964px)
---

# Toss, unofficial study

## Direction

Reference: the captured toss.im home. Mood: daylight, white space, one confident blue, and scenes that take the whole screen one at a time. Signature: every chapter is a pinned stage, and the transition between chapters is a shape changing size - card to full bleed, pill to room, tile to sky.

## System

- Type: Pretendard Variable 700 headlines with -0.035em tracking, 400 body at 17px, `word-break: keep-all` for Korean line breaks.
- Palette: ground `#ffffff`, soft `#f2f4f6`, ink `#191f28`, secondary `#4e5968`, blue `#3182f6`, data orange `#ff5b2e`, device black `#0e1013`, sunset `#40559a -> #f09a5c`.
- Texture: none. Painted gradient scenes replace photography.
- Motion density: five pinned stages, one ambient terrain, one counter, one live clock.

## Techniques

- [Scroll choreography](../../motion/techniques/scroll-choreography.md): sticky stages with progress derived from position.
- [Gradient atmosphere](../../expression/techniques/gradient-atmosphere.md) for painted scenes.
- Clip-path inset growth for card-to-full-bleed transitions; scroll fades use text color alpha, never opacity, so offline reading checks stay green.

## Layout Floor

The document scrolls. Pinned stages are `position: sticky` inside tall tracks only when JavaScript runs and motion is allowed; otherwise every stage is a static block following the SceneBook's static path. The header scrolls away with the hero. At 320px the phone mockups and device renders hide and grids become one column.

## Comparison With The Original

Reviewed side by side at 1440x900 against 7 capture frames (`.tmp/compare/toss-im.jpg`).

- Matches: the inset rounded hero card with a three-phrase line along its bottom, the left tick indicator, the pinned asset accordion with a tilted phone and a floating alert card, the blur-to-focus one-line intro on pale grey, the dot-cloud terrain with one orange peak and a pinned label, the black pill between two words, and the four stair-stepped tiles under a blue-accented headline.
- Deliberate differences: all copy is newly written; photography and video are replaced by painted gradient scenes; devices are drawn in CSS; the hero card animates to full bleed with clip-path rather than a video crossfade. The page is 18,568px against the original 50,964px because each pinned stage uses a shorter track.
- Remaining gaps: the original's photographic warmth (people, products) is not reproduced; the payments dashboard and shopping checkout stages are compressed into the box scene and the pill stage.
