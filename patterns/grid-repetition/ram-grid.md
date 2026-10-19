---
type: Layout Pattern
name: ram-grid
title: ram-grid
category: Grid / Repetition
description: Repeat items into as many useful columns as space allows.
aliases: ["repeat auto-fit minmax","responsive grid without media queries","auto-fit grid","반응형 그리드","반응형 카드 그리드"]
questions: ["How do I make a grid that fits as many columns as space allows without media queries?"]
primary_spatial_problem: Repeat items into as many useful columns as space allows.
secondary_spatial_problems: none
layout_axis: both
content_shape: mixed
responsiveness: fluid
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: No internal scroll container.
source_lineage: https://web.dev/articles/one-line-layouts
lifecycle: generated
generated_from: scripts/generate-patterns.mjs, scripts/pattern-data.mjs
---

<!-- Generated from `scripts/generate-patterns.mjs` and `scripts/pattern-data.mjs`. Do not hand-edit generated catalog or pattern docs; edit the source files and regenerate. -->

# ram-grid

## When To Use

Use this pattern when you need to repeat items into as many useful columns as space allows.

## HTML

```html
<section class="ram_grid" aria-label="Photo albums">
    <article>Spring launch album</article>
    <article>Customer meetup album</article>
    <article>Workshop album</article>
</section>
```

## CSS

```css
.ram_grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr));
}
```

## Core Properties

- `display`, `gap`, `grid-template-columns` define the spatial behavior for this pattern.

## Properties That Break The Layout If Removed

- Removing `display`, `gap`, `grid-template-columns` changes the pattern from its documented layout responsibility back toward ordinary flow or an unsafe fixed arrangement.

## Constraints And Change Points

- fluid responsiveness is part of the contract; change sizing values only when the new minimum, maximum, or wrap point is documented with the pattern.
- Keep the HTML class hooks and CSS selectors in one-to-one agreement.

## Scroll Ownership

No internal scroll container.

## Accessibility And Source Order Notes

- Semantic role expectation: Preserve the HTML sample's landmark, list, navigation, form, figure, or article roles; layout classes must not replace semantic elements.
- DOM order expectation: Keep semantic elements, DOM order, reading order, and focus order independent from the visual placement created by the layout classes.
- Focus risk: Any interactive descendants follow DOM order; do not use this pattern to create a visual order that keyboard focus cannot follow.
- Scroll expectation: No internal scroll container.
- Cognitive risk: Low: the pattern should preserve ordinary reading flow when semantic order is already correct.

## Browser And Fallback Notes

The CSS uses modern grid, flex, intrinsic sizing, logical properties, or positioning. If a target browser cannot support a property, fall back to ordinary block flow before adding decorative or script-driven layout behavior.

## Composition Notes

Use `ram_grid` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.

## IA Navigation

Parent: [Grid / Repetition patterns](index.md) in [Pattern Categories](../index.md).
Next: [Layout Recipes](../../recipes/index.md) for screen-level composition, or return to the [Layout Pattern Catalog](../../CATALOG.md) when choosing another primitive.
