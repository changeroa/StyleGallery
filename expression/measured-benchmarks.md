---
type: Domain Guide
title: Measured Expression Benchmarks
description: Computed-style measurements of 49 live brand homepages against their 49 StyleGallery brand studies, with the systematic gaps that made the studies read as less expressive.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Measured Expression Benchmarks

Primary role: measured reference values and the gap diagnosis behind the Expression directions.

## Repository Boundary

These are observations of public homepages and of `showcase/` studies, taken on 2026-09-28. They calibrate Expression directions and review. They are not tokens, not Layout inputs, and not a claim about how any brand builds its site.

## Reusable Method

Every original homepage in `site-compiler/candidates.json` and its study in `showcase/<slug>/` was loaded in headless Chromium at 1440x900, scrolled top to bottom in 450px steps, and profiled from `getComputedStyle` on every visible element. Text measures are weighted by character count; surface measures by painted area. Five originals could not be measured: `ohou` and `tesla-model3` returned an access-denied page, and `baemin`, `perplexity`, and `lusion` scroll inside a container, so the document never grows past one viewport. The table covers the remaining 49 pairs.

### What The Originals Do (Median Of 49)

| Measure | Originals p25 / median / p75 | Studies median | Studies off by 20%+ |
| --- | --- | --- | --- |
| Body text size | 13 / **14px** / 16 | 13px | lower 5, higher 4 |
| Largest text size | 40 / **56px** / 72 | 70px | higher 20 |
| Largest size / body size | 2.8 / **3.95** / 5.5 | 5.2 | higher 22 |
| Share of characters set at display size | 0.4% / **4.7%** / 8.2% | 8.6% | higher 34 |
| Display weight | 413 / **574** / 646 | 611 | higher 11 |
| Display tracking | -0.023 / **-0.012em** / 0 | -0.029em | tighter 30 |
| Body tracking | -0.005 / **0em** / 0 | -0.01em | tighter 35 |
| Display line height | 1.06 / **1.15** / 1.29 | 1.25 | |
| Body line height | 1.37 / **1.44** / 1.49 | 1.53 | |
| Font families in use | 1 / **2** / 4 | 3 | more 27 |
| Distinct weights | 3 / **4** / 5 | 5 | more 19 |
| Raster images, video, and background images, % of page area | 31 / **53%** / 108 | **0%** | lower 49 |
| Gradient-painted area | 0 / **3.9%** / 17 | 26% | higher 35 |
| Distinct background colors | 5 / **8** / 15 | 13 | more 28 |
| Background band changes down the page | 0 / **3** / 9 | 6 | more 24 |
| Page length in viewports | 6.3 / **9.1** / 13.7 | 4.4 | shorter 44 |
| Elements with 1px borders | 3 / **24** / 65 | 13 | fewer 28 |
| Elements with mask or clip-path | 1 / **12** / 27 | **0** | fewer 42 |
| Elements with soft (24px+ blur) shadows | 0 / **0** / 1 | 2 | more 22 |
| Elements with transitions | 38 / **76** / 139 | 8 | fewer 40 |
| Elements whose transform, opacity, clip, or filter changed during a scroll | 4 / **17** / 107 | 6 | fewer 34 |
| Most common transition duration per site | 150 / **200ms** / 300 | 400ms | longer 28 |

Area percentages can exceed 100% because nested and overlapping media are each counted.

### By Direction (Original / Study Medians)

| Direction | n | Body | Max size | Ratio | Display weight | Display tracking | Raster area | Gradient area | Viewports | Transitions | Scroll-changed | Top duration |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [Fintech Clarity](directions/fintech-clarity.md) | 11 | 14 / 15 | 58 / 80 | 3.7 / 5.0 | 625 / 700 | -0.009 / -0.032 | 72% / 0 | 9% / 37% | 9.6 / 5.2 | 83 / 8 | 19 / 9 | 300 / 400ms |
| [Hardware Catalogue](directions/hardware-catalogue.md) | 5 | 12 / 14 | 80 / 102 | 6.7 / 7.9 | 574 / 606 | 0 / -0.035 | 101% / 0 | 1% / 44% | 17.5 / 3.9 | 66 / 10 | 18 / 6 | 200 / 400ms |
| [Developer Tool](directions/developer-tool.md) | 10 | 14 / 13 | 64 / 77 | 4.6 / 5.9 | 460 / 500 | -0.020 / -0.032 | 34% / 0 | 25% / 10% | 9.1 / 5.0 | 139 / 10 | 163 / 12 | 150 / 300ms |
| [Korean Service](directions/korean-service.md) | 15 | 14 / 12 | 32 / 44 | 2.0 / 3.4 | 590 / 715 | -0.001 / -0.023 | 87% / 0 | 0% / 19% | 6.3 / 3.7 | 49 / 7 | 5 / 1 | 200 / 300ms |
| Product and creative tools | 8 | 16 / 13 | 88 / 77 | 5.5 / 5.9 | 660 / 763 | -0.027 / -0.024 | 46% / 0 | 4% / 20% | 10 / 5.9 | 56 / 6 | 15 / 9 | 200 / 400ms |

