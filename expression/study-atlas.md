---
type: Domain Guide
title: Study Atlas
description: An index of the 54 unofficial brand studies in the showcase, grouped by the Expression direction each one feeds, with the comparison method and the lessons the outcome checks taught.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Study Atlas

Primary role: index of brand studies and the lessons drawn from building them.

## Repository Boundary

This page indexes `showcase/` works and routes to Expression directions and techniques. It creates no governed record, token, or Layout input. Every study is unofficial; see [Brand Studies](brand-studies.md) for the policy each one follows.

## Reusable Method

The initial studies used the workflow below. The older requirement to draw objects instead of using photography has been superseded by the existing-asset-first policy in [Image Weight](techniques/image-weight.md); the gallery descriptions record historical implementations, not a requirement to repeat that substitution.

1. Read the capture pack for the site (`site-compiler/out/packs/<slug>/SCENEBOOK.md`): scene order, grounds, type hierarchy, button shapes, sticky elements, and observed motion.
2. Build `showcase/<slug>/index.html` with original copy, existing media with recorded sources, a plain-text wordmark instead of the logo, `noindex`, and an "Unofficial" label. Create only intentional graphics/vectors; do not draw replacements for photographs or realistic renders.
3. Add at least one working demo of the product (see [Live Product Demos](techniques/live-product-demos.md)).
4. Pass `node scripts/check-showcase.mjs --work <slug>`.
5. Render the study and the capture frames side by side at 1440x900 and record matches, deliberate differences, and remaining gaps in the study's `brief.md`.

Three captures could not support a frame comparison, and their briefs say so: Tesla Model 3 recorded an access-denied page, Lusion recorded only the first viewport, and Nothing's frames were covered by a consent dialog. Those studies follow the brand's public design language instead of observed frames.

## Studies By Direction


### Fintech Clarity

Direction: [Fintech Clarity Direction](directions/fintech-clarity.md).

| Study | What it demonstrates |
| --- | --- |
| [Toss, unofficial study](../showcase/toss-im/index.html) | A bright Korean fintech page told in pinned scroll stages - an inset hero that opens to full bleed, a pinned accordion, blur-to-focus copy, and a device pill that grows into the room. |
| [KakaoBank, unofficial study](../showcase/kakaobank/index.html) | A quiet, card-first Korean bank page whose dark hero phone actually answers a question, followed by a staggered service collage, fact tiles, and a story carousel with a flip calendar. |
| [Toss Bank, unofficial study](../showcase/tossbank/index.html) | A dark Korean bank home: a blue-grey hero with an original mascot and product carousel, then a long three-column news grid beside a sticky company column. |
| [Banksalad, unofficial study](../showcase/banksalad/index.html) | A bright mint fintech home: ripple rings and orbiting money objects around an original leaf character, a comparison promise, a pick row, and a dark app band. |
| [Upbit, unofficial study](../showcase/upbit/index.html) | A dense Korean exchange home: three-line identity beside a live fictional treemap, ticking index strip, ranking table, service tabs, and security cards. |
| [flex, unofficial study](../showcase/flex-team/index.html) | A dark HR-AI landing: a grainy melted-color hero with a self-typing prompt, a dot-wave quote, dual role-aware chat panels, an alerting app window, a flowing data diagram, and a neon-green closing CTA. |
| [Stripe, unofficial study](../showcase/stripe/index.html) | A payments home with a flowing multicolor ribbon behind a two-tone headline, a live volume ticker, shadowed bento product cards, a stats row over a starburst, an aerial enterprise image, a navy architecture diagram with moving packets, and a news row. |
| [Revolut](../showcase/revolut/index.html) | Full-bleed stages, phone-outline overlays, pill tabs, a near-black card box, a scripted assistant, spinning coins, and a 3+2 plan grid. |
| [Wise](../showcase/wise/index.html) | Heavy uppercase display type, lime on forest green, pill buttons, a fee-transparent converter, and a globe of currency coins. |
| [Mercury](../showcase/mercury/index.html) | A dusk landscape with an email pill, a laptop that grows into the product on scroll, deep navy stages, indigo pills, hairline lists, and a header that changes theme per section. |
| [Ramp](../showcase/ramp/index.html) | A dot-grid hero, one lime accent, two-tone headings, an expense queue you can clear, a product bento, and scattered tools that converge on scroll. |

### Hardware Catalogue

Direction: [Hardware Catalogue Direction](directions/hardware-catalogue.md).

