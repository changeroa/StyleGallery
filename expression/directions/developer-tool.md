---
type: Domain Guide
title: Developer Tool Direction
description: A hairline, mono-labelled, product-first direction for software tools, in dark and light grounds, distilled from ten developer-tool brand studies.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Developer Tool Direction

Primary role: named art direction with starting values.

## Repository Boundary

These values are a starting point for product pages in `showcase/` or a consumer's own CSS. They are not tokens, defaults, or Layout inputs.

## Reusable Method

Mood: a well-kept workshop. Tight sans display, mono for anything a machine would print, 1px lines instead of shadows, and a working piece of the product on the first screen.

The direction is distilled from the showcase studies of Linear, Raycast, Resend, and Railway (dark ground) and Vercel, Supabase, Cursor, Warp, Zed, and Clerk (light ground). The two grounds share everything except the ground itself, so the direction ships both.

```css
:root {
  /* Dark ground (Linear, Raycast, Resend) */
  --bg: #08090a;
  --panel: #0f1011;
  --line: rgb(255 255 255 / 0.08);
  --line-2: rgb(255 255 255 / 0.14);
  --text: #f7f8f8;
  --text-2: #b4b8bf;
  /* Light ground (Vercel, Supabase), swap these in */
  /* --bg: #fafafa; --panel: #fff; --line: #e5e5e5; --text: #171717; --text-2: #5f5f5f; */
  /* One brand accent, used for focus, one CTA, and live indicators */
  --accent: #5e6ad2;          /* Linear indigo; Supabase mint #3ecf8e with #1f7a53 for text; Clerk violet #6c47ff */
  --sans: "Inter", "Geist", system-ui, sans-serif;
  --mono: "JetBrains Mono", "Geist Mono", ui-monospace, monospace;
  --serif: "Instrument Serif", Georgia, serif;   /* optional editorial counterpoint (Resend, Zed, Railway) */
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
}
```

| Role | Value |
| --- | --- |
| Hero display | `--sans` 460-560, `clamp(2.4rem, 1.4rem + 3.2vw, 4rem)`, tracking about -0.02em. Measured originals: 64px largest over a 14px body (ratio 4.6), weight 460; the studies' -0.035em and tighter read cramped |
| Serif counterpoint | One serif display per page at most: Resend fills it with a white-to-grey vertical gradient, Zed uses Lora italic, Railway uses Newsreader |
| Labels | `--mono` 12px uppercase eyebrows, file chips, version tags, log lines |
| Lines | 1px `--line` borders on panels and between list rows; no drop shadows on dark ground. Measured originals carry a median 116 hairline elements and about 20 masked or clipped elements (edge fades on strips, corner vignettes; see [Masks, Clips, And Hairlines](../techniques/surface-detail.md)) |
| Product | A working mock of the tool: command palette (Raycast), issue board (Linear), terminal with typed commands (Vercel, Warp), SQL table editor (Supabase), editor with an agent diff (Cursor) |
| Buttons | Small radius (6-8px) or pills; primary is `--text` on `--bg` inverted, not the accent |
| Keyboard | Visible shortcut chips (`kbd`) that actually work on the page |
| Motion density | One typed or streamed sequence on first view, blur-in for arriving text, and hover responses on about 140 elements at 100-160ms (`color`, `background`, `filter`); no ambient loops except a caret. The studies transitioned about 10 elements at 300ms. See [Measured Expression Benchmarks](../measured-benchmarks.md) |

## Opinionated Guidance

Ship a keyboard path. Every developer-tool study that felt right made its mock respond to keys: the Raycast palette filters as you type and Enter runs the demo, the Linear board moves an issue with shortcuts. A mock you can only look at reads as a screenshot.

Stream, do not fade. Terminals and agent panes should reveal text line by line with a caret, then stop. The caret is the only acceptable infinite animation, and it belongs inside a `[data-ambient]` container so it pauses offscreen.

Keep the accent for state. On these grounds colour means "live", "selected", or "focused". Decorative gradients belong to one hero glow at most.

## Platform-Specific Guidance

Monospace tables need `font-variant-numeric: tabular-nums` only when the mono face lacks it; JetBrains Mono and Geist Mono are already fixed-width. Faint lines at `rgb(255 255 255 / 0.08)` disappear on some low-contrast displays; use `--line-2` for any line that carries meaning, such as a table header rule.

## Unsupported Absolutes

These values produced ten study pages that pass the showcase checks. They are not tested for documentation sites or long reference pages, which need their own reading measure.

## Verification Contract

A page using this direction passes `node scripts/check-showcase.mjs`. Typed or streamed text must be present in the DOM from the start (visually masked, not absent) so that no-script and offline reading still get the full copy, and it must not hide paragraphs inside `main` under reduced motion.

## Source, License, And Attribution

Locally authored from the StyleGallery showcase studies listed above, which are unofficial and reuse no logos, screenshots, or copy. Font families are open-source (SIL Open Font License); no upstream prose or code is reproduced.

## IA Navigation

Parent: [Expression](../index.md).
Next: [Korean Service Direction](korean-service.md).
