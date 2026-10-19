---
type: Domain Guide
title: Empty States And No Results
description: Distinguish first use, completed zero matches, cleared collections, denied access, and failed loading.
aliases: ["empty states","no results","zero matches","first use onboarding"]
questions: ["What should users see when a search returns no results?"]
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-10-19
---

# Empty States And No Results

Primary role: empty-state diagnosis and recovery guide.

## Repository Boundary

This page owns the explanation and next action for absent content. [Loading And Feedback](../loading-and-feedback.md) owns pending/failure truth; [Faceted Filters](faceted-filters.md) owns query scope. Onboarding here is contextual help, not an implementation of account setup.

## Reusable Method

### Problem And Use

A blank panel gives no reason for absence. Use an empty state after the state owner can explain it. Avoid "No records" while a request is still pending or when permission is insufficient to know whether records exist.

### Recommended Rules

1. Local classification: distinguish at least first use, completed zero matches, deliberately cleared content, permission limitation, and failure. They require different next actions.
2. For first use, explain what belongs here and provide one primary path to create/import it, if authorized. Contextual help can replace a forced introductory tour.
3. For zero matches, retain the exact query and applied filters. Offer edit/remove constraints, not an unrelated create action.
4. For an intentionally cleared inbox, acknowledge completion rather than pushing onboarding again.
5. Keep failure retry and access-request actions truthful. An empty state must not imply a successful read when the request failed.

### Evidence

| Source | Year | What was measured or specified |
| --- | --- | --- |
| [NN/g empty-state design](https://www.nngroup.com/articles/empty-state-interface-design/) | 2021 | Practitioner analysis and observed application examples of confusion, contextual learning cues, and direct task pathways. No controlled effect size or universal action-count optimum reported. |
| [Status Messages, SC 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | 2024 Recommendation; living explanation read 2026 | Dynamic result statuses need programmatically determinable semantics without taking focus when they meet the criterion's status-message definition. No usability experiment. |

### Example

Local server-rendered completed search. The clear-filter URL retains the query, rather than silently resetting the whole task.

```html
<section aria-labelledby="results-title">
  <h2 id="results-title">Search results</h2>
  <p>No matches for "ceramic" with color: blue.</p>
  <a href="/catalog?q=ceramic">Remove the color filter</a>
  <a href="/catalog">Start a new search</a>
</section>
```

For an in-place update, keep an existing concise `role="status"` region and update its text after accepting the response. Do not make every result card a live region or automatically move focus on each query.

## Opinionated Guidance

Prefer an actionable explanation over decorative apology. Demo data can help first use only when clearly labeled and distinguishable from user-owned records.

## Platform-Specific Guidance

An offline cache, native permission state, and an empty server response are distinct. Preserve that distinction through app suspension, navigation, and retry.

## Unsupported Absolutes

An empty list is not always an error. One primary action is a local hierarchy proposal, not a measured law. A successful onboarding illustration does not establish task completion.

## Verification Contract

Proposed checks: new account, filtered zero, last item removed, denied access, pending read, offline cache, failed request, and Back to a previous query. Accessibility requires a meaningful heading, keyboard recovery actions, retained focus for passive updates, and correctly scoped status semantics. No consumer run is claimed. Re-review when data ownership or empty-state classification changes.

## Source, License, And Attribution

Locally authored synthesis and fragment; sources rechecked 2026-10-19. No upstream prose or artwork copied. `consumer_reference: not_applicable` because no consumer collection record is selected.

## IA Navigation

Parent: [Evidence Patterns](index.md).
Next: [Data Table Interaction](data-tables.md).
