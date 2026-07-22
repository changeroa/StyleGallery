---
type: Domain Guide
title: Unity CLI Loop
description: Source-pinned workflow for inspecting and exercising Unity Game UI with unity-cli-loop while preserving UI-stack boundaries.
domain: game-ui
lifecycle: experimental
source_repository: https://github.com/hatayama/unity-cli-loop
source_path: README.md
source_revision: 61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0
platform: Unity 2022.3 or later as stated by the pinned source
platform_version: unity-cli-loop source snapshot 61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0
reviewed_on: 2026-07-14
---

# Unity CLI Loop

Primary role: Unity command-loop verification guide.

## Repository Boundary

This guide adapts the pinned unity-cli-loop command surface into a bounded Game UI inspection workflow. It documents what the audited source exposes for Editor control, hierarchy inspection, screenshots, uGUI interaction, input injection, and dynamic C# execution. No live Unity project was executed during this source review, so project compatibility and observed runtime results must be supplied by the user of the guide.

## Reusable Method

Use the loop in this order and preserve the evidence from each stage.

1. **Launch the matching Editor.** Run the launch workflow from the Unity project so its recorded Editor version is selected. The pinned README exposes `uloop launch`, project-path selection, build-target selection, and restart behavior in its [direct CLI section](https://github.com/hatayama/unity-cli-loop/blob/61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0/README.md#direct-cli-usage-advanced).
2. **Compile from a clean console.** Clear stale console entries when appropriate, run `compile`, wait for domain reload when the task requires it, then collect logs. Do not proceed to UI interaction while compile errors make the runtime state ambiguous.
3. **Inspect hierarchy and find objects.** Record the loaded Scene context, then use the hierarchy and GameObject search workflows to locate Transforms, `Canvas`, `EventSystem`, `UIDocument`, `UIRoot`, `UIPanel`, and other serialized components. The hierarchy service traverses GameObjects and Transforms in [`HierarchyService.cs`](https://github.com/hatayama/unity-cli-loop/blob/61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0/Packages/src/Editor/Core/CoreTools/HierarchyAnalyzer/HierarchyService.cs#L338-L379). A UI Toolkit VisualElement child is not a Transform child, so finding a `UIDocument` does not enumerate its runtime visual tree.
4. **Enter Play Mode when runtime evidence is required.** Use the Play Mode control workflow before Game View rendering capture and annotations, pointer simulation, Input System injection, input recording or replay, and inspection of runtime-created objects. Window screenshots may work outside Play Mode, but `CaptureMode: rendering` requires Play Mode at the pinned revision. Capture logs immediately after state changes.
5. **Capture the correct screenshot.** An Editor-window screenshot can show editor chrome outside Play Mode. In Play Mode, use the Game View rendering capture and its annotations when coordinates or runtime UI evidence are needed. Keep the pre-action image.
6. **Simulate through the stack-appropriate route.** Use the dedicated uGUI pointer workflow for EventSystem-handled UI. Use Input System mouse or keyboard injection only when the project actually reads that input path. For UI Toolkit or NGUI, combine rendering, component inspection, and narrowly scoped project code while keeping their distinct event routes explicit.
7. **Use dynamic code for targeted inspection or mutation.** Query project state, inspect `UIDocument.rootVisualElement`, or make bounded editor changes with `execute-dynamic-code`. Treat the result as evidence of the code that ran, not as proof that a player-input path was exercised.

   > [!IMPORTANT]
   > **Dynamic-code security boundary:** Use the lowest sufficient security level and keep **Restricted** unless the task specifically requires an operation it blocks. Restricted is defense-in-depth, not a trust boundary or a Unity-only sandbox. At the pinned revision, submitted code can read arbitrary files available to the Editor process, can create files and write through permitted stream APIs, can call Unity APIs and .NET standard libraries, and can invoke user-defined project assemblies; those assemblies may expose additional capabilities. Selected deletion, direct file-writing helpers, network, process, dynamic-loading, thread, and registry operations are blocked, and the compiled assembly is validated before and after load, but these checks do not make untrusted code safe. **Review and trust submitted code in both Restricted and FullAccess modes. FullAccess removes the Restricted-mode checks and should be exceptional.** Run AI-generated or otherwise untrusted dynamic code only inside a disposable, least-privilege VM or container with no host credentials, personal files, production tokens, or writable host mounts. Before either mode, review the submitted code and the target Unity project, including project assemblies it can call. Turn off `execute-dynamic-code` in the tool settings when it is unnecessary. The security level is persisted in `.uloop/settings.permissions.json`; although the upstream README permits optional team sharing, keep permission and related local configuration out of commits or published artifacts when it would reveal the project's security policy. See the pinned [security policy](https://github.com/hatayama/unity-cli-loop/blob/61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0/SECURITY.md#security-best-practices-for-users), [README security levels](https://github.com/hatayama/unity-cli-loop/blob/61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0/README.md#10-execute-dynamic-code---dynamic-c-code-execution), and [settings file guidance](https://github.com/hatayama/unity-cli-loop/blob/61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0/README.md#unity-cli-loop-files).
8. **Capture the result and save intentionally.** Collect the post-action screenshot and logs, compare the expected state, and explicitly save Scene or prefab changes when the task changed serialized content.

## Stack-Specific Interaction Boundary

| Stack | What the pinned workflow exposes | Required caution |
| --- | --- | --- |
| uGUI | Dedicated annotation scans uGUI `Selectable` and EventSystem handler targets. `simulate-mouse-ui` constructs pointer/drag events and requires Play Mode plus an EventSystem; ordinary Canvas interaction also needs the project's raycast path, commonly an active Graphic Raycaster. See [`UIElementAnnotator.cs`](https://github.com/hatayama/unity-cli-loop/blob/61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0/Packages/src/Editor/Utils/UIElementAnnotator.cs#L145-L215) and [`SimulateMouseUiTool.cs`](https://github.com/hatayama/unity-cli-loop/blob/61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0/Packages/src/Editor/Api/McpTools/SimulateMouseUi/SimulateMouseUiTool.cs#L31-L49). | Confirm the active EventSystem, input module, raycaster, blockers, selected object, and target Scene before interpreting a click or drag. |
| UI Toolkit | Rendering capture can show the Game View, and generic hierarchy inspection can find a `UIDocument` component. Dynamic C# can query its runtime `rootVisualElement`. | The VisualElement tree is Panel-owned rather than Transform-owned. At the pinned snapshot, the audited dedicated UI annotations and pointer tool are uGUI/EventSystem-oriented, so VisualElement lookup and manipulation remain project-specific work. |
| NGUI | Rendering capture and generic GameObject/component inspection can locate `UIRoot`, `UIPanel`, widgets, and `UICamera`. Dynamic C# can read or set component state. | NGUI's pinned [`UICamera`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/UI/UICamera.cs#L13-L43) performs its own raycasts and message dispatch with legacy `UnityEngine.Input` defaults. EventSystem dispatch or New Input System injection does not by itself demonstrate that UICamera processed the same pointer route. |

## Coordinate Contract

Use the `SimX` and `SimY` values returned by the rendering annotation directly with the matching simulation call. They are caller-facing Game View input coordinates with a top-left origin. Do not substitute Transform positions, RectTransform positions, or Editor-window pixels, and do not apply an extra Y-axis flip. Keep the screenshot resolution and Game View state with the coordinate evidence.

## Dynamic-Code Proof Boundary

The pinned dynamic-code skill describes a generic Editor execution mechanism and compilation/error reporting in [`uloop-execute-dynamic-code/SKILL.md`](https://github.com/hatayama/unity-cli-loop/blob/61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0/.agents/skills/uloop-execute-dynamic-code/SKILL.md#L22-L56). A direct property assignment or callback invocation can prove that the submitted code completed and that the inspected state changed. By itself it does not prove raycast blockers, hover and press transitions, drag thresholds, focus movement, cancellation, pointer capture, or the player's real input path.

## Opinionated Guidance

- Keep command outputs as separate evidence until the verification contract ties them to one claim.
- Prefer the stack's input route for behavior verification. Use direct code for inspection or bounded setup, and reinspect after entering Play Mode when runtime-created or persistent objects matter.

## Platform-Specific Guidance

- For uGUI, confirm the Canvas, Graphic Raycaster, EventSystem, active input module, handler, and current selection before simulation.
- For UI Toolkit, record the runtime Panel and focus owner. For NGUI, record its collider or raycast configuration and legacy-input delegates.
- In mixed projects, label each action with the input and hierarchy system it targets.

## Unsupported Absolutes

No single command result proves end-to-end interaction: a screenshot does not prove dispatch; finding a component does not enumerate its non-Transform descendants; direct code does not prove the player's input path or that serialized changes were saved. Tool availability also does not prove that a project's packages and configuration meet its prerequisites.

## Verification Contract

For a complete UI loop, retain launch/version evidence, clean compile output, relevant logs, pre-action hierarchy, pre-action rendering screenshot, exact `SimX`/`SimY` or input parameters, the stack-specific input route, post-action screenshot, post-action logs, focus or selected-state evidence, and save confirmation for serialized edits. Repeat the critical interaction after a fresh Play Mode entry when persistence or initialization is part of the claim.

## Source, License, And Attribution

- Adapted source: [hatayama/unity-cli-loop README at `61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0`](https://github.com/hatayama/unity-cli-loop/blob/61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0/README.md)
- Source license: [MIT](https://github.com/hatayama/unity-cli-loop/blob/61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0/LICENSE.md)
- Reuse form: independently authored Game UI verification workflow based on the pinned command documentation and implementation paths; no upstream command output or project asset is reproduced.
- Review boundary: source inspection only; no live Unity project was run for this page.

## IA Navigation

Parent: [Game UI](../index.md).
Next: [Unity Repository Map](repository-map.md).
