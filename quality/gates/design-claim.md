---
type: Quality Gate
title: Design Claim Gate
description: Contract for admitting non-layout design claims.
---

# Design Claim Gate

The design claim gate prevents evidence from becoming unsupported authority.

## Required Contract

Every non-layout design claim should state:

```txt
Principle:
Claim:
Context:
Warrant:
Evidence family:
Verification protocol:
Boundary or limitation:
Debt or escalation:
Decision:
```

## Evidence Families

Use the normalized [evidence family glossary](../evidence/families.md):

- `validator`: file shape, headings, frontmatter, source lineage, token structure, fixture output, and CI checks.
- `screenshot`: screenshots, visual diffs, state captures, viewport captures, and rendered DOM artifacts.
- `accessibility`: WCAG/ACT checks, keyboard checks, contrast checks, assistive-technology/manual review, and cognitive accessibility review.
- `user`: heuristic evaluation, cognitive walkthrough, persona or task review, user testing, validated visual-aesthetics instruments, and participant evidence.
- `source`: academic, standards, official tooling, methodology, vendor, practice, and public design-system references inside a stated boundary.
- `rationale`: Toulmin/ADR-style records, options considered, criteria, counterclaims, limitations, debt, owner, and review trigger.

## Blocking Conditions

Block a design claim when:

- it has evidence but no warrant;
- it treats a screenshot diff as proof of usability;
- it treats an automated accessibility scan as proof of accessibility;
- it cites public design systems as proof of universal quality;
- it conflicts with accessibility or task completion;
- it requires changes inside generated layout pattern surfaces.

## Boundary

This gate admits claims. It does not prescribe a product brand, palette, illustration style, typeface, animation system, or component library.
