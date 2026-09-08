---
type: Verification Record
title: Interaction Lab Local Browser Verification
description: Source-bound observations from a real Mac browser, with explicit mock-service and native-device limitations.
---

# Interaction Lab Local Browser Verification

The [Interaction Lab](README.md) completed 84 action/observation checkpoints on 2026-09-08 with all expected-state comparisons passing and zero observed JavaScript runtime errors. [report.json](evidence/report.json) contains the ordered actions, expected and actual states, snapshots, runtime identity, and capture dimensions. This is a local browser observation of an uncommitted example, not a canonical consumer-reference capture or independent attestation.

The final run finished at `2026-09-08T02:07:11.475Z` (`11:07:11` KST). The [artifact manifest](evidence/manifest.json) records the host inventory and the hashes and byte lengths of the report, source snapshot, and five screenshots.

## Environment And Source

| Field | Observed value |
| --- | --- |
| Physical host | Local Mac, hardware identifier `Mac16,8`, `arm64` |
| Host OS | macOS `26.5.1`, build `25F80`, read with `sw_vers` |
| Browser | Aside-controlled Chrome `151.0.7922.171`, JavaScript `15.1.206.21` |
| Tooling | Aside CLI `1.26.906.1630`; repository-required `aside-browser` skill |
| Input | Automated keyboard and pointer events in the real browser tab |
| Initial surface | Native desktop browser viewport; exact observed width is in the first report checkpoint |
| Size fixtures | 320, 375, 768, 1024, 1440 CSS pixels in the same desktop browser |
| Preferences | Tab-scoped reduced-motion media override, changed during an active reward reveal and before entry |
| Data | In-memory mock responses, no external service or persistence |
| Source | [sources.json](evidence/sources.json): base Git revision plus SHA-256/byte length for HTML, CSS, application, and QA source |

The browser's reduced User-Agent string reports Intel/macOS 10.15.7; that is not the hardware/OS inventory above. Small viewport fixtures do not turn this run into an iPhone or Android device test. Media emulation verifies the web preference handler, not the operating system's settings UI.

## Results

| Behavior | Actual observation |
| --- | --- |
| Draft and persistence separation | A completed while draft B remained editable and unsaved; failure retained B; retry persisted B; invalid empty input focused its error field |
| Search identity | B results survived a late A response; empty results removed the selected detail; failure exposed a recovery status |
| Detail navigation | Query, selection, and logical focus survived all five sizes; parent return focused the previous result; browser forward restored detail |
| Nested modality | Tab and reverse Tab stayed in the upper dialog; one Escape closed one layer; final dismissal restored the invoker |
| Equipment lifetime | A request completed after both views closed; reopening preserved B selection and showed A equipped; a failed B request kept A |
| Repeated opening | Three additional open/close cycles retained correct selection and left no open dialog |
| Reward and preference | Exactly one local grant before reveal; skip preserved the count; reduced-motion changes completed the reveal and left zero running animations |
| Native controls | Enter and Space toggled disclosure; arrow-key range input committed; pointer preview cancelled with Escape and remained cancelled after release |
| Content | Unbroken 300-character Korean values produced no document-level horizontal overflow at all five widths; RTL at 320 also passed |

## Issue Found And Fixed

The initial nested dialog allowed Tab from its final button to leave the dialog. The example now handles the tab boundary in the currently active dialog, skips disabled and unchecked radio controls, and wraps forward/reverse traversal. The final run includes both directions and the pending state, where only the dismissal command remains available.

Tooling adjustments preserve actual browser actions: Space uses an explicit CDP key code; same-document Forward uses the browser history entry because Aside's generic navigation waiter expects a document load; the long-label response control is checked by exact DOM text before activation. Screenshots use explicit observed viewport bounds and record their PNG dimensions. Unbounded captures repeated the backing surface after a size override and were rejected; they are not the retained evidence.

## Artifacts

- [Native desktop entry](evidence/native-desktop.png)
- [Selected detail at 375 CSS pixels](evidence/detail-375.png)
- [Nested dialog and visible focus](evidence/nested-dialogs.png)
- [Long content, RTL, 320 CSS pixels](evidence/long-rtl-320.png)
- [Reduced-motion result at 320 CSS pixels](evidence/reduced-motion-320.png)

Raster images are viewport observations, not complete-page visual certification. The DOM report supplies states and relationships that a screenshot cannot show. The application source hashes were checked again against the report after capture.

## Not Run

Android hardware, iPhone/iPad hardware, Safari, Windows-native APIs, Unity/player builds, controller or touch input, VoiceOver/screen readers, haptics/audio, native predictive Back, safe-area hardware behavior, performance profiling, and real network/persistence operations were not run. No Android debugging bridge or Xcode device tools were available, and the host USB inventory listed no attached devices. Browser results cannot fill those evidence cells.

The fictional native-engine workflow and unimplemented recipes retain their existing `not_run` status. Domain lifecycle remains `experimental`; no consumer adoption or lifecycle transition is claimed. Existing immutable evidence was not recaptured or edited.

## README Compatibility Repair

The shared agent-native README changed in commit `d8bdf0bd5b5aec2fbc38e322a9ac7a1d31fd1332` to add Material v2 guidance and correct the domain count. The v1 compatibility test still required its earlier digest. The test now separately pins that reviewed documentation revision to `6e59c913b175039819143b53078817630e3664db1c0342f89545038d0e53a52e`.

All 21 original core/source digests, six CLI byte-output goldens, registry records, schemas, and runtime interfaces retain their previous values. `npm run test:agent-native` passed after the repair. The README content itself was not rewritten to satisfy the old hash.

Implementation handoff: `consumer_reference: consumer-reference/agent-native/registry.json`. No design-terminology term/relation records are used by this runtime implementation.

Consumer reference: declared
Consumer reference record: consumer-reference/agent-native/registry.json

## Navigation

Parent: [Interaction Lab](README.md).
Next: [Game UI verification workflow](../../game-ui/verification-workflow.md).
