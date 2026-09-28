---
type: Domain Recipe
title: Image Weight
description: How much of a page the measured originals give to imagery, how they frame it, and how a brand study fills those slots with original imagery instead of gradients.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Image Weight

Primary role: visual technique recipe.

## Repository Boundary

Product-layer HTML and CSS for `showcase/` works and consumer pages. Never add these declarations to reusable Layout pattern CSS. Brand studies still follow [Brand Studies](../brand-studies.md): no brand photography, logos, or product renders.

## Reusable Method

The largest measured gap in [Measured Expression Benchmarks](../measured-benchmarks.md) is imagery. Raster images, video, and background images cover a median 53% of the originals' page area (72% for fintech, 87% for Korean services, about 100% for hardware), and 0% of the studies. The studies filled the same slots with gradients (26% of area against 4%), which reads as a placeholder waiting for its picture.

### Budget Imagery Per Section

Plan one image slot per section before writing CSS, and size it to carry the section:

| Section job | Measured pattern | Slot |
| --- | --- | --- |
| Hero | Full-bleed photo or render behind or beside the headline (Rivian, Revolut, Mercury, Apple) | 100vw x 70-100svh, `object-fit: cover` |
| Feature card | Picture or product screen fills the top 55-65% of the card | `aspect-ratio: 4 / 3` or `16 / 10` |
| Listing tile | Square or 3:4 product image, text below (Musinsa, Kurly, 29CM) | `aspect-ratio: 1` or `3 / 4` |
| Proof | Customer or place photography in a wide band (Stripe, Ramp) | `aspect-ratio: 21 / 9` |

### Frame Media With A Rounded Inset Clip

Apple clips its media with `clip-path: inset(0 round 28px)` rather than `border-radius` on a wrapper, so the same frame can later animate from a wipe (`inset(0 0 99.9% 99.9%)`) to fully open.

```css
.media { aspect-ratio: 16 / 10; clip-path: inset(0 round 28px); overflow: clip; }
.media img, .media video { block-size: 100%; display: block; inline-size: 100%; object-fit: cover; }
```

### Fill Study Slots With Original Imagery

A study may not use the brand's photography, but it may use original imagery made for the study:

1. **Generated or commissioned images** of generic subjects in the brand's palette and lighting: a bakery counter, a mountain road, a desk at dusk. Name the file after the slot (`assets/hero-dusk-road.webp`), export WebP at 1600px wide and quality 80, and set `width`, `height`, and `alt`.
2. **Rendered product stand-ins**: invented devices drawn in SVG or canvas (see [Drawn Products](drawn-products.md)), composed as a scene with ground, light, and shadow, not floated on a flat gradient.
3. **Live product surfaces**: a working mock of the product UI (see [Live Product Demos](live-product-demos.md)) counts as imagery when it fills the slot.

A gradient alone is acceptable only as atmosphere behind one of these, never as the content of a slot.

```html
<figure class="media">
  <img src="assets/hero-dusk-road.webp" width="1600" height="1000" alt="A dark SUV on a gravel road at dusk" loading="eager" fetchpriority="high">
</figure>
```

## Opinionated Guidance

Count the slots. If a section has no picture, product screen, or drawn scene, it needs a reason. Across the 49 originals only developer-tool homepages drop below a third of their area in imagery, and they replace it with dense product UI, not with gradients.

Keep one lighting mood per page. Generated images from different prompts drift in white balance; state the same light ("soft overcast daylight", "warm dusk") in every prompt for one page.

## Platform-Specific Guidance

`clip-path: inset(... round r)` is supported in all current engines and clips hit-testing along with painting. Give the first image `fetchpriority="high"` and lazy-load the rest; an 8-image page at 1600px WebP is about 1.5MB, comparable to the originals' hero alone.

## Unsupported Absolutes

The area shares describe desktop homepages on 2026-09-28. They do not say imagery must reach 50% on every page; they say the studies' 0% is outside the range of every measured original.

## Verification Contract

A page using this recipe passes `node scripts/check-showcase.mjs`, and its measured raster-plus-rendered image area (see the console measurement in [Measured Expression Benchmarks](../measured-benchmarks.md)) is recorded in the brief. Every `img` has intrinsic `width`, `height`, and meaningful `alt` or `alt=""` when decorative.

## Source, License, And Attribution

Locally authored from computed-style measurements of public homepages. The clip values are observed computed styles; no images or code from the measured sites are reproduced.

## IA Navigation

Parent: [Expression](../index.md).
Next: [Display Type Calibration](display-type-calibration.md).
