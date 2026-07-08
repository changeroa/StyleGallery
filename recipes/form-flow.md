---
type: Layout Recipe
title: Form Flow
description: Compose sequential form content with constrained width and reachable actions.
screen_type: Form flow
primary_user_task: Complete a sequence of related inputs.
spatial_model: Single primary column with grouped fields and action placement.
---

# Form Flow

## Recommended Pattern Stack

- [content-limiter](../patterns/containment/content-limiter.md)
- [stack](../patterns/stacking/stack.md)
- [cluster](../patterns/in-line-grouping/cluster.md)

## DOM And Source Order

Keep labels, descriptions, fields, and errors adjacent in DOM order. Group related fields under semantic headings before adding layout classes.

## Scroll Ownership

Prefer document scrolling. If actions must remain visible, use a shell or footer pattern only after confirming it does not obscure validation messages or focus targets.

## Accessibility Checklist

- Source order: Keep each label, description, input, hint, and error adjacent in DOM order, even when groups are visually split into columns.
- Focus expectation: Keyboard focus must move through fields, validation messages, and actions in the same sequence a user completes the form.
- Scroll expectation: Sticky or fixed actions must not cover focused fields, inline errors, or the first invalid field after submission.
- Semantic risk: Group related controls with fieldset/legend or labelled sections before adding stack or cluster layout classes.
- Cognitive risk: Long flows create memory burden; expose step context, error recovery, and required/optional state without depending on color alone.
- Verification method: Use `automated` form-name/error association checks where possible, then `manual` keyboard and error-recovery review; use `user` evidence for completion-rate or comprehension claims.

## Responsive Behavior

Field groups should stack naturally. Action groups should wrap before they overflow and should preserve a clear primary action position.

## Constraints And Change Points

Use readable inline constraints for the form body. Keep field gaps, group gaps, and action gaps separate so density can change without changing structure.

## When Not To Use

Do not use this recipe for a data-dense editor where users compare many fields at once. A dashboard or panel layout may be more appropriate.

## Related Patterns

- [sticky-footer](../patterns/viewport-shell/sticky-footer.md)
- [line-up](../patterns/stacking/line-up.md)
