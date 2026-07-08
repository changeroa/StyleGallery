---
type: Layout Pattern
name: reel
title: reel
category: In-line grouping
description: Let a row scroll horizontally instead of wrapping.
primary_spatial_problem: Let a row scroll horizontally instead of wrapping.
secondary_spatial_problems: none
layout_axis: inline
content_shape: mixed
responsiveness: scroll
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: Pattern owns the named scroll container.
source_lineage: https://every-layout.dev/layouts/
---

# reel

## When To Use

Use this pattern when you need to let a row scroll horizontally instead of wrapping.

## HTML

```html
<section class="reel" aria-label="Upcoming events">
    <article>Design critique</article>
    <article>Planning workshop</article>
    <article>Launch review</article>
</section>
```

## CSS

```css
.reel {
    display: grid;
    gap: 1rem;
    grid-auto-columns: minmax(14rem, 35%);
    grid-auto-flow: column;
    overflow-x: auto;
}
```

## Core Properties

- `display`, `gap`, `grid-auto-columns`, `grid-auto-flow`, `overflow-x` define the spatial behavior for this pattern.

## Properties That Break The Layout If Removed

- Removing `display`, `gap`, `grid-auto-columns`, `grid-auto-flow`, `overflow-x` changes the pattern from its documented layout responsibility back toward ordinary flow or an unsafe fixed arrangement.

## Constraints And Change Points

- scroll responsiveness is part of the contract; change sizing values only when the new minimum, maximum, or wrap point is documented with the pattern.
- Keep the HTML class hooks and CSS selectors in one-to-one agreement.

## Scroll Ownership

Pattern owns the named scroll container.

## Accessibility And Source Order Notes

Keep semantic elements, DOM order, reading order, and focus order independent from the visual placement created by the layout classes.

## Browser And Fallback Notes

The CSS uses modern grid, flex, intrinsic sizing, logical properties, or positioning. If a target browser cannot support a property, fall back to ordinary block flow before adding decorative or script-driven layout behavior.

## Composition Notes

Use `reel` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.

## IA Navigation

Parent: [In-line grouping patterns](index.md) in [Pattern Categories](../index.md).
Next: [Layout Recipes](../../recipes/index.md) for screen-level composition, or return to the [Layout Pattern Catalog](../../CATALOG.md) when choosing another primitive.
