---
type: Domain Guide
title: AI-Slop UI Anti-Patterns
description: A catalog of the template looks that make a generated product page read as AI slop, each with an id, a machine-checkable DOM/CSS rule or a review question, and the measured values behind it.
aliases: ["ai slop","ai slop ui","slop catalog","anti-patterns","template look","generic landing page","AI 슬롭","슬롭 안티패턴"]
questions: ["Why does my generated landing page look like AI slop?","Which AI-slop patterns can a headless browser detect?","Is a purple gradient behind a headline a problem?","Should I use emoji as feature icons?","How many soft shadows are too many on a landing page?"]
domain: expression
lifecycle: experimental
provenance_kind: local
---

# AI-Slop UI Anti-Patterns

Primary role: anti-pattern catalog with machine rules and review questions.

## Repository Boundary

This page names looks to avoid on finished product pages in `showcase/` and consumer work. It is not a style rule for reusable Layout pattern CSS, it adds no tokens, and it does not run anything. The machine-readable form is [`anti-patterns.json`](anti-patterns.json); a later headless-browser checker implements its machine rules. The [Showcase QA contract](../showcase/QA.md) already enforces the screen, transition, and surface floors that several entries reuse.

## Reusable Method

Each entry has an id in the `slop.*` namespace, a definition, and one of two detection kinds:

- `machine`: a DOM/CSS rule measured in headless Chromium at 1440x900, with a threshold taken from [Measured Expression Benchmarks](measured-benchmarks.md) or the [Showcase QA contract](../showcase/QA.md). Machine entries have severity `error`.
- `review`: a question for a human or agent reviewer. Review entries have severity `review` and never gate a build, because they depend on taste or on facts a browser cannot see.

The JSON file is the source of the exact rules. It defines the shared terms once in `measurement_context`: a screen is a 900px slice of the document, coverage is the unioned area of visible boxes on that slice, and body size is the character-weighted modal font size. `node scripts/validate-anti-patterns.mjs --json` checks that the catalog is complete and consistent with this page.

### Machine Entries

| Id | Anti-pattern | Rule in short | Threshold source |
| --- | --- | --- | --- |
| `slop.headline-only-gradient-screen` | A heading alone on a gradient screen | A screen with a heading, a gradient ground, under 8% media and under 10% text | QA Q22; originals give 53% of area to imagery, 3.9% to gradients |
| `slop.empty-screen` | Empty screen | Any screen under 8% media and under 10% text | QA I16, Q22 |
| `slop.unanchored-violet-gradient` | Random purple gradient | A gradient with 2+ stops at hue 245-320deg covering 15%+ of a screen, whose hue no solid page color shares within 20deg | Gradient area 3.9% median original vs 26% median study |
| `slop.gradient-area-excess` | Gradient as filler | Gradient-painted share of the page above 17% | Originals' p75 gradient area |
| `slop.soft-shadow-excess` | Excessive soft shadows | More than 1 non-floating element with a 24px+ blur shadow | Originals 0 median, 1 at p75 |
| `slop.unfinished-surfaces` | No masks, clips, or hairlines | Fewer than 2 masked or clipped elements, or fewer than 3 hairlines | QA Q24; originals 12 masks and 24 hairlines |
| `slop.emoji-icons` | Emoji as icons | 2+ nav items, buttons, headings, list items, or sibling cards whose text is or starts with an emoji | QA I16 counts only pictures, drawings, renders, and live surfaces |
| `slop.repeated-card-triplet` | Repeated identical three-card grids | 2+ rows of 3-4 equal, imageless cards with one shared structure | Originals 9.1 viewports long with a picture in every card |
| `slop.static-interactive` | Links without a state change | An interactive element whose computed style is unchanged on hover or on keyboard focus | QA I17, I6; originals transition 76 elements |
| `slop.sluggish-state-change` | Slow or sparse transitions | Median link and button duration over 350ms or under 100ms, or fewer than max(12, 4 per viewport) transitioning elements | Measured 100-320ms band; QA Q23 |
| `slop.dishonest-cta` | Fake or dishonest call to action | A `#`, `#top`, dead-hash, or `javascript:` target, or a click that changes nothing and announces nothing | QA I2, Q3, Q4 |
| `slop.oversized-display` | Oversized display type | Largest size over body size above 5.5, or more than 8.2% of characters at display size | Originals' p75 for both measures |

### Review Entries

| Id | Anti-pattern | Review question |
| --- | --- | --- |
| `slop.generic-copy` | Generic marketing copy | With the product name removed, can a reader tell what the product does, for whom, and what is different? |
| `slop.fabricated-proof` | Fabricated social proof | Is every logo, quote, rating, and number sourced, or visibly marked as illustrative? |
| `slop.gradient-text-everywhere` | Gradient text as the default emphasis | Does each gradient-filled word carry a meaning the direction names? |
| `slop.uniform-section-rhythm` | Uniform section rhythm | Do sections differ in length, density, and opener so the page is paced? |

## Opinionated Guidance

The common thread is substitution: a gradient where a picture belongs, a shadow where a clip or hairline belongs, a bigger headline where better content belongs, and an emoji where a drawn icon belongs. The 49 measured originals keep display type at 3.5-5.5 times the body, answer every link within 100-320ms, and finish surfaces with masks and hairlines rather than soft shadows. Fixing one entry by adding the next (replacing a gradient screen with a triplet of emoji cards) still produces slop.

Treat a machine error as a definite defect and a review question as a prompt to defend the choice. A direction may answer a review question with a reason, for example gradient text used once as a brand mark.

## Platform-Specific Guidance

The thresholds come from desktop Chromium at 1440x900 with an `en-US` locale. Emoji glyphs, and therefore how loudly emoji icons read, differ across Apple, Google, Microsoft, and Linux fonts. Hover rules apply only to pointer: fine; on touch devices the focus half of `slop.static-interactive` still applies. Korean service pages run a display ratio near 2.0, so a low ratio is never an error.

## Unsupported Absolutes

The thresholds are medians and quartiles of one snapshot of 49 homepages, not universal limits. A direction can deliberately exceed one (a hardware catalogue's display ratio runs near 6.7) if its brief says so; the checker should then accept a documented waiver rather than move the threshold. Review entries are never errors.

## Verification Contract

`node scripts/validate-anti-patterns.mjs --json` passes: ids are unique and in the `slop.` namespace, every required field is present, every machine entry has a complete rule and severity `error`, every review entry has a question and severity `review`, every cited source exists, and every id appears on this page. `node scripts/test-validate-anti-patterns.mjs` proves that the validator fails on a catalog built to violate each of those conditions. When a benchmark in [Measured Expression Benchmarks](measured-benchmarks.md) or a floor in the [Showcase QA contract](../showcase/QA.md) changes, update the matching threshold here and in the JSON together.

## Source, License, And Attribution

Locally authored. Thresholds are the computed-style measurements recorded in [Measured Expression Benchmarks](measured-benchmarks.md) and the floors in the [Showcase QA contract](../showcase/QA.md); no markup, copy, or code from measured sites is reproduced.

## IA Navigation

Parent: [Expression](index.md).
Next: [Measured Expression Benchmarks](measured-benchmarks.md).
