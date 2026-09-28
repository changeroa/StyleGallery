---
type: Showcase QA Contract
title: Showcase Ideal State And QA Scenarios
description: Who uses the showcase, the state in which nothing snags for them, the measured gaps, the plan, and the scenarios that prove it.
lifecycle: experimental
---

# Showcase Ideal State And QA Scenarios

Primary role: acceptance contract for `showcase/`.

## Users And How They Use It

| User | Situation | What they do |
| --- | --- | --- |
| Visitor | Desktop browser, often through an SSH port forward to the machine that serves the files | Opens the showcase root, browses works, scrolls, clicks nav and calls to action, shares a section link, presses Back |
| Mobile visitor | Phone, touch, portrait, sometimes landscape with a short viewport | Scrolls and taps; never hovers |
| Keyboard or screen reader visitor | Tab, Shift+Tab, Enter, arrow keys; assistive technology reading names and status messages | Skips to content, moves through controls, hears results of actions |
| Motion-sensitive visitor | `prefers-reduced-motion: reduce` | Expects a complete, calm, static page |
| Restricted-network visitor | Corporate proxy or offline; CDNs, web fonts, and WebGL libraries fail | Expects the page to still read correctly |
| Building agent or developer | Follows the AGENTS.md Creative Build Route to make a new work in one shot | Reads a few pages, builds, previews, runs one check, reviews screenshots, iterates |
| Maintainer | Reviews changes to the repository | Runs validators; expects no regression and no ungoverned files |

## Ideal State

A user in any row above never meets a snag, a surprise, a regression, or a degraded experience:

1. **I1 Entry.** The showcase root is a gallery hub that lists every work. Every work links back to the hub. No link opens raw Markdown or a directory listing.
2. **I2 Honest controls.** Every link and button does something plausible. A fictional action (subscribe, book, call, get a key) says so in an announced status message instead of silently jumping to the top of the page.
3. **I3 Legible.** At rest, all text meets WCAG AA contrast against solid backgrounds: 4.5:1, or 3:1 for large text.
4. **I4 Nothing clipped.** At any viewport at least 320 CSS pixels wide and 600 tall, nothing overflows horizontally, and no pinned or fixed content is taller than the viewport.
5. **I5 Navigation behaves like the web.** In-page links update the URL hash so the section can be shared, and Back returns to where the reader was. The target heading lands visible below any sticky header. Opening a URL with a hash lands on that section even when pinned scenes change layout after load.
6. **I6 Keyboard.** Focus follows DOM order, and every focused element is visible and not hidden under a sticky or fixed header.
7. **I7 Reduced motion.** No ambient loops run, smooth scrolling is off, and all content is visible on arrival.
8. **I8 Graceful degradation.** With every non-local request blocked, there are no script errors, all text is visible, and the layout holds.
9. **I9 Identity.** Every page has a descriptive title and a favicon, and requests no missing same-origin resources.
10. **I10 Frugal.** WebGL and scroll work pause when offscreen, and nothing animates forever while unseen.
11. **I11 One-command preview and check.** One command serves the showcase with the URLs to open, including over SSH; one command checks every work.
12. **I12 Truthful screenshots.** Review screenshots show settled states, not tweens caught halfway.
13. **I13 Checks that can fail.** Every machine-checkable item above is enforced by `scripts/check-showcase.mjs`, and a committed self-test proves that each check fails on a page built to violate it.
14. **I14 Short route.** An agent gets from AGENTS.md to a running preview and a passing check within three reads.
15. **I15 No regression.** The repository's existing validators report the same failures as before, the material registry stays consistent, and every new Markdown file passes OKF and link validation.
16. **I16 No empty screen.** Every screen a visitor scrolls to shows a picture, drawn scene, render, or live product surface, or dense text; never a headline alone on a gradient.
17. **I17 The page answers.** Links, buttons, cards, tabs, and media frames change state under the pointer, quickly (100-320ms), on enough elements that the page feels alive between its big moments.
18. **I18 Finished surfaces.** Masks, rounded clips, and hairlines finish the surfaces, as they do on the measured originals in [Measured Expression Benchmarks](../expression/measured-benchmarks.md).

## QA Scenarios

Automated scenarios run in `node scripts/check-showcase.mjs` for every work and the hub. The self-test `node scripts/test-check-showcase.mjs` proves that each automated check fails on a violating fixture.

