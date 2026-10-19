---
type: Domain Guide
title: Persistent Form Labels
description: Keep field identity and required instructions visible while users enter, review, and correct data.
aliases: ["label placement","persistent labels","placeholder labels","floating labels"]
questions: ["Should form labels sit above fields or inside placeholders?"]
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-10-19
---

# Persistent Form Labels

Primary role: field labeling decision guide.

## Repository Boundary

This page owns persistent meaning and label selection. Layout owns spatial composition; [Text Input](../text-input-and-internationalization.md) owns direction and text editing. No decorative label system is introduced into reusable patterns.

## Reusable Method

### Problem And Use

Placeholder-only labels disappear just when users need to review or correct a value. Use persistent labels for data-entry controls. Avoid adding redundant visible copy when a control already has a clear visible name, such as a button.

### Recommended Rules

1. Provide one unambiguous accessible name for each input and a persistent visible label for ordinary form fields. Associate a native `label` with its input.
2. Local starting point: place labels above fields for narrow or translated forms. Side-aligned labels are a valid alternative when scanning and content fit are verified; there is no universal winning pixel gap.
3. Put necessary format/required instructions outside placeholders. Explain any required marker and distinguish optional fields consistently.
4. A floating label must remain readable after typing, autofill, validation, and zoom. Reserve room for full error messages; do not shrink labels into unreadable captions.
5. Group related choices with `fieldset` and `legend`; each option still needs its own label.

### Evidence

| Source | Year | What was measured or specified |
| --- | --- | --- |
| [Baymard mobile inline labels](https://baymard.com/research-articles/mobile-forms-avoid-inline-labels) | 2013 | Qualitative mobile checkout observations: users deleted entered values to recover vanished labels, with some abandonment. No controlled completion-time estimate. "Inline labels" here means disappearing placeholder-style labels, not inline validation. |
| [Labels or instructions, SC 3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html) | 2024 Recommendation; living explanation read 2026 | Labels/instructions required when content requires input. Does not prescribe above-versus-left placement or a measured spacing value. |

### Example

```html
<form action="/profile" method="post">
  <label for="display-name">Display name</label>
  <p id="name-help">Use the name you want other members to see.</p>
  <input id="display-name" name="displayName" autocomplete="nickname"
    aria-describedby="name-help">
  <fieldset>
    <legend>Digest frequency</legend>
    <label><input type="radio" name="digest" value="weekly" checked>Weekly</label>
    <label><input type="radio" name="digest" value="never">Never</label>
  </fieldset>
  <button>Save profile</button>
</form>
```

## Opinionated Guidance

Keep the label short and put explanations in associated help text. A quiet-looking form that requires memorization has not become simpler.

## Platform-Specific Guidance

Native floating-label controls and browser autofill need their own verification. Aligning text differently for RTL does not remove label associations or change reading order.

## Unsupported Absolutes

The cited study does not prove above-field labels always beat side labels. Its limited 1-2-field exceptions do not remove the accessible-name obligation. Floating labels are not automatically inaccessible or automatically proven usable.

## Verification Contract

Proposed checks: empty, populated, autofilled, invalid, disabled, long label, RTL, keyboard activation of a label, and zoom. Accessibility requires visible meaning, programmatic association, and contrast in each state; test both the name and help description. No browser/consumer execution is claimed. Re-review when label movement, autofill, or form composition changes.

## Source, License, And Attribution

Locally authored synthesis and example; sources rechecked 2026-10-19. No source samples copied. `consumer_reference: not_applicable` because no consumer form record is selected.

## IA Navigation

Parent: [Evidence Patterns](index.md).
Next: [Localized Input Masks](input-masks.md).
