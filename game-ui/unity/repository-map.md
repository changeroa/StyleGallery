---
type: Domain Guide
title: Unity Repository Map
description: Public default-branch snapshot map for locating Unity UI system sources, examples, adjacent references, and historical material.
domain: game-ui
lifecycle: experimental
platform: Unity-Technologies public GitHub organization
platform_version: public and default-branch snapshot captured 2026-07-14T12:59:16Z
reviewed_on: 2026-07-14
---

# Unity Repository Map

Primary role: Unity public-source discovery and authority map.

## Repository Boundary

This locally authored map classifies the Unity-Technologies public organization snapshot captured at `2026-07-14T12:59:16Z`. GitHub organization metadata and fully paginated public-repository enumeration both returned 804 repositories. The pre-projection capture had SHA-256 `8291b471251053a8921651eb7c791d13a4794984b73670a51cdb1116deb49657`; the tracked classified [`data/unity-technologies-public-repositories.json`](data/unity-technologies-public-repositories.json) has SHA-256 `b1438e6e8d438bab3eff2ff02f5a10e9374fdfb89b0581ffb936a42920fa2e05` and records 59 archived repositories, 356 forks, and 4 templates.

The map is a discovery index. A repository's presence, name, archive flag, or push date does not make it a current UI-system source.

## Reusable Method

1. Enumerate every public repository through REST pagination and retain stable repository identity and snapshot time.
2. Record archive, fork, template, default branch, default-branch HEAD, README location, and tree-scan status.
3. Scan default-branch paths for UXML, USS, UI Toolkit/UIElements, uGUI/Canvas/EventSystem, IMGUI, HUD/menu, accessibility, localization, text, and input signals.
4. Counter-search descriptions and code paths so name-hidden candidates remain discoverable.
5. Assign every repository one relevance class and a disposition reason.
6. Deep-read only the authority subset, then pin each guidance claim to an exact revision and lifecycle context.

## Snapshot Classification

| UI relevance class | Repositories | Use |
| --- | ---: | --- |
| `primary-ui-source` | 8 | Unity UI system or explicit UI/example repository; refine lifecycle before use. |
| `ui-adjacent-reference` | 5 | Input, reference source, safe-area, calibration, or vector-graphics evidence that constrains a UI review. |
| `runtime-ui-observation` | 23 | Runtime UXML/USS or game/product UI implementation whose repository purpose is broader than UI. |
| `legacy-ui-observation` | 72 | Multiple uGUI, HUD, menu, or Canvas observations in repositories owned for another purpose. |
| `editor-or-incidental-uitoolkit` | 21 | UI Toolkit appears in editor tooling, inspectors, tests, or incidental help surfaces. |
| `code-only-or-incidental-ui-signal` | 93 | Sparse or ambiguous UI-like paths do not justify reference status. |
| `historical-ui-source` | 1 | Archived UIWidgets source retained as a separate historical framework. |
| `excluded-misleading-name` | 1 | A UI-like repository name does not match a general UI source after inspection. |
| `excluded-fork-or-vendor-ui` | 90 | Forked, mirrored, or vendored UI content is not automatically Unity-authored evidence. |
| `no-ui-signal` | 490 | No UI signal was located in metadata, topics, default-branch path scan, or counter-search. |

Total: 804 repositories.

## Authority And Lifecycle Disposition

