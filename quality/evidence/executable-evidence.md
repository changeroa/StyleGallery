---
type: Evidence Reference
title: Executable Evidence Coverage
description: Claim-to-evidence map for validators, tests, rendered QA, review, and source citations.
---

# Executable Evidence Coverage

Executable evidence identifies which claims are machine-enforced, which are only inspected, and which need rendered or human evidence before they can be stated strongly.

## Evidence Families

- Validator: repository scripts that inspect files and fail with a non-zero exit code.
- Advisory warning: a validator result that reports preferred wording or labels in `warnings` while leaving `ok: true` and the exit code at zero.
- Fixture test: positive or negative examples that prove a validator rejects or accepts the intended shape.
- CI command: a workflow command that runs on pull requests or pushes.
- Rendered evidence: screenshots, viewport captures, browser QA, or visual diffs.
- Human review: expert, heuristic, accessibility, or task review that records a claim boundary.
- Source citation: external or local references used only inside a stated claim boundary.

## Validator Coverage Map

| Claim | Validator or test | CI command | Positive evidence | Negative evidence | Evidence boundary |
| --- | --- | --- | --- | --- | --- |
| OKF files have required structural metadata and valid root index or log shapes. | `scripts/validate-okf.mjs` and `scripts/test-validate-okf.mjs` | `node scripts/validate-okf.mjs --json`; `node scripts/test-validate-okf.mjs --json` | `success_path` fixture returns `ok: true`. | Missing frontmatter, missing type, concept frontmatter on `index.md`, and malformed log date fixtures must fail. | Proves repository structure, not conceptual quality or source truth. |
| Pattern documents carry the required spatial contract sections and restricted CSS/HTML shape. | `scripts/validate-patterns.mjs` and `scripts/test-validate-patterns.mjs` | `node scripts/validate-patterns.mjs --min-count 46 --json`; `node scripts/test-validate-patterns.mjs --json` | Generated patterns satisfy required fields, sections, CSS ordering, selector, and count rules. | Missing metadata, unsorted CSS, forbidden decorative properties, ID selectors, missing code blocks, missing HTML hooks, and missing contract sections must fail. Preferred accessibility detail labels emit warnings without blocking equivalent prose. | Proves the written pattern contract and static examples, not rendered layout quality. |
| Webpage-generation workflow references remain present across guides, recipes, and gates. | `scripts/validate-webpage-workflow.mjs` and `scripts/test-validate-webpage-workflow.mjs` | `node scripts/validate-webpage-workflow.mjs --json`; `node scripts/test-validate-webpage-workflow.mjs --json` | The success fixture includes the required workflow references and contract snippets. | Missing route structure, required template fields, link targets, safety boundaries, or route order must fail. Preferred link labels and GUIDE wording emit warnings. | Proves required structure and safety boundaries are present, not that a generated webpage is visually harmonious. |
| Markdown links resolve inside the repository. | `scripts/validate-links.mjs` | `node scripts/validate-links.mjs --json` | All checked Markdown links resolve to local files or are intentionally external or anchors. | A local link that escapes the repository or points at a missing file must fail. | Proves link targets exist, not that the target content supports a claim. |
| Catalog and generated pattern indexes match the pattern data source. | `scripts/validate-catalog.mjs` | `node scripts/validate-catalog.mjs --json` | `CATALOG.md`, category indexes, and expected pattern files match `scripts/pattern-data.mjs`. | Missing, unexpected, or unlisted pattern files must fail. | Proves catalog consistency, not pattern usefulness. |
| Governance, lifecycle, generated-file, ownership, and stale-content policy remain discoverable and CI-enforced. | `scripts/validate-governance.mjs` and `scripts/test-validate-governance.mjs` | `node scripts/validate-governance.mjs --json`; `node scripts/test-validate-governance.mjs --json` | `GOVERNANCE.md`, `.github/CODEOWNERS`, generated warnings, generated metadata, root link targets, lifecycle states, `scheduled_stale_audit` metadata, and CI wiring are present. | Missing governance file, generated warning, generated metadata, CODEOWNERS coverage, or stale policy fixtures must fail. Preferred governance prose and link labels emit warnings. | Proves governance policy is present and linked, not that CODEOWNERS users have verified repository write access. |
| Domain topology, metadata, provenance, scope boundaries, and root routes remain enforced. | `scripts/validate-domains.mjs` and `scripts/test-validate-domains.mjs` | `node scripts/validate-domains.mjs --json`; `node scripts/test-validate-domains.mjs` | Four governed domains and their declared leaves are reachable and attributed. | Domain metadata, immutable provenance, scope boundaries, and root-route fixtures must fail. | A full SHA proves content identity syntax, not publisher authenticity, source ownership, or local quality. |
| Consumer-reference handoffs, schema/runtime parity, repository-local record paths, lifecycle separation, ownership truth, and dependency direction remain enforced. | `scripts/validate-consumer-reference.mjs` and `scripts/test-validate-consumer-reference.mjs` | `node scripts/validate-consumer-reference.mjs --json`; `node scripts/test-validate-consumer-reference.mjs --json` | Declared and reasoned-not-applicable fixtures exit zero, every shipped schema rule has accepted/rejected parity coverage, all repository handoffs declare applicability, fixtures remain related, and ownership discloses placeholder single-account review. | Unknown top-level or nested properties, invalid schema fields, missing handoff or reason, stable with ended support, boolean independence, unresolved/absolute/scheme/network/parent/item-or-record-symlink/non-JSON paths, scaffold success, fifth-domain classification, literal or supported computed reverse imports, and repository handoff omissions must fail with named finding codes and non-zero child exit. | Proves receiver-contract consistency, bounded static dependency detection, and path containment, not general JavaScript data-flow safety, visual quality, independent adoption, verified owner permissions, or consumer implementation conformance. |
| Promotion governance remains a closed JSON-only, invariant-scoped, deferred example contract. | `scripts/validate-promotion-rfc.mjs` and `scripts/test-validate-promotion-rfc.mjs` | `node scripts/validate-promotion-rfc.mjs --json`; `node scripts/test-validate-promotion-rfc.mjs --json` | The manifest-declared policy and two canonical examples pass with deferred decisions, zero attestations, exact support commitment, and no promotion claim. | Manifest-declared invalid fixtures plus forged, unregistered, duplicate, path, extension, support, evidence, canonical-drift, and lifecycle mutations exit non-zero with named findings. | Synthetic validation does not authenticate adoption, organizations, owners, support capacity, provenance, or a promotion decision; the current canonical inventory supplies no real independent consumers. |
| Portable token source and generated CSS agree through the pinned restricted adapter. | `scripts/build-reference-artifacts.mjs`, `scripts/validate-reference-artifacts.mjs`, and `scripts/test-reference-adapters.mjs` | Build with `--fail-on-warning`, validate the generated manifest, then run the adapter fixture harness. | Dimension, color, duration, tested border values, and whole-token curly aliases emit nonzero CSS declarations with matching counts and hashes; output references remain CSS variable references. | `$extends`, JSON Pointer, resolver/modifier/theme documents, unknown reserved fields, non-string descriptions, adapter-unsafe path segments, untested type/unit, partial/dangling/cyclic/type-mismatched aliases, missing output, zero count, warning, scaffold/unknown manifest fields, missing/duplicate declaration, object sentinel, unresolved or forged value, and count drift must fail with named findings and non-zero child exit. | Proves the pinned adapter preserves this tested subset and that committed artifacts independently rebuild from their canonical source, not that tokens are product defaults, portable beyond the tested adapters, visually suitable, or adopted by a consumer. |
| The proposed Chromium sentinel preserves canonical card-grid geometry and truth-derived calibration evidence. | `tests/consumer-reference-sentinels.spec.mjs`, `scripts/test-consumer-reference-sentinel.mjs`, `scripts/validate-baseline-manifest.mjs`, and strict raw calibration harnesses. | Run the ordinary sentinel and semantic negatives in the digest-pinned nonblocking Chromium job; validate manifest/raw evidence in the contract job. | Computed visibility/cardinality/grid/gap/geometry/overflow checks precede a locator screenshot; raw DOM and AX bytes are recorded and hash-checked across runs; completion and zero diff derive only from a zero child exit, the exact passing Playwright identity, verified raw hashes, and post-assertion comparison proof. | Hidden layout, long-content overflow, fake/malformed Playwright, missing or nonzero exit, absent comparison/artifact, tampered hash, duplicate/unknown metadata, malformed recursive records, and incomplete run sets must fail without writing a completed aggregate. | Local DOM/AX/rendered evidence does not prove semantic DOM/AX conformance, product suitability, accessibility, or owner approval. Completed-CI repository, workflow, run ID and attempt, SHA, and artifact-name fields are workflow-recorded, self-asserted metadata, not an external attestation. The self-asserted repository field names the canonical upstream changeroa/StyleGallery; the self-asserted execution_repository field names the actual GitHub Actions repository and is limited to changeroa/StyleGallery or ark-jo/StyleGallery. The committed calibration's external_verification object records an independently checked GitHub Actions run and artifact API identity; artifact.api_digest is distinct from committed_ci.raw_evidence_sha256. Future CI aggregates remain awaiting_external_verification until their uploaded artifact API identity is independently checked. Linux/amd64 repeatability is externally verified only for committed run 29260372260; it does not establish baseline-owner approval or product suitability. Baseline-owner approval remains unclaimed until the named owner explicitly approves it. Synthetic fixtures validate rejection and acceptance behavior only; they are not authenticated provenance. Both Chromium jobs are nonblocking and CI never updates snapshots. |
| Governed-local button states retain source-bound visual, DOM, and accessibility-tree evidence across both example profiles. | `scripts/create-component-state-session.mjs`, `scripts/finalize-component-state-evidence.mjs`, `scripts/validate-component-state.mjs`, and the component-state source, contract, artifact, generator, and sentinel harnesses. | `npm run test:component-state`; `npm run validate:component-state`; run the digest-pinned component-state browser capture and `npm run test:component-state:runtime-negative`. | Editorial and terminal each declare the five compound scenarios `action-disabled-busy`, `action-focused`, `action-loading-busy`, `disclosure-expanded-loading`, and `toggle-focused-pressed`; their environment-scoped approved PNG hashes and dimensions are canonical pre-capture inputs; the generated state, keyboard, and evidence matrices match their records; one clean capture session binds the browser artifacts to the governed source inventory. | Missing or altered source bindings, missing executable source manifests, invalid state/profile records, scenario drift, coordinated PNG/manifest/sidecar substitution, unapproved environment-specific raster identity, malformed or replayed runtime artifacts, hash/count mismatch, insufficient focus clearance, and sentinel mutations must exit non-zero with named findings. | Proves the declared examples and captured channels agree for an explicitly approved browser environment. Legacy source-less receipts are intentionally rejected by the capture receipt, `session_link`, and `completed_session` schemas and by executable finalization and validation. Environment-scoped PNG identity does not imply cross-platform pixel equivalence. It does not prove product suitability, independent adoption, full accessibility, cross-browser behavior, or owner approval; synthetic negative fixtures are not authenticated provenance. |

