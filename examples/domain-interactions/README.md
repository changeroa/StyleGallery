---
type: Worked Example
title: Domain Interaction Lab
description: Executable browser examples with local, source-bound observations for state, interruption, recovery, and keyboard behavior.
---

# Domain Interaction Lab

This standalone browser example applies the [component contract](../../design-engineering/component-contract.md), [Motion recipes](../../motion/interaction-recipes.md), [Game UI verification](../../game-ui/verification-workflow.md), and [platform target matrix](../../platform-guides/compatibility-matrix.md). Product implementation belongs to Design Engineering; the inventory and reward scenarios are web adaptations of Game UI tasks. No native engine project is implied.

The lab has five sections: explicit save, search/detail, nested inventory dialogs, reward reveal, and disclosure/range input. Responses are manually resolved in the interface so failures and out-of-order completion are reproducible. Data exists only in memory and resets on reload.

## Run

From the repository root, start a loopback-only static server on an available port:

```sh
python3 -m http.server 0 --bind 127.0.0.1 --directory .
```

Open `/examples/domain-interactions/` on the printed address. No build, service account, dependency installation, or real purchase is required.

## Repeat Browser Verification

Follow the repository's `aside-browser` skill, including `aside guide` and `aside guide repl`. Start `aside repl`, inspect existing tabs, and open this example if it is not already open. Read `snapshot(page)` before running [the QA source](qa.aside.js).

Inside the REPL, with the interaction lab selected:

```js
const qaBase = page.url().replace(/[?#].*$/, "");
const qaSource = await (await fetch(qaBase + "qa.aside.js")).text();
await eval("(async () => {" + qaSource + "\n})()");
```

This executes the repository-authored QA source in Aside's browser session. It uses visible controls and keyboard/pointer events, reads a fresh snapshot after each action, and records expected and actual DOM states. Only the RTL content fixture changes document direction directly. Viewport and media-preference overrides use the tab's Aside CDP connection and are cleared on completion. The report and viewport screenshots are saved in the printed Aside `artifacts/domain-interactions-*` directory.

Before recording a new run after a source change, update [sources.json](evidence/sources.json) with the SHA-256 and byte length of the four named files. It is a working-tree source snapshot, not an immutable Git capture receipt. Keep the browser report with the exact source version it tested; do not silently relabel old observations after changing code.

## Acceptance Coverage

| Concern | Executed scenario |
| --- | --- |
| Save state | Submit A, edit B, ignore duplicate Enter, confirm A, fail/retry B, validate empty input |
| Search identity | Submit A then B, resolve B first, ignore late A, remove selected result, recover from empty/failure |
| Navigation | Select detail, resize, return to the invoking result, browser history forward |
| Modal ownership | One Escape closes one layer, Tab/Shift+Tab stay in the top dialog, repeated open/close restores focus |
| Delayed equipment | Request A, select B, close the view, resolve A, reopen with B selected and A equipped; failure retains equipment |
| Reward lifecycle | Grant once before reveal, skip without another grant, switch reduced motion during reveal, start with reduced motion |
| Native controls | Enter/Space disclosure, arrow-key range input, pointer preview followed by Escape and release |
| Content and surface | 320/375/768/1024/1440 CSS-pixel widths, 300-character unbroken Korean content, RTL at 320 |

## Evidence Boundary

[Verification notes](verification.md) identify the observed runtime, results, fixes, artifacts, and missing coverage. These are local observations of this example. Mock response controls do not prove a backend, real persistence, commerce, network cancellation, or game-engine teardown. Automated keyboard and pointer events do not prove manual human usability or assistive-technology announcements.

The smaller viewports run inside the Mac browser; they are not Android/iPhone hardware tests. The existing immutable consumer-reference evidence, lifecycle records, v1 trust records, and domain promotion state remain separate. Example code and artifacts are excluded from material admission and the npm package.

## Implementation Handoff

- `consumer_reference: consumer-reference/agent-native/registry.json`
- Owning domain: Design Engineering product example, with explicit Motion and Game UI adaptations and Platform Guides verification axes.
- Semantics: native forms, labels, buttons, details/summary, range/radio inputs, and dialog elements.
- Spatial owner: example-local CSS; normal document scroll, modal overflow owned by the open dialog.
- Constraints: `65rem` content maximum, `40rem` list/detail change point, intrinsic wrapping, `90dvh` modal maximum.
- Product presentation: local colors, focus outline, and optional opacity feedback; no new reusable Layout pattern or visual defaults.
- Source identity: individual file hashes in `evidence/sources.json`; uncommitted working tree explicitly declared.
- Terminology records: no design-terminology term/relation records are used by this implementation.

## Navigation

Parent: [Design Engineering worked examples](../../design-engineering/worked-examples.md).
Next: [Verification notes](verification.md).
