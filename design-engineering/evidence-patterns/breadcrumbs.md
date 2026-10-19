---
type: Domain Guide
title: Breadcrumb Hierarchy
description: Expose a stable parent path without confusing hierarchy with browser history or search-filter state.
aliases: ["breadcrumb hierarchy","parent navigation","breadcrumb semantics","location trail"]
questions: ["Should breadcrumbs represent page hierarchy or browsing history?"]
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-10-19
---

# Breadcrumb Hierarchy

Primary role: hierarchy navigation guide.

## Repository Boundary

This page owns breadcrumb meaning. [Breadcrumb Layout](../../patterns/in-line-grouping/breadcrumb.md) owns wrapping; [Adaptive Navigation](../../platform-guides/adaptive-navigation.md) separates Parent/Up from Back; URL state owns filter history.

## Reusable Method

### Problem And Use

A visitor arriving by a direct link lacks navigation history but still needs a parent route. Use breadcrumbs when a meaningful hierarchy helps orientation. Avoid fabricating a hierarchy for a flat task or using a sequence of recently visited pages as though it were ancestry.

### Recommended Rules

1. List parent destinations in hierarchical order, not chronological history.
2. Use one labeled navigation landmark for the trail. Use ordinary links for ancestors; no custom arrow-key widget is needed.
3. If the current page is linked, expose `aria-current="page"`. For unlinked current text, APG makes that attribute optional.
4. Local proposal: choose one coherent parent path for a multiply categorized item, or explain the selected context. Do not silently change a canonical path based on accidental browsing history.
5. At narrow widths, retain useful parent access and the current location. Test wrapping or a labeled collapse rather than shrinking targets or clipping names.

### Evidence

| Source | Year | What was measured or specified |
| --- | --- | --- |
| [APG breadcrumb](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/) | Living guidance, read 2026 | Defines hierarchical parent links, a labeled navigation landmark, and current-page semantics. No comparative study or proven maximum depth. |

### Example

```html
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/library">Library</a></li>
    <li><a href="/library/reports">Reports</a></li>
    <li><a href="/library/reports/annual" aria-current="page">Annual report</a></li>
  </ol>
</nav>
```

The links remain normal document navigation. Decorative separators belong to consumer presentation and must not become confusing accessible names.

## Opinionated Guidance

Keep breadcrumbs secondary to the page heading and primary navigation. A short trail can be useful; an arbitrary "at least three levels" requirement is not supported by this source.

## Platform-Specific Guidance

On mobile, keep parent links usable under text scaling. A native Back action may leave the hierarchy entirely; do not label a history action as a parent link.

## Unsupported Absolutes

Breadcrumbs are not a substitute for primary navigation. A filter chip is not necessarily a hierarchical ancestor. No evidence here establishes a universal separator, depth limit, or single-line requirement.

## Verification Contract

Proposed checks: direct deep link, browser Back from an unrelated origin, multiple categories, long labels, RTL, zoom, and collapsed trail expansion. Accessibility requires a named landmark, correct current-page indication, ordinary keyboard links, and logical order. No consumer execution is claimed. Re-review when hierarchy or canonical routes change.

## Source, License, And Attribution

Locally authored synthesis and example; APG rechecked 2026-10-19. No source samples copied. `consumer_reference: not_applicable` because no consumer navigation record is selected.

## IA Navigation

Parent: [Evidence Patterns](index.md).
Next: [Bottom Navigation Destinations](bottom-navigation.md).
