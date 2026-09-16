---
type: Domain Guide
title: Latest Request Wins
description: Prevent an older read response from replacing the result of a newer user intent.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Latest Request Wins

## Repository Boundary

Prevent an older read response from replacing the result of a newer user intent. This pattern belongs to Design Engineering and adds no Layout CSS or shared store implementation.

## Reusable Method

Use for replaceable reads such as search and selected-item detail. Do not use this policy to discard the outcomes of independent writes that all matter.

### State Model And Ownership

The read owner stores a monotonically increasing identity, status, and last accepted result. Both success and failure must match the current request. Cancellation is an optional resource optimization; identity decides acceptance.

### Transitions

| Event and precondition | Next state | Effect or invariant |
| --- | --- | --- |
| Start read | Pending with new ID | Previous IDs lose authority |
| Matching success | Ready with results | Accept only current intent |
| Matching failure | Error | Preserve or clear old results under explicit policy |
| Stale success or failure | Unchanged | No status, result, or error mutation |
| Dispose | Disposed and invalidated | Ignore all pending outcomes |

### Minimal Executable Example

Run this standalone JavaScript block with Node.js 22 or newer, or run all pattern examples from a repository checkout with `npm run test:state-management`. The assertions exercise the local model, not a browser or backend.

```js
import assert from "node:assert/strict";
let serial = 0, active = 0, status = "idle", result = null;
const begin = () => { active = ++serial; status = "pending"; return active; };
function settle(id, ok, value) {
  if (id !== active) return;
  status = ok ? "ready" : "error";
  if (ok) result = value;
}
const a = begin(), b = begin();
settle(b, true, "B");
settle(a, true, "A");
settle(a, false, "old failure");
assert.equal(result, "B");
assert.equal(status, "ready");
const c = begin();
active = ++serial; status = "disposed";
settle(c, true, "C");
assert.equal(status, "disposed");
```

### What Breaks If Removed

Remove the ID check: resolve B then A and the screen displays A under B's query. Guarding success only still allows A's error or finally handler to clear B's pending status.

### Composition And Substitution

Combine [URL state](url-state.md) for committed query inputs and [ID selection](id-selection.md) for detail. Use [single flight](single-flight.md) for duplicate writes rather than silently discarding their acknowledgements.

## Opinionated Guidance

Choose whether old results stay visible while refreshing and label their query identity. Debouncing reduces starts but does not establish response ordering.

## Platform-Specific Guidance

Check identity after each awaited stage, including body decoding or transformations. Dispose invalidation and listener cleanup belong to the framework adapter.

## Unsupported Absolutes

Latest-wins prevents this local overwrite; it does not guarantee fresh server data, cache coherence, or distributed consistency.

## Verification Contract

- Start A then B; resolve B then A, including an A failure.
- Start B while A is pending; A completion must not clear B's pending indicator.
- Dispose before completion; no displayed state may update.

Record actual outcomes separately using the [verification matrix](../verification.md).

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](../index.md).
Next: [Continue the state management route](../recipes/index.md).
