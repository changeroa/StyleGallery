---
type: Domain Guide
title: Design Source Kinds
description: Classification of vocabulary sources into design system, platform guideline, specification, design tool, pattern library, and brand style guide kinds.
domain: design-terminology
lifecycle: experimental
---

# Design Source Kinds

Primary role: vocabulary source-kind classification guide.

## Repository Boundary

This guide classifies what kind of thing a vocabulary source is before any of its terms are read or compared. Source kind is a property of the source, not of a term; a term inherits its source's kind for reading rules only. The kinds are review tools for comparing sources, not a ranking of authority.

## Reusable Method

1. Identify the named source and its official link.
2. Assign one primary source kind.
3. Record what the kind implies for reading its terms: audience, stability, and versioning behavior.
4. Record the version boundary: specification version, product version, OS release cycle, or a dated review set for living sites.
5. Re-classify when a source restructures, such as a design tool publishing a system layer.
6. Never compare terms across kinds as though the kinds were identical.

## Source Kinds

| Source kind | What it is | How to read its terms | Examples |
| --- | --- | --- | --- |
| `design-system` | A maintained, layered collection of foundations, components, and guidance, usually with code | Terms name layers of one system's current release; expect drift across releases | Material 3, Fluent 2, Carbon, Polaris |
| `platform-guideline` | A platform owner's rules for software on that platform | Terms are scoped to the platform's release cycle and certification context | Apple Human Interface Guidelines |
| `specification` | A versioned interchange or conformance document | Terms are defined exactly for the version; meaning changes require a new version | W3C Design Tokens Format |
| `design-tool` | A product whose data model exposes tool constructs | Terms name tool features, not industry definitions; product versions rename freely | Figma variables, modes, components |
| `web-platform` | A browser or platform runtime mechanism | Terms name runtime behavior standardized across vendors, not one system's vocabulary | CSS custom properties |
| `pattern-library` | A curated collection of reusable solutions, with or without a full system | Terms name the collection's own units; scope is the collection, not an organization | StyleGallery Layout patterns |
| `brand-style-guide` | An organization's visual and voice governance document | Terms govern expression, not interface structure; often narrower than a design system | Historical print-lineage style guides |

## Classification Cases

| Case | Rule | Example |
| --- | --- | --- |
| Platform guideline mistaken for a design system | A platform guideline binds a platform release; a design system versions itself | HIG is a platform guideline even though it looks system-like |
| Specification mistaken for a system | A specification defines an interchange shape; it ships no components or guidance | DTCG Format defines the token data model, not a token set |
| Tool feature mistaken for an industry term | A tool construct is evidence of the tool's model, not a universal definition | Figma `variables` is a feature name |
| Pattern library inside a system | A library can be part of a system; classify by what is being cited | Citing Carbon patterns cites the system's library layer |
| Brand guide that grew into a system | Classify by what the cited source governs today, and record the history | An org guide that now ships tokens and code |

## Opinionated Guidance

- Record source kind before recording any term from that source.
- Treat kind and authority as separate: an official source of any kind is authoritative only for itself.
- Prefer the narrowest kind that fits the cited surface.
- Date every kind assignment; sources restructure.

## Platform-Specific Guidance

Platform guideline sources are recorded here only for terminology. Bounded comparison of their interaction conventions belongs to [Platform Guides](../platform-guides/index.md); engine vocabulary belongs to Game UI.

## Unsupported Absolutes

- Source kind does not imply quality or maturity.
- One system's layer structure is not a template for other kinds.
- A tool's market share does not convert its feature names into industry terms.
- A specification's precision does not extend to systems that consume it.

## Verification Contract

For every recorded source, verify the official link resolves, the source kind still fits the cited surface, the version boundary is stated, and the review date is current enough for the claim being made.

## Source, License, And Attribution

This page is a locally authored, project-neutral classification. Named sources are cited only as examples of their kind; no upstream definitional prose is reproduced.

## IA Navigation

Parent: [Design Terminology](index.md).
Next: [Design Source Vocabularies](source-vocabularies.md).
