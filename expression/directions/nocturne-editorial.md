---
type: Domain Guide
title: Nocturne Editorial Direction
description: A dark, glowing, editorial direction with concrete type, color, texture, and motion-density values.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Nocturne Editorial Direction

Primary role: named art direction with starting values.

## Repository Boundary

These values are a starting point for product pages in `showcase/` or a consumer's own CSS. They are not tokens, defaults, or Layout inputs.

## Reusable Method

Mood: a city at 3am seen through glass. Dark ground, warm glowing accents, oversized serif display, and quiet mono labels.

```css
:root {
  /* Ground and text */
  --ink: #07070a;
  --ink-2: #111118;           /* raised surfaces */
  --paper: #efe9df;           /* primary text: warm, never pure white */
  --paper-dim: rgb(239 233 223 / 0.62);
  --line: rgb(239 233 223 / 0.14);
  /* Accents: one hot, one cool, one highlight */
  --ember: #ff5a36;
  --violet: #7b5cff;
  --haze: #9bd1ff;
  /* Type */
  --serif: "Instrument Serif", "Iowan Old Style", Georgia, serif;
  --sans: "Inter Tight", "Helvetica Neue", Arial, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
  /* Rhythm */
  --gutter: clamp(1.25rem, 4vw, 3.5rem);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

| Role | Value |
| --- | --- |
| Hero display | `--serif` 400, `clamp(2.8rem, 1.6rem + 4.4vw, 6.5rem)`, tracking -0.02em, line height 1.02, `text-wrap: balance`. Measured editorial and creative homepages top out at a median 88px; 11rem heroes read as a poster, not a page ([Display Type Calibration](../techniques/display-type-calibration.md)) |
| Section display | `--serif` 400, `clamp(2rem, 1.3rem + 2.4vw, 3.6rem)`, tracking -0.02em, line height 1.08 |
| Body | `--sans` 350, `clamp(1rem, 0.95rem + 0.25vw, 1.125rem)`, line height 1.55, dimmed to `--paper-dim` for secondary copy |
| Labels | `--mono` 0.75rem, uppercase, tracking 0.14em |
| Accent word | Italic serif with `linear-gradient(100deg, var(--ember), #ffb454 40%, var(--violet))` clipped to text, one word per headline |
| Surfaces | `--ink-2` with 1px `--line` border, radius 1.5rem, two corner radial gradients from the card's own accent pair |
| Buttons | Pill radius, primary is `--paper` on `--ink`, ghost is a `--line` border only |
| Texture | [Grain](../techniques/grain-and-texture.md) at 0.22 opacity, `mix-blend-mode: overlay` |
| Atmosphere | [Gradient aurora](../techniques/gradient-atmosphere.md) behind the hero, optional [WebGL field](../techniques/webgl-hero.md). Atmosphere sits behind content, never in place of it |
| Imagery | A picture, drawn scene, or live product surface on every screen, framed with a rounded clip and an edge-fade mask where it bleeds into the ground ([Image Weight](../techniques/image-weight.md), [Masks, Clips, And Hairlines](../techniques/surface-detail.md)) |
| Motion density | One entrance sequence, three to four scroll scenes, one ambient loop, and responsive states on every link, card, tab, and media frame at 150-300ms. Easing `expo.out`, entrances 0.6-0.9s, 0.06s word stagger |

## Opinionated Guidance

Use the gradient only on one italic word per headline; used on whole sentences it turns into a gaming UI. Keep body copy dim and let imagery and display type share the contrast. A dark page with only type and an aurora reads empty after the first screen; give every screen something to look at.

## Platform-Specific Guidance

`background-clip: text` still needs the `-webkit-` prefix in some engines; declare both. Large blurred gradients are expensive on low-end GPUs; keep them to three blobs and stop their animation under reduced motion.

## Unsupported Absolutes

These values produced one legible reference page. They are not proven for long-form reading, data-dense UI, or light-mode contexts.

## Verification Contract

A page using this direction passes `node scripts/check-showcase.mjs`. Check `--paper-dim` body text against the actual ground in its screenshots; over bright aurora areas it may need a darkening gradient layer, as the reference hero uses.

## Source, License, And Attribution

Locally authored direction. Font families are Google Fonts under the SIL Open Font License; no upstream prose or code is reproduced.

## IA Navigation

Parent: [Expression](../index.md).
Next: [Warm Print Direction](warm-print.md).
