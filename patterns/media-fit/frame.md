---
type: Layout Pattern
name: frame
title: frame
category: Media / Fit
description: Preserve media aspect ratio in a responsive slot.
primary_spatial_problem: Preserve media aspect ratio in a responsive slot.
secondary_spatial_problems: none
layout_axis: both
content_shape: mixed
responsiveness: fluid
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: No internal scroll container.
source_lineage: https://every-layout.dev/layouts/
---

# frame

## When To Use

Use this pattern when you need to preserve media aspect ratio in a responsive slot.

## HTML

```html
<figure class="frame">
    <img alt="Product walkthrough still" class="frame_media">
</figure>
```

## CSS

```css
.frame {
    aspect-ratio: 16 / 9;
    display: grid;
    inline-size: 100%;
    overflow: clip;
}

.frame_media {
    block-size: 100%;
    inline-size: 100%;
    min-block-size: 0;
    min-inline-size: 0;
    object-fit: cover;
}
```

## Core Properties

- `aspect-ratio`, `display`, `inline-size`, `overflow`, `block-size`, `min-block-size`, `min-inline-size`, `object-fit` define the spatial behavior for this pattern.

## Properties That Break The Layout If Removed

- Removing `aspect-ratio`, `display`, `inline-size`, `overflow`, `block-size`, `min-block-size`, `min-inline-size`, `object-fit` changes the pattern from its documented layout responsibility back toward ordinary flow or an unsafe fixed arrangement.

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

Use `frame` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.

## IA Navigation

Parent: [Media / Fit patterns](index.md) in [Pattern Categories](../index.md).
Next: [Layout Recipes](../../recipes/index.md) for screen-level composition, or return to the [Layout Pattern Catalog](../../CATALOG.md) when choosing another primitive.
