# Consumer Reference

Primary role: shared non-domain infrastructure index.

`consumer-reference/` is shared infrastructure for schema, provenance, routing, and evidence metadata. It is not a fifth StyleGallery domain and owns no profile values, visual defaults, component implementation, state behavior, product CSS, or brand authority.

## Scope Boundary

In scope: the receiver contract, JSON schema, validator fixtures, path-safety rules, ownership truth, and evidence boundaries.

Out of scope: profiles, themes, components, browser runtime, decorative styling, and claims of independent adoption.

## Documents

- [Receiver contract](contract.md) - Required handoff shape, record-path boundary, lifecycle fields, ownership truth, and dependency direction.
- [Consumer reference item schema](schema/item.schema.json) - Machine-readable shape for the current receiver item.
- [Promotion RFC schema](schema/promotion-rfc.schema.json) - Closed JSON shape for deferred or rejected invariant-promotion proposals.
- [Shared-experimental promotion policy](policies/shared-experimental.json) - Count scope, normative bypass, lifecycle, and zero-promotion claim boundary.
- [Chromium calibration schema](schema/calibration-record.schema.json) - Immutable environment, repetition, and evidence-cardinality contract for the proposed nonblocking sentinel.
- [Chromium baseline manifest schema](schema/baseline-manifest.schema.json) - Exact proposed source, baseline, platform, and calibration routing contract.
- `baselines/` - Proposed Chromium geometry baseline metadata and a pending committed-CI calibration record; these files do not constitute baseline-owner approval.
- `fixtures/` - Related validator fixtures; they are not adopters or product references.

## IA Navigation

Parent: [StyleGallery](../index.md).
Next: [Consumer Reference Receiver Contract](contract.md).
