---
type: Quality Reference
title: Sample Claim Records
description: Filled structured quality claims for common review decisions.
---

# Sample Claim Records

These examples show the minimum useful record shape. They are intentionally compact so high-impact claims remain reviewable without becoming heavy documentation work.

## Claim Record 1 - Harmony Before Image Generation

Principle: Accessibility precedence and principles before evidence.

Claim: A homepage GPT Image reference should be generated only after the content-to-layout match and harmony evaluation approve semantic order, section jobs, pattern stack, scroll owner, and constraints.

Context: Webpage generation can otherwise let a visual reference decide layout before source order and task flow are known.

Use case: Homepage or ordinary webpage generation from raw content.

Warrant: The image can help inspect hierarchy and spacing only after the layout contract names the content jobs and constraints it should express.

Evidence family: `rationale`, `source`, `screenshot`.

Verification protocol: Check that the layout brief names use case, section jobs, pattern stack, rejected alternatives, harmony notes, GPT Image reference prompt, and implementation handoff before image generation.

Implementation handoff: Build semantic HTML and layout patterns first; copy only hierarchy, rhythm, media treatment, and CTA priority into product-level styling after the gate passes.
Consumer reference: not_applicable
Consumer reference reason: This sample contains no consumer-specific reference record.

Boundary or limitation: The image cannot prove usability, accessibility, brand fit, or final implementation quality.

Debt or escalation: If the visual reference conflicts with source order, focus order, accessibility, or content stress behavior, regenerate the prompt or record a blocked decision.

Decision: pass when the harmony gate is complete before the image is generated.
Evidence refs: `quality/gates/harmony-evaluation.md`
Verified by: human
Reviewed at: 2026-10-15
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 2 - Screenshot Diff Limits

Principle: Visual QA evidence precedes visual judgment.

Claim: A stable screenshot diff supports a rendered-state claim, but it does not prove usability or accessibility.

Context: Visual review often finds regressions, overflow, hidden text, and hierarchy shifts, but user-facing outcomes require stronger evidence.

Use case: not applicable.

Warrant: Screenshots show a bounded rendered state; usability and accessibility depend on task completion, semantics, keyboard flow, assistive technology, and user context.

Evidence family: `screenshot`, `accessibility`, `user`.

Verification protocol: Pair screenshots with the visual-evidence gate and route accessibility or usability claims to their dedicated evidence families.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This screenshot-limits sample contains no consumer-specific reference record.

Boundary or limitation: A screenshot can hide focus order, screen-reader output, dynamic states, and untested content stress.

Debt or escalation: Escalate to accessibility or user evidence when the claim says readable, usable, accessible, clear, good, better, or harmonious for a person or task.

Decision: review_required when screenshots are the only evidence for a human-outcome claim.
Evidence refs: `quality/evidence/visual-qa.md`, `quality/gates/visual-evidence.md`
Verified by: mixed
Reviewed at: 2026-10-15
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 3 - Accessibility Scan Limits

Principle: Accessibility is a boundary condition.

Claim: An automated accessibility scan can support a scoped accessibility finding, but it cannot certify complete accessibility.

Context: Automated checks miss keyboard behavior, assistive-technology behavior, cognitive load, language clarity, and some semantic defects.

Use case: not applicable.

Warrant: The scan is validator evidence for detectable rules; complete accessibility needs manual and contextual evidence.

Evidence family: `validator`, `accessibility`, `user`.

Verification protocol: Record the scan tool, ruleset, viewport or state, manual keyboard checks, and any required screen-reader, accessibility-tree, or cognitive review.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This accessibility-limits sample contains no consumer-specific reference record.

Boundary or limitation: The scan cannot prove accessibility for every user, device, browser, or assistive-technology pairing.

Debt or escalation: Accessibility debt must name affected users, owner, review trigger, and the evidence gap before it can be accepted.

Decision: blocked when a known accessibility failure is treated as a taste tradeoff or ordinary visual debt.
Evidence refs: `quality/evidence/accessibility.md`, `quality/gates/accessibility-evidence.md`
Verified by: human
Reviewed at: 2026-10-15
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 4 - Scroll-Body-Shell Scroll Ownership

Principle: A layout pattern owns its named scroll container.

Claim: The `scroll-body-shell` pattern keeps header and footer regions fixed while only the named body region scrolls, with no horizontal overflow and keyboard focus following DOM order, at 320, 768, and 1440 CSS pixels.

Context: Viewport-shell patterns regress silently when a layout change hands scroll to the document root, traps focus, or overflows a narrow viewport; prose alone cannot catch this.

