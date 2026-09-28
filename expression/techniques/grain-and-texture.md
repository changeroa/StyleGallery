---
type: Domain Recipe
title: Grain And Texture
description: Copy-ready film grain, noise, and halftone textures without image files.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Grain And Texture

Primary role: visual technique recipe.

## Repository Boundary

Product-layer CSS for `showcase/` works and consumer pages. Never add these declarations to reusable Layout pattern CSS.

## Reusable Method

### Film Grain Overlay

An SVG turbulence filter as a data URI, tiled over the whole page. No image file, about 400 bytes.

```html
<div class="grain" aria-hidden="true"></div>
```

```css
.grain {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  inset: 0;
  mix-blend-mode: overlay;
  opacity: 0.22;
  pointer-events: none;
  position: fixed;
  z-index: 90;
}
```

Tuning: `baseFrequency` 0.6 is coarse and filmic, 0.9 is fine and digital. Opacity 0.15-0.25 on dark grounds, 0.08-0.12 on light grounds with `mix-blend-mode: multiply` and a black `feColorMatrix` (replace the three `1` channel values with `0`).

### Halftone

Dots from a repeating radial gradient, masked onto an image or a flat color block.

```css
.halftone {
  background-image: radial-gradient(circle at center, #141210 0.9px, transparent 1.1px);
  background-size: 6px 6px;
  mix-blend-mode: multiply;
}
```

Place the `.halftone` layer over a grayscale image (`filter: grayscale(1) contrast(1.2)`) for a print look.

### Paper Tooth

For light directions, a very low-frequency turbulence adds unevenness without visible grain: `baseFrequency='0.02'`, `numOctaves='2'`, opacity 0.35, `mix-blend-mode: multiply`.

## Opinionated Guidance

Grain should be felt, not seen. If someone notices it in a screenshot at 100% zoom, it is too strong.

## Platform-Specific Guidance

A fixed full-viewport overlay is composited on every scroll frame. With `pointer-events: none` it never blocks input; if scrolling stutters on low-end devices, switch `position: fixed` to `absolute` on a page-height container.

## Unsupported Absolutes

Grain strength that works on a large desktop display can look dirty on a small high-density phone screen. Check both sizes.

## Verification Contract

The overlay is `aria-hidden`, has `pointer-events: none`, and does not intercept focus. The showcase focus-order check passes with the overlay present.

## Source, License, And Attribution

Locally authored recipe. No upstream source.

## IA Navigation

Parent: [Expression](../index.md).
Next: [WebGL Hero Field](webgl-hero.md).
