---
type: Repository Guide
title: StyleGallery
description: Governed gallery of portable interface knowledge organized by domain.
---

# StyleGallery

StyleGallery is a governed gallery of portable interface knowledge. It separates reusable spatial patterns, product-layer motion guidance, design-engineering practice, and platform-specific references into explicit domains with different evidence and ownership boundaries.

Primary role: repository guide.

The existing Layout corpus remains a gallery of minimal, portable CSS layout patterns at its current paths. Each pattern documents one primary spatial problem and the smallest robust HTML/CSS structure that solves it. Motion, visual treatment, and platform guidance do not expand reusable Layout pattern CSS; they live in their own domains and carry explicit evidence boundaries.

[Consumer Reference](consumer-reference/index.md) is shared non-domain infrastructure for optional consumer-owned reference handoffs. It carries schema, routing, provenance, and evidence metadata without owning profiles, visual values, components, or a sixth domain.

[Agent-Native StyleGallery](consumer-reference/agent-native/README.md) is the machine-facing entry point over that governed knowledge. Frozen v1 provides claim/evidence/governance records through `sg` and its MCP; isolated material v2 indexes admitted Markdown and exposes `sg-material` plus a separate read-only MCP. Lifecycle records own extension and archive dispositions. These material, trust/conformance, transport, and extension planes do not create a sixth domain, replace the Markdown corpus, permit mutation, or feed visual defaults back into Layout.

## Quick Start

StyleGallery requires Node.js 22 or newer. Run a command without installing anything globally:

```sh
npx stylegallery discover --format json
```

Or install the CLI globally:

```sh
npm install --global stylegallery
sg discover --format json
```

Common read-only commands:

```sh
sg resolve sg:profile/editorial-reference-profile --format json
sg claims sg:profile/editorial-reference-profile --format json
sg context sg:profile/editorial-reference-profile --format json
sg ops --format json
```

Every command writes deterministic JSON to stdout. Invalid input returns an error object and a nonzero exit status. See [Agent-Native StyleGallery](consumer-reference/agent-native/README.md) for the command contract, StableRef and VersionID model, MCP resources, and trust boundaries.

Material v2 searches the admitted Markdown corpus and returns JSON without an additional format flag:

```sh
sg-material discover
sg-material search --query "sticky layout" --limit 5
sg-material context --query "responsive sidebar" --budget-tokens 4096
```

### Read-only MCP server

Launch the packaged stdio server with:

```sh
npx --package stylegallery stylegallery-mcp
```

Example MCP client configuration:

```json
{
  "mcpServers": {
    "stylegallery": {
      "command": "npx",
      "args": ["--yes", "--package", "stylegallery", "stylegallery-mcp"]
    }
  }
}
```

The MCP surface exposes governed read operations only. It cannot modify repository knowledge.

The separate Material v2 MCP server is available as `stylegallery-material-mcp`.

## 한국어 빠른 시작

StyleGallery는 Node.js 22 이상에서 실행됩니다. 전역 설치 없이 바로 사용하려면 다음 명령을 실행하세요.

```sh
npx stylegallery discover --format json
```

자주 사용한다면 전역으로 설치할 수 있습니다.

```sh
npm install --global stylegallery
sg discover --format json
```

`discover`는 사용 가능한 인터페이스를 보여주고, `resolve`는 하나의 레코드를 조회하며, `claims`는 관련 주장과 근거를 분리해서 보여줍니다. `context`는 에이전트에 전달할 수 있는 제한된 컨텍스트 패키지를 만들고, `ops`는 지원하는 작업 목록을 반환합니다. `sg-material search --query "검색어"`를 사용하면 Material v2에 등록된 Markdown 문서를 검색할 수 있습니다. 모든 결과는 자동화에 바로 사용할 수 있는 JSON입니다.

CLI와 MCP의 상세 사용법은 [Agent-Native StyleGallery 가이드](consumer-reference/agent-native/README.md)를 참고하세요. 사람이 문서를 탐색하려면 아래의 도메인 표에서 목적에 맞는 진입점을 선택하면 됩니다.

## Domains

| Domain | Owns | Does not own |
| --- | --- | --- |
| [Layout](layout/index.md) | Semantic spatial structure, flow, sizing, alignment, containment, scrolling, and composition. | Brand, typography, color, shadow, animation, and product decoration. |
| [Motion](motion/index.md) | Motion terminology, review procedure, and evidence-bounded practice guidance. | Universal timing/easing rules or permission to add motion to reusable Layout CSS. |
| [Design Engineering](design-engineering/index.md) | Product-layer craft decisions and verification questions. | A second universal principle set or taste as evidence. |
| [Game UI](game-ui/index.md) | Game-interface classification, hierarchy, reference records, and engine-specific implementation guides. | Reusable Layout CSS or claims that one engine structure is universal. |
| [Platform Guides](platform-guides/index.md) | Bounded comparison with named platform conventions. | Affiliation, imitation, or authority over web and accessibility contracts. |

