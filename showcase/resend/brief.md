---
type: Showcase Brief
title: Resend, unofficial study
description: A black developer-email page: gradient serif display beside a slowly turning CSS cube, glowing icon tiles over centered section heads, an SDK language switcher, a streaming delivery log, an editable newsletter editor, a deliverability grid with metrics, and a giant ghost wordmark.
brand_study: true
subject: Resend
source_capture: site-compiler/out/packs/resend
---

# Resend, unofficial study

## Direction

Reference: the captured resend.com home (2026-09-21, 1440x900, 12,319px). Mood: black velvet, silver serif, one color of glow per section. Signature: the hero object is a real CSS 3D cube of tiled faces turning slowly, and the test-mode log streams new delivery events while you watch.

## System

- Type: Instrument Serif for display with a white-to-grey vertical gradient fill; Inter 500 for section heads; JetBrains Mono for code and logs.
- Palette: ground `#000000`, card `#0b0b0c`, text `#ededed`, dim `#a1a1a1`; per-section glows gold `#ffd27a -> #ff8a3d`, violet, green `#6fe09c`, blue `#8fb2ff`, red `#ff8a8a`.
- Motion density: cube turn (paused offscreen), log stream, reveals, counters.

## Techniques

- CSS `preserve-3d` cube with repeating-gradient seams.
- Gradient text fills for display and one gold emphasized phrase.
- Card top highlight lines colored per card.

## Layout Floor

Sticky blurred header; hero stacks and the cube shrinks below 860px; developer cards, feature grid, and metrics stack.

## Comparison With The Original

Reviewed side by side at 1440x900 against 8 capture frames (`.tmp/compare/resend.jpg`).

- Matches: black page with a blurred sticky header, a left-aligned two-line serif display with a grey-to-white gradient, a pill note above and dark plus text CTAs below, a dark tiled cube on the right under a soft diagonal light; glowing icon tiles above centered section heads with a gold emphasized phrase; SDK language chips over a code panel; two dark cards with delivery logs and status badges; an editor mockup with a white Send button; a deliverability feature grid; metric cards; a closing serif line over a giant ghost wordmark and a link footer.
- Deliberate differences: the cube is a live CSS 3D object; the log streams new events; the editor paragraph is editable; all copy is new and the SDK is fictional.
- Remaining gaps: study 4,540px vs 12,319px; the React-email and audience sections are condensed.
