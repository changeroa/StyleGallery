---
type: Domain Guide
title: Expression Direction Brief
description: Decide what a finished page should feel like, with concrete values, before building it.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Expression Direction Brief

Primary role: art-direction handoff template.

## Repository Boundary

This brief records one product page's direction. Its values belong to that page or to a named direction. They never become reusable Layout values, and they are not consumer-reference tokens.

## Reusable Method

A strong one-shot page comes from committing to a few specific choices. Fill every field with an actual value; "modern" or "clean" is not a value.

```yaml
subject: # what the page is for, in one sentence
memory: # the one image or moment a visitor should remember
reference: # a real site, film, print piece, or place, plus what to take from it
register: # the voice of the copy, e.g. "late-night radio host, warm and dry"
type:
  display: # family, weight, tracking, line height, largest size
  body: # family, weight, size, line height
  label: # family, case, tracking
palette: # 3-6 hex values with roles: ground, text, accent, secondary accent
texture: # grain, noise, paper, halftone, or none, with strength
atmosphere: # gradient field, grain, or WebGL behind content; never in place of content
imagery: # existing asset per slot: source URL/path, crop, focal point, and role; name any missing asset
asset_creation: # none by default; only intentionally graphical/vector assets, never generated photos/video/realistic renders
response: # what answers the pointer (links, cards, tabs, media frames) and how fast; 100-320ms states, 400-500ms reveals
surface_detail: # edge-fade masks, rounded media clips, hairlines between panels
motion_density: # entrance sequence count, scroll scenes, ambient loops
length: # screens planned and the sequence each idea gets (setup, product, proof)
signature: # the one unusual move this page makes that a template would not
constraints: # performance budget, accessibility floor, brand rules
consumer_reference: not_applicable
consumer_reference_reason: A direction brief selects no consumer reference record.
```

### Choosing Values Fast

These defaults come from [Measured Expression Benchmarks](measured-benchmarks.md), which compared 49 live homepages with StyleGallery studies built from the older advice. The studies read as empty and loud; the originals read as full and calm.

- Select existing assets before writing the page: reference-site media, supplied files, then project assets. Reuse photographs, video, and product renders instead of making replacements. New asset creation is limited to intentional graphics/vectors: icons, diagrams, patterns, abstract graphics, and vector illustrations. SVG, canvas, WebGL, or an image generator is not a workaround for recreating a photographic scene.
- Put existing imagery, an intentional vector graphic, or a live product surface on every screen. Implementing a working UI is page behavior, not permission to fabricate photographic product imagery. If an asset is missing, find an existing one or name the missing slot rather than filling it with a crude drawing. See [Image Weight](techniques/image-weight.md).
- Size display type from the page's job, not bigger than feels safe: the largest text is 3.5-5.5 times the body (measured median 56px over 14px), tracking 0em on Korean and system faces and about -0.02em on Latin grotesks, line height 1.1-1.2. Only a campaign or editorial hero goes to 6-7 times. See [Display Type Calibration](techniques/display-type-calibration.md).
- Pair one display face with one body face, plus a mono or small-caps label face only if the page needs it. Two families is the measured median; three is the ceiling.
- Make many things answer the pointer: every link, button, card, tab, and media frame gets a 100-320ms state change on `opacity`, `color`, `transform`, or `background-color` (measured median: 76 responsive elements per page). Reserve 400-500ms for reveals.
- Finish surfaces: edge-fade masks on anything that scrolls or bleeds, rounded clips on media, 1px hairlines between panels instead of soft shadows. See [Masks, Clips, And Hairlines](techniques/surface-detail.md).
- Pace the page at 6-10 screens and give each idea a sequence (setup, product, proof) instead of one beat. Change the background band about every three screens, not every screen.
- Pick a ground that is not pure black or pure white (`#07070a`, `#f4efe6`). Use one hot accent and at most one cool counter-accent.
- Spend the big moments in a few places: one hero moment, one signature scroll scene, one closing moment. Everywhere else stays calm but never empty: quiet sections still carry imagery and respond to the pointer.

## Opinionated Guidance

Write the `signature` field first. If you cannot name one move a template would not make, the page will read as a template no matter how polished it is.

## Platform-Specific Guidance

Variable and web fonts may fail to load. Name a system fallback with similar width so layout does not jump, and check the page with fonts blocked.

## Unsupported Absolutes

No palette, type pairing, or density is correct for every subject. A filled brief is a plan, not evidence that the page works.

## Verification Contract

The brief is ready when every field has a concrete value, `imagery` names a slot for every screen, and `signature` names a specific move. The built page is verified by `node scripts/check-showcase.mjs --work <slug> --richness error`, which fails an empty screen, too few responsive elements, slow link transitions, and missing masks or hairlines, and by reviewing its screenshots against `memory` and `signature`.

## Source, License, And Attribution

Locally authored template. No upstream source.

## IA Navigation

Parent: [Expression](index.md).
Next: [Nocturne Editorial Direction](directions/nocturne-editorial.md).
