# StyleGallery Log

## 2026-10-19

Understood as: release `stylegallery@0.1.16`, which ships hybrid search from PR #68: BM25F fused with an English embedding model so everyday wording finds documents that use different words.

- `stylegallery search` and the MCP `search` tool take `--mode hybrid|lexical` (`mode`), default `hybrid`: weighted reciprocal rank fusion (k 60, semantic weight 0.5) of BM25F and bge-small-en-v1.5 (quantized ONNX, 34 MB). The result reports the `mode` that ran and a `mode_reason` on fallback.
- The model is not packaged. The first hybrid search downloads it from a pinned revision into `~/.cache/stylegallery/models/` and checks its SHA-256; it runs on `onnxruntime-web`, an optional dependency. Offline (`STYLEGALLERY_OFFLINE=1`), without the dependency, or for Korean without `query_en`, search warns once and ranks with BM25F alone.
- Document vectors ship precomputed in `consumer-reference/agent-native/v2/search-embeddings.json`; `generate-search-embeddings.mjs --check --vectors` runs in the Search evaluation workflow.
- Search evaluation adds 20 vocabulary-mismatch questions (111 total). Hit@5 lexical to hybrid: overall 0.892 to 0.937, held-out 0.867 to 0.933, mismatch 0.50 to 0.70; must-pass 35/35 in both modes.

Consumer reference: not_applicable
Consumer reference reason: This release changes search ranking tooling and selects no consumer-reference profile or record.

Understood as: release `stylegallery@0.1.15`, which ships OmO support for `stylegallery setup` from PR #66.

- `stylegallery setup` adds `--agent omo`, detected by `~/.omo` or `omo` on PATH and included by default and in `all`. It registers `mcpServers.stylegallery` (`npx -y --package stylegallery stylegallery-mcp`) in `<agentDir>/mcp.json`, where agentDir is `$OMO_CODING_AGENT_DIR` or `~/.omo/agent`, with the same backup, `--force`, and idempotence rules as Claude Code and Codex. An identical hand-made entry is reported unchanged.
- The skill copy in `~/.agents/skills/stylegallery-search/` is shared by Codex and OmO: it is written once, and the second agent is reported with `shared_with`. `--uninstall` keeps the shared skill (`kept`) while another detected agent that uses it is not part of the same uninstall run.

Consumer reference: not_applicable
Consumer reference reason: This release adds agent setup tooling and selects no consumer-reference profile or record.

Understood as: release `stylegallery@0.1.14`, which ships `stylegallery setup` from PR #64 so an installed package can connect Claude Code and Codex in one command.

- `stylegallery setup` copies `skills/stylegallery-search/SKILL.md` to `~/.claude/skills/stylegallery-search/` and `~/.agents/skills/stylegallery-search/` and registers `npx -y --package stylegallery stylegallery-mcp` as user-scope `mcpServers.stylegallery` in `~/.claude.json` and `[mcp_servers.stylegallery]` in `~/.codex/config.toml`. Options: `--dry-run`, `--agent claude|codex|all`, `--only skill|mcp`, `--uninstall`, `--force`. Reruns change nothing, modified config files are backed up as `<file>.bak-stylegallery-<timestamp>`, other settings are preserved, and a different same-name entry is left alone without `--force`. Sources: https://code.claude.com/docs/en/mcp, https://code.claude.com/docs/en/skills, https://developers.openai.com/codex/mcp, https://developers.openai.com/codex/skills, read 2026-10-19.
- The package `files` list adds `scripts/stylegallery-setup.mjs`. `scripts/test-stylegallery-setup.mjs` runs in the Search evaluation workflow.

Consumer reference: not_applicable
Consumer reference reason: This release adds agent setup tooling and selects no consumer-reference profile or record.

Understood as: release `stylegallery@0.1.13`, which ships the evidence-based UI pattern documents from PR #61 and the README CLI reference from PR #62.

