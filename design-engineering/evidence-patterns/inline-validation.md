---
type: Domain Guide
title: Inline Validation Timing
description: Validate completed input without interrupting initial entry and clear corrected errors promptly.
aliases: ["inline validation","validation timing","validate on blur","premature validation"]
questions: ["When should form fields show validation errors?"]
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-10-19
---

# Inline Validation Timing

Primary role: form validation decision guide.

## Repository Boundary

This page owns when product validation becomes visible. [Text Input And Internationalization](../text-input-and-internationalization.md) owns composition and editing; [Error Recovery](error-recovery.md) owns message content and submission summaries. Client feedback does not replace server validation.

## Reusable Method

### Problem And Use

An incomplete value is not necessarily a mistake: the user may still be typing. Use inline validation when a field can be checked independently. Avoid a success claim when validity depends on an uncompleted server check or another unfinished field.

### Recommended Rules

1. Local proposal: start with three presentation states: untouched, checked-invalid, checked-valid. Do not show required-field errors on initial focus.
2. Check a newly edited field on leaving it, or at a genuinely complete input boundary. There is no universal character count or millisecond debounce for all fields.
3. After an error is exposed, recheck on committed input so it disappears when corrected. Recheck dependent fields when their dependency changes.
4. Keep submission validation as a backstop. Preserve all recoverable input, identify every rejected field, and accept only the current request's result.
5. During IME composition, preserve provisional text; defer disruptive validation until composition completes. "Format accepted" must not claim that an address exists or a payment succeeded.

### Evidence

| Source | Year | What was measured or specified |
| --- | --- | --- |
| [Baymard inline validation](https://baymard.com/research-articles/inline-form-validation) | 2024 | Qualitative checkout observations: premature errors interrupted typing; stale errors misled users after correction. Public article provides examples, not a controlled effect size or participant denominator for these claims. |
| [WCAG error identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html) | 2024 Recommendation; living explanation read 2026 | SC 3.3.1 requires text identification of automatically detected errors. It does not prescribe blur timing. No usability experiment. |

### Example

This local example progressively adds blur feedback to native validation; native submission remains available. Server checks are outside its scope.

```html
<form action="/subscribe" method="post">
  <label for="address">Email address</label>
  <input id="address" name="email" type="email" required
    aria-describedby="address-error">
  <p id="address-error"></p>
  <button>Subscribe</button>
</form>
<script>
const field = document.querySelector("#address");
const error = document.querySelector("#address-error");
let checked = false;
function validate() {
  const invalid = !field.validity.valid;
  field.setAttribute("aria-invalid", String(invalid));
  error.textContent = invalid ? "Enter a complete email address." : "";
}
field.addEventListener("blur", () => { checked = true; validate(); });
field.addEventListener("input", (event) => {
  if (checked && !event.isComposing) validate();
});
field.addEventListener("compositionend", () => { if (checked) validate(); });
</script>
```

## Opinionated Guidance

Prefer fewer truthful messages over a green check on every keystroke. Keep visual updates separate from announcements so correction does not create continuous speech.

## Platform-Specific Guidance

Native validation messages and focus behavior differ by browser. A server-rendered rejection needs equivalent inline relationships and preserved values.

## Unsupported Absolutes

Blur is not always the correct commit boundary. Baymard's checkout findings do not establish an optimal timing policy for every form. Its article contains inconsistent 31%/32% benchmark figures; neither is used here as an effect estimate.

## Verification Contract

Proposed checks: initial focus has no error; blur an incomplete value; correct it without blurring; edit a confirmation dependency; paste; compose text; submit untouched required fields; receive an obsolete server response. Inspect text, `aria-invalid`, focus, and announcements. Accessibility requires text rather than color alone and a programmatic field/message relationship. These cases and the example have not been executed against a consumer. Re-review on validation, dependency, or input-method changes.

## Source, License, And Attribution

Locally authored synthesis and example; no source samples copied. Sources rechecked 2026-10-19. `consumer_reference: not_applicable` because no consumer form record is selected.

## IA Navigation

Parent: [Evidence Patterns](index.md).
Next: [Error Messages And Recovery Summaries](error-recovery.md).
