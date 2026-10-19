---
type: Domain Guide
title: Data Table Interaction
description: Preserve comparison and table semantics while adding truthful sorting, usable density, and bounded sticky headers.
aliases: ["data tables","sortable table","table density","sticky table header"]
questions: ["How should a data table expose sorting and retain headers?"]
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-10-19
---

# Data Table Interaction

Primary role: tabular task and interaction guide.

## Repository Boundary

This page owns table meaning, sorting, and comparison decisions. Layout owns scroll constraints and [sticky mechanics](../../patterns/viewport-shell/sticky-header.md). Density is consumer styling, not permission to decorate reusable Layout CSS.

## Reusable Method

### Problem And Use

Dense records become hard to compare when headers vanish or sorting is unexplained. Use a table for meaningful row/column relationships and comparison. Avoid a table solely to align unrelated cards; use a grid widget only when its composite interaction is genuinely needed.

### Recommended Rules

1. Start with `table`, caption, and header cells. Use native interactive controls inside headers rather than making an entire header an unlabeled click target.
2. Local default: one primary sorted column, with its actual `aria-sort` state. A multi-sort product needs an explicit priority order and explanation.
3. Specify numeric/text/date ordering and null placement. A remote sort must sort the declared dataset, not silently only the current page.
4. Keep a header visible when long comparison tasks need it, but name the scroll container and ensure sticky rows never hide focused controls.
5. Offer comfortable versus compact density only if it serves a real task. No source establishes a universal row height; interactive targets must independently meet the applicable target-size criterion.
6. Keep stable record identity and selection through sorting. For virtualized rows, verify exposed row counts/indices and real assistive-technology navigation.

### Evidence

| Source | Year | What was measured or specified |
| --- | --- | --- |
| [NN/g four table tasks](https://www.nngroup.com/articles/data-tables/) | 2022 | Workplace task observations, including an eye-tracking example, support comparison, locating records, editing, and actions. Recommends frozen headers for large tables; does not report a universal density threshold or controlled time saving. |
| [APG table](https://www.w3.org/WAI/ARIA/apg/patterns/table/) | Living guidance, read 2026 | Distinguishes a static table with interactive descendants from a composite grid; describes sort and virtual-row semantics. No experiment. |

### Example

Local server-sorted response: following the header link requests ascending order. The displayed rows and `aria-sort` describe the currently descending result, not the next action.

```html
<table>
  <caption>Open invoices, highest amount first</caption>
  <thead><tr>
    <th scope="col">Invoice</th>
    <th scope="col" aria-sort="descending">
      <a href="/invoices?sort=amount&amp;direction=asc">Amount: sort ascending</a>
    </th>
  </tr></thead>
  <tbody>
    <tr><th scope="row"><a href="/invoices/27">INV-27</a></th><td>$90.00</td></tr>
    <tr><th scope="row"><a href="/invoices/31">INV-31</a></th><td>$45.00</td></tr>
  </tbody>
</table>
```

## Opinionated Guidance

Place related comparison columns near one another. A row editor should not obscure adjacent reference data unless modality is justified.

## Platform-Specific Guidance

On narrow screens, preserve required comparison relationships and indicate horizontal scrolling. Do not assume visually stacked cells still expose correct headers.

## Unsupported Absolutes

More rows per screen does not prove better productivity. `role="grid"` does not implement arrow-key navigation. A sticky header is not inherently accessible.

## Verification Contract

Proposed checks: equal sort keys, nulls, negative amounts, server pagination, sorting selected rows, 320px width, zoom, long headers, and focus under sticky rows. Accessibility requires header relationships, named sort controls, accurate sort state, and operable scroll. No consumer execution is claimed. Re-review on sort scope, virtualization, or density changes.

## Source, License, And Attribution

Locally authored synthesis and fragment; sources rechecked 2026-10-19. No upstream examples copied. `consumer_reference: not_applicable` because no consumer table record is selected.

## IA Navigation

Parent: [Evidence Patterns](index.md).
Next: [Tabs And Segmented Controls](tabs-and-segmented-controls.md).
