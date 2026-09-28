---
type: Showcase Brief
title: Ramp - unofficial brand study
description: A dot-grid hero, one lime accent, two-tone headings, an expense queue you can clear, a product bento, and scattered tools that converge on scroll.
brand_study: true
subject: Ramp
source_capture: site-compiler/out/packs/ramp
---

## Direction

Ramp's homepage register: an off-white page on a faint dot grid, a black announcement bar above a sticky white header, very large left-aligned hero type, and two-tone headings where the second clause is grey. Lime is the single accent on primary buttons; black and pale grey fill the secondary ones. Beige rounded panels hold product mock-ups, and only the footer goes dark.

## System

- Type: Inter Tight 600 with tight tracking for headings, JetBrains Mono for eyebrows and counters.
- Color: paper #fbfaf7, card #f1efe9, ink #111, grey clause #8e8e88, lime #e4f222.
- Shape: small 8px-radius buttons (not pills), 14-22px panel radii, square arrow boxes on cards.
- The wordmark is plain lowercase text, not the logo. Counters, estimates, quotes, and policies are invented.

## Techniques

- Expense queue: approve or flag each row; the header counts down to "All clear" and announces each change.
- Card limit slider; a hero share chip and agents counter that tick only while the hero is on screen.
- Product bento (2 + 3) with bars that grow in once.
- Recommendation panel: two selects produce invented estimates in a live region.
- Pinned convergence: six scattered tool cards fly into one black platform card as a 260vh stage scrolls.
- Policy switches with role="switch"; a masonry wall of invented quotes.

## Layout Floor

The announcement can be dismissed and --sg-header follows it. Email forms validate and say nothing was sent. Under reduced motion the convergence shows its end state and counters stay still.

## Comparison With The Original

Reviewed side by side at 1440x900 against 8 capture frames (`.tmp/compare/ramp.jpg`). A newsletter modal covers the centre of the capture from the fourth frame on.

- Matches: a black announcement bar and sticky white header with lime and black buttons; a dot-grid hero with a mono eyebrow and live percentage chip, a one-line headline, grey subcopy, and an email field fused to a lime button; a wide beige mock-up panel; a bento of product cards with two-tone titles and square arrow boxes; a blurred grey recommendation panel with rounded bottom corners; a "systems that never spoke" stage; a quote beside a policy mock; two cards; a quote wall; a dark footer with a final email field.
- Deliberate differences: the hero headline is larger and heavier than the capture; the mock-ups are interactive (expense queue, card limit, recommendations, policy switches) instead of static images; the newsletter modal is not reproduced as a blocking overlay; all counters and quotes are invented.
- Remaining gaps: the capture's new-product "Stack" section and bottom counter ticker bar are simplified into an inline ticker; study 6,745px vs 13,907px.
