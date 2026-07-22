---
type: Evidence Reference
title: Consumer Migration Evidence
description: Evidence channels and claim boundaries for consumer migration readiness.
---

# Consumer Migration Evidence

Consumer migration evidence is a linked chain, not a single screenshot or successful validator invocation.

## Evidence Channels

| Channel | Supports | Does not support by itself |
| --- | --- | --- |
| Conformance schema and validator | The record is closed, all thirteen dimensions are explicit, paths are safe, and references are internally consistent. | The behavior inventory is complete or the product is correct. |
| Unit and integration scenarios | Named observable behavior passed at the pinned source digest and zero exit. | Browser layout, visual quality, or untested behavior. |
| Browser matrix | Named viewport, container, content, state, overlay, page-scale, focus, overflow, contrast, and semantic assertions passed in the executed browser. | Complete accessibility, usability, or cross-browser equivalence. |
| Page-evidence session | Artifacts came from one source-bound session and match the finalized manifest hashes and identities. | Independent provenance, design approval, or truth outside the declared run. |
| Adoption mapping | A pinned StyleGallery anchor was interpreted as a named local decision for a concrete consumer target. | Universal adoption or permission to import product styling into Layout. |
| Freshness audit | Evidence is within its declared advisory or blocking review window. | Continued correctness after source or environment changes. |
| Human review | A named reviewer evaluated the inventory, exclusions, deviations, debt, and claim boundary. | Facts outside the recorded review method and scope. |

## Page Evidence Matrix

When page evidence applies, execute widths `320`, `375`, `768`, `1024`, and `1440` pixels. Cover tight, medium, roomy, and full-width containers; empty, short, long, and unbroken content; applicable interactive states and overlays; and declared page-scale changes. Assert logical focus, absence of unusable overflow, sufficient computed contrast, and semantic landmarks in the live page.

Raster capture is review material. Deterministic computed and semantic assertions are the blocking evidence. Platform-specific screenshots remain nonblocking unless a separately approved platform baseline contract says otherwise.

## Source And Session Binding

Create the page session before capture and finalize only from a clean, unchanged source inventory. A completed manifest must preserve the consumer repository and revision, exact relevant-source paths and digests, intended browser scenario IDs, run ID, session ID, runner exit, artifact paths, byte counts, dimensions where relevant, and SHA-256 hashes. Reject cross-revision, cross-run, cross-session, missing, extra, changed, symlinked, escaped, or replayed artifacts.

For unit and integration evidence, the stored result must be structurally equivalent JSON to the result created by the declared Node `argv` in an isolated checkout of the pinned consumer revision. The governed Node permission boundary denies descendant processes, workers, native addons, and WASI; an `argv` cannot weaken those denials. Whitespace and object-key order may differ; parsed values may not. A prewritten receipt, a zero-exit no-op, current-worktree dependencies, and caller CI identity variables are not runtime proof.

## Claim Boundary

A passing record supports: “the named migration scenarios and evidence agree with this declared contract at these pinned revisions.” It cannot support: “the product is fully accessible,” “all behavior is preserved,” “the design is correct,” “StyleGallery certifies this consumer,” or “this local decision is a shared standard.”

## IA Navigation

Parent: [Evidence References](index.md).
Next: [Consumer Migration Readiness](../../design-engineering/consumer-migration-readiness.md).