- Design Engineering: `design-engineering/evidence-patterns/` adds 12 documents (inline validation, error recovery, form labels, input masks, faceted filters, autocomplete, empty states, data tables, tabs and segmented controls, breadcrumbs, bottom navigation, dark-mode contrast) with 22 cited sources; `loading-and-feedback`, `native-interaction-contracts`, `platform-guides/input-and-focus`, and the `delete-undo` recipe gain evidence sections.
- Search evaluation: 91 questions, Hit@5 0.978, nDCG@5 0.877, must-pass 35/35.
- README: a CLI reference under Quick Start lists the agent loop and every command with its options.

Consumer reference: not_applicable
Consumer reference reason: This release adds documentation and selects no consumer-reference profile or record.

Understood as: release `stylegallery@0.1.12`, which makes agent search one `stylegallery` command with BM25F ranking, Korean aliases, readable ids, section reads, and a CI retrieval gate.

- CLI: `stylegallery` is the only command name. It adds `search`, `read`, `retrieve`, `help`/`--help`, and `version`/`--version` beside the existing governed and compiler commands; `context --query` builds the material context. The `sg` bin is removed because it collides with ast-grep. `sg-material`, `stylegallery-material`, and `stylegallery-material-mcp` print a rename notice and delegate in this release only. `stylegallery-mcp` gains `search` and `read` tools that return the same JSON as the CLI.
- Search v3 (`scripts/agent-native/v2/material-search-v3.mjs`): BM25F over title, aliases, description, questions, path, headings, and body; Hangul 2-grams indexed only from Korean aliases, questions, and titles; an optional `query_en`; readable ids `sg:<domain>/<slug>` with hash identities kept for `--detailed`; schema 3.0 results with a verbatim snippet and the next `read` command; `read --outline` and `read --section`.
- Metadata: frontmatter `aliases` and `questions` (JSON lists) for all 46 Layout patterns, through `scripts/pattern-data.mjs` and the pattern generator, and for 29 recipe, guide, motion, design-engineering, platform, and expression documents.
- Evaluation: `eval/search/questions.json` holds 75 questions (56 English, 19 Korean or mixed, 19 must-pass, 15 held out from alias writing). `eval/search/scores.json` records the legacy ranker on the original corpus and search v3: Hit@5 0.613 to 0.973, nDCG@5 0.482 to 0.863, MRR 0.510 to 0.876, must-pass 14/19 to 19/19, Korean Hit@5 0.105 to 1.0, held-out Hit@5 0.533 to 0.867. `validate.yml` runs `scripts/test-stylegallery-search.mjs` and `scripts/search-eval.mjs --gate` on every pull request.
- `skills/stylegallery-search/SKILL.md` ships one search how-to skill.

Consumer reference: not_applicable
Consumer reference reason: This change adds retrieval tooling and search metadata and selects no consumer-reference profile or record.

## 2026-10-16

Understood as: release `stylegallery@0.1.11`, the first version published by the Trusted Publishing workflow from PR #57.

- Bumped the package version from `0.1.10` to `0.1.11`. The release carries PR #57: `.github/workflows/publish.yml` publishes the package when a GitHub Release is published, authenticating to npm with GitHub OIDC instead of a token, and the README Releasing section describes the flow. This version is published by creating the GitHub Release `v0.1.11`, not from a local machine.
- The package `files` list is unchanged. This release changes only the version, this log entry, the material registry for the log bytes, and the A2A and AG-UI caller inventories bound to `package.json` and the registry.

Consumer reference: not_applicable
Consumer reference reason: This change releases a package version and selects no consumer-reference profile or record.

Understood as: publish the npm package from GitHub Actions through npm Trusted Publishing (OIDC) instead of a local token.

