---
type: Domain Guide
title: URL State And History
description: Keep shareable screen state consistent across links, refresh, and browser history.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# URL State And History

## Repository Boundary

Keep shareable screen state consistent across links, refresh, and browser history. This pattern belongs to Design Engineering and adds no Layout CSS or shared store implementation.

## Reusable Method

Use for committed search, filters, pagination, and selected IDs that should be shareable. Keep secrets, sensitive drafts, and hover state out of URLs.

### State Model And Ownership

The route owns committed query state; a text field may own an uncommitted buffer. Parsing supplies validated defaults. User commits write URL parameters; history navigation reads them without writing a new entry.

### Transitions

| Event and precondition | Next state | Effect or invariant |
| --- | --- | --- |
| Open or history traversal | Parsed route state | Render without another push |
| Commit filter | New route; page reset | Push a meaningful navigation entry |
| Normalize invalid input | Validated defaults | Replace only under declared canonicalization policy |

### Minimal Executable Example

Run this standalone JavaScript block with Node.js 22 or newer, or run all pattern examples from a repository checkout with `npm run test:state-management`. The assertions exercise the local model, not a browser or backend.

```js
import assert from "node:assert/strict";
function readRoute(href) {
  const u = new URL(href);
  const raw = u.searchParams.get("page") ?? "1";
  const n = /^\d+$/.test(raw) ? Number(raw) : NaN;
  return { q: u.searchParams.get("q") ?? "", page: Number.isSafeInteger(n) && n > 0 ? n : 1 };
}
function commitQuery(href, q) {
  const u = new URL(href);
  if (q) u.searchParams.set("q", q); else u.searchParams.delete("q");
  u.searchParams.delete("page");
  return u.href;
}
const original = "https://example.test/items?q=A&page=3&view=grid#results";
const changed = commitQuery(original, "B & C");
assert.deepEqual(readRoute(changed), { q: "B & C", page: 1 });
assert.equal(new URL(changed).searchParams.get("view"), "grid");
assert.equal(new URL(changed).hash, "#results");
assert.deepEqual(readRoute(original), { q: "A", page: 3 }); // Back reads old URL.
assert.equal(readRoute("https://example.test/?page=Infinity").page, 1);
```

### What Breaks If Removed

Writing a new history entry in response to a history event creates a loop. Keeping the old page after changing the filter can display an apparently empty collection. Rebuilding the URL from scratch can drop unrelated parameters or fragments.

### Composition And Substitution

Use [latest request wins](latest-request-wins.md) for data reads and [unsaved navigation](unsaved-navigation.md) before committing a destructive route change. Reset local input from history only under the declared editing policy.

## Opinionated Guidance

Decide push versus replace from meaningful navigation steps. Do not make every keystroke a Back-button stop by accident.

## Platform-Specific Guidance

Browser adapters must handle popstate and their router's navigation API; the pure URL functions do not install listeners. SSR and client must use the same parser and defaults.

Platform reference: [MDN API documentation](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState), checked 2026-09-16. This supports the named browser boundary; the model and product policy remain local synthesis.

## Unsupported Absolutes

A URL is not a safe persistence medium for private data, nor does parsing prove authorization to access a selected entity.

## Verification Contract

- Commit query B from page 3; reset to page 1 and preserve unrelated parameters.
- Back, Forward, reload, and paste a deep link; displayed controls agree with the URL.
- Reject malformed page values; avoid URL-to-state-to-URL loops.

Record actual outcomes separately using the [verification matrix](../verification.md).

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](../index.md).
Next: [Continue the state management route](../recipes/index.md).