| ID | Ideal | Scenario | Expected | Evidence |
| --- | --- | --- | --- | --- |
| Q1 | I1 | Open the showcase root. | A hub page lists every work directory; every listed link returns 200. | Automated: hub listing |
| Q2 | I1 | In each work, collect all links. | No link targets a `.md` file; the footer links to the hub. | Automated: link targets |
| Q3 | I2 | Collect in-page links outside the header. | None targets `#top` or `#`; every `#id` target exists. | Automated: link targets |
| Q4 | I2 | Activate each fictional call to action. | A visible status message appears and is announced through `role="status"`; the scroll position does not jump. | Automated: demo actions |
| Q5 | I3 | Reduced motion, 1440 wide: compute contrast for every text node over a solid background. | Every ratio meets AA. | Automated: contrast |
| Q6 | I4 | Widths 320, 768, and 1440 at the top, middle, and bottom of the page. | No horizontal overflow. | Automated: overflow |
| Q7 | I4 | 1280x620, scroll through 24 stops. | No fixed or pinned element containing text is taller than the viewport. | Automated: short viewport |
| Q8 | I5 | 1440x900 with motion, from the top: click the first header nav link. | The URL hash equals the link target; the target's first heading lands below the sticky header and in the top half of the viewport. | Automated: hash navigation |
| Q9 | I5 | Then press Back. | The hash is cleared and the page returns near the top. | Automated: hash navigation |
| Q10 | I5 | Load the page with the last header nav target in the URL hash. | After load and pin refresh, that target's heading is visible below the header. | Automated: direct hash |
| Q11 | I6 | Tab through up to 60 stops at each width. | DOM order, every focused element in view and not covered by a sticky or fixed header. | Automated: focus |
| Q12 | I7 | Reduced motion at each width. | Every heading and paragraph visible on arrival; no infinite animation running. | Automated: reduced motion |
| Q13 | I8 | 390 wide, all non-local requests blocked. | No page errors, no hidden text, no horizontal overflow. | Automated: offline |
| Q14 | I9 | Load each page. | A favicon link exists; no same-origin request returns 4xx; the title is not empty. | Automated: identity |
| Q15 | I10 | 1440 wide with motion, at the top and bottom of the page: collect infinite CSS animations and repeating GSAP tweens. | None runs on an element that is entirely offscreen. Every WebGL render loop gates on an IntersectionObserver. | Automated: offscreen ambient; manual source review for WebGL loops |
| Q16 | I11 | Run `bun run showcase:serve -- --port 4190`. | It prints the hub and work URLs plus an SSH forwarding command, and serves every work with correct content types. | Manual: command output recorded |
| Q17 | I12 | Inspect the checker's screenshots for a work with entrance tweens. | Entrance headlines are fully risen and reveals fully opaque. | Manual: screenshots reviewed |
| Q18 | I13 | Run `node scripts/test-check-showcase.mjs`. | The good fixture passes; each bad fixture fails with exactly its targeted check. | Automated: self-test |
| Q19 | I14 | Read AGENTS.md, then the showcase README. | Both commands and the SSH note are reachable from those two pages. | Manual: document review |
| Q20 | I15 | Run the repository validator suite. | Failure sets are identical to the recorded baseline; the material registry validates. | Automated: validator comparison |
| Q21 | I8 | Load each work with JavaScript disabled. | All content reads as a static document. | Automated: no-script pass |
| Q22 | I16 | 1440x900 with motion: scroll one screen at a time and measure coverage. | Images, video, canvas, SVG of at least 120x80, background images, and `data-surface` elements cover at least 8% of each screen, or text covers at least 10%. | Automated: richness (warning by default, failure with `--richness error`) |
| Q23 | I17 | 1440x900 with motion: count elements with a non-zero transition, and link and button transition durations. | At least 4 per screen of page length and at least 12 in total; the median link and button duration is 350ms or less. | Automated: richness |
| Q24 | I18 | 1440x900 with motion: count masked or clipped elements and 1px hairline borders. | At least 2 masked or clipped elements and at least 3 hairlines. | Automated: richness |

## IA Navigation

Parent: [Showcase](README.md).
Next: [Expression](../expression/index.md).
