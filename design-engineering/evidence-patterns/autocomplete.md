---
type: Domain Guide
title: Autocomplete Acceptance
description: Distinguish typed text, active suggestion, and accepted identity without stealing editing or composition keys.
aliases: ["autocomplete","typeahead suggestions","suggestion acceptance","manual combobox selection"]
questions: ["When should an autocomplete suggestion become the accepted value?"]
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-10-19
---

# Autocomplete Acceptance

Primary role: suggestion acceptance and recovery guide.

## Repository Boundary

This page specifies acceptance choices on top of [Native Interaction Contracts](../native-interaction-contracts.md). It does not duplicate the full combobox keyboard model. [Text Input](../text-input-and-internationalization.md) owns IME; [Latest Request Wins](../state-management/patterns/latest-request-wins.md) owns asynchronous suggestion authority.

## Reusable Method

### Problem And Use

A highlighted suggestion may be mistaken for a committed value, or a label may survive after its entity changes. Use autocomplete when suggestions reduce effort across a large meaningful set. Avoid custom autocomplete when a native select, datalist, or ordinary search-results page meets the task.

### Recommended Rules

1. Declare whether arbitrary text is valid or a known entity is required. Keep draft text, active option, and accepted ID distinct.
2. Local starting point: manual acceptance. Arrow navigation previews a candidate; Enter or pointer activation commits it. Choose automatic acceptance only with its documented blur behavior.
3. For a custom editable combobox with a listbox popup, keep DOM focus in the input, expose expanded state and controlled popup, and use an active descendant only for an existing option.
4. Escape dismisses suggestions without discarding the draft under the local manual policy. Do not let composition-confirming Enter also commit a suggestion or submit.
5. Zero suggestions is not a failed request. Keep a normal submit/recovery path and reject obsolete suggestion responses.

### Evidence

| Source | Year | What was measured or specified |
| --- | --- | --- |
| [APG combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | Living guidance, read 2026 | Defines four autocomplete behaviors and distinguishes manual from automatic selection, including automatic acceptance on blur. Specifies focus, editing, and popup relationships. No measured optimum suggestion count or debounce delay. |

### Example

Native suggestions are sufficient when arbitrary text is valid. This local example deliberately avoids pretending that datalist guarantees a known entity or equivalent behavior in every screen reader.

```html
<form action="/search" method="get">
  <label for="topic">Topic</label>
  <input id="topic" name="q" list="topics">
  <datalist id="topics">
    <option value="Accessibility"></option>
    <option value="Navigation"></option>
    <option value="Forms"></option>
  </datalist>
  <button>Search</button>
</form>
```

For an entity-only field, validate the accepted identity at submission and explain when edited text has invalidated it. A custom replacement must implement the full selected APG contract, not just copy roles.

## Opinionated Guidance

Keep candidate browsing reversible. Treat a suggestion count such as 5 or a delay such as 200 ms as a measured product choice if used, not a number supplied by APG.

## Platform-Specific Guidance

Native datalist presentation/support differs across browsers and assistive technologies. Test the actual mobile keyboard, IME, touch acceptance, and focus behavior before adopting it.

## Unsupported Absolutes

Highlighted does not always mean accepted. `aria-autocomplete` does not implement filtering. APG permits several valid models; manual acceptance is a local default, not universal proof of superiority.

## Verification Contract

Proposed checks: edit after selection, duplicate labels with distinct IDs, stale response, zero suggestions, network error, keyboard acceptance, pointer acceptance, Escape, and real IME composition. Accessibility requires a persistent name, coherent popup state, preserved editing keys, and verified announcements. No consumer execution is claimed. Re-review when acceptance or suggestion identity changes.

## Source, License, And Attribution

Locally authored synthesis and example; APG rechecked 2026-10-19. No upstream implementation copied. `consumer_reference: not_applicable` because no consumer combobox record is selected.

## IA Navigation

Parent: [Evidence Patterns](index.md).
Next: [Breadcrumb Hierarchy](breadcrumbs.md).
