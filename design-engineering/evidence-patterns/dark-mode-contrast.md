---
type: Domain Guide
title: Dark Mode Contrast
description: Measure text and meaningful controls in each actual theme and state instead of assuming a dark palette is accessible.
aliases: ["dark mode contrast","theme contrast","non-text contrast","contrast ratios"]
questions: ["Which contrast ratios apply to a dark theme?"]
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-10-19
---

# Dark Mode Contrast

Primary role: theme contrast verification guide.

## Repository Boundary

This page owns product theme verification, not shared color tokens. [Preferences And Accessibility](../../platform-guides/preferences-and-accessibility.md) owns preference resolution; [Accessibility Evidence](../../quality/evidence/accessibility.md) owns claim admissibility. Layout receives no palette values from this guide.

## Reusable Method

### Problem And Use

Inverting a light palette can make muted text, borders, and focus disappear. Use this method for each authored theme and meaningful state. Avoid assuming that a system dark-mode preference also requests high contrast or reduced motion.

### Recommended Rules

1. At WCAG AA, ordinary text needs at least 4.5:1 and large-scale text at least 3:1, with SC 1.4.3 exceptions. Large-scale means at least 18pt regular or 14pt bold, approximately 24 or 18.67 CSS px.
2. Under SC 1.4.11, visual information needed to identify controls/states and meaningful graphical parts needs at least 3:1 against adjacent colors, subject to its exceptions. Not every decorative border is required.
3. Measure the actual foreground/background pair after opacity and layering, including hover, selected, error, focus, and placeholder text.
4. Local proposal: keep a contrast inventory for both light and dark themes, plus forced-colors verification. No universal surface-brightness ladder follows from these criteria.
5. Do not communicate error or selection by color alone. A passing ratio does not establish the separate requirements for focus visibility, focus obstruction, or text resizing.

### Evidence

| Source | Year | What was measured or specified |
| --- | --- | --- |
| [Contrast Minimum, SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | 2024 Recommendation; living explanation read 2026 | Specifies 4.5:1/3:1 text thresholds and exceptions. These are conformance thresholds, not a dark-theme preference study. |
| [Non-text Contrast, SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | 2024 Recommendation; living explanation read 2026 | Specifies 3:1 for required visual identification and meaningful graphics with exceptions. Does not require every control to have a border. |

### Example

Local consumer CSS illustrates explicit theme pairs, not a reusable palette. Black/white opaque text pairs have 21:1 contrast; real component states still need measurement.

```css
.theme_sample {
  background: #fff;
  color: #000;
}

@media (prefers-color-scheme: dark) {
  .theme_sample {
    background: #000;
    color: #fff;
  }
}
```

## Opinionated Guidance

Review contrast where it fails most easily: secondary copy, disabled-looking but active controls, overlays, and thin focus indicators. Disabled/inactive exceptions do not justify making active help or error text unreadable.

## Platform-Specific Guidance

Dark appearance and forced colors are separate inputs. Verify browser/system adjustments rather than disabling them to preserve a screenshot. Native color roles do not prove equivalent authored web colors.

## Unsupported Absolutes

Dark mode is not inherently accessible or proven better for everyone. A contrast preference is not a contrast measurement. A static palette calculation does not prove every composited state.

## Verification Contract

Proposed checks: computed pairs in both themes, transparency over varying content, hover/focus/error/selection, forced colors, text scaling, and runtime theme changes in open overlays. Accessibility requires ratios within scope plus non-color meaning and operable visible focus. Record pairs, ratios, state, and tool; do not round a failing ratio up. No consumer execution is claimed. Re-review when palette, opacity, typography, or layers change.

## Source, License, And Attribution

Locally authored synthesis and example; W3C sources rechecked 2026-10-19. No platform colors copied. `consumer_reference: not_applicable` because no consumer palette record is selected.

## IA Navigation

Parent: [Evidence Patterns](index.md).
Next: [Loading, Progress, And Feedback](../loading-and-feedback.md).
