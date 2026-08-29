---
type: State Management Recipe
title: Search And Filter State
description: Compose navigable query state, remote results, and local input for search flows.
domain: state-management
lifecycle: experimental
provenance_kind: local
---

# Search And Filter State

## Repository Boundary

This recipe owns search-flow state composition. Layout owns result placement and responsive behavior; the backend owns query semantics, ranking, authorization, and canonical result data.

## Reusable Method

Recommended pattern stack:

- Essential: [URL-Owned State](../patterns/ownership/url-owned-state.md) for the committed query, filters, sort, and navigable selection.
- Essential: [Server-State Cache](../patterns/ownership/server-state-cache.md) keyed by the normalized committed query.
- Helper: [Derived State](../patterns/derivation/derived-state.md) for counts, grouping, and presentation projections.
- Substitutable: [Local Draft State](../patterns/ownership/local-draft-state.md) when text should commit only on submit or debounce acknowledgement.

Authority map:

```txt
committed query and filters -> URL
uncommitted input -> local draft when needed
results and freshness -> server-state cache
visible grouping and counts -> derived state
```

## Opinionated Guidance

Normalize the committed query once and use the same normalized representation for URL serialization and cache identity. Avoid effects that continuously copy URL values into a second writable store.

## Platform-Specific Guidance

Browser consumers verify direct entry, back, forward, replace-versus-push behavior, and hydration. Non-browser consumers must name the navigation owner that replaces URL authority.

## Unsupported Absolutes

Not every search interaction should navigate on each keystroke, and not every filter is safe or useful to share.

## Verification Contract

Verify direct entry, empty query, malformed filters, changed query key, out-of-order results, cancellation, no results, failure, retry, back/forward, and reload. Long-running older searches must not replace newer results.

Rejected alternatives:

- One global mutable object for draft, committed query, and results: rejected because it hides three authorities and their different lifetimes.
- Derived filtered results stored independently: rejected unless the server response itself is authoritative for that projection.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery recipe.
- No upstream source fields apply.

## IA Navigation

Parent: [State Management Recipes](index.md).
Next: [Editable Form](editable-form.md).
