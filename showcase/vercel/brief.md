---
type: Showcase Brief
title: Vercel, unofficial study
description: A monochrome, left-aligned infrastructure page: a tight two-line hero beside a live dotted globe with request arcs, case blocks with product panels that fade into the page, a card grid of new features, and a pill-button closing.
brand_study: true
subject: Vercel
source_capture: site-compiler/out/packs/vercel (2026-09-21, 1440x900, 5,333px)
---

# Vercel, unofficial study

## Direction

Reference: the captured vercel.com home. Mood: near-white, near-black, one hairline weight, precision typography. Signature: the hero centerpiece is a rotating dotted globe with blue requests arcing between regions, standing in for the brand mark, which the study does not use.

## System

- Type: Geist 500 with -0.055em tracking for the hero, Geist Mono for terminals.
- Palette: ground `#fafafa`, ink `#171717`, grey `#5f5f5f`, lines `#e5e5e5`, one blue `#0070f3` for arcs, one green `#3ddc84` for terminal ticks.
- Motion density: split hero, globe loop (visible only), bar growth, terminal lines, line-drawing card.

## Techniques

- Canvas globe gated by visibility and reduced motion.
- Masked product panels (`mask-image` fade) reused from the Linear study.

## Layout Floor

Sticky blurred header that gains a hairline on scroll; the three-column hero stacks below 900px; case blocks alternate panel side and stack on mobile.

## Comparison With The Original

Reviewed side by side at 1440x900 against 5 capture frames (`.tmp/compare/vercel.jpg`).

- Matches: near-white page with a thin sticky header (links left, Get a Demo / Log In / black Sign Up right), a small centered announcement line, a three-column hero (tight two-line headline with black and white pills left, a central graphic, a short feature list right), a row of customer wordmarks, case blocks with a large two-line title, a hairline product panel that fades out, and a right-hand stat line plus feature list; a "new features" card grid with a large line-drawn card, a dark identity card, and a terminal; a centered closing line with two pills; a six-column link footer.
- Deliberate differences: the brand's triangle mark is never drawn; a rotating dotted globe with blue request arcs takes its place; customers and numbers are fictional; headlines are newly written.
- Remaining gaps: the original's hero graphic is a single bold shape with a soft shadow, which reads stronger at a glance than a fine dot field.
