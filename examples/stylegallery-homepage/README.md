---
type: Worked Example
title: StyleGallery Homepage Example
description: Static product-layer homepage example planned from a clean install of the published npm package.
---

# StyleGallery Homepage Example

Static product-layer homepage built as an end-to-end npm package usage test.

## Package test

The implementation was planned from a clean temporary install of the published package:

```sh
npm install stylegallery@latest
sg-material search --query "homepage cover content limiter stack cluster ram grid frame" --limit 10
sg-material context --query "homepage semantic order cover content limiter stack cluster ram-grid frame accessibility responsive" --budget-tokens 6000
```

The tested package was `stylegallery@0.1.2`. Search returned the Homepage recipe and the selected `cover`, `content-limiter`, `stack`, `cluster`, `ram-grid`, and `frame` pattern guidance.

## Text-layout verification

`@chenglou/pretext@0.0.8` is pinned as a package dependency and loaded through `pretext-qa-adapter.mjs` during browser QA. It predicts whether each intended hero-heading row fits on one line before the same state is checked against the rendered DOM and Chrome CDP screenshot. Pretext is verification support only: it does not determine DOM structure, CSS layout, or runtime rendering, and the Node CLI/MCP surfaces do not invoke browser Canvas APIs.

## Run locally

From this directory:

```sh
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

For the Chrome CDP QA matrix, launch Google Chrome with a remote-debugging port and run:

```sh
npm run test:homepage:cdp
```

## Implementation handoff

- Use case: StyleGallery introduction homepage.
- Primary task: Understand the repository, inspect its domains, and start with npm or GitHub.
- Audience: Interface engineers, designers, and AI-agent builders.
- Section jobs: Hook, explain, prove scope, demonstrate agent access, state principles, convert, navigate.
- Semantic HTML skeleton: Header/navigation, ordered main sections, repeated domain list, CLI tab interface, footer.
- Pattern stack: `cover`, `content-limiter`, `stack`, `cluster`, `ram-grid`, `frame`.
- Scroll owner: Normal document scroll; code samples alone own horizontal overflow.
- Constraints and change points: Fluid page gutter, readable prose measure, `20rem` repeat-grid floor, wrapping CTA groups, single-column collapse below `960px`, compact navigation below `700px`.
- Harmony evaluation: Approved; section order follows the visitor decision path and essential content does not depend on decoration.
- GPT Image reference: Not used.
- Consumer reference: `not_applicable`.
- Consumer reference reason: This repository-local generic homepage example declares no consumer-specific profile or reference record.
- Accessibility checks: Skip link, landmarks, heading order, visible focus, keyboard tabs, reduced motion, text alternatives, intrinsic wrapping.
- Viewport/content stress checks: `320px`, `375px`, `768px`, `1024px`, `1440px`; keyboard interaction and horizontal overflow.
- Implementation debt: External npm and GitHub links require network access.
- Final implementation proof: Browser screenshots, console/network inspection, accessibility scan, and viewport checks.
- Accepted debt: Static demo content is Korean-first and does not include a language switcher.
