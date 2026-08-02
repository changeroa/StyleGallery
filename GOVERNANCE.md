---
type: Governance Reference
title: Governance, Lifecycle, And Docs-As-Code
description: Source-of-truth, generated artifact, domain, lifecycle, ownership, and stale-content policy for StyleGallery.
scheduled_stale_audit: deferred
scheduled_evidence_audit: active_advisory
---

# Governance, Lifecycle, And Docs-As-Code

Primary role: governance reference.

Use this file before editing repository documentation. It names which file is authoritative, which files are generated, which validators must run, and which review owner should check the change.

## Source Of Truth Matrix

| Doc family | Source of truth | Generator | Generated artifacts | Lifecycle state | Stale trigger | Validator | Review owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Root repository guide | `README.md` | Manual | None | `stable` | Source-of-truth route changes, broken root links, or ownership changes. | `scripts/validate-okf.mjs`, `scripts/validate-links.mjs`, `scripts/validate-ia.mjs`, `scripts/validate-governance.mjs` | Repository governance owner |
| OKF bundle map | `index.md` | Manual | None | `stable` | New root entry, moved concept, broken root links, or ownership changes. | `scripts/validate-okf.mjs`, `scripts/validate-links.mjs`, `scripts/validate-ia.mjs`, `scripts/validate-governance.mjs` | Repository governance owner |
| Agent editing rules | `AGENTS.md` | Manual | None | `stable` | Rule changes, generated-artifact policy changes, or ownership changes. | `scripts/validate-links.mjs`, `scripts/validate-governance.mjs` | Repository governance owner |
| Planning guides | `GUIDE.md`, `guides/*.md` | Manual | None | `stable` | Workflow changes, route changes, source-lineage changes, or broken guide links. | `scripts/validate-okf.mjs`, `scripts/validate-links.mjs`, `scripts/validate-ia.mjs` | Planning-doc owner |
| Layout recipes | `recipes/*.md` | Manual | None | `stable` | Pattern-stack changes, route changes, or broken recipe links. | `scripts/validate-okf.mjs`, `scripts/validate-links.mjs`, `scripts/validate-ia.mjs` | Recipe owner |
| Quality gates and evidence | `quality/**/*.md` | Manual | None | `stable` | Claim-boundary changes, evidence-family changes, or broken quality links. | `scripts/validate-okf.mjs`, `scripts/validate-links.mjs`, `scripts/validate-ia.mjs` | Quality owner |
| Consumer reference contract | `consumer-reference/contract.md`, `consumer-reference/schema/item.schema.json` | Manual | None | `stable` contract with related fixtures | Handoff shape, path boundary, lifecycle, ownership, or dependency-direction changes. | `scripts/validate-consumer-reference.mjs`, `scripts/test-validate-consumer-reference.mjs` | Repository governance owner with Validation owner |
| Agent-native knowledge interface v1 | `consumer-reference/agent-native/registry.json`, `consumer-reference/agent-native/schema/*.json`, `scripts/agent-native/{registry,identity,queries}.mjs`, `scripts/sg.mjs`, `scripts/sg-mcp.mjs` | Manual, with protocol projections derived from one operation registry | Frozen v1 CLI JSON, read-only MCP tools/resources, and compatibility projections | `experimental`, byte-compatible v1 interface | Identity grammar, canonical hashing, registry records, operation metadata, capability/effect semantics, receipt/conformance rules, or retrieval changes. | `npm run test:agent-native` | Repository governance owner with Validation owner |
| Governed material interface v2 | `consumer-reference/agent-native/v2/admission-policy.json`, its closed schemas, and admitted tracked Markdown | `scripts/agent-native/v2/generate-material-registry.mjs` | `consumer-reference/agent-native/v2/material-registry.json`; separate `sg-material` CLI and material MCP | `experimental`, read-only and isolated from v1 | Admission roots/exclusions, source hash, identity, operation inventory, query/context bounds, package exposure, or source drift changes. | `npm run validate:material`, `npm run test:material`, generated drift | Repository governance owner with Validation owner |
| Experimental protocol extensions | `scripts/agent-native/v2/experimental-extension-registry.mjs`, `scripts/agent-native/v2/extensions/*.mjs`, lifecycle extension records | Manual | A2A `1.0` and AG-UI `0.0.57` projections | `experimental`, retained pending owner review | Protocol version, caller inventory, forwarding, migration evidence, or disposition changes. | `scripts/agent-native/v2/test-agent-extension-boundary.mjs`, lifecycle suites | Repository governance owner with protocol and Validation owners |
| Lifecycle dispositions and archives | `consumer-reference/policies/lifecycle-dispositions.json`, its five records, and `consumer-reference/schema/lifecycle-disposition.schema.json` | Manual, with immutable archive receipts | Retrieval metadata for historical sentinel/calibration and page evidence | `pending_owner` for three families; both extensions `retain` | Owner, deadline, caller status, archive object/ref, approval, transition, or post-deadline action changes. | `npm run validate:lifecycle-dispositions`, `npm run test:lifecycle-dispositions` | Repository governance owner with named family owner and Validation owner |
| Portable token source | `consumer-reference/fixtures/token-portability/valid-reference.json`, `consumer-reference/schema/portable-tokens.schema.json` | `scripts/build-reference-artifacts.mjs` with Style Dictionary `5.5.0` | `consumer-reference/generated/tokens.css`, `consumer-reference/generated/manifest.json` | `stable` restricted adapter contract, `generated` output | Allowed token shape, adapter/version pin, source token count, warning, declaration, or content hash changes. | `scripts/validate-reference-artifacts.mjs`, `scripts/test-reference-adapters.mjs` | Repository governance owner with Validation owner |
| Governed local reference profiles | `design-engineering/reference-profiles/governed-local/editorial/profile.json`, `design-engineering/reference-profiles/governed-local/editorial/tokens.dtcg.json`, `design-engineering/reference-profiles/governed-local/editorial/local-foundations.json`, `design-engineering/reference-profiles/governed-local/terminal/profile.json`, `design-engineering/reference-profiles/governed-local/terminal/tokens.dtcg.json`, `design-engineering/reference-profiles/governed-local/terminal/local-foundations.json` | Manual | None | `experimental`, `example_only`, non-default related fixtures | Layout revision, identity values, UA/reset assumptions, explicit selection, or fixture relationship changes. | `scripts/validate-consumer-reference.mjs`, `scripts/test-validate-consumer-reference.mjs` | Design Engineering owner with Validation owner |
| Component-state evidence matrices | Each profile's declared `components/*.component.json`, `states/*.states.json`, `fixtures/*.fixture.json`, and `evidence/*.evidence.json` records | `scripts/generate-consumer-reference-evidence.mjs` | `design-engineering/reference-profiles/governed-local/editorial/generated/state-matrix.md`, `design-engineering/reference-profiles/governed-local/editorial/generated/keyboard-matrix.md`, `design-engineering/reference-profiles/governed-local/editorial/generated/evidence-coverage.md`, `design-engineering/reference-profiles/governed-local/terminal/generated/state-matrix.md`, `design-engineering/reference-profiles/governed-local/terminal/generated/keyboard-matrix.md`, `design-engineering/reference-profiles/governed-local/terminal/generated/evidence-coverage.md` | `generated` output from `experimental` canonical records | Declared record paths, capture-session identity, scenario/mode/channel counts, claim boundary, generated escaping, or generator output changes. | `scripts/validate-component-state.mjs`, `scripts/test-validate-component-state.mjs`, `scripts/test-validate-component-state-artifacts.mjs`, `scripts/test-generate-consumer-reference-evidence.mjs` | Design Engineering owner with Validation owner |
| Consumer migration conformance | `consumer-reference/schema/consumer-conformance-record.schema.json`, `design-engineering/consumer-migration-readiness.md` | Manual | Consumer-owned conformance records | `experimental` method | Method, dimension, scenario, mapping, or ownership changes. | `scripts/validate-consumer-conformance.mjs`, `scripts/test-validate-consumer-conformance.mjs` | Design Engineering owner with Validation owner |
| Consumer page-evidence lifecycle | `consumer-reference/schema/page-evidence-session.schema.json`, `consumer-reference/schema/page-evidence-manifest.schema.json` | Browser/session tooling | Consumer-owned session, runner, manifest, and raster artifacts | `experimental` evidence protocol | Source, revision, session, run, scenario, review deadline, or artifact integrity changes. | `scripts/test-validate-page-evidence.mjs`, deterministic Chromium consumer-conformance job | Validation owner with consumer owner |
| Explicit evidence freshness schedule | Evidence records that declare `expires_at` or `review_by` | `.github/workflows/evidence-freshness.yml` | Advisory JSON audit artifact | `stable` narrow schedule | Explicit deadline, auditor, schedule, or inventory changes. | `scripts/audit-evidence-freshness.mjs`, `scripts/test-audit-evidence-freshness.mjs` | Validation owner |
| Deterministic consumer browser conformance | `tests/consumer-conformance.spec.mjs`, `tests/fixtures/consumer-conformance-scenarios.mjs`, `tests/helpers/render-consumer-conformance.mjs` | Playwright `1.61.0` in the digest-pinned `linux/amd64` image | Optional page-evidence raster artifact | `experimental` contract with blocking semantic gate and nonblocking raster capture | Viewport, container, content, state, overlay, page-scale, focus, overflow, contrast, semantics, or runtime-error changes. | Playwright matrix and `scripts/test-consumer-conformance-sentinel.mjs` | Validation owner with Design Engineering owner |
| Shared promotion policy | `consumer-reference/policies/shared-experimental.json`, `consumer-reference/schema/promotion-rfc.schema.json` | Manual | None; promotion fixtures are synthetic examples | `stable` policy with `example_only`, deferred fixtures | Gateway scope, independence basis, evidence, ownership, support, compatibility, migration, deprecation, rollback, provenance, or decision changes. | `scripts/validate-promotion-rfc.mjs`, `scripts/test-validate-promotion-rfc.mjs` | Repository governance owner with actual consumer, support, migration, rollback, and Validation owners |
| Proposed Chromium sentinel | `tests/helpers/render-consumer-reference.mjs`, `consumer-reference/schema/{baseline-manifest,calibration-record}.schema.json`, `consumer-reference/baselines/*.json` | Playwright `1.61.0` in the digest-pinned `linux/amd64` image | `tests/snapshots/consumer-reference-card-grid.png`, raw GitHub Actions calibration artifact | `experimental`, nonblocking while owner approval is pending | Renderer source, exact image/platform/tool pin, baseline bytes, computed layout contract, or calibration metadata changes. | `scripts/validate-baseline-manifest.mjs`, `scripts/test-validate-baseline-manifest.mjs`, `scripts/test-summarize-sentinel-calibration.mjs`, Playwright | Repository governance owner with Validation owner |
| Domain manifest and scope decision | `DOMAINS.md`, `quality/claim-records/stylegallery-multidomain-scope.md` | Manual | None | `stable` | Domain membership, repository-scope, or provenance-policy changes. | `scripts/validate-domains.mjs`, `scripts/validate-governance.mjs` | Repository governance owner |
| Layout domain hub | `layout/index.md` | Manual | None | `stable` | Layout route or ownership changes. | `scripts/validate-domains.mjs`, `scripts/validate-ia.mjs` | Pattern-data owner |
| Motion domain guidance | `motion/*.md` | Manual | None | `experimental` | Upstream revision, evidence boundary, or guidance changes. | `scripts/validate-domains.mjs` | Motion domain owner |
| Design Engineering domain guidance | `design-engineering/*.md` | Manual | None | `experimental` | Upstream revision, evidence boundary, or guidance changes. | `scripts/validate-domains.mjs` | Design Engineering domain owner |
| Game UI domain guidance | `game-ui/**/*.md` | Manual | None | `experimental` | Classification, hierarchy, engine implementation, evidence boundary, or route changes. | `scripts/validate-domains.mjs` | Game UI domain owner |
| Platform Guides domain guidance | `platform-guides/*.md` | Manual | None | `experimental` | Platform version, upstream revision, evidence boundary, or guidance changes. | `scripts/validate-domains.mjs` | Platform Guides domain owner |
| Pattern data and examples | `scripts/pattern-data.mjs` | Manual data source | `patterns/**/*.md`, `patterns/**/index.md`, `patterns/index.md`, `CATALOG.md` | `generated` output from `stable` source | Source-lineage URL changes, generated drift, category changes, or pattern count changes. | `scripts/validate-patterns.mjs`, `scripts/validate-catalog.mjs`, `scripts/validate-governance.mjs` | Pattern-data owner |
| Pattern generator | `scripts/generate-patterns.mjs` | Manual code source | `patterns/**/*.md`, `patterns/**/index.md`, `patterns/index.md`, `CATALOG.md` | `stable` generator, `generated` output | Generated structure changes, generated-warning changes, or generated metadata changes. | `node -c scripts/generate-patterns.mjs`, generated drift check, `scripts/validate-governance.mjs` | Pattern-data owner |
| Validation scripts | `scripts/validate-*.mjs`, `scripts/test-validate-*.mjs` | Manual code source | CI validation output | `stable` | Validator scope changes, fixture changes, or CI parity changes. | `node -c`, matching fixture tests, `.github/workflows/validate.yml` | Validation owner |
| CI workflows | `.github/workflows/validate.yml`, `.github/workflows/evidence-freshness.yml` | Manual | GitHub Actions runs and audit artifacts | `stable` | Validation step, explicit-deadline schedule, generated drift policy, or owner changes. | GitHub Actions, `scripts/validate-governance.mjs` | Repository governance owner |

