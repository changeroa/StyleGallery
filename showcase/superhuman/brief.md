---
type: Showcase Brief
title: Superhuman, unofficial study
description: A productivity-suite page: a painted sky hero with a light two-line headline, a navy CTA with a gradient arrow chip, and floating glass assistant cards; a hairline logo grid between hatched rails; a warm band with a four-tab product suite; stat cells; and a plum footer under a multicolor line.
brand_study: true
subject: Superhuman
source_capture: site-compiler/out/packs/superhuman
---

# Superhuman, unofficial study

## Direction

Reference: the captured superhuman.com home (2026-09-21, 1440x900, 6,406px). Mood: calm sky above warm paper. Signature: the hero cards are live - the assistant card types its scheduling reply while the glass cards drift - and the suite tabs rewrite one panel instead of hiding four.

## System

- Type: Inter 300 at -0.035em for display, 400-600 for UI.
- Palette: paper `#f7f4ef`, band `#ece7df`, ink `#1c1a2e`, grey `#5a566b`, violet `#6d4bd8`, plum footer `#3a1a24`; sky `#5b6fd6 -> #e3c9e6` with a pink cloud.
- Motion density: split hero, card bob (paused offscreen), typed reply, tab swaps, counters.

## Techniques

- Transparent header over the hero that turns white with a hairline once scrolled.
- Diagonal hatched side rails framing the content column.
- Glass cards (`backdrop-filter`) over a gradient sky.

## Layout Floor

Sticky header with 70px scroll padding; hero cards stack below 860px; the tab bar goes to two columns and the panel stacks; stats stack below 760px.

## Comparison With The Original

Reviewed side by side at 1440x900 against 4 capture frames (`.tmp/compare/superhuman.jpg`).

- Matches: a white header with a spaced uppercase wordmark, small links, a text "Contact sales" and an outlined sign-in; a sky hero with a light-weight centered two-line headline, a one-line sub, and a navy CTA with a gradient arrow chip over floating glass assistant cards; a hairline six-cell logo grid framed by diagonal hatched rails on warm paper; a warm band with "suite" head, an outlined violet CTA, a four-cell tab bar, and a two-column panel (text with hollow-circle bullets, gradient media); a plum footer with a two-line brand line and link columns.
- Deliberate differences: the hero sky is painted gradients instead of a photograph with a person; the assistant card types its reply; the tabs rewrite one panel; customers and numbers are fictional; the cookie banner over every capture frame is omitted; a stat row replaces the unobserved gap before the footer.
- Remaining gaps: study 2,563px vs 6,406px; the original's hero photograph and product sub-sections (Go, Mail, Docs) are condensed into the tabbed panel.
