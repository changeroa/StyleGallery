---
type: Domain Guide
title: Submitted Snapshot And Save Acknowledgement
description: Keep later edits dirty when an earlier submitted snapshot finishes saving.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Submitted Snapshot And Save Acknowledgement

## Repository Boundary

Keep later edits dirty when an earlier submitted snapshot finishes saving. This pattern belongs to Design Engineering and adds no Layout CSS or shared store implementation.

## Reusable Method

Use whenever editing can continue during a save. If the UI locks editing, document that constraint but still correlate completions to the active operation.

### State Model And Ownership

The form owns draft and baseline; an active operation owns a copied snapshot and request ID. This string example allows one write in flight and assumes the server returns the same accepted value. Real adapters must define normalization and revision conflicts.

### Transitions

| Event and precondition | Next state | Effect or invariant |
| --- | --- | --- |
| Submit while idle | Active snapshot and request ID | Persist exactly that snapshot |
| Edit while saving | New draft, same active operation | Do not mutate submitted data |
| Matching success | Baseline becomes acknowledged snapshot | Dirty compares current draft to new baseline |
| Matching failure | Active cleared, error retained | Keep current draft |
| Stale completion | Unchanged | Never commit another operation's result |

### Minimal Executable Example

Run this standalone JavaScript block with Node.js 22 or newer, or run all pattern examples from a repository checkout with `npm run test:state-management`. The assertions exercise the local model, not a browser or backend.

```js
import assert from "node:assert/strict";
let draft = "A", baseline = "Original", active = null, serial = 0, error = null;
function submit() {
  if (active) return null;
  error = null;
  active = { id: ++serial, snapshot: draft };
  return { ...active };
}
function settle(id, ok, message = "Save failed") {
  if (active?.id !== id) return;
  if (ok) baseline = active.snapshot;
  else error = message;
  active = null;
}
const first = submit();
draft = "B";
assert.equal(submit(), null);
settle(first.id, true);
assert.equal(baseline, "A");
assert.equal(draft, "B");
assert.equal(draft !== baseline, true);
const second = submit();
settle(first.id, true);
assert.equal(active.id, second.id);
settle(second.id, false);
assert.equal(draft, "B");
assert.equal(error, "Save failed");
const retry = submit();
assert.equal(error, null);
settle(retry.id, true);
assert.equal(draft, baseline);
```

### What Breaks If Removed

If success assigns the current draft to baseline, saving A then editing B marks unsent B as saved. If the request holds a mutable object reference, editing B can also mutate the supposed A snapshot.

### Composition And Substitution

Combines [draft/baseline](draft-and-baseline.md) and [single flight](single-flight.md). This is the reusable core of the existing [save contract](../../component-contract.md#worked-contract-save-action).

## Opinionated Guidance

For objects, capture an appropriate immutable copy. Adopt a server-normalized result into the draft only if no later edit would be overwritten; otherwise reconcile visibly.

## Platform-Specific Guidance

Client request abort does not roll back a remote write. On transport uncertainty, reconcile with the server before claiming a retry is safe.

## Unsupported Absolutes

Client request IDs are not server idempotency keys or optimistic concurrency revisions.

## Verification Contract

- Submit A, edit B, acknowledge A; baseline A and dirty B must remain.
- Fail then retry; inputs survive and the new operation has its own identity.
- Deliver the old completion during a new save; it must not clear the new request.

Record actual outcomes separately using the [verification matrix](../verification.md).

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](../index.md).
Next: [Continue the state management route](../recipes/index.md).