## Validator Severity Contract

- `failures` contains structural, schema, safety-boundary, link-target, ordering, or generated-drift violations. Any failure sets `ok: false` and exits non-zero.
- `warnings` contains preferred natural-language wording, link labels, or scannability guidance. Warnings leave `ok: true` and exit zero.
- A fixture that moves a check from blocking to advisory must prove both sides: an equivalent paraphrase produces a warning, while the corresponding missing structure or machine-readable field still fails.

## Claim Boundaries

- Validator evidence can support "the repository enforces this structural rule."
- Fixture evidence can support "the validator rejects this known-bad shape."
- CI evidence can support "this command runs in the workflow."
- Rendered evidence can support "this viewport or state was captured for review."
- Human review can support "a reviewer evaluated this claim under a named method."
- Source citation can support "this claim has an admissible reference boundary."

## Rendered Evidence Backlog

| Rendered claim | Required evidence |
| --- | --- |
| A pattern produces the intended layout behavior across breakpoints. | Browser screenshot matrix for narrow, medium, and wide viewports, plus the relevant state if the pattern has interaction or overflow. |
| A generated webpage is harmonious. | Browser screenshots of the page, a completed harmony evaluation gate, and a human review note. |
| A visual change is stable. | Before and after screenshots or a visual diff for the named viewport and state. |
| Accessibility is acceptable. | Automated checks, keyboard/focus review, and manual accessibility review scoped to the claim. |

## Rejection Rules

Reject a claim when:

- it says or implies that visual quality is proven by validator output;
- it treats screenshot evidence as proof of usability, accessibility, or task completion;
- it treats source citations as proof of local rendered behavior;
- it claims CI coverage for a script that is not run by `.github/workflows/validate.yml`;
- it omits the negative fixture or failure mode for an enforced validator rule.

## IA Navigation

Parent: [Evidence References](index.md).
Next: [Quality Gates](../index.md) to decide whether the evidence supports a claim.