| Study | What it demonstrates |
| --- | --- |
| [Apple iPhone store hub, unofficial study](../showcase/apple-iphone/index.html) | A white product store hub: a region notice, a sticky translucent nav, a giant product title over an icon strip of CSS-drawn phones, a rounded grey hero card with a foldable that opens on scroll, a sideways carousel of reasons to buy, accessory tiles, an expandable devices panel, a directory band, and footnotes. |
| [Apple MacBook Pro, unofficial study](../showcase/apple-macbook-pro/index.html) | A long black product story that ends in a light shop: a CSS laptop whose lid opens on scroll beside a gradient headline and price pill, a chip highlight card, spec pills that rewrite a paragraph, a pinned stage that steps through three invented chips over a shifting color field, a starry battery section, a blue system section, ports, and a light section with reasons, a color-switch comparison, and a directory. |
| [Nothing](../showcase/nothing/index.html) | Monochrome hardware drawn in CSS, dot-matrix type, playable glyph lights, and one red dot. |
| [teenage engineering](../showcase/teenage-engineering/index.html) | White catalogue paper, near-black product stages, hairline grids, one orange knob, and a playable pocket sequencer. |
| [Tesla Model 3](../showcase/tesla-model3/index.html) | Full-bleed vehicle stages, a centered transparent header, three-stat rows, one blue button, a range estimator, and a live SVG configurator. |
| [Rivian](../showcase/rivian/index.html) | A floating rounded header, giant model names behind drawn vehicles, pill buttons, dusk landscapes, a charge estimator, and four earth-tone tiles. |

### Developer Tool

Direction: [Developer Tool Direction](directions/developer-tool.md).

| Study | What it demonstrates |
| --- | --- |
| [Linear, unofficial study](../showcase/linear/index.html) | A dark, hairline-precise product page in Linear's register, with a hero app that settles flat on scroll and a statement that lights up as it is read. |
| [Raycast, unofficial study](../showcase/raycast/index.html) | A near-black launcher page: blurred red light stripes behind a centered two-line promise, a working command palette, keyboard-cap tiles, an extension rail, an assistant transcript, a quote wall, automation cards, an isometric API stack, and a keyboard that lights under real key presses. |
| [Resend, unofficial study](../showcase/resend/index.html) | A black developer-email page: gradient serif display beside a slowly turning CSS cube, glowing icon tiles over centered section heads, an SDK language switcher, a streaming delivery log, an editable newsletter editor, a deliverability grid with metrics, and a giant ghost wordmark. |
| [Railway, unofficial study](../showcase/railway/index.html) | A dark night-journey deploy page: a painted dusk hero with stars, ridges, and a train crossing below a serif headline, a translucent logo wall, chaptered sections with a draggable service canvas, streaming logs, scaling bars, a wine-colored quote panel, a departures board of numbers, and an "All aboard" pill. |
| [Vercel, unofficial study](../showcase/vercel/index.html) | A monochrome, left-aligned infrastructure page: a tight two-line hero beside a live dotted globe with request arcs, case blocks with product panels that fade into the page, a card grid of new features, and a pill-button closing. |
| [Supabase, unofficial study](../showcase/supabase/index.html) | An off-white backend product page: a centered two-line hero with a mint second line, a hairline bento of product cards with a live table and realtime dots, a client tab switcher with a query result, two-tone section heads, gradient story cards, and a mint CTA. |
| [Cursor, unofficial study](../showcase/cursor/index.html) | A warm off-white coding-agent page: a short two-line promise, pill CTAs, app and terminal mockups floating on painted landscape panels, two-tone feature rows, voices, a live model picker, a changelog strip, and an oversized closing line. |
| [Warp, unofficial study](../showcase/warp/index.html) | A monospace blueprint page for an agent platform: dot-grid paper with six hairline guides, a three-line hero over a live factory grid, a header that turns royal blue past the hero, numbered figure panels (pipeline switcher, quality charts, stepped layers, control plane), a blue case band, and an FAQ. |
| [Zed, unofficial study](../showcase/zed/index.html) | A paper-and-hairline code editor page: drafting-frame rules with diamond markers, an italic blue serif headline, a three-point strip, an editor mockup whose buffer types an agent edit, testimonial cards with highlighted phrases, feature shots, an extension grid, a letter on graph paper, and a blue footer. |
| [Clerk, unofficial study](../showcase/clerk/index.html) | An auth platform page that alternates light and dark bands joined by notched edges: a circuit-line hero with a copyable command, a working sign-in component, a dark auth grid with a self-filling code, org and role cards, a pricing table with a billing toggle, SDK grids, and a quote wall. |

### Korean Service

Direction: [Korean Service Direction](directions/korean-service.md).

