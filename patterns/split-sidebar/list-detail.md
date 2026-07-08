---
type: Layout Pattern
name: list-detail
title: list-detail
category: Split / Sidebar
description: Place an explorable list beside its detail region.
primary_spatial_problem: Place an explorable list beside its detail region.
secondary_spatial_problems: none
layout_axis: inline
content_shape: mixed
responsiveness: reflow
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: No internal scroll container.
source_lineage: https://m3.material.io/foundations/adaptive-design/canonical-layouts
---

# list-detail

## When To Use

Use this pattern when you need to place an explorable list beside its detail region.

## HTML

```html
<section class="list_detail" aria-label="Customer records">
    <nav class="list_detail_list"><a href="#">Acme Co.</a><a href="#">Northwind</a></nav>
    <section class="list_detail_detail">Selected customer timeline</section>
</section>
```

## CSS

```css
.list_detail {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
}

.list_detail_list {
    min-inline-size: 0;
}

.list_detail_detail {
    min-inline-size: 0;
}
```

## Core Properties

- `display`, `gap`, `grid-template-columns`, `min-inline-size` define the spatial behavior for this pattern.

## Properties That Break The Layout If Removed

- Removing `display`, `gap`, `grid-template-columns`, `min-inline-size` changes the pattern from its documented layout responsibility back toward ordinary flow or an unsafe fixed arrangement.

## Constraints And Change Points

- reflow responsiveness is part of the contract; change sizing values only when the new minimum, maximum, or wrap point is documented with the pattern.
- Keep the HTML class hooks and CSS selectors in one-to-one agreement.

## Scroll Ownership

No internal scroll container.

## Accessibility And Source Order Notes

Keep semantic elements, DOM order, reading order, and focus order independent from the visual placement created by the layout classes.

## Browser And Fallback Notes

The CSS uses modern grid, flex, intrinsic sizing, logical properties, or positioning. If a target browser cannot support a property, fall back to ordinary block flow before adding decorative or script-driven layout behavior.

## Composition Notes

Use `list_detail` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.

## IA Navigation

Parent: [Split / Sidebar patterns](index.md) in [Pattern Categories](../index.md).
Next: [Layout Recipes](../../recipes/index.md) for screen-level composition, or return to the [Layout Pattern Catalog](../../CATALOG.md) when choosing another primitive.
