---
type: Planning Guide
title: Layout Decision Tree
description: Question-driven route from screen constraints to StyleGallery Layout patterns and recipes.
aliases: ["choose a layout pattern","which pattern","레이아웃 패턴 고르기","패턴 선택"]
questions: ["Which layout pattern should I use for this screen?"]
---

# Layout Decision Tree

Use this when the pattern name is not obvious yet.

## Before Adding A Pattern

Add a new pattern only when the spatial responsibility is not already covered by an existing pattern or recipe.

- If the problem is composition, update or add a recipe.
- If the problem is visual treatment, keep it outside reusable pattern CSS.
- If the problem is repeated layout failure, document the smallest reusable pattern that prevents it.
- If scroll, sizing, or wrapping ownership is unclear, clarify ownership before writing CSS.

Examples:

- Settings page with side navigation, readable form width, and action rows: recipe composition, not one large pattern.
- Premium card treatment with shadows, color accents, and larger headings: product styling, not reusable pattern CSS.
- Repeated action row that wraps badly across screens: candidate pattern if the wrapping responsibility is not covered by `cluster` or `wrap-row`.

Code-level distinction:

```html
<div class="action_row">
    <button type="button">Save changes</button>
    <button type="button">Preview</button>
    <button type="button">Discard draft</button>
</div>
```

```css
.action_row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--action-gap);
}
```

This can be a reusable layout pattern only if the wrapping responsibility is not already covered by an existing pattern. Button colors, borders, shadows, and typography belong to the consuming product or demo layer.

Viewport versus container-local example:

```css
/* Avoid for component-local layout: the parent container may be narrower than the viewport. */
@media (min-width: 48rem) {
    .action_row {
        flex-wrap: nowrap;
    }
}
```

```css
/* Prefer when the component should respond to its own available space. */
.action_region {
    container-type: inline-size;
}

@container (min-width: 32rem) {
    .action_row {
        flex-wrap: nowrap;
    }
}
```

## Start With Scope

### Is the layout controlled by the viewport?

Choose a viewport or shell pattern when the whole page frame matters.

- Header, footer, side navigation, or utility panels frame the page: [Viewport / Shell patterns](../patterns/viewport-shell/index.md)
- Only one body region should scroll: [scroll-body-shell](../patterns/viewport-shell/scroll-body-shell.md)
- Side navigation should stay stable while the main region scrolls: [fixed-sidenav-shell](../patterns/viewport-shell/fixed-sidenav-shell.md)

Related recipes:

- [SaaS settings](../recipes/saas-settings.md)
- [Command surface](../recipes/command-surface.md)

### Is the layout local to a component or section?

Choose a local pattern when the component should adapt inside whatever parent owns it.

- Items stack vertically with consistent rhythm: [stack](../patterns/stacking/stack.md)
- Actions wrap in a row: [cluster](../patterns/in-line-grouping/cluster.md) or [wrap-row](../patterns/in-line-grouping/wrap-row.md)
- A region needs readable width constraints: [content-limiter](../patterns/containment/content-limiter.md)

## Identify Content Shape

### Is content repeated?

- Cards, tiles, metrics, or repeated panels: [Grid / Repetition patterns](../patterns/grid-repetition/index.md)
- Unknown number of columns based on available space: [ram-grid](../patterns/grid-repetition/ram-grid.md)
- Rows and columns should align: [card-grid](../patterns/grid-repetition/card-grid.md)

Related recipe:

- [Dashboard](../recipes/dashboard.md)

### Is there primary and supporting content?

- Supporting content should sit beside primary content when space allows: [sidebar](../patterns/split-sidebar/sidebar.md)
- List and detail regions are peers: [list-detail](../patterns/split-sidebar/list-detail.md)
- Supporting content should stay visible during long reading: [sticky-aside](../patterns/split-sidebar/sticky-aside.md)

Related recipes:

- [Article page](../recipes/article-page.md)
- [List detail](../recipes/list-detail.md)

### Is the layout mostly one flow?

- Prose or form content needs readable width: [content-limiter](../patterns/containment/content-limiter.md)
- Groups need vertical rhythm: [stack](../patterns/stacking/stack.md)
- Footer actions should stay reachable: [sticky-footer](../patterns/viewport-shell/sticky-footer.md)

Related recipe:

- [Form flow](../recipes/form-flow.md)

## Decide Scroll Ownership

Ask what scrolls before selecting fixed or sticky patterns.

- The document scrolls normally: use local composition patterns first.
- A single page body scrolls inside fixed shell regions: [scroll-body-shell](../patterns/viewport-shell/scroll-body-shell.md)
- A horizontal row should scroll instead of wrapping: [reel](../patterns/in-line-grouping/reel.md)
- Sticky content follows document scroll: [sticky-aside](../patterns/split-sidebar/sticky-aside.md)

Avoid multiple nested scroll containers unless each one has a named responsibility.

## Check Media And Exceptions

- Media should preserve aspect ratio: [frame](../patterns/media-fit/frame.md)
- Icons need a stable square slot: [icon-frame](../patterns/media-fit/icon-frame.md)
- Overlay should not change document order: [imposter](../patterns/overlay-exception/imposter.md)
- Regions intentionally occupy the same grid cell: [overlay-stack](../patterns/overlay-exception/overlay-stack.md)

## Rejected Alternatives

Rejected alternatives:

- Record any recipe or pattern rejected because it weakens source order, focus order, scroll ownership, constraints, or content stress behavior.
- Keep the reason in the [Layout brief](layout-brief.md) so the rejected option is visible during harmony evaluation and implementation handoff.
