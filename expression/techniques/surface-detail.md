---
type: Domain Recipe
title: Masks, Clips, And Hairlines
description: The finishing details measured on live homepages that the studies lacked, with copy-ready edge-fade masks, rounded media clips, clip wipes, blur-in reveals, and hairline rules.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Masks, Clips, And Hairlines

Primary role: visual technique recipe.

## Repository Boundary

Product-layer CSS for `showcase/` works and consumer pages. Never add these declarations to reusable Layout pattern CSS. Timing for any animated state here belongs to [Motion techniques](../../motion/techniques/scroll-choreography.md).

## Reusable Method

The median original in [Measured Expression Benchmarks](../measured-benchmarks.md) has about twelve elements with a mask or clip-path and 24 with a 1px border; the studies had none and thirteen. The studies used soft 24px+ shadows instead (two per page against a median of zero). These are the observed forms, with the site where each was measured.

### Edge-Fade Masks On Anything That Scrolls Or Overflows

Toss applies a vertical fade to 15 elements on its homepage; Raycast and Linear fade horizontal strips over 64-80px.

```css
.fade-x { mask-image: linear-gradient(to right, transparent 0, #000 64px, #000 calc(100% - 64px), transparent 100%); }
.fade-y { mask-image: linear-gradient(transparent 0%, #000 15%, #000 75%, transparent 100%); }
```

### Corner Vignettes Instead Of Glows

Linear masks cards with a radial gradient anchored at a corner, so the card dissolves into the dark ground instead of sitting on a glow.

```css
.vignette { mask-image: radial-gradient(200px 200px at 0% 100%, #000 0%, rgb(0 0 0 / 0.6) 30%, transparent 70%); }
```

### Rounded Media Clips And Wipes

Apple clips media with `inset(0 round 28px)`; its reveal state is `inset(0 0 99.9% 99.9%)`, opening to `inset(0 round 28px)`. Stripe wipes panels from `inset(0 0 100%)` to `inset(0 0 0%)`. Toss expands a card toward full screen by shrinking an inset from `inset(148px 160px round 80px)` to zero.

```css
.frame { clip-path: inset(0 round 28px); }
.frame[data-state="hidden"] { clip-path: inset(0 0 100% 0 round 28px); }
.grow { clip-path: inset(var(--inset-y, 148px) var(--inset-x, 160px) round var(--r, 80px)); }
```

Drive `--inset-y`, `--inset-x`, and `--r` from scroll progress to grow the card; the Motion domain owns that timing.

### Blur-In For Arriving Text

Linear brings chat messages in from `translateY(8px)` and `blur(2px)` at reduced opacity to rest. The blur hides the sub-pixel shimmer of moving text.

```css
.arrive { filter: blur(2px); opacity: 0; transform: translateY(8px); }
.arrive[data-in] { filter: none; opacity: 1; transform: none; }
```

### Hairlines Over Shadows

Separate panels with `1px` rules in a low-contrast ink (`rgb(0 0 0 / 0.08)` on light, `rgb(255 255 255 / 0.08-0.14)` on dark) and keep shadows for things that float: menus, dialogs, a single hero device.

## Opinionated Guidance

These details are invisible individually and decisive together. A page with twelve masked or clipped elements and two dozen hairlines looks built; the same layout with soft drop shadows looks templated.

Use one mask vocabulary per page: either edge fades or corner vignettes, not both on the same surface.

## Platform-Specific Guidance

`mask-image` is unprefixed in current Chromium, Firefox, and Safari; keep `-webkit-mask-image` for older Safari. Masks and filters create compositing layers; keep blur-in to short text blocks, not full sections. Animated `clip-path` repaints; prefer animating custom properties consumed by one `clip-path` over swapping whole values.

## Unsupported Absolutes

Counts are medians of desktop homepages on 2026-09-28. They set a floor for finish, not a number to hit exactly.

## Verification Contract

A page using this recipe passes `node scripts/check-showcase.mjs`. Hidden states must never hide `main` paragraphs under reduced motion: give `[data-state="hidden"]` and `.arrive` their final values inside `@media (prefers-reduced-motion: reduce)`, and ensure masked scrollers keep focused items inside the unmasked band.

## Source, License, And Attribution

Locally authored. Mask and clip values are computed styles observed on public homepages and cited by site; no markup, assets, or code from those sites are reproduced.

## IA Navigation

Parent: [Expression](../index.md).
Next: [Study Atlas](../study-atlas.md).
