---
type: Showcase Brief
title: Perplexity, unofficial study
description: A one-screen answer-engine app shell: a pale sidebar with recent questions, a centered question, a rounded ask box with a mode toggle and a round send button, two suggestion cards, and a pre-written answer that types itself out with numbered sources and follow-up chips.
brand_study: true
subject: Perplexity
source_capture: site-compiler/out/packs/perplexity
---

# Perplexity, unofficial study

## Direction

Reference: the captured perplexity.ai home (Korean locale, 2026-09-21, 1440x900, one 900px screen). Mood: a quiet desk, off-white paper, nothing competing with the question. Signature: the page answers - ask anything or tap a card and an answer streams in with citation chips and source cards, like the product without its data.

## System

- Type: Pretendard Variable 600 for the question, 400 body at 16px for answers.
- Palette: ground `#fbfbf8`, sidebar `#f3f3ee`, card `#f1f1ec`, ink `#13201f`, grey `#5a625f`, hairline `#e2e2dc`, teal `#1f6f68` (text `#165a54`).
- Motion density: blur-in question, streamed answer with a caret, card lift; nothing ambient.

## Techniques

- App-shell grid with a sticky full-height sidebar that becomes a top row below 820px.
- Citation superscripts rendered from bracket markers in the answer text.

## Layout Floor

Two-column shell; the sidebar is sticky, not fixed, so focus never hides under it. The cookie card is fixed bottom-right and dismissible. Suggestions stack below 820px.

## Comparison With The Original

Reviewed side by side at 1440x900 against the 2 available capture frames (`.tmp/compare/perplexity.jpg`); the source is a one-screen app shell, so only the first viewport exists to compare.

- Matches: a pale full-height sidebar with a small mark, a short menu, section labels, and a login row at the bottom; two small icon buttons top-right; a small grey "search" label over a one-line centered question; a rounded ask box with a placeholder, a mode toggle, plus and mic icons, and a round black send button; two grey suggestion cards side by side; a small footer line; a cookie card at the bottom-right with two equal buttons.
- Deliberate differences: the question is larger and centered rather than left-aligned inside the column; the sidebar lists invented recent questions; asking or tapping a card streams a pre-written answer with source cards and citation chips; the cookie card says the study uses no cookies.
- Remaining gaps: the original shows a legal/company footer block beside the cookie card; the study reduces it to one Unofficial line.
