---
type: Domain Guide
title: Hardware Catalogue Direction
description: A product-as-hero direction for physical goods, distilled from six hardware and vehicle brand studies.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Hardware Catalogue Direction

Primary role: named art direction with starting values.

## Repository Boundary

These values are a starting point for product pages in `showcase/` or a consumer's own CSS. They are not tokens, defaults, or Layout inputs.

## Reusable Method

Mood: a quiet showroom where each object gets its own stage. One product per viewport, a big name, a short line, three numbers, and two buttons. Everything else stays out of the light.

The direction is distilled from the showcase studies of Apple iPhone, Apple MacBook Pro, Nothing, teenage engineering, Tesla Model 3, and Rivian. Those early studies used CSS/SVG stand-ins under an older asset policy. Do not repeat that compromise: reuse existing product photography or renders, and create vectors only for deliberately schematic graphics.

```css
:root {
  --stage-light: #f4f4f4;      /* studio ground */
  --stage-dark: #0e0e0e;       /* night ground for alternating stages */
  --ink: #171a20;
  --ink-2: #5c5e62;
  --accent: #3e6ae1;           /* primary action only (Tesla blue); Nothing uses red #d71921 as an indicator light */
  --sans: "Inter", system-ui, sans-serif;  /* medium weight titles, never bold on vehicle pages */
  --mono: "IBM Plex Mono", ui-monospace, monospace;  /* catalogue labels, codes, prices */
  --ease: cubic-bezier(0.5, 0, 0, 1);
}
```

| Role | Value |
| --- | --- |
| Stage | A 100svh section in a three-row grid: title at the top, object in the middle, stats and actions at the bottom |
| Product name | Either medium 500 at `clamp(2.2rem, 4.6vw, 3.4rem)` (Tesla, Apple) or enormous 800 at `clamp(6rem, 24vw, 22rem)` with the object overlapping the letters (Rivian). Measured originals: 80px largest over a 12px body (ratio 6.7), weight 574, tracking 0em, line height 1.11 |
| Stats row | Three figures, 500 weight, `clamp(1.6rem, 2.6vw, 2.2rem)`, 13px unit label under each |
| Actions | Two equal-width buttons (Tesla uses 264px min width, 4px radius) or pill pairs (Rivian, Apple) |
| Catalogue grid | Hairline 1px dividers on each cell, square corners, mono code and price, blue underlined "buy" links (teenage engineering) |
| Indicator colour | One small, saturated colour used like an LED: Nothing red, teenage engineering orange knob, Rivian gold pill |
| Object | An existing product render or photograph that fills the stage, in both a study and a real product page. Paint swatches can select existing variant assets. Use a recolourable SVG symbol only for an intentionally vector illustration, never as a substitute for photographic detail |
| Motion density | The object settles or rolls in with scroll progress; configurators respond instantly; about 66 elements with responsive states at 200ms; no idle loops |
| Length | Several stages per product, not one: measured originals run 17.5 viewports, the studies 3.9. See [Measured Expression Benchmarks](../measured-benchmarks.md) |

## Opinionated Guidance

Give the object a job the visitor can do. The Nothing glyph pad, the teenage engineering step sequencer, the Rivian and Tesla paint swatches, and the Tesla range estimator each hold attention longer than any headline, and none of them needs a photo.

Alternate grounds, not layouts. The captures of Tesla, Rivian, and teenage engineering all repeat one stage template and change only the ground between light studio, dark night, and landscape gradient. A repeated template reads as a catalogue; a new layout per section reads as a brochure.

Put the name behind the object. Setting the model name huge and letting the drawing overlap its lower third (Rivian) gives depth without any 3D.

## Platform-Specific Guidance

`<use href="#symbol">` inherits `color` from the `<svg>` element, so one symbol serves every paint option. Parts that must not recolour (glass, tyres) get explicit fills inside the symbol; parts that must recolour separately (wheel rims) read a custom property such as `fill="var(--rim, #8b9096)"`, which works because custom properties inherit into the shadow tree of `<use>`.

Web Audio for a playable instrument must start only after a click, stop by itself (two bars in the teenage engineering study), and never loop while offscreen.

## Unsupported Absolutes

These values produced six study pages that pass the showcase checks, but that does not establish photographic quality. Drawn objects are no longer a study requirement; select existing media for photographic slots.

## Verification Contract

A page using this direction passes `node scripts/check-showcase.mjs`. Stages with white text over drawn landscapes fail contrast when the gradient lives on an absolutely positioned child: give the section itself a dark `background-color` that matches the text's worst case (the Rivian hero measured 1.17:1 until the section got `#2c3a4d`).

## Source, License, And Attribution

Locally authored from the StyleGallery showcase studies listed above, which are unofficial and reuse no logos, photographs, or copy. Font families are open-source (SIL Open Font License); no upstream prose or code is reproduced.

## IA Navigation

Parent: [Expression](../index.md).
Next: [Developer Tool Direction](developer-tool.md).
