---
type: Evidence Reference
title: Visual QA Evidence
description: Rendered evidence sources and limits.
---

# Visual QA Evidence

Visual QA evidence helps inspect rendered output.

## Evidence Types

- screenshot baselines;
- visual diffs;
- responsive viewport captures;
- state captures for hover, focus, active, disabled, error, expanded, and loading states;
- reduced-motion captures when motion behavior is claimed.

## Can Support

- a rendered state changed;
- a rendered state stayed stable against a baseline;
- a viewport or state has evidence available for review;
- visual review can proceed from concrete artifacts.

## Cannot Prove

- usability;
- accessibility;
- brand fit;
- aesthetic quality;
- task completion.

To produce paired captures and diffs for a pull request, use [Before/After PR Evidence](before-after-pr-evidence.md).

## Required Phrase

Screenshot diffs show rendered change, not usability.

## IA Navigation

Parent: [Evidence References](index.md).
Next: [Quality Gates](../index.md) to decide whether the evidence supports a claim.