## Generated Artifact Policy

Generated files are not source of truth. Do not hand-edit generated artifacts to change pattern content or catalog structure.

- Edit `scripts/pattern-data.mjs` when changing pattern names, categories, source lineage, sample HTML, CSS declarations, responsiveness, or scroll ownership.
- Edit `scripts/generate-patterns.mjs` when changing generated document structure, generated warnings, accessibility contract text, IA navigation text, or catalog layout.
- Regenerate with `node scripts/generate-patterns.mjs`.
- Verify with `git diff --exit-code -- CATALOG.md patterns` after generation.
- Generated artifacts must contain a generated warning that points contributors back to `scripts/generate-patterns.mjs` and `scripts/pattern-data.mjs`.

Current generated artifacts:

- `CATALOG.md`
- `patterns/index.md`
- `patterns/**/index.md`
- `patterns/**/*.md`
- `consumer-reference/generated/tokens.css`
- `consumer-reference/generated/manifest.json`
- `design-engineering/reference-profiles/governed-local/editorial/generated/state-matrix.md`
- `design-engineering/reference-profiles/governed-local/editorial/generated/keyboard-matrix.md`
- `design-engineering/reference-profiles/governed-local/editorial/generated/evidence-coverage.md`
- `design-engineering/reference-profiles/governed-local/terminal/generated/state-matrix.md`
- `design-engineering/reference-profiles/governed-local/terminal/generated/keyboard-matrix.md`
- `design-engineering/reference-profiles/governed-local/terminal/generated/evidence-coverage.md`
- `tests/snapshots/consumer-reference-card-grid.png` (proposed; update only by an explicit local baseline proposal, never in CI)