The canonical domain manifest and provenance policy are in [StyleGallery Domains](DOMAINS.md).

## Repository Entry Roles

Use each root hub for one primary job.

| Entry | Primary role | Use when |
| --- | --- | --- |
| [README](README.md) | Repository guide | You need the library purpose, policies, and task routes. |
| [OKF index](index.md) | OKF bundle map | You need a compact knowledge-bundle table of contents. |
| [Layout Planning Guide](GUIDE.md) | Planning workflow | You need to classify a screen before choosing patterns. |
| [Layout Pattern Catalog](CATALOG.md) | Pattern lookup | You already know the spatial problem or pattern name. |
| [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md) | Governance reference | You need the source of truth, lifecycle, generated-file, ownership, or stale-audit rule. |
| [StyleGallery Domains](DOMAINS.md) | Domain manifest | You need domain ownership, scope, lifecycle, page membership, or provenance. |
| [Consumer Reference](consumer-reference/index.md) | Shared infrastructure contract | You need to declare a consumer-owned record or explain why one is not applicable. |
| [Agent-Native StyleGallery](consumer-reference/agent-native/README.md) | Machine interface guide | A person or agent needs to discover, resolve, retrieve, or inspect governed StyleGallery knowledge through CLI or MCP. |
| [Layout](layout/index.md) | Layout domain hub | You need reusable spatial patterns, recipes, or planning routes. |
| [Motion](motion/index.md) | Motion domain hub | You need motion terminology, review procedure, or practice evidence. |
| [Design Engineering](design-engineering/index.md) | Design Engineering domain hub | You need product-level interface-craft decision guidance. |
| [Game UI](game-ui/index.md) | Game UI domain hub | You need to classify a game interface or understand its screen hierarchy. |
| [Platform Guides](platform-guides/index.md) | Platform Guides domain hub | You need a bounded platform comparison. |

## Task Routes

Each common task has one primary route. Use secondary links only after the primary route answers the first decision.

