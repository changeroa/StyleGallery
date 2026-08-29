---
type: Documentation Guide
title: Documentation Mode Taxonomy
description: Primary documentation modes, hybrid decisions, and task routing for StyleGallery.
---

# Documentation Mode Taxonomy

Use this guide when adding, moving, or reviewing documentation. Each page should have one primary documentation mode so readers know whether to learn, follow steps, look up a contract, understand a rationale, or apply a policy gate.

## Modes

| Mode | Reader posture | Page should contain |
| --- | --- | --- |
| Tutorial | Learn by completing a first small task. | Ordered path, concrete starting state, completion marker. |
| How-to | Follow steps to finish a known task. | Action sequence, decision points, expected handoff. |
| Reference | Look up stable facts or contracts. | Names, fields, sections, generated indexes, boundaries. |
| Explanation | Understand principles and rationale. | Why the repo works this way, scope, tradeoffs. |
| Policy/procedure | Decide whether work is admissible. | Required contract, evidence, blocking conditions, boundary. |

Do not use `mixed` as a mode. If a page has more than one reading posture, keep one primary mode and record the secondary mode plus the reason.

## Page-Mode Matrix

| Page or family | Primary mode | Secondary mode | Routing note |
| --- | --- | --- | --- |
| `README.md` | Explanation | How-to | Start here for repository purpose and top-level route selection. |
| `GUIDE.md` | How-to | Explanation | Start here before the layout problem is obvious. |
| `CATALOG.md` | Reference | None | Use when the pattern name or spatial problem is already known. |
| `DOMAINS.md` | Reference | Policy/procedure | Use for top-level domain scope, membership, lifecycle, ownership, and provenance. |
| `GOVERNANCE.md` | Reference | Policy/procedure | Look up source-of-truth, lifecycle, generated artifact, and review-owner rules. |
| `AGENTS.md` | Policy/procedure | Reference | Use when editing the repository as an agent. |
| `index.md` | Reference | None | OKF bundle index and link map. |
| `log.md` | Reference | None | Chronological update record. |
| `layout/index.md` | Reference | How-to | Enter the existing Layout planning, pattern, recipe, and quality routes without moving them. |
| `motion/index.md` | Reference | Explanation | Enter Motion terminology, review, and practice references. |
| `motion/*.md` | Reference or How-to | Explanation | Apply experimental motion terminology and review guidance inside its evidence boundary. |
| `design-engineering/index.md` | Reference | Explanation | Enter Design Engineering product-level decision guidance. |
| `design-engineering/*.md` | Explanation | How-to | Apply experimental practitioner methods without treating taste as proof. |
| `design-engineering/consumer-migration-readiness.md` | How-to | Policy/procedure | Build a consumer-owned migration evidence chain without claiming universal authority. |
| `platform-guides/index.md` | Reference | Explanation | Enter bounded comparative platform references. |
| `platform-guides/*.md` | Explanation | Reference | Compare a named platform with explicit source, version, adaptation, and evidence limits. |
| `state-management/index.md` | Reference | How-to | Enter framework-neutral state planning, pattern, recipe, catalog, and verification routes. |
| `state-management/catalog.md` | Reference | None | Look up a known State Management pattern or recipe. |
| `state-management/guides/*.md` | How-to or Reference | Explanation | Plan authority and lifetime, select patterns, complete a brief, or run the verification matrix. |
| `state-management/patterns/**/*.md` | Reference | Explanation | Apply one experimental application-state responsibility without making a library canonical. |
| `state-management/recipes/*.md` | How-to | Reference | Compose State Management patterns for a common user flow and preserve substitution risk. |
| `guides/decision-tree.md` | How-to | Reference | Route from constraints to pattern families and recipes. |
| `guides/layout-brief.md` | How-to | Reference | Fill before selecting a pattern stack. |
| `guides/vocabulary.md` | Reference | Policy/procedure | Look up canonical terms, aliases, deprecated terms, and scannability rules. |
| `guides/webpage-generation-workflow.md` | How-to | Policy/procedure | Convert raw content into a webpage handoff while preserving gate order. |
| `guides/documentation-mode-taxonomy.md` | Reference | Policy/procedure | Audit documentation modes and routing. |
| `recipes/index.md` | Reference | How-to | Look up screen-level recipes. |
| `recipes/primitive-to-recipe-matrix.md` | Reference | How-to | Compare recipe primitive slots, substitution risks, and structural responsibilities. |
| `recipes/homepage.md` | How-to | Reference | Compose a homepage or ordinary webpage from raw content. |
| `recipes/article-page.md` | How-to | Reference | Compose readable prose with supporting aside content. |
| `recipes/command-surface.md` | How-to | Reference | Compose a command-heavy shell. |
| `recipes/dashboard.md` | How-to | Reference | Compose repeated panels and action clusters. |
| `recipes/form-flow.md` | How-to | Reference | Compose a sequential form path. |
| `recipes/list-detail.md` | How-to | Reference | Compose explorable list and detail regions. |
| `recipes/saas-settings.md` | How-to | Reference | Compose fixed navigation with settings content. |
| `patterns/index.md` | Reference | None | Pattern category index. |
| `patterns/*/index.md` | Reference | None | Category-level pattern index. |
| `patterns/centering/*.md` | Reference | None | Stable centering pattern contracts. |
| `patterns/containment/*.md` | Reference | None | Stable containment pattern contracts. |
| `patterns/grid-repetition/*.md` | Reference | None | Stable grid and repetition pattern contracts. |
| `patterns/in-line-grouping/*.md` | Reference | None | Stable in-line grouping pattern contracts. |
| `patterns/media-fit/*.md` | Reference | None | Stable media fitting pattern contracts. |
| `patterns/overlay-exception/*.md` | Reference | None | Stable overlay and exception pattern contracts. |
| `patterns/split-sidebar/*.md` | Reference | None | Stable split and sidebar pattern contracts. |
| `patterns/stacking/*.md` | Reference | None | Stable stacking pattern contracts. |
| `patterns/viewport-shell/*.md` | Reference | None | Stable viewport and shell pattern contracts. |
| `quality/index.md` | Explanation | Policy/procedure | Understand the quality layer and route to gates. |
| `quality/principles.md` | Explanation | Policy/procedure | Understand shared quality principles before using gates. |
| `quality/claims.md` | Reference | Policy/procedure | Look up structured claim-record requirements and scope rules. |
| `quality/claim-records/index.md` | Reference | None | Look up claim-record examples. |
| `quality/claim-records/samples.md` | Reference | Explanation | Inspect compact examples of high-impact quality claim records. |
| `quality/gates/index.md` | Reference | Policy/procedure | Look up available gate contracts. |
| `quality/gates/accessibility-evidence.md` | Policy/procedure | Reference | Decide whether accessibility evidence supports a claim. |
| `quality/gates/design-claim.md` | Policy/procedure | Reference | Decide whether a non-layout design claim is admissible. |
| `quality/gates/harmony-evaluation.md` | Policy/procedure | Reference | Decide whether a webpage composition can guide implementation. |
| `quality/gates/consumer-migration-evidence.md` | Policy/procedure | Reference | Decide whether declared consumer migration evidence is sufficient. |
| `quality/gates/layout.md` | Policy/procedure | Reference | Decide whether a layout claim satisfies the pattern contract. |
| `quality/gates/rationale.md` | Policy/procedure | Reference | Decide whether a rationale exposes options, warrant, and debt. |
| `quality/gates/visual-evidence.md` | Policy/procedure | Reference | Decide whether rendered evidence supports a visual claim. |
| `quality/evidence/index.md` | Reference | None | Look up evidence reference families. |
| `quality/evidence/accessibility.md` | Reference | Explanation | Understand accessibility evidence boundaries. |
| `quality/evidence/consumer-migration.md` | Reference | Explanation | Understand runtime, browser, session, adoption, freshness, and review boundaries for a migration. |
| `quality/evidence/design-rationale.md` | Reference | Explanation | Understand design-rationale evidence boundaries. |
| `quality/evidence/executable-evidence.md` | Reference | Policy/procedure | Map validators, tests, rendered QA, review, and source citations to claim boundaries. |
| `quality/evidence/families.md` | Reference | Explanation | Look up normalized evidence-family names and boundaries. |
| `quality/evidence/hci-evaluation.md` | Reference | Explanation | Understand HCI evidence boundaries. |
| `quality/evidence/pattern-contract-audit.md` | Reference | Explanation | Map generated pattern contracts to validator and human-review responsibilities. |
| `quality/evidence/search-metadata-polyhierarchy.md` | Reference | Explanation | Document retrieval metadata, facet drift, and search-adoption evidence. |
| `quality/evidence/sources.md` | Reference | Policy/procedure | Look up source admissibility boundaries. |
| `quality/evidence/tokens.md` | Reference | Explanation | Understand token evidence boundaries. |
| `quality/evidence/visual-qa.md` | Reference | Explanation | Understand visual QA evidence boundaries. |

