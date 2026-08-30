---
type: State Management Recipe
title: Editable Form State
description: Compose an accepted baseline, local draft, submit transitions, and recovery.
domain: state-management
lifecycle: experimental
provenance_kind: local
---

# Editable Form State

## Repository Boundary

This recipe owns editable state and submission behavior. Layout owns form structure and scrolling; Design Engineering owns validation presentation and interaction craft; the backend owns acceptance rules and durable data.

## Reusable Method

Recommended pattern stack:

- Essential: [Local Draft State](../patterns/ownership/local-draft-state.md).
- Essential: [Explicit Transition Model](../patterns/transitions/explicit-transition-model.md) for submit, resolve, reject, retry, discard, and reset.
- Helper: [Derived State](../patterns/derivation/derived-state.md) for dirty state, client eligibility, summaries, and dependent choices.
- Substitutable: [Server-State Cache](../patterns/ownership/server-state-cache.md) when the accepted baseline is remotely owned.

Authority map:

```txt
accepted values -> baseline owner
incomplete edits -> local draft
dirty and client eligibility -> derived
submit lifecycle -> explicit transition model
server acknowledgement -> accepted baseline update
```

## Opinionated Guidance

Keep rejected server feedback associated with the submitted version that produced it. Do not erase newer edits when an older submission completes.

## Platform-Specific Guidance

Browser unload prompts, draft restoration, native suspension, and cross-device editing require explicit platform and persistence contracts.

## Unsupported Absolutes

This recipe does not require controlled fields, autosave, global form ownership, or a state-machine library.

## Verification Contract

Verify pristine load, edit, derived dirty state, client-invalid submission, accepted submission, rejected submission, retry, discard, baseline refresh, stale completion, duplicate submission, remount, and any claimed draft restoration.

Rejected alternatives:

- Mutate the server snapshot directly while typing: rejected because incomplete intent becomes indistinguishable from accepted data.
- Independent writable dirty flag: rejected when it can be derived from baseline and draft.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery recipe.
- No upstream source fields apply.

## IA Navigation

Parent: [State Management Recipes](index.md).
Next: [Optimistic List](optimistic-list.md).
