---
type: Domain Guide
title: Derived State From Authoritative Inputs
description: Prevent totals, filtered lists, and dirty flags from drifting away from their inputs.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Derived State From Authoritative Inputs

## Repository Boundary

Prevent totals, filtered lists, and dirty flags from drifting away from their inputs. This pattern belongs to Design Engineering and adds no Layout CSS or shared store implementation.

## Reusable Method

Use when a value is a deterministic projection of current inputs. Store historical snapshots when the task explicitly needs what was true at a previous event; those are not redundant current projections.

### State Model And Ownership

Only source items and filter are writable. Visible items and total are computed. Memoization is optional and must include every dependency; its lifetime cannot change meaning.

### Transitions

| Event and precondition | Next state | Effect or invariant |
| --- | --- | --- |
| Items change | New items | Recompute projection from current inputs |
| Filter changes | New filter | Project without mutating items |
| No matching items | Empty projection | Total is zero, not a separate empty flag |

### Minimal Executable Example

Run this standalone JavaScript block with Node.js 22 or newer, or run all pattern examples from a repository checkout with `npm run test:state-management`. The assertions exercise the local model, not a browser or backend.

```js
import assert from "node:assert/strict";
let items = [{ id: "a", price: 5 }, { id: "b", price: 12 }];
let minimum = 10;
const visible = () => items.filter(item => item.price >= minimum);
const total = () => visible().reduce((sum, item) => sum + item.price, 0);
assert.equal(total(), 12);
items = items.map(item => item.id === "b" ? { ...item, price: 7 } : item);
assert.deepEqual(visible(), []);
assert.equal(total(), 0);
minimum = 0;
assert.equal(total(), 12);
```

### What Breaks If Removed

An independently updated total can miss a deletion, filter change, or remote refresh. A memo keyed only by items stays stale after changing the filter.

### Composition And Substitution

Combine with [ID selection](id-selection.md); derive the selected object from the current collection. Keep [submitted snapshots](submitted-snapshot.md) because they represent a past event.

## Opinionated Guidance

Write down the projection before introducing another writable field. Define domain equality explicitly for dirty checks involving normalized dates, numbers, or nested data.

## Platform-Specific Guidance

Framework memo and selector APIs have different invalidation rules. Verify dependency coverage and immutable update assumptions in the chosen adapter.

## Unsupported Absolutes

Recomputing every projection is not always cheap; storing a cache can be valid if its invalidation contract is explicit.

## Verification Contract

- Change each dependency independently and inspect the projection.
- Delete the final matching item and verify the empty result and zero total.
- If memoized, repeat with unchanged references and changed filter inputs.

Record actual outcomes separately using the [verification matrix](../verification.md).

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](../index.md).
Next: [Continue the state management route](../recipes/index.md).
