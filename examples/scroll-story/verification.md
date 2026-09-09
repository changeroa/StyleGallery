---
type: Verification Record
title: Scroll Story Browser Verification
description: Local execution evidence for continuous progress, static reading, native CSS scrubbing, and media lifecycle boundaries.
---

# Scroll Story Browser Verification

Observed on 2026-09-09 through the repository's Aside browser workflow in Chrome 151 on macOS. The browser user agent and source hashes are retained in the evidence files. These are example-local observations, not canonical consumer-reference captures or domain promotion evidence.

## Observed Results

This record and its source hashes describe commit `8230b64a0fe737a16727d894b3b28d2700473eba` (merged by `30141c0`). Later selector links and Flow's persistent-device treatment are outside this historical run. See [follow-up verification](../scene-navigation/verification.md) for those changes; these existing artifacts have not been rebound to new source bytes.

| Case | Observation |
| --- | --- |
| Headphones, 1440×900 | All 41 browser assertions passed: progress landmarks and boundaries, forward/reverse, pinned stage, one accessible chapter, idle updates, long copy fallback, RTL, and width containment. |
| Flow, 1440×900 | Nine forward/reverse/boundary samples matched requested progress within 0.002; the stage remained 64px below the fixed header. |
| Viewport matrix | 320×800, 375×812, and 768×900 used static reading; 1024×900 and 1440×900 used animation; 1440×500 used static reading. No horizontal document overflow in the lab. |
| Middle reload | Progress 0.4999 and scroll position 2006.5 were restored after reload in the lab. |
| Preference change | Switching reduced motion on during a scene exposed all chapters, removed hidden chapter attributes, and selected the static path. |
| Keyboard reading mode | Enter on the reading-mode control selected static reading, changed aria-pressed to true, and retained focus on the control. |
| No script | With script execution disabled before reload, the three semantic chapters and skip link remained available. |
| Native CSS | Start, midpoint, and end computed transforms changed with scroll; reversing to the same points produced identical recorded matrices. |
| Blocked image request | Blocking headphones frame 06 in Chrome selected fallback; all three images retained a decoded 480px last-good frame. |
| Runtime | No uncaught page errors were observed in the monitored lab interactions. |

## Deterministic Media Tests

`node --test examples/scroll-story/test-contract.mjs` passes three tests covering scene landmarks, clamping/zero-distance, reverse equivalence across 101 samples, stale decode rejection, missing-frame fallback, recovery to a valid frame, at-most-three cached frames, static poster restoration, and disposal during a pending decode. The asynchronous lifecycle test uses a controlled image decoder; it is not a network or rendering performance measurement.

## Artifacts And Limits

- [Lab browser assertions](evidence/lab-checks.json)
- [Flow progress samples](evidence/flow-checks.json)
- [Viewport observations](evidence/viewports.json)
- [Native CSS samples](evidence/css-checks.json)
- [No-script accessibility snapshot](evidence/no-script.txt)
- [Programmatic scroll timing](evidence/performance.json)
- [Headphones midpoint](evidence/story-middle.png)
- [Flow midpoint](evidence/flow-middle.png)
- [Mobile reading mode](evidence/story-mobile.png)
- [Source digests](evidence/sources.json)

A separate visible-tab trace used 60 programmatic rAF scroll steps forward and 60 back. The observed callback interval median was 8.3ms, p95 was 10.3ms, and maximum was 25.8ms; no long-task entries were delivered. The controller reported a 6ms maximum update and three cached images. These are one-run diagnostics, not a native-input/compositor benchmark.

The recorded maximum JavaScript update duration includes deliberate content-stress work. It does not measure compositor delivery or establish a frame-rate guarantee. Idle sampling checks for continuing work, not power consumption. Screenshots and frame samples do not establish perceptual comfort.

Not run: physical iOS/Android hardware, Safari/Firefox, native touch/trackpad gesture behavior, assistive-technology reading, production video seeking, photographic sequences, GPU/process memory measurement, or compositor frame-delivery traces. The native CSS unsupported-browser path is declared in feature-gated CSS but was not exercised on an unsupported browser. Both products are related examples authored in this repository; they do not establish independent adoption.

## Implementation Handoff

Consumer reference: not_applicable
Consumer reference reason: This example-local verification does not select a consumer-reference profile or canonical evidence record.

No design-terminology records were used.
