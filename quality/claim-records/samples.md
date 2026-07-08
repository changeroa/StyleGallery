---
type: Quality Reference
title: Sample Claim Records
description: Filled structured quality claims for common review decisions.
---

# Sample Claim Records

These examples show the minimum useful record shape. They are intentionally compact so high-impact claims remain reviewable without becoming heavy documentation work.

## Claim Record 1 - Harmony Before Image Generation

Principle: Accessibility precedence and principles before evidence.

Claim: A homepage GPT Image reference should be generated only after the content-to-layout match and harmony evaluation approve semantic order, section jobs, pattern stack, scroll owner, and constraints.

Context: Webpage generation can otherwise let a visual reference decide layout before source order and task flow are known.

Use case: Homepage or ordinary webpage generation from raw content.

Warrant: The image can help inspect hierarchy and spacing only after the layout contract names the content jobs and constraints it should express.

Evidence family: `rationale`, `source`, `screenshot`.

Verification protocol: Check that the layout brief names use case, section jobs, pattern stack, rejected alternatives, harmony notes, GPT Image reference prompt, and implementation handoff before image generation.

Implementation handoff: Build semantic HTML and layout patterns first; copy only hierarchy, rhythm, media treatment, and CTA priority into product-level styling after the gate passes.

Boundary or limitation: The image cannot prove usability, accessibility, brand fit, or final implementation quality.

Debt or escalation: If the visual reference conflicts with source order, focus order, accessibility, or content stress behavior, regenerate the prompt or record a blocked decision.

Decision: pass when the harmony gate is complete before the image is generated.

## Claim Record 2 - Screenshot Diff Limits

Principle: Visual QA evidence precedes visual judgment.

Claim: A stable screenshot diff supports a rendered-state claim, but it does not prove usability or accessibility.

Context: Visual review often finds regressions, overflow, hidden text, and hierarchy shifts, but user-facing outcomes require stronger evidence.

Use case: not applicable.

Warrant: Screenshots show a bounded rendered state; usability and accessibility depend on task completion, semantics, keyboard flow, assistive technology, and user context.

Evidence family: `screenshot`, `accessibility`, `user`.

Verification protocol: Pair screenshots with the visual-evidence gate and route accessibility or usability claims to their dedicated evidence families.

Implementation handoff: not applicable.

Boundary or limitation: A screenshot can hide focus order, screen-reader output, dynamic states, and untested content stress.

Debt or escalation: Escalate to accessibility or user evidence when the claim says readable, usable, accessible, clear, good, better, or harmonious for a person or task.

Decision: review_required when screenshots are the only evidence for a human-outcome claim.

## Claim Record 3 - Accessibility Scan Limits

Principle: Accessibility is a boundary condition.

Claim: An automated accessibility scan can support a scoped accessibility finding, but it cannot certify complete accessibility.

Context: Automated checks miss keyboard behavior, assistive-technology behavior, cognitive load, language clarity, and some semantic defects.

Use case: not applicable.

Warrant: The scan is validator evidence for detectable rules; complete accessibility needs manual and contextual evidence.

Evidence family: `validator`, `accessibility`, `user`.

Verification protocol: Record the scan tool, ruleset, viewport or state, manual keyboard checks, and any required screen-reader, accessibility-tree, or cognitive review.

Implementation handoff: not applicable.

Boundary or limitation: The scan cannot prove accessibility for every user, device, browser, or assistive-technology pairing.

Debt or escalation: Accessibility debt must name affected users, owner, review trigger, and the evidence gap before it can be accepted.

Decision: blocked when a known accessibility failure is treated as a taste tradeoff or ordinary visual debt.
