---
type: Domain Guide
title: Warm Print Direction
description: A light, warm, print-inspired direction with concrete type, color, texture, and motion-density values.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Warm Print Direction

Primary role: named art direction with starting values.

## Repository Boundary

These values are a starting point for product pages in `showcase/` or a consumer's own CSS. They are not tokens, defaults, or Layout inputs.

## Reusable Method

Mood: a well-made independent magazine. Off-white paper, heavy grotesk display, ink-black text, one saturated spot color, visible grid lines, halftone texture.

```css
:root {
  --paper: #f4efe6;
  --paper-2: #ebe4d6;          /* inset panels */
  --ink: #141210;
  --ink-dim: rgb(20 18 16 / 0.64);
  --rule: rgb(20 18 16 / 0.18);
  --spot: #1f4bff;             /* one spot color, used sparingly */
  --spot-2: #ff4a1c;           /* optional second spot, never beside the first */
  --grotesk: "Bricolage Grotesque", "Arial Narrow", Arial, sans-serif;
  --text: "Newsreader", Georgia, serif;
  --mono: "IBM Plex Mono", ui-monospace, monospace;
  --gutter: clamp(1rem, 3vw, 2.5rem);
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}
```

| Role | Value |
| --- | --- |
| Hero display | `--grotesk` 800, `clamp(3rem, 12vw, 12.5rem)`, tracking -0.05em, line height 0.85, uppercase optional |
| Section display | `--grotesk` 700, `clamp(2.2rem, 6vw, 6rem)`, tracking -0.04em |
| Body | `--text` 400, 1.125rem, line height 1.6, max 34rem measure |
| Labels | `--mono` 0.72rem, uppercase, tracking 0.1em, preceded by a `--rule` hairline |
| Grid | Visible 1px `--rule` column lines on a 12-column grid at 64rem and wider |
| Surfaces | Flat `--paper-2`, no shadows, no radius or at most 0.25rem |
| Images | Duotone via `mix-blend-mode: multiply` over `--spot`, or grayscale plus [halftone](../techniques/grain-and-texture.md#halftone) |
| Motion density | Few entrances, crisp: 0.6-0.8s, `--ease-out`, line-by-line reveals, one horizontal marquee of headlines |

## Opinionated Guidance

Light editorial pages die from timidity. Make the display type uncomfortably big, let one headline break the grid, and keep everything else strictly on it.

## Platform-Specific Guidance

Multiply blending needs an opaque ancestor background to blend against; set `--paper` on the section, not only on `body`, or the effect disappears inside isolated stacking contexts.

## Unsupported Absolutes

No reference build exists yet for this direction; its values are proposals until a showcase work uses them and passes review.

## Verification Contract

A page using this direction passes `node scripts/check-showcase.mjs`. Check `--ink-dim` text contrast on `--paper-2` panels and confirm the grid lines disappear below 64rem.

## Source, License, And Attribution

Locally authored direction. Font families are Google Fonts under the SIL Open Font License; no upstream prose or code is reproduced.

## IA Navigation

Parent: [Expression](../index.md).
Next: [Gradient Atmosphere](../techniques/gradient-atmosphere.md).
