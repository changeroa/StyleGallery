---
type: Evidence Reference
title: Evidence Family Glossary
description: Normalized evidence families for structured quality claims.
---

# Evidence Family Glossary

Use these evidence-family names in claim records. A claim can cite more than one family when the warrant needs multiple kinds of support.

## `validator`

Executable checks, fixtures, schema validation, link checks, and CI output.

- Can support: file shape, required fields, link integrity, route order, repeatable mechanical constraints.
- Cannot prove: usability, accessibility, visual quality, brand fit, or user comprehension.

## `screenshot`

Screenshots, visual diffs, viewport captures, state captures, and rendered DOM artifacts.

- Can support: what rendered at a specific viewport, state, density, or interaction point.
- Cannot prove: task success, accessibility, user preference, or complete responsive behavior by itself.

## `accessibility`

Automated scans, keyboard checks, contrast checks, semantic review, screen-reader or accessibility-tree review, reduced-motion checks, and cognitive accessibility review.

- Can support: named accessibility risks, pass/fail observations, and review scope.
- Cannot prove: complete accessibility for every user or every assistive-technology pairing.

## `user`

Participant evidence, task review, persona review, cognitive walkthrough, heuristic evaluation, or validated perception instruments.

- Can support: task success, perceived clarity, user comprehension, or human-judgment claims inside the observed population and method.
- Cannot prove: universal preference, brand quality, or outcomes outside the tested task.

## `source`

Academic, standards, official tooling, methodology, vendor, practice, or public design-system references.

- Can support: vocabulary, methods, constraints, standards, and implementation examples.
- Cannot prove: local quality unless connected to repository context, rendered evidence, and a warrant.

## `rationale`

ADR-style or Toulmin-style records, options considered, criteria, counterclaims, limitations, debt, owner, and review trigger.

- Can support: why a decision is admissible, what alternatives were rejected, and what boundary controls the claim.
- Cannot prove: the selected option is empirically best without `user` or other outcome evidence.
