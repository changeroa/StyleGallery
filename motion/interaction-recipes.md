---
type: Domain Guide
title: Motion Interaction Recipes
description: State-based product motion recipes for feedback, disclosure, modal transitions, rearrangement, progress, and dragging.
domain: motion
lifecycle: experimental
provenance_kind: local
---

# Motion Interaction Recipes

Primary role: motion behavior catalog.

## Repository Boundary

These recipes describe product behavior and failure cases. They compose with Layout instead of supplying reusable spatial CSS or visual defaults. Start with a [Motion Brief](motion-brief.md); use [Vocabulary](vocabulary.md) for the visual effect's name.

## Reusable Method

Choose the task below, assign semantic and presentation owners, implement the immediate state change first, and then test any visual interpolation against that baseline. The traces below are expected behavior, not evidence of a tested implementation.

### Action Feedback

Use for a command whose acknowledgement and completion are different events.

`ready → pending → success | error`; a retry is a new request. Press feedback may acknowledge input immediately, but a success treatment waits for actual confirmation. Decide explicitly whether repeated activation is ignored, queued, or replaces the request. Keep essential status available without motion. Test delayed completion, duplicate input, failure, and a response arriving after navigation.

### Disclosure

Use for optional content controlled by a nearby trigger. A native `details`/`summary` baseline can be enough:

```html
<details>
  <summary>Delivery restrictions</summary>
  <p>Some destinations need an additional delivery day.</p>
</details>
```

If a custom disclosure is necessary, keep the trigger's expanded state consistent with content availability. The [APG disclosure contract](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) describes button activation and state semantics. When closing while focus is inside, move focus to an available logical target before hiding it. Test repeated toggle, long content, and removal of the trigger. Avoid fixed maximum heights that clip real content; Layout owns intrinsic sizing.

### Modal Transition

Use when a temporary task must block the surrounding interface. Assign one owner to opening, focus placement, blocking, cancellation, and focus return. An entrance effect may decorate this change; semantic availability must not wait for an arbitrary timeout. If exit animation is retained, define whether the dialog remains modal until cleanup and how reopening supersedes a pending close.

The [APG modal dialog guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) supplies the web interaction baseline. Test close during entry, reopen during exit, nested overlays, trigger removal, and reduced motion. After final close there must be no surviving blocker or focus trap.

### Reorder And Filter

Use when the same identifiable items move or are removed. Commit the intended logical order, retain stable item keys, and interpolate presentation only where the source/destination mapping is valid. Preserve focused items; if one disappears, choose a documented neighboring item or controlling filter. Do not reorder DOM solely to produce a pleasing stagger.

Trace: filter A → filter B → late A data → B remains current. Test empty results, long item labels, list updates during movement, keyboard navigation, and a focused item's removal. An immediate redraw is the fallback when continuity cannot be established.

### Progress And Completion

Use when an ongoing operation needs visible status. Show determinate progress only when backed by a meaningful measurement; otherwise use a pending state. Completion, failure, and cancellation come from the operation, independently of the progress decoration.

Trace: pending → cancellation requested → confirmed cancelled or completed; do not promise cancellation succeeded before the operation confirms it. Essential information persists beyond a transient flourish. Use urgent alerts sparingly; [APG alert guidance](https://www.w3.org/WAI/ARIA/apg/patterns/alert/) distinguishes announcements from focus-taking dialogs.

### Drag And Settle

Use when direct manipulation previews a change before commitment. Separate the preview value from the committed value. Release on a valid target commits; cancellation restores or reconciles with the current model. A new gesture retargets from the presented position where continuity is intended. Provide a task-equivalent non-drag operation.

Test release inside/outside, cancellation, pointer loss, a changing destination, and repeated reversal. Focus and the selected item must remain traceable while visual position changes. The engine or browser adapter owns gesture events; the product owns acceptance of the new value.

## Opinionated Guidance

For frequent operations, compare with removing motion before increasing its complexity. When two recipes compose, one controller must arbitrate the shared state rather than letting competing completion callbacks decide it.

## Platform-Specific Guidance

For the web, [`prefers-reduced-motion`](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion) is a preference signal. Define the alternative per recipe and respond to preference changes during use. API support, native gesture physics, and rendering performance require the exact target runtime.

## Unsupported Absolutes

These recipes establish no universal duration, spring configuration, frame rate, device coverage, or aesthetic result. A static snippet does not prove animated or assistive-technology behavior.

## Verification Contract

For each implemented recipe record before, intermediate, interrupted, and final states; logical order and focus; reduced-motion behavior; and completion/error cleanup. Source inspection can check declared ownership. Rendered interaction and assistive-technology behavior require the consuming application. Review when an API changes or a trace fails.

The [Interaction Lab](../examples/domain-interactions/README.md) provides a bounded web implementation of feedback, native disclosure, modal dismissal, stale search results, reward reveal, and range-input preview. Its [verification notes](../examples/domain-interactions/verification.md) record exercised states and preferences; they do not establish coverage for every possible implementation of these recipes.

## Source, License, And Attribution

Locally authored recipes and HTML. The linked W3C APG pages and Media Queries Level 5 were rechecked on 2026-09-08 for the specific semantics and preference signal above. No upstream examples or timing prescriptions are copied.

## IA Navigation

Parent: [Motion](index.md).
Next: [Motion Review Workflow](review-workflow.md).