### The Measured Gaps

1. **No imagery, so gradients filled the space.** Originals give roughly half their page area to photography, product renders, and video; the studies gave none and painted six times more gradient area instead. Gradients read as atmosphere, not content, so whole sections felt empty. See [Image Weight](techniques/image-weight.md).
2. **Type shouted instead of scaling.** Studies set more text at display size, larger, heavier, and tighter than the originals, and used an extra family and weight. The originals hold display type near 0em tracking at Korean and system faces and keep the display-to-body ratio near 4. See [Display Type Calibration](techniques/display-type-calibration.md).
3. **Surfaces lacked finishing detail.** Originals use about twelve masks or clip-paths per page (edge-fade masks on scrollers, rounded inset clips on media, wipes) and twice as many hairlines; studies used none, and substituted soft shadows. See [Masks, Clips, And Hairlines](techniques/surface-detail.md).
4. **Too few things responded.** Originals put transitions on about 76 elements, mostly `opacity`, `color`, `transform`, and `background-color`, and most sites' dominant duration is 150-300ms. Studies transitioned about 8 elements at 400ms, so the page felt static between big set pieces and sluggish when it did move.
5. **Pages were compressed.** Studies are about half as long and change background band twice as often, so each idea got a single short beat instead of a paced sequence.

### Motion Density To Hand To Motion

Expression names the density; [Motion techniques](../motion/techniques/scroll-choreography.md) implement it. Measured across the originals:

- Hover and state transitions: 100-320ms. Frequent curves: `ease`, `cubic-bezier(0.23, 1, 0.32, 1)`, `cubic-bezier(0.4, 0, 0.2, 1)`, `cubic-bezier(0.25, 1, 0.5, 1)`, `cubic-bezier(0.25, 0.46, 0.45, 0.94)`.
- Reveals: 400-500ms, `cubic-bezier(0.33, 1, 0.68, 1)` (Stripe) or scroll-scrubbed with no transition at all (Apple, Toss), translating 30px or less.
- Libraries are rare: of 49 originals, WebGL appears on 8, Lenis smooth scroll on 4, GSAP on 3, Lottie on 2, Framer on 2. The expressiveness is mostly plain CSS applied to many elements.

## Opinionated Guidance

Spend expression on content and response, not on scale. The studies tried to be striking with bigger type and more gradients; the originals are striking because every card has a picture, every link answers the pointer within a fifth of a second, and the type stays calm enough to let both show.

Treat the medians as a floor for a finished page, not a target to exceed: a showcase page with fewer than about 40 transitioning elements, no masks, and no raster or rendered imagery will read as a wireframe regardless of its palette.

## Platform-Specific Guidance

The numbers come from desktop Chromium at 1440x900 with an `en-US` locale. Mobile layouts, Safari font rendering, and logged-in states were not measured. Character-weighted type measures favour dense listing pages; the per-direction table separates those from landing pages.

A condensed version of the measurement, runnable in the console of any page after scrolling it:

```js
const runs = [...document.querySelectorAll('body *')].flatMap((el) => {
  const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim()
  if (!text || !el.getClientRects().length) return []
  const s = getComputedStyle(el), fs = parseFloat(s.fontSize)
  return [{ n: text.length, fs, fw: +s.fontWeight, ls: s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing) / fs }]
})
const body = Object.entries(runs.reduce((m, r) => ((m[Math.round(r.fs)] = (m[Math.round(r.fs)] || 0) + r.n), m), {})).sort((a, b) => b[1] - a[1])[0][0]
const transitions = [...document.querySelectorAll('body *')].filter((el) => parseFloat(getComputedStyle(el).transitionDuration) > 0).length
const clipped = [...document.querySelectorAll('body *')].filter((el) => { const s = getComputedStyle(el); return s.clipPath !== 'none' || (s.maskImage && s.maskImage !== 'none') }).length
console.table({ body, max: Math.max(...runs.map((r) => r.fs)), ratio: Math.max(...runs.map((r) => r.fs)) / body, transitions, clipped })
```

## Unsupported Absolutes

One snapshot per site, one viewport, one day. Sites change weekly, and consent banners, A/B tests, and lazy-loaded media shift individual numbers. Medians over 49 sites are stable enough to direct work; a single site's row is not a specification of that brand.

## Verification Contract

When a showcase study or a direction is revised against these benchmarks, re-run the console measurement on the study and record the before and after values in the study's `brief.md`. Re-measure the originals before quoting any single-site value older than a quarter.

## Source, License, And Attribution

Locally authored from measurements of publicly served homepages. Only computed style values and counts were recorded; no markup, copy, images, or code from the measured sites is reproduced.

## IA Navigation

Parent: [Expression](index.md).
Next: [Image Weight](techniques/image-weight.md).
