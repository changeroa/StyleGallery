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
| Domain topology, metadata, provenance, scope boundaries, and root routes remain enforced. | `scripts/validate-domains.mjs` and `scripts/test-validate-domains.mjs` | `node scripts/validate-domains.mjs --json`; `node scripts/test-validate-domains.mjs` | Five governed domains and their declared leaves are reachable and attributed. | Domain metadata, immutable provenance, scope boundaries, and root-route fixtures must fail. | A full SHA proves content identity syntax, not publisher authenticity, source ownership, or local quality. |
| Consumer-reference handoffs, schema/runtime parity, repository-local record paths, lifecycle separation, ownership truth, and dependency direction remain enforced. | `scripts/validate-consumer-reference.mjs` and `scripts/test-validate-consumer-reference.mjs` | `node scripts/validate-consumer-reference.mjs --json`; `node scripts/test-validate-consumer-reference.mjs --json` | Declared and reasoned-not-applicable fixtures exit zero, every shipped schema rule has accepted/rejected parity coverage, all repository handoffs declare applicability, fixtures remain related, and ownership discloses placeholder single-account review. | Unknown top-level or nested properties, invalid schema fields, missing handoff or reason, stable with ended support, boolean independence, unresolved/absolute/scheme/network/parent/item-or-record-symlink/non-JSON paths, scaffold success, sixth-domain classification, literal or supported computed reverse imports, and repository handoff omissions must fail with named finding codes and non-zero child exit. | Proves receiver-contract consistency, bounded static dependency detection, and path containment, not general JavaScript data-flow safety, visual quality, independent adoption, verified owner permissions, or consumer implementation conformance. |

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
