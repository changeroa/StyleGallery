---
type: Layout Pattern
name: columns
title: columns
category: Grid / Repetition
description: Flow long content into balanced text columns.
primary_spatial_problem: Flow long content into balanced text columns.
secondary_spatial_problems: none
layout_axis: inline
content_shape: mixed
responsiveness: fluid
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: No internal scroll container.
source_lineage: https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook
---

# columns

## When To Use

Use this pattern when you need to flow long content into balanced text columns.

## HTML

```html
<article class="columns" aria-labelledby="columns-heading">
    <h2 id="columns-heading">Release notes</h2>
    <p>Several short updates can flow into balanced columns when there is room.</p>
    <p>When the container narrows, the same content returns to a single column.</p>
</article>
```

## CSS

```css
.columns {
    column-gap: 2rem;
    columns: 18rem;
}
```

## Core Properties

- `column-gap`, `columns` define the spatial behavior for this pattern.

## Properties That Break The Layout If Removed

- Removing `column-gap`, `columns` changes the pattern from its documented layout responsibility back toward ordinary flow or an unsafe fixed arrangement.

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

Use `columns` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.

## IA Navigation

Parent: [Grid / Repetition patterns](index.md) in [Pattern Categories](../index.md).
Next: [Layout Recipes](../../recipes/index.md) for screen-level composition, or return to the [Layout Pattern Catalog](../../CATALOG.md) when choosing another primitive.
