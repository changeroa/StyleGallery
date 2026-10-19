---
type: Domain Guide
title: Localized Input Masks
description: Choose flexible input before adding a verified regional mask that preserves editing and valid data.
aliases: ["input masks","phone formatting","localized input","masked fields"]
questions: ["When should a phone field use an input mask?"]
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-10-19
---

# Localized Input Masks

Primary role: formatting and mask selection guide.

## Repository Boundary

This page owns whether formatting should constrain a field. [Text Input And Internationalization](../text-input-and-internationalization.md) owns IME, caret, undo, and representation boundaries. Domain guidance supplies no shared mask library or universal telephone parser.

## Reusable Method

### Problem And Use

A mask can clarify grouping but reject perfectly valid numbers from another country. Use it only for a verified, bounded format with a demonstrated input need. Avoid one fixed mask for international phone numbers, names, or uncertain identifiers.

### Recommended Rules

1. Start with flexible text input. Local proposal: support at least paste, autofill, selection replacement, deletion, and undo before considering a mask acceptable.
2. Separate raw edit text, parsed canonical data, and display formatting. Never silently truncate to fit the display.
3. Apply regional formatting only after the region and its valid forms are known. Unsupported regions retain the flexible field.
4. Prefer `type="tel"` for telephone input, not a numeric quantity control. Keyboard hints are not validators; preserve a meaningful plus sign and extension when the contract supports them.
5. Treat incomplete input as an editing state. Reformat at a declared commit boundary when live rewriting would disrupt composition or caret position.

### Evidence

| Source | Year | What was measured or specified |
| --- | --- | --- |
| [Baymard input masking](https://baymard.com/research-articles/input-masking-form-field) | 2017 | Reports 89% of test subjects entered restricted numerical fields differently from supplied formatting examples. This is observed formatting variation, not a mask benefit percentage; the public article does not give a denominator for that statistic. |
| [Labels or instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html) | 2024 Recommendation; living explanation read 2026 | Required instructions must be available; a mask does not itself establish an accessible field name or explanation. No usability measurement. |

### Example

This is the intentional unmasked default, not a partial mask implementation. The server must parse and validate the supported regions without assuming a fixed digit count.

```html
<form action="/contact" method="post">
  <label for="phone">Contact telephone</label>
  <p id="phone-help">Include your country code. Spaces and punctuation are accepted.</p>
  <input id="phone" name="phone" type="tel" autocomplete="tel"
    aria-describedby="phone-help">
  <button>Save contact</button>
</form>
```

## Opinionated Guidance

Use a mask to aid input, never to conceal a parser's narrow assumptions. Verify the help text against what the server actually accepts.

## Platform-Specific Guidance

Phone keyboards, autofill payloads, and composition paths vary across devices. Verify a real input method; synthetic key events do not reproduce it.

## Unsupported Absolutes

Not all telephone numbers have 10 digits. An example placeholder does not force users to follow that format. The 2017 findings do not prove a particular modern masking library reliable.

## Verification Contract

Proposed checks: international plus prefix, variable lengths, extension, pasted punctuation, caret edits in the middle, clear/undo, autofill, IME, and region change while editing. Accessibility requires persistent labels, announced errors, and no unexplained rejection or loss of data. Record round-trip values and selection positions. No consumer execution is claimed. Re-review when supported regions, parser, or formatter changes.

## Source, License, And Attribution

Locally authored synthesis and example; sources rechecked 2026-10-19, no source code copied. `consumer_reference: not_applicable` because no consumer input record is selected.

## IA Navigation

Parent: [Evidence Patterns](index.md).
Next: [Faceted Filter Selection](faceted-filters.md).
