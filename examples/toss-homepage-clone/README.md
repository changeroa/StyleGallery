---
type: Example Guide
title: Toss-Inspired Homepage Clone
description: A standalone product-layer homepage study built from StyleGallery layout, motion, and implementation guidance.
---

# Toss-Inspired Homepage Clone

This example reconstructs the spatial rhythm and interaction language observed on `https://toss.im/en-us` on 2026-09-09. It is an independent implementation study and is not affiliated with, endorsed by, or a copy of Toss source code. The two photographs are original generated assets with no copied logos or text.

## Run

From the repository root:

```sh
python3 -m http.server 4174 --directory examples/toss-homepage-clone
```

Open `http://127.0.0.1:4174/`.

## StyleGallery Route

- Use case: product marketing homepage.
- Section jobs: hook, explain, prove, explore, convert, navigate.
- Closest recipe: `recipes/homepage.md`.
- Pattern stack: `cover`, `content-limiter`, `stack`, `sidebar`, `frame`, `ram-grid`, `reel`, and `cluster`.
- Scroll owner: normal document scroll. The service rail owns only horizontal overflow.
- Layout owner: this example's product layer composes existing pattern responsibilities.
- Core constraints: `75rem` content maximum, responsive gutters, intrinsic card rail, single-column changes at `820px`, compact changes at `520px`.
- Likely breaking cases: long navigation labels, large text zoom, unbroken footer links, and a card rail without a visible keyboard focus state.
- Rejected pattern: a fixed-body shell, because the page is a sequential story and the document should own scrolling.
- Product styling excluded from reusable Layout CSS: photography, gradients, colors, rounded corners, shadows, type scale, and transition timing.

## Interaction Contract

The mobile navigation exposes `aria-expanded`, closes after navigation and on Escape, and keeps the semantic link order. The asset feature selector uses tabs with Arrow Up/Down, Home, and End behavior. Section reveals stop changing once visible. `prefers-reduced-motion` removes smooth scrolling and reveals all content without waiting for animation.

## Source And Evidence Boundary

The original page was inspected in a real desktop browser at 1429×900. Reference observations include a fixed white header, a large rounded photographic hero, left-side section progress, paired text/product scenes, an accordion-like assets section, a horizontal marketing card rail, dark full-bleed business and travel scenes, and an oversized footer statement. This implementation reproduces those high-level relationships with new markup, CSS, copy, and imagery.

It does not claim pixel identity, reuse Toss code or assets, reproduce its 50,000px scroll choreography, or validate Toss product behavior. Links and download controls are demonstrative.

See [Browser Verification](verification.md) for the inspected viewport matrix, keyboard observations, and retained screenshots.

## Implementation Handoff

Consumer reference: not_applicable
Consumer reference reason: This standalone visual study does not select a consumer-reference profile or record.

Terminology records: none. No design-terminology relation record is required by the implementation.

## Generated Image Prompts

Built-in image generation produced both project assets.

- `assets/commuter-hero.jpg`: original wide lifestyle photograph of an East Asian commuter using an unbranded phone beside a bright train window, with negative space for homepage copy; no logos, text, or watermark.
- `assets/travel-sunset.jpg`: original cinematic airplane cabin photograph with a traveler and sunset, dark left-side copy space; no logos, text, or watermark.