- Added `.github/workflows/publish.yml`. A published GitHub Release runs it on a GitHub-hosted runner with `id-token: write`, Node 22, and npm 11.21.1 (Trusted Publishing needs npm 11.5.1 or later and Node 22.14 or later). It checks that the release tag is `v` plus the `package.json` version, runs the governance, lifecycle, reference-artifact, material, and Registrar checks and `npm pack --dry-run`, then runs `npm publish`. No npm token secret is used, and npm generates provenance for the public repository. Actions are pinned to the same commit SHAs as the other workflows.
- `README.md` gains a Releasing section: merge the version-bump pull request, create a GitHub Release tagged `v<version>`, and the workflow publishes. The workflow cannot publish until the `stylegallery` package names `changeroa/StyleGallery` and `publish.yml` as a Trusted Publisher on npmjs.com with `npm publish` allowed. That registration is not done yet, because a new entry expires unless its first publish succeeds within two days. Source: https://docs.npmjs.com/trusted-publishers, read 2026-10-16.

Consumer reference: not_applicable
Consumer reference reason: This change adds a release workflow and its documentation and selects no consumer-reference profile or record.

Understood as: release `stylegallery@0.1.10` with the Registrar, the Conservator, and the holy-grail and icon-frame doc fixes from PR #55.

- Bumped the package version from `0.1.9` to `0.1.10`. The release carries PR #55: `sg registrar` checks every claim record against 35 rules, `sg conservator` renders all 46 Layout pattern exhibits at 320, 768, and 1440 CSS pixels with negative controls, `holy-grail` stacks below 48rem, and the `icon-frame` sample has `role="img"`.
- The package `files` list already gained `scripts/registrar.mjs`, `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/markdown-structure.mjs`, and `scripts/pattern-data.mjs` in PR #55. This release changes only the version, this log entry, the material registry for the log bytes, and the A2A and AG-UI caller inventories bound to `package.json` and the registry.

Consumer reference: not_applicable
Consumer reference reason: This change releases a package version and selects no consumer-reference profile or record.

Understood as: fix the two Layout doc defects the Conservator found, then measure both patterns without workarounds.

- `holy-grail` now has the breakpoint its `breakpointed` responsiveness promised. `scripts/pattern-data.mjs` adds `@media (max-width: 47.99rem) { .holy_grail { grid-template: "header" auto "left" auto "main" 1fr "right" auto "footer" auto / 1fr; } }`, so below 48rem the five regions stack in one column in DOM order and a 320px viewport no longer overflows by 96px. 1440px is unchanged. `scripts/generate-patterns.mjs` accepts an at-rule entry (`["@media ...", [[selector, declarations]], note]`), renders it as a nested block, counts its properties under Core Properties, and writes the change point and its note under Constraints And Change Points.
- The `icon-frame` sample adds `role="img"` to the labelled span, which clears axe-core's serious `aria-prohibited-attr`.
- The Conservator measures `holy-grail` at 320, 768, and 1440. Below 768px it checks the `holy-grail-stack` behavior: every region takes the full column width and follows the previous one with the 1rem gap, and the shared root-overflow check stays at 0. The negative control is unchanged (remove the base `grid-template`) and fails at 768 and 1440; at 320 the breakpoint overrides the removed declaration. The `icon-frame` exhibit imports the doc sample from `scripts/pattern-data.mjs` verbatim instead of adding its own `role`, and only a harness rule sizes the empty svg. Both `not_measured` entries and their claim-record notes (records 11 and 18) are removed. The package now ships `scripts/pattern-data.mjs` because the packaged exhibits import it.

Consumer reference: not_applicable
Consumer reference reason: This change corrects two Layout pattern docs and their render exhibits and selects no consumer-reference profile or record.

Understood as: rename the claim-record validator to the Registrar and the pattern render oracle to the Conservator, raise both to their widest useful coverage, and ship both as `sg` subcommands.