Portable token artifacts are regenerated only from the restricted fixture through the pinned adapter. Run `npm run build`; never broaden the allowed token subset to accommodate an adapter false-success, and revert the adapter with both generated files if the pin regresses.

Component-state evidence matrices are regenerated only from the records declared by each `profile.json`. Run `node scripts/generate-consumer-reference-evidence.mjs --json`; never hand-edit any of the six matrices or substitute undeclared record paths.

Browser state evidence begins with `scripts/create-component-state-session.mjs`. Its closed receipt binds a random nonce and session ID to the checked-out revision, branch, attempt, exact runtime pins, viewport, intended profile/scenario/channel set, and a deterministic digest of the relevant capture sources before capture. Receipt creation rejects dirty relevant sources. This is the current-authoring mode. Canonical evidence v2 stores environment, run, and session identity once in a shared content-addressed capture record; both profile records reference it and v1 readers remain available. Historical validation uses recorded-revision mode: it resolves commit, tree, and blob objects from the receipt's immutable revision and never trusts the working tree or index. DOM and AX artifacts embed the receipt digest and session identity; browser-authored visual sidecars bind the same session, scenario, capture time, source digest, PNG bytes, dimensions, and hash. Finalization accepts exactly 30 channel passes over the closed 40-file runtime set. Validation uses the receipt and completed manifest interval, not a wall-clock maximum age, so unchanged historical evidence remains verifiable after repository evolution.

