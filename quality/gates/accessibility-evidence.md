---
type: Quality Gate
title: Accessibility Evidence Gate
description: Accessibility evidence requirements and overclaim boundaries.
---

# Accessibility Evidence Gate

Accessibility precedes taste.

## Scope

Use this gate when a claim affects access, comprehension, keyboard use, screen-reader flow, contrast, motion comfort, error recovery, or cognitive load.

## Accepted Evidence

- WCAG-oriented checks where applicable;
- ACT-rule, axe, Storybook, or equivalent automated findings;
- keyboard and focus-path checks;
- contrast and non-color-only meaning checks;
- screen-reader or accessibility-tree review when the claim depends on semantics;
- cognitive accessibility review for language, memory burden, predictability, and help.

## Verification Method Register

Classify every accessibility claim before approval:

- `automated`: rule-scoped machine checks such as axe, ACT, contrast math, lint output, or validator output.
- `manual`: expert review of DOM order, focus order, keyboard behavior, screen-reader flow, language clarity, motion comfort, or cognitive load.
- `user`: participant evidence for task completion, comprehension, assistive-technology fit, or perceived effort.
- `debt`: a known accessibility gap with affected users, owner, review trigger, and expiry condition.

The claim record must include the verification method, the evidence artifact, the boundary, and any accepted debt. A rendered screenshot, visual diff, generated image, or GPT Image reference can be supporting context only; it is not an accessibility verification method.

## Required Boundary Language

- Automated accessibility scans assist evaluation, not determine accessibility.
- Passing an automated scan means no issue was found by that tested rule set.
- Manual judgment is required for claims involving task completion, cognitive load, clarity, assistive technology behavior, or user comprehension.
- Visual evidence cannot prove accessibility unless it is paired with the relevant automated, manual, user, or debt record.

## Blocking Conditions

Block an accessibility claim when:

- focus is invisible or illogical;
- essential meaning depends on color alone;
- required alternatives for media are missing;
- motion lacks a reduced-motion path when motion safety is declared;
- a known accessibility failure is treated as a taste tradeoff;
- accessibility debt lacks affected users and a review trigger.

## Boundary

Accessibility evidence may require expert or user review. Do not turn a scan result into a complete accessibility certification.
