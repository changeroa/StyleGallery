---
type: Domain Guide
title: Fintech Clarity Direction
description: A bright, numeric, one-accent direction for money products, distilled from eleven fintech brand studies.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Fintech Clarity Direction

Primary role: named art direction with starting values.

## Repository Boundary

These values are a starting point for product pages in `showcase/` or a consumer's own CSS. They are not tokens, defaults, or Layout inputs.

## Reusable Method

Mood: the moment a number you were worried about turns out fine. Mostly white or paper ground, one saturated accent that only ever means "do this", very large numerals, and the product itself on screen beside real photography of people and places.

The direction is distilled from the showcase studies of Toss, KakaoBank, Toss Bank, Banksalad, Stripe, Revolut, Wise, Mercury, Ramp, Upbit, and Flex. Each of them spends colour on exactly one job and lets figures carry the drama.

```css
:root {
  /* Ground and text */
  --paper: #fbfaf7;           /* off-white keeps large white areas from glaring */
  --card: #f1efe9;            /* raised product panels */
  --ink: #111;
  --ink-2: #5c5c57;           /* secondary copy: 4.5:1 on --card, checked */
  --clause: #74746e;          /* grey second clause in two-tone headings, large text only */
  --line: #e3e0d8;
  /* One accent, chosen per brand; pick exactly one */
  --accent: #3182f6;          /* blue family: Toss, Stripe-like */
  /* --accent: #e4f222; */    /* lime family: Ramp, Wise (#9fe870 on forest #163300) */
  /* --accent: #5266eb; */    /* indigo on navy: Mercury */
  --accent-ink: #111;         /* text on light accents; use #fff on blue and indigo */
  /* Type */
  --sans: "Inter Tight", "Pretendard Variable", system-ui, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, monospace;
  --num: tabular-nums;
}
```

| Role | Value |
| --- | --- |
| Hero display | `--sans` 600-700, `clamp(2.4rem, 1.4rem + 3vw, 3.6rem)`, tracking 0em on Korean faces and about -0.01em on Latin faces, line height 1.2; Korean pages add `word-break: keep-all`. Measured originals: 58px largest over a 14px body (ratio 3.7), weight 625 |
| Two-tone heading | First clause `--ink`, continuation in `--clause` inside a `<span>`: "One platform. <span>Five jobs off your plate.</span>" |
| Numerals | `font-variant-numeric: tabular-nums`, weight 700-800, the largest thing in their section; units at 40-50% size |
| Labels | `--mono` 12px uppercase eyebrows over sections and counters |
| Buttons | One filled accent button per view. Rounded 8px for B2B tools (Ramp, Stripe), full pills for consumer apps (Toss, Revolut, Wise) |
| Surfaces | `--card` panels with 14-28px radius holding a drawn product UI; hairline `--line` for lists |
| Product | A phone outline or browser window with a live, invented balance, set beside original lifestyle or place imagery; measured fintech homepages give 72% of their area to imagery (see [Image Weight](../techniques/image-weight.md)) |
| Dark variant | Navy `#171721` stages with a light 300-weight display and indigo pills (Mercury), or near-black with gradient cards (Revolut) |
| Motion density | Count-ups on first view, one scroll-scrubbed product reveal, and responsive states on about 80 elements (buttons, links, tabs, cards) at 300ms; no ambient loops |
| Measured medians | 11 originals, 2026-09-28: body 14px, largest 58px, display tracking -0.009em, 9.6 viewports long, about 35 masked or clipped elements, 9% gradient area. See [Measured Expression Benchmarks](../measured-benchmarks.md) |

## Opinionated Guidance

Make one number interactive. The strongest studies each let the visitor change an input and watch a figure respond: the Wise converter shows fee, rate, and arrival in reading order; the Revolut hero switches currencies; the Rivian and Tesla estimators, although not fintech, borrow the same move. A calculator converts better than a paragraph about savings.

Keep the accent off decoration. When the accent also fills illustrations, the primary button stops being findable. Illustrations use neutrals plus one pastel.

Label every figure as invented in a study. Money pages invite readers to trust numbers; the study must not borrow that trust.

## Platform-Specific Guidance

Tabular numerals change width less while counting up, so count-ups do not jitter surrounding layout. `Intl.NumberFormat` keeps thousands separators correct per currency; KRW and JPY take no decimals. Pretendard Variable covers Hangul and Latin in one file, which avoids mixed-font baselines on Korean fintech pages.

## Unsupported Absolutes

These values produced eleven study pages that pass the showcase checks. They are not measured for dense dashboards, long legal text, or accessibility beyond WCAG contrast on the tested grounds.

## Verification Contract

A page using this direction passes `node scripts/check-showcase.mjs`. The two-tone clause colour is the usual failure: `#8e8e88` on `#f1efe9` measured 2.86:1 in the Ramp study and had to darken to `#74746e`. Check grey copy on the card colour, not only on the page colour.

## Source, License, And Attribution

Locally authored from the StyleGallery showcase studies listed above, which are unofficial and reuse no brand assets or copy. Font families are open-source (SIL Open Font License); no upstream prose or code is reproduced.

## IA Navigation

Parent: [Expression](../index.md).
Next: [Hardware Catalogue Direction](hardware-catalogue.md).
