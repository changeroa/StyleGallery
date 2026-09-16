---
type: Domain Guide
title: Versioned And Scoped State Restore
description: Restore persisted preferences only when their schema and ownership scope are valid.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Versioned And Scoped State Restore

## Repository Boundary

Restore persisted preferences only when their schema and ownership scope are valid. This pattern belongs to Design Engineering and adds no Layout CSS or shared store implementation.

## Reusable Method

Use for intentional persistence of non-sensitive preferences or drafts with a declared retention policy. Keep state in memory if cross-session recovery has no user value.

### State Model And Ownership

The persistence adapter owns a versioned envelope and scope key. Decoding validates shape and allowed values before applying. This example rejects old versions; migration is a separate explicit function. Current user edits outrank a late restore.

### Transitions

| Event and precondition | Next state | Effect or invariant |
| --- | --- | --- |
| Read valid current-scope record | Restored values | Apply only before later local edits |
| Malformed, old, or wrong-scope record | Defaults | Preserve current usable state |
| Write fails | In-memory state retained | Expose persistence failure where recovery matters |
| Logout or scope change | New scoped state | Do not reuse another account's envelope |

### Minimal Executable Example

Run this standalone JavaScript block with Node.js 22 or newer, or run all pattern examples from a repository checkout with `npm run test:state-management`. The assertions exercise the local model, not a browser or backend.

```js
import assert from "node:assert/strict";
function restore(raw, scope) {
  try {
    const record = JSON.parse(raw);
    if (!record || record.version !== 1 || record.scope !== scope) return "compact";
    return ["compact", "comfortable"].includes(record.density) ? record.density : "compact";
  } catch { return "compact"; }
}
const raw = JSON.stringify({ version: 1, scope: "account:A", density: "comfortable" });
assert.equal(restore(raw, "account:A"), "comfortable");
assert.equal(restore(raw, "account:B"), "compact");
assert.equal(restore("{broken", "account:A"), "compact");
assert.equal(restore(JSON.stringify({ version: 0 }), "account:A"), "compact");
let editRevision = 0, density = "compact";
const restoreStartedAt = editRevision;
density = "comfortable"; editRevision++;
if (editRevision === restoreStartedAt) density = restore(null, "account:A");
assert.equal(density, "comfortable");
```

### What Breaks If Removed

Blind JSON parsing can crash startup. An unscoped storage key leaks settings across accounts. Applying a delayed restore unconditionally overwrites edits made while storage was loading.

### Composition And Substitution

Use [identity reset](identity-reset.md) for account changes. Persist only source values from [derived state](derived-state.md); do not restore loading flags, request IDs, or obsolete cached errors.

## Opinionated Guidance

Choose migration, expiry, and multi-tab conflict policies before persisting. A version field without a decoder or migration rule is not a compatibility strategy.

## Platform-Specific Guidance

Browser storage access and writes can throw or be unavailable; guard the adapter as well as parsing. Server rendering cannot read browser storage. Define hydration fallback and cross-tab event handling separately.

Platform reference: [MDN API documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), checked 2026-09-16. This supports the named browser boundary; the model and product policy remain local synthesis.

## Unsupported Absolutes

Persistence does not guarantee availability, confidentiality, or synchronization across devices.

## Verification Contract

- Decode corrupt, missing, old-version, and wrong-account records; use valid defaults.
- Edit before an asynchronous restore finishes; preserve the edit.
- Simulate unavailable storage and quota failure; keep the screen usable.

Record actual outcomes separately using the [verification matrix](../verification.md).

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](../index.md).
Next: [Continue the state management route](../recipes/index.md).
