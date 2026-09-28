---
type: Domain Guide
title: Korean Service Direction
description: A Pretendard-based, dense, one-brand-colour direction for Korean consumer services and commerce, distilled from twenty-three Korean brand studies.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Korean Service Direction

Primary role: named art direction with starting values.

## Repository Boundary

These values are a starting point for product pages in `showcase/` or a consumer's own CSS. They are not tokens, defaults, or Layout inputs.

## Reusable Method

Mood: a busy, trustworthy app you already have on your home screen. White ground, near-black text with a blue-grey cast, one brand colour, and far more content per screen than Western marketing pages carry.

The direction is distilled from twenty-three showcase studies of Korean services: Toss, KakaoBank, Toss Bank, Banksalad, Upbit, Daangn, Musinsa, Kurly, 29CM, KREAM, Ohou, Baemin, Yanolja, MyRealTrip, CatchTable, SOCAR, Class101, Wanted, flex, Channel Talk, Sendbird, imweb, and Rebellions. They split into two registers that share one type system:

- Service landing (Toss, KakaoBank, flex, Channel Talk, imweb): large centred 800-weight headlines, one emphasised phrase in the brand colour, phone mock-ups, generous vertical rhythm.
- Commerce and listings (Musinsa, Kurly, 29CM, KREAM, Ohou, Daangn, Yanolja): compact 13-15px catalogue text, dense grids, red discounts, sticky category tabs, and ranked shelves.

```css
:root {
  --ink: #191f28;             /* Toss-style blue-black; commerce uses #000 to #333 */
  --ink-2: #4e5968;
  --grey: #6b7684;            /* check against white before using under 16px */
  --line: #e5e8eb;
  --bg-2: #f2f4f6;            /* grouped sections */
  --brand: #3182f6;           /* one per service: Daangn #ff6f0f, Kurly #5f0080, Baemin #2ac1bc, KakaoBank #fee500 */
  --brand-ink: #1b64da;       /* darker text-safe variant when the brand colour is too light for text */
  --sale: #d6260f;            /* discount red, commerce register only */
  --sans: "Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
}
body { word-break: keep-all; overflow-wrap: anywhere; }
```

| Role | Value |
| --- | --- |
| Landing headline | 600-700 at 26-40px, tracking 0em, two lines with a deliberate `<br>` at a phrase boundary. Measured Korean service and commerce originals top out at a median 32px over a 14px body (ratio 2.0); the studies' 44px and -0.023em read as a Western landing page. Only campaign heroes go larger |
| Emphasis | One phrase per headline in `--brand` or `--brand-ink` (flex green, Class101 orange `#c94700`) |
| Section title (commerce) | 700-800 at 17-26px, often with a grey inline subtitle or a chevron link on the right |
| Catalogue text | Brand name 12-13px 700, product name 13-15px clamped to two lines, price 700 with a red discount percentage in front |
| Surfaces | White cards on `--bg-2` groups, 12-20px radius, no shadows or one soft shadow on the phone mock. Product and place photography fills tiles and banners: measured originals give 87% of their area to imagery and almost none to gradients (see [Image Weight](../techniques/image-weight.md)) |
| Navigation | Sticky category tabs with an underline indicator (Musinsa, Kurly), bottom tab bars in phone mocks |
| Display face | Pretendard for almost everything; a free heavy Korean display face (Black Han Sans in the Baemin study) only when the brand is playful |
| Motion density | Count-ups for app metrics, stagger-in of cards, horizontal shelves that scroll by drag and buttons, responsive states on about 50 elements at 200ms, no ambient loops. See [Measured Expression Benchmarks](../measured-benchmarks.md) |

## Opinionated Guidance

Break Korean headlines by hand. `word-break: keep-all` stops mid-word breaks, but it cannot choose the phrase boundary; the studies that read best put an explicit `<br>` where a Korean copywriter would pause, and let `text-wrap: balance` handle only Latin text.

Density is the brand, not a flaw. Commerce studies that tried Western whitespace looked empty next to their captures. Keep 4-6 product columns at desktop and 2 at mobile, with ranks, badges, and review counts visible.

Use the brand colour as a signature, not a fill. Toss blue appears on one CTA and one word per section; Daangn orange marks the active tab and the primary button. Large brand-colour backgrounds appear once per page at most.

## Platform-Specific Guidance

Pretendard Variable is a single variable file for Hangul and Latin; loading it with a Latin display face (29CM uses Inter for mastheads) needs the Latin face first in the stack so Hangul falls through. Korean text needs 1.5-1.6 line height at body size; 1.4 cramps final consonant clusters. Bright brand yellows and mints (`#fee500`, `#2ac1bc`) fail contrast for text on white; use them as fills with dark text.

## Unsupported Absolutes

These values produced twenty-three study pages that pass the showcase checks. They are not tested for long-form Korean reading or vertical writing.

## Verification Contract

A page using this direction passes `node scripts/check-showcase.mjs`. Sticky category bars stack on top of the sticky header, so `--sg-header` must equal the whole stack's height (Ohou uses 124px, 29CM 120px) or hash targets land under the bars.

## Source, License, And Attribution

Locally authored from the StyleGallery showcase studies listed above, which are unofficial and reuse no logos, photographs, or copy. Pretendard and Black Han Sans are distributed under the SIL Open Font License; no upstream prose or code is reproduced.

## IA Navigation

Parent: [Expression](../index.md).
Next: [Drawn Products](../techniques/drawn-products.md).
