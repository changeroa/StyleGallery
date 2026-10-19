---
type: Quality Reference
title: Audit Severity Scale
description: Apply the NN/g zero through four usability severity scale to audit findings using frequency, impact, and persistence.
aliases: ["NN/g severity", "usability severity scale", "audit prioritization"]
questions: ["How should I rate audit findings from zero to four?"]
---

# Audit Severity Scale

Primary role: severity reference for audit reviewers.

## Scale

| Severity | Meaning | Review decision |
| --- | --- | --- |
| 0 | Not a usability problem | Explain why the observed behavior is acceptable |
| 1 | Cosmetic problem | Fix when time permits |
| 2 | Minor usability problem | Give the fix lower priority |
| 3 | Major usability problem | Give the fix high priority |
| 4 | Usability catastrophe | Resolve before releasing the affected journey |

Judge frequency, impact on the task, and persistence across attempts together. Record the affected persona and journey, observation, recovery cost, and reason for the rating. Independent reviewers can rate first and discuss disagreements; severity is judgment, not a number inferred from CSS or a check's error level.

## Ledger Use

The [ledger schema](ledger.schema.json) accepts integers 0-4. A machine failure is a candidate finding, not automatically severity 3 or 4. Deduplicate overlapping principle findings before counting them. `wont_fix` requires a rationale; `verified` requires a named passing check and a fix reference.

## Attribution

Local paraphrase of [NN/g Severity Ratings for Usability Problems](https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/). This shared Quality reference owns no product values or Layout defaults.

## IA Navigation

Parent: [Audit Kit](README.md).
Next: [Persona And Journey](persona-journey.md).
