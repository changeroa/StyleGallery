---
type: Layout Pattern
name: pagination
title: pagination
category: In-line grouping
description: Lay out page controls as a bounded wrapping row.
primary_spatial_problem: Lay out page controls as a bounded wrapping row.
secondary_spatial_problems: none
layout_axis: inline
content_shape: mixed
responsiveness: wrap
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: No internal scroll container.
source_lineage: https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook
---

# pagination

## When To Use

Use this pattern when you need to lay out page controls as a bounded wrapping row.

## HTML

```html
<nav class="pagination" aria-label="Search results pages">
    <a href="#">Previous</a>
    <a href="#">Page 4</a>
    <a href="#">Next</a>
</nav>
```

## CSS

```css
.pagination {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
}
```

## Core Properties

- `display`, `flex-wrap`, `gap`, `justify-content` define the spatial behavior for this pattern.

## Properties That Break The Layout If Removed

- Removing `display`, `flex-wrap`, `gap`, `justify-content` changes the pattern from its documented layout responsibility back toward ordinary flow or an unsafe fixed arrangement.

## Constraints And Change Points

- wrap responsiveness is part of the contract; change sizing values only when the new minimum, maximum, or wrap point is documented with the pattern.
- Keep the HTML class hooks and CSS selectors in one-to-one agreement.

## Scroll Ownership

No internal scroll container.

## Accessibility And Source Order Notes

Keep semantic elements, DOM order, reading order, and focus order independent from the visual placement created by the layout classes.

## Browser And Fallback Notes

The CSS uses modern grid, flex, intrinsic sizing, logical properties, or positioning. If a target browser cannot support a property, fall back to ordinary block flow before adding decorative or script-driven layout behavior.

## Composition Notes

Use `pagination` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.

## IA Navigation

Parent: [In-line grouping patterns](index.md) in [Pattern Categories](../index.md).
Next: [Layout Recipes](../../recipes/index.md) for screen-level composition, or return to the [Layout Pattern Catalog](../../CATALOG.md) when choosing another primitive.