Use case: not applicable.

Warrant: The Conservator renders the pattern doc's CSS block verbatim around stress content at three widths and asserts the body is the only scroll owner, the document root does not overflow, Tab order matches DOM order, reduced motion shows no running infinite animation, and axe-core reports no serious or critical violation; removing the body's `overflow` declaration makes the scroll-owner check fail.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern scroll-body-shell --controls --json` renders the exhibit and its negative control and fails when any width breaks the contract; `node scripts/test-conservator.mjs` guards the Conservator with every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Conservator sample contains no consumer-specific reference record.

Boundary or limitation: The Conservator proves the exhibit's rendered layout contract on one Chromium engine; it does not prove the pattern is usable, accessible for every assistive technology, or correct in browsers it does not render.

Debt or escalation: Every Layout pattern now has a Conservator exhibit and a record under [Layout Pattern Records](#layout-pattern-records); a flaky render is a blocking defect, not an accepted cost.

Decision: pass when the Conservator is green at all three widths.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/scroll-body-shell`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Layout Pattern Records

Records 5 onward each bind one Layout pattern's documented spatial behavior to a Conservator exhibit (`sg://conservator/<pattern>`) defined in `scripts/conservator-exhibits.mjs`; record 4 covers `scroll-body-shell`. The Conservator renders the pattern doc's CSS block verbatim, measures the behavior at the listed widths, and proves the measurement discriminates by removing one declaration the doc lists under "Properties That Break The Layout If Removed". The Registrar fails when an exhibit has no record or a record names an exhibit that does not exist.

## Claim Record 5 - stack Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: Direct children of `stack` are separated by one 1rem block gap.

