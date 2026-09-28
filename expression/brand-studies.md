---
type: Domain Policy
title: Brand Studies
description: Rules for unofficial reinterpretations of real brands in showcase works.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Brand Studies

Primary role: brand-study policy.

## Repository Boundary

A brand study reinterprets a real, named brand as an unofficial design exercise. It is allowed only in `showcase/`. It is not allowed in any governed domain page, Layout pattern, or reference profile. Platform Guides' prohibition on brand imitation still applies to Platform Guides.

## Reusable Method

1. Set `brand_study: true` and `subject: <brand name>` in the work's `brief.md`.
2. Add `<meta name="robots" content="noindex, nofollow">` to `index.html`.
3. Show the word "Unofficial" in visible page text, typically in the title and footer, e.g. "Unofficial brand study".
4. Study the brand's register, then write original copy in that register. Do not paste taglines, product copy, or press text.
5. Reuse existing photographs, videos, product renders, and other media from the reference or supplied/project assets; record their source in the brief. Do not replace them with generated pictures or CSS/SVG product stand-ins. Create assets only for intentionally graphical or vector work, following [Image Weight](techniques/image-weight.md). Keep the brand name as plain text rather than copying its logo as the study's identity.
6. Run `node scripts/check-showcase.mjs --work <slug>`. The brief and page checks fail if steps 1-3 are missing.

## Opinionated Guidance

A good study answers "what if this brand leaned harder into X?" rather than cloning the current site. Pick the X, write it in the brief's `signature` field, and let the page argue for it.

## Platform-Specific Guidance

`noindex` keeps search engines from ranking the study for the brand's name. It does not stop people from sharing a public URL, so deploy studies to preview hosts, not to a domain that could be mistaken for the brand's.

## Unsupported Absolutes

Following these steps reduces confusion and copying risk. It is not legal advice and does not create a license to any trademark.

## Verification Contract

The showcase checker enforces the machine-checkable steps (subject, `noindex`, visible Unofficial text). A reviewer checks original copy, plain-text brand identity, recorded media sources, and whether newly created assets are intentionally graphical/vector rather than substitutes for photography or realistic renders.

## Source, License, And Attribution

Locally authored policy. No upstream source.

## IA Navigation

Parent: [Expression](index.md).
Next: [Showcase](../showcase/README.md).
