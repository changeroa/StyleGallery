---
type: Verification Record
title: Toss-Inspired Homepage Clone Browser Verification
description: Local browser observations for responsive layout, keyboard behavior, reduced motion, and runtime errors.
---

# Toss-Inspired Homepage Clone Browser Verification

The implementation was observed on 2026-09-09 in an Aside-controlled Chrome 151 browser on a local Mac. The original `https://toss.im/en-us` and this local implementation were inspected in separate tabs. Original-page observations were used only to identify high-level composition and interaction relationships.

## Original Capture Scope

The results and two screenshots below describe commit `af9dbde62f68d349ea26825df9c2a98887ad04ac`, before the scroll-story follow-up. They are retained as historical observations. The current three-chapter story and its checks are recorded in [Scroll Story verification](../scroll-story/verification.md).

## Results

| Check | Result |
| --- | --- |
| 1440×900 desktop | Hero, fixed header, section rail, split product scenes, three-column finance cards, service rail, business scene, travel scene, global section, and footer rendered without document overflow. |
| 768×900 | The mobile navigation trigger appeared and the document retained a single vertical scroll owner with no horizontal document overflow. |
| 375×812 | Hero crop, product mockups, horizontal service rail, business dashboard, and travel copy adapted without document overflow. |
| 320×800 | Document width remained contained; reduced-motion media emulation exposed all 20 reveal elements immediately and computed root scroll behavior was `auto`. |
| Mobile navigation | The trigger changed `aria-expanded` to `true`; the menu exposed all five links; Escape returned the menu to its closed state. |
| Asset feature tabs | Pointer selection changed the selected tab and displayed value. Arrow Down moved focus and selection to the next tab and updated the panel value. |
| Section progress | The left rail followed Finance, Everyday Life, Business, and Global/Travel sections during desktop scrolling. |
| Runtime | No JavaScript console errors or uncaught page errors were observed. |

The horizontally scrollable service rail intentionally has a larger `scrollWidth` than its own `clientWidth` on narrow screens. The document itself does not take responsibility for that overflow.

## Screenshots

- [Desktop 1440×900](evidence/desktop-1440.png)
- [Mobile 375×812](evidence/mobile-375.png)

These screenshots document two observed states. They are not visual-regression baselines or evidence of behavior on Safari, Firefox, Android hardware, or iOS hardware.

## Implementation Handoff

Consumer reference: not_applicable
Consumer reference reason: This standalone clone verification selects no consumer-reference profile or record.

No design-terminology records were used.
