---
type: Showcase Brief
title: Lusion - unofficial brand study
description: A pale lavender page, one dark rounded stage of white, cobalt, and black jacks that follow the pointer, pill buttons, and scroll-lit statements.
brand_study: true
subject: Lusion
source_capture: site-compiler/out/packs/lusion
---

## Direction

Lusion's studio register: a pale lavender page, a bold uppercase wordmark top left, and one large dark rounded panel that holds a real-time 3D scene of six-armed pieces in white, cobalt, and black. A circle button, a dark "Let's talk" pill, and a light "Menu" pill sit top right; a mono "Scroll to explore" cue sits under the stage.

## System

- Type: Inter Tight 500-700 for headlines and wordmark, JetBrains Mono uppercase for buttons and cues.
- Color: paper #eceaf3, panel #0c0f1d, cobalt #2f5bff, pill grey #dcdae6.
- Shape: 14px panel radius, full pills with small dot glyphs, one round icon button.
- The wordmark is plain text, not the logo. Projects and numbers are invented.

## Techniques

- Software 3D on a 2D canvas: sixteen jacks, each built from shaded spheres along six arms, rotated, perspective-projected, depth-sorted, and eased toward the pointer. The loop pauses offscreen, in hidden tabs, on the pause button, and under reduced motion (which draws one still frame that still follows the pointer).
- Menu pill is a real disclosure with Escape to close and focus moved into the list.
- Statement words brighten with scroll progress; project cards zoom their artwork on hover and focus.

## Layout Floor

The sticky header height is covered by --sg-header. Every contact and case-study action is an honest demo. Without canvas support a caption stays in place of the scene.

## Comparison With The Original

Reviewed side by side at 1440x900 against the 2 capture frames (`.tmp/compare/lusion.jpg`). The capture recorded only the first viewport, so only the hero can be compared.

- Matches: a pale lavender page, an uppercase wordmark top left, a large dark rounded panel packed edge to edge with six-armed pieces in white, cobalt, and glossy black, and a mono "scroll to explore" cue under it; the round, dark "Let's talk", and light "Menu" buttons top right.
- Deliberate differences: the pieces are shaded spheres on a 2D canvas rather than real-time rendered cylinders, so they read as beaded tubes without end holes; a one-line headline is shown above the stage rather than masked in; everything below the hero (statement, work grid, numbers, contact) is built from the studio's public design language, not from observed frames.
- Remaining gaps: structure below the first viewport cannot be verified against this capture; study 3,753px vs 900px captured.
