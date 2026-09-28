---
type: Domain Recipe
title: Gradient Atmosphere
description: Copy-ready blurred gradient fields, card glows, and gradient text for expressive product pages.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Gradient Atmosphere

Primary role: visual technique recipe.

## Repository Boundary

Product-layer CSS for `showcase/` works and consumer pages. Never add these declarations to reusable Layout pattern CSS.

## Reusable Method

### Aurora Field

Three large radial gradients, blurred together and slowly drifting behind a section.

```html
<section class="hero">
  <div class="aurora" aria-hidden="true"><span></span><span></span><span></span></div>
  <!-- content -->
</section>
```

```css
.hero { isolation: isolate; overflow: clip; position: relative; }
.aurora { filter: blur(70px) saturate(140%); inset: 0; opacity: 0.55; position: absolute; z-index: -2; }
.aurora span { animation: drift 18s ease-in-out infinite alternate; border-radius: 50%; position: absolute; }
.aurora span:nth-child(1) { background: radial-gradient(circle, #ff5a36, transparent 65%); block-size: 60vmax; inline-size: 60vmax; inset-block-start: -20vmax; inset-inline-end: -15vmax; }
.aurora span:nth-child(2) { animation-duration: 24s; background: radial-gradient(circle, #7b5cff, transparent 65%); block-size: 55vmax; inline-size: 55vmax; inset-block-end: -25vmax; inset-inline-start: -10vmax; }
.aurora span:nth-child(3) { animation-duration: 30s; background: radial-gradient(circle, #1f6fff, transparent 60%); block-size: 35vmax; inline-size: 35vmax; inset-block-start: 30%; inset-inline-start: 40%; }
@keyframes drift { to { transform: translate3d(-6vmax, 4vmax, 0) scale(1.15); } }
@media (prefers-reduced-motion: reduce) { .aurora span { animation: none; } }
```

`overflow: clip` on the section keeps the oversized blobs from widening the document; without it the page scrolls sideways at 320px.

### Legibility Scrim

When copy sits over the field, add a gradient between the atmosphere and the copy instead of dimming the atmosphere everywhere.

```css
.hero::after {
  background: linear-gradient(to top, rgb(7 7 10 / 0.7), transparent 55%), linear-gradient(to right, rgb(7 7 10 / 0.55), transparent 60%);
  content: ""; inset: 0; pointer-events: none; position: absolute; z-index: -1;
}
```

### Card Glow

Two corner radial gradients per card, colored by custom properties set on the card, so each card gets its own light without new classes.

```css
.card {
  background:
    radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, var(--hue-a) 55%, transparent), transparent 60%),
    radial-gradient(90% 80% at 0% 100%, color-mix(in oklab, var(--hue-b) 45%, transparent), transparent 60%),
    #111118;
}
```

```html
<li class="card" style="--hue-a:#ff5a36; --hue-b:#7b5cff">...</li>
```

### Gradient Text

```css
.accent {
  background: linear-gradient(100deg, #ff5a36, #ffb454 40%, #7b5cff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  padding-inline-end: 0.06em; /* keeps italic overhang from being clipped */
}
```

## Opinionated Guidance

One atmosphere per viewport. An aurora behind the hero plus glowing cards plus gradient text in the same view reads as noise; stagger them down the page.

## Platform-Specific Guidance

`filter: blur()` on large layers costs GPU memory. Blur the container once, not each blob, and keep blob sizes in `vmax` so the effect scales without re-rasterizing at many sizes. `color-mix()` needs a current engine; provide a plain `rgb()` fallback if you target older browsers.

## Unsupported Absolutes

Blur radius, opacity, and drift duration here were tuned for one dark page. Light grounds need lower opacity and usually no `saturate()`.

## Verification Contract

In the showcase check, the page has no horizontal overflow at 320px, and under reduced motion no infinite drift animation is running. Review the screenshots for text contrast over the brightest part of the field.

## Source, License, And Attribution

Locally authored recipe. No upstream source.

## IA Navigation

Parent: [Expression](../index.md).
Next: [Grain And Texture](grain-and-texture.md).
