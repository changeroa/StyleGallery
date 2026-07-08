---
type: Layout Recipe
title: Form Flow
description: Compose sequential form content with constrained width and reachable actions.
screen_type: Form flow
primary_user_task: Complete a sequence of related inputs.
spatial_model: Single primary column with grouped fields and action placement.
---

# Form Flow

## Recommended Pattern Stack

- [content-limiter](../patterns/containment/content-limiter.md)
- [stack](../patterns/stacking/stack.md)
- [cluster](../patterns/in-line-grouping/cluster.md)

## DOM And Source Order

Keep labels, descriptions, fields, and errors adjacent in DOM order. Group related fields under semantic headings before adding layout classes.

## Scroll Ownership

Prefer document scrolling. If actions must remain visible, use a shell or footer pattern only after confirming it does not obscure validation messages or focus targets.

## Responsive Behavior

Field groups should stack naturally. Action groups should wrap before they overflow and should preserve a clear primary action position.

## Constraints And Change Points

Use readable inline constraints for the form body. Keep field gaps, group gaps, and action gaps separate so density can change without changing structure.

## When Not To Use

Do not use this recipe for a data-dense editor where users compare many fields at once. A dashboard or panel layout may be more appropriate.

## Related Patterns

- [sticky-footer](../patterns/viewport-shell/sticky-footer.md)
- [line-up](../patterns/stacking/line-up.md)

## IA Navigation

Parent: [Layout Recipes](index.md).
Next: [Quality And Findability](../quality/index.md) for route checks, or [Layout Pattern Catalog](../CATALOG.md) when replacing a primitive.
