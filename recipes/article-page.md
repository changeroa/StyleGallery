---
type: Layout Recipe
title: Article Page
description: Compose readable prose with optional supporting aside content.
screen_type: Article page
primary_user_task: Read a long document while referencing supporting material.
spatial_model: Constrained reading column with nearby supplemental content.
---

# Article Page

## Recommended Pattern Stack

- [content-limiter](../patterns/containment/content-limiter.md)
- [sticky-aside](../patterns/split-sidebar/sticky-aside.md)
- [stack](../patterns/stacking/stack.md)

## DOM And Source Order

Place the article before supplemental aside content when the article is the primary reading path. Use headings to expose document structure before adding layout classes.

## Scroll Ownership

The document owns scrolling. The aside may become sticky, but it should not introduce an independent scroll container unless the aside content is longer than the viewport and has a declared overflow behavior.

## Responsive Behavior

At narrow widths, aside content should fall into document flow after the related article region. Keep references close to the content they support.

## Constraints And Change Points

Make the reading measure explicit through `max-inline-size`. Use section gaps for major article regions and stack gaps for local prose groups.

## When Not To Use

Do not use sticky aside behavior when supplemental content must be read in sequence as part of the main article.

## Related Patterns

- [sidebar](../patterns/split-sidebar/sidebar.md)
- [box](../patterns/containment/box.md)

## IA Navigation

Parent: [Layout Recipes](index.md).
Next: [Quality And Findability](../quality/index.md) for route checks, or [Layout Pattern Catalog](../CATALOG.md) when replacing a primitive.
