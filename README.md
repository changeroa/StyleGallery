---
type: Repository Guide
title: StyleGallery
description: Governed gallery of portable interface knowledge organized by domain.
---

# StyleGallery

StyleGallery is a governed gallery of portable interface knowledge. It separates reusable spatial patterns, product-layer motion guidance, design-engineering practice, and platform-specific references into explicit domains with different evidence and ownership boundaries.

Primary role: repository guide.

The existing Layout corpus remains a gallery of minimal, portable CSS layout patterns at its current paths. Each pattern documents one primary spatial problem and the smallest robust HTML/CSS structure that solves it. Motion, visual treatment, and platform guidance do not expand reusable Layout pattern CSS; they live in their own domains and carry explicit evidence boundaries.

[Consumer Reference](consumer-reference/index.md) is shared non-domain infrastructure for optional consumer-owned reference handoffs. It carries schema, routing, provenance, and evidence metadata without owning profiles, visual values, components, or a sixth domain.

## Domains

| Domain | Owns | Does not own |
| --- | --- | --- |
| [Layout](layout/index.md) | Semantic spatial structure, flow, sizing, alignment, containment, scrolling, and composition. | Brand, typography, color, shadow, animation, and product decoration. |
| [Motion](motion/index.md) | Motion terminology, review procedure, and evidence-bounded practice guidance. | Universal timing/easing rules or permission to add motion to reusable Layout CSS. |
| [Design Engineering](design-engineering/index.md) | Product-layer craft decisions and verification questions. | A second universal principle set or taste as evidence. |
| [Game UI](game-ui/index.md) | Game-interface classification, hierarchy, reference records, and engine-specific implementation guides. | Reusable Layout CSS or claims that one engine structure is universal. |
| [Platform Guides](platform-guides/index.md) | Bounded comparison with named platform conventions. | Affiliation, imitation, or authority over web and accessibility contracts. |

The canonical domain manifest and provenance policy are in [StyleGallery Domains](DOMAINS.md).

## Repository Entry Roles

Use each root hub for one primary job.

| Entry | Primary role | Use when |
| --- | --- | --- |
| [README](README.md) | Repository guide | You need the library purpose, policies, and task routes. |
| [OKF index](index.md) | OKF bundle map | You need a compact knowledge-bundle table of contents. |
| [Layout Planning Guide](GUIDE.md) | Planning workflow | You need to classify a screen before choosing patterns. |
| [Layout Pattern Catalog](CATALOG.md) | Pattern lookup | You already know the spatial problem or pattern name. |
| [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md) | Governance reference | You need the source of truth, lifecycle, generated-file, ownership, or stale-audit rule. |
| [StyleGallery Domains](DOMAINS.md) | Domain manifest | You need domain ownership, scope, lifecycle, page membership, or provenance. |
| [Consumer Reference](consumer-reference/index.md) | Shared infrastructure contract | You need to declare a consumer-owned record or explain why one is not applicable. |
| [Layout](layout/index.md) | Layout domain hub | You need reusable spatial patterns, recipes, or planning routes. |
| [Motion](motion/index.md) | Motion domain hub | You need motion terminology, review procedure, or practice evidence. |
| [Design Engineering](design-engineering/index.md) | Design Engineering domain hub | You need product-level interface-craft decision guidance. |
| [Game UI](game-ui/index.md) | Game UI domain hub | You need to classify a game interface or understand its screen hierarchy. |
| [Platform Guides](platform-guides/index.md) | Platform Guides domain hub | You need a bounded platform comparison. |

## Task Routes

Each common task has one primary route. Use secondary links only after the primary route answers the first decision.

