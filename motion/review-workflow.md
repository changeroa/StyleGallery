---
type: Domain Guide
title: Motion Review Workflow
description: Evidence-first workflow for reviewing product-layer motion without changing Layout policy.
domain: motion
lifecycle: experimental
source_repository: https://github.com/emilkowalski/skills
source_path: skills/review-animations/SKILL.md
source_revision: 220e8607c90b17337d210125777b7b695f26c221
---

# Motion Review Workflow

Primary role: motion review procedure.

## Repository Boundary

This workflow reviews declared product-layer motion. It does not review unrelated code, create feature requirements, or turn preferences into blockers. Shared accessibility and evidence gates take precedence; Layout source order, constraints, and scroll ownership remain authoritative for reusable patterns.

## Reusable Method

### Intake

Name the interaction, trigger, frequency, affected state, expected purpose, supported input modes, reduced-motion behavior, and verification surface. If the purpose or observable is absent, record an evidence gap before discussing polish.

### Inspect

Review four boundaries in order:

1. State and source continuity: the before/after states, DOM order, focus, and recoverability remain coherent.
2. Interaction continuity: repeated input, interruption, reversal, cancellation, and rapid state changes do not jump or lock input.
3. Accessibility: motion alternatives and input-capability assumptions match the actual user preference and interaction contract.
4. Delivery evidence: rendered frames, performance traces, and real-device behavior support claims that source inspection cannot prove.

### Finding Record

| Impact | Location | Observed behavior | Proposed change | Warrant | Evidence | Boundary |
| --- | --- | --- | --- | --- | --- | --- |
| What fails for the task | `file:line` or rendered state | Reproducible observation | Smallest corrective direction | Why the evidence supports it | Trace, recording, test, or source | What remains unproven |

### Decision

- `blocked`: a declared local contract, accessibility requirement, or required evidence gate fails.
- `review_required`: the decision depends on missing rendered, device, user, or performance evidence.
- `approve_with_debt`: behavior is acceptable for the declared scope and the remaining bounded debt has an owner and trigger.
- `pass`: all declared motion contracts and required evidence are satisfied.

## Remediation Order

1. Confirm the motion has a task or state purpose.
2. Remove motion that has no necessary job.
3. Reduce frequency, distance, scope, or affected elements.
4. Preserve spatial, semantic, and focus relationships.
5. Make repeated and interrupted state changes continuous.
6. Measure the performance claim on the target surface.
7. Provide an evidence-based alternative for relevant preferences and inputs.
8. Tune product-specific character only after the contracts above pass.

## Opinionated Guidance

Frequency, duration, easing, physicality, and cohesion can be useful review prompts. They remain context-dependent heuristics. “Feels right,” popularity, or a practitioner's preference is not a sufficient warrant for blocking a change.

## Platform-Specific Guidance

CSS transitions, Web Animations, Motion/Framer Motion, pointer events, and component-library transform origins are implementation examples. A review may recommend one only after verifying browser support, current implementation constraints, and the behavior that must change.

## Unsupported Absolutes

Do not automatically block `ease-in`, a particular scale value, motion longer than a fixed threshold, a keyboard-triggered transition, a non-transform property, or a particular stagger interval. Do not claim GPU execution, hardware acceleration, or accessibility from a property name or API choice alone.

## Verification Contract

Exercise the actual interaction in its default, repeated, interrupted, reversed, and reduced-motion states. Record the exact environment and observable. Source review may establish declared code paths; rendered and human outcomes require corresponding evidence families.

## Scroll Story Evidence

For [scroll-driven stories](interaction-recipes.md#scroll-driven-story), add boundary samples immediately before and after each scene transition, forward/reverse comparison, large jumps, direct middle entry, reload/history restoration, narrow and short viewports, long copy, and delayed font/image changes. Deliberately fail or delay a media request and verify stale completion cannot replace current presentation.

Record JavaScript update cost separately from animation-frame intervals: neither alone measures compositor frame delivery. Count idle updates to catch observer/decode feedback loops. Record media dimensions, bounded cache entries, and estimated decoded bytes separately from measured process/GPU memory. Set product-local budgets and keep real-device, touch, assistive-technology, and comfort outcomes `not_run` when unobserved.

The [Scroll Story verification](../examples/scroll-story/verification.md) records the two worked implementations and the limits of the local run.

## Source, License, And Attribution

- Upstream inspiration: [review-animations/SKILL.md](https://github.com/emilkowalski/skills/blob/220e8607c90b17337d210125777b7b695f26c221/skills/review-animations/SKILL.md)
- Snapshot: `220e8607c90b17337d210125777b7b695f26c221`
- Upstream license: MIT, Copyright (c) 2026 Emil Kowalski.
- Reuse form: independent method rewrite; upstream prose, tables, code, examples, and distinctive ordering were not retained.
- Evidence boundary: this procedure adapts a review shape, not its categorical practitioner judgments.

## IA Navigation

Parent: [Motion](index.md).
Next: [Motion Practice Reference](practice-reference.md).
