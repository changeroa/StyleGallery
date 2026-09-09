---
type: Verification Record
title: Full-Viewport Scene And Persistent Device Verification
description: Source-bound local browser observations for fixed-page navigation, reading recovery, and a persistent scroll-story subject.
---

# Full-Viewport Scene And Persistent Device Verification

Observed on 2026-09-09 through Aside-controlled Chrome 151 on macOS. These are example-local observations, not canonical consumer-reference evidence or domain promotion. [Source hashes](evidence/sources.json) bind the current example and changed Flow runtime to this run. The record belongs to the commit that introduces these evidence files; its parent is `30141c0`.

## Observed Results

| Case | Result |
| --- | --- |
| 320×568, 375×812, 768×900, 1024×768, 1440×900 | 46 explicit browser assertions passed at each viewport: chapter sequence, fixed document, semantic availability, persistent device identity, boundaries, focus recovery, input exemptions, long copy, pointer cancellation, reading escape, and teardown. These checks dispatch synthetic DOM events. |
| Browser input at 375×812 | CDP-injected touch swipe selected the next chapter; a browser Home key selected the first; CDP wheel selected the next. Document `scrollY` remained zero. These are injected browser inputs, not physical touch/trackpad observations. |
| Direct entry and history | `#instantly` selected chapter 2; Back and Forward restored chapter identity and the current status announcement. The browser helper timed out waiting for a full navigation on an earlier same-document Back; the fresh snapshot confirmed successful state restoration. The final trace uses browser history directly. |
| Reduced motion changed during use | The selected chapter was retained, scene view remained available, and the device's computed transition duration became `0s`. |
| Low window | 1440×500 selected normal reading and exposed all chapters. |
| Explicit reading URL | `?reading=1#instantly` retained normal document reading and all chapters. |
| No script | With execution disabled before reload, all chapter copy, chapter anchors, CTA links, and the gallery exit remained available. |
| Flow persistent subject | At progress 0, 0.25, 0.5, 0.75, 1, 0.5, 0, the same device node remained mounted. Measured progress differed by less than 0.002; stage top stayed at 64px. Screen weights and device transforms matched on reversal. |

## Reproduce

Serve `examples/` as described in [README](README.md). In scene mode run `await sceneDemo.runChecks()` from browser developer tools. Save the returned JSON; reload afterward because the suite deliberately tests teardown. [qa.mjs](qa.mjs) is the retained browser protocol. Run the six deterministic input/timeline/loader tests with the command in the README; the separate Story examples CI job runs these tests on Node 22.

## Evidence And Limits

- [Viewport assertions](evidence/scene-checks-matrix.json)
- [Browser input and navigation trace](evidence/scene-input-navigation.json)
- [Fallback observations](evidence/scene-fallbacks.json)
- [No-script accessibility snapshot](evidence/scene-no-script-ax.json)
- [Flow persistent-device trace](evidence/flow-persistent-device.json)
- [Desktop scene](evidence/scene-desktop.png), [narrow scene](evidence/scene-mobile.png), [Flow start](evidence/flow-persistent-start.png), [Flow end](evidence/flow-persistent-end.png)

No connected iPhone/Android was found in the Mac's USB inventory; ADB and Xcode device tooling were unavailable. Physical devices, physical trackpad momentum, iOS Safari, Android, VoiceOver/screen-reader speech, browser chrome resizing, and measured rendering frame rate remain `not_run`. The screenshots show endpoints, not film-quality continuity. The injected pointer and reduced-motion checks establish local event/state behavior, not user comfort or universal browser support.

Implementation handoff: `consumer_reference: not_applicable` because these standalone product examples select no consumer profile or canonical evidence record. No design-terminology records are used. Earlier [Scroll Story evidence](../scroll-story/verification.md) remains bound to its original commit and has not been overwritten.