The wildcard rows are intentional. Generated pattern pages share one stable reference contract, and generated category indexes share one stable reference posture.

## Hybrid Decisions

| Page or family | Decision | Reason |
| --- | --- | --- |
| `README.md` | Keep and label | The page primarily explains repository purpose, but it must also route readers to the correct next document. |
| `GUIDE.md` | Keep and label | The page is a how-to entry point, but it needs explanation to separate before-problem and after-problem use. |
| `DOMAINS.md` | Keep and label | The manifest is a domain reference whose scope, lifecycle, and provenance rules also govern edits. |
| `GOVERNANCE.md` | Keep and label | The page is a governance reference whose rules also operate as edit procedure. |
| `AGENTS.md` | Keep as policy/procedure | The page governs agent edits and doubles as a reference for recurring repository rules. |
| `guides/decision-tree.md` | Keep and label | The page is navigational how-to; reference links are necessary outputs, not a competing mode. |
| `guides/layout-brief.md` | Keep and label | The page is a fill-in how-to whose prompts also act as a stable brief reference. |
| `guides/vocabulary.md` | Keep and label | The page is a term reference with policy rules for canonical and deprecated language. |
| `guides/webpage-generation-workflow.md` | Keep and label | The page is a how-to workflow with policy checkpoints around harmony, image reference, and handoff order. |
| `guides/documentation-mode-taxonomy.md` | Keep and label | The page is a reference matrix with policy rules for avoiding unlabeled mixed modes. |
| `recipes/index.md` | Keep and label | The page is a recipe lookup index, with enough how-to routing to choose the next recipe. |
| `recipes/primitive-to-recipe-matrix.md` | Keep and label | The page is a reference matrix that supports how-to substitution decisions. |
| `recipes/*.md` | Intentional hybrid | Recipes teach composition steps while preserving reusable reference contracts for pattern stacks, constraints, and scroll ownership. |
| `state-management/guides/*.md` | Intentional hybrid | Guides route an implementation decision while preserving authority, lifetime, transition, and verification contracts. |
| `state-management/recipes/*.md` | Intentional hybrid | Recipes teach state composition while preserving pattern roles, rejected alternatives, and recovery boundaries. |
| `quality/index.md` | Keep and label | The page explains why the quality layer exists and routes readers into policy/procedure gates. |
| `quality/principles.md` | Keep and label | The page explains shared principles that later become gate policy. |
| `quality/claims.md` | Keep and label | The page is a claim-record reference with procedure for when a record is required. |
| `quality/claim-records/samples.md` | Keep and label | The page is a reference example set that explains why each claim shape is acceptable. |
| `quality/gates/index.md` | Keep and label | The page is a gate lookup index, with policy/procedure routing to the correct contract. |
| `quality/gates/*.md` | Keep as policy/procedure | Gate pages must remain checkable procedures with required contracts, evidence families, blocking conditions, and boundaries. |
| `quality/evidence/*.md` | Keep as reference | Evidence pages define what a source or artifact can support; they do not decide pass/fail by themselves. |

