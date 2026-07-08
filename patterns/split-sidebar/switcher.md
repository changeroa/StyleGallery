---
type: Layout Pattern
name: switcher
title: switcher
category: Split / Sidebar
description: Switch equal regions from row to stack without a viewport breakpoint.
primary_spatial_problem: Switch equal regions from row to stack without a viewport breakpoint.
secondary_spatial_problems: none
layout_axis: inline
content_shape: mixed
responsiveness: wrap
constraints: Uses only local class hooks and explicit layout constraints.
scroll_ownership: No internal scroll container.
source_lineage: https://every-layout.dev/layouts/
---

# switcher

## When To Use

Use this pattern when you need to switch equal regions from row to stack without a viewport breakpoint.

## HTML

```html
<section class="switcher" aria-label="Pricing tiers">
    <article class="switcher_item">Starter plan</article>
    <article class="switcher_item">Team plan</article>
    <article class="switcher_item">Enterprise plan</article>
</section>
```

## CSS

```css
.switcher {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
}

.switcher_item {
    flex-basis: calc((40rem - 100%) * 999);
    flex-grow: 1;
}
```

## Core Properties

- `display`, `flex-wrap`, `gap`, `flex-basis`, `flex-grow` define the spatial behavior for this pattern.

## Properties That Break The Layout If Removed

- Removing `display`, `flex-wrap`, `gap`, `flex-basis`, `flex-grow` changes the pattern from its documented layout responsibility back toward ordinary flow or an unsafe fixed arrangement.

## Constraints And Change Points

- wrap responsiveness is part of the contract; change sizing values only when the new minimum, maximum, or wrap point is documented with the pattern.
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

Use `switcher` as the stable pattern root and compose additional layout behavior outside that root unless the child class is part of the documented relationship.

## Anti-patterns

- Do not add color, border, shadow, typography, or animation rules to reusable pattern CSS.
- Do not use this pattern to repair unclear HTML structure; make the DOM roles legible first.
