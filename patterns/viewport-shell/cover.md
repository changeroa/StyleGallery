---
type: Layout Pattern
name: cover
title: cover
category: Viewport / Shell
description: Keep a central region balanced between optional header and footer.
primary_spatial_problem: Keep a central region balanced between optional header and footer.
secondary_spatial_problems: none
layout_axis: block
content_shape: mixed
responsiveness: fluid
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: No internal scroll container.
source_lineage: https://every-layout.dev/layouts/
---

# cover

## When To Use

Use this pattern when you need to keep a central region balanced between optional header and footer.

## HTML

```html
<section class="cover" aria-labelledby="cover-title">
    <header><p>Step 2 of 4</p></header>
    <main><h1 id="cover-title">Choose a billing profile</h1></main>
    <footer><button>Continue</button></footer>
</section>
```

## CSS

```css
.cover {
    display: grid;
    gap: 1rem;
    grid-template-rows: auto 1fr auto;
    min-block-size: 100dvh;
    padding: 1rem;
}
```

## Core Properties

- `display`, `gap`, `grid-template-rows`, `min-block-size`, `padding` define the spatial behavior for this pattern.

## Properties That Break The Layout If Removed

- Removing `display`, `gap`, `grid-template-rows`, `min-block-size`, `padding` changes the pattern from its documented layout responsibility back toward ordinary flow or an unsafe fixed arrangement.

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

Use `cover` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.

## IA Navigation

Parent: [Viewport / Shell patterns](index.md) in [Pattern Categories](../index.md).
Next: [Layout Recipes](../../recipes/index.md) for screen-level composition, or return to the [Layout Pattern Catalog](../../CATALOG.md) when choosing another primitive.
