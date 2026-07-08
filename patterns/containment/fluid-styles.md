---
type: Layout Pattern
name: fluid-styles
title: fluid-styles
category: Containment
description: Let a region fill available width without exceeding a readable max.
primary_spatial_problem: Let a region fill available width without exceeding a readable max.
secondary_spatial_problems: none
layout_axis: inline
content_shape: mixed
responsiveness: fluid
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: No internal scroll container.
source_lineage: https://carbondesignsystem.com/elements/2x-grid/overview/
---

# fluid-styles

## When To Use

Use this pattern when you need to let a region fill available width without exceeding a readable max.

## HTML

```html
<section class="fluid_styles" aria-labelledby="fluid-title">
    <h2 id="fluid-title">Operations overview</h2>
    <p>The region fills the parent without exceeding the shared page measure.</p>
</section>
```

## CSS

```css
.fluid_styles {
    inline-size: min(100%, 72rem);
    margin-inline: auto;
}
```

## Core Properties

- `inline-size`, `margin-inline` define the spatial behavior for this pattern.

## Properties That Break The Layout If Removed

- Removing `inline-size`, `margin-inline` changes the pattern from its documented layout responsibility back toward ordinary flow or an unsafe fixed arrangement.

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

Use `fluid_styles` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.

## IA Navigation

Parent: [Containment patterns](index.md) in [Pattern Categories](../index.md).
Next: [Layout Recipes](../../recipes/index.md) for screen-level composition, or return to the [Layout Pattern Catalog](../../CATALOG.md) when choosing another primitive.
