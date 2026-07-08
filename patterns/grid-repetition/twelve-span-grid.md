---
type: Layout Pattern
name: twelve-span-grid
title: twelve-span-grid
category: Grid / Repetition
description: Provide a twelve-column placement scaffold.
primary_spatial_problem: Provide a twelve-column placement scaffold.
secondary_spatial_problems: none
layout_axis: both
content_shape: mixed
responsiveness: fluid
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: No internal scroll container.
source_lineage: https://web.dev/articles/one-line-layouts
---

# twelve-span-grid

## When To Use

Use this pattern when you need to provide a twelve-column placement scaffold.

## HTML

```html
<section class="twelve_span_grid" aria-label="Dashboard modules">
    <article class="twelve_span_grid_item">Revenue module</article>
    <article class="twelve_span_grid_item">Retention module</article>
    <article class="twelve_span_grid_item">Pipeline module</article>
</section>
```

## CSS

```css
.twelve_span_grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(12, minmax(0, 1fr));
}

.twelve_span_grid_item {
    grid-column: span 4;
}
```

## Core Properties

- `display`, `gap`, `grid-template-columns`, `grid-column` define the spatial behavior for this pattern.

## Properties That Break The Layout If Removed

- Removing `display`, `gap`, `grid-template-columns`, `grid-column` changes the pattern from its documented layout responsibility back toward ordinary flow or an unsafe fixed arrangement.

## Constraints And Change Points

- fluid responsiveness is part of the contract; change sizing values only when the new minimum, maximum, or wrap point is documented with the pattern.
- Keep the HTML class hooks and CSS selectors in one-to-one agreement.

## Scroll Ownership

No internal scroll container.

## Accessibility And Source Order Notes

Keep semantic elements, DOM order, reading order, and focus order independent from the visual placement created by the layout classes.

## Browser And Fallback Notes

The CSS uses modern grid, flex, intrinsic sizing, logical properties, or positioning. If a target browser cannot support a property, fall back to ordinary block flow before adding decorative or script-driven layout behavior.

## Composition Notes

Use `twelve_span_grid` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.

## IA Navigation

Parent: [Grid / Repetition patterns](index.md) in [Pattern Categories](../index.md).
Next: [Layout Recipes](../../recipes/index.md) for screen-level composition, or return to the [Layout Pattern Catalog](../../CATALOG.md) when choosing another primitive.
