---
type: Domain Guide
title: Selection By Stable Identity
description: Keep selection attached to an entity while a collection reorders or refreshes.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Selection By Stable Identity

## Repository Boundary

Keep selection attached to an entity while a collection reorders or refreshes. This pattern belongs to Design Engineering and adds no Layout CSS or shared store implementation.

## Reusable Method

Use for lists, tables, and detail views with stable IDs. Index selection is sufficient only for immutable position-based options whose identity truly is their position.

### State Model And Ownership

The screen owns `selectedId`; the data owner supplies current entities. Detail is derived by ID. Missing from a filtered page does not imply deletion: choose a retained-detail fetch or an unavailable state based on actual knowledge.

### Transitions

| Event and precondition | Next state | Effect or invariant |
| --- | --- | --- |
| Select an available ID | ID selected | Resolve current entity by identity |
| Collection reorders | Same ID | Detail still belongs to the same entity |
| Authoritative deletion removes ID | Null or unavailable | Apply the declared fallback and recover focus |

### Minimal Executable Example

Run this standalone JavaScript block with Node.js 22 or newer, or run all pattern examples from a repository checkout with `npm run test:state-management`. The assertions exercise the local model, not a browser or backend.

```js
import assert from "node:assert/strict";
let rows = [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }];
let selectedId = "b";
const selected = () => rows.find(row => row.id === selectedId) ?? null;
rows = [...rows].reverse();
assert.equal(selected().name, "Beta");
rows = rows.map(row => row.id === "b" ? { ...row, name: "Updated" } : row);
assert.equal(selected().name, "Updated");
rows = rows.filter(row => row.id !== "b");
if (!selected()) selectedId = null; // This collection is authoritative and complete.
assert.equal(selected(), null);
```

### What Breaks If Removed

Keep row index 1, reverse the array, and the detail silently changes to another entity. Keep a copied selected object and a refresh can leave its fields stale.

### Composition And Substitution

Use [URL state](url-state.md) when selection should survive links and history. Use [latest request wins](latest-request-wins.md) for separately fetched detail; key requests by selected ID.

## Opinionated Guidance

Choose an explicit missing-item policy. Never infer remote deletion solely from pagination or filtering.

## Platform-Specific Guidance

After deleting a focused row, move focus to a logical neighbor or heading. A selected state and keyboard focus are separate responsibilities.

## Unsupported Absolutes

Stable keys do not prove stable identity if the server recycles identifiers across tenants or revisions.

## Verification Contract

- Reorder and update the selected row; detail must preserve ID and refresh fields.
- Filter it out without deleting it; apply the declared retained-detail policy.
- Delete the final item; verify empty detail and focus recovery in the UI.

Record actual outcomes separately using the [verification matrix](../verification.md).

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](../index.md).
Next: [Continue the state management route](../recipes/index.md).
