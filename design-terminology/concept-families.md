---
type: Domain Guide
title: Design Concept Families
description: Classification of design terms into foundation, interface-artifact, guidance, governance, consumption, and tooling-construct concept families.
domain: design-terminology
lifecycle: experimental
---

# Design Concept Families

Primary role: design-term concept-family classification guide.

## Repository Boundary

This guide classifies design terms by the decision each term serves, as a property of the term's concept, independent of what kind of source uses it. A system's name for itself is not a concept family; see [Design Source Kinds](source-kinds.md). The families are review tools, not a universal ontology, and they never rename StyleGallery's own terms.

## Reusable Method

1. Capture the term inside its native source context with a named source.
2. Identify the underlying concept, then assign one primary concept family.
3. Record scope: whole system, one library, or a single artifact.
4. Record audience and medium: designer-facing, engineer-facing, or tool-layer.
5. Express relations to other terms only through the typed model in [Design Term Relations](relation-types.md).
6. Cite the named source and document surface; never generalize from one source's usage.

## Concept Families

| Family | Question it answers | Typical terms |
| --- | --- | --- |
| `foundation` | What are the smallest reusable inputs? | token, design token, variable, primitive, core, base |
| `interface-artifact` | What are the built interface units? | component, element, control, block, module, variant, state |
| `guidance` | How is intent communicated? | principle, guideline, heuristic, standard, specification, recipe |
| `governance` | How does the system change? | contribution, deprecation, versioning, adoption, migration, maturity |
| `consumption` | Who uses which form? | package, library, kit, theme, plugin, preset |
| `tooling-construct` | What does a tool's data model expose? | design-tool variable, mode, tool component, library file |

`pattern` is recorded as `guidance` or `interface-artifact` depending on the cited source's own scope, never both at once.

## Classification Cases

| Case | Rule | Example |
| --- | --- | --- |
| Same term at different scope | Classify by the scope the source actually defines | `pattern` as workflow guidance in Carbon versus a spatial arrangement in a pattern library |
| Same term for different audiences | Record audience as a separate axis before comparing | `token` in design tooling versus in generated CSS |
| Era shift | Classify by current source usage; note the older meaning as history | `style guide` narrowed as `design system` broadened |
| Tool layer versus system layer | A tool construct is `tooling-construct`, not the system's term for the same concept | A tool's variables versus a system's published token format |
| Local override | A product may rename a family term locally; the family is shared, the authority is not | A product calling patterns `blocks` |

## Opinionated Guidance

- Classify the term as the named source uses it today, then compare through relations; never build one merged definition first.
- Keep family and scope separate: `component` stays `interface-artifact` whether it names a button or a page region.
- Prefer the narrowest scope the source supports; widen only with a second cited source.
- Treat missing terms as gaps in that source's vocabulary, not omissions to fill by inference.

## Platform-Specific Guidance

Record the named source, its kind, and the review date for every classification. Route platform convention comparison to [Platform Guides](../platform-guides/index.md), motion terms to Motion, and StyleGallery's own term decisions to the [Controlled Vocabulary](../guides/vocabulary.md).

## Unsupported Absolutes

- One source's family structure is not a universal taxonomy.
- A term's popularity does not establish its definition.
- A tool vendor's feature name does not define the industry term.
- Absence of a term in one source does not invalidate its use in another.

## Verification Contract

For every classified term, verify the named source still uses the term in the recorded family, scope, audience, and medium; re-check era-shifted terms against the current source; and confirm every cross-source claim carries a typed relation with a boundary.

## Source, License, And Attribution

This page is a locally authored, project-neutral proposed taxonomy. It cites named systems only as usage evidence and reproduces no upstream definitional prose.

## IA Navigation

Parent: [Design Terminology](index.md).
Next: [Design Term Relations](relation-types.md).
