---
type: Agent Instructions
title: StyleGallery agent instructions
description: Rules coding agents must follow when editing this governed multi-domain gallery.
---

# Agent Instructions

This repository is StyleGallery: a governed gallery with Layout, Motion, Design Engineering, Game UI, and Platform Guides domains. Read [StyleGallery Domains](DOMAINS.md) before adding a domain, changing a domain boundary, or adapting an external source.

Before editing generated artifacts, validators, lifecycle state, or ownership policy, read [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md).

## Core Rules

- Classify every change by domain before editing.
- Keep domain-local guidance inside its owning path and preserve shared evidence boundaries.
- Do not use one domain to bypass another domain's constraints.
- Treat `consumer-reference/` as shared non-domain schema, provenance, routing, and evidence infrastructure; it owns no profile values, visual defaults, component implementation, or product CSS.
- Keep dependency direction consumer/profile -> Layout. Do not import consumer-reference records, profile data, tokens, or decorative values into `layout/**`, `patterns/**`, `scripts/pattern-data.mjs`, or `CATALOG.md`.
- Include the consumer-reference handoff field in implementation handoffs. Use one normalized repository-relative JSON record or `not_applicable` with a sentence reason.
- Treat `patterns/**`, `recipes/**`, `GUIDE.md`, and `CATALOG.md` as the Layout corpus at their existing paths.
- Treat the Layout domain as a layout pattern library, not a visual design system.
- Start with semantic HTML before adding layout classes.
- Keep DOM order, reading order, and focus order logical.
- Keep each pattern focused on one primary spatial problem.
- Allow secondary spatial behavior only when it is required for composition.
- Use the smallest robust set of CSS declarations, not the fewest fragile declarations.
- Prefer plain HTML and CSS as the source of truth.
- Make constraints explicit: widths, heights, gaps, breakpoints, scroll containers, and fixed or sticky anchors should be easy to find.
- Make scroll responsibility obvious in both class names and CSS.
- Keep decorative styling out of reusable pattern CSS.

The remaining pattern, CSS, naming, token, checklist, and verification rules apply to the Layout domain. Non-Layout domain documents may discuss product-layer behavior, but they do not authorize decorative or motion properties in reusable Layout pattern CSS.

## Pattern Boundary Gate

Before adding a new pattern or changing reusable pattern CSS, check [Layout Decision Tree](guides/decision-tree.md) and [Layout Brief Template](guides/layout-brief.md).

- Decide whether the work is a new pattern, a recipe composition, or product styling outside this repository.
- Name the layout owner, scroll owner, core layout declarations, excluded demo/product styling, and likely breaking content case.
- For scroll or responsive changes, include the failure case the pattern prevents, such as a missing shrink constraint or a viewport breakpoint used for component-local behavior.
- Add a new pattern only when existing patterns or recipes do not already cover the spatial responsibility.

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
