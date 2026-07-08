---
type: Layout Pattern
name: scroll-body-shell
title: scroll-body-shell
category: Viewport / Shell
description: Keep shell regions fixed while only the body scrolls.
primary_spatial_problem: Keep shell regions fixed while only the body scrolls.
secondary_spatial_problems: none
layout_axis: block
content_shape: mixed
responsiveness: fluid
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: Pattern owns the named scroll container.
source_lineage: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow
---

# scroll-body-shell

## When To Use

Use this pattern when you need to keep shell regions fixed while only the body scrolls.

## HTML

```html
<section class="scroll_body_shell" aria-label="Inbox">
    <header>Inbox filters</header>
    <main class="scroll_body_shell_body">Message list owns vertical scrolling</main>
    <footer>Selected message actions</footer>
</section>
```

## CSS

```css
.scroll_body_shell {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    max-block-size: 100dvh;
}

.scroll_body_shell_body {
    min-block-size: 0;
    overflow: auto;
}
```

## Core Properties

- `display`, `grid-template-rows`, `max-block-size`, `min-block-size`, `overflow` define the spatial behavior for this pattern.

## Properties That Break The Layout If Removed

- Removing `display`, `grid-template-rows`, `max-block-size`, `min-block-size`, `overflow` changes the pattern from its documented layout responsibility back toward ordinary flow or an unsafe fixed arrangement.

## Constraints And Change Points

- fluid responsiveness is part of the contract; change sizing values only when the new minimum, maximum, or wrap point is documented with the pattern.
- Keep the HTML class hooks and CSS selectors in one-to-one agreement.

## Scroll Ownership

Pattern owns the named scroll container.

## Accessibility And Source Order Notes

Keep semantic elements, DOM order, reading order, and focus order independent from the visual placement created by the layout classes.

## Browser And Fallback Notes

The CSS uses modern grid, flex, intrinsic sizing, logical properties, or positioning. If a target browser cannot support a property, fall back to ordinary block flow before adding decorative or script-driven layout behavior.

## Composition Notes

Use `scroll_body_shell` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.

## IA Navigation

Parent: [Viewport / Shell patterns](index.md) in [Pattern Categories](../index.md).
Next: [Layout Recipes](../../recipes/index.md) for screen-level composition, or return to the [Layout Pattern Catalog](../../CATALOG.md) when choosing another primitive.
