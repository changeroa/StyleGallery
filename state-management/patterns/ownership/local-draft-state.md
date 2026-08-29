---
type: State Management Pattern
title: Local Draft State
description: Keep incomplete user edits separate from the last accepted baseline.
domain: state-management
lifecycle: experimental
provenance_kind: local
category: ownership
primary_state_problem: incomplete edits need a temporary owner and explicit commit or discard behavior
---

# Local Draft State

## Repository Boundary

This pattern owns temporary editable values before acceptance. It does not define form layout, field styling, validation wording, server persistence, or a framework form API.

## Reusable Method

- Owner: the smallest feature or form boundary that can commit or discard the draft.
- Source of truth: the draft owns current editable input; an accepted baseline remains separate.
- Lifetime: from draft creation until commit, discard, reset, or owner removal.
- Readers: fields, validation logic, dirty-state indicators, and submit eligibility.
- Writers: named input events, import/reset actions, commit acknowledgement, and discard.
- Invariant: editing the draft must not silently mutate the accepted baseline.
- Failure: a rejected commit preserves or reconciles the draft by an explicit rule.

Framework-neutral state shape:

```txt
baseline
draft
status: pristine | dirty | submitting | rejected
last_error
```

## Opinionated Guidance

Keep the draft local unless multiple independent surfaces genuinely co-edit it. Derive `dirty` from baseline and draft when comparison is reliable instead of maintaining another writable flag.

## Platform-Specific Guidance

Persistence across reload, suspension, or process death is a separate decision. If enabled, declare serialization, expiry, sensitive-field exclusions, and migration behavior.

## Unsupported Absolutes

Local ownership does not mean component memory is always sufficient, and it does not prohibit shared drafts when the user task spans routes or windows.

## Verification Contract

Verify initial baseline, edit, reset, discard, successful commit, rejected commit, owner remount, and any claimed restoration path. Confirm that stale submission results cannot replace a newer draft.

## Composition Notes

Compose with [Explicit Transition Model](../transitions/explicit-transition-model.md) when submit, retry, and discard combinations become constrained. Use the [Editable Form](../../recipes/editable-form.md) recipe for a complete flow.

## Anti-patterns

- Mutating accepted data on every keystroke without declaring autosave semantics.
- Keeping draft, dirty flag, and submitted payload as independent mutable copies.
- Resetting a draft because an unrelated parent rerendered or cache refreshed.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery pattern.
- No upstream source fields apply.

## IA Navigation

Parent: [State Management Patterns](../index.md).
Next: [URL-Owned State](url-owned-state.md).
