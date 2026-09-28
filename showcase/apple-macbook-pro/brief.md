---
type: Showcase Brief
title: Apple MacBook Pro, unofficial study
description: A long black product story that ends in a light shop: a CSS laptop whose lid opens on scroll beside a gradient headline and price pill, a chip highlight card, spec pills that rewrite a paragraph, a pinned stage that steps through three invented chips over a shifting color field, a starry battery section, a blue system section, ports, and a light section with reasons, a color-switch comparison, and a directory.
brand_study: true
subject: Apple (MacBook Pro)
source_capture: site-compiler/out/packs/apple-macbook-pro
---

# Apple MacBook Pro, unofficial study

## Direction

Reference: the captured apple.com/macbook-pro page (2026-09-21, 1440x900, 30,873px). Mood: a dark theatre for one object, then the lights come up for the shop. Signature: the laptop is drawn in CSS and actually opens - its lid rotates from nearly closed to open and the screen lights as you scroll - and the performance stage pins while three invented chips take turns.

## System

- Type: system sans (SF on Apple devices, Inter fallback), 600-700 headlines at -0.035 to -0.04em.
- Palette: black `#000`, panel `#161617`, text `#f5f5f7`, dim `#a1a1a6`, link `#2997ff`, buy blue `#0071e3`; headline gradient `#9fe0e8 -> #6f9ad8 -> #b7a4e8`; light zone `#f5f5f7`.
- Motion density: lid open (scroll-derived), split headline, chip hover, pinned three-step stage with breathing color field (paused offscreen), counters, nav theme flip.

## Techniques

- [Scroll choreography](../../motion/techniques/scroll-choreography.md) with the kit's `sg-track`/`sg-stage` pinned stage.
- Gradient-clipped display text; dark-to-light local nav switch.

## Layout Floor

Sticky local nav; the pinned stage is sticky only with JavaScript and motion, otherwise static; the laptop fades behind the copy below 760px; compare and ports stack.

## Comparison With The Original

Reviewed side by side at 1440x900 against 8 capture frames (`.tmp/compare/apple-macbook-pro.jpg`).

- Matches: a black page with a sticky dark local nav (product name left, small links and a blue Buy pill right); a hero with a large dark laptop, a small eyebrow, a gradient-filled headline, a sub, and a dark price pill with a Buy button; a dark rounded highlights card with three glowing chip tiles and a pill dot indicator; spec exploration pills; a pinned performance stage; a starry battery section with a two-line headline and a big stat; a blue wave system section with a centered two-line headline; a ports section with a device edge; a switch to a light grey zone with white reason cards, a comparison, and a directory.
- Deliberate differences: the laptop is drawn in CSS and its lid opens on scroll; chip names (X5, X5 Pro, X5 Max), specs, and prices are invented; the performance video is replaced by a pinned color field that steps through three chips; the battery photo becomes a painted night sky; the Apple mark and product photography are not used; legal footnotes are omitted.
- Remaining gaps: study 9,087px vs 30,873px; the original's upgrade bento, AI/privacy chapter, values cards, and long legal section are omitted or condensed.