- Renamed `scripts/validate-claim-records.mjs` to `scripts/registrar.mjs` and `scripts/check-pattern-oracle.mjs` to `scripts/conservator.mjs`, with their tests, package scripts, and the `.github/workflows/registrar-conservator.yml` workflow (formerly `claim-records.yml`; jobs `registrar` and `conservator`). The names describe the gallery roles: the Registrar keeps the claim register and the provenance of each record, and the Conservator inspects each exhibit directly.
- The Registrar grows from 15 to 35 rules. New rules check every template field and the template itself, repeated fields, record numbering and title uniqueness, evidence-family names against `quality/evidence/families.md`, the consumer-reference shape, review dates that are in the future, out of order, or overdue (a warning), the source-revision format, a review date for claims bound to an external source, conflict refs that must name another record and be reciprocal, `sg://conservator/<pattern>` refs, `auto` verdicts that use human-outcome terms or lack the `validator` family, record-file indexing, and one record per Conservator exhibit. `sg registrar --stale` and `--unverified` list records that need review. Every rule has a failing fixture.
- The Conservator grows from one pattern to all 46 Layout patterns. Each exhibit renders the pattern doc's CSS block verbatim and measures that pattern's claimed geometry. Each negative control removes one declaration the doc lists as breaking and must fail on the named behavior. Claim Records 5 to 49 in `quality/claim-records/samples.md` bind each exhibit, and record 4 covers `scroll-body-shell`. Sample 4's evidence family `rendered` was not in the glossary and is now `validator`, `screenshot`, `accessibility`. The per-pattern records live in the existing samples file because the material corpus is sealed at 180 documents. The committed `tests/fixtures/pattern-oracle/` fixture is replaced by in-memory exhibits.
- Findings left for the Layout owner: the `icon-frame` doc sample puts `aria-label` on a span with no role, which axe-core reports as serious, so the exhibit adds `role="img"`. `holy-grail` is documented as breakpointed, but its CSS has no breakpoint and overflows a 320px viewport by 96px, so the exhibit is measured at 768 and 1440 only.
- Owner decision (2026-10-16): Playwright may be a required package dependency. `playwright` and `@axe-core/playwright` move to `dependencies` (about 22MB). Browsers are not downloaded at install. `sg conservator` reports `browser_missing` with the install command, accepts `--install-browser`, and accepts `--channel chrome` for an installed Chrome. The package now ships `scripts/registrar.mjs`, `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, and `scripts/markdown-structure.mjs`. In an installed package, evidence refs to repository-only files are warnings, not failures.

Consumer reference: not_applicable
Consumer reference reason: This change renames and extends repository quality checks and selects no consumer-reference profile or record.

## 2026-10-15

Understood as: release `stylegallery@0.1.9` with the machine-verifiable claim records and the scroll-body-shell render oracle from PR #53.

- Bumped the package version from `0.1.8` to `0.1.9`. The release carries PR #53: `scripts/validate-claim-records.mjs` checks the machine-readable fields of every `## Claim Record` section under `quality/claim-records/`, `scripts/check-pattern-oracle.mjs` renders `tests/fixtures/pattern-oracle/scroll-body-shell/index.html` at 320, 768, and 1440 CSS pixels, and the Claim record checks workflow runs both with their fixture tests.
- The package `files` list is unchanged. The updated `quality/claims.md` and the new `quality/claim-records/samples.md` were already packaged. The two new checks stay repository-only like the other validators (`validate-domains`, `check-showcase`): the claim-record validator imports the unpackaged `scripts/markdown-structure.mjs`, and the oracle needs the development dependencies Playwright and `@axe-core/playwright` plus a fixture under `tests/`, which the package does not ship. Run them from a repository checkout.

Consumer reference: not_applicable
Consumer reference reason: This change releases a package version and selects no consumer-reference profile or record.

## 2026-09-28

Understood as: switch the repository package manager from npm to Bun and release `stylegallery@0.1.8`.

- Replaced `package-lock.json` with `bun.lock`, migrated from the npm lockfile so every one of the 184 resolved package versions and the `brace-expansion` override are unchanged, and declared `"packageManager": "bun@1.3.14"`. Scripts still run on Node.js 22; Bun installs dependencies and runs package scripts.
- CI workflows add `oven-sh/setup-bun` pinned by commit, install with `bun install --frozen-lockfile --ignore-scripts`, and run `bun run` and `bunx playwright`. Playwright container jobs install `unzip` first because the pinned image does not include it. The setup-bun pin joins the immutable action pins.
- New capture sessions and the conformance matrix source binding hash `bun.lock` in place of `package-lock.json`; the capture-session schema accepts `bun.lock` as a source path and still accepts `package-lock.json` for earlier sessions. Existing capture evidence remains bound to its recorded revision.
- With owner approval, the sentinel-calibration and page-evidence records and their validator constants were refreshed for the new workflow bytes, including the calibration and page-evidence job hashes and the protected hashes of `scripts/run-consumer-page-evidence-ci.mjs` and `quality/evidence/executable-evidence.md`, whose commands now name Bun. Owners, deadlines, and decisions are unchanged.
- Development commands in the documentation now use `bun run`. Consumer install commands such as `npx stylegallery` and `npm install --global stylegallery` are unchanged because the package is still published to the npm registry.