| Disposition | Pinned examples | How to use them |
| --- | --- | --- |
| Current primary system/reference | uGUI's Unity 6000.3 [`Graphic.cs`](https://github.com/Unity-Technologies/uGUI/blob/9edb4420267b6652090ece4c28c38bd98746a68e/com.unity.ugui/Runtime/UGUI/UI/Core/Graphic.cs), UnityCsReference 6000.3.19f1 [`Panel.cs`](https://github.com/Unity-Technologies/UnityCsReference/blob/79f16640303119112ca5caed4d71c607d0dff6fb/Modules/UIElements/Core/Panel.cs), and InputSystem [`InputSystemUIInputModule.cs`](https://github.com/Unity-Technologies/InputSystem/blob/8a57d62081cf3546b46444e17223e0121a3568b2/Packages/com.unity.inputsystem/InputSystem/Runtime/Plugins/UI/InputSystemUIInputModule.cs) | Use version-pinned component and integration architecture. UnityCsReference remains reference source rather than a package mirror. |
| Current explicit examples | [BagelGame README](https://github.com/Unity-Technologies/BagelGame/blob/5d0348bfa013f3c76299dd582c90a7549f66abce/README.md), [UI Toolkit manual code examples README](https://github.com/Unity-Technologies/ui-toolkit-manual-code-examples/blob/7ed6e7af9fc8a8f83facea818f47928d2e03a30f/README.md), and [accessibility sample README](https://github.com/Unity-Technologies/a11y-public-sample/blob/ec14cfcb8c10bafab83ea02cd17759d77b225fae/README.md) | BagelGame is a Unity 6.3 full-game UI Toolkit example; the manual repository contains documentation snippets; the accessibility sample is a Unity 2023.3 uGUI example. Keep each example's version and purpose attached. |
| Adjacent and current observation examples | [EntityComponentSystemSamples README](https://github.com/Unity-Technologies/EntityComponentSystemSamples/blob/6786a741ee1f118ed14cecfa02beae8e926937b0/README.md), [XR Interaction Toolkit Examples README](https://github.com/Unity-Technologies/XR-Interaction-Toolkit-Examples/blob/881f7e197c7b0958621ebd1a05f249bbe254d36f/README.md), and [Unity Industry Viewer Template README](https://github.com/Unity-Technologies/unity-industry-viewer-template/blob/5d50da18f68b14c4dc15bcf3d535878cc2254497/README.md) | Use as implementation observations for their own product, ECS, XR, or industry-template context. They do not own the general UI-system contract. |
| Historical UI examples | [UIElementsExamples README](https://github.com/Unity-Technologies/UIElementsExamples/blob/e940d1c9dddfe99fd500c9f34f4801856ad37f18/README.md), [Unite Copenhagen 2019 demo README](https://github.com/Unity-Technologies/UIElementsUniteCPH2019RuntimeDemo/blob/fa4f2c70cf2d6127ab624cc11a2742260ca6ff20/README.md), [Unite LA turret demo README](https://github.com/Unity-Technologies/UIElementsUniteLATurretDemo/blob/1fce133fe3a3473d418066d8005c64340e9985d5/README.md), and [Unity Royale runtime demo README](https://github.com/Unity-Technologies/UIToolkitUnityRoyaleRuntimeDemo/blob/9b5006d2580101b4d08d59d03d7dadc697d75311/README.md) | Retain for UIElements/UI Toolkit technique lineage and their recorded Unity-era context. Unarchived status or a recent push does not revise their baseline. |
| Separate or excluded | Archived [UIWidgets README](https://github.com/Unity-Technologies/com.unity.uiwidgets/blob/0310984e947881eca6c2657f1a2fcaaa19329c22/README.md), [SimpleUIDemo README](https://github.com/Unity-Technologies/SimpleUIDemo/blob/c33907f1ffa0f8a30b46f958d3cf45e5da08b01c/README.md), and the 90 `excluded-fork-or-vendor-ui` rows | UIWidgets is a separate archived framework whose README points development elsewhere. SimpleUIDemo is a Project Tiny sample rather than a general UI reference. Fork and vendor content requires an independent provenance decision. |

## Completeness Limits

- The snapshot covers the public organization and each repository's observable default branch at capture time. It cannot observe private, deleted, transferred, or non-default-branch-only material.
- `gen-playerid-stats` and `repotest123` returned tree-fetch errors; both reported repository size zero, leaving no default-branch content to inspect.
- Recursive trees were truncated for Graphics, google-dawn, llvm-project, mono, and runtime. No absence claim relies on those truncated trees.
- Broad GitHub Code Search has rate and result ceilings. It was used to counter-check candidates, not as the enumeration mechanism.
- Path and metadata signals identify candidates; they do not prove compilation, rendered behavior, lifecycle correctness, or current support.

## Opinionated Guidance

- Start UI architecture research with the current primary sources, then use explicit examples for concrete version-scoped implementation evidence.
- Keep product samples, historical demos, separate frameworks, forks, mirrors, and incidental UI in distinct evidence lanes.
- Record repository owner, fork state, archive state, default-branch HEAD, README lifecycle statement, Unity/package version, authority class, and replacement path when one is named.
- Rebuild the inventory instead of editing counts by hand when the organization snapshot changes.

## Platform-Specific Guidance

- Use the Unity 6000.3 branch and package context when applying the uGUI source linked here.
- Use the UnityCsReference 6000.3.19f1 SHA for this page's UI Toolkit architecture boundary, not the newer default-branch head captured by the inventory.
- Use InputSystem only for the input and UI integration behavior visible at its pinned SHA.
- Preserve each sample's recorded Unity version and purpose in any downstream Game UI reference record.

## Unsupported Absolutes

- An unarchived repository is not proof of current guidance.
- A recent `pushed_at` value is not proof that a sample's Unity baseline changed.
- Repository ownership does not prove that every vendored or forked file is Unity-authored.
- A matching path or term does not prove that the repository is a UI-system source.
- This snapshot does not establish private or deleted repository history.

## Verification Contract

Before citing a repository, resolve the exact default-branch or release SHA, read its lifecycle statement and version files, inspect the relevant source path, and assign one of the dispositions above. For a refreshed map, repeat public pagination, verify unique ids and full names, recompute archive/fork/template totals and all ten class totals, record tree exceptions, and publish the new inventory hash and capture timestamp together.

## Source, License, And Attribution

- Inventory basis: public GitHub organization metadata, fully paginated public repository metadata, default-branch tree scans, and targeted counter-search captured on `2026-07-14T12:59:16Z`.
- Inventory identity: 804 classified rows; pre-projection SHA-256 `8291b471251053a8921651eb7c791d13a4794984b73670a51cdb1116deb49657`; tracked JSON SHA-256 `b1438e6e8d438bab3eff2ff02f5a10e9374fdfb89b0581ffb936a42920fa2e05`; 59 archived repositories, 356 forks, and 4 templates.
- Repository licenses and reuse terms differ. Follow the pinned repository's own license before copying code or assets.
- Reuse form: locally authored discovery and authority map; repository metadata and links are evidence references, not imported implementation guidance.

## IA Navigation

Parent: [Game UI](../index.md).
Next: [Unity Organization Compressed Wiki](org-wiki.md).
