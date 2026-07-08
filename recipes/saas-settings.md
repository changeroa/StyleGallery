---
type: Layout Recipe
title: SaaS Settings
description: Compose a fixed side navigation with a constrained settings flow.
screen_type: SaaS settings
primary_user_task: Review and edit account or workspace settings.
spatial_model: Fixed navigation plus constrained primary content.
---

# SaaS Settings

## Recommended Pattern Stack

- [fixed-sidenav-shell](../patterns/viewport-shell/fixed-sidenav-shell.md)
- [content-limiter](../patterns/containment/content-limiter.md)
- [stack](../patterns/stacking/stack.md)

## DOM And Source Order

Place the navigation before the main settings region when it is the first meaningful wayfinding element. Keep each settings section as a semantic section with its own heading.

## Scroll Ownership

The main region owns vertical scrolling. The side navigation remains stable. Avoid adding independent scrolling to individual settings groups unless a group has a named overflow responsibility.

## Responsive Behavior

At narrow widths, navigation may become an inline region above the main content. Preserve source order and avoid visually reordering sections ahead of their headings.

## Constraints And Change Points

Use a content width token for the settings column and a gutter token for shell spacing. Keep fixed navigation width explicit so the main scroll region has a predictable inline size.

## When Not To Use

Do not use this recipe for a short one-page preference form where document flow and a simple [content-limiter](../patterns/containment/content-limiter.md) are enough.

## Related Patterns

- [scroll-body-shell](../patterns/viewport-shell/scroll-body-shell.md)
- [supporting-pane](../patterns/split-sidebar/supporting-pane.md)

## IA Navigation

Parent: [Layout Recipes](index.md).
Next: [Quality And Findability](../quality/index.md) for route checks, or [Layout Pattern Catalog](../CATALOG.md) when replacing a primitive.