The agent-native implementation has four separate planes: governed Markdown material v2; v1 trust/conformance records; CLI/MCP transport adapters; and explicitly registered A2A/AG-UI extensions. Material retrieval cannot merge trust records, transports cannot expand admission, and extensions cannot alter either registry. Consumer/profile -> Layout remains the only dependency direction; no material registry value is a visual default or reusable Layout input.

Lifecycle decisions are machine records, not inferred from deadlines. Sentinel/calibration and page evidence remain active pending their named owner deadlines; protocol-owner review retains archives; A2A and AG-UI remain retained extensions with external callers `unknown`. Archive retrieval must use each record's immutable repository/commit/tree/ref binding and pass `scripts/validate-lifecycle-disposition.mjs`; never copy historical evidence into current canonical records or treat archive presence as approval.

## Lifecycle States

Use these states in reviews and governance notes. Do not invent new lifecycle language when one of these states fits.

| State | Meaning | Change rule |
| --- | --- | --- |
| `draft` | Useful but still being shaped. | May change in structure or wording; review owner checks source-of-truth fit. |
| `stable` | Canonical guidance or contract. | Requires validator coverage or a named evidence boundary before behavior changes. |
| `deprecated` | Kept for history or migration. | Must name the replacement and removal trigger. |
| `experimental` | Accepted exploration that should not be treated as canonical. | Must name the review trigger that promotes, revises, or removes it. |
| `generated` | Produced from generator/data source. | Change the source file, regenerate, and run generated drift checks. |

