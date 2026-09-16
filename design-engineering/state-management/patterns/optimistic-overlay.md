---
type: Domain Guide
title: Optimistic Overlay And Recovery
description: Show a speculative change while preserving an authoritative base for recovery.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Optimistic Overlay And Recovery

## Repository Boundary

Show a speculative change while preserving an authoritative base for recovery. This pattern belongs to Design Engineering and adds no Layout CSS or shared store implementation.

## Reusable Method

Use for a bounded reversible presentation change when failure is recoverable. Prefer pending-until-confirmed behavior for irreversible or high-consequence actions.

### State Model And Ownership

The cache owns base; the operation owns an overlay and ID. The displayed value is base plus overlay. This minimal example permits one edit at a time; concurrent mutations require ordered overlays or per-entity serialization.

### Transitions

| Event and precondition | Next state | Effect or invariant |
| --- | --- | --- |
| Begin mutation while idle | Overlay pending | Display prediction without rewriting base |
| Matching rejection | Overlay removed | Reveal current base, not an old whole-cache snapshot |
| Matching acknowledgement | Base becomes server value | Remove overlay atomically |
| Uncertain outcome | Reconciliation required | Do not announce rollback of the server |

### Minimal Executable Example

Run this standalone JavaScript block with Node.js 22 or newer, or run all pattern examples from a repository checkout with `npm run test:state-management`. The assertions exercise the local model, not a browser or backend.

```js
import assert from "node:assert/strict";
let base = { name: "Before", revision: 1 }, overlay = null, serial = 0;
const view = () => overlay ? { ...base, name: overlay.name } : base;
function begin(name) {
  if (overlay) return null;
  overlay = { id: ++serial, name };
  return overlay.id;
}
function settle(id, accepted) {
  if (overlay?.id !== id) return;
  if (accepted) base = accepted;
  overlay = null;
}
const a = begin("Predicted");
assert.equal(view().name, "Predicted");
base = { name: "Remote", revision: 2 }; // A newer authoritative observation.
settle(a, null); // Definitive rejection, not an ambiguous timeout.
assert.equal(view().name, "Remote");
const b = begin("Next");
settle(a, null);
assert.equal(view().name, "Next");
settle(b, { name: "Normalized", revision: 3 });
assert.equal(view().name, "Normalized");
```

### What Breaks If Removed

Restoring a whole-cache snapshot on failure can erase unrelated or newer remote changes. Without correlation, an old failure can remove a newer optimistic operation.

### Composition And Substitution

Compose with [single flight](single-flight.md) for this serialized model. Use [ID selection](id-selection.md) for row mutations. Define version ordering before admitting concurrent acknowledgements into a shared cache.

## Opinionated Guidance

Separate a definitive rejection from a lost response: a timeout may have committed remotely. Reconcile uncertain results before promising the change was undone.

## Platform-Specific Guidance

Keep pending and error information available beyond color or animation. A disappearance animation must not decide whether the underlying entity exists.

## Unsupported Absolutes

An inverse UI patch is not a backend undo protocol. The sample does not implement concurrent multi-writer revision arbitration.

## Verification Contract

- Reject a speculative edit after a newer base arrives; preserve the newer base.
- Deliver an old failure during a new edit; retain the new overlay.
- Return a normalized server value and verify it replaces the prediction.

Record actual outcomes separately using the [verification matrix](../verification.md).

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](../index.md).
Next: [Continue the state management route](../recipes/index.md).
