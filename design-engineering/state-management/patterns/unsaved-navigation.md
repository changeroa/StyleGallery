---
type: Domain Guide
title: Unsaved Changes And Navigation
description: Make leaving an edited screen an explicit decision without losing the current draft.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Unsaved Changes And Navigation

## Repository Boundary

Make leaving an edited screen an explicit decision without losing the current draft. This pattern belongs to Design Engineering and adds no Layout CSS or shared store implementation.

## Reusable Method

Use when route changes can discard meaningful user work. Do not interrupt navigation for harmless transient selection or derived values.

### State Model And Ownership

The form owns dirty; the router integration owns a pending destination and guard status. The confirmation owns a decision, not a second copy of form data. Save-and-leave must recheck dirty after acknowledgement.

### Transitions

| Event and precondition | Next state | Effect or invariant |
| --- | --- | --- |
| Navigate while clean | Destination committed | Leave normally |
| Navigate while dirty | Decision pending | Retain current screen and destination |
| Cancel decision | Pending cleared | Stay and return focus |
| Discard decision | Destination committed | Explicitly abandon draft |
| Save fails or later edits remain | Stay | Preserve draft and offer recovery |

### Minimal Executable Example

Run this standalone JavaScript block with Node.js 22 or newer, or run all pattern examples from a repository checkout with `npm run test:state-management`. The assertions exercise the local model, not a browser or backend.

```js
import assert from "node:assert/strict";
let dirty = true, pending = null, location = "editor";
function navigate(to) {
  if (dirty) pending = to;
  else location = to;
}
function decide(choice) {
  if (choice === "cancel") pending = null;
  if (choice === "discard" && pending !== null) {
    dirty = false;
    location = pending;
    pending = null;
  }
}
navigate("list");
decide("cancel");
assert.equal(location, "editor");
assert.equal(dirty, true);
navigate("list");
decide("discard");
assert.equal(location, "list");
assert.equal(pending, null);
```

### What Breaks If Removed

If route mutation happens before the guard, the form may already be destroyed when Cancel runs. If any save success releases navigation, later unsaved edits can still be lost.

### Composition And Substitution

Use [submitted snapshot](submitted-snapshot.md) for Save-and-leave and [URL state](url-state.md) for committed destinations. A pending destination is not a committed URL.

## Opinionated Guidance

Declare what a second navigation attempt does while confirmation is open: this model replaces the destination with the latest attempt. Verify the displayed decision matches it.

## Platform-Specific Guidance

In-app routing and document unload have different capabilities. Browser unload prompts are constrained and unreliable as a sole recovery strategy; use optional draft persistence when needed. Verify keyboard focus entry/return for the confirmation.

Platform reference: [MDN API documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event), checked 2026-09-16. This supports the named browser boundary; the model and product policy remain local synthesis.

## Unsupported Absolutes

An in-memory guard cannot guarantee preservation after process termination or device failure.

## Verification Contract

- Cancel a guarded route change; values and focus return to the editor.
- Attempt another destination while the decision is open; apply the declared policy.
- Save A, edit B, then acknowledge A; do not leave with dirty B.

Record actual outcomes separately using the [verification matrix](../verification.md).

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](../index.md).
Next: [Continue the state management route](../recipes/index.md).
