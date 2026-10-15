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
Consumer reference: not_applicable
Consumer reference reason: This sample contains no consumer-specific reference record.

Boundary or limitation: The image cannot prove usability, accessibility, brand fit, or final implementation quality.

Debt or escalation: If the visual reference conflicts with source order, focus order, accessibility, or content stress behavior, regenerate the prompt or record a blocked decision.

Decision: pass when the harmony gate is complete before the image is generated.
Evidence refs: `quality/gates/harmony-evaluation.md`
Verified by: human
Reviewed at: 2026-10-15
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 2 - Screenshot Diff Limits

Principle: Visual QA evidence precedes visual judgment.

Claim: A stable screenshot diff supports a rendered-state claim, but it does not prove usability or accessibility.

Context: Visual review often finds regressions, overflow, hidden text, and hierarchy shifts, but user-facing outcomes require stronger evidence.

Use case: not applicable.

Warrant: Screenshots show a bounded rendered state; usability and accessibility depend on task completion, semantics, keyboard flow, assistive technology, and user context.

Evidence family: `screenshot`, `accessibility`, `user`.

Verification protocol: Pair screenshots with the visual-evidence gate and route accessibility or usability claims to their dedicated evidence families.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This screenshot-limits sample contains no consumer-specific reference record.

Boundary or limitation: A screenshot can hide focus order, screen-reader output, dynamic states, and untested content stress.

Debt or escalation: Escalate to accessibility or user evidence when the claim says readable, usable, accessible, clear, good, better, or harmonious for a person or task.

Decision: review_required when screenshots are the only evidence for a human-outcome claim.
Evidence refs: `quality/evidence/visual-qa.md`, `quality/gates/visual-evidence.md`
Verified by: mixed
Reviewed at: 2026-10-15
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 3 - Accessibility Scan Limits

Principle: Accessibility is a boundary condition.

Claim: An automated accessibility scan can support a scoped accessibility finding, but it cannot certify complete accessibility.

Context: Automated checks miss keyboard behavior, assistive-technology behavior, cognitive load, language clarity, and some semantic defects.

Use case: not applicable.

Warrant: The scan is validator evidence for detectable rules; complete accessibility needs manual and contextual evidence.

Evidence family: `validator`, `accessibility`, `user`.

Verification protocol: Record the scan tool, ruleset, viewport or state, manual keyboard checks, and any required screen-reader, accessibility-tree, or cognitive review.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This accessibility-limits sample contains no consumer-specific reference record.

Boundary or limitation: The scan cannot prove accessibility for every user, device, browser, or assistive-technology pairing.

Debt or escalation: Accessibility debt must name affected users, owner, review trigger, and the evidence gap before it can be accepted.

Decision: blocked when a known accessibility failure is treated as a taste tradeoff or ordinary visual debt.
Evidence refs: `quality/evidence/accessibility.md`, `quality/gates/accessibility-evidence.md`
Verified by: human
Reviewed at: 2026-10-15
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 4 - Scroll-Body-Shell Scroll Ownership

Principle: A layout pattern owns its named scroll container.

Claim: The `scroll-body-shell` pattern keeps header and footer regions fixed while only the named body region scrolls, with no horizontal overflow and keyboard focus following DOM order, at 320, 768, and 1440 CSS pixels.

Context: Viewport-shell patterns regress silently when a layout change hands scroll to the document root, traps focus, or overflows a narrow viewport; prose alone cannot catch this.

Use case: not applicable.

Warrant: A browser render oracle loads a faithful demo of the pattern at three widths and asserts the body is the only scroll owner, the document root does not overflow, Tab order matches DOM order, reduced motion shows no running infinite animation, and axe-core reports no serious or critical violation.

Evidence family: `validator`, `rendered`.

Verification protocol: `node scripts/check-pattern-oracle.mjs --json` renders the demo fixture and fails when any width breaks the contract; `node scripts/test-check-pattern-oracle.mjs` guards the oracle with positive and negative fixtures.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This pattern-oracle sample contains no consumer-specific reference record.

Boundary or limitation: The oracle proves the demo's rendered layout contract on one Chromium engine; it does not prove the pattern is usable, accessible for every assistive technology, or correct in browsers it does not render.

Debt or escalation: Extend the oracle to more patterns only after measuring CI time and render stability; a flaky render is a blocking defect, not an accepted cost.

Decision: pass when the oracle is green at all three widths.
Evidence refs: `scripts/check-pattern-oracle.mjs`, `scripts/test-check-pattern-oracle.mjs`, `tests/fixtures/pattern-oracle/scroll-body-shell/index.html`
Verified by: auto
Reviewed at: 2026-10-15
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## IA Navigation

Parent: [Claim Records](index.md) in [Quality Gates](../index.md).
Next: [Structured Quality Claims](../claims.md) for the template and high-impact scope rule.
