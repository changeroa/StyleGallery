---
type: Governance Reference
title: Governance, Lifecycle, And Docs-As-Code
description: Source-of-truth, generated artifact, domain, lifecycle, ownership, and stale-content policy for StyleGallery.
scheduled_stale_audit: deferred
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
| Consumer reference contract | `consumer-reference/contract.md`, `consumer-reference/schema/*.json` | Manual | None | `stable` contract with related fixtures | Handoff shape, path boundary, lifecycle, ownership, or dependency-direction changes. | `scripts/validate-consumer-reference.mjs`, `scripts/test-validate-consumer-reference.mjs` | Repository governance owner with Validation owner |
| Domain manifest and scope decision | `DOMAINS.md`, `quality/claim-records/stylegallery-multidomain-scope.md` | Manual | None | `stable` | Domain membership, repository-scope, or provenance-policy changes. | `scripts/validate-domains.mjs`, `scripts/validate-governance.mjs` | Repository governance owner |
| Layout domain hub | `layout/index.md` | Manual | None | `stable` | Layout route or ownership changes. | `scripts/validate-domains.mjs`, `scripts/validate-ia.mjs` | Pattern-data owner |
| Motion domain guidance | `motion/*.md` | Manual | None | `experimental` | Upstream revision, evidence boundary, or guidance changes. | `scripts/validate-domains.mjs` | Motion domain owner |
| Design Engineering domain guidance | `design-engineering/*.md` | Manual | None | `experimental` | Upstream revision, evidence boundary, or guidance changes. | `scripts/validate-domains.mjs` | Design Engineering domain owner |
| Game UI domain guidance | `game-ui/**/*.md` | Manual | None | `experimental` | Classification, hierarchy, engine implementation, evidence boundary, or route changes. | `scripts/validate-domains.mjs` | Game UI domain owner |
| Platform Guides domain guidance | `platform-guides/*.md` | Manual | None | `experimental` | Platform version, upstream revision, evidence boundary, or guidance changes. | `scripts/validate-domains.mjs` | Platform Guides domain owner |
| Pattern data and examples | `scripts/pattern-data.mjs` | Manual data source | `patterns/**/*.md`, `patterns/**/index.md`, `patterns/index.md`, `CATALOG.md` | `generated` output from `stable` source | Source-lineage URL changes, generated drift, category changes, or pattern count changes. | `scripts/validate-patterns.mjs`, `scripts/validate-catalog.mjs`, `scripts/validate-governance.mjs` | Pattern-data owner |
| Pattern generator | `scripts/generate-patterns.mjs` | Manual code source | `patterns/**/*.md`, `patterns/**/index.md`, `patterns/index.md`, `CATALOG.md` | `stable` generator, `generated` output | Generated structure changes, generated-warning changes, or generated metadata changes. | `node -c scripts/generate-patterns.mjs`, generated drift check, `scripts/validate-governance.mjs` | Pattern-data owner |
| Validation scripts | `scripts/validate-*.mjs`, `scripts/test-validate-*.mjs` | Manual code source | CI validation output | `stable` | Validator scope changes, fixture changes, or CI parity changes. | `node -c`, matching fixture tests, `.github/workflows/validate.yml` | Validation owner |
| CI workflow | `.github/workflows/validate.yml` | Manual | GitHub Actions run | `stable` | Validation step changes, generated drift policy changes, or owner changes. | GitHub Actions, `scripts/validate-governance.mjs` | Repository governance owner |

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
| `DOMAINS.md`, `layout/**` | Repository governance owner with Pattern-data owner | Domain routing and preservation of the stable Layout path contract. |
| `motion/**` | Motion domain owner | Motion terminology, review procedure, practice classification, and evidence boundaries. |
| `design-engineering/**` | Design Engineering domain owner | Separation of product heuristics from shared quality gates. |
| `game-ui/**` | Game UI domain owner | Player-task classification, hierarchy responsibility, reference records, engine-specific subtrees, and cross-engine boundaries. |
| `platform-guides/**` | Platform Guides domain owner | Platform/source/version limits, comparison boundaries, and stale review. |
| `scripts/validate-*.mjs`, `scripts/test-validate-*.mjs`, `.github/workflows/validate.yml` | Validation owner | Validator scope, negative fixtures, CI parity. |

## Staleness Control

Decision: no scheduled stale-content workflow yet.

Reason: the current repository is small, CI already checks local links and generated drift on pull requests and pushes, and a scheduled workflow would add notification noise without a clear owner rotation.

Audit trigger:

- Run `node scripts/validate-links.mjs --json` and `node scripts/validate-governance.mjs --json` when external source lineage, generated policy, root navigation, or validation ownership changes.
- Run `node scripts/validate-domains.mjs --json` and `node scripts/test-validate-domains.mjs` when domain membership, scope boundaries, source paths, source revisions, platform context, or promotion state changes.
- Reconsider a scheduled stale audit when source-lineage URLs exceed 50 entries, when an external-link failure escapes a pull request, or when ownership changes away from a single maintainer.

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
```

For generated pattern or catalog changes, also run:

```sh
node scripts/generate-patterns.mjs
git diff --exit-code -- CATALOG.md patterns
node scripts/validate-patterns.mjs --min-count 46 --json
node scripts/validate-catalog.mjs --json
```
