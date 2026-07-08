---
type: Catalog
title: Layout Pattern Catalog
description: Generated index of layout-gallery patterns.
---

# Layout Pattern Catalog

Primary role: pattern lookup.

Generated from `scripts/generate-patterns.mjs` and `scripts/pattern-data.mjs`.

## Planning Layer

- [Layout Planning Guide](GUIDE.md) - Pre-design entry point for choosing and composing patterns.
- [Decision Tree](guides/decision-tree.md) - Question-driven route from screen constraints to pattern categories.
- [Layout Brief](guides/layout-brief.md) - Questions to answer before selecting a pattern stack.
- [Layout Recipes](recipes/index.md) - Screen-level compositions built from reusable patterns.

## Patterns

- [stack](patterns/stacking/stack.md) - Stacking: Create consistent vertical rhythm between direct children.
- [box](patterns/containment/box.md) - Containment: Wrap content with predictable internal spacing.
- [center](patterns/centering/center.md) - Centering: Center a block while respecting a maximum measure.
- [cluster](patterns/in-line-grouping/cluster.md) - In-line grouping: Keep related items together while allowing wrapping.
- [content-limiter](patterns/containment/content-limiter.md) - Containment: Keep prose width readable inside fluid containers.
- [super-center](patterns/centering/super-center.md) - Centering: Center one region along both axes.
- [icon-frame](patterns/media-fit/icon-frame.md) - Media / Fit: Keep an icon aligned inside a fixed square slot.
- [frame](patterns/media-fit/frame.md) - Media / Fit: Preserve media aspect ratio in a responsive slot.
- [cover](patterns/viewport-shell/cover.md) - Viewport / Shell: Keep a central region balanced between optional header and footer.
- [sidebar](patterns/split-sidebar/sidebar.md) - Split / Sidebar: Let a narrow sidebar and wider content wrap when space is tight.
- [switcher](patterns/split-sidebar/switcher.md) - Split / Sidebar: Switch equal regions from row to stack without a viewport breakpoint.
- [media-object](patterns/split-sidebar/media-object.md) - Split / Sidebar: Align media and descriptive content as a stable pair.
- [split-nav](patterns/in-line-grouping/split-nav.md) - In-line grouping: Separate primary and secondary nav actions in one row.
- [holy-grail](patterns/viewport-shell/holy-grail.md) - Viewport / Shell: Place header, footer, sidebars, and main content in a resilient shell.
- [sticky-footer](patterns/viewport-shell/sticky-footer.md) - Viewport / Shell: Keep footer at the bottom when content is short.
- [sticky-header](patterns/viewport-shell/sticky-header.md) - Viewport / Shell: Keep a header visible above a scrolling content region.
- [scroll-body-shell](patterns/viewport-shell/scroll-body-shell.md) - Viewport / Shell: Keep shell regions fixed while only the body scrolls.
- [fixed-sidenav-shell](patterns/viewport-shell/fixed-sidenav-shell.md) - Viewport / Shell: Keep side navigation stable while main content scrolls.
- [sticky-aside](patterns/split-sidebar/sticky-aside.md) - Split / Sidebar: Keep related aside content visible during long reads.
- [ram-grid](patterns/grid-repetition/ram-grid.md) - Grid / Repetition: Repeat items into as many useful columns as space allows.
- [card-grid](patterns/grid-repetition/card-grid.md) - Grid / Repetition: Align repeating cards in rows and columns.
- [twelve-span-grid](patterns/grid-repetition/twelve-span-grid.md) - Grid / Repetition: Provide a twelve-column placement scaffold.
- [page-grid](patterns/grid-repetition/page-grid.md) - Grid / Repetition: Align page content to margins, gutters, and a central track.
- [grid-wrapper](patterns/grid-repetition/grid-wrapper.md) - Grid / Repetition: Center grid tracks while allowing full-width breakout tracks.
- [columns](patterns/grid-repetition/columns.md) - Grid / Repetition: Flow long content into balanced text columns.
- [deconstructed-pancake](patterns/in-line-grouping/deconstructed-pancake.md) - In-line grouping: Let equal cards stretch in a row and stack naturally when narrow.
- [line-up](patterns/stacking/line-up.md) - Stacking: Keep card footer actions aligned at the bottom.
- [clamped-card](patterns/containment/clamped-card.md) - Containment: Constrain a card to a readable fluid width.
- [fluid-styles](patterns/containment/fluid-styles.md) - Containment: Let a region fill available width without exceeding a readable max.
- [split-screen](patterns/split-sidebar/split-screen.md) - Split / Sidebar: Split a viewport or region into two balanced panes.
- [list-detail](patterns/split-sidebar/list-detail.md) - Split / Sidebar: Place an explorable list beside its detail region.
- [supporting-pane](patterns/split-sidebar/supporting-pane.md) - Split / Sidebar: Keep supplemental information beside a primary task.
- [feed](patterns/stacking/feed.md) - Stacking: Stack repeated content items with stable rhythm.
- [breadcrumb](patterns/in-line-grouping/breadcrumb.md) - In-line grouping: Lay out hierarchy links compactly with wrapping.
- [pagination](patterns/in-line-grouping/pagination.md) - In-line grouping: Lay out page controls as a bounded wrapping row.
- [badge-list](patterns/in-line-grouping/badge-list.md) - In-line grouping: Align item labels with trailing counts.
- [step-nav](patterns/stacking/step-nav.md) - Stacking: Present sequential steps with consistent vertical rhythm.
- [tab-strip](patterns/in-line-grouping/tab-strip.md) - In-line grouping: Keep peer tabs in one stable row that can wrap.
- [reel](patterns/in-line-grouping/reel.md) - In-line grouping: Let a row scroll horizontally instead of wrapping.
- [imposter](patterns/overlay-exception/imposter.md) - Overlay / Exception: Place an overlay region over a parent without changing document order.
- [panel-layout](patterns/viewport-shell/panel-layout.md) - Viewport / Shell: Create predictable main and utility panels.
- [overlay-stack](patterns/overlay-exception/overlay-stack.md) - Overlay / Exception: Stack several regions into the same grid cell.
- [wrap-row](patterns/in-line-grouping/wrap-row.md) - In-line grouping: Wrap controls into rows with stable gaps.
- [dense-grid](patterns/grid-repetition/dense-grid.md) - Grid / Repetition: Fill a compact grid with repeated small items.
- [masonry-approx](patterns/grid-repetition/masonry-approx.md) - Grid / Repetition: Approximate staggered content with columns when exact row alignment is not needed.
- [main-with-rail](patterns/split-sidebar/main-with-rail.md) - Split / Sidebar: Keep primary content dominant with a narrow secondary rail.
