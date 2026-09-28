---
type: Showcase Brief
title: Raycast, unofficial study
description: A near-black launcher page: blurred red light stripes behind a centered two-line promise, a working command palette, keyboard-cap tiles, an extension rail, an assistant transcript, a quote wall, automation cards, an isometric API stack, and a keyboard that lights under real key presses.
brand_study: true
subject: Raycast
source_capture: site-compiler/out/packs/raycast
---

# Raycast, unofficial study

## Direction

Reference: the captured raycast.com home (2026-09-21, 1440x900, 15,983px). Mood: black glass, one hot red, keyboard as the hero object. Signature: the page is operable - the palette filters and moves with arrow keys, and the closing keyboard lights the key you press.

## System

- Type: Inter 600-700 with -0.045em hero tracking; JetBrains Mono for meta lines.
- Palette: ground `#070708`, panel `#111113`, text `#f4f4f5`, dim `#a1a1aa`, red `#ff4b55`, extension card gradients indigo, blue, green, rust.
- Motion density: stripe glide, palette auto-cycle while idle, assistant steps, snippet typing, key glow; all loops paused offscreen.

## Techniques

- [Gradient atmosphere](../../expression/techniques/gradient-atmosphere.md) via blurred rotated stripes.
- Two-tone centered section titles (white line, dim line).

## Layout Floor

Fixed pill header with 90px scroll padding; palette preview stacks below 700px; keyboard tiles go to two columns below 560px.

## Comparison With The Original

Reviewed side by side at 1440x900 against 8 capture frames (`.tmp/compare/raycast.jpg`).

- Matches: a floating pill header over a near-black page; a centered two-line bold hero over blurred diagonal red light with a small grey download button and mono meta line; two-tone centered section titles (white line, dim line); a large launcher window with a list on the left and a big color swatch preview on the right; keycap tiles beside a short philosophy line; colored extension cards (indigo, blue, green); an assistant window with a sidebar; automation cards with keycaps and a blue snippet panel; a large light-weight three-line developer title beside an isometric blue stack; a dark keyboard with one glowing command key; a link footer.
- Deliberate differences: the palette actually filters and moves with arrow keys, the keyboard lights the key you press, and all quotes are fictional; the original's video/community section is replaced by a quote wall.
- Remaining gaps: study 6,158px vs 15,983px; the original's hero stripes are sharper glossy ribbons rather than soft blur.
