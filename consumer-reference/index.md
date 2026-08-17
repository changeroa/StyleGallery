# Consumer Reference

Primary role: shared non-domain infrastructure index.

`consumer-reference/` is shared infrastructure for schema, provenance, routing, and evidence metadata outside the five-domain contract. It owns no profile values, visual defaults, component implementation, state behavior, product CSS, or brand authority.

## Scope Boundary

In scope: the receiver contract, JSON schema, validator fixtures, path-safety rules, ownership truth, evidence boundaries, and the agent-native read/query interface over governed records.

Out of scope: profiles, themes, components, browser runtime, decorative styling, automatic truth or promotion, and claims of independent adoption.

## Documents

- [Receiver contract](contract.md) - Required handoff shape, record-path boundary, lifecycle fields, ownership truth, and dependency direction.
- [Agent-Native StyleGallery](agent-native/README.md) - Frozen v1 identity/trust, isolated material v2, CLIs/MCPs, four-plane boundaries, extensions, lifecycle decisions, and archive retrieval.
- [Agent-native v1 registry](agent-native/registry.json) - Canonical frozen fixture and operation inventory consumed by the v1 CLI and MCP adapters; this is the normalized implementation-handoff reference.
- [Material v2 admission policy](agent-native/v2/admission-policy.json), [generated registry](agent-native/v2/material-registry.json), and [schemas](agent-native/v2/schema/material-manifest.schema.json) - Source-bound admitted Markdown for `material-discover`, `material-search`, `material-get`, and `material-context`; no copied prose or profile/default values.
- [Agent-native schemas](agent-native/schema/agent-native.schema.json) - Closed Draft 2020-12 contracts for identity, knowledge, execution, protocol bindings, retrieval, and learning records.
- [Consumer migration conformance schema](schema/consumer-conformance-record.schema.json) - Closed consumer-local record with thirteen explicit migration dimensions, runtime scenarios, adoption mappings, and optional page evidence.
- [Page evidence session schema](schema/page-evidence-session.schema.json) and [manifest schema](schema/page-evidence-manifest.schema.json) - Source-bound capture lifecycle for an applicable migration page.
- [Consumer reference item schema](schema/item.schema.json) - Machine-readable shape for the current receiver item.
- [Promotion RFC schema](schema/promotion-rfc.schema.json) - Closed JSON shape for deferred or rejected invariant-promotion proposals.
- [Shared-experimental promotion policy](policies/shared-experimental.json) - Count scope, normative bypass, lifecycle, and zero-promotion claim boundary.
- [Lifecycle disposition index](policies/lifecycle-dispositions.json) and [schema](schema/lifecycle-disposition.schema.json) - Current owners, deadlines, pending actions, extension retention decisions, caller status, and immutable historical archive retrieval bindings.
- [Chromium calibration schema](schema/calibration-record.schema.json) - Immutable environment, repetition, and evidence-cardinality contract for the proposed nonblocking sentinel.
- [Chromium baseline manifest schema](schema/baseline-manifest.schema.json) - Exact proposed source, baseline, platform, and calibration routing contract.
- `baselines/` - Proposed Chromium geometry baseline metadata and a pending committed-CI calibration record; these files do not constitute baseline-owner approval.
- `fixtures/` - Related validator fixtures; they are not adopters or product references.

## IA Navigation

Parent: [StyleGallery](../index.md).
Next: [Consumer Migration Readiness](../design-engineering/consumer-migration-readiness.md).