Default lifecycle:

- Root docs, guides, recipes, quality docs, validators, and CI are `stable` unless a page explicitly says otherwise.
- `DOMAINS.md`, the scope decision, and `layout/index.md` are `stable`; domain leaves under `motion/`, `design-engineering/`, `game-ui/`, and `platform-guides/` begin `experimental`.
- Generated pattern docs, generated pattern indexes, and `CATALOG.md` are `generated`.
- Draft research artifacts under `.omo/` are `draft` or `experimental` and are not contributor-facing source of truth.

## Review Ownership

The CODEOWNERS file is a review proposal for high-impact areas. It should stay conservative until repository maintainers replace `@changeroa` with a verified team.

Consumer-reference ownership records the current truth as `owner.enforcement: "placeholder"` and `review_independence: "single_account"`. Multiple logical review roles assigned to this account do not create independent review.

| Area | Review owner | Review focus |
| --- | --- | --- |
| `GOVERNANCE.md`, `README.md`, `index.md`, `AGENTS.md` | Repository governance owner | Source-of-truth routing, lifecycle, stale-content policy, contributor path. |
| `scripts/pattern-data.mjs`, `scripts/generate-patterns.mjs`, `patterns/**`, `CATALOG.md` | Pattern-data owner | Generated drift, source lineage, pattern contract, generated warning coverage. |
| `guides/**`, `GUIDE.md`, `recipes/**` | Planning-doc owner | Planning flow, task routes, recipe composition boundaries. |
| `quality/**` | Quality owner | Claim boundaries, executable evidence, review gates. |
| `consumer-reference/**` | Repository governance owner with Validation owner | Required handoff, repository-local record safety, lifecycle separation, ownership truth, and reverse-dependency guard. |
| `consumer-reference/schema/{consumer-conformance-record,page-evidence-session,page-evidence-manifest}.schema.json`, `scripts/*consumer-conformance*.mjs`, `scripts/*page-evidence*.mjs` | Validation owner with Design Engineering owner | Closed migration dimensions, source/revision/session/run binding, artifact containment, executable scenario coverage, and consumer-owned adoption mapping. |
| `consumer-reference/policies/**`, `consumer-reference/fixtures/promotion/**`, `consumer-reference/schema/promotion-rfc.schema.json`, `scripts/*promotion-rfc.mjs` | Repository governance owner with actual consumer, support, migration, rollback, and Validation owners | Invariant-only scope, independence truth, claim-scoped evidence, compatibility, support capacity, lifecycle duties, and zero promotion/adoption overclaim. |
| `consumer-reference/adapters/**`, `consumer-reference/generated/**`, `scripts/*reference-artifacts.mjs`, `scripts/test-reference-adapters.mjs` | Repository governance owner with Validation owner | Restricted token ingress, exact adapter pin, warning handling, token/declaration counts, hashes, preserved aliases, and generated drift. |
| `DOMAINS.md`, `layout/**` | Repository governance owner with Pattern-data owner | Domain routing and preservation of the stable Layout path contract. |
| `motion/**` | Motion domain owner | Motion terminology, review procedure, practice classification, and evidence boundaries. |
| `design-engineering/**` | Design Engineering domain owner | Separation of product heuristics from shared quality gates. |
| `design-engineering/reference-profiles/**` | Design Engineering owner with Validation owner | Profile-local identity and values, pinned Layout provenance, explicit non-default selection, and related-fixture truth. |
| `tests/**`, `playwright.config.mjs`, `consumer-reference/baselines/**`, `scripts/*baseline*.mjs`, `scripts/*sentinel*.mjs`, `scripts/*renderer-purity.mjs` | Repository governance owner with Validation owner | Pure rendering, computed semantics before screenshots, immutable browser pins, required consumer-conformance semantics, optional raster capture, calibration cardinality, and pending owner approval. |
| `game-ui/**` | Game UI domain owner | Player-task classification, hierarchy responsibility, reference records, engine-specific subtrees, and cross-engine boundaries. |
| `platform-guides/**` | Platform Guides domain owner | Platform/source/version limits, comparison boundaries, and stale review. |
| `scripts/validate-*.mjs`, `scripts/test-validate-*.mjs`, `.github/workflows/validate.yml`, `.github/workflows/evidence-freshness.yml` | Validation owner | Validator scope, negative fixtures, blocking/advisory boundaries, CI parity. |