| Study | What it demonstrates |
| --- | --- |
| [Daangn, unofficial study](../showcase/daangn/index.html) | A neighborhood web home on soft grey: sticky search, category tiles, a ranked local feed that filters as you type, and a sticky map column with pulsing pins. |
| [Musinsa, unofficial study](../showcase/musinsa/index.html) | A dense black-and-white fashion commerce home: a compressing black header, three full-bleed editorial panels, collab chips, an orange promo band, and scrollable product rails with real like toggles. |
| [Kurly, unofficial study](../showcase/kurly/index.html) | A calm purple grocery home: promo strip, two-tier header that compresses to a sticky nav, a pausable hero carousel, a coupon band, and four-column product shelves with a working cart counter. |
| [29CM, unofficial study](../showcase/29cm/index.html) | An editorial Korean select shop: an oversized header nav that shrinks on scroll, a three-panel hero, and a long feed of full-height brand columns beside two curation columns of product rows. |
| [KREAM, unofficial study](../showcase/kream/index.html) | A resale marketplace home as a stack of pinned two-column banner rows - media left, underlined headline right - under a fixed three-tier header, with fictional live prices. |
| [Ohouse (오늘의집), unofficial study](../showcase/ohou/index.html) | A bright home-interior community and shop: sticky header with a sky-blue write button, a large painted-room story beside a small carousel, category icons, a saveable room-photo grid, and a countdown deal row. |
| [Baemin (배달의민족), unofficial study](../showcase/baemin/index.html) | A full-screen food-scene intro for a delivery app: painted tabletops, huge mint display type, store buttons, and a right-edge scene rail. |
| [Yanolja (NOL), unofficial study](../showcase/yanolja/index.html) | A leisure super-app home: peeking hero card carousel, category icon grid, genre ranking of original typographic posters, hotel cards, a special-deal band, and photo-style promo cards. |
| [Myrealtrip, unofficial study](../showcase/myrealtrip/index.html) | A travel marketplace home: region toggle, three ad banners, a city heading that is a real dropdown driving a two-column ranking, round quick links, and four-column product grids with save stars. |
| [Catch Table (캐치테이블), unofficial study](../showcase/catchtable/index.html) | A restaurant-booking web app rendered as a phone-width column on a dark desk: sticky search and tabs, a snap hero carousel, quick-menu icons, curated rows, a price-tab list, and a fixed bottom tab bar. |
| [SOCAR (쏘카), unofficial study](../showcase/socar/index.html) | A search-first car-sharing home: a one-line promise over a date and place finder that filters a four-column grid of cities, airports, and stations live, plus perk cards, trip stories, and an FAQ accordion. |
| [CLASS101, unofficial study](../showcase/class101/index.html) | A subscription landing for online classes: a centered promise with an orange gradient CTA, two tile rows marqueeing in opposite directions, perk tabs over a red chart panel, a class grid, a review masonry, FAQ, and a floating CTA bar. |
| [Wanted, unofficial study](../showcase/wanted/index.html) | A career platform home: frosted sticky header, a notice pill, a ten-icon quick menu, a paged company carousel with disabled-state arrows, news cards, theme cards, a three-column position list with bookmarks, and a blue explore CTA. |
| [Channel Talk (채널톡), unofficial study](../showcase/channel-io/index.html) | A friendly SaaS home in pastel gradients: split hero over a floating product window and phone, a logo wall, a try-the-AI input that answers, three capability cards, an industry case switcher, a workspace stage, stats, and a chat launcher. |
| [Sendbird, unofficial study](../showcase/sendbird/index.html) | A crisp two-product hero: a centered two-line promise over a blue-to-coral AI concierge card with a live memory panel and a grey communications API card with a phone, a ticking call timer, and a code snippet. |
| [imweb, unofficial study](../showcase/imweb/index.html) | A store-builder home: dark promo pill, huge two-line promise over an AI prompt box flanked by template shots, a marquee of invented templates, an amber case carousel, a sticky-title feature story, growth bars with a giant number, and a closing CTA. |
| [Rebellions, unofficial study](../showcase/rebellions/index.html) | A dark-to-light AI chip company home: a drawn server chassis hero with product tabs and a single lime CTA, a slate slogan block, hairline split scenes (performance racks, model tiles with a comparison bar, a stepped software stack, a hardware lineup), partners, a quote, updates, and a contact tile. |

### Product And Creative Tools

No shared direction yet; each study stands alone.

