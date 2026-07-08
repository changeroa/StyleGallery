---
type: Evidence Reference
title: Accessibility Evidence
description: Accessibility evidence sources and limits.
---

# Accessibility Evidence

Accessibility evidence combines standards, automated checks, manual review, and user-context judgment.

## Claim Classification Register

Every accessibility claim must name one verification method before it is used in a quality record.

| Verification method | Supports | Does not support | Required record |
| --- | --- | --- | --- |
| automated | Rule-scoped checks such as axe, ACT, contrast math, lint rules, or validator output. | Keyboard logic, screen-reader comprehension, task success, or cognitive load beyond the tested rule. | Tool name, rule set, scope, date, and unresolved findings. |
| manual | Expert review of DOM/source order, focus order, keyboard behavior, screen-reader flow, motion comfort, language clarity, or cognitive load. | Representative user comprehension or population-level accessibility. | Reviewer, scenario, viewport/device if relevant, observed pass/fail, and debt. |
| user | Participant evidence for task completion, comprehension, perceived effort, or assistive-technology fit. | General compliance outside the tested audience and scenario. | Audience, task, method, sample limits, outcome, and follow-up trigger. |
| debt | A known gap accepted for a bounded reason. | A positive accessibility claim. | Affected users, risk, owner, review trigger, and expiry condition. |

## Quality Claim Linkage

Quality claims that mention accessibility must link directly to one register row and one evidence artifact. If the claim depends on multiple facts, split it: for example, contrast may be `automated`, while keyboard order and cognitive load require `manual` or `user` evidence.

## Evidence Types

- WCAG-oriented checks;
- ACT-rule checks;
- automated scan output;
- keyboard and focus review;
- contrast review;
- accessibility-tree or screen-reader review;
- cognitive accessibility review.

## Can Support

- no issue was detected by a tested rule set;
- a specific WCAG or ACT-related condition was checked;
- a manual review found or did not find a stated barrier;
- an accessibility debt item has affected users and a review trigger.

## Cannot Prove

- complete accessibility;
- universal task completion;
- cognitive accessibility for every user;
- assistive technology behavior that was not tested.
- accessibility from a screenshot, visual diff, generated image, or GPT Image reference.

## Required Phrase

Automated accessibility scans assist evaluation, not determine accessibility.
