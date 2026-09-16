---
type: Domain Guide
title: Single Flight And Duplicate Submission
description: Apply an explicit policy to repeated activation of one pending operation.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Single Flight And Duplicate Submission

## Repository Boundary

Apply an explicit policy to repeated activation of one pending operation. This pattern belongs to Design Engineering and adds no Layout CSS or shared store implementation.

## Reusable Method

Use when a duplicate Save or Delete should share or ignore the active attempt. Independent entities may need separate flight keys. A queue is preferable when every intent must execute.

### State Model And Ownership

The operation owner holds one pending promise per declared scope. This example shares it. The guard is set before the effect begins and clears on success or failure.

### Transitions

| Event and precondition | Next state | Effect or invariant |
| --- | --- | --- |
| Activate while idle | One pending operation | Run effect once |
| Activate while pending | Same pending operation | Return same promise |
| Settle | Idle | Release guard on success and failure |

### Minimal Executable Example

Run this standalone JavaScript block with Node.js 22 or newer, or run all pattern examples from a repository checkout with `npm run test:state-management`. The assertions exercise the local model, not a browser or backend.

```js
import assert from "node:assert/strict";
let pending = null, calls = 0;
function run(effect) {
  if (pending) return pending;
  pending = Promise.resolve().then(effect).finally(() => { pending = null; });
  return pending;
}
let release;
const effect = () => { calls++; return new Promise(resolve => { release = resolve; }); };
const a = run(effect), b = run(effect);
assert.equal(a, b);
await Promise.resolve();
assert.equal(calls, 1);
release("saved");
await a;
await assert.rejects(run(() => { throw new Error("offline"); }));
assert.equal(pending, null);
assert.equal(await run(() => "retry"), "retry");
```

### What Breaks If Removed

Disabling only the visible button misses keyboard submission or another caller. Setting pending after awaiting the effect permits two operations. Clearing only on success locks the action after a failure.

### Composition And Substitution

Use with [submitted snapshot](submitted-snapshot.md); duplicate activation must not silently replace the captured snapshot. For separate rows, scope the guard by stable entity ID.

## Opinionated Guidance

Pick ignore, share, queue, or replace deliberately. This example shares a result and does not implement queuing. After an ambiguous write failure, reconcile or use server-supported idempotency before retrying.

## Platform-Specific Guidance

Handle every caller's rejection and expose progress through accessible status. UI disabled semantics do not replace the operation guard.

## Unsupported Absolutes

One client promise cannot prevent another tab, device, or retry from executing the same server command.

## Verification Contract

- Activate from two entry points in the same turn; effect count remains one.
- Fail the operation; a subsequent explicit attempt can start.
- For per-entity scope, verify different entities do not block each other.

Record actual outcomes separately using the [verification matrix](../verification.md).

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](../index.md).
Next: [Continue the state management route](../recipes/index.md).
