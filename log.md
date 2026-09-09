# StyleGallery Log

## 2026-09-09

- Added an independent Toss-inspired homepage study that composes the existing Homepage recipe and Layout patterns inside a standalone product layer.
- Added original generated hero and travel imagery, responsive navigation, keyboard-operated asset tabs, section progress, reduced-motion behavior, and explicit horizontal service-rail ownership.
- Recorded real Chrome verification at desktop, tablet, and mobile viewport sizes with retained desktop and mobile screenshots. No reusable Layout CSS or consumer-reference profile values were changed.

Implementation handoff: `consumer_reference: not_applicable`.

Consumer reference: not_applicable
Consumer reference reason: This standalone visual study selects no consumer-reference profile or record.

## 2026-09-08

- Prepared npm release `stylegallery@0.1.5` with the complete six-domain, 147-document Material v2 corpus and the README compatibility repair.
- Added fourteen local guides across the five non-Layout domains: task selection, motion briefs and recipes, component contracts and worked examples, game screen recipes and verification, Apple/Android/Windows adaptation, and terminology comparison.
- Connected the guides through domain hubs and root routes, declared their membership/provenance, and included them in the closed 147-document material index and npm package. Layout retains its existing 46 patterns and spatial boundaries.
- Replaced unsupported aggregate term records with directly sourced records; corrected representation direction and the confusion between composition and set containment. The Markdown validator now checks dates, source locators, labels, scoped direction, temporal relations, inverse consistency, and containment cycles with negative fixtures.
- Examples remain expected behavior rather than claimed runtime evidence. Domain leaves remain `experimental`; no lifecycle promotion or consumer adoption is claimed.

- Follow-up runtime work added the [Interaction Lab](examples/domain-interactions/README.md), a standalone web adaptation with explicit mock responses. Its [verification notes](examples/domain-interactions/verification.md) bind actual browser observations to local source hashes and separate desktop execution from simulated viewport sizes, untested mobile devices, and untested native engines. Fixed the lab's modal Tab boundary after observing focus escape in the real browser.
- Fixed the v1 compatibility suite's stale README digest. Commit `d8bdf0bd5b5aec2fbc38e322a9ac7a1d31fd1332` had added material-v2 guidance and corrected the domain count without updating the test. The exact reviewed documentation digest is now checked separately; all 21 original core/source pins and six CLI output goldens remain unchanged. `npm run test:agent-native` passes.
- Integrated the current domain lifecycle policy from `main`: reader tasks and adoption counts do not authorize or block domain promotion. Refreshed active workflow/document seals and source-generated protocol inventories for the added validation and documentation; preserved job bytes, lifecycle decisions, external caller status, deadlines, and immutable archive bindings.

Implementation handoff: `consumer_reference: consumer-reference/agent-native/registry.json`.

Consumer reference: declared
Consumer reference record: consumer-reference/agent-native/registry.json

Terminology reliance: `figma.variable`, `figma.mode`, `figma.collection`, `figma.component`, `dtcg.token`, `dtcg.group`, `dtcg.token.draft2`, `css.custom-property`, `carbon.component`, `carbon.pattern`, and `stylegallery.pattern`. Relation types used in the records: `partial_overlap`, `implementation_representation`, `not_comparable`, `same_label_different_meaning`, and `near_equivalent`. Their named Figma, DTCG, CSSWG, Carbon, and local Layout sources were rechecked on 2026-09-08; this is an author review, not independent semantic approval. Direct locators and comparison boundaries are in [Term Cases](design-terminology/conflict-cases.md).

## 2026-08-18

- Added Design Terminology as the sixth governed domain: source-kind and concept-family classification separated as distinct axes, a typed term relation model, freshness-bounded source vocabularies, and cross-system conflict cases with three representative scenarios.
- Added the Design Terminology domain scope decision record comparing four placement alternatives and defining the domain's independent decision surface.
- Recorded six-domain scope in the domain manifest, root routes, quality scope, controlled vocabulary domain list, and governance rows; recorded sealed-cardinality duplication as accepted technical debt in the scope decision.
- Admitted the new domain pages and scope decision into material v2 and regenerated the material registry without modifying the git index.

- Added the StyleGallery homepage example planned from a clean npm installation and verified across desktop, tablet, and mobile Chrome CDP viewports.
- Added pinned Pretext text-layout measurement as an npm-installed verification dependency while keeping browser Canvas execution outside the Node CLI and MCP surfaces.
- Added deterministic hero-heading line-count, DOM overflow, accessibility, console, request, and screenshot checks.

## 2026-07-23

- Added the agent-native knowledge interface with content-addressed identity, epistemic and execution records, deterministic retrieval, and governed learning.
- Added the `sg` CLI and a read-only MCP surface derived from one operation registry.
- Added A2A Task and AG-UI event projections, closed schemas, executable conformance receipts, adversarial tests, and CI coverage.

## 2026-07-13

- Added Game UI as an experimental domain for engine-neutral classification and hierarchy plus named engine implementation subtrees.
- Added a nested Unity Game UI guide for Scene, Canvas, prefab, runtime-instance, input, sorting, and motion ownership.
- Extended domain validation to support per-guide external source repositories and revisions.

## 2026-07-11

- Expanded the repository into a governed StyleGallery umbrella while preserving the existing Layout paths.
- Added Motion, Design Engineering, and Platform Guides as explicit experimental domains.
- Added immutable provenance, scope boundaries, domain ownership, and validator coverage for adapted external guidance.

## 2026-07-09

- Added short pattern-boundary examples to the existing planning guides.
- Added pattern-boundary fields to the layout brief template.
- Added a pre-pattern decision gate to the decision tree.
- Linked the agent instructions to the pattern-boundary decision flow.
- Added short bad/good CSS examples for scroll ownership, styling boundaries, and container-local responsiveness.

## 2026-07-08

- Added a webpage generation workflow for content-to-layout matching, harmony evaluation, GPT Image references, and implementation handoff.
- Added a homepage recipe for content-led webpage composition.
- Added a harmony evaluation quality gate.
- Added validation coverage for the webpage generation workflow.

## 2026-07-04

- Fixed fixed-sidenav-shell scroll activation by constraining grid-template-rows with minmax(0, 1fr) and min-block-size on panes.
- Fixed imposter positioning anchor by wrapping sample and adding positioned ancestor rule.
- Fixed frame media fit by adding block-size, inline-size, and object-fit properties to frame_media.
- Fixed columns redundancy by removing duplicate column-width declaration.
- Fixed reel declaration order by alphabetizing gap before grid-auto-columns/grid-auto-flow.
- Added a pre-design layout planning layer for issue #1.
- Added a decision tree, layout brief template, and screen-type recipes.
- Linked the planning layer from root repository entry points.

## 2026-07-02

- Structured the repository as an OKF-style Markdown bundle.
- Added root and category indexes.
- Added OKF validation scripts and evidence targets.