Consumer reference: not_applicable
Consumer reference reason: This change replaces the repository package manager and selects no consumer-reference profile or record.

Understood as: remove the Game UI domain from the repository together with the Expression change.

- Removed the Game UI domain: its thirteen governed files under `game-ui/`, the Unity organization-wiki and Unity source-contract validators with their fixture tests and CI steps, and every route, manifest row, governance row, ownership entry, quality scenario, validator requirement, example link, and packaged path that referred to it. Earlier log entries remain as history.
- The domain set is Layout, Motion, Design Engineering, Platform Guides, Design Terminology, and Expression. Domain-count sentences return to six governed domains, so `quality/evidence/executable-evidence.md` returns to its previously sealed bytes. Material v2 admits 180 documents.
- Removing the two Unity steps changed `.github/workflows/validate.yml`. With owner approval, only the whole-file active and derived retired workflow hashes were refreshed in the sentinel-calibration and page-evidence records and their validator constants; the calibration and page-evidence job bytes, owners, deadlines, and decisions are unchanged. The A2A and AG-UI extension source inventories were regenerated for the edited documents.

Consumer reference: not_applicable
Consumer reference reason: This change removes a documentation domain and its validators and selects no consumer-reference profile or record.

## 2026-09-27

Understood as: let StyleGallery produce finished, expressive pages without loosening the Layout contract, and keep only the parts that belong in the official repository.

- Added Expression as a governed domain: a direction brief, an unofficial brand-study policy, two named directions with concrete values (Nocturne Editorial, Warm Print), and three visual technique recipes (gradient atmosphere, grain and texture, WebGL hero field). Expression owns art direction; it owns no Layout mechanics, motion timing, or governed tokens.
- Added two executable Motion techniques: scroll choreography (GSAP ScrollTrigger with Lenis on one ticker, pinned horizontal travel, a CSS scroll-timeline alternative) and kinetic type (split-word rises, scroll-lit paragraphs, count-ups, marquees).
- Added the `showcase/` work area, which is not a domain: a work contract, a QA contract with fifteen ideal-state properties and twenty-one scenarios, the outcome checker `scripts/check-showcase.mjs`, its fixture self-test, and `scripts/serve-showcase.mjs`. Layout authoring rules do not apply to showcase CSS; outcome checks for overflow, focus, contrast, reduced motion, honest actions, hash navigation, short viewports, offscreen loops, and offline and no-script reading do. No works are committed.
- Added the Creative Build Route to AGENTS.md and registered the domain in the manifest, root routes, governance, ownership, IA, and domain validators and fixtures, and admitted the eleven new documents to Material v2.
- The A2A and AG-UI extension source inventories were regenerated for the edited caller documents, as in the 2026-09-21 research expansion.

Consumer reference: not_applicable
Consumer reference reason: This change adds domain guidance and showcase tooling and selects no consumer-reference profile or record.

## 2026-09-22

- Prepared `stylegallery@0.1.7` with direct website capture, transcription, and workflow commands in the SG CLI and MCP. The compiler remains a separately installed checkout; frozen v1 knowledge entrypoints remain available.
- Routed faithful reconstruction, adaptation, and sale-package work through the compiler's task-aware workflow. Reconstruction prioritizes usable original media, additional observation, explicit replacement decisions, and visual QA. The automatic sale-edition builder is labeled as a package preview.
- Added compiler transport, cancellation, packaged-install, and local real-capture checks. These verify the integration; they do not establish an improvement in clone quality.

