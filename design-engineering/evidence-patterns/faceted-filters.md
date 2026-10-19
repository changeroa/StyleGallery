---
type: Domain Guide
title: Faceted Filter Selection
description: Make applied filters visible and removable while matching selection logic to the user's search task.
aliases: ["faceted filters","applied filters","filter chips","OR filter values"]
questions: ["How should multiple filter values combine and remain visible?"]
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-10-19
---

# Faceted Filter Selection

Primary role: filter selection and recovery guide.

## Repository Boundary

This page owns filter meaning and visibility. [URL State](../state-management/patterns/url-state.md) owns serialization/history; [Latest Request Wins](../state-management/patterns/latest-request-wins.md) owns response authority. Layout owns sidebar and wrapping mechanics.

## Reusable Method

### Problem And Use

Users forget hidden constraints and mistake a narrowed result set for the entire catalog. Use facets when users need to combine meaningful independent attributes. Avoid a dense facet system for a tiny list or attributes users cannot interpret.

### Recommended Rules

1. For ordinary product attributes, begin with OR within a facet and AND across facets: `(blue OR black) AND medium`. Explain any different query semantics.
2. Show actual applied values, not just "3 filters". Include inherited/promoted filters and offer individual removal.
3. Local proposal: provide one clear-all action when multiple optional constraints are active. Define which mandatory scope it cannot remove.
4. Choose immediate application or an explicit Apply action from measured query cost and task behavior. Keep draft choices distinct from applied choices.
5. Update the count and list from the same accepted request. Preserve the query and selected filters on no results; offer reversible broadening.

### Evidence

| Source | Year | What was measured or specified |
| --- | --- | --- |
| [Baymard combined values](https://baymard.com/research-articles/allow-applying-of-multiple-filter-values) | 2024 | E-commerce observations: mutually exclusive values forced repeated searches and memorization. 15% benchmark non-support is site prevalence, not a causal abandonment estimate. OR/AND is a commerce convention, not every domain's query language. |
| [Baymard applied overview](https://baymard.com/research-articles/how-to-design-applied-filters) | 2020; updated 2026 | Observed confirmation, removal, and context problems without an overview. Article explicitly says testing was inconclusive about which desktop overview placement was most effective. |

### Example

Local server-backed filter form. The response should reflect applied selections and give each removable filter a URL preserving the others.

```html
<form action="/catalog" method="get">
  <fieldset>
    <legend>Color: match any selected color</legend>
    <label><input type="checkbox" name="color" value="blue" checked>Blue</label>
    <label><input type="checkbox" name="color" value="black">Black</label>
  </fieldset>
  <label for="size">Size</label>
  <select id="size" name="size">
    <option value="">Any size</option>
    <option value="medium" selected>Medium</option>
  </select>
  <button>Apply filters</button>
</form>
<nav aria-label="Applied filters">
  <a href="/catalog?size=medium">Remove color: blue</a>
  <a href="/catalog?color=blue">Remove size: medium</a>
  <a href="/catalog">Clear all filters</a>
</nav>
```

## Opinionated Guidance

Keep removal close to the results it explains. Use meaningful option names, and distinguish unavailable choices from choices that would produce zero results.

## Platform-Specific Guidance

A mobile filter sheet can hide draft choices; return to the result list with a visible applied overview. Focus return belongs to the sheet's interaction contract.

## Unsupported Absolutes

OR within every group is wrong for queries such as "contains all these ingredients". An applied-filter count alone does not explain scope. No fixed number of facets is proven optimal.

## Verification Contract

Proposed checks: two values in one facet, two facet types, direct URL, Back, clear-one, clear-all, zero results, obsolete response, and mobile sheet dismissal. Accessibility requires labeled groups, keyboard removal, stable focus after removal, and concise announced result updates for dynamic changes. No consumer execution is claimed. Re-review on query logic or application-policy changes.

## Source, License, And Attribution

Locally authored synthesis and fragment; primary sources rechecked 2026-10-19, no upstream samples copied. `consumer_reference: not_applicable` because no consumer search record is selected.

## IA Navigation

Parent: [Evidence Patterns](index.md).
Next: [Empty States And No Results](empty-states.md).
