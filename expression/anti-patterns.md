---
type: Domain Guide
title: AI-Slop UI Anti-Patterns
description: A catalog of the template looks that make a generated product page read as AI slop, each with an id, a machine-checkable DOM/CSS rule or a review question, and the measured values behind it.
aliases: ["ai slop","ai slop ui","slop catalog","anti-patterns","template look","generic landing page","AI 슬롭","슬롭 안티패턴"]
questions: ["Why does my generated landing page look like AI slop?","Which AI-slop patterns can a headless browser detect?","Is a purple gradient behind a headline a problem?","Should I use emoji as feature icons?","How many soft shadows are too many on a landing page?"]
domain: expression
lifecycle: experimental
source_repository: leonxlnx/taste-skill
source_path: skills/taste-skill/references/tells.md
source_revision: b9ca2fd8047f4c72d7da90ebc1c1203e57c72cd2
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

### Evidence grades

Every entry records `first_seen` as an ISO calendar date: the date its id first entered this repository, not the date someone believes the visual device originated. All current ids were introduced by commit `edded3eb698625f9013b58da4cc45dc0d98ea2ee` on 2026-10-19. Preserve that date when revising an entry.

`evidence_grade` describes the support for the rule, separately from its detection kind:

- `measured-differential`: a measured difference between sites rated strong and weak, with the sample, rating method, and comparison cited.
- `measured-baseline`: calibration against our 49 measured originals, including the Showcase QA floors derived from that baseline. It is not a preference experiment or proof that every numeric cutoff optimizes quality.
- `consensus-opinion`: an unmeasured concern named in at least three independent skill collections; name those collections before assigning it. Repetition is not measurement.
- `owner-taste`: a maintainer preference or contextual review judgment without that measurement or documented independent consensus.

The existing machine rules retain `measured-baseline`; their QA-derived operational cutoffs, including emoji and CTA checks, are local policy choices, not separately measured strong/weak effects. Rhythm review also uses our measured baseline. Copy, proof, and gradient-text review conservatively use `owner-taste`; their contextual judgments have no direct calibration here. No current entry claims `measured-differential` or `consensus-opinion`. Both opinion grades must remain `detectable: review` with severity `review`, never machine errors.

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

## Page Profiles

The machine thresholds were calibrated on landing and brand homepages, so they hold a reading page or an application to the wrong standard. The catalog's `profiles` object names three page profiles and, for each, the rules that become warnings instead of errors:

- `landing`: marketing, brand, and product landing pages. Every machine rule is an error; this is the calibration profile.
- `app`: dashboards, editors, search and booking forms. Richness floors, display scale, surface finishing, gradients as fill, card triplets, and motion density become warnings.
- `content`: articles, documentation, government, news, and link directories. The same rules as `app`, plus soft shadows, become warnings. A text-led screen is finished by its text, so the empty-screen floor, which counts imagery or 10% text coverage, is not a defect there.

Accessibility checks (`audit.*` other than empty screens and link transition speed), honest actions (`slop.dishonest-cta`), and emoji icons (`slop.emoji-icons`) stay errors in every profile. `stylegallery audit check` picks the profile from rendered signals unless `--profile` names one, and reports the profile, its source, and the signals. The detection rule is in `profiles.detection`. The 2026-10-19 real-site run that motivated the split is reproduced in `tests/fixtures/audit-realsites/`: GOV.UK screens with 8.5% and 9.9% text coverage, and Hacker News links without hover transitions, failed the landing floors even though they are correct for their purpose.

## Opinionated Guidance

The common thread is substitution: a gradient where a picture belongs, a shadow where a clip or hairline belongs, a bigger headline where better content belongs, and an emoji where a drawn icon belongs. The 49 measured originals keep display type at 3.5-5.5 times the body, answer every link within 100-320ms, and finish surfaces with masks and hairlines rather than soft shadows. Fixing one entry by adding the next (replacing a gradient screen with a triplet of emoji cards) still produces slop.

Treat a machine error as a definite defect and a review question as a prompt to defend the choice. A direction may answer a review question with a reason, for example gradient text used once as a brand mark.