Implementation handoff: `consumer_reference: consumer-reference/agent-native/registry.json`.

Consumer reference: declared
Consumer reference record: consumer-reference/agent-native/registry.json

## 2026-09-21

Understood as: substantially enrich Motion, Design Engineering, Platform Guides, and Design Terminology with primary-source research integrated into governed local documents. The user excluded Layout and Game UI from this work.

- Added twelve local research guides: motion accessibility/interruption/rendering; native interaction contracts, multilingual input, and asynchronous feedback; platform adaptation/preferences/input; and token, interaction, and typography semantics. Each separates source-backed findings, local proposals, failure cases, and unexecuted verification scenarios.
- Inspected 66 cited official source pages on 2026-09-21. Recorded source status and target-version limits; read Apple page bodies through official documentation JSON when the HTML reader exposed a JavaScript shell. Preserved prior source-review dates for unrelated term records.
- Added fourteen source-qualified terms and nine scoped relations, bringing the terminology tables to twenty-five terms and seventeen relations. These are author-reviewed experimental judgments, not independent semantic approval.
- Registered the twelve leaves in domain membership, local navigation, the closed Material v2 admission set, and npm packaging. The admitted corpus has 181 documents. New guidance remains experimental and does not add profile values, native implementations, or a domain.
- Verified Markdown structure, links, IA, governance, domain membership, terminology, consumer handoffs, and material admission in an isolated checkout of the research changes. Domain/terminology/governance, consumer/evidence, and frozen-v1 regression suites passed; package installation and CLI/MCP retrieval passed. Fixed the package inventory test's omission of the three existing license/notice files while preserving its exact allow-list assertion.
- Checked every cited URL and fragment. Applied two fresh-reader corrections to the term-comparison method and contributor verification route. Eight author-selected search probes retrieved the intended guide within the first two results; these are retrieval smoke checks, not an independent usability evaluation. No browser, native IME, assistive-technology, or product performance execution is claimed.

Implementation handoff: `consumer_reference: consumer-reference/agent-native/registry.json`.

Consumer reference: declared
Consumer reference record: consumer-reference/agent-native/registry.json

Terminology reliance: `dtcg.alias`, `fluent.alias-token`, `fluent.global-token`, `carbon.color-token`, `dtcg.resolver-modifier`, `html.popover`, `apple.popover`, `html.dialog`, `aria.dialog`, `apple.text-style`, `fluent.type-ramp`, `material3.typography`, `dtcg.typography`, `css.font`, `dtcg.token`, `dtcg.group`, and `css.custom-property`. Relation types used: `partial_overlap`, `implementation_representation`, and `not_comparable`. Named sources for these terms were rechecked on 2026-09-21; the older Figma, historical-format, component/pattern, and Layout relations retain their original review scope. Direct locators and boundaries are in [Term Cases](design-terminology/conflict-cases.md).

## 2026-09-09

- Added a full-page fixed-viewport scene-navigation example with chapter hashes/history, wheel-burst gating, keyboard and art-surface swipe navigation, native copy overflow, immediate reduced-motion transitions, and a complete reading escape.
- Extended Motion, Design Engineering, Platform Guides, and the Homepage composition route for this distinct navigation model. Kept visual values and controllers in the example layer.
- Preserved one device shell across Flow's scroll-controlled scenes and linked the new page through the Scroll Story Lab. Historical verification remains bound to its original source; follow-up checks have separate records.
- Prepared npm 0.1.6 with the cumulative governed-document updates. Runnable examples remain repository-only and are not added to the material admission or npm file inventory.

- Added scroll-story contracts to Motion, a product media handoff to Design Engineering, and browser target cases to Platform Guides. Linked the existing Homepage recipe without adding a new Layout pattern or changing domain lifecycle.
- Replaced the Flow transfer scene with three reversible scroll-controlled chapters and added a second product example, native CSS scrubbing, bounded image decoding, static reading, and deterministic/runtime checks in the Scroll Story Lab.

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
