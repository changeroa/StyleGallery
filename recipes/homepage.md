---
type: Layout Recipe
title: Homepage
description: Compose raw content into a homepage or ordinary webpage before product-level visual styling.
screen_type: Homepage
primary_user_task: Understand the offer, find the right next path, and decide whether to act.
spatial_model: First-viewport hook followed by stacked explanation, proof, comparison, conversion, and navigation sections.
---

# Homepage

Use this recipe when raw content needs to become a homepage, landing page, campaign page, or general webpage and no narrower recipe has been chosen yet.

## Recommended Pattern Stack

- [cover](../patterns/viewport-shell/cover.md)
- [content-limiter](../patterns/containment/content-limiter.md)
- [stack](../patterns/stacking/stack.md)
- [cluster](../patterns/in-line-grouping/cluster.md)
- [ram-grid](../patterns/grid-repetition/ram-grid.md)
- [frame](../patterns/media-fit/frame.md)

## Content-To-Layout Matching

Map content blocks to section jobs before selecting visual treatment.

- Hook: use `cover` or a constrained first section when the opening message needs viewport-level framing.
- Explain: use `content-limiter` and `stack` for readable copy and progressive disclosure.
- Prove: use `ram-grid`, `card-grid`, or `columns` for testimonials, metrics, logos, examples, or repeated evidence.
- Compare: use a grid or sidebar composition only when comparisons need alignment or nearby support.
- Convert: use `cluster` or `wrap-row` for CTA groups that must wrap before overflow.
- Navigate or retain: use footer, link clusters, or repeated navigation groups after the primary action path.

Reject this recipe when the page is primarily a document, dashboard, form, command surface, or list-detail workflow.

## DOM And Source Order

Order sections by the visitor's decision path, not by visual symmetry. Put the primary heading, explanation, proof, and action in semantic order before layout classes. Repeated proof should be a list when each item has the same role.

## Scroll Ownership

Prefer normal document scrolling. Avoid nested scroll regions unless a section has an explicit independent task, such as a horizontally scrolling media reel with named keyboard and overflow behavior.

## Accessibility Expectations

- Focus expectation: Navigation, primary CTA, proof links, and conversion actions follow the visitor decision path declared in DOM order.
- Scroll expectation: Any carousel, reel, sticky CTA, or first-viewport treatment must declare keyboard access and avoid hiding focused content.
- Cognitive risk: Marketing hierarchy can overstate meaning visually; headings, section jobs, and CTA labels must make the same path understandable without the generated image.

## Responsive Behavior

Let sections collapse through intrinsic sizing, content limits, wrapping action rows, and repeat grids before adding viewport breakpoints. Keep the first viewport readable on narrow screens; do not require a generated hero image to carry essential text.

## Constraints And Change Points

Declare content measure, section gaps, page gutters, repeat-grid minimums, media ratios, and CTA wrapping thresholds. Treat brand color, typography, shadows, borders, and motion as product-level decisions outside this recipe.

## GPT Image Reference

Use the [Webpage Generation Workflow](../guides/webpage-generation-workflow.md) before generating the GPT Image reference. The prompt should describe the approved semantic order, section jobs, pattern stack, constraints, and harmony notes. After generation, extract hierarchy, spacing, media treatment, and CTA priority; keep decorative styling in the consuming product.

Required preconditions before prompt:

- Use case, audience, section jobs, semantic order, pattern stack, scroll owner, constraints, and harmony evaluation are approved.

Image review extract-vs-ignore:

- Extract section rhythm, hierarchy, approximate spacing, media treatment, and CTA priority.
- Ignore decorative choices that belong to the consuming product or conflict with source order, accessibility, constraints, or content stress behavior.

## Harmony Evaluation

Use the [Harmony evaluation gate](../quality/gates/harmony-evaluation.md) before implementation. If hierarchy, rhythm, accessibility, or source order conflict with the visual reference, the layout contract wins and the image prompt should be regenerated.

## When Not To Use

Do not use this recipe to force marketing-page structure onto task-heavy apps, documentation, long articles, settings, or list-detail workflows.

## Related Patterns

- [page-grid](../patterns/grid-repetition/page-grid.md)
- [card-grid](../patterns/grid-repetition/card-grid.md)
- [sidebar](../patterns/split-sidebar/sidebar.md)
- [sticky-footer](../patterns/viewport-shell/sticky-footer.md)

## IA Navigation

Parent: [Layout Recipes](index.md).
Next: [Gate Contracts](../quality/gates/index.md) for claim checks, or [Layout Pattern Catalog](../CATALOG.md) when replacing a primitive.
