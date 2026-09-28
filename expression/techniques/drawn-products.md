---
type: Domain Recipe
title: Drawn Products
description: SVG and CSS recipes for intentional schematic product graphics, not replacements for existing photography or renders.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Drawn Products

Primary role: visual technique recipe.

## Repository Boundary

Product-layer CSS and SVG for `showcase/` works and consumer pages. Never add these declarations to reusable Layout pattern CSS.

## Reusable Method

Use existing product photography and renders first. The early showcase studies drew objects because an older policy excluded photography; that constraint no longer applies. These four recipes are retained for intentional vector graphics, diagrams, and schematic controls only. Do not use them to fill a photographic hero or replace a detailed product image. See [Image Weight](image-weight.md).

### One Symbol, Many Paints

Define the object once as an SVG `<symbol>` whose body uses `currentColor`, then reuse it with `<use>`. The Rivian and Tesla studies draw every vehicle on the page from one or two symbols.

```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="sedan" viewBox="0 0 1000 300">
    <path fill="currentColor" d="M40 214 C40 190 56 176 96 170 L230 150 C300 104 380 80 480 78 C580 76 660 92 740 136 L900 160 C940 166 962 182 962 206 L962 226 C962 234 956 240 946 240 L56 240 C46 240 40 232 40 214Z"/>
    <path fill="#1c1f24" opacity=".85" d="M300 146 C360 108 420 94 490 92 C560 90 620 102 690 138 Z"/>
    <g fill="#121417"><circle cx="230" cy="240" r="56"/><circle cx="780" cy="240" r="56"/></g>
    <g fill="var(--rim, #8b9096)"><circle cx="230" cy="240" r="34"/><circle cx="780" cy="240" r="34"/></g>
  </symbol>
</svg>

<div class="car" style="color: var(--paint, #e6e6e6)">
  <svg viewBox="0 0 1000 300" role="img" aria-label="Drawing of the configured car"><use href="#sedan"/></svg>
</div>
```

```js
// Swatches set one custom property; the drawing follows.
swatch.addEventListener("click", () => view.style.setProperty("--paint", swatch.dataset.c));
```

Glass and tyres get fixed fills so they never recolour; separately configurable parts read their own custom property (`--rim`), which inherits into the `<use>` shadow tree.

### Boxes With Dials

Small hardware reads well as a flat box, a grid of round controls, and one indicator colour. The teenage engineering study builds six invented devices from one class and four custom properties.

```css
.dev { background: var(--bg, #d9dad6); border: 1px solid #9c9d98; block-size: var(--h, 46%); display: grid; gap: 6%; grid-template-columns: repeat(var(--n, 4), 1fr); inline-size: var(--wd, 76%); padding: 5%; }
.dev i { align-self: center; aspect-ratio: 1; background: var(--c, #111); border-radius: var(--rad, 50%); }
```

```html
<div class="dev" style="--bg:#ff5a1f; --n:2; --wd:44%; --h:70%"><i style="--c:#111"></i><i style="--c:#f4f4f2"></i></div>
```

### Outline Phones With Live Screens

Fintech studies (Toss, Revolut, KakaoBank) draw a phone as a rounded outline and put real DOM inside it, so balances and lists can change. Keep the screen content as text, not an image, so it stays readable and translatable.

```css
.phone { border: 2px solid rgb(255 255 255 / .85); border-radius: 44px; inline-size: min(300px, 80vw); padding: 26px 20px; }
.phone .bal { display: block; font: 700 46px/1.1 var(--sans); font-variant-numeric: tabular-nums; letter-spacing: -.03em; }
```

### Lights On A Drawing

Nothing's glyph pad toggles `data-on` on absolutely positioned strips; a glow is a light background plus a wide `box-shadow`. State belongs in attributes so CSS can style it and the pad's `aria-pressed` buttons can drive it.

```css
.glyph { background: #e9e9e6; border-radius: 999px; position: absolute; transition: background .25s, box-shadow .25s; }
.glyph[data-on] { background: #fff; box-shadow: 0 0 22px 6px rgb(255 255 255 / .95), 0 0 40px 10px rgb(255 240 200 / .7); }
```

## Opinionated Guidance

Draw at the level of a pictogram only when a pictogram is the intended asset. If the slot needs material detail, reflections, photographic scenery, or a realistic product view, use an existing asset instead. Recolouring a silhouette does not give it the visual quality of product photography.

Put the name behind the drawing. A huge model name with the object overlapping its lower third (negative top margin on the drawing) gives depth without 3D.

## Platform-Specific Guidance

Give the drawing `role="img"` and an `aria-label` that says what the visitor configured, or `aria-hidden="true"` when an adjacent caption already says it. `filter: drop-shadow()` follows the silhouette of an SVG, while `box-shadow` draws a rectangle; use `drop-shadow` on vehicles.

## Unsupported Absolutes

These recipes produced the study pages named above, which pass the showcase checks. They are not a substitute for product photography on a real product page.

## Verification Contract

A page using these recipes passes `node scripts/check-showcase.mjs`. When the drawing moves with scroll (a vehicle rolling in, a laptop scaling up), show its end state under reduced motion.

## Source, License, And Attribution

Locally authored from the StyleGallery showcase studies. The shapes are original drawings; no brand artwork, photography, or upstream code is reproduced.

## IA Navigation

Parent: [Expression](../index.md).
Next: [Live Product Demos](live-product-demos.md).
