---
type: Domain Guide
title: Tabs And Segmented Controls
description: Separate panel navigation from value selection and choose an explicit keyboard and activation model.
aliases: ["tabs versus segmented control","tab activation","segmented selection","tab panels"]
questions: ["Should this control be tabs or a segmented selector?"]
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-10-19
---

# Tabs And Segmented Controls

Primary role: mutually exclusive view and value selection guide.

## Repository Boundary

This page owns semantics and activation, not the wrapping provided by [Tab Strip](../../patterns/in-line-grouping/tab-strip.md). [Native Interaction Contracts](../native-interaction-contracts.md) owns composite behavior selection and focus responsibility.

## Reusable Method

### Problem And Use

Identical pill-shaped visuals can navigate panels, select a value, or issue commands. Use tabs for layered peer panels; use a radio group for one value from related options; use ordinary links for navigation to destinations. Avoid tab roles on controls with no associated panels.

### Recommended Rules

1. For APG tabs, expose a named tablist, tab/panel associations, exactly one selected tab, and one displayed panel in the basic single-selection model.
2. Provide one tab stop into the tablist; Arrow keys navigate tabs. In manual activation, Space/Enter selects. Horizontal tabs must not consume Up/Down scrolling keys.
3. Use automatic activation only when panel display has no noticeable latency. Remote loading is a reason to consider manual activation, not a reason to delay keyboard focus.
4. Treat segment count as platform guidance: Apple suggests about 5-7 in wide interfaces and about 5 or fewer on iPhone. Content fit and localization can require fewer; these are not WCAG limits.
5. Keep selected values independent from focus. Do not mix selection segments and destructive commands in one control.

### Evidence

| Source | Year | What was measured or specified |
| --- | --- | --- |
| [APG tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) | Living guidance, read 2026 | Defines keyboard/selection/panel relationships and the no-noticeable-latency condition for automatic activation; no measured millisecond cutoff. |
| [Apple segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls) | Living HIG, read 2026; changelog includes 2023 | Platform recommendations and examples, not a comparative experiment. macOS also supports multiple selection or action segments; native appearance does not determine web semantics. |

### Example

This local example intentionally uses native radio semantics for a value, not incomplete tab markup. Product styling may make it segmented without changing its meaning.

```html
<form action="/report" method="get">
  <fieldset>
    <legend>Report period</legend>
    <label><input type="radio" name="period" value="week" checked>Week</label>
    <label><input type="radio" name="period" value="month">Month</label>
    <label><input type="radio" name="period" value="year">Year</label>
  </fieldset>
  <button>Show report</button>
</form>
```

## Opinionated Guidance

Record the meaning before choosing a component name. A server-navigated link set can look like tabs while correctly remaining links.

## Platform-Specific Guidance

Apple's toolbar/inspector and main-window recommendations differ; do not transfer an iOS segmented view switch mechanically to macOS or web. HIG body was read through its [official documentation JSON](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/segmented-controls.json).

## Unsupported Absolutes

Five segments is not a universal maximum. Roving focus does not mean automatic selection. A `tab` role alone supplies no keyboard behavior.

## Verification Contract

Proposed checks: Tab entry/exit, Arrow wrap, manual activation, slow panel, preserved panel draft, removed tab, long translation, and zoom. Accessibility requires accurate selection, names, associations, visible focus, and reachable panel content. No consumer execution is claimed. Re-review on widget meaning, activation, or latency changes.

## Source, License, And Attribution

Locally authored synthesis and example; official sources rechecked 2026-10-19. No platform assets or code copied. `consumer_reference: not_applicable` because no consumer selector record is selected.

## IA Navigation

Parent: [Evidence Patterns](index.md).
Next: [Autocomplete Acceptance](autocomplete.md).
