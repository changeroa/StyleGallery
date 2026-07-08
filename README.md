---
type: Repository Guide
title: layout-gallery
description: Principles and authoring policy for the layout pattern library.
---

# layout-gallery

`layout-gallery` is a gallery of minimal, portable CSS layout patterns.

Primary role: repository guide.

Each pattern documents one primary spatial problem and the smallest robust HTML/CSS structure that solves it. The gallery is not a visual design system: reusable pattern CSS should stabilize structure, flow, sizing, alignment, spacing, scrolling, ratio, and containment while leaving brand, typography, color, shadow, animation, and decoration outside the core pattern.

## Repository Entry Roles

Use each root hub for one primary job.

| Entry | Primary role | Use when |
| --- | --- | --- |
| [README](README.md) | Repository guide | You need the library purpose, policies, and task routes. |
| [OKF index](index.md) | OKF bundle map | You need a compact knowledge-bundle table of contents. |
| [Layout Planning Guide](GUIDE.md) | Planning workflow | You need to classify a screen before choosing patterns. |
| [Layout Pattern Catalog](CATALOG.md) | Pattern lookup | You already know the spatial problem or pattern name. |

## Task Routes

Each common task has one primary route. Use secondary links only after the primary route answers the first decision.

| Task | Primary route | Why |
| --- | --- | --- |
| `plan a screen before the layout problem is obvious` | [Layout Planning Guide](GUIDE.md) | It sequences task, content, scroll, recipe, and verification choices. |
| `choose a pattern when the name is unknown` | [Decision Tree](guides/decision-tree.md) | It routes from constraints to pattern categories. |
| `fill in requirements before selecting a pattern stack` | [Layout Brief Template](guides/layout-brief.md) | It captures content, constraints, and verification inputs. |
| `compose a full screen from primitives` | [Layout Recipes](recipes/index.md) | Recipes map screen models to pattern stacks. |
| `choose a settings layout` | [SaaS Settings Recipe](recipes/saas-settings.md) | It is the primary route for stable settings navigation and constrained content. |
| `choose a dashboard layout` | [Dashboard Recipe](recipes/dashboard.md) | It is the primary route for repeated panels and scan paths. |
| `choose an article layout` | [Article Page Recipe](recipes/article-page.md) | It is the primary route for readable prose plus supporting material. |
| `choose a list-detail layout` | [List Detail Recipe](recipes/list-detail.md) | It is the primary route for browse-and-inspect workflows. |
| `look up a known layout primitive` | [Layout Pattern Catalog](CATALOG.md) | It is the generated pattern lookup surface. |
| `browse pattern categories` | [Pattern Categories](patterns/index.md) | It groups generated patterns by spatial family. |
| `run findability QA` | [Tree-Test Findability QA](quality/index.md#tree-test-findability-qa) | It tests whether task routes are discoverable, not just linked. |

## Link Policy

- Navigation links move a reader to the next decision point in the repository. Root hubs, indexes, parent links, and next-step links are navigation links.
- Citation links identify source lineage or evidence boundaries. They support a claim but should not be the only way to continue a task.
- Dependency links identify generated, validation, or composition relationships. They explain what must stay in sync, such as `scripts/pattern-data.mjs`, generated pattern files, catalog entries, and validator fixtures.

## How To Use This Repository

- Start with [Layout Planning Guide](GUIDE.md) when you are designing a screen before a layout problem is obvious.
- Use the [Decision Tree](guides/decision-tree.md) when you do not know the pattern name yet.
- Fill out the [Layout Brief Template](guides/layout-brief.md) before choosing a pattern stack.
- Use [Layout Recipes](recipes/index.md) when you need screen-level composition.
- Use [Layout Pattern Catalog](CATALOG.md) when you already know the spatial problem.
- Use [Quality And Findability](quality/index.md) when checking repository routes and leaf navigation.

## Principles

1. Layout problems only
   - Patterns exist to solve spatial problems, not to define a visual brand.
   - Core CSS should stay focused on layout responsibilities.

2. Semantic structure first
   - Start with meaningful HTML before adding layout classes.
   - Class names explain layout responsibility, but they do not replace landmarks, headings, lists, buttons, links, or form controls.
   - DOM order, reading order, and focus order should remain logical.

3. One primary spatial problem
   - Each pattern should optimize one primary spatial problem.
   - Secondary behavior is allowed when it is incidental or required for composition.
   - If a pattern has multiple primary problems, split it into smaller primitives or mark it as a shell/composite.

4. Minimum robust CSS
   - Use the smallest set of declarations that keeps the pattern stable under real content and container constraints.
   - Minimal does not mean fragile; constraints, overflow rules, intrinsic sizing, and fallbacks are valid when they carry declared responsibility.

5. Portable plain HTML/CSS
   - Plain HTML and CSS are the source of truth.
   - Framework-specific versions are optional derivatives, not canonical patterns.

6. Explicit constraints and change points
   - Widths, heights, gaps, breakpoints, scroll containers, fixed/sticky anchors, and other constraints should be easy to find.
   - Values users are expected to tune should be surfaced clearly.

7. Named scroll ownership
   - If a pattern scrolls, the scrolling element must be obvious.
   - The pattern should make clear what scrolls, what stays fixed, and where height is determined.

8. No decorative debt
   - Decorative styling does not belong in reusable pattern CSS unless it is required to explain layout behavior.
   - Demo-only visual aids should be separate from the reusable pattern.

## CSS Authoring Policy

- Prefer low-specificity, single-class selectors.
- Avoid ID selectors for styling or layout naming.
- Avoid deep combinators, selector chaining, and nesting unless the pattern is specifically demonstrating that tradeoff.
- Use cascade layers when the CSS surface grows beyond isolated snippets.
- Keep CSS declarations in alphabetical order inside each rule.
- Prefer intrinsic sizing and content/container-driven adaptation.
- Use viewport breakpoints only when the spatial problem is viewport-level.
- Prefer container queries for component-local responsiveness.
- Prefer logical properties for spacing and sizing unless physical direction is required.
- Treat exceptions as explicit and local; use state hooks or `data-*` attributes for variants instead of escalating selector specificity.

## Class Naming Policy

Class names should read like a map of the layout structure.

- Name layout responsibility, not appearance.
- Make root-child, parent-child, area-element, and fixed-scroll relationships obvious.
- Prefer pattern-scoped names for related nodes.
- Avoid vague names like `container`, `wrapper`, `box`, `top`, `content`, and `bottom` unless the surrounding pattern name makes their responsibility unambiguous.
- Avoid DOM-depth names such as `card_header_title_icon`; describe stable roles instead.
- Do not use IDs for layout naming. IDs are reserved for JavaScript hooks or document-level targets when needed.

Prefer:

```html
<div class="app_shell">
    <header class="app_shell_header"></header>
    <main class="app_shell_scroll_area"></main>
    <footer class="app_shell_footer"></footer>
</div>
```

Avoid:

```html
<div class="container">
    <div class="top"></div>
    <div class="content"></div>
    <div class="bottom"></div>
</div>
```

## Value And Token Policy

- Tokenize reusable design intent, not every layout number.
- Use tokens for stable, shared values such as `content-width`, `gutter`, `stack-gap`, `section-gap`, or density steps.
- Keep browser/context mechanics in raw CSS: `auto`, percentages, `min-content`, `max-content`, `fit-content`, `clamp()`, viewport units, container-query units, and intrinsic sizing.
- Put tokens behind logical CSS, for example `padding-block: var(--space-4)`.
- Use breakpoint names for layout states, not device names.

## Pattern Contract

Use this shape when adding a new pattern:

```txt
Pattern name
Category
Primary spatial problem
Secondary spatial problems
When to use
HTML structure
CSS
Core properties
Properties that break the layout if removed
Constraints and change points
Scroll ownership
Accessibility and source-order notes
Browser/fallback notes
Composition notes
Anti-patterns
```

Suggested categories:

- Containment
- Centering
- Stacking
- In-line grouping
- Split / Sidebar
- Grid / Repetition
- Viewport / Shell
- Overlay / Exception
- Media / Fit
- Reveal / Density control

## Verification Matrix

Before accepting a pattern, verify the smallest relevant matrix:

- Viewports: `320px`, `375px`, `768px`, `1024px`, `1440px`
- Containers: tight, medium, roomy, and `100%` parent
- Content: empty, short, long label, long paragraph, unbroken string
- Direction: `ltr` and `rtl`
- Writing mode: default, plus vertical writing mode if the pattern claims support
- Interaction: default, hover, focus, active, expanded, scroll top/middle/bottom when relevant

Acceptance checks:

- The layout reflows without unusable two-dimensional scrolling.
- Long and empty content do not break alignment or hide essential content.
- Focus order remains logical and visible.
- Scrollable regions and sticky elements behave as declared.
- Screenshot diffs are reviewed when the pattern has visual fixtures.
