---
type: Domain Guide
title: Observed Choreography Transcription
description: Transcribe an observed scroll choreography into Scene Composition Contract vocabulary without copying assets or claiming implementation knowledge.
domain: motion
lifecycle: experimental
provenance_kind: local
---

# Observed Choreography Transcription

Primary role: observed scroll-choreography transcription workflow.

## Repository Boundary

This workflow turns an externally observed scroll-driven presentation into a transcription record written in the [Scroll-Driven Story](interaction-recipes.md#scroll-driven-story) vocabulary: `start`, `distance`, `scene_ranges`, progress-derived state, and static path. It exists so that a reimplementation study, a review, or an automated capture pipeline can hand a builder one document instead of raw pixels.

It does not authorize copying an observed site's assets, copy, code, or brand into this repository or into a study; it does not add motion or decorative properties to reusable Layout pattern CSS; and a transcription record is an observation of an unaffiliated external artifact, not evidence about this repository's own examples. The consuming study owns its own imagery, copy, and visual values.

## Reusable Method

### Capture Protocol

Record the capture identity before transcribing: URL, capture date, viewport, tool, wait strategy, and total scroll height. Capture in two passes:

1. A coarse scene pass segments the page into scene y-ranges using layout landmarks (full-width blocks) and per-scene representative frames.
2. A dense timeline pass scrubs at a fixed step (small enough that at least three frames land inside the shortest choreography of interest) and records a frame-difference score between consecutive frames.

Difference-score plateaus near zero indicate static regions; sustained non-zero runs indicate scrubbed choreography; isolated spikes indicate discrete swaps. Keep every frame file; the transcription must cite frames by file name.

### Transcription Record

For each observed scene, write:

- **Scene identity**: name, document y-range, one-sentence job.
- **Pin observation**: whether a stage visually holds position while the document advances (`start` and `distance` in document pixels), or the scene scrolls through normally (`distance` not applicable).
- **Scene ranges**: sub-segments as fractions of scene progress, each with the observed state it presents.
- **Keyframe observations**: for each boundary between sub-segments, the property-level change observed across adjacent frames — content swap, translation, scale, opacity, counter/number roll, media frame advance — stated as direction and rough magnitude, not invented exact values.
- **Static path**: what a non-animated reading order of the same content would present, so the consumer can build the reduced-motion and no-script alternative required by the [Scroll-Driven Story](interaction-recipes.md#scroll-driven-story) contract.
- **Asset inventory**: the kind of media carrying the effect (photograph, video, rendered UI, image sequence) and its role. Kinds only; the record never embeds or links a copy of the asset for reuse.
- **Frame evidence**: the frame files supporting each claim.

Mark anything the captured frames cannot establish as `not observable in captured frames` instead of interpolating a guess. A claim without a citable frame is a gap, not a fact.

### Handoff

A transcription record travels with the capture manifest and difference curve. A consumer maps scene ranges onto the [Scene Composition Contract](interaction-recipes.md#scene-composition-contract): document scroll and sticky geometry stay with Layout responsibilities, progress mapping and teardown with Motion, and all visual values with the consuming product.

## Opinionated Guidance

Transcribe jobs and relationships, not pixel values; a reimplementation that inherits observed exact timings inherits unverified choices. Derive every described state from scene progress so reversal and mid-entry stay well defined in the eventual build. Sampling density bounds what a record may claim: a 500px step cannot support statements about effects shorter than 500px of scroll.

## Platform-Specific Guidance

Record the capture browser, OS, headless mode, and device scale separately from the observed site's behavior; headless rendering, missing fonts, and disabled video autoplay can all change what frames show. For client-rendered pages, note that DOM text accumulates as sections mount, so per-scene text dumps overstate what is visible; treat frames as the primary evidence for visibility.

## Unsupported Absolutes

A transcription proves what frames show at sampled positions, never how the original is implemented — no easing curve, frame rate, library, or performance claim survives from frame differences alone. There is no universal scrub step, difference threshold, or scene count; each capture declares its own. Frame similarity in one direction does not prove reversibility.

## Verification Contract

A transcription record is usable when every scene declares a y-range and pin observation, every motion claim cites frame files, every scene has a static path, and every unknown is marked `not observable in captured frames`. Reversibility claims require frames captured in both scroll directions; otherwise mark reversal untested. The record is stale when the source site changes; re-verification means a fresh capture compared against the recorded capture date, never editing old observations in place.

## Source, License, And Attribution

Locally authored workflow, generalized from an internal capture-and-reimplementation study of an external homepage on 2026-09-10. Transcription records describe unaffiliated external sites; they carry the capture identity for provenance and reproduce no external assets, copy, or code.

## IA Navigation

Parent: [Motion](index.md).
Next: [Scroll-Driven Story](interaction-recipes.md#scroll-driven-story).