## Shared Promotion Governance

Promotion semantics are owned by the [canonical promotion contract](consumer-reference/contract.md#promotion-boundary) and the [canonical JSON promotion policy](consumer-reference/policies/shared-experimental.json). This document records only the repository ownership, review, and verification boundary.

## Staleness Control

Decision: run a weekly advisory audit only for evidence records that already declare `expires_at` or `review_by`.

The independent `.github/workflows/evidence-freshness.yml` schedule runs Monday at 05:00 UTC and also supports manual dispatch. It currently inventories the committed Chromium calibration record; consumer-owned page-evidence manifests enter the same audit by passing their explicit record path to `scripts/audit-evidence-freshness.mjs`.

No repository-wide maximum age or inferred time-to-live applies. Evidence without an explicit deadline remains outside this schedule. An expired `expires_at` or due `review_by` emits an advisory annotation and a JSON report without failing solely because the date passed. Malformed records and auditor failures remain blocking even though due-date findings are advisory.

Audit trigger:

- Run `node scripts/validate-links.mjs --json` and `node scripts/validate-governance.mjs --json` when external source lineage, generated policy, root navigation, or validation ownership changes.
- Run `node scripts/validate-domains.mjs --json` and `node scripts/test-validate-domains.mjs` when domain membership, scope boundaries, source paths, source revisions, platform context, or promotion state changes.
- Run `node scripts/test-audit-evidence-freshness.mjs --json` when `expires_at`, `review_by`, record inventory, advisory classification, or the scheduled workflow changes.

## Required Verification

For governance changes, run:

```sh
node scripts/validate-governance.mjs --json
node scripts/test-validate-governance.mjs --json
node scripts/validate-links.mjs --json
node scripts/validate-domains.mjs --json
node scripts/test-validate-domains.mjs
node scripts/validate-consumer-reference.mjs --json
node scripts/test-validate-consumer-reference.mjs --json
node scripts/test-validate-consumer-conformance.mjs --case valid-runtime-proof --json
node scripts/test-validate-consumer-conformance.mjs --json
node scripts/test-validate-page-evidence.mjs --json
node scripts/test-audit-evidence-freshness.mjs --json
```

For generated pattern or catalog changes, also run:

```sh
node scripts/generate-patterns.mjs
git diff --exit-code -- CATALOG.md patterns
node scripts/validate-patterns.mjs --min-count 46 --json
node scripts/validate-catalog.mjs --json
```

For portable token source, adapter, or generated artifact changes, run:

```sh
npm ci --ignore-scripts --no-audit --no-fund
node scripts/build-reference-artifacts.mjs --adapter style-dictionary --fail-on-warning --json
node scripts/validate-reference-artifacts.mjs --manifest consumer-reference/generated/manifest.json --json
node scripts/test-reference-adapters.mjs --json
git diff --exit-code -- consumer-reference/generated
```

For the proposed Chromium sentinel, also run:

```sh
npm run test:sentinel
node scripts/test-consumer-reference-sentinel.mjs
node scripts/validate-baseline-manifest.mjs --json
node scripts/test-validate-baseline-manifest.mjs --json
node scripts/test-summarize-sentinel-calibration.mjs
node scripts/validate-renderer-purity.mjs --json
node scripts/test-renderer-purity.mjs
```

For capture-session-bound component-state evidence, also run:

```sh
STATE_EVIDENCE_ROOT=".tmp/consumer-reference-state"
mkdir -p "$STATE_EVIDENCE_ROOT"
node scripts/create-component-state-session.mjs --output "$STATE_EVIDENCE_ROOT/capture-session.json" --json
STATE_SESSION_RECEIPT="$STATE_EVIDENCE_ROOT/capture-session.json" \
  STATE_ARTIFACT_DIR="$STATE_EVIDENCE_ROOT/runtime" \
  npm run test:component-state:runtime -- --reporter=line
node scripts/finalize-component-state-evidence.mjs --artifact-root "$STATE_EVIDENCE_ROOT" --json
node scripts/validate-component-state.mjs \
  --artifact-root "$STATE_EVIDENCE_ROOT" \
  --runtime-manifest "$STATE_EVIDENCE_ROOT/runtime-manifest.json" \
  --json
npm run test:component-state:runtime-negative
```

For shared promotion governance, also run:

```sh
node scripts/validate-promotion-rfc.mjs --json
node scripts/test-validate-promotion-rfc.mjs --json
```

Do not pass `--update-snapshots` in CI. Calibration runs exactly 20 times on the manifest's digest-pinned `linux/amd64` container and uploads raw Playwright JSON, strict exit records, PNG, DOM, AX, metadata, and post-assertion comparison evidence. Failed or incomplete calibration still uploads its truthful raw evidence without writing a completed aggregate. It remains nonblocking until the named owner explicitly approves the baseline.

Completed-CI repository, workflow, run ID and attempt, SHA, and artifact-name fields are workflow-recorded, self-asserted metadata, not an external attestation. The self-asserted repository field names the canonical upstream changeroa/StyleGallery; the self-asserted execution_repository field names the actual GitHub Actions repository and is limited to changeroa/StyleGallery or ark-jo/StyleGallery. The committed calibration's external_verification object records an independently checked GitHub Actions run and artifact API identity; artifact.api_digest is distinct from committed_ci.raw_evidence_sha256. Future CI aggregates remain awaiting_external_verification until their uploaded artifact API identity is independently checked. Linux/amd64 repeatability is externally verified only for committed run 29260372260; it does not establish baseline-owner approval or product suitability. Baseline-owner approval remains unclaimed until the named owner explicitly approves it. Synthetic fixtures validate rejection and acceptance behavior only; they are not authenticated provenance.
