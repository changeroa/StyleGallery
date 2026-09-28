---
type: Showcase Brief
title: Revolut - unofficial brand study
description: Full-bleed stages, phone-outline overlays, pill tabs, a near-black card box, a scripted assistant, spinning coins, and a 3+2 plan grid.
brand_study: true
subject: Revolut
source_capture: site-compiler/out/packs/revolut
---

## Direction

Revolut's homepage register: sections alternate between full-bleed image stages, flat light panels, and near-black panels that meet on hard straight seams. Headlines are heavy, tight, sentence case, and centred after a left-aligned hero; each section stacks headline, short subcopy, optional fine print, and one pill button above a large media stage, with pill tabs underneath.

## System

- Type: Inter Tight 700-800 with negative tracking for headlines, 400-600 for body. The wordmark is plain text, not the logo.
- Color: paper #f7f7f5, ink #191c1f, black #000, coal #1c1d20, and gradient-filled accounts and cards; photography is replaced by CSS gradients.
- Shape: full pills for buttons and tabs (active filled, inactive outlined), 26-44px radii for cards and phone outlines, round arrow buttons on plan cards.
- Balances, rates, plan names, and prices are invented.

## Techniques

- Phone-outline overlay on the hero with a currency switcher that recomputes the balance and transactions.
- Three account cards with the middle one taller, lifting on hover.
- Savings goal tabs and an interest slider update a progress bar and a one-year figure inside a polite region.
- Physical/virtual toggle restyles the drawn cards in a tilted box; hovering a card lifts it out.
- A scripted assistant: prompt chips append a question and answer to a live log.
- A row of coins turning in 3D; a 3+2 plan grid with a monthly/yearly toggle.

## Layout Floor

The header sits on the hero only, as in the capture. Every sign-up, login, reward, trade, and plan action is an honest demo button. The coins' animation pauses offscreen and stops under reduced motion.

## Comparison With The Original

Reviewed side by side at 1440x900 against 7 capture frames (`.tmp/compare/revolut.jpg`). A cookie card covers the lower right of every capture frame.

- Matches: a full-bleed blue-sky hero with a left headline, a phone-outline overlay with a balance, and a light pill CTA; three account cards with the middle one taller; a dusk savings stage with Trip/Wedding/Moving-style pill tabs; a near-black card box with physical/virtual tabs; a dark assistant phone; a light two-column security section with a shield; a coin row on black; a 3+2 plan grid on dark grey.
- Deliberate differences: the photographed person, 3D cards, shield, and branded coins become CSS drawings; the hero headline is heavier than the capture's lighter weight; balances, rates, and plan names and prices are invented.
- Remaining gaps: the capture's hero-to-salary morph (the same card shrinking into the stack) is not reproduced; study 6,645px vs 8,662px.
