---
type: Layout Recipe
title: List Detail
description: Compose an explorable list beside its selected detail region.
screen_type: List detail
primary_user_task: Browse a collection and inspect one selected item.
spatial_model: Peer list and detail regions with explicit scroll ownership.
---

# List Detail

## Recommended Pattern Stack

- [list-detail](../patterns/split-sidebar/list-detail.md)
- [scroll-body-shell](../patterns/viewport-shell/scroll-body-shell.md)
- [stack](../patterns/stacking/stack.md)

## DOM And Source Order

Place list controls before list results. Place detail content after the list in DOM order unless the detail is the primary task entry point.

## Scroll Ownership

Name whether the list, the detail region, or the page body owns scrolling. Avoid making both list and detail scroll independently unless the task requires side-by-side comparison.

## Responsive Behavior

At narrow widths, the list and detail regions should stack in a predictable order. Preserve focus return behavior when selecting an item changes the detail region.

## Constraints And Change Points

Set a minimum list width and a dominant detail width. Make shell height explicit when scroll ownership is internal to the viewport.

## When Not To Use

Do not use this recipe when the detail page is a full navigation destination. Use ordinary page navigation and a [content-limiter](../patterns/containment/content-limiter.md) instead.

## Related Patterns

- [supporting-pane](../patterns/split-sidebar/supporting-pane.md)
- [fixed-sidenav-shell](../patterns/viewport-shell/fixed-sidenav-shell.md)

## IA Navigation

Parent: [Layout Recipes](index.md).
Next: [Quality And Findability](../quality/index.md) for route checks, or [Layout Pattern Catalog](../CATALOG.md) when replacing a primitive.
