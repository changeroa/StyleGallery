# Layout

The Layout domain owns minimal, portable CSS layout patterns and their planning, composition, constraint, scroll-ownership, and verification contracts. Its canonical content remains at the existing repository paths.

## Scope Boundary

In scope: semantic spatial structure, flow, sizing, alignment, containment, scrolling, ratios, and layout composition.

Out of scope: product motion, brand, typography, color, shadow, decorative treatment, and platform imitation.

## Routes

- Start with the [Layout Planning Guide](../GUIDE.md) when the spatial problem is not yet clear.
- Use the [Layout Decision Tree](../guides/decision-tree.md) when the pattern name is unknown.
- Browse the [Layout Pattern Catalog](../CATALOG.md) when the problem or name is known.
- Compose full screens with [Layout Recipes](../recipes/index.md).
- Review claims through [Quality Gates](../quality/index.md).

## Layout Domain Principles

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

The generated [Pattern Categories](../patterns/index.md) index is the category inventory.

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

## Stable Path Contract

`GUIDE.md`, `guides/*.md`, `recipes/*.md`, `patterns/**/*.md`, `CATALOG.md`, and `quality/**/*.md` remain at their existing paths. This hub is a domain-local route, not a migration or duplicate source of truth.

## IA Navigation

Parent: [StyleGallery](../index.md).
Next: [Motion](../motion/index.md).
