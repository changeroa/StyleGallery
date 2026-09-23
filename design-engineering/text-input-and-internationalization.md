---
type: Domain Guide
title: Text Input And Internationalization
description: Design composition-aware editing, explicit text units, bidirectional content, and locale-bound presentation without corrupting user input.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-09-21
---

# Text Input And Internationalization

Primary role: multilingual text interaction and verification guide.

## Repository Boundary

This guide owns text editing and product-data decisions. Layout owns spatial constraints; a translation or input method does not authorize copying product typography into reusable Layout CSS. Browser text measurement is not proof that an editor preserves user intent.

## Reusable Method

Declare three contracts before implementing formatting: what the user can edit, what the application stores, and what it displays. Name the unit of any limit or selection offset. Then inventory composition, paste, autofill, correction, undo, direction, and locale changes. An event sequence from one Latin keyboard is a narrow sample.

### Source Findings

| Source | Bounded finding | Design consequence |
| --- | --- | --- |
| [UI Events](https://www.w3.org/TR/uievents/#events-compositionevents) | Composition has its own event lifecycle; `isComposing` identifies events within a composition session. | Do not treat every intermediate edit as a committed command. |
| [Input Events Level 2](https://www.w3.org/TR/input-events-2/) | Input types describe edit intentions. The draft distinguishes cancelability during IME composition. | Inspect actual events; a universal keydown filter cannot govern every edit path. |
| [Unicode Text Segmentation, UAX #29](https://www.unicode.org/reports/tr29/) | Grapheme clusters approximate user-perceived characters; boundaries are distinct from code points and words. | State whether a limit counts bytes, code units, code points, or grapheme clusters. |
| [ECMA-402 Segmenter](https://tc39.es/ecma402/#segmenter-objects) | `Intl.Segmenter` exposes locale-sensitive segmentation at named granularities. | Name locale and granularity when using segmentation in a UI. |
| [W3C bidirectional markup guidance](https://www.w3.org/International/questions/qa-html-dir) | HTML direction metadata and isolation help mixed-direction content retain its intended ordering. | Treat document direction and inserted user text separately. |
| [Accessible Authentication explanation](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html) | WCAG 2.2's AA criterion limits required cognitive-function tests, with specified alternatives and assistance. | Do not casually remove paste or password-manager assistance from an authentication flow. |

Sources were inspected 2026-09-21. UI/Input Events and ECMA-402 publication states must be read as labeled; a draft API description is not a claim that every target implements it identically. UAX #29 has versioned rules, so record the Unicode/runtime boundary for a reproducible segmentation claim.

### Worked Scenario: Korean Search With Suggestions

The user enters a Korean name, navigates candidates, commits composition, and then submits a search. Product state distinguishes the editable text, composition status, selected suggestion identity, and submitted query.

Local policy: preserve the browser's in-progress composition. Do not move focus, replace the input node, run destructive formatting, or submit the form merely because a command key arrived during composition. Commit-driven search is a product choice; live preview during composition needs a separate decision and stale-result policy.

| Event or condition | Proposed responsibility | Failure it prevents |
| --- | --- | --- |
| Composition starts | Keep the editing node and draft stable. | Rerendering discards the input method's active composition. |
| Intermediate input | Retain the edit without treating a candidate as the submitted query. | A provisional syllable becomes an unintended request or selection. |
| Candidate confirmation | Let the input method complete its edit before interpreting a separate application command. | Enter both confirms composition and submits unexpectedly. |
| Suggestions return out of order | Match them to current query intent. | An old response replaces suggestions for the current text. |
| User presses Escape | Resolve input-method, popup, and outer-surface ownership deliberately. | One key cancels composition, closes the popup, and closes the editor. |

The exact native event order is a target observation, not prescribed here. Test the real IME in each supported browser/OS; synthetic composition events do not recreate the operating system's input method. Use [latest request wins](state-management/patterns/latest-request-wins.md) for replaceable reads.

### Text Units And Limits

For a visible “characters remaining” count, decide what users should perceive as one unit, then compare that policy with the backend limit. A grapheme count cannot guarantee that a byte-limited service accepts the value. Show the relevant limit rather than truncating silently after submission.

Use a corpus containing Hangul composition, a base letter plus combining mark, emoji sequences, an empty value, pasted line breaks, and a long unbroken identifier. Verify counters, truncation, deletion, selection restoration, and round trips. A correct count with corrupted cursor placement is still an editing failure.

Formatting belongs at a declared boundary. If a field needs grouping separators, preserve an editable representation and caret policy. A localized display string is not automatically a canonical stored number or date. Decide how incomplete input, ambiguous separators, and locale changes are resolved before adding automatic reformatting.

### Direction And Mixed Content

Set the document's language and base direction intentionally. Isolate inserted names, identifiers, and other independently directed text where needed; test punctuation and adjacent controls as well as the text itself. CSS alignment alone cannot establish the semantic direction of user data.

Product tests should include an RTL name beside an LTR identifier, paired punctuation, numerals, and a trailing action. Preserve logical reading order while the Layout owner chooses logical spacing and containment.

## Opinionated Guidance

Preserve raw editing intent until a clear commit boundary. Prefer a reversible validation message over eager rewriting that the user cannot undo. Store stable identity separately from the localized label of a suggestion.

## Platform-Specific Guidance

Keyboard layouts, IMEs, dictation, autofill, and virtual keyboards can take different event paths. Record OS, browser, input method, locale, and assistive technology instead of a generic “mobile tested.” For typography and scaling, use [Preferences And Accessibility](../platform-guides/preferences-and-accessibility.md).

## Unsupported Absolutes

One code point is not necessarily one perceived character. A keypress is not the only way to edit text. A segmentation API is not a locale-aware parser. Programmatically dispatched events are not evidence that a native IME works.

## Verification Contract

The proposed cases cover real composition, candidate selection, paste, undo/redo, replacement selection, autofill, server rejection, mixed direction, and locale change with an unfinished draft. Bind observed input and submitted data to the same scenario; independently inspect the accepted backend value where that claim matters.

Record both intended and observed event/selection outcomes, without storing private user input in diagnostic artifacts. The examples above are test data proposals; no IME, browser, or backend execution is claimed. Re-review after editor, formatter, runtime, or locale-policy changes.

## Source, License, And Attribution

Locally authored synthesis of the linked primary sources, inspected 2026-09-21. No upstream examples are reproduced. `consumer_reference: not_applicable` because no consumer editor record is selected.

## IA Navigation

Parent: [Design Engineering](index.md).
Next: [Loading And Feedback](loading-and-feedback.md).
