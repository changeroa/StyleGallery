---
type: Showcase Brief
title: Clerk, unofficial study
description: An auth platform page that alternates light and dark bands joined by notched edges: a circuit-line hero with a copyable command, a working sign-in component, a dark auth grid with a self-filling code, org and role cards, a pricing table with a billing toggle, SDK grids, and a quote wall.
brand_study: true
subject: Clerk
source_capture: site-compiler/out/packs/clerk
---

# Clerk, unofficial study

## Direction

Reference: the captured clerk.com home (2026-09-21, 1440x900, 7,666px). Mood: engineered and friendly, grey-white with violet, broken by black bands. Signature: the hero promises components and then hands you one - the sign-in form validates, errors, and succeeds on the page.

## System

- Type: Inter 800 hero at -0.045em, 700 section heads; JetBrains Mono for commands and codes.
- Palette: light `#f7f7f8`, dark `#131316`, raised dark `#1c1c21`, ink `#131316`, grey `#5e5f6e`, violet `#6c47ff` (text `#5b3ae6`), teal `#0fa5a0`.
- Motion density: split hero, circuit pulses (paused offscreen), OTP fill-in, header theme flip.

## Techniques

- Notched band edges with `clip-path` shoulders on pseudo-elements.
- Capsule header that switches to a dark tone over dark bands.

## Layout Floor

Sticky floating capsule header; component and billing splits stack below 860px; grids collapse to one column; a fixed help button reserves bottom scroll padding.

## Comparison With The Original

Reviewed side by side at 1440x900 against 7 capture frames (`.tmp/compare/clerk.jpg`).

- Matches: a dark announcement strip over a floating capsule header; a light hero with faint circuit lines, a centered bold two-line headline, a grey two-line sub, and a mono command box; a hairline logo row with a caption cell; a component section with a sign-in card on a violet glow; a dark band with notched shoulders holding a centered head and a mixed-height auth card grid (code boxes, session list); light B2B cards with role tiles; a billing split with a two-plan pricing card; a dark band with framework and integration grids; a quote wall beside a short trust statement.
- Deliberate differences: the sign-in form validates and succeeds, the OTP fills itself, the billing toggle changes prices; companies, quotes, and prices are fictional; people photos become gradient tiles.
- Remaining gaps: study 4,728px vs 7,666px; the original's integration icons are replaced by labeled cells.
