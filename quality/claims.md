---
type: Quality Reference
title: Structured Quality Claims
description: Claim-record template and scope rules for high-impact design judgments.
---

# Structured Quality Claims

Use a claim record when a design judgment would otherwise rest on taste, authority, or an unlabeled artifact.

The record makes the review chain inspectable:

```txt
principle -> claim -> context -> warrant -> evidence family -> verification protocol -> boundary/debt
```

## High-Impact Claim

A high-impact claim is any statement that can block, approve, or redirect layout, accessibility, implementation, or design-review work.

Treat the following as high-impact terms when they decide work rather than describe prose:

- `good`, `better`, or `best`;
- `harmonious` or `harmony`;
- `appropriate`, `proper`, or `fit`;
- `usable`, `accessible`, `readable`, `credible`, or `clear`;
- claims that a screenshot, source, generated image, validator, or public design system proves quality.

## When A Claim Record Is Required

Create a claim record when:

- a quality gate accepts, rejects, blocks, or defers a claim;
- a harmony evaluation decides whether a GPT Image reference can guide implementation;
- a screenshot, validator, accessibility scan, source, or rationale artifact is used as evidence;
- a high-impact term changes the pattern stack, source order, accessibility requirement, implementation handoff, or accepted debt;
- a claim names user perception, usability, accessibility, or visual quality.

## Low-Risk Prose

Do not require a claim record for:

- navigation text, index summaries, or cross-reference copy;
- examples that do not approve or block work;
- local descriptions of fields already governed by a linked gate;
- editorial wording that does not create implementation guidance.

Low-risk prose can still link to a gate or claim record when the reader needs the review boundary.

## Claim Record Template

```txt
Principle:
Claim:
Context:
Use case:
Warrant:
Evidence family:
Verification protocol:
Implementation handoff:
Boundary or limitation:
Debt or escalation:
Decision:
```

`Use case` and `Implementation handoff` are required for harmony claims. For other claim types, write `not applicable` rather than deleting the fields.

## Review Rule

A record is complete only when the evidence family names what the artifact can support and the boundary says what it cannot prove. Evidence without a warrant remains a blocking condition.
