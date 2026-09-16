---
type: Domain Guide
title: Single Owner And Controlled Inputs
description: Keep one authoritative value when several controls edit the same setting.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Single Owner And Controlled Inputs

## Repository Boundary

Keep one authoritative value when several controls edit the same setting. This pattern belongs to Design Engineering and adds no Layout CSS or shared store implementation.

## Reusable Method

Use when sibling or nested controls must agree immediately. Keep a private disclosure local when no other surface needs its value. Choose the nearest owner that survives every participating control.

### State Model And Ownership

The owner stores `value`; controls receive it and emit an intent. Temporary text composition may stay local, but must have an explicit commit/reset boundary. Owner validation can reject an intent without creating a second accepted value.

### Transitions

| Event and precondition | Next state | Effect or invariant |
| --- | --- | --- |
| Control proposes an allowed value | Owner replaces value | All readers observe the same accepted value |
| Control proposes an invalid value | Unchanged | Return rejection; do not pretend the value committed |
| Owner resets externally | New owner value | Every controlled reader reflects reset |

### Minimal Executable Example

Run this standalone JavaScript block with Node.js 22 or newer, or run all pattern examples from a repository checkout with `npm run test:state-management`. The assertions exercise the local model, not a browser or backend.

```js
import assert from "node:assert/strict";
let value = "compact";
function propose(next) {
  if (!["compact", "comfortable"].includes(next)) return false;
  value = next;
  return true;
}
const toolbar = { read: () => value, change: propose };
const settings = { read: () => value, change: propose };
assert.equal(toolbar.change("comfortable"), true);
assert.equal(settings.read(), "comfortable");
assert.equal(settings.change("invalid"), false);
assert.equal(toolbar.read(), "comfortable");
value = "compact";
assert.equal(settings.read(), "compact");
```

### What Breaks If Removed

If each control copies the initial value into its own accepted state, changing the toolbar leaves settings stale. Synchronizing both copies with reciprocal callbacks introduces a second ordering problem.

### Composition And Substitution

Compose with [derived state](derived-state.md) for summaries and [identity reset](identity-reset.md) for account changes. A framework context or store can transport this owner; it does not decide who owns the value.

## Opinionated Guidance

Name the write API as an intent when the owner may reject or normalize it. Distinguish a local editing buffer from the accepted value in component inputs.

## Platform-Specific Guidance

Native controls still need accessible names and correct value semantics. Preserve IME composition when adapting text inputs; do not normalize every keystroke without an input contract.

## Unsupported Absolutes

A shared owner does not require an application-wide store or prove efficient subscriptions.

## Verification Contract

- Edit from either control, then reset from the parent; both readers must agree.
- Reject an invalid intent and verify the UI exposes the rejection.
- Remove and recreate one reader; it must receive the current value.

Record actual outcomes separately using the [verification matrix](../verification.md).

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](../index.md).
Next: [Continue the state management route](../recipes/index.md).
