---
type: Domain Guide
title: Unity UI Architecture
description: Unity-specific mapping from engine-neutral game UI hierarchy to Scenes, Canvas layers, prefabs, runtime instances, and motion ownership.
domain: game-ui
lifecycle: experimental
source_repository: https://github.com/annulusgames/UGUIAnimationSamples
source_path: README.md
source_revision: 343c8110e5683be209cc01ccb4cb986175e61643
platform: Unity uGUI and legacy Unity UI stacks
platform_version: Unity 2022.3.7f1 sample evidence; Unity 6.3 LTS and uGUI 2.0 guidance
reviewed_on: 2026-07-14
---

# Unity UI Architecture

Primary role: Unity hierarchy and implementation guide.

## Repository Boundary

This page maps the engine-neutral [Game UI Screen Hierarchy](../screen-hierarchy.md) to Unity concepts. It does not define game UI classification, require one universal Scene or Canvas structure, or treat a sample repository as a complete production architecture.

## Version Boundary

Two evidence contexts are intentionally separate:

- **Pinned sample evidence:** the UGUI Animation Samples revision `343c8110e5683be209cc01ccb4cb986175e61643` records Unity `2022.3.7f1`, uGUI `1.0.0`, and TextMesh Pro `3.0.7`. Claims about its files apply only to that immutable snapshot.
- **Current implementation guidance:** Unity Manual `6000.3` (Unity 6.3 LTS) and uGUI package `2.0` documentation were reviewed on 2026-07-14. Use those versioned documents for the concepts linked below, then verify the exact Unity and package versions recorded by each gallery entry.

The pinned project is evidence about a small animation sample, not proof that its serialized hierarchy, packages, or lifecycle choices are appropriate for production or current Unity versions.

## Reusable Method

Inspect a Unity UI reference in this order:

1. Record the Unity editor and UI package versions.
2. Identify the Scene or persistent bootstrap object that owns UI lifetime.
3. Locate root Canvas, UIDocument, or legacy NGUI panel boundaries.
4. Identify screen, HUD, modal, transient, and world-space hosts.
5. Trace prefab assets, nested prefabs, variants, scene instances, and runtime-created instances.
6. Record sorting, input routing, focus, scaling, animation, and teardown ownership.
7. Compare the rendered result with the engine-neutral Game UI record.

## Scene And Runtime Hierarchy

Unity's Hierarchy window shows GameObjects in the loaded Scene, including prefab instances. It does not by itself reveal asset ownership, runtime-created objects, persistent objects from another Scene, or the complete navigation policy.

```text
Bootstrap or Loaded Scene
├── Persistent UI Services
│   ├── EventSystem or Input Router
│   ├── Loading and Blocking Host
│   └── Notification Host
├── Screen-Space UI Root
│   ├── Screen Canvas or UIDocument
│   ├── HUD Canvas
│   ├── Modal Canvas
│   └── Transient Effects Canvas
└── World-Space UI Roots
    ├── Markers
    ├── Labels
    └── Interaction Prompts
```

Treat this as a responsibility map. A project may combine or split these roots according to rebuild cost, sorting, camera setup, lifetime, input, and team ownership.

## Prefab Hierarchy

| Unity concept | What it represents | Review question |
| --- | --- | --- |
| Prefab asset | Reusable serialized GameObject hierarchy | What stable responsibility does the asset own? |
| Prefab instance | Scene or runtime occurrence linked to an asset | Which properties are overrides, and who owns its lifetime? |
| Nested prefab | Prefab instance preserved inside another prefab | Does nesting express reuse or hide cross-component coupling? |
| Prefab variant | Asset inheriting from another prefab | Are differences intentional variants or accumulated overrides? |
| Unpacked object | Hierarchy no longer linked as an instance | Was the loss of inheritance deliberate and recorded? |
| Runtime instance | Object created during play | Where is it parented, initialized, focused, pooled, and destroyed? |

Use prefab boundaries for stable ownership and reuse. Do not create a prefab for every visual node, and do not let a large screen prefab silently own global routing, data services, or unrelated modal layers.

## Canvas And Layer Ownership

