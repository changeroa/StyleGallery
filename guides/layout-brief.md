---
type: Planning Guide
title: Layout Brief Template
description: Questions to answer before selecting a layout pattern stack.
---

# Layout Brief Template

Use this template before choosing patterns. The answer should describe spatial responsibility, not visual style.

## Screen

- What is the screen type?
- What is the primary user task?
- What is the primary content?
- What is the supporting content?

## Source Order

- Does DOM order match reading order?
- Does visual order match focus order?
- Which landmarks, headings, lists, links, buttons, or form controls are required before layout classes?

## Scroll Ownership

- What owns scrolling?
- Is there one scroll container or more than one?
- Which regions stay fixed, sticky, or static?
- Where is height determined?

## Constraints

- What are the minimum and maximum inline sizes?
- Which gaps are stable across the screen?
- Which regions may shrink, wrap, or overflow?
- Which values are product tokens, and which are browser mechanics?

## Responsiveness

- Is this a viewport-level problem or a component-local problem?
- Can the layout adapt through intrinsic sizing before adding breakpoints?
- Should container queries be used instead of viewport breakpoints?
- What changes at narrow, medium, and roomy container sizes?

## Content Stress

- What happens when content is empty?
- What happens with long labels?
- What happens with long paragraphs?
- What happens with an unbroken string?
- Does the layout survive `ltr` and `rtl` direction?

## Webpage Generation Intake

Use these fields when raw content must become a homepage or ordinary webpage before a pattern stack is obvious.

Content-to-layout match:

- What type of webpage is being made: homepage, campaign page, product page, article, documentation, portfolio, or support page?
- Which content blocks are mandatory, optional, repeated, or disposable?
- Which section job does each block serve: hook, explain, prove, compare, convert, navigate, or retain?
- Which layout recipe is the closest spatial model, and which recipes were rejected?

Harmony evaluation:

- Does the section order match the visitor's decision path?
- Does the visual weight match content priority before decoration is considered?
- Do repeated regions share a rhythm without hiding unique content jobs?
- Do accessibility, source order, and task completion override visual novelty where they conflict?

GPT Image reference:

- Required preconditions before prompt: use case, content blocks, section jobs, selected recipe, approved pattern stack, constraints, and harmony notes.
- What image prompt will be generated from the approved content hierarchy and pattern stack?
- Which details must the image clarify: hero composition, section rhythm, hierarchy, spacing, media treatment, or CTA priority?
- Image review extract-vs-ignore: implementable hierarchy, spacing, media treatment, and CTA priority go into the handoff; decorative styling and proof-like claims stay out of reusable pattern CSS.
- Which generated-image details are decorative and must not be copied into reusable pattern CSS?
- Accepted image debt: record unclear areas that need another image, a written decision, or product-owner follow-up.
- Which unclear generated-image details need a written decision, another reference, or explicit exclusion before implementation?

Implementation handoff:

- Which semantic HTML skeleton, layout patterns, constraints, and scroll owners are approved?
- Which image-reference observations become product-level visual styling outside the pattern library?
- Which viewport, content-stress, accessibility, and visual-evidence checks must pass before shipping?
- Consumer reference: `not_applicable`.
- Consumer reference reason: This blank planning template declares no consumer-specific reference record.
- Consumer migration conformance: omit for ordinary work; for an elected migration method, use `declared` plus one normalized consumer-local JSON record path.

## Minimum Required Fields By Use Case

Use the smallest field set that can keep source order, scroll ownership, and constraints from being overridden by visual taste or generated imagery.

Homepage:

- Content blocks, section jobs, closest recipe, pattern stack, scroll owner, constraints, harmony evaluation, GPT Image reference, implementation handoff.

Dashboard:

- Repeated panel inventory, scan or comparison task, closest recipe, pattern stack, scroll owner, constraints, harmony evaluation, GPT Image reference, implementation handoff.

Article:

- Reading path, supplemental content, closest recipe, pattern stack, scroll owner, constraints, harmony evaluation, GPT Image reference, implementation handoff.

Form:

- Input groups, validation and action placement, closest recipe, pattern stack, scroll owner, constraints, harmony evaluation, GPT Image reference, implementation handoff.

Command surface:

- Command regions, controlled content regions, closest recipe, pattern stack, scroll owner, constraints, harmony evaluation, GPT Image reference, implementation handoff.

## Rejected Alternatives

Record alternatives at the point they are rejected so the implementation handoff does not reopen them accidentally.

```txt
Rejected pattern or recipe:
Reason rejected:
Which requirement it weakened:
Replacement:
Accepted tradeoff:
```

## Candidate Pattern Stack

Record the initial pattern stack and why each pattern is responsible for a specific spatial problem.

```txt
Screen type:
Primary task:
Primary content:
Supporting content:
Scroll owner:
Pattern boundary:
Pattern stack:
Layout owner:
Core layout declarations:
Demo or product styling excluded:
Constraints:
Change points:
Likely breaking content case:
Patterns rejected:
Webpage use case:
Section jobs:
Harmony notes:
GPT Image reference prompt:
Implementation handoff:
Consumer reference: not_applicable
Consumer reference reason: This blank layout brief declares no consumer-specific reference record.
```

Short examples:

- New pattern: `Pattern boundary: repeated layout failure`, `Layout owner: tab_strip owns inline overflow`, `Demo or product styling excluded: active tab color`.
- Recipe composition: `Pattern boundary: recipe composition`, `Pattern stack: fixed-sidenav-shell, content-limiter, stack`, `Patterns rejected: new settings-page pattern`.
- Product styling: `Pattern boundary: product styling`, `Core layout declarations: card-grid placement only`, `Demo or product styling excluded: shadows, radius, color accents`.

Minimal code example:

```html
<section class="settings_shell" aria-label="Settings">
    <nav class="settings_shell_nav" aria-label="Settings sections"></nav>
    <main class="settings_shell_scroll_area"></main>
</section>
```

```css
.settings_shell {
    block-size: 100dvb;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
}

.settings_shell_scroll_area {
    min-block-size: 0;
    overflow: auto;
}
```

In this example, `settings_shell` owns viewport sizing and columns, `settings_shell_scroll_area` owns scrolling, and visual treatment such as active nav color, borders, shadows, and typography stays outside the reusable layout CSS.

Failure example:

```css
/* Avoid: overflow is named, but the grid child may refuse to shrink. */
.settings_shell_scroll_area {
    overflow: auto;
}
```

```css
/* Prefer: the scroll owner can shrink inside the shell track. */
.settings_shell_scroll_area {
    min-block-size: 0;
    overflow: auto;
}
```

Styling boundary example:

```css
/* Avoid in reusable pattern CSS: layout and product styling are mixed. */
.settings_shell_scroll_area {
    background: var(--panel-background);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    min-block-size: 0;
    overflow: auto;
}
```

```css
/* Prefer in reusable pattern CSS: only the scroll responsibility remains. */
.settings_shell_scroll_area {
    min-block-size: 0;
    overflow: auto;
}
```
