---
type: Layout Pattern
name: sticky-aside
title: sticky-aside
category: Split / Sidebar
description: Keep related aside content visible during long reads.
primary_spatial_problem: Keep related aside content visible during long reads.
secondary_spatial_problems: none
layout_axis: block
content_shape: mixed
responsiveness: fluid
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: No internal scroll container.
source_lineage: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position
---

# sticky-aside

## When To Use

Use this pattern when you need to keep related aside content visible during long reads.

## HTML

```html
<section class="sticky_aside" aria-label="Long article">
    <main class="sticky_aside_main">Article sections continue down the page.</main>
    <aside class="sticky_aside_side">Table of contents</aside>
</section>
```

## CSS

```css
.sticky_aside {
    align-items: start;
    display: grid;
    gap: 1rem;
    grid-template-columns: minmax(0, 1fr) 16rem;
}

.sticky_aside_main {
    min-inline-size: 0;
}

.sticky_aside_side {
    inset-block-start: 1rem;
    position: sticky;
}
```

## Core Properties

- `align-items`, `display`, `gap`, `grid-template-columns`, `min-inline-size`, `inset-block-start`, `position` define the spatial behavior for this pattern.

## Properties That Break The Layout If Removed

- Removing `align-items`, `display`, `gap`, `grid-template-columns`, `min-inline-size`, `inset-block-start`, `position` changes the pattern from its documented layout responsibility back toward ordinary flow or an unsafe fixed arrangement.

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

Use `sticky_aside` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.

## IA Navigation

Parent: [Split / Sidebar patterns](index.md) in [Pattern Categories](../index.md).
Next: [Layout Recipes](../../recipes/index.md) for screen-level composition, or return to the [Layout Pattern Catalog](../../CATALOG.md) when choosing another primitive.
