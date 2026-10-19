---
type: Domain Guide
title: Bottom Navigation Destinations
description: Reserve persistent bottom navigation for peer destinations and keep actions and temporary task steps separate.
aliases: ["bottom navigation","bottom tab bar","primary destinations","mobile navigation bar"]
questions: ["Which destinations belong in a bottom navigation bar?"]
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-10-19
---

# Bottom Navigation Destinations

Primary role: primary destination selection guide.

## Repository Boundary

This page owns product destination selection, not a native tab-bar implementation. [Adaptive Navigation](../../platform-guides/adaptive-navigation.md) owns presentation changes; Layout owns sticky/fixed scroll constraints. Web links do not inherit a native platform's Back stack.

## Reusable Method

### Problem And Use

A bar mixing navigation, creation, and workflow steps has unpredictable state. Use bottom navigation for frequently revisited peer destinations. Avoid it for linear checkout steps, contextual commands, or a large unprioritized sitemap.

### Recommended Rules

1. Start from the platform recommendation of 3-5 peer destinations when adapting Android's navigation bar. This is not a universal web mandate or measured optimal count.
2. Keep destination names and ordering stable. Do not replace an empty destination with a command just because it has no content yet.
3. On the web, use named navigation with ordinary links and indicate the current destination. Do not assign `tab` roles to route links solely to copy a native appearance.
4. Local proposal: retain visible text labels; familiar icons alone can still be ambiguous. Preserve access at larger text sizes and in translated content.
5. If fixed to the bottom, reserve content space and honor safe-area/keyboard behavior. Verify that the bar does not obscure focus or the final action.

### Evidence

| Source | Year | What was measured or specified |
| --- | --- | --- |
| [Android layouts and navigation](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns?hl=en) | Living official guidance, read 2026 | Recommends 3-5 same-hierarchy destinations and adaptation to a rail on large screens. Convention guidance, not an experimental comparison or CSS breakpoint specification. |
| [APG tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) | Living guidance, read 2026 | Defines tabs as layered content panels. That definition distinguishes a tab widget from ordinary destination links; no bottom-bar performance measurement. |

### Example

Local route-link fragment. It intentionally does not claim native navigation-stack behavior.

```html
<nav aria-label="Main">
  <a href="/overview" aria-current="page">Overview</a>
  <a href="/projects">Projects</a>
  <a href="/activity">Activity</a>
  <a href="/account">Account</a>
</nav>
```

## Opinionated Guidance

Prioritize destinations by task evidence, not to fill five slots. Put Create or Delete in the relevant task surface rather than disguising them as destinations.

## Platform-Specific Guidance

Android navigation bars, Apple tab bars, and browser links have different host behavior. Preserve selected identity and drafts during a bar-to-rail transformation; record OS/browser and safe-area assumptions separately.

## Unsupported Absolutes

Bottom placement is not universally easier for every device or motor ability. Five destinations is not a WCAG limit. Hiding a label does not make an ambiguous icon self-explanatory.

## Verification Contract

Proposed checks: direct destination link, Back/Forward, selected state, preserved draft, empty destination, virtual keyboard, short viewport, and large text. Accessibility requires named links, visible focus, logical reading order, and unobscured controls. Check target-size requirements separately in [Input And Focus](../../platform-guides/input-and-focus.md). No consumer execution is claimed. Re-review when hierarchy or persistence changes.

## Source, License, And Attribution

Locally authored synthesis and fragment; official sources rechecked 2026-10-19. No native artwork or code copied. `consumer_reference: not_applicable` because no consumer navigation record is selected.

## IA Navigation

Parent: [Evidence Patterns](index.md).
Next: [Dark Mode Contrast](dark-mode-contrast.md).
