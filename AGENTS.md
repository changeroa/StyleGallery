---
type: Agent Instructions
title: layout-gallery agent instructions
description: Rules coding agents must follow when editing this layout pattern library.
---

# Agent Instructions

This repository is `layout-gallery`: a gallery of minimal, portable CSS layout patterns.

## Using layout-gallery As A Downstream Reference

When another project asks an agent to use this repository as a reference, start with the [layout-gallery Reference Contract](README.md#layout-gallery-reference-contract).

- Borrow structure, not literal selectors: preserve semantic order, layout responsibility, pattern stack, scroll owner, constraints, and accessibility risks, then map them to the consuming project's local class/component names.
- Use repo-local units in the consuming project: do not convert a `px` token system to `rem`, or a `rem` system to `px`, just because an example here uses a different unit.
- Do not infer visual styling from layout primitives. Brand, typography, color, radius, shadow, motion, image treatment, and page-specific surfaces belong to the consuming product.
- Report the mapping: `layout-gallery` recipe or primitive -> local selector/component -> local token/unit decision -> verification surface.

## Core Rules

- Treat this repository as a layout pattern library, not a visual design system.
- Start with semantic HTML before adding layout classes.
- Keep DOM order, reading order, and focus order logical.
- Keep each pattern focused on one primary spatial problem.
- Allow secondary spatial behavior only when it is required for composition.
- Use the smallest robust set of CSS declarations, not the fewest fragile declarations.
- Prefer plain HTML and CSS as the source of truth.
- Make constraints explicit: widths, heights, gaps, breakpoints, scroll containers, and fixed or sticky anchors should be easy to find.
- Make scroll responsibility obvious in both class names and CSS.
- Keep decorative styling out of reusable pattern CSS.

## CSS Authoring

- Use layout properties only unless a non-layout property is required to explain layout behavior.
- Prefer low-specificity, single-class selectors.
- Do not use ID selectors for styling or layout naming.
- Avoid deep combinators, selector chaining, element-qualified classes, and nesting unless the pattern explicitly demonstrates that tradeoff.
- Use cascade layers when the CSS surface grows beyond isolated snippets.
- Keep CSS declarations in alphabetical order inside each rule.
- Prefer intrinsic sizing and content/container-driven adaptation.
- Use viewport breakpoints only for viewport-level patterns.
- Prefer container queries for component-local responsiveness.
- Prefer logical properties for spacing and sizing unless physical direction is required.
- Use state hooks or `data-*` attributes for variants instead of escalating selector specificity.

## CSS Scope

Allowed by default:

- `align-*`
- `aspect-ratio`
- `block-size`
- `box-sizing`
- `container-*`
- `display`
- `flex-*`
- `gap`
- `grid-*`
- `height`
- `inline-size`
- `inset`
- `justify-*`
- `margin`
- `margin-block`
- `margin-inline`
- `max-*`
- `min-*`
- `overflow`
- `padding`
- `padding-block`
- `padding-inline`
- `place-*`
- `position`
- `width`
- `z-index`

Avoid in reusable pattern CSS unless there is a layout-specific reason:

- `animation`
- `background`
- `border`
- `border-radius`
- `box-shadow`
- `color`
- `filter`
- `font-*`
- `opacity`
- `text-*`
- `transition`
- `transform`

## Class Naming

- Class names must describe layout responsibility, not visual appearance.
- Class names should make relationships obvious: root-child, parent-child, area-element, and fixed-scroll relationships.
- Prefer pattern-scoped names for related nodes.
- Avoid vague names like `container`, `wrapper`, `box`, `top`, `content`, and `bottom` unless the surrounding pattern name makes their responsibility unambiguous.
- Avoid DOM-depth names that mirror every nested node; name stable roles instead.
- Do not use IDs for layout naming. Use IDs only for JavaScript hooks or document-level targets when needed.

Example:

```html
<div class="fixed_header_layout">
    <header class="fixed_header_layout_header"></header>
    <main class="fixed_header_layout_scroll_area"></main>
</div>
```

## Value And Token Policy

- Tokenize reusable design intent, not every layout number.
- Use tokens for stable shared values such as content width, gutters, stack gaps, section gaps, and density steps.
- Keep browser/context mechanics in raw CSS: `auto`, percentages, intrinsic sizing, viewport units, and container-query units.
- Put tokens behind logical CSS, for example `padding-block: var(--space-4)`.
- Use breakpoint names for layout states, not device names.

## Pattern Checklist

Before finishing a pattern change, check:

- Does the pattern optimize one primary spatial problem?
- Can the DOM structure be understood without the CSS?
- Are semantic HTML elements used before layout classes?
- Are class names semantically clear and relationship-aware?
- Is every CSS declaration necessary for robust behavior?
- Are declarations alphabetized?
- Is selector specificity low and intentional?
- Is scroll ownership explicit?
- Are constraints and change points easy to find?
- Did decorative styling stay out of the reusable pattern?

## Verification Checklist

Verify the smallest relevant matrix for the change:

- Viewports: `320px`, `375px`, `768px`, `1024px`, `1440px`
- Containers: tight, medium, roomy, and `100%` parent
- Content: empty, short, long label, long paragraph, unbroken string
- Direction: `ltr` and `rtl`
- Writing mode: default, plus vertical writing mode if the pattern claims support
- Interaction: default, hover, focus, active, expanded, scroll top/middle/bottom when relevant

If there is no runnable gallery surface yet, inspect the snippets directly and report that manual browser verification is not available.
