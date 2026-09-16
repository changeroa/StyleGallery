---
type: Domain Guide
title: Identity Boundary And Reset
description: Prevent temporary state and pending outcomes from leaking across entity or account changes.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Identity Boundary And Reset

## Repository Boundary

Prevent temporary state and pending outcomes from leaking across entity or account changes. This pattern belongs to Design Engineering and adds no Layout CSS or shared store implementation.

## Reusable Method

Use when a mounted editor is reused for a different document, tenant, or account. Preserve drafts per identity only when that is an explicit product feature.

### State Model And Ownership

The screen owner stores identity and generation. Entering a new identity clears identity-local values and invalidates previous operations. Generation matters even when the user goes A → B → A.

### Transitions

| Event and precondition | Next state | Effect or invariant |
| --- | --- | --- |
| Enter identity | Fresh generation and local state | Invalidate earlier callbacks |
| Matching-generation completion | Apply within current identity | Accept only live work |
| Old-generation completion | Unchanged | Reject even if the entity ID matches again |

### Minimal Executable Example

Run this standalone JavaScript block with Node.js 22 or newer, or run all pattern examples from a repository checkout with `npm run test:state-management`. The assertions exercise the local model, not a browser or backend.

```js
import assert from "node:assert/strict";
let generation = 0, identity = null, draft = "";
function enter(id) { identity = id; generation++; draft = ""; }
function ticket() { return { identity, generation }; }
function receive(t, value) {
  if (t.identity === identity && t.generation === generation) draft = value;
}
enter("A");
const oldA = ticket();
enter("B");
enter("A");
receive(oldA, "stale A");
assert.equal(draft, "");
receive(ticket(), "current A");
assert.equal(draft, "current A");
```

### What Breaks If Removed

Checking entity ID alone accepts the old A request after returning from B to A. Resetting the draft without invalidating requests lets a late response repopulate it.

### Composition And Substitution

Combine [latest request wins](latest-request-wins.md) within each generation and [versioned restore](versioned-restore.md) for explicit per-identity persistence. Apply [unsaved navigation](unsaved-navigation.md) before abandoning dirty work.

## Opinionated Guidance

Define the identity tuple, including tenant when needed. Clear sensitive caches at the session boundary rather than relying solely on component unmount.

## Platform-Specific Guidance

Framework keys can recreate components, but external listeners, caches, timers, and requests still need explicit cleanup. Router reuse may preserve component instances.

## Unsupported Absolutes

A UI reset is not an authorization or secure data-erasure mechanism.

## Verification Contract

- Switch A → B while a read is pending; no A result appears in B.
- Switch A → B → A; reject the first generation's callback.
- Inspect focus, local errors, draft, and subscriptions after switching.

Record actual outcomes separately using the [verification matrix](../verification.md).

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](../index.md).
Next: [Continue the state management route](../recipes/index.md).
