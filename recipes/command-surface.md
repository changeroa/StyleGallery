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

## Accessibility Checklist

- Source order: Put primary commands before secondary commands and before the content region they affect when the command is the task entry point.
- Focus expectation: Keyboard focus must reach every command, preserve visible focus, and return to the edited or inspected content after command execution when appropriate.
- Scroll expectation: Keep fixed command regions outside the body scroll container; if command groups overflow horizontally, provide a named scroll model and keyboard path.
- Semantic risk: Icon-only or compact commands need accessible names, state, and grouping before layout classes compress them.
- Cognitive risk: Tool-heavy surfaces increase recognition and mode burden; keep command grouping stable and avoid moving commands between breakpoints without a documented overflow model.
- Verification method: Pair `automated` accessible-name checks with `manual` keyboard traversal, focus-return, and mode-state review; reserve `debt` for commands that intentionally require later assistive-technology testing.

## Responsive Behavior

At narrow widths, command groups should wrap into stable rows or move into a declared overflow region. Do not let command text resize the shell.

## Constraints And Change Points

Set explicit gaps for command groups and explicit shell height when the body scrolls internally. Keep fixed command regions outside the body scroll container.

## When Not To Use

Do not use this recipe for a simple content page with one or two actions. A [cluster](../patterns/in-line-grouping/cluster.md) inside normal document flow is enough.

## Related Patterns

- [reel](../patterns/in-line-grouping/reel.md)
- [panel-layout](../patterns/viewport-shell/panel-layout.md)
