---
type: Showcase Brief
title: imweb, unofficial study
description: A store-builder home: dark promo pill, huge two-line promise over an AI prompt box flanked by template shots, a marquee of invented templates, an amber case carousel, a sticky-title feature story, growth bars with a giant number, and a closing CTA.
brand_study: true
subject: imweb
source_capture: site-compiler/out/packs/imweb (2026-09-21, 1440x900, 9,622px)
---

# imweb, unofficial study

## Direction

Reference: the captured imweb.me home. Mood: confident black-and-white builder with one amber band and cyan data. Signature: the prompt box responds with a plan, and the feature story keeps its title pinned while the active card and step list follow the reader.

## System

- Type: Pretendard Variable 800 with tight -0.05em tracking for the hero; section titles always break into two lines.
- Palette: ground `#ffffff`, ink `#111214`, promo `#15161a`, amber band `#a8550a`, cyan `#00b4ff` (text `#0072b8`), feature panels cyan/violet/green.
- Motion density: split hero, template marquee, case slide, story activation, bar growth, counters.

## Techniques

- Shared kit marquee (mover wrapper) and product-art kit for template thumbnails.
- Sticky title with IntersectionObserver-driven activation at the viewport center.

## Layout Floor

Static header; the story title is sticky on desktop and static below 860px, where every card is fully opaque.

## Comparison With The Original

Reviewed side by side at 1440x900 against 7 capture frames (`.tmp/compare/imweb.jpg`).

- Matches: a rounded black promo bar, a header with outlined login and black CTA, a huge centered two-line headline, an AI prompt box flanked by two template thumbnails, a left two-line section title over a template rail, a full-width amber case band with arrows, a two-line title beside stacked cyan and violet feature cards, cyan growth bars rising left to right beside a giant number, and a centered closing CTA.
- Deliberate differences: template names, cases, and numbers are invented; the case photographs are drawn products; the giant number sits on a dark card instead of a photo; the feature story activates cards as they cross the viewport center.
- Remaining gaps: study 5,665px vs 9,622px because the feature story is shorter.
