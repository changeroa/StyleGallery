---
type: Showcase Guide
title: Showcase
description: Free-form, single-page expressive works checked by outcome instead of authoring rules.
lifecycle: experimental
---

# Showcase

Primary role: expressive work area.

`showcase/` holds complete, expressive pages: brand studies, landing pages, and art-directed experiments. The Layout authoring rules do not apply here. A work may use any CSS property, any selector, gradients, blend modes, WebGL, GSAP, Lenis, or its own fonts. Layout still sets the floor: a work has to pass the outcome checks below. It does not have to follow the pattern CSS style guide.

## Why It Exists

Reusable Layout patterns exclude decorative styling so they stay portable. That rule is correct for `patterns/**`, but it made the repository unable to express a finished product page. Showcase is the product layer where the finished page lives. It depends on Layout and Expression. Nothing depends on it.

## Work Contract

Each work is one directory, `showcase/<slug>/`, containing:

- `index.html`: the entry page. It may load local files or pinned CDN libraries.
- `brief.md`: the direction, frontmatter with `type: Showcase Brief`, `title`, `description`, and `brand_study: true|false`.
- Any other local assets the page needs.

A brand study (`brand_study: true`) reinterprets a named real brand. It additionally requires:

- `subject:` in the brief frontmatter, naming the brand being studied.
- `<meta name="robots" content="noindex, nofollow">` in `index.html`.
- Visible text containing "Unofficial" on the page.
- No copied logos, trademarks as artwork, or verbatim marketing copy. Write original copy in the brand's register instead.

See [Brand Studies](../expression/brand-studies.md) for the reasoning and limits.

## Brief Template

```md
---
type: Showcase Brief
title: <Work name>
description: <One sentence: what the page is and what it should feel like.>
brand_study: false
---

# <Work name>

## Direction
Reference, mood, and the one thing a visitor should remember.

## System
Type pairing, palette, texture, and motion density, with actual values or a link to an Expression direction.

## Techniques
Expression and Motion technique pages the work uses.

## Layout Floor
Scroll owner, pinned or sticky regions, and how the page collapses at 320px.
```

## Preview

```sh
bun run showcase:serve              # http://localhost:4180/ (hub) and one URL per work
bun run showcase:serve -- --port 4190
```

Working on a remote machine over SSH? Run this on your own machine, then open `http://localhost:4180/` in your local browser:

```sh
ssh -N -L 4180:127.0.0.1:4180 <user>@<remote-host>
```

The serve command prints this line with the right user and host filled in. Fonts and libraries load from CDNs in the visitor's browser, so the local machine needs internet access.

Once any work exists, `showcase/index.html` is the hub that lists every work: the first work creates it, every later work adds a card, and each work's footer links back to `../`.

## Outcome Checks

`bun run test:showcase` (or `node scripts/check-showcase.mjs --work <slug>`) runs the hub and every work in headless Chromium. Each check maps to a scenario in the [QA contract](QA.md):

| Check | Failure |
| --- | --- |
| Brief contract | Missing brief fields, or a brand study without `subject`, `noindex`, or visible "Unofficial" text. |
| Runtime and assets | Any uncaught page error, or any same-origin request answered with 4xx. Failed CDN requests alone are tolerated. |
| Horizontal overflow | Document wider than the viewport at 320, 768, or 1440 CSS pixels, at the top, middle, or bottom. |
| Focus | A tabbable element with no box, outside the viewport, covered by another element (such as a sticky header), or reached out of DOM order. |
| Reduced motion | With `prefers-reduced-motion: reduce`, a heading or paragraph invisible on arrival, or an infinite animation running. |
| Contrast | Text over a solid background below WCAG AA: 4.5:1, or 3:1 for large text. |
| Links and actions | A link to raw Markdown, an empty `#`, a missing `#id`, or `#top` outside the header; a `[data-demo]` action that is not a button, shows no visible `role="status"` message, or moves the page. |
| Identity | No title or no favicon. |
| Hash navigation | Clicking the first header nav link does not update the URL hash or lands its heading under the header or below the top half; Back does not return near the top; opening the last nav target's URL directly does not land on it. |
| Short viewport | At 1280x620, a fixed or pinned element that contains text is taller than the viewport. |
| Offscreen ambient | At 1440 wide, an infinite CSS animation or repeating GSAP tween still running on an element entirely offscreen. Mark ambient containers `data-ambient` and pause them with an IntersectionObserver. |
| Offline | With every non-local request blocked: page errors, hidden text, or overflow at 390 wide. |
| No script | With every script blocked: hidden text or overflow at 390 wide. |
| Hub | Works exist but `showcase/index.html` is missing, or a work directory it does not link. With no works, the check passes and reports that there is nothing to check. |
| Richness: empty screen | At 1440x900, a screen where images, video, canvas, SVG of at least 120x80, background images, and elements marked `data-surface` cover under 8% and text covers under 10%. |
| Richness: response | Fewer than 4 elements with transitions per screen of page length (at least 12), or link and button transitions with a median above 350ms. |
| Richness: surface detail | Fewer than 2 elements with a mask or clip-path, or fewer than 3 with 1px hairline borders. |

Richness findings are warnings by default so older works keep passing; run with `--richness error` to make them failures, which new works must pass. Mark a drawn scene or a live product mock built from HTML with `data-surface` so the check counts it; never mark a gradient or an empty panel.

Fictional actions (subscribe, book, get a key) must be `<button type="button" data-demo="...">` elements that show an honest message in a `role="status"` region, never links that jump to the top.

Screenshots are taken after entrance tweens and CSS transitions settle and are written to `.tmp/showcase/<slug>/`. The checks do not judge taste: review the screenshots. `bun run test:showcase:self` proves each check can fail by running the checker against fixtures built to violate it.

## Works

The repository ships the contract, the checker, and the guidance, but no committed works. Works are built per project in `showcase/<slug>/` and must pass the checks above before they are shared.

## Starting A Work Fast

Read this page, the [Expression Direction Brief](../expression/direction-brief.md), one [Expression direction](../expression/index.md), and the [Motion techniques](../motion/techniques/scroll-choreography.md) you need. Skip governance, provenance, and consumer-reference documents: a showcase work creates no governed record. Plan one image, drawn scene, or product surface per screen before writing CSS ([Image Weight](../expression/techniques/image-weight.md)). Build, add a hub card, run `bun run showcase:serve` and `node scripts/check-showcase.mjs --work <slug> --richness error`, look at the screenshots, and iterate.

## IA Navigation

Parent: [StyleGallery](../index.md).
Next: [Expression](../expression/index.md).
