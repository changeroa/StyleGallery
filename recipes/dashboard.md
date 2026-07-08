---
type: Layout Recipe
title: Dashboard
description: Compose repeated panels and action clusters on a page grid.
screen_type: Dashboard
primary_user_task: Scan and compare repeated status, metric, or workflow panels.
spatial_model: Page grid containing repeated local grids and action groups.
---

# Dashboard

## Recommended Pattern Stack

- [page-grid](../patterns/grid-repetition/page-grid.md)
- [card-grid](../patterns/grid-repetition/card-grid.md)
- [cluster](../patterns/in-line-grouping/cluster.md)

## DOM And Source Order

Order panels by decision priority, not by visual symmetry. Headings and filters should precede the regions they control.

## Scroll Ownership

Prefer normal document scrolling. Introduce internal scroll containers only for panels whose independent scroll state is part of the task.

## Responsive Behavior

Let repeated panels reflow through grid constraints before adding viewport breakpoints. Action clusters should wrap before they overflow.

## Constraints And Change Points

Make page gutters, panel gaps, and minimum panel widths explicit. Avoid hiding a panel's overflow unless the panel has a declared fixed block size.

## When Not To Use

Do not use this recipe for a single focused workflow. A [form flow](form-flow.md) or [content-limiter](../patterns/containment/content-limiter.md) is usually clearer.

## Related Patterns

- [ram-grid](../patterns/grid-repetition/ram-grid.md)
- [dense-grid](../patterns/grid-repetition/dense-grid.md)
- [wrap-row](../patterns/in-line-grouping/wrap-row.md)

## IA Navigation

Parent: [Layout Recipes](index.md).
Next: [Quality And Findability](../quality/index.md) for route checks, or [Layout Pattern Catalog](../CATALOG.md) when replacing a primitive.