| Layer responsibility | Typical Unity realization | Evidence to capture |
| --- | --- | --- |
| Persistent services | DontDestroyOnLoad root or bootstrap Scene | Creation order, duplicate prevention, teardown policy |
| Active screen | Screen prefab under a screen host | Navigation boundary, initial focus, close behavior |
| HUD | Dedicated Canvas or stable subtree | Camera relationship, update ownership, visibility policy |
| Modal | Sorting layer with blocker and popup stack | Raycast blocking, stacking, cancellation, focus return |
| Transient feedback | Pooled toast, tooltip, reward, or effect host | Sorting, pooling, interruption, time source |
| World-linked UI | World Space Canvas or camera-projected element | Target loss, occlusion, distance, camera switching |

Canvas boundaries create ownership, sorting, and configuration decisions. Measure batching and rebuild behavior with the actual content and update pattern, and profile representative target-device workloads before attributing a performance benefit to nested Canvases.

## Component Hierarchy

A reusable Unity UI component commonly separates these roles:

```text
Component Prefab Root
├── Layout Root
├── Visual States
├── Content Bindings
├── Interaction Target
├── Optional Feedback Effects
└── Component Controller
```

- `RectTransform` hierarchy expresses layout and parenting, not business ownership by itself.
- `CanvasGroup` may coordinate visibility, interaction, and raycast blocking; verify all three properties.
- `Selectable` navigation and EventSystem state require keyboard and gamepad evidence, not only pointer behavior.
- ScrollRect structures should make viewport, content, scrollbar, cell reuse, and scroll ownership explicit.
- Text components require localization, fallback, wrapping, material, and dynamic-size evidence.

## Motion Ownership

The pinned snapshot contains four serialized Scene YAML files and scripts for hover, button, text, and toggle examples. The scripts use LitMotion; `TextAnimation.cs` and the pinned package files contain text evidence of UniTask use for button-click subscriptions. Text and YAML inspection does not prove compilation, rendering, or runtime behavior, although the YAML records Screen Space Overlay Canvas, Canvas Scaler, and EventSystem components.

Use the snapshot only as serialized evidence for component interaction motion. It does not establish a production Scene or prefab architecture, keyboard or gamepad coverage, responsive behavior, multi-Scene lifetime, successful runtime execution, or teardown policy. The inspected hover and button scripts contain `OnDestroy` cancellation paths; the two toggle scripts do not contain `OnDestroy`, but that absence alone is not proof of a leak or other runtime defect.

Record whether motion is owned by Animator, a tween library, Timeline, a custom update loop, or a mixed system. For every transition, identify the trigger, animated properties, time source, cancellation behavior, disabled-object behavior, completion callback, and final state. A parent screen transition must not leave child controls focused, interactive, or visually stale.

## Opinionated Guidance

- Separate Scene lifetime, layer lifetime, screen lifetime, and component lifetime.
- Prefer a small number of named layer hosts over ad hoc sorting overrides across unrelated prefabs.
- Keep screen prefabs focused on one primary player task; route global blockers and notifications through explicit hosts.
- Use nested prefabs and variants when inheritance is intentional and reviewable, not merely to reduce duplication at any cost.

## Platform-Specific Guidance

- Record whether the entry uses uGUI, UI Toolkit, legacy NGUI, or a mixed stack.
- For uGUI, capture Canvas render mode, Canvas Scaler settings, sorting configuration, Graphic Raycaster, EventSystem, and relevant input module.
- For UI Toolkit, capture Panel Settings, UIDocument ownership, visual tree source, style-sheet sources, focus behavior, and runtime document lifecycle.
- For legacy or mixed stacks, name the bridge points, camera and sorting relationships, input ownership, and migration limits.

## Unsupported Absolutes

- Do not require one Canvas for an entire application or one Canvas per screen.
- Do not equate Scene hierarchy order with render order, input priority, or lifetime ownership.
- Do not assume a prefab instance is unchanged; inspect overrides and variants.
- Do not call a UI responsive because Canvas Scaler is present.
- Do not infer runtime behavior from YAML, asset paths, or prefab names alone.
- Do not claim one animation system is faster or easier to maintain without measurements and project constraints.

## Verification Contract

Open the target Scene and Prefab Mode, then enter Play Mode. Capture the loaded Scene hierarchy, persistent objects, root UI hosts, prefab instance links and overrides, Canvas settings, sorting, EventSystem selection, and runtime-created objects. Exercise scene changes, repeated screen open and close, nested modals, focus return, safe areas, long localized text, paused or scaled time, and interrupted transitions.

