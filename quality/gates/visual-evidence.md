---
type: Quality Gate
title: Visual Evidence Gate
description: Rendered evidence requirements and limits for visual QA claims.
---

# Visual Evidence Gate

Visual QA evidence precedes visual judgment.

## Scope

Use this gate when a claim depends on rendered output, visual state, hierarchy, surface treatment, motion, or responsive visual behavior.

## Accepted Evidence

- screenshots across required viewports and states;
- visual diffs against an approved baseline;
- Storybook or equivalent state-level captures;
- reduced-motion before/after evidence when motion is declared;
- notes that identify what changed, what was expected, and what remains interpretive.

## Required Boundary Language

- Screenshot diffs show rendered change, not usability.
- A stable visual diff does not prove accessibility.
- Generated images, GPT Image references, and screenshots are not accessibility proof.
- A visual QA pass does not prove brand fit or aesthetic quality.
- Visual review must cite the principle, task, state, or brief it evaluates.

## Blocking Conditions

Block a rendered-evidence claim when:

- no capture exists for the state being discussed;
- an unapproved visual diff changes a declared contract;
- a screenshot hides essential text, focus, state, or overflow evidence;
- the claim uses rendered stability to erase accessibility or task failures.

## Boundary

Visual QA creates evidence. The design claim gate decides whether that evidence supports the claim.
