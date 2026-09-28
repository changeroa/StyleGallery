---
type: Domain Recipe
title: Display Type Calibration
description: Measured display-to-body ratios, weights, tracking, and leading from 49 live homepages, and how to calibrate a page's type so it reads confident instead of loud.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Display Type Calibration

Primary role: visual technique recipe.

## Repository Boundary

Product-layer CSS for `showcase/` works and consumer pages. Type values here are calibration targets, not tokens, and never enter reusable Layout pattern CSS.

## Reusable Method

The studies overshot every display measure in [Measured Expression Benchmarks](../measured-benchmarks.md): larger (70px against 56px), a higher display-to-body ratio (5.2 against 3.95), twice the share of characters at display size (8.6% against 4.7%), tighter tracking (-0.029em against -0.012em), and an extra family and weight. Calibrate in four steps.

### 1. Pick The Ratio From The Page's Job

| Page job (measured group) | Body | Largest size | Ratio | Display weight | Display tracking | Display leading |
| --- | --- | --- | --- | --- | --- | --- |
| Korean service and commerce | 14px | 26-32px | 1.6-2.0 | 590 | 0em | 1.31 |
| Fintech landing | 14px | 58px | 3.7 | 625 | -0.009em | 1.21 |
| Developer tool | 14px | 64px | 4.6 | 460 | -0.020em | 1.17 |
| Product and creative tool | 16px | 88px | 5.5 | 660 | -0.027em | 1.14 |
| Hardware catalogue | 12px | 80px | 6.7 | 574 | 0em | 1.11 |

Korean commerce homepages rarely set anything above 32px; their density, imagery, and badges carry the page. A 60px headline on a commerce page is the single clearest sign of a study.

### 2. Tighten Only Latin Display Faces

Tracking at display size is near 0em for Pretendard, Apple's system face, and most Korean pages, and negative only for Latin grotesks (Inter, Söhne, Geist, GT Walsheim) at -0.02 to -0.03em. Body tracking is 0em almost everywhere.

```css
:root { --display-track: 0em; }
:lang(en) .display, .display:lang(en) { --display-track: -0.02em; }
.display { font-size: clamp(2.2rem, 1.2rem + 3.2vw, 3.6rem); font-weight: 620; letter-spacing: var(--display-track); line-height: 1.15; }
body { font-size: 14px; letter-spacing: 0; line-height: 1.45; }
```

### 3. Budget Display Characters

Keep display-size text to about 5% of the characters on the page: one headline per section, two lines, and nothing else at that size. Section titles one step down (about 1.6-2x body) do the rest of the wayfinding.

### 4. Two Families, Four Weights

The median original uses 2 families (a sans plus either a mono or a serif accent) and 4 weights. If a study needs a third family, it replaces one, not adds one.

## Opinionated Guidance

Confidence comes from contrast between a few sizes, not from the biggest size. When a section feels flat, first add an image or a live product surface; only then consider a larger headline.

Line height follows size: 1.1-1.2 at display, 1.44 for body (the studies' 1.53 read airy and unfinished at 13px).

## Platform-Specific Guidance

Korean fonts carry their own optical spacing; negative tracking collides final consonants at bold weights. `:lang()` requires a correct `lang` attribute on `html` or the text element. Variable fonts accept intermediate weights like 590 or 620; static fonts round to the nearest instance, so check the rendered weight in DevTools.

## Unsupported Absolutes

Values are medians of character-weighted desktop measurements. They are ranges to land inside, not exact specifications of any brand's type system.

## Verification Contract

A page using this recipe passes `node scripts/check-showcase.mjs`. Record the page's measured body size, largest size, ratio, and display tracking in its brief, taken with the console measurement in [Measured Expression Benchmarks](../measured-benchmarks.md); each should fall inside the p25-p75 range for its group.

## Source, License, And Attribution

Locally authored from computed-style measurements of public homepages. Font family names are reported as observed; no font files or code are reproduced.

## IA Navigation

Parent: [Expression](../index.md).
Next: [Masks, Clips, And Hairlines](surface-detail.md).
