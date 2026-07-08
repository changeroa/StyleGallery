---
type: Layout Pattern
name: main-with-rail
title: main-with-rail
category: Split / Sidebar
description: Keep primary content dominant with a narrow secondary rail.
primary_spatial_problem: Keep primary content dominant with a narrow secondary rail.
secondary_spatial_problems: none
layout_axis: inline
content_shape: mixed
responsiveness: reflow
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: No internal scroll container.
source_lineage: https://design-system.service.gov.uk/styles/layout/
---

# main-with-rail

## When To Use

Use this pattern when you need to keep primary content dominant with a narrow secondary rail.

## HTML

```html
<section class="main_with_rail" aria-label="Documentation page">
    <main class="main_with_rail_main">API reference article</main>
    <aside class="main_with_rail_side">On this page links</aside>
</section>
```

## CSS

```css
.main_with_rail {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
}

.main_with_rail_main {
    min-inline-size: 0;
}

.main_with_rail_side {
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

Use `main_with_rail` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.

## IA Navigation

Parent: [Split / Sidebar patterns](index.md) in [Pattern Categories](../index.md).
Next: [Layout Recipes](../../recipes/index.md) for screen-level composition, or return to the [Layout Pattern Catalog](../../CATALOG.md) when choosing another primitive.
