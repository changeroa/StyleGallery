---
type: Domain Guide
title: Error Messages And Recovery Summaries
description: Explain actionable field errors and make failed submissions discoverable without losing input.
aliases: ["error summary","form error messages","adaptive errors","validation recovery"]
questions: ["How should a form show errors after submission?"]
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-10-19
---

# Error Messages And Recovery Summaries

Primary role: form error recovery guide.

## Repository Boundary

This page owns explanatory errors and their recovery route. [Inline Validation](inline-validation.md) owns timing; [Loading And Feedback](../loading-and-feedback.md) distinguishes confirmed failure from an unknown operation outcome. Shared [accessibility evidence](../../quality/evidence/accessibility.md) remains authoritative.

## Reusable Method

### Problem And Use

A generic failure leaves users guessing which value to change. Use field errors for input rejection and an overall summary when a submitted form has errors that may be offscreen. Avoid blaming a field for network failure, permission denial, or an uncertain payment outcome.

### Recommended Rules

1. Identify the field and the actual violated rule; give a known correction, subject to security and purpose exceptions in SC 3.3.3.
2. Local proposal: one summary at the start of the rejected form, with one link per erroneous field in reading order. A single obvious inline error may need less scaffolding.
3. Preserve accepted entries. On server-rendered failure, expose failure in the page title/main heading; on dynamic failure, choose a deliberate focus or announcement strategy.
4. Keep summary and inline errors synchronized. Remove corrected entries or update the summary on the next validation boundary.
5. Use the real constraint in a numeric message, such as "Choose between 1 and 8 seats", only when that is the actual product limit. Do not invent a universal message count.

### Evidence

| Source | Year | What was measured or specified |
| --- | --- | --- |
| [Baymard adaptive errors](https://baymard.com/research-articles/adaptive-validation-error-messages) | 2023 | Checkout observations include users taking up to five minutes to resolve simple errors with vague messages. This is an observed extreme, not a mean or causal estimate. The 98% generic-message figure is site prevalence, not user failure rate. |
| [Error suggestion, SC 3.3.3](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html) | 2024 Recommendation; living explanation read 2026 | Known correction suggestions required at AA unless security or purpose would be jeopardized; no measured effect size. |
| [WAI form notifications](https://www.w3.org/WAI/tutorials/forms/notifications/) | Living tutorial, read 2026 | Informative guidance on summaries, links, inline relationships, titles, and notifications; not an experimental comparison. |

### Example

Local server-rendered rejected-form fragment; the server must populate only actual current errors and retain the submitted value safely.

```html
<section aria-labelledby="errors">
  <h2 id="errors">Check your booking</h2>
  <ul><li><a href="#seats">Seats: choose between 1 and 8.</a></li></ul>
</section>
<form action="/booking" method="post">
  <label for="seats">Seats</label>
  <input id="seats" name="seats" type="number" min="1" max="8"
    value="9" aria-invalid="true" aria-describedby="seats-error">
  <p id="seats-error">Choose between 1 and 8 seats.</p>
  <button>Review booking</button>
</form>
```

## Opinionated Guidance

Use a focused summary for a dynamic failed submission when it helps recovery, but do not combine focus movement and duplicate assertive announcements blindly. Baymard's 4-7 messages for complex inputs is a checkout heuristic, not a requirement to manufacture errors.

## Platform-Specific Guidance

Native validation bubbles, server navigation, and live updates expose different notification paths. Verify summary-link focus and scroll with sticky headers and zoom.

## Unsupported Absolutes

An error summary is not explicitly mandated by WCAG for every form. Account-existence disclosure is not justified by a general preference for specific errors.

## Verification Contract

Proposed checks: multiple offscreen errors, one error, long localized copy, corrected dependency, server rejection, keyboard summary links, and 400% zoom. Accessibility requires associated inline text, meaningful heading order, visible focus, and no color-only indication. Record actual speech rather than assuming `role="alert"` guarantees it. No consumer execution is claimed. Re-review when constraints, error codes, or notification ownership change.

## Source, License, And Attribution

Locally authored synthesis and fragment; sources rechecked 2026-10-19, no source implementation copied. `consumer_reference: not_applicable` because no consumer error record is selected.

## IA Navigation

Parent: [Evidence Patterns](index.md).
Next: [Persistent Form Labels](form-labels.md).
