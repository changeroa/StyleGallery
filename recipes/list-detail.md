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

## Accessibility Checklist

- Source order: Put list controls before list results, then the selected detail, unless the detail is the primary entry point for the task.
- Focus expectation: Selecting a list item must either keep focus on the selected item with the detail announced by context, or move focus to the detail heading with a documented return path.
- Scroll expectation: If list and detail scroll independently, name both regions and verify keyboard users can reach and leave each scroll container.
- Semantic risk: The list, selected state, and detail region need roles, headings, or labels that expose their relationship before split-sidebar layout is applied.
- Cognitive risk: Users can lose context when selection changes the detail region; preserve selected state, count/position, and clear return behavior.
- Verification method: Use `automated` landmark/name checks, `manual` focus-return and scroll-container review, and `user` evidence for browse-and-compare task success claims.

## Responsive Behavior

At narrow widths, the list and detail regions should stack in a predictable order. Preserve focus return behavior when selecting an item changes the detail region.

## Constraints And Change Points

Set a minimum list width and a dominant detail width. Make shell height explicit when scroll ownership is internal to the viewport.

## When Not To Use

Do not use this recipe when the detail page is a full navigation destination. Use ordinary page navigation and a [content-limiter](../patterns/containment/content-limiter.md) instead.

## Related Patterns

- [supporting-pane](../patterns/split-sidebar/supporting-pane.md)
- [fixed-sidenav-shell](../patterns/viewport-shell/fixed-sidenav-shell.md)
