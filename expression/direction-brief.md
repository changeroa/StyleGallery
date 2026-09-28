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
atmosphere: # gradient field, WebGL, photography, illustration, or none
motion_density: # entrance sequence count, scroll scenes, ambient loops
signature: # the one unusual move this page makes that a template would not
constraints: # performance budget, accessibility floor, brand rules
consumer_reference: not_applicable
consumer_reference_reason: A direction brief selects no consumer reference record.
```

### Choosing Values Fast

- Pair one expressive display face with one quiet body face and one mono or small-caps label face. Three families is the ceiling.
- Set display type larger and tighter than feels safe: `clamp()` from about 3rem at 320px up to 9-13rem at 1440px, tracking around -0.03em, line height 0.85-0.95.
- Pick a ground that is not pure black or pure white (`#07070a`, `#f4efe6`). Use one hot accent and at most one cool counter-accent.
- Spend expression in a few places: one hero moment, one signature scroll scene, one closing moment. Leave the rest quiet so those land.

## Opinionated Guidance

Write the `signature` field first. If you cannot name one move a template would not make, the page will read as a template no matter how polished it is.

## Platform-Specific Guidance

Variable and web fonts may fail to load. Name a system fallback with similar width so layout does not jump, and check the page with fonts blocked.

## Unsupported Absolutes

No palette, type pairing, or density is correct for every subject. A filled brief is a plan, not evidence that the page works.

## Verification Contract

The brief is ready when every field has a concrete value and `signature` names a specific move. The built page is verified by `node scripts/check-showcase.mjs --work <slug>` and by reviewing its screenshots against `memory` and `signature`.

## Source, License, And Attribution

Locally authored template. No upstream source.

## IA Navigation

Parent: [Expression](index.md).
Next: [Nocturne Editorial Direction](directions/nocturne-editorial.md).
