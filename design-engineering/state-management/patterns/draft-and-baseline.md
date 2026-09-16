---
type: Domain Guide
title: Draft And Persisted Baseline
description: Preserve editable work while distinguishing it from the last acknowledged saved value.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Draft And Persisted Baseline

## Repository Boundary

Preserve editable work while distinguishing it from the last acknowledged saved value. This pattern belongs to Design Engineering and adds no Layout CSS or shared store implementation.

## Reusable Method

Use for explicit Save/Cancel forms. For immediate committed toggles, use an operation contract instead of inventing a long-lived draft.

### State Model And Ownership

The form owns a draft, persistence supplies the baseline, and dirty is derived using domain equality. This example uses a single string. A remote update while dirty needs merge, conflict, or reload policy; never silently replace the draft.

### Transitions

| Event and precondition | Next state | Effect or invariant |
| --- | --- | --- |
| Edit | Draft changes | Baseline stays acknowledged |
| Discard | Draft becomes baseline | No persistence request |
| Remote update while dirty | Conflict retained | Keep draft until the user resolves it |

### Minimal Executable Example

Run this standalone JavaScript block with Node.js 22 or newer, or run all pattern examples from a repository checkout with `npm run test:state-management`. The assertions exercise the local model, not a browser or backend.

```js
import assert from "node:assert/strict";
let baseline = "Original";
let draft = baseline;
const dirty = () => draft !== baseline;
draft = "Edited";
assert.equal(dirty(), true);
const remote = "Remote edit";
const conflict = dirty() && remote !== baseline;
assert.equal(conflict, true);
assert.equal(draft, "Edited");
draft = baseline; // Explicit discard, not an automatic refresh.
assert.equal(dirty(), false);
```

### What Breaks If Removed

Binding fields directly to the cached saved object makes Cancel impossible and may tell other readers that unsaved edits are persisted. An independent dirty boolean can remain true after editing back to the baseline.

### Composition And Substitution

[Submitted snapshot](submitted-snapshot.md) owns save acknowledgement. [Unsaved navigation](unsaved-navigation.md) uses dirty as an input. Do not let the router own a second draft.

## Opinionated Guidance

Choose baseline equality and server normalization rules before wiring a generic deep comparison. For nested drafts, prevent shared mutable references to the baseline.

## Platform-Specific Guidance

Use native form labels and validation relationships. Route-level forms may outlive individual fields; unmounting a field should not implicitly discard the form.

## Unsupported Absolutes

A baseline is an acknowledged observation, not a guarantee that nobody else edited the server since then.

## Verification Contract

- Edit then restore the original value; dirty must become false.
- Receive a remote update while dirty; preserve entered values.
- Discard explicitly; restore the acknowledged baseline without sending a save.

Record actual outcomes separately using the [verification matrix](../verification.md).

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](../index.md).
Next: [Continue the state management route](../recipes/index.md).
