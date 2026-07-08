---
type: Evidence Reference
title: Search, Metadata, And Polyhierarchy
description: Evidence for pattern retrieval, metadata vocabulary, and search adoption decisions.
---

# Search, Metadata, And Polyhierarchy

This record measures whether the generated index graph and pattern frontmatter solve discovery tasks before adding a search engine or faceted UI.

Source of truth:

- `scripts/pattern-data.mjs` stores the pattern table.
- `scripts/generate-patterns.mjs` renders pattern frontmatter, `CATALOG.md`, and category indexes.
- `scripts/validate-catalog.mjs --json` guards generated index consistency.

Generated catalog remains canonical. Search, if added later, is a derived access path and must not replace `CATALOG.md`, `patterns/index.md`, or `patterns/*/index.md` as the canonical catalog.

## Metadata Dictionary

| Field | Definition | Allowed values in current corpus | Retrieval use | Drift rule |
| --- | --- | --- | --- | --- |
| `type` | OKF document kind for each generated pattern page. | `Layout Pattern` | Exclude non-pattern pages from pattern retrieval. | Single fixed value for generated patterns. |
| `name` | Stable slug and file identity. | 46 unique slugs. | Exact lookup and duplicate detection. | Must match generated file slug. |
| `title` | Display title for the pattern page. | Same 46 slugs as `name`. | Human scan label. | Must match `name` unless a deliberate display-title policy is introduced. |
| `category` | Canonical navigation group rendered into `patterns/index.md` and category indexes. | `Centering`, `Containment`, `Grid / Repetition`, `In-line grouping`, `Media / Fit`, `Overlay / Exception`, `Split / Sidebar`, `Stacking`, `Viewport / Shell` | Primary browse path and catalog grouping. | Do not introduce near-synonyms such as `Inline grouping` or `Grid repetition`. |
| `description` | Short problem statement mirrored from `primary_spatial_problem`. | One sentence per pattern. | Text scan inside `CATALOG.md`. | Keep aligned with `primary_spatial_problem`. |
| `primary_spatial_problem` | The one spatial problem the pattern optimizes. | One sentence per pattern. | Task-to-pattern matching. | Split the pattern if this becomes multiple primary problems. |
| `secondary_spatial_problems` | Incidental spatial behavior that helps composition. | `none` | Future polyhierarchy hook. | `none` means no secondary facet is claimed. |
| `layout_axis` | Dominant spatial axis. Allowed values: layout_axis: `block`, `inline`, `both`. | `block` (11), `inline` (24), `both` (11) | Filters layout direction before choosing a category. | Use these axis terms only; avoid `horizontal`, `vertical`, and `2D` aliases. |
| `content_shape` | Dominant content structure expected by the pattern. | `mixed` (46) | Future distinction between prose, media, controls, and repeated items. | Current vocabulary is underdeveloped; do not facet on it yet. |
| `responsiveness` | How the pattern adapts. Allowed values: responsiveness: `breakpointed`, `fixed`, `fluid`, `reflow`, `scroll`, `wrap`. | `fluid` (26), `wrap` (9), `reflow` (6), `fixed` (3), `breakpointed` (1), `scroll` (1) | Distinguishes intrinsic, wrapping, breakpoint, and scrolling behavior. | Keep `reflow` and `wrap` distinct: `wrap` changes row/line packing; `reflow` changes layout structure. |
| `constraints` | Human-readable statement of constraints and change points. | `Uses only local class hooks and explicit layout constraints.` | Confirms whether constraints are documented. | Improve wording only when generated from the source table. |
| `scroll_ownership` | Declares whether the pattern owns an internal scroll container. | `No internal scroll container.` (43), `Pattern owns the named scroll container.` (3) | Finds shells and rows where scroll responsibility is explicit. | Do not introduce synonyms such as `page scroll`, `local scroll`, or `internal scrolling` as facet values. |
| `source_lineage` | Source family or canonical reference URL. | MDN, Every Layout, web.dev, Carbon, GOV.UK, Material, and related source URLs. | Supports source-backed evaluation and lineage audits. | Keep URL strings exact; group families in derived reports only. |

## Polyhierarchy Classification

The corpus already has a lightweight polyhierarchy:

| Relationship | Status | Reason |
| --- | --- | --- |
| Pattern -> `category` | Canonical browse hierarchy | Category drives generated indexes and should stay single-valued. |
| Pattern -> `layout_axis` | Intended retrieval facet | Axis cuts across categories without changing canonical placement. |
| Pattern -> `responsiveness` | Intended retrieval facet | Adaptation behavior is orthogonal to category. |
| Pattern -> `scroll_ownership` | Intended retrieval facet | Scroll responsibility cuts across shell, inline, and sidebar patterns. |
| Pattern -> `source_lineage` | Intended evidence facet | Source family supports traceability, not navigation ownership. |
| Pattern -> `content_shape` | Drift risk | Current value is `mixed` for all patterns, so it should not be exposed as a facet yet. |
| Pattern -> `secondary_spatial_problems` | Drift risk | Current value is `none` for all patterns, so it is a placeholder rather than a usable hierarchy. |

Facet value drift is a failure when two names represent one concept. Current high-risk examples to reject are `inline` vs `horizontal`, `block` vs `vertical`, `wrap` vs `wrapping`, and `Pattern owns the named scroll container.` vs `internal scroll`.

## Retrieval Benchmark

| Task | Current index-only result | Metadata-assisted result | Measurement | Decision |
| --- | --- | --- | --- | --- |
| find a reflow-aware pattern with scroll ownership guidance | `CATALOG.md` cannot express the conjunction; category indexes require manual opening of candidate files. | No exact pattern has both `responsiveness: reflow` and `Pattern owns the named scroll container.`. Closest scroll-ownership matches are `scroll-body-shell`, `fixed-sidenav-shell`, and `reel`; reflow candidates are `list-detail`, `main-with-rail`, `media-object`, `split-screen`, `supporting-pane`, and `panel-layout`. | PASS as a measured answer: the metadata exposes that this is a no-exact-match query instead of hiding it behind search. | Add retrieval evidence; do not add search yet. |
| Find a shell pattern where the body owns scrolling. | `CATALOG.md` contains `scroll-body-shell`, but the scroll ownership claim is only visible after opening the page. | `category: Viewport / Shell` plus `scroll_ownership: Pattern owns the named scroll container.` returns `scroll-body-shell` and `fixed-sidenav-shell`. | PASS. | Metadata dictionary is enough. |
| Find a pattern that wraps inline controls. | `patterns/in-line-grouping/index.md` lists likely candidates, but responsiveness is not visible in the index. | `category: In-line grouping` plus `responsiveness: wrap` returns `breadcrumb`, `cluster`, `deconstructed-pancake`, `pagination`, `split-nav`, `tab-strip`, and `wrap-row`. | PASS. | A generated facet report may help later; search is not required. |
| Find source-backed grid repetition patterns. | `CATALOG.md` groups grid patterns but does not expose lineage. | `category: Grid / Repetition` plus `source_lineage` groups Carbon, MDN, GOV.UK, Material, and web.dev-backed patterns. | PASS. | Keep source lineage as metadata, not primary navigation. |

Benchmark conclusion: current indexes answer name/category browsing; metadata answers cross-cutting retrieval. The observed weakness is lack of a published dictionary and benchmark, not lack of full-text search.

## Search Decision Record

Decision: do not add Pagefind or DocSearch yet.

Rationale:

- The measured failures are metadata-publication gaps, not search-engine gaps.
- A search box could hide category, axis, responsiveness, and scroll-ownership vocabulary drift instead of fixing it.
- The generated catalog and category indexes already provide the canonical graph; search should remain derived if introduced.

Revisit search only when a benchmark task fails after metadata is public and the failure cannot be solved by a generated facet report or clearer index text.

Search adoption guardrails:

- Keep `CATALOG.md` as the canonical pattern list.
- Generate search data from pattern frontmatter rather than hand-maintaining a second index.
- Validate facet vocabulary before indexing so drift cannot become search UI state.
- Treat Pagefind or DocSearch results as navigation aids, not source-of-truth records.

## IA Navigation

Parent: [Evidence References](index.md).
Next: [Quality Gates](../index.md) to decide whether the evidence supports a claim.
