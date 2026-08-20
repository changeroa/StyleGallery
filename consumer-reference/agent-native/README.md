---
type: Interface Guide
title: Agent-Native StyleGallery
description: Machine-facing identity, query, execution, protocol-projection, and governed-learning contracts for StyleGallery.
---

# Agent-Native StyleGallery

Primary role: machine interface guide.

Agent-Native StyleGallery lets a person, script, or agent inspect the governed StyleGallery knowledge graph without learning repository paths first. The Markdown corpus remains the human-readable source material; the agent-native layer gives its governed fixture records stable identities, closed schemas, deterministic operations, and protocol-specific projections.

This is shared non-domain infrastructure. It does not add a seventh StyleGallery domain, make example profiles canonical, or allow an MCP client to mutate repository knowledge.

## Mental Model

| Layer | Contract |
| --- | --- |
| Identity | A `StableRef` names a logical object. A `VersionID` binds that StableRef to canonical content bytes. Changing governed content creates a different VersionID. |
| Knowledge | Claim, Evidence, Validation, Governance, and Policy records remain separate. Validation or governance never erases contradictory evidence. |
| Operations | One registry defines operation names, schemas, effect class, idempotency, capability requirements, adapters, and `read_only` metadata. |
| Execution | Task records preserve intent; Run records represent attempts; Effects record observable side effects; Receipts bind normalized inputs, outputs, policy decisions, and effects. |
| Retrieval | View snapshots and context packages are deterministic, bounded, and provenance-linked. Retrieval does not assert truth or mutate the registry. |
| Learning | Proposal, independent verification, governance decision, and promotion are distinct immutable records. Nothing is promoted automatically. |
| Protocols | CLI and MCP derive their read surfaces from the same registry, and their overlapping operations are fixture-equivalent. A2A projects Task state; AG-UI projects ordered Run events. Protocol IDs correlate with, but never replace, domain IDs. |

The canonical fixture and operation inventory is [registry.json](registry.json). Closed machine-readable contracts start at [schema/agent-native.schema.json](schema/agent-native.schema.json).

## CLI

Run the CLI from the repository root:

```sh
npm run sg -- discover --format json
npm run sg -- resolve sg:profile/editorial-reference-profile --format json
npm run sg -- claims sg:profile/editorial-reference-profile --format json
npm run sg -- context sg:profile/editorial-reference-profile --format json
npm run sg -- ops --format json
```

The executable can also be invoked directly:

```sh
./scripts/sg.mjs discover --format json
```

All machine-mode results are deterministic JSON on stdout. A failed request returns `{ "ok": false }`, a stable failure code, and a nonzero exit status.

### Commands

| Command | Use |
| --- | --- |
| `discover` | Read the self-description, immutable manifest identity, conformance receipt, protocol surfaces, and operation summaries. |
| `resolve <StableRef-or-VersionID>` | Resolve one immutable fixture record. Supplying a VersionID requires an exact version match. |
| `claims <StableRef>` | Inspect related Claim, Evidence, Validation, Governance, and Policy records without collapsing them into one status. |
| `context <StableRef>` | Build a deterministic, bounded context package with a snapshot, member manifest, policy, and cache key. |
| `ops` | List all operation specifications, including internal governed mutations and their exposure metadata. |

## Governed Material v2

Material v2 is an isolated, read-only interface over admitted Markdown. Use `sg-material discover`, `search`, `get`, and `context`, or the equivalent `material-*` tools exposed by `stylegallery-material-mcp`. It does not merge material with v1 trust records or expand the admission policy.

Search keeps the fixed field weights `title: 16`, `path: 8`, and `body: 1`. For a multi-token query, each field contribution is multiplied by `ceil(material_count / max(1, token_document_frequency))` so a specific, uncommon term such as `sticky` is not outranked by a corpus-wide term such as `layout`. Results expose the document frequency and multiplier for every normalized query token; ties remain ordered by projected StableRef. `--paths-only` preserves the same ranking while returning repository-relative paths.

```sh
sg-material search --query "sticky layout" --paths-only --limit 5
stylegallery-material search --query "design terminology source kinds" --paths-only --limit 5
```

## MCP

Start the stdio MCP server with:

```sh
npm run sg:mcp
```

An MCP client can launch it directly:

```json
{
  "mcpServers": {
    "stylegallery": {
      "command": "node",
      "args": ["/absolute/path/to/StyleGallery/scripts/sg-mcp.mjs"]
    }
  }
}
```

The MCP surface is read-only. It derives exposed tools from the same registry used by the CLI and accepts only operations marked `read_only: true` with `effect_class: "NONE"`.

Read-only tools:

- `discover`
- `resolve`
- `claims`
- `context`
- `ops`
- `retrieve`

Resources:

- `sg://self` - self-description and conformance profile
- `sg://manifest` - immutable fixture manifest
- `sg://object/{encoded StableRef}` - one record resolved through the common registry

Registered mutation operations such as `proposal.create`, `proposal.verify`, `proposal.decide`, `proposal.promote`, `task.create`, `run.start`, `effect.record`, and `effect.reconcile` are deliberately absent from MCP.

## Internal Governed Operations

The eight mutation operations are pure internal reducers. They validate and return new immutable records; they do not persist files, alter the fixture registry, or make external calls automatically.

Code that intentionally owns governance and persistence can invoke the common registry:

```js
import { invokeRegistryOperation } from "../../scripts/agent-native/registry.mjs";

const result = invokeRegistryOperation("task.create", {
  stable_ref: "sg:task/example",
  intent: { operation: "resolve" },
  required_result: { type: "profile_projection" }
});
```

Capabilities deny by default when no operation scope is granted. An external effect without a durable connector receipt remains `UNCERTAIN`; only receipt-backed reconciliation may mark it `COMMITTED`.

## Conformance And Trust Boundary

`discover` reports `fixture_verified` only when an immutable execution receipt:

- binds the executable fixture StableRef and VersionID;
- records the exact command and canonical result digest;
- carries a passing validator identity and version; and
- has a VersionID that matches its own canonical content.

This proves fixture-level executable conformance. It does not claim production authorization, remote transport security, exactly-once external effects, or independent organizational review.

## A2A And AG-UI

- A2A exposes an Agent Card and projects StyleGallery Task states to A2A v1 task states.
- AG-UI projects a Run into ordered `RUN`, text, tool, state, and terminal events.
- Protocol bindings keep A2A/AG-UI identifiers separate from StyleGallery Task and Run identifiers.

These are projections, not additional sources of business logic. The operation registry and execution records remain canonical.

## Verification

Run the complete agent-native contract suite:

```sh
npm run test:agent-native
```

The suite covers identity and manifest tampering, epistemic separation, capability denial, receipt-derived effect state, causal DAG cycles, governed-learning forgery, CLI behavior, real MCP SDK transport, CLI-to-MCP equivalence, schemas, A2A, AG-UI, retrieval, and conformance receipts.

When root routing or this governance entry changes, also run:

```sh
node scripts/validate-links.mjs --json
node scripts/validate-ia.mjs --json
node scripts/validate-governance.mjs --json
```

## Navigation

Parent: [Consumer Reference](../index.md).
Next: [Repository governance](../../GOVERNANCE.md).
