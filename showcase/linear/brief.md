---
type: Showcase Brief
title: Linear, unofficial study
description: A dark, hairline-precise product page in Linear's register, with a hero app that settles flat on scroll and a statement that lights up as it is read.
brand_study: true
subject: Linear
source_capture: site-compiler/out/packs/linear (2026-09-21, 1440x900, 9,960px)
---

# Linear, unofficial study

## Direction

Reference: the captured linear.app landing page. Mood: near-black calm, one neo-grotesque family, and product UI as the only imagery. Signature: what if the page moved at reading speed? The hero app tilts back and settles flat as you scroll into it, and the manifesto sentence lights word by word as it crosses the viewport.

## System

- Type: Inter 500 display at `clamp(2.6rem, 6.4vw, 4.6rem)`, tracking -0.035em; Inter 400 body; JetBrains Mono uppercase labels at 11px with 0.08em tracking.
- Palette: ground `#08090a`, raised `#0f1011`, text `#f7f8f8`, secondary `#b4b8bf`, muted `#8a8f98`, accent indigo `#5e6ad2`, data teal `#4cc3c0`, one lime testimonial `#e4f222`.
- Texture: none; depth comes from 8-14% white hairlines and masks that fade surfaces to black.
- Motion density: one hero entrance (split words), one scroll scene (hero tilt), one scroll-read statement, per-section rises, one ambient scatter chart and typing agent.

## Techniques

- [Scroll choreography](../../motion/techniques/scroll-choreography.md) for scroll-derived progress.
- [Kinetic type](../../motion/techniques/kinetic-type.md) for split-word entrance and scroll-read highlighting.
- Masked product surfaces and the repeated two-column feature header come from the capture.

## Layout Floor

The document scrolls; the glass header is fixed at 64px and `scroll-padding-top` keeps anchors below it. At 320px the app sidebar and agent column drop, the board and gantt hide, and every feature header stacks to one column.

## Comparison With The Original

Reviewed side by side at 1440x900 against 8 capture frames (`.tmp/compare/linear.jpg`, regenerate with `node .tmp/compare.mjs linear`).

- Matches: near-black ground with a soft hero glow, left-aligned two-line hero, app mockup under the hero, logo row plus two-tone statement, three Fig columns with isometric line art, the repeated two-column feature header (title left, copy at the page midline), masked product surfaces, lavender and lime testimonial pair, centered closing CTA over a five-column footer.
- Deliberate differences: all copy is original, customer names are fictional wordmarks set in type, and illustrations are redrawn SVG. The statement lights word by word on scroll and the hero app settles from a tilt; the capture shows both static.
- Remaining gaps: the study is about 26% shorter (7,330px vs 9,960px) because feature surfaces are shorter; mockup UI text is smaller and sparser than the original's dense product screens; the original's changelog strip above the testimonials is omitted.
