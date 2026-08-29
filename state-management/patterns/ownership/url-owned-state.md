---
type: State Management Pattern
title: URL-Owned State
description: Make safe navigable state authoritative in the URL.
domain: state-management
lifecycle: experimental
provenance_kind: local
category: ownership
primary_state_problem: navigation, reload, bookmarking, and sharing must reproduce state
---

# URL-Owned State

## Repository Boundary

This pattern owns navigable application state encoded in a URL. It does not define route layout, browser styling, secret transport, server authorization, or a particular routing library.

## Reusable Method

- Owner: the current navigation entry and its normalized route/query representation.
- Suitable values: search terms, filters, sort order, pagination cursor when share-safe, selected public resource, and active subroute.
- Lifetime: navigation history plus any external sharing or bookmark lifetime.
- Writers: explicit navigation events that serialize a complete accepted value.
- Readers: route parsing and views derived from the normalized value.
- Invariant: the rendered navigable state can be reconstructed from the URL and declared external authority.
- Recovery: invalid or obsolete values normalize to a documented fallback without navigation loops.

## Opinionated Guidance

Treat the URL as authority for committed navigable state while allowing a separate local draft for text that should not navigate on every edit.

## Platform-Specific Guidance

History push versus replace, encoding limits, browser back/forward behavior, server rendering, and hydration are browser-specific contracts and must be tested where claimed.

## Unsupported Absolutes

Do not put secrets, high-volume documents, volatile UI details, or values that cannot be safely shared into a URL merely to avoid another owner.

## Verification Contract

Verify direct entry, reload, back, forward, copied URL, missing parameter, malformed value, obsolete value, encoding, and server/client interpretation when server rendering is used.

## Composition Notes

Compose with [Server-State Cache](server-state-cache.md) when URL parameters key a remote query and with [Local Draft State](local-draft-state.md) when edits are committed to navigation only on submit.

## Anti-patterns

- Mirroring URL parameters into a writable store with bidirectional effects and no authority rule.
- Serializing sensitive or unbounded values.
- Updating history for transient keystrokes without defining back-button behavior.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery pattern.
- No upstream source fields apply.
- Browser behavior references: [HTML Standard navigation and session history](https://html.spec.whatwg.org/multipage/nav-history-apis.html) and [MDN Working with the History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API).

## IA Navigation

Parent: [State Management Patterns](../index.md).
Next: [Server-State Cache](server-state-cache.md).