Write alternatives as procedures: identify the information a device should carry, choose a treatment from the product's actual content, then inspect whether the result communicates it. Do not publish replacement-font or replacement-colour lists as the remedy. Repeated substitution from a fixed shopping list merely trains the next recognizable default.

## Reviewed and rejected

The JSON's top-level `reviewed_and_rejected` list preserves ids, titles, exact upstream repository/path/revision, and a reason for each decision. Rejected ids cannot collide with active entry ids. These are exclusions from adaptation, not new rules:

- **Monospace ban:** the taste-skill study (model panel) reports labels on 44% of strong sites versus 24% of weak sites; the proposed prohibition expresses house taste.
- **Index-number (01/02) ban:** the taste-skill study (model panel) reports 38% versus 21%, again opposing a blanket ban. Decide whether order needs explaining.
- **Hairline/1px box ban:** the taste-skill study (model panel) reports thin rules on 61% versus 52%, without a useful negative distinction. Our originals' median of 24 hairlines also contradicts prohibition.
- **Two-line headline error:** the taste-skill study (model panel) reports compliance on 71% of strong sites and 83% of weak sites. Wrapping needs language, content, and width context.
- **Unconditional 8.4vw display:** this is a strong-site median in the taste-skill study (model panel), not a prescription. Keep our body-relative calibration and explicit exceptions.
- **Claude-brand hex and cream+terracotta bans:** brand association and rarity do not establish a design defect; evaluate the brief and contrast.
- **Cliche-word dictionary as error:** individual words do not establish generic copy. Retain contextual review.
- **Research/laziness material:** model motivation and incentive claims are outside this catalog's design evidence and lack local verification; no material is imported.

## Platform-Specific Guidance

The thresholds come from desktop Chromium at 1440x900 with an `en-US` locale. Emoji glyphs, and therefore how loudly emoji icons read, differ across Apple, Google, Microsoft, and Linux fonts. Hover rules apply only to pointer: fine; on touch devices the focus half of `slop.static-interactive` still applies. Korean service pages run a display ratio near 2.0, so a low ratio is never an error.

## Unsupported Absolutes

The thresholds are medians and quartiles of one snapshot of 49 homepages, not universal limits. A direction can deliberately exceed one (a hardware catalogue's display ratio runs near 6.7) if its brief says so; the checker should then accept a documented waiver rather than move the threshold. Review entries are never errors.

## Verification Contract

`node scripts/validate-anti-patterns.mjs --json` checks unique ids, required fields, calendar dates, evidence grades, opinion-only review, complete machine rules, review questions, source existence, companion ids, and the closed rejected-item shape and collision boundary. `node scripts/test-validate-anti-patterns.mjs` exercises failures for those conditions. It cannot establish historical dates or the truth of an evidence claim; inspect Git history and named sources. When a benchmark or QA floor changes, update the matching threshold here and in the JSON together. Use the [blind design A/B protocol](../quality/evidence/design-ab.md) to compare outcomes: zero violations do not establish a better page.

## Source, License, And Attribution

The dated registry and procedural-remedy method are independently rewritten from [taste-skill's registry](https://github.com/leonxlnx/taste-skill/blob/b9ca2fd8047f4c72d7da90ebc1c1203e57c72cd2/skills/taste-skill/references/tells.md) (MIT, Leonxlnx, 2026). Supporting rejection comparisons were re-checked in [its research](https://github.com/leonxlnx/taste-skill/blob/b9ca2fd8047f4c72d7da90ebc1c1203e57c72cd2/skills/taste-skill/references/research.md) on 2026-10-19; they are model-panel observations, not human preference evidence. No upstream sentences, tables, or code are reproduced. Existing detection rules and thresholds remain StyleGallery-local, based on [Measured Expression Benchmarks](measured-benchmarks.md) and [Showcase QA](../showcase/QA.md). Evidence grades are a local classification, not an upstream quality guarantee.

## IA Navigation

Parent: [Expression](index.md).
Next: [Measured Expression Benchmarks](measured-benchmarks.md).
