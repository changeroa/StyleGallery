---
type: State Management Guide
title: State Management Decision Tree
description: Question-driven route from state authority and lifetime to patterns and recipes.
domain: state-management
lifecycle: experimental
provenance_kind: local
---

# State Management Decision Tree

## Repository Boundary

This tree classifies runtime state responsibilities. It does not choose a UI layout, animation, backend schema, or product-specific business invariant.

## Reusable Method

### Can the value be computed from authoritative inputs?

- Yes: use [Derived State](../patterns/derivation/derived-state.md).
- No: continue and name why the value must be stored.

### Must navigation, reload, bookmarking, or sharing reproduce it?

- Yes, and it is safe and reasonably compact: consider [URL-Owned State](../patterns/ownership/url-owned-state.md).
- No: continue.

### Does a remote system remain authoritative?

- Yes: use a [Server-State Cache](../patterns/ownership/server-state-cache.md).
- If the UI must respond before acknowledgement: compose [Optimistic Mutation](../patterns/synchronization/optimistic-mutation.md).

### Is the value an incomplete user edit?

- Yes: use [Local Draft State](../patterns/ownership/local-draft-state.md) and name submit, discard, and reset events.

### Are some combinations or transitions illegal?

- Yes: use an [Explicit Transition Model](../patterns/transitions/explicit-transition-model.md).
- No: a simpler owner with named writers may be sufficient.

### Can more than one writer update the value?

- Yes: declare ordering, conflict detection, merge or overwrite policy, and recovery before implementation.
- No: preserve the single-writer boundary and avoid mirrored mutable copies.

### Does the problem match a common composition?

- Navigable filters plus remote results: [Search And Filter](../recipes/search-and-filter.md).
- Incomplete edits against an accepted baseline: [Editable Form](../recipes/editable-form.md).
- Immediate list feedback before remote acknowledgement: [Optimistic List](../recipes/optimistic-list.md).

## Opinionated Guidance

If a value fits more than one category, split its responsibilities rather than assigning one store every role. A search box can have a local draft while the committed query belongs to the URL and results remain server-owned.

## Platform-Specific Guidance

URL ownership applies to navigation-capable surfaces. Other platforms should map the same responsibility to an explicit navigation or document-state mechanism instead of imitating browser APIs.

## Unsupported Absolutes

The tree does not prove that a selected library, cache duration, persistence mechanism, or conflict strategy is universally correct.

## Verification Contract

Record the chosen branch and at least one rejected branch in the [State Brief](state-brief.md). Verify the owner and reset boundary before testing implementation details.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery method.
- No upstream source fields apply.

## IA Navigation

Parent: [State Management](../index.md).
Next: [State Brief](state-brief.md).