| Task | Primary route | Why |
| --- | --- | --- |
| `choose a StyleGallery domain` | [StyleGallery Domains](DOMAINS.md) | It separates domain ownership before a reader applies domain-local guidance. |
| `browse reusable spatial guidance` | [Layout](layout/index.md) | It preserves the existing pattern, recipe, and planning routes. |
| `name or review interface motion` | [Motion](motion/index.md) | It routes to bounded terminology and review guidance. |
| `review product-level interface craft` | [Design Engineering](design-engineering/index.md) | It separates practitioner heuristics from shared quality gates. |
| `classify a game interface or map it to an engine` | [Game UI](game-ui/index.md) | It separates engine-neutral roles from implementation-specific guidance. |
| `compare a named platform convention` | [Platform Guides](platform-guides/index.md) | It requires platform and evidence boundaries before adaptation. |
| `turn raw content into a homepage or ordinary webpage` | [Webpage Generation Workflow](guides/webpage-generation-workflow.md) | It starts with use case, content-to-layout fit, harmony, and handoff. |
| `plan a screen before the layout problem is obvious` | [Layout Planning Guide](GUIDE.md) | It sequences task, content, scroll, recipe, and verification choices. |
| `choose a pattern when the name is unknown` | [Decision Tree](guides/decision-tree.md) | It routes from constraints to pattern categories. |
| `fill in requirements before selecting a pattern stack` | [Layout Brief Template](guides/layout-brief.md) | It captures content, constraints, and verification inputs. |
| `stabilize repository terminology` | [Controlled vocabulary](guides/vocabulary.md) | It defines canonical terms, aliases, deprecated terms, and scannability rules. |
| `compose a full screen from primitives` | [Layout Recipes](recipes/index.md) | Recipes map screen models to pattern stacks. |
| `inspect which primitives a recipe depends on` | [Primitive To Recipe Matrix](recipes/primitive-to-recipe-matrix.md) | It names essential, helper, and substitutable slots. |
| `look up a known layout primitive` | [Layout Pattern Catalog](CATALOG.md) | It is the generated pattern lookup surface. |
| `browse pattern categories` | [Pattern Categories](patterns/index.md) | It groups generated patterns by spatial family. |
| `check whether a layout or design claim is admissible` | [Quality Gates](quality/index.md) | It routes claims to gates and evidence boundaries. |
| `prove repository checks and evidence coverage` | [Executable Evidence Coverage](quality/evidence/executable-evidence.md) | It maps validators, fixtures, CI commands, and their boundaries. |
| `declare consumer reference applicability` | [Consumer Reference](consumer-reference/index.md) | It provides the required handoff field without moving consumer values into Layout. |
| `change generated patterns, catalog, or governance policy` | [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md) | It identifies source files, generated artifacts, validators, lifecycle state, and review ownership. |
| `run findability QA` | [Tree-Test Findability QA](quality/index.md#tree-test-findability-qa) | It tests whether task routes are discoverable, not just linked. |

## Link Policy

- Navigation links move a reader to the next decision point in the repository. Root hubs, indexes, parent links, and next-step links are navigation links.
- Citation links identify source lineage or evidence boundaries. They support a claim but should not be the only way to continue a task.
- Dependency links identify generated, validation, or composition relationships. They explain what must stay in sync, such as `scripts/pattern-data.mjs`, generated pattern files, catalog entries, and validator fixtures.

## How To Use This Repository

- Start with [StyleGallery Domains](DOMAINS.md) when the owning domain is not already clear.
- Use [Layout](layout/index.md), [Motion](motion/index.md), [Design Engineering](design-engineering/index.md), [Game UI](game-ui/index.md), or [Platform Guides](platform-guides/index.md) as the domain-local entry point.
- Start with [Layout Planning Guide](GUIDE.md) when you are designing a screen before a layout problem is obvious.
- Use the [Webpage Generation Workflow](guides/webpage-generation-workflow.md) when raw content needs to become a homepage or ordinary webpage before a layout recipe is obvious.
- Use the [Documentation Mode Taxonomy](guides/documentation-mode-taxonomy.md) when adding or reviewing docs so each page has a clear primary reading mode.
- Use the [Controlled vocabulary](guides/vocabulary.md) when a term affects routing, metadata, search, claim records, workflow handoff, or review decisions.
- Use the [Decision Tree](guides/decision-tree.md) when you do not know the pattern name yet.
- Fill out the [Layout Brief Template](guides/layout-brief.md) before choosing a pattern stack.
- Use [Layout Recipes](recipes/index.md) when you need screen-level composition.
- Use [Layout Pattern Catalog](CATALOG.md) when you already know the spatial problem.
- Use [Quality Gates](quality/index.md) when a claim needs principle-backed evidence, visual QA boundaries, accessibility precedence, or design rationale.
- Use [Consumer Reference](consumer-reference/index.md) when an implementation handoff must declare one repository-local JSON reference or a sentence explaining non-applicability.
- Use [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md) before changing generated artifacts, validators, lifecycle state, or ownership policy.

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
