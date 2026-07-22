---
type: Decision Record
title: StyleGallery Multi-Domain Scope Decision
description: Decision to supersede the layout-only repository identity with a governed multi-domain umbrella.
---

# StyleGallery Multi-Domain Scope Decision

## Decision

StyleGallery supersedes the repository-wide `layout-gallery` identity with five explicit domains: Layout, Motion, Design Engineering, Game UI, and Platform Guides. The prior layout-only rules remain authoritative inside Layout instead of being deleted or silently weakened.

## Context

The repository name and intended collection now exceed a single spatial corpus. Treating motion, interface craft, game-interface knowledge, engine-specific Game UI implementation, or platform comparison as Layout patterns would violate the existing pattern boundary, while leaving them ungoverned would bypass source-of-truth, ownership, lifecycle, and evidence rules.

## Warrant

Separate domains let each content family name what it owns, what it excludes, what evidence can support it, and who reviews it. Preserving existing Layout paths avoids a destructive migration and keeps the current generator isolated.

## Consequences

- Root navigation selects a domain before domain-local guidance.
- `layout/index.md` is a facade; it does not replace README, the OKF index, planning guide, or catalog.
- Motion and visual references cannot authorize decorative CSS in reusable Layout patterns.
- `quality/**` remains shared evidence and gate infrastructure; Layout-specific gates stay explicitly named.
- New externally inspired content starts experimental and requires immutable provenance plus an evidence boundary.

## Rejected Alternatives

- Keeping a layout-only root and hiding the new material under references would not make it a first-class StyleGallery category.
- Moving all existing Layout paths under `layout/` would break stable links and generated ownership without adding user value.
- Installing upstream agent skills would introduce agent authority, mutable acquisition, and document-contract conflicts instead of repository-native guidance.

## Boundary Or Limitation

This decision establishes information architecture and governance. It does not prove that any practitioner heuristic, platform behavior, accessibility outcome, or performance claim is correct for a product implementation.

## IA Navigation

Parent: [Claim Records](index.md) in [Quality Gates](../index.md).
Next: [StyleGallery Domains](../../DOMAINS.md) for the active domain manifest.
