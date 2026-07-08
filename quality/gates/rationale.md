---
type: Quality Gate
title: Rationale Gate
description: Decision-rationale contract for quality gate judgments.
---

# Rationale Gate

The rationale gate records why a claim is accepted, rejected, blocked, or deferred.

## Required Rationale

Record:

- the question being decided;
- considered options;
- criteria used to compare options;
- selected option;
- warrant connecting evidence to the decision;
- counterclaim or limitation;
- debt, owner, and review trigger when accepted.

## Evidence

Useful rationale evidence includes:

- structured claim records;
- local repository constraints;
- cited design-rationale, HCI, accessibility, or tooling sources;
- rendered evidence;
- accessibility evidence;
- task or persona review;
- user or participant evidence when the claim requires it.

## Blocking Conditions

Block a rationale when:

- it hides a tradeoff;
- it lists sources without saying what each source can and cannot support;
- it accepts accessibility debt without affected users and a review trigger;
- it reopens layout scope without naming the local repo rule being changed.

## Boundary

Rationale does not need to be long. It needs to make the claim, warrant, evidence, and limitation inspectable.

When a rationale contains a high-impact design claim, route it through the [structured quality claim template](../claims.md#claim-record-template) or link to an existing claim record.
