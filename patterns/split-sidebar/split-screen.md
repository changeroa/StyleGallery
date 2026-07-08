---
type: Layout Pattern
name: split-screen
title: split-screen
category: Split / Sidebar
description: Split a viewport or region into two balanced panes.
primary_spatial_problem: Split a viewport or region into two balanced panes.
secondary_spatial_problems: none
layout_axis: inline
content_shape: mixed
responsiveness: reflow
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: No internal scroll container.
source_lineage: https://m3.material.io/foundations/adaptive-design/canonical-layouts
---

# split-screen

## When To Use

Use this pattern when you need to split a viewport or region into two balanced panes.

## HTML

```html
<section class="split_screen" aria-label="Compare documents">
    <section class="split_screen_pane">Draft contract</section>
    <section class="split_screen_pane">Reviewed contract</section>
</section>
```

## CSS

```css
.split_screen {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr));
    min-block-size: 100dvh;
}

.split_screen_pane {
    min-inline-size: 0;
}
```

## Core Properties

- `display`, `gap`, `grid-template-columns`, `min-block-size`, `min-inline-size` define the spatial behavior for this pattern.

## Properties That Break The Layout If Removed

- Removing `display`, `gap`, `grid-template-columns`, `min-block-size`, `min-inline-size` changes the pattern from its documented layout responsibility back toward ordinary flow or an unsafe fixed arrangement.

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

Use `split_screen` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.

## IA Navigation

Parent: [Split / Sidebar patterns](index.md) in [Pattern Categories](../index.md).
Next: [Layout Recipes](../../recipes/index.md) for screen-level composition, or return to the [Layout Pattern Catalog](../../CATALOG.md) when choosing another primitive.
