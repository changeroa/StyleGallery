---
type: Showcase Brief
title: Apple iPhone store hub, unofficial study
description: A white product store hub: a region notice, a sticky translucent nav, a giant product title over an icon strip of CSS-drawn phones, a rounded grey hero card with a foldable that opens on scroll, a sideways carousel of reasons to buy, accessory tiles, an expandable devices panel, a directory band, and footnotes.
brand_study: true
subject: Apple (iPhone)
source_capture: site-compiler/out/packs/apple-iphone
---

# Apple iPhone store hub, unofficial study

## Direction

Reference: the captured apple.com/iphone page (2026-09-21, 1440x900, 15,735px). Mood: retail calm - white, soft grey cards, blue links, product as the only color. Signature: every device is drawn in CSS, and the hero foldable opens from a 60-degree angle to flat as the card scrolls into view.

## System

- Type: system sans (SF on Apple devices, Inter fallback) at -0.02em body, 600 at -0.045em for the title.
- Palette: white, soft `#f5f5f7`, ink `#1d1d1f`, grey `#6e6e73`, hairline `#d2d2d7`, link blue `#0066cc`, "New" `#b64400`.
- Motion density: split title, fold opening (scroll-derived), card lift, icon lift, carousel scroll, panel swap.

## Techniques

- [Scroll choreography](../../motion/techniques/scroll-choreography.md) for the fold angle.
- Filled blue pill plus text link with chevron as the paired CTA.
- Shadowed white cards on a grey rail with round plus buttons.

## Layout Floor

Sticky translucent nav; the icon strip and reason rail scroll sideways inside their own boxes; hero, accessories, and devices panel stack on narrow screens.

## Comparison With The Original

Reviewed side by side at 1440x900 against 3 capture frames (`.tmp/compare/apple-iphone.jpg`).

- Matches: a grey region notice with a dark Continue button and close X; a thin translucent nav; a one-line promo with a blue link; a giant left-aligned product title over a strip of small product icons with orange "New" labels; a large rounded grey hero card with a two-line product name left, a blue pill plus text link right, and a foldable phone rising from the bottom edge; a grey rail of white shadowed reason cards with round dark buttons and prev/next controls; accessory tiles; long grey footnotes.
- Deliberate differences: every device is drawn in CSS; model names, plans, and offers are invented; the fold opens on scroll; the devices panel swaps its drawings; the long legal footnotes are replaced by two notes; the Apple mark and nav are not reproduced.
- Remaining gaps: study 3,339px vs 15,735px, almost all of the difference being the original's legal footnotes and sitemap.