## Task Routing

| User task | Read first | Then read |
| --- | --- | --- |
| Understand what the repository is for. | `README.md` | `DOMAINS.md` |
| Choose the owning StyleGallery domain. | `DOMAINS.md` | The selected domain `index.md` |
| Name or review product motion. | `motion/index.md` | The matching Motion reference or workflow |
| Review a product-level craft decision. | `design-engineering/index.md` | `design-engineering/interface-craft.md`, then the relevant quality gate |
| Prove an existing consumer migration. | `design-engineering/consumer-migration-readiness.md` | `quality/gates/consumer-migration-evidence.md`, then the consumer-owned conformance record |
| Compare an Apple interaction convention. | `platform-guides/index.md` | `platform-guides/apple-interaction.md` and current official sources |
| Plan or review application state. | `state-management/index.md` | `state-management/guides/decision-tree.md`, then `state-management/guides/state-brief.md` |
| Look up a known state pattern. | `state-management/catalog.md` | The matching `state-management/patterns/**/*.md` contract |
| Compose state for a common user flow. | `state-management/recipes/index.md` | The matching recipe and `state-management/recipes/pattern-to-recipe-matrix.md` |
| Choose a layout when the pattern name is unknown. | `GUIDE.md` | `guides/decision-tree.md` |
| Turn raw content into a homepage or webpage. | `guides/webpage-generation-workflow.md` | `recipes/homepage.md`, `quality/gates/harmony-evaluation.md` |
| Look up a known layout primitive. | `CATALOG.md` | The relevant `patterns/*/*.md` page |
| Compose a screen from reusable patterns. | `recipes/index.md` | The matching recipe page and linked pattern contracts |
| Review whether a quality claim is admissible. | `quality/index.md` | The relevant `quality/gates/*.md` and `quality/evidence/*.md` pages |
| Edit repository docs or patterns as an agent. | `AGENTS.md` | This taxonomy and the changed page family |

## First-Run Tutorial Outline

The webpage-generation path needs a tutorial only when a reader has raw content and has not yet produced a layout handoff before. Keep the full workflow in `guides/webpage-generation-workflow.md`; add a separate tutorial only if repeated users need a smaller first success path.

Suggested tutorial outline:

1. Start with one short homepage brief and supplied content blocks.
2. Name the use case and primary task.
3. Map content blocks to section jobs.
4. Choose `recipes/homepage.md` or reject it with one reason.
5. Run the harmony gate checklist.
6. Produce the implementation handoff.

Completion marker:

```txt
First-run complete when the reader has a use case, section-job map, selected recipe, harmony-gate decision, and implementation handoff.
```

Do not treat generated imagery, screenshots, or decorative choices as the tutorial completion marker. The first success is a handoff that can be implemented without weakening semantic order, scroll ownership, or quality-gate boundaries.
