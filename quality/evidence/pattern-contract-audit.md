---
type: Quality Evidence
title: Pattern Contract Audit
description: Maps pattern document metadata, validator checks, and human review responsibilities.
---

# Pattern Contract Audit

This audit connects the generated pattern anatomy to the decisions a reviewer or implementer must make. The source of truth remains `scripts/pattern-data.mjs`; `scripts/generate-patterns.mjs` emits the pattern pages; `scripts/validate-patterns.mjs` enforces the mechanical contract.

## Required Field Rationale

| Field | Responsibility | Why It Exists |
| --- | --- | --- |
| `name` | selection, validation | Gives each pattern a stable identity for indexes, generated headings, and class-parity checks. |
| `category` | selection, governance | Groups patterns by spatial family so the catalog can expose comparable options and reviewers can sample by family. |
| `primary_spatial_problem` | selection, implementation | States the one layout problem the pattern optimizes, preventing a reusable pattern from absorbing product styling or unrelated behavior. |
| `secondary_spatial_problems` | selection, governance | Records intentional composition pressure without letting secondary behavior become the primary contract. |
| `layout_axis` | implementation, validation | Identifies whether the pattern acts on block, inline, or both axes, which shapes CSS review and failure analysis. |
| `content_shape` | implementation, validation | Describes the content assumptions behind the snippet so adopters can test empty, short, long, and mixed content deliberately. |
| `responsiveness` | implementation, validation | Names the adaptation model; the validator gives `reflow` patterns an extra mechanic check for wrap, query, or intrinsic guards. |
| `constraints` | implementation, validation | Makes widths, heights, gaps, scroll containers, anchors, and other change points explicit instead of implicit in the code block. |
| `scroll_ownership` | implementation, governance | Separates ordinary document flow from patterns that own a named scroll container, a key accessibility and QA responsibility. |
| `source_lineage` | governance | Points reviewers to the pattern's conceptual lineage so borrowed ideas can be checked for faithful translation, not just attribution. |

## Validator-Enforced Responsibilities

Validator-enforced checks in `scripts/validate-patterns.mjs` cover the contract pieces that can be read mechanically:

- Frontmatter must include every required field in the table above.
- Every pattern must include the required anatomy sections: use case, HTML, CSS, core properties, breakage properties, constraints, scroll ownership, accessibility/source order, browser fallback, composition, and anti-patterns.
- HTML and CSS fenced blocks must exist, and CSS class hooks must match HTML class hooks in both directions.
- CSS declarations must be alphabetical inside each rule.
- ID selectors and forbidden decorative properties are rejected in reusable pattern CSS.
- `reflow` responsiveness requires an inspectable reflow mechanic such as a container query, media query, intrinsic repeat, wrap, or narrow guard.
- Pattern count must satisfy the minimum threshold passed to the validator.

## Human-Review-Only Risks

Human-review-only risks remain outside the validator because they require judgment, domain fit, or source interpretation:

- Whether the `primary_spatial_problem` is narrow enough to keep the pattern reusable.
- Whether `secondary_spatial_problems` are genuine composition constraints or disguised feature creep.
- Whether semantic HTML, DOM order, reading order, and focus order remain logical for the sampled use case.
- Whether `constraints` describe the actual change points a downstream implementer must preserve.
- Whether `scroll_ownership` is clear enough for keyboard, screen-reader, and nested-scroll QA.
- Whether source lineage is meaningful: a URL should explain the pattern's origin or adjacent precedent, not act as a decorative citation.
- Whether browser fallback notes are realistic for the properties the snippet actually uses.

The split is intentional: validator-enforced rules prevent structural drift; Human-review-only rules protect interpretation quality.

## Structural CSS Boundary

Allowed structural CSS is the CSS that explains layout mechanics and can be tied to a spatial responsibility. Source-backed examples include `patterns/stacking/stack.md` using `display` and `gap`, `patterns/grid-repetition/ram-grid.md` using `grid-template-columns`, `patterns/viewport-shell/scroll-body-shell.md` using `overflow`, and `patterns/overlay-exception/imposter.md` using `position`, `inset`, `place-items`, and `z-index`.

Forbidden decorative CSS remains out of reusable pattern snippets unless a layout-specific reason is documented. The forbidden side includes `color`, `background`, `border`, `border-radius`, `box-shadow`, `filter`, `font-*`, `opacity`, `text-*`, `animation`, `transition`, and `transform`. These properties can belong in a product theme or demonstration wrapper; they should not be smuggled into the reusable layout contract.

The practical boundary is: keep CSS that changes geometry, flow, intrinsic sizing, scroll containment, or anchoring; reject CSS whose main effect is visual treatment.

## Representative Pattern Audit

| Category | Representative Source | Section Quality | Review-Only Risk |
| --- | --- | --- | --- |
| Stacking | `patterns/stacking/stack.md` | Anatomy is compact and the breakage note correctly names `display` and `gap`. | Check that future variants do not turn vertical rhythm into spacing tokens or typography guidance. |
| Containment | `patterns/containment/content-limiter.md` | Constraints are visible through `max-inline-size`, `margin-inline`, and `padding-inline`. | Review whether prose width examples stay about readable measure, not editorial page styling. |
| Media / Fit | `patterns/media-fit/frame.md` | Core properties identify both the frame and child media responsibilities. | Confirm media semantics remain real content and not placeholder-only examples. |
| Viewport / Shell | `patterns/viewport-shell/scroll-body-shell.md` | Scroll ownership is explicit in both metadata and child class naming. | Test nested scroll behavior manually when a downstream shell adds focusable regions. |
| Grid / Repetition | `patterns/grid-repetition/ram-grid.md` | The intrinsic repeat mechanic is clear and minimal. | Verify long labels and narrow containers remain readable, since count alone does not prove usable cards. |
| Overlay / Exception | `patterns/overlay-exception/imposter.md` | The anchor/overlay relationship is legible and source order remains stable. | Review modal semantics and focus behavior in product use; placement alone does not make a complete dialog. |

## External Lineage Review

The current lineage set is meaningful at the concept level:

- Every Layout lineage is appropriate for stack, overlay, and media-like primitives because those references explain spatial constraints and composition.
- MDN lineage is appropriate for property-led shell behavior such as overflow mechanics.
- GOV.UK layout lineage is appropriate for containment and readable-width decisions because it is a production design-system precedent.
- web.dev one-line layout lineage is appropriate for intrinsic grid repetition.

Lineage review should reject links that only resemble a pattern name. A useful lineage link must explain the layout mechanic, the governance principle, or the implementation risk carried by the generated snippet.

## Contract Summary

The contract is strong when each field and section has a job:

- selection: choose the right spatial primitive before writing product CSS.
- implementation: preserve the smallest robust HTML/CSS anatomy.
- validation: catch drift that can be detected mechanically.
- governance: surface risks that require reviewer judgment.

The validator should stay mechanical. Reviewers should own semantic fit, lineage quality, fallback realism, and whether examples still teach structure instead of style.
