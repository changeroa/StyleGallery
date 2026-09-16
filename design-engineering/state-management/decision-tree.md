---
type: Domain Guide
title: State Management Decision Tree
description: Route UI state problems to the smallest ownership or transition contract.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# State Management Decision Tree

## Repository Boundary

This route selects consumer behavior within Design Engineering. It does not choose a global store or redefine Layout patterns.

## Reusable Method

| Question | Route | Decision to record |
| --- | --- | --- |
| Can the value be calculated from current inputs? | [Derived state](patterns/derived-state.md) | Source inputs and equality/invalidation |
| Do several controls write one accepted value? | [Single owner](patterns/single-owner.md) | Nearest surviving owner and intent API |
| Does selection change when rows reorder? | [ID selection](patterns/id-selection.md) | Stable identity and missing-item policy |
| Must edits survive Cancel or a failed save? | [Draft and baseline](patterns/draft-and-baseline.md) | Draft owner and baseline meaning |
| Can editing continue during saving? | [Submitted snapshot](patterns/submitted-snapshot.md) | Captured data and acknowledgement identity |
| Can leaving discard work? | [Unsaved navigation](patterns/unsaved-navigation.md) | Cancel, discard, and save-and-leave policy |
| Can replaceable reads finish out of order? | [Latest request wins](patterns/latest-request-wins.md) | Result acceptance identity |
| Can an operation be activated repeatedly? | [Single flight](patterns/single-flight.md) | Share, ignore, queue, or replace |
| Should a change appear before acknowledgement? | [Optimistic overlay](patterns/optimistic-overlay.md) | Rollback scope and uncertain outcome recovery |
| Should Back, reload, and links restore the view? | [URL state](patterns/url-state.md) | Committed route versus input buffer |
| Is the screen reused for another identity? | [Identity reset](patterns/identity-reset.md) | Generation and cleanup scope |
| Must state survive a new session? | [Versioned restore](patterns/versioned-restore.md) | Schema, account scope, migration and retention |

These questions can select several patterns. For search, first separate the input buffer from the committed URL, then attach a latest-wins request owner and selected ID. The [search recipe](recipes/search-detail.md) defines the joint contract.

Before adding another pattern, name a failure the existing set cannot express. Put a new combination in a recipe; add a primitive only when its owner or invariant is independently reusable.

## Opinionated Guidance

Choose the failure and lifetime before the library. A cache, URL, form buffer, and session preference may share a screen without sharing an owner.

## Platform-Specific Guidance

Transport cancellation, router guards, and storage hooks vary by framework and runtime. Record those adapter choices in the brief instead of assuming the abstract model implements them.

## Unsupported Absolutes

A decision tree is not an exhaustive treatment of offline replication, collaboration, or server transactions. Escalate those requirements to a separately specified consistency protocol.

## Verification Contract

Try routing a stale search result, lost edit, and wrong-account restore. Each must reach a named pattern and concrete failure trace. Revisit when two routes prescribe conflicting owners.

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](index.md).
Next: [Continue the state management route](state-brief.md).
