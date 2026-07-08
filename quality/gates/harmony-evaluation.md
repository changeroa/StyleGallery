---
type: Quality Gate
title: Harmony Evaluation Gate
description: Contract for judging webpage content-to-layout fit, visual-reference use, and implementation handoff.
---

# Harmony Evaluation Gate

Use this gate before a generated image or visual reference becomes implementation guidance for a homepage or ordinary webpage.

## Required Contract

Record:

```txt
Use case:
Primary task:
Audience:
Content-to-layout match:
Overall harmony:
Claim record route:
GPT Image reference:
Implementation handoff:
Evidence family:
Verification protocol:
Boundary or limitation:
Decision:
```

## Evidence Families

Use the normalized [evidence family glossary](../evidence/families.md):

- `validator`: layout brief fields, recipe choice, pattern stack, semantic skeleton, linkable workflow docs, and validator output.
- `screenshot`: generated GPT Image reference, screenshots, state captures, viewport captures, and visual diffs.
- `accessibility`: keyboard order, focus visibility, contrast, reduced-motion, semantic landmarks, assistive-technology review, and cognitive accessibility review.
- `user`: content hierarchy review, cognitive walkthrough, visitor decision-path review, design critique, participant testing, or validated measurement.
- `source`: external methodology or standards used to frame the harmony claim.
- `rationale`: claim record, rejected alternatives, limitations, accepted debt, owner, and review trigger.

## Blocking Conditions

Block the harmony claim when:

- the use case is unnamed;
- the page uses a fashionable layout that does not match the content jobs;
- the GPT Image reference is generated before semantic order, section jobs, pattern stack, scroll owner, and constraints are approved;
- a generated image is treated as proof of usability, accessibility, or brand fit;
- visual novelty weakens source order, focus order, task completion, or content stress behavior;
- decorative styling is moved into reusable pattern CSS;
- the implementation handoff omits constraints, scroll ownership, accepted debt, or verification.

## Boundary

This gate decides whether a webpage composition is coherent enough to guide implementation. It does not define the consuming product's brand, typography, color, illustration style, animation system, or component library.

Use a [structured claim record](../claims.md) when the harmony decision approves, blocks, or redirects implementation. Harmony records must include the use case and implementation handoff because they decide what the implementer may safely carry from a visual reference into product-level styling.
