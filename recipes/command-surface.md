---
type: Layout Recipe
title: Command Surface
description: Compose a tool-heavy shell with stable command and content regions.
screen_type: Command surface
primary_user_task: Repeatedly execute commands while inspecting or editing content.
spatial_model: Stable shell regions with wrapping or scrolling command rows.
---

# Command Surface

## Recommended Pattern Stack

- [scroll-body-shell](../patterns/viewport-shell/scroll-body-shell.md)
- [split-nav](../patterns/in-line-grouping/split-nav.md)
- [wrap-row](../patterns/in-line-grouping/wrap-row.md)

## DOM And Source Order

Place primary commands before secondary command groups when they operate on the same surface. Keep command labels and controlled regions connected by accessible names or headings.

## Scroll Ownership

The shell body owns content scrolling. Command rows should wrap when possible; use [reel](../patterns/in-line-grouping/reel.md) only when horizontal scanning is part of the interaction model.

## Responsive Behavior

At narrow widths, command groups should wrap into stable rows or move into a declared overflow region. Do not let command text resize the shell.

## Constraints And Change Points

Set explicit gaps for command groups and explicit shell height when the body scrolls internally. Keep fixed command regions outside the body scroll container.

## When Not To Use

Do not use this recipe for a simple content page with one or two actions. A [cluster](../patterns/in-line-grouping/cluster.md) inside normal document flow is enough.

## Related Patterns

- [reel](../patterns/in-line-grouping/reel.md)
- [panel-layout](../patterns/viewport-shell/panel-layout.md)

## IA Navigation

Parent: [Layout Recipes](index.md).
Next: [Quality And Findability](../quality/index.md) for route checks, or [Layout Pattern Catalog](../CATALOG.md) when replacing a primitive.
