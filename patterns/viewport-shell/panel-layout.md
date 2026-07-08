---
type: Layout Pattern
name: panel-layout
title: panel-layout
category: Viewport / Shell
description: Create predictable main and utility panels.
primary_spatial_problem: Create predictable main and utility panels.
secondary_spatial_problems: none
layout_axis: inline
content_shape: mixed
responsiveness: reflow
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: No internal scroll container.
source_lineage: https://carbondesignsystem.com/elements/2x-grid/overview/
---

# panel-layout

## When To Use

Use this pattern when you need to create predictable main and utility panels.

## HTML

```html
<section class="panel_layout" aria-label="Console workspace">
    <main class="panel_layout_main">Query editor</main>
    <aside class="panel_layout_side">Execution history</aside>
</section>
```

## CSS

```css
.panel_layout {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(min(22rem, 100%), 1fr));
}

.panel_layout_main {
    min-inline-size: 0;
}

.panel_layout_side {
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

Use `panel_layout` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.

## IA Navigation

Parent: [Viewport / Shell patterns](index.md) in [Pattern Categories](../index.md).
Next: [Layout Recipes](../../recipes/index.md) for screen-level composition, or return to the [Layout Pattern Catalog](../../CATALOG.md) when choosing another primitive.
