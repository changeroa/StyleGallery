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
Consumer reference: not_applicable
Consumer reference reason: This blank claim template declares no consumer-specific reference record.
Boundary or limitation:
Debt or escalation:
Decision:
Evidence refs:
Verified by:
Reviewed at:
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable
```

`Use case` and `Implementation handoff` are required for harmony claims. For other claim types, write `not applicable` rather than deleting the fields.

## Machine Fields

Records under `claim-records/` carry machine-readable fields so a validator can check them in CI. `scripts/validate-claim-records.mjs` enforces these fields; `scripts/test-validate-claim-records.mjs` guards the validator with positive and negative fixtures.

- `Evidence refs`: one or more backticked refs, comma-separated. A ref is a repository-relative path that must resolve to an existing file, or an agent-native StableRef-style id (for example `sg://...` or a dotted `domain.kind`). At least one ref is required. Inline code is used so link checking does not treat a ref as a navigable link.
- `Verified by`: exactly one of `auto`, `human`, or `mixed`.
- `Reviewed at`: a real `YYYY-MM-DD` date (the freshness review date).
- `Review by`: a real `YYYY-MM-DD` date or `not applicable`.
- `Source revision`: a commit SHA, URL, or `not applicable`, recorded for the deferred external-source drift audit.
- `Conflicts with`: backticked claim refs or `not applicable`, recorded for the deferred conflict index.

Automation certifies only what it can check: `Verified by: auto` is allowed only when the `Decision` is `pass`, and every `Evidence refs` entry must then be executable (a `scripts/` or `tests/` path, or a StableRef id). A `review_required` or `blocked` decision needs `human` or `mixed` verification, which in turn must cite at least one human-review artifact under `quality/evidence/` or `quality/gates/`. This keeps the repository's own rule that a scan cannot certify complete accessibility.

## Source Of Truth

Markdown claim records under `quality/claim-records/*.md` are the canonical, human-authored source of truth for claims, consistent with the governance matrix (quality docs are a Manual `quality/**/*.md` family). The agent-native epistemic graph under `consumer-reference/agent-native/` is a separate machine representation; the machine field names here align with its `claim` record (`evidence_refs`, `validation_refs`, `observed_at`) so the two can converge through a future projection, without making either import the other.

## Review Rule

A record is complete only when the evidence family names what the artifact can support and the boundary says what it cannot prove. Evidence without a warrant remains a blocking condition, and a machine-readable record is complete only when its machine fields pass `scripts/validate-claim-records.mjs`.

## IA Navigation

Parent: [Quality Gates](index.md).
Next: [Sample Claim Records](claim-records/samples.md) for compact examples of completed quality decisions.
