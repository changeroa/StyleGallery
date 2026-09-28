---
type: Showcase Brief
title: Mercury - unofficial brand study
description: A dusk landscape with an email pill, a laptop that grows into the product on scroll, deep navy stages, indigo pills, hairline lists, and a header that changes theme per section.
brand_study: true
subject: Mercury
source_capture: site-compiler/out/packs/mercury
---

## Direction

Mercury's homepage register: a soft dusk landscape hero with light, very large headline type and an email-plus-buttons pill, then a zoom from a small laptop on a desk into the product, then long deep-navy stages broken by one pale ice-blue section. Hairline rules separate list items and sections; indigo is reserved for the primary "Open account" pill.

## System

- Type: Inter 300 for display with negative tracking, 400-500 for everything else; footnote numbers are superscripts.
- Color: navy #171721, navy panel #1f2030, ice #f4f6fb, indigo #5266eb, soft grey #a9abbd.
- Shape: full pills, 16-18px card radii, small rounded tags.
- The wordmark is plain spaced text with a drawn ring, not the logo. Balances, yields, coverage, and customer counts are invented.

## Techniques

- Header theme follows the section under it: transparent on the hero, blurred navy on dark sections, white on light sections.
- Pinned laptop zoom: a 220vh section with a sticky stage scales the drawn laptop from 0.32 to 1 with scroll progress.
- Selectable feature list: one detail paragraph moves under the pressed item while a live product panel redraws.
- Story switcher with a three-bar indicator; an orbit dot that turns with scroll rather than on a timer.

## Layout Floor

The sticky header height is covered by --sg-header for hash targets. The email form validates and says nothing was sent; every other action is an honest demo. Under reduced motion the laptop is shown full size and nothing turns.

## Comparison With The Original

Reviewed side by side at 1440x900 against 8 capture frames (`.tmp/compare/mercury.jpg`).

- Matches: a white announcement bar over a transparent header on a dusk landscape; a light, very large centred headline with an email-plus-buttons pill and a dark disclaimer pill; a header that turns dark on navy sections and white on the ice-blue section; a two-column all-in-one stage with a hairline list and a product panel; a founder quote card with a three-bar indicator; numbered quick-start items with an abstract illustration; a four-tile grid; a metrics row and three protection columns; a closing headline with indigo and grey pills over two entry cards; numbered footnotes.
- Deliberate differences: the photographed landscape and laptop are drawn; the laptop zoom is a pinned scale from 0.32 to 1 rather than a photographic push-in; all figures, quotes, and disclosures are invented, and the study states it is not a bank.
- Remaining gaps: the capture's landscape detail and the product UI density are simplified; study 7,676px vs 13,011px.