Context: [`stack`](../../patterns/stacking/stack.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `display` from `.stack` makes the `block-rhythm` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern stack --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `block-rhythm`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/stack`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 6 - box Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: Content inside `box` is inset 1rem from every edge of the box.

Context: [`box`](../../patterns/containment/box.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `padding` from `.box` makes the `box-inset` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern box --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `box-inset`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/box`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 7 - center Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `center` caps its content box at 64rem, centers itself in wider space, and keeps 1rem inline gutters.

Context: [`center`](../../patterns/centering/center.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `margin-inline` from `.center` makes the `center-centered` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern center --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `center-centered`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/center`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 8 - cluster Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `cluster` items keep a 0.75rem gap and wrap onto new rows instead of overflowing.

Context: [`cluster`](../../patterns/in-line-grouping/cluster.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `flex-wrap` from `.cluster` makes the `wrap-containment` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern cluster --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `wrap-containment`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/cluster`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 9 - content-limiter Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `content-limiter` caps prose at a 70ch measure plus 1rem gutters and centers it.

Context: [`content-limiter`](../../patterns/containment/content-limiter.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `max-inline-size` from `.content_limiter` makes the `limiter-measure` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern content-limiter --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `limiter-measure`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/content-limiter`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 10 - super-center Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `super-center` places its child at the center of a viewport-tall region on both axes.

Context: [`super-center`](../../patterns/centering/super-center.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `place-items` from `.super_center` makes the `super-center-both` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern super-center --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `super-center-both`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/super-center`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 11 - icon-frame Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `icon-frame` is a 2.5rem square slot with its icon centered.

Context: [`icon-frame`](../../patterns/media-fit/icon-frame.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `place-items` from `.icon_frame` makes the `icon-frame-center` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern icon-frame --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers. Not measured: doc HTML sample. The doc sample puts aria-label on a span with no role, which axe-core reports as serious aria-prohibited-attr; the exhibit adds role="img" and measures the layout only.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `icon-frame-center`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/icon-frame`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 12 - frame Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `frame` holds a 16:9 slot at full inline size and its media fills the slot regardless of the media's own ratio.

Context: [`frame`](../../patterns/media-fit/frame.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `aspect-ratio` from `.frame` makes the `frame-ratio` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern frame --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers. Not measured: object-fit: cover. Cropping is a paint result; element geometry cannot tell cover from fill once the media box equals the slot.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `frame-ratio`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/frame`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 13 - cover Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `cover` is at least viewport tall and gives its central region all space between the header and footer rows.

Context: [`cover`](../../patterns/viewport-shell/cover.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `min-block-size` from `.cover` makes the `cover-fill` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern cover --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `cover-fill`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/cover`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 14 - sidebar Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `sidebar` keeps an 18rem sidebar beside a wider primary region and wraps them when the primary would fall below 16rem.

Context: [`sidebar`](../../patterns/split-sidebar/sidebar.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `flex-wrap` from `.sidebar` makes the `sidebar-wrap` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern sidebar --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `sidebar-wrap`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/sidebar`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 15 - switcher Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `switcher` lays all items in one row when the container is at least 40rem and stacks all of them otherwise, never a partial row.

Context: [`switcher`](../../patterns/split-sidebar/switcher.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `flex-basis` from `.switcher_item` makes the `switcher-all-or-none` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern switcher --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `switcher-all-or-none`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/switcher`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 16 - media-object Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `media-object` keeps a 6rem media slot top-aligned beside its content when both fit and wraps the content below otherwise.

Context: [`media-object`](../../patterns/split-sidebar/media-object.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `flex-wrap` from `.media_object` makes the `media-wrap` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern media-object --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `media-wrap`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/media-object`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 17 - split-nav Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `split-nav` holds primary links at the inline start and pushes secondary links to the inline end.

Context: [`split-nav`](../../patterns/in-line-grouping/split-nav.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `margin-inline-start` from `.split_nav_secondary` makes the `split-nav-ends` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern split-nav --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `split-nav-ends`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/split-nav`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 18 - holy-grail Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `holy-grail` spans header and footer across three columns, keeps left, main, and right side by side, and fills the viewport block size.

Context: [`holy-grail`](../../patterns/viewport-shell/holy-grail.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 768, 1440 CSS pixels and measures the claimed geometry; removing `grid-template` from `.holy_grail` makes the `holy-grail-columns` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern holy-grail --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers. Not measured: 320px viewport. The doc marks the pattern breakpointed, but its CSS has no breakpoint: two minmax(12rem, auto) side columns plus gaps overflow a 320px viewport by 96px, so the exhibit is measured at 768 and 1440 only.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `holy-grail-columns`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/holy-grail`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 19 - sticky-footer Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `sticky-footer` keeps the footer at the viewport's block end when content is short.

Context: [`sticky-footer`](../../patterns/viewport-shell/sticky-footer.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `min-block-size` from `.sticky_footer` makes the `sticky-footer-end` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern sticky-footer --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `sticky-footer-end`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/sticky-footer`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 20 - sticky-header Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `sticky-header` stays pinned at the viewport's block start while the document scrolls.

Context: [`sticky-header`](../../patterns/viewport-shell/sticky-header.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `position` from `.sticky_header` makes the `sticky-header-pinned` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern sticky-header --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `sticky-header-pinned`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/sticky-header`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 21 - fixed-sidenav-shell Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `fixed-sidenav-shell` keeps a 16rem navigation column in place while only the main region scrolls.

Context: [`fixed-sidenav-shell`](../../patterns/viewport-shell/fixed-sidenav-shell.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `overflow` from `.fixed_sidenav_shell_main` makes the `sidenav-scroll-owner` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern fixed-sidenav-shell --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `sidenav-scroll-owner`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/fixed-sidenav-shell`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 22 - sticky-aside Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `sticky-aside` keeps a 16rem aside visible 1rem from the viewport's block start during long reads.

Context: [`sticky-aside`](../../patterns/split-sidebar/sticky-aside.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `position` from `.sticky_aside_side` makes the `sticky-aside-pinned` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern sticky-aside --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `sticky-aside-pinned`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/sticky-aside`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 23 - ram-grid Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `ram-grid` repeats as many equal columns of at least 16rem as fit and collapses to one full-width column below that.

Context: [`ram-grid`](../../patterns/grid-repetition/ram-grid.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `display` from `.ram_grid` makes the `track-count` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern ram-grid --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `track-count`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/ram-grid`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 24 - card-grid Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `card-grid` repeats as many equal columns of at least 18rem as fit and collapses to one full-width column below that.

Context: [`card-grid`](../../patterns/grid-repetition/card-grid.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `grid-template-columns` from `.card_grid` makes the `track-count` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern card-grid --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `track-count`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/card-grid`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 25 - twelve-span-grid Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `twelve-span-grid` items spanning four of twelve tracks sit three to a row at equal widths.

Context: [`twelve-span-grid`](../../patterns/grid-repetition/twelve-span-grid.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `grid-column` from `.twelve_span_grid_item` makes the `twelve-span-thirds` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern twelve-span-grid --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `twelve-span-thirds`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/twelve-span-grid`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 26 - page-grid Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `page-grid` centers content in a track of at most 72rem with outer gutters of at least 1rem plus the gap.

Context: [`page-grid`](../../patterns/grid-repetition/page-grid.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `grid-column` from `.page_grid_content` makes the `page-grid-centered` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern page-grid --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `page-grid-centered`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/page-grid`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 27 - grid-wrapper Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `grid-wrapper` centers main content in a track of at most 64rem and lets it take the full width when space is short.

Context: [`grid-wrapper`](../../patterns/grid-repetition/grid-wrapper.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `grid-column` from `.grid_wrapper_main` makes the `grid-wrapper-centered` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern grid-wrapper --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `grid-wrapper-centered`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/grid-wrapper`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 28 - columns Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `columns` flows long content into as many 18rem columns as fit and returns to one column when narrow.

Context: [`columns`](../../patterns/grid-repetition/columns.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `columns` from `.columns` makes the `column-flow` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern columns --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `column-flow`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/columns`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 29 - deconstructed-pancake Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `deconstructed-pancake` items stretch to fill each row and wrap when a 16rem item no longer fits.

Context: [`deconstructed-pancake`](../../patterns/in-line-grouping/deconstructed-pancake.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `flex` from `.deconstructed_pancake_item` makes the `pancake-stretch` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern deconstructed-pancake --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `pancake-stretch`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/deconstructed-pancake`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 30 - line-up Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `line-up` pushes each card's footer to the card's block end so actions align across cards of different lengths.

Context: [`line-up`](../../patterns/stacking/line-up.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `margin-block-start` from `.line_up_footer` makes the `line-up-footers` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern line-up --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `line-up-footers`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/line-up`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 31 - clamped-card Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `clamped-card` sizes to half the viewport, clamped between 16rem and 28rem, and centers itself.

Context: [`clamped-card`](../../patterns/containment/clamped-card.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `inline-size` from `.clamped_card` makes the `clamped-width` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern clamped-card --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `clamped-width`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/clamped-card`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 32 - fluid-styles Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `fluid-styles` fills its parent up to 72rem and centers itself beyond that.

Context: [`fluid-styles`](../../patterns/containment/fluid-styles.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `inline-size` from `.fluid_styles` makes the `fluid-width` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern fluid-styles --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `fluid-width`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/fluid-styles`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 33 - split-screen Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `split-screen` shows two equal panes side by side when two 20rem panes fit, stacks them otherwise, and is at least viewport tall.

Context: [`split-screen`](../../patterns/split-sidebar/split-screen.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `display` from `.split_screen` makes the `pane-reflow` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern split-screen --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `pane-reflow`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/split-screen`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 34 - list-detail Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `list-detail` places list and detail side by side when two 18rem panes fit and stacks them otherwise.

Context: [`list-detail`](../../patterns/split-sidebar/list-detail.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `grid-template-columns` from `.list_detail` makes the `pane-reflow` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern list-detail --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `pane-reflow`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/list-detail`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 35 - supporting-pane Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `supporting-pane` keeps the summary beside the main task when two 20rem panes fit and stacks it below otherwise.

Context: [`supporting-pane`](../../patterns/split-sidebar/supporting-pane.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `grid-template-columns` from `.supporting_pane` makes the `pane-reflow` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern supporting-pane --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `pane-reflow`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/supporting-pane`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 36 - feed Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `feed` stacks repeated items with one 1rem block gap.

Context: [`feed`](../../patterns/stacking/feed.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `display` from `.feed` makes the `block-rhythm` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern feed --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `block-rhythm`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/feed`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 37 - breadcrumb Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `breadcrumb` keeps a 0.5rem gap between trail items and wraps the trail instead of overflowing.

Context: [`breadcrumb`](../../patterns/in-line-grouping/breadcrumb.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `flex-wrap` from `.breadcrumb` makes the `wrap-containment` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern breadcrumb --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `wrap-containment`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/breadcrumb`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 38 - pagination Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `pagination` centers its page controls in the row with a 0.5rem gap.

Context: [`pagination`](../../patterns/in-line-grouping/pagination.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `justify-content` from `.pagination` makes the `pagination-centered` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern pagination --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `pagination-centered`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/pagination`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 39 - badge-list Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `badge-list` starts each label at the item's inline start and ends each count at the item's inline end.

Context: [`badge-list`](../../patterns/in-line-grouping/badge-list.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `justify-content` from `.badge_list_item` makes the `badge-ends` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern badge-list --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `badge-ends`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/badge-list`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 40 - step-nav Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `step-nav` stacks steps with one 0.75rem block gap.

Context: [`step-nav`](../../patterns/stacking/step-nav.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `gap` from `.step_nav` makes the `block-rhythm` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern step-nav --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `block-rhythm`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/step-nav`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 41 - tab-strip Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `tab-strip` keeps peer tabs in a row with a 0.75rem gap and wraps them instead of overflowing.

Context: [`tab-strip`](../../patterns/in-line-grouping/tab-strip.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `flex-wrap` from `.tab_strip` makes the `wrap-containment` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern tab-strip --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `wrap-containment`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/tab-strip`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 42 - reel Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `reel` keeps items in one row of columns at least 14rem wide and scrolls that row itself, so the document root never overflows inline.

Context: [`reel`](../../patterns/in-line-grouping/reel.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `overflow-x` from `.reel` makes the `reel-scroll-owner` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern reel --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `reel-scroll-owner`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/reel`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 43 - imposter Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `imposter` covers exactly its anchor, not the page, and centers its content over the anchor without leaving document order.

Context: [`imposter`](../../patterns/overlay-exception/imposter.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `position` from `.imposter_anchor` makes the `imposter-cover` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern imposter --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `imposter-cover`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/imposter`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 44 - panel-layout Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `panel-layout` places main and utility panels side by side when two 22rem panels fit and stacks them otherwise.

Context: [`panel-layout`](../../patterns/viewport-shell/panel-layout.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `display` from `.panel_layout` makes the `pane-reflow` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern panel-layout --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `pane-reflow`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/panel-layout`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 45 - overlay-stack Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `overlay-stack` places every item in the same grid cell so they overlap from one origin.

Context: [`overlay-stack`](../../patterns/overlay-exception/overlay-stack.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `grid-area` from `.overlay_stack_item` makes the `overlay-same-cell` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern overlay-stack --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `overlay-same-cell`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/overlay-stack`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 46 - wrap-row Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `wrap-row` keeps controls in rows with a 0.75rem gap and wraps them instead of overflowing.

Context: [`wrap-row`](../../patterns/in-line-grouping/wrap-row.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `flex-wrap` from `.wrap_row` makes the `wrap-containment` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern wrap-row --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `wrap-containment`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/wrap-row`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 47 - dense-grid Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `dense-grid` fills as many 8rem columns as fit, even when items run out.

Context: [`dense-grid`](../../patterns/grid-repetition/dense-grid.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `display` from `.dense_grid` makes the `track-count` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern dense-grid --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `track-count`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/dense-grid`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 48 - masonry-approx Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `masonry-approx` flows items into as many 14rem columns as fit and returns to one column when narrow.

Context: [`masonry-approx`](../../patterns/grid-repetition/masonry-approx.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `column-width` from `.masonry_approx` makes the `column-flow` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern masonry-approx --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `column-flow`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/masonry-approx`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## Claim Record 49 - main-with-rail Layout Exhibit

Principle: A layout pattern's documented spatial behavior must survive a real render.

Claim: `main-with-rail` keeps the rail beside main content when two 18rem panes fit and stacks it below otherwise.

Context: [`main-with-rail`](../../patterns/split-sidebar/main-with-rail.md) states this behavior in prose and CSS; without a render, a CSS or sample edit can break it while every text check stays green.

Use case: not applicable.

Warrant: The Conservator renders the doc's CSS block unchanged around stress content at 320, 768, 1440 CSS pixels and measures the claimed geometry; removing `grid-template-columns` from `.main_with_rail` makes the `pane-reflow` measurement fail, so the measurement discriminates the claimed behavior from ordinary flow.

Evidence family: `validator`, `screenshot`, `accessibility`.

Verification protocol: `node scripts/conservator.mjs --pattern main-with-rail --controls --json` renders the exhibit and its negative control; `node scripts/test-conservator.mjs` runs every exhibit and control.

Implementation handoff: not applicable.
Consumer reference: not_applicable
Consumer reference reason: This Layout pattern record selects no consumer-specific reference record.

Boundary or limitation: The render covers one Chromium engine, the exhibit's stress content, and 320, 768, 1440 CSS pixels at a 720px viewport height; it does not prove usability, complete accessibility, or behavior in other browsers.

Debt or escalation: A failing exhibit blocks the change until the pattern CSS or the doc claim is corrected; a flaky measurement is a blocking defect, not an accepted cost.

Decision: pass when the exhibit is green at every listed width and its negative control fails on `pane-reflow`.
Evidence refs: `scripts/conservator.mjs`, `scripts/conservator-exhibits.mjs`, `scripts/test-conservator.mjs`, `sg://conservator/main-with-rail`
Verified by: auto
Reviewed at: 2026-10-16
Review by: not applicable
Source revision: not applicable
Conflicts with: not applicable

## IA Navigation

Parent: [Claim Records](index.md) in [Quality Gates](../index.md).
Next: [Structured Quality Claims](../claims.md) for the template and high-impact scope rule.
