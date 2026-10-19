---
type: Quality Template
title: Audit Persona And Journey
description: Define the people, constraints, tasks, and recovery paths that a design audit must cover.
aliases: ["audit persona template", "journey audit", "users and tasks"]
questions: ["How do I define personas and journeys for a design audit?"]
---

# Audit Persona And Journey

Primary role: reusable audit planning template.

## Users And How They Use It

Replace assumptions with observations from the product's users. Mark invented personas as hypotheses; neither a browser check nor a screenshot validates them.

| Persona id | Situation and constraints | Goal | Evidence or hypothesis |
| --- | --- | --- | --- |
| visitor | First visit, narrow viewport | Understand the offer and choose a next step | Hypothesis |
| keyboard | Keyboard navigation, no pointer | Complete the same task with visible focus | Hypothesis |
| motion-sensitive | Reduced motion enabled | Read and act without ambient movement | Hypothesis |
| restricted-network | Third-party resources unavailable | Read the essential content | Hypothesis |

## Journeys

| Journey id | Persona refs | Trigger | Steps | Success | Failure and recovery |
| --- | --- | --- | --- | --- | --- |
| discover | visitor, keyboard | Open the entry URL | Read, navigate, activate the primary action | A clear destination or announced result | Explain failure and offer another route |
| read | motion-sensitive, restricted-network | Open a section link | Locate heading, read, return | Essential content remains readable | Static reading without scripts or third-party assets |

## Handoff

Use these ids in the ledger's `persona_refs` and `journey_refs`. Continue with [Ideal States](ideal-state.md), then record severity using the [Severity Scale](severity.md). This is shared Quality methodology, not a domain or a Layout input.

## IA Navigation

Parent: [Audit Kit](README.md).
Next: [Ideal States](ideal-state.md).
