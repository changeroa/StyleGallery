---
type: Layout Pattern
name: sticky-header
title: sticky-header
category: Viewport / Shell
description: Keep a header visible above a scrolling content region.
primary_spatial_problem: Keep a header visible above a scrolling content region.
secondary_spatial_problems: none
layout_axis: block
content_shape: mixed
responsiveness: fluid
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: No internal scroll container.
source_lineage: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position
---

# sticky-header

## When To Use

Use this pattern when you need to keep a header visible above a scrolling content region.

## HTML

```html
<header class="sticky_header">
    <nav aria-label="Repository"><a href="#">Code</a><a href="#">Issues</a><a href="#">Pull requests</a></nav>
</header>
```

## CSS

```css
.sticky_header {
    inset-block-start: 0;
    position: sticky;
    z-index: 1;
}
```

## Core Properties

- `inset-block-start`, `position`, `z-index` define the spatial behavior for this pattern.

## Properties That Break The Layout If Removed

- Removing `inset-block-start`, `position`, `z-index` changes the pattern from its documented layout responsibility back toward ordinary flow or an unsafe fixed arrangement.

## Constraints And Change Points

- fluid responsiveness is part of the contract; change sizing values only when the new minimum, maximum, or wrap point is documented with the pattern.
- Keep the HTML class hooks and CSS selectors in one-to-one agreement.

## Scroll Ownership

No internal scroll container.

## Accessibility And Source Order Notes

- Semantic role expectation: Preserve the HTML sample's landmark, list, navigation, form, figure, or article roles; layout classes must not replace semantic elements.
- DOM order expectation: Keep semantic elements, DOM order, reading order, and focus order independent from the visual placement created by the layout classes.
- Focus risk: Any interactive descendants follow DOM order; do not use this pattern to create a visual order that keyboard focus cannot follow.
- Scroll expectation: No internal scroll container.
- Cognitive risk: Low: the pattern should preserve ordinary reading flow when semantic order is already correct.

## Browser And Fallback Notes

The CSS uses modern grid, flex, intrinsic sizing, logical properties, or positioning. If a target browser cannot support a property, fall back to ordinary block flow before adding decorative or script-driven layout behavior.

## Composition Notes

Use `sticky_header` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.