| Study | What it demonstrates |
| --- | --- |
| [Framer, unofficial study](../showcase/framer/index.html) | A black site-builder page: a live builder window whose blocks rearrange as an agent replies, an agent section with a transcript and step switcher, a nine-cell platform bento with vitals, cursors, uptime, and an A/B winner, a drawn site gallery, and customer story cards. |
| [Figma, unofficial study](../showcase/figma/index.html) | A bright design-tool home: a three-line hero beside a collage with a dot-matrix poster that spells a word, two-tone section heads over colored stage panels (lime with multiplayer cursors, grey with a prompt that generates an app screen, cyan with a repo checklist that ticks), tool tiles, a quote with a big stat, and a black footer. |
| [Notion, unofficial study](../showcase/notion/index.html) | A white, document-first product page with a one-line headline and a cycling highlighted verb, a live workspace board, warm AI feature cards, and duotone testimonial cards. |
| [Arc, unofficial study](../showcase/arc/index.html) | A playful indigo browser page: grainy blue ground, a scalloped pastel banner, a centered headline with download buttons, one pinned browser window whose sidebar color and page change with scroll, a cream quote band between scallops, and a closing CTA. |
| [Loom, unofficial study](../showcase/loom/index.html) | A friendly video-messaging page: a royal-blue promo strip over a white sticky nav, a bold centered promise with pill CTAs, a painted recorder with a webcam bubble and live timer, a logo grid, a blue bug-report panel that fills with errors, alternating feature rows on pastel art, a dark security panel, use-case tabs, a blue blog panel, a quote, and a closing card. |
| [Pitch, unofficial study](../showcase/pitch/index.html) | A violet presentation-software page: a lavender note over a dark nav, a giant two-line hero over drifting slides with a prompt that drafts a deck, a sticky workspace stage driven by a feature list, a sideways how-to rail, a colored quote wall, a toolkit bento, and a dark finale with solution tabs, template categories, an FAQ, and a giant closing word. |
| [Superhuman, unofficial study](../showcase/superhuman/index.html) | A productivity-suite page: a painted sky hero with a light two-line headline, a navy CTA with a gradient arrow chip, and floating glass assistant cards; a hairline logo grid between hatched rails; a warm band with a four-tab product suite; stat cells; and a plum footer under a multicolor line. |
| [Perplexity, unofficial study](../showcase/perplexity/index.html) | A one-screen answer-engine app shell: a pale sidebar with recent questions, a centered question, a rounded ask box with a mode toggle and a round send button, two suggestion cards, and a pre-written answer that types itself out with numbered sources and follow-up chips. |
| [Anthropic, unofficial study](../showcase/anthropic/index.html) | A cream editorial AI-lab page: a sans headline with underlined words beside a serif paragraph, a painted sky announcement with a staggered serif headline, tan release cards with mono metadata tables, a mission line beside an expandable topic list, and a dark footer grid. |
| [Lusion](../showcase/lusion/index.html) | A pale lavender page, one dark rounded stage of white, cobalt, and black jacks that follow the pointer, pill buttons, and scroll-lit statements. |

## Opinionated Guidance

A computed-style comparison of 49 originals against their studies, run after the studies were finished, found five systematic gaps behind the studies' weaker expression: no imagery, overscaled type, no masks or hairlines, too few responsive elements, and compressed pages. See [Measured Expression Benchmarks](measured-benchmarks.md) before starting a new study.


Lessons the outcome checks taught across the 54 builds, most frequent first:

- Contrast is measured against the nearest ancestor background, not the pixels behind the text. White text on an absolutely positioned gradient layer fails unless the section itself carries a dark `background-color` (Rivian, Revolut headers).
- Hidden paragraphs inside `main` fail even when hidden for a good reason, such as inactive tab panels. Share one caption outside the panels.
- Infinite CSS animations must sit inside a `[data-ambient]` container so the kit pauses them offscreen; better still, make loops finite or scroll-linked.
- Sticky stacks (announcement bar plus header plus category tabs) need `--sg-header` equal to their real height; measure it in script when the stack can change.
- Grids of controls need `minmax(0, 1fr)` and a wrap point at 320px, or buttons overflow clipped panels.
- A control that ends up under the fixed study bar after scrolling is not clickable without moving the page; leave room above the page end.

## Platform-Specific Guidance

All studies share `showcase/_kit/study.css` and `study.js` for reveal, split text, count-up, magnetic buttons, tabs, demo announcements, and offscreen pausing. Read the kit before adding a new helper to a study.

## Unsupported Absolutes

The groupings are editorial. A study can inform more than one direction; it is listed once, under the direction it influenced most.

## Verification Contract

Run `node scripts/check-showcase.mjs` for every work and the hub. A study whose comparison section still reads "Pending side-by-side review" is not finished.

## Source, License, And Attribution

Locally authored. The studies are unofficial reinterpretations; brand names identify their subjects and imply no affiliation.

## IA Navigation

Parent: [Expression](index.md).
Next: [Brand Studies](brand-studies.md).