Repository YAML and metadata can establish hierarchy leads, but rendered appearance and runtime ownership remain unverified until Editor and Play Mode evidence is attached.

## Source, License, And Attribution

- Public sample snapshot: [annulusgames/UGUIAnimationSamples at `343c8110e5683be209cc01ccb4cb986175e61643`](https://github.com/annulusgames/UGUIAnimationSamples/tree/343c8110e5683be209cc01ccb4cb986175e61643) and its pinned [README.md](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/README.md)
- Pinned version and dependency evidence: [ProjectVersion.txt](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/ProjectSettings/ProjectVersion.txt), [manifest.json](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Packages/manifest.json), and [packages-lock.json](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Packages/packages-lock.json)
- Pinned serialized Scene evidence: [1_Hover.unity](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Assets/Samples/1_Hover/1_Hover.unity), [2_Button.unity](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Assets/Samples/2_Button/2_Button.unity), [3_Text.unity](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Assets/Samples/3_Text/3_Text.unity), and [4_Toggle.unity](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Assets/Samples/4_Toggle/4_Toggle.unity)
- Pinned hover script evidence: [Hover1.cs](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Assets/Samples/1_Hover/Scripts/Hover1.cs), [Hover2.cs](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Assets/Samples/1_Hover/Scripts/Hover2.cs), [Hover3.cs](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Assets/Samples/1_Hover/Scripts/Hover3.cs), [Hover4.cs](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Assets/Samples/1_Hover/Scripts/Hover4.cs), [Hover5.cs](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Assets/Samples/1_Hover/Scripts/Hover5.cs), and [Hover6.cs](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Assets/Samples/1_Hover/Scripts/Hover6.cs)
- Pinned button, text, and toggle script evidence: [Button1.cs](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Assets/Samples/2_Button/Scripts/Button1.cs), [Button2.cs](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Assets/Samples/2_Button/Scripts/Button2.cs), [TextAnimation.cs](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Assets/Samples/3_Text/Scripts/TextAnimation.cs), [Toggle1.cs](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Assets/Samples/4_Toggle/Scripts/Toggle1.cs), and [Toggle2.cs](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/Assets/Samples/4_Toggle/Scripts/Toggle2.cs)
- Snapshot license: [The Unlicense](https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/LICENSE)
- Unity 6.3 LTS Manual: [UI system comparison](https://docs.unity3d.com/6000.3/Documentation/Manual/UI-system-compare.html), [Hierarchy window](https://docs.unity3d.com/6000.3/Documentation/Manual/Hierarchy.html), [Prefabs](https://docs.unity3d.com/6000.3/Documentation/Manual/Prefabs.html), [creating Prefabs](https://docs.unity3d.com/6000.3/Documentation/Manual/CreatingPrefabs.html), [nested Prefabs](https://docs.unity3d.com/6000.3/Documentation/Manual/NestedPrefabs.html), [Prefab variants](https://docs.unity3d.com/6000.3/Documentation/Manual/PrefabVariants.html), [unpacking Prefab instances](https://docs.unity3d.com/6000.3/Documentation/Manual/UnpackingPrefabInstances.html), [`Object.Instantiate`](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Object.Instantiate.html), and [`Object.DontDestroyOnLoad`](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Object.DontDestroyOnLoad.html)
- uGUI 2.0 Manual: [Canvas](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/UICanvas.html), [Rect Transform](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/class-RectTransform.html), [Canvas Group](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/class-CanvasGroup.html), [Canvas Scaler](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-CanvasScaler.html), [navigation options](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-SelectableNavigation.html), [Event System](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/EventSystem.html), [Graphic Raycaster](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-GraphicRaycaster.html), and [Scroll Rect](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-ScrollRect.html)
- Unity 6.3 LTS UI Toolkit Manual: [create a UI Document component](https://docs.unity3d.com/6000.3/Documentation/Manual/UIE-create-ui-document-component.html) and [focus order](https://docs.unity3d.com/6000.3/Documentation/Manual/UIE-focus-order.html)
- Reuse form: independent, project-neutral architecture and review method; no game assets or upstream implementation samples are reproduced.

## IA Navigation

Parent: [Game UI](../index.md).
Next: [Unity UI Systems](ui-systems.md).
