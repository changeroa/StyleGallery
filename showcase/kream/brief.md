---
type: Showcase Brief
title: KREAM, unofficial study
description: A resale marketplace home as a stack of pinned two-column banner rows - media left, underlined headline right - under a fixed three-tier header, with fictional live prices.
brand_study: true
subject: KREAM
source_capture: site-compiler/out/packs/kream (2026-09-21, 1440x900, 15,802px)
---

# KREAM, unofficial study

## Direction

Reference: the captured kream.co.kr home (the capture shows a partly styled render with underlined link headings). Mood: stark black and white retail, media does the color. Signature: rows pin under the header and the next row slides over the last like a stack of cards, each media panel slowly zooming while pinned.

## System

- Type: Pretendard Variable, 700 underlined two-line headlines, grey underlined text links as CTAs. The brand name is plain text.
- Palette: ground `#ffffff`, ink `#222222`, grey `#5f5f5f`, lines `#ebebeb`, price up `#d23c28`; each media panel carries its own color (grey, violet, terracotta, navy, brown, green).
- Motion density: sticky card stacking, per-row zoom, 1.8s fictional price ticks, one counter.

## Techniques

- [Scroll choreography](../../motion/techniques/scroll-choreography.md) for scroll-derived zoom.
- Sticky stacking rows with a top shadow so each new row reads as sliding over.

## Layout Floor

Fixed 122px header; rows are `position: sticky` at desktop only. Under reduced motion and below 760px the rows return to normal flow and stack vertically.

## Comparison With The Original

Reviewed side by side at 1440x900 against 2 capture frames (`.tmp/compare/kream.jpg`).

- Matches: the three-tier header (utility links, name with HOME/STYLE/SHOP and icons, category row), and the 50:50 row of a grey product media panel on the left with a bold two-line underlined headline and a small grey underlined link on the right; a colored media panel starting directly below.
- Deliberate differences: the capture shows a partly styled render (default blue links); the study renders the intended black-on-white system. Rows pin and stack, media zooms while pinned, and a fictional size-price ticker updates. Products are drawn; the name is plain text.
- Remaining gaps: six rows (4,114px) instead of the original's long banner stack (15,802px).