| Task | Primary route | Why |
| --- | --- | --- |
| `choose a StyleGallery domain` | [StyleGallery Domains](DOMAINS.md) | It separates domain ownership before a reader applies domain-local guidance. |
| `browse reusable spatial guidance` | [Layout](layout/index.md) | It preserves the existing pattern, recipe, and planning routes. |
| `name or review interface motion` | [Motion](motion/index.md) | It routes to bounded terminology and review guidance. |
| `review product-level interface craft` | [Design Engineering](design-engineering/index.md) | It separates practitioner heuristics from shared quality gates. |
| `compare adversarial consumer identities` | [Reference Profiles](design-engineering/reference-profiles/index.md) | It keeps non-default product values in related Design Engineering examples over one pinned Layout source. |
| `classify a game interface or map it to an engine` | [Game UI](game-ui/index.md) | It separates engine-neutral roles from implementation-specific guidance. |
| `compare a named platform convention` | [Platform Guides](platform-guides/index.md) | It requires platform and evidence boundaries before adaptation. |
| `turn raw content into a homepage or ordinary webpage` | [Webpage Generation Workflow](guides/webpage-generation-workflow.md) | It starts with use case, content-to-layout fit, harmony, and handoff. |
| `plan a screen before the layout problem is obvious` | [Layout Planning Guide](GUIDE.md) | It sequences task, content, scroll, recipe, and verification choices. |
| `choose a pattern when the name is unknown` | [Decision Tree](guides/decision-tree.md) | It routes from constraints to pattern categories. |
| `fill in requirements before selecting a pattern stack` | [Layout Brief Template](guides/layout-brief.md) | It captures content, constraints, and verification inputs. |
| `stabilize repository terminology` | [Controlled vocabulary](guides/vocabulary.md) | It defines canonical terms, aliases, deprecated terms, and scannability rules. |
| `compose a full screen from primitives` | [Layout Recipes](recipes/index.md) | Recipes map screen models to pattern stacks. |
| `inspect which primitives a recipe depends on` | [Primitive To Recipe Matrix](recipes/primitive-to-recipe-matrix.md) | It names essential, helper, and substitutable slots. |
| `look up a known layout primitive` | [Layout Pattern Catalog](CATALOG.md) | It is the generated pattern lookup surface. |
| `browse pattern categories` | [Pattern Categories](patterns/index.md) | It groups generated patterns by spatial family. |
| `check whether a layout or design claim is admissible` | [Quality Gates](quality/index.md) | It routes claims to gates and evidence boundaries. |
| `prove repository checks and evidence coverage` | [Executable Evidence Coverage](quality/evidence/executable-evidence.md) | It maps validators, fixtures, CI commands, and their boundaries. |
| `declare consumer reference applicability` | [Consumer Reference](consumer-reference/index.md) | It provides the required handoff field without moving consumer values into Layout. |
| `use StyleGallery from an agent or automation` | [Agent-Native StyleGallery](consumer-reference/agent-native/README.md) | It routes frozen v1 trust queries, material v2 discovery/search/get/context, both read-only MCPs, extensions, lifecycle dispositions, and archive boundaries. |
| `prove an existing consumer migration` | [Consumer Migration Readiness](design-engineering/consumer-migration-readiness.md) | It requires thirteen explicit behavior classifications, runtime proof, adoption mappings, and source-bound page evidence when applicable. |
| `change generated patterns, catalog, or governance policy` | [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md) | It identifies source files, generated artifacts, validators, lifecycle state, and review ownership. |
| `run findability QA` | [Tree-Test Findability QA](quality/index.md#tree-test-findability-qa) | It tests whether task routes are discoverable, not just linked. |

## Link Policy

- Navigation links move a reader to the next decision point in the repository. Root hubs, indexes, parent links, and next-step links are navigation links.
- Citation links identify source lineage or evidence boundaries. They support a claim but should not be the only way to continue a task.
- Dependency links identify generated, validation, or composition relationships. They explain what must stay in sync, such as `scripts/pattern-data.mjs`, generated pattern files, catalog entries, and validator fixtures.

## How To Use This Repository

- Start with [StyleGallery Domains](DOMAINS.md) when the owning domain is not already clear.
- Use [Layout](layout/index.md), [Motion](motion/index.md), [Design Engineering](design-engineering/index.md), [Game UI](game-ui/index.md), or [Platform Guides](platform-guides/index.md) as the domain-local entry point.
- Start with [Layout Planning Guide](GUIDE.md) when you are designing a screen before a layout problem is obvious.
- Use the [Webpage Generation Workflow](guides/webpage-generation-workflow.md) when raw content needs to become a homepage or ordinary webpage before a layout recipe is obvious.
- Use the [Documentation Mode Taxonomy](guides/documentation-mode-taxonomy.md) when adding or reviewing docs so each page has a clear primary reading mode.
- Use the [Controlled vocabulary](guides/vocabulary.md) when a term affects routing, metadata, search, claim records, workflow handoff, or review decisions.
- Use the [Decision Tree](guides/decision-tree.md) when you do not know the pattern name yet.
- Fill out the [Layout Brief Template](guides/layout-brief.md) before choosing a pattern stack.
- Use [Layout Recipes](recipes/index.md) when you need screen-level composition.
- Use [Layout Pattern Catalog](CATALOG.md) when you already know the spatial problem.
- Use [Quality Gates](quality/index.md) when a claim needs principle-backed evidence, visual QA boundaries, accessibility precedence, or design rationale.
- Use [Consumer Reference](consumer-reference/index.md) when an implementation handoff must declare one repository-local JSON reference or a sentence explaining non-applicability.
- Use [Agent-Native StyleGallery](consumer-reference/agent-native/README.md) when a person, script, or agent needs deterministic JSON discovery, StableRef/VersionID resolution, bounded context, operation metadata, or read-only MCP access.
- Use [Consumer Migration Readiness](design-engineering/consumer-migration-readiness.md) only for a migration that declares a consumer-local conformance record; ordinary handoffs keep the existing `not_applicable` path.
- Use [Governance, Lifecycle, And Docs-As-Code](GOVERNANCE.md) before changing generated artifacts, validators, lifecycle state, or ownership policy.

## Layout Domain Principles

Layout patterns solve one primary spatial problem with semantic structure, robust plain HTML/CSS, explicit constraints, named scroll ownership, and no decorative debt. The detailed principles live in the [Layout domain contract](layout/index.md#layout-domain-principles).

## CSS Authoring Policy

Reusable Layout CSS favors low specificity, intrinsic sizing, logical properties, and responsiveness at the correct container or viewport boundary. See the [detailed CSS authoring policy](layout/index.md#css-authoring-policy).

## Class Naming Policy

Layout class names describe stable spatial responsibilities and relationships rather than appearance or DOM depth. See the [detailed class naming policy](layout/index.md#class-naming-policy).

## Value And Token Policy

Tokens represent stable shared design intent; browser and context mechanics remain explicit CSS values. See the [detailed value and token policy](layout/index.md#value-and-token-policy).

## Pattern Contract

Every pattern documents its primary problem, structure, constraints, scroll ownership, accessibility, fallbacks, composition, and failure boundaries. See the [detailed pattern contract](layout/index.md#pattern-contract), and use the generated [Pattern Categories](patterns/index.md) as the category inventory.

## Verification Matrix

Pattern verification covers the relevant viewport, container, content, direction, writing-mode, interaction, overflow, focus, and sticky/scroll cases. See the [detailed verification matrix](layout/index.md#verification-matrix).
