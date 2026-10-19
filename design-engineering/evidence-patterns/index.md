# Evidence-Based Interface Patterns

Primary role: product interaction selection guide.

Domain classification: design-engineering. Lifecycle: `experimental`. Provenance: locally authored synthesis. Reviewed on: 2026-10-19.

## Repository Boundary

Domain classification: design-engineering. These 12 experimental patterns own product decisions, not reusable spatial primitives or shared visual defaults. [Layout](../../layout/index.md) retains spatial ownership; [Quality](../../quality/index.md) retains evidence and accessibility precedence. This collection selects no consumer profile.

## Reusable Method

Start with the failure the user encounters, then select a pattern and verify its proposed cases in the consumer. Requirements, observed research findings, and local recommendations are different kinds of support.

### Pattern Routes

| User problem | Pattern | Decision |
| --- | --- | --- |
| Errors appear before entry is complete. | [Inline Validation Timing](inline-validation.md) | First validation versus correction timing |
| Submission fails without a recovery path. | [Error Messages And Recovery Summaries](error-recovery.md) | Specific messages, summary, focus |
| Field identity disappears after typing. | [Persistent Form Labels](form-labels.md) | Persistent labels and instructions |
| Formatting rejects valid regional data. | [Localized Input Masks](input-masks.md) | Flexible input versus verified mask |
| Hidden filters narrow the catalog unexpectedly. | [Faceted Filter Selection](faceted-filters.md) | Query logic and applied-value removal |
| Empty content has no explanation. | [Empty States And No Results](empty-states.md) | First use versus zero matches/failure |
| Table sorting or comparison loses context. | [Data Table Interaction](data-tables.md) | Sort scope, density, header semantics |
| Similar controls imply different actions. | [Tabs And Segmented Controls](tabs-and-segmented-controls.md) | Panels versus values versus routes |
| Highlighted text is committed accidentally. | [Autocomplete Acceptance](autocomplete.md) | Draft, candidate, accepted identity |
| Parent location is confused with history. | [Breadcrumb Hierarchy](breadcrumbs.md) | Ancestry versus Back |
| Bottom navigation mixes commands and routes. | [Bottom Navigation Destinations](bottom-navigation.md) | Stable peer destinations |
| Theme changes erase meaningful contrast. | [Dark Mode Contrast](dark-mode-contrast.md) | Actual state/pair measurement |

### Existing Owners To Extend Or Compose

- [Loading And Feedback](../loading-and-feedback.md): toast versus inline feedback, skeleton/spinner selection, and bounded 0.1/1/10-second heuristics.
- [Native Interaction Contracts](../native-interaction-contracts.md): modal focus containment and return.
- [Input And Focus](../../platform-guides/input-and-focus.md): 24/44 CSS px target criteria, gesture alternatives, and input paths.
- [Deletion And Supported Undo](../state-management/recipes/delete-undo.md): confirmation versus real reversibility.
- [Accessible Motion](../../motion/accessible-motion.md): motion alternatives for pending work.

### Evidence Reading Rules

WCAG references use the [2024 WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/); its Understanding pages explain requirements. APG is informative implementation guidance. Living documents are labeled by the 2026 reading year where no fixed publication year is claimed. Baymard and NN/g findings retain their task context: site prevalence is not a user success rate, an observed extreme is not a mean, and a recommendation is not a controlled experiment.

All cited bodies were rechecked 2026-10-19. A resolving URL is not proof that its recommendation fits every product. No consumer study, assistive-technology run, or browser conformance result is claimed.

## Opinionated Guidance

Prefer a bounded rule with a counterexample over a borrowed absolute. Numeric requirements retain their criterion, units, level, and exceptions; local counts and timings are explicitly proposals rather than research results.

## Platform-Specific Guidance

Record the actual browser, OS, input method, and assistive technology. Apple HIG and Android conventions are not web standards, and native points/dp are not automatically CSS pixels.

## Unsupported Absolutes

"Evidence-based" does not mean empirically proven for every task. No source in this collection authorizes a universal visual theme, mandatory framework, or accessibility guarantee from a code fragment.

## Verification Contract

For each chosen pattern, turn its cases into expected outcomes, run the real task, and retain actual evidence separately. The repository's domain/link/material checks validate documentation structure and retrieval, not those product outcomes. Re-review on a source revision, failed task, changed semantics, or changed owner.

## Source, License, And Attribution

Locally authored synthesis; primary sources are linked in each pattern with year and measurement boundary. No upstream prose, artwork, or samples copied. `consumer_reference: not_applicable` because the collection selects no consumer record.

## IA Navigation

Parent: [Design Engineering](../index.md).
Next: [Inline Validation Timing](inline-validation.md).
