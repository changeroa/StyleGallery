---
type: Domain Guide
title: Unity UI Systems
description: Source-pinned comparison of uGUI, UI Toolkit, and NGUI ownership and responsibilities for Game UI review.
domain: game-ui
lifecycle: experimental
platform: Unity uGUI, UI Toolkit, and NGUI
platform_version: Unity 6000.3 source boundary for uGUI and UI Toolkit; NGUI pinned repository snapshot
reviewed_on: 2026-07-14
---

# Unity UI Systems

Primary role: Unity UI stack comparison guide.

## Repository Boundary

This locally authored comparison helps a Game UI reviewer identify which hierarchy, input, layout, and lifecycle evidence belongs to uGUI, UI Toolkit, or NGUI. It compares ownership and responsibilities at pinned sources; it does not prescribe one stack, treat the APIs as interchangeable, or project historical examples onto current Unity releases.

## Version Boundary

- uGUI observations use the Unity 6000.3 branch at `9edb4420267b6652090ece4c28c38bd98746a68e`.
- UI Toolkit observations use UnityCsReference `6000.3.19f1` at `79f16640303119112ca5caed4d71c607d0dff6fb`. UnityCsReference is reference source, not a package mirror.
- NGUI observations use `tasharen/ngui@9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2`. The repository describes a third-party system originating in 2011; treat this pinned snapshot separately from Unity-owned stacks and older NGUI distributions.

## Reusable Method

1. Record the Unity, package, and repository revisions used by the project.
2. Identify the tree owner: Canvas and GameObjects, Panel and VisualElements, or UIRoot/UIPanel and GameObjects.
3. Trace input and focus through the active stack-specific route.
4. Inspect layout, styling, motion, binding, and scrolling as separate responsibilities.
5. Record serialized assets, runtime-created state, and editor-only tooling.
6. Label every example as current system source, current example, adjacent observation, or historical material.

## System Comparison

| Axis | uGUI at the pinned Unity 6000.3 source | UI Toolkit at the pinned Unity 6000.3 reference source | NGUI at the pinned repository snapshot |
| --- | --- | --- | --- |
| Rendering | A `Graphic` registers with a Canvas, rebuilds geometry or material state, and sends mesh data through the Canvas rendering path. See [`Graphic.cs`](https://github.com/Unity-Technologies/uGUI/blob/9edb4420267b6652090ece4c28c38bd98746a68e/com.unity.ugui/Runtime/UGUI/UI/Core/Graphic.cs#L547-L716). | A Panel owns a VisualElement tree, while repaint processing consumes visual changes and renders the root tree. See [`Panel.cs`](https://github.com/Unity-Technologies/UnityCsReference/blob/79f16640303119112ca5caed4d71c607d0dff6fb/Modules/UIElements/Core/Panel.cs#L1238-L1259) and [`UIRRepaintUpdater.cs`](https://github.com/Unity-Technologies/UnityCsReference/blob/79f16640303119112ca5caed4d71c607d0dff6fb/Modules/UIElements/Core/Renderer/UIRRepaintUpdater.cs#L25-L148). | `UIRoot`, `UIPanel`, `UIWidget`, and `UIDrawCall` divide scaling, clipping, geometry, and draw-call work. See [`UIRoot.cs`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/UI/UIRoot.cs), [`UIPanel.cs`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/UI/UIPanel.cs), and [`UIDrawCall.cs`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/Internal/UIDrawCall.cs). |
| Hierarchy and ownership | GameObjects, `RectTransform`, Canvas, and component registration form the inspected hierarchy. Canvas membership is runtime state, not merely folder or prefab placement. | A `UIDocument` attaches a `VisualTreeAsset`-derived VisualElement tree to Panel Settings. VisualElement descendants are not Transform children. See [`UIDocument.cs`](https://github.com/Unity-Technologies/UnityCsReference/blob/79f16640303119112ca5caed4d71c607d0dff6fb/Modules/UIElements/Core/GameObjects/UIDocument.cs#L509-L539). | The Unity GameObject hierarchy carries `UIRoot`, `UIPanel`, `UIWidget`, control components, atlases, and fonts. Inspect component ownership as well as Transform nesting. See [`UIWidget.cs`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/Internal/UIWidget.cs). |
| Input and focus | `EventSystem` selects and runs an active `BaseInputModule`; New Input System projects can use `InputSystemUIInputModule`. See [`EventSystem.cs`](https://github.com/Unity-Technologies/uGUI/blob/9edb4420267b6652090ece4c28c38bd98746a68e/com.unity.ugui/Runtime/UGUI/EventSystem/EventSystem.cs#L158-L177) and [`InputSystemUIInputModule.cs`](https://github.com/Unity-Technologies/InputSystem/blob/8a57d62081cf3546b46444e17223e0121a3568b2/Packages/com.unity.inputsystem/InputSystem/Runtime/Plugins/UI/InputSystemUIInputModule.cs). | Focus and event dispatch are Panel-owned. The pinned `DefaultEventSystem` chooses the InputForUI provider path or a legacy path according to its context. See [`DefaultEventSystem.cs`](https://github.com/Unity-Technologies/UnityCsReference/blob/79f16640303119112ca5caed4d71c607d0dff6fb/Modules/UIElements/Core/GameObjects/DefaultEventSystem.cs#L67-L82). | `UICamera` performs its own 3D/2D raycasts and message dispatch. Its default delegates read legacy `UnityEngine.Input`; do not document an EventSystem or New Input System route unless the project supplies one. See [`UICamera.cs`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/UI/UICamera.cs#L13-L43). |
| Layout | `LayoutRebuilder`, layout groups, fitters, anchors, and RectTransform calculations operate across component passes. See [`LayoutRebuilder.cs`](https://github.com/Unity-Technologies/uGUI/blob/9edb4420267b6652090ece4c28c38bd98746a68e/com.unity.ugui/Runtime/UGUI/UI/Core/Layout/LayoutRebuilder.cs#L60-L89). | Flex-style layout nodes are calculated for the visual tree, with bounded validation passes. See [`VisualTreeLayoutUpdater.cs`](https://github.com/Unity-Technologies/UnityCsReference/blob/79f16640303119112ca5caed4d71c607d0dff6fb/Modules/UIElements/Core/VisualTreeLayoutUpdater.cs#L105-L201). | Anchoring, stretching, grid, table, and wrapping responsibilities are separate components. See [`UIAnchor.cs`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/UI/UIAnchor.cs), [`UIStretch.cs`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/UI/UIStretch.cs), [`UIGrid.cs`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/Interaction/UIGrid.cs), and [`UITable.cs`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/Interaction/UITable.cs). |
| Styling and motion | `Selectable` supports color, sprite, and Animator transition modes; projects may add Animator, Timeline, tween, or script-owned motion. See [`Selectable.cs`](https://github.com/Unity-Technologies/uGUI/blob/9edb4420267b6652090ece4c28c38bd98746a68e/com.unity.ugui/Runtime/UGUI/UI/Core/Selectable.cs#L655-L708). | USS style resolution and typed transition-property changes are processed by the style updater. See [`VisualTreeStyleUpdater.cs`](https://github.com/Unity-Technologies/UnityCsReference/blob/79f16640303119112ca5caed4d71c607d0dff6fb/Modules/UIElements/Core/VisualTreeStyleUpdater.cs#L68-L170). | Widget colors, sprites, fonts, `UITweener` subclasses, springs, `UIPlayTween`, and `UIPlayAnimation` provide stack-local presentation and motion mechanisms. See [`UITweener.cs`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/Tweening/UITweener.cs#L10-L38). |
| Binding | Serialized component references, scripts, `UnityEvent`, and project-owned presenters connect UI components to project code. The pinned runtime source exposes `Button.onClick`, but this review did not locate a general collection/data-binding family. See [`Button.cs`](https://github.com/Unity-Technologies/uGUI/blob/9edb4420267b6652090ece4c28c38bd98746a68e/com.unity.ugui/Runtime/UGUI/UI/Core/Button.cs#L15-L70). | `dataSource`, `dataSourcePath`, `SetBinding`, and Panel binding management form an explicit data-binding surface. See [`VisualElementDataBinding.cs`](https://github.com/Unity-Technologies/UnityCsReference/blob/79f16640303119112ca5caed4d71c607d0dff6fb/Modules/UIElements/Core/VisualElementDataBinding.cs#L185-L290). | `EventDelegate`, localization, `PropertyBinding`, and project scripts support callbacks, localization, and property synchronization. Record the concrete component and callback path. See [`EventDelegate.cs`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/Internal/EventDelegate.cs). |
| Scrolling and virtualization | `ScrollRect` owns wheel, drag, bounds, velocity, and anchored-position behavior. The pinned runtime review did not locate a built-in collection-virtualization family. See [`ScrollRect.cs`](https://github.com/Unity-Technologies/uGUI/blob/9edb4420267b6652090ece4c28c38bd98746a68e/com.unity.ugui/Runtime/UGUI/UI/Core/ScrollRect.cs#L647-L680). | `ScrollView` provides scrolling, while collection controls own virtualization controllers. See [`BaseVerticalCollectionView.cs`](https://github.com/Unity-Technologies/UnityCsReference/blob/79f16640303119112ca5caed4d71c607d0dff6fb/Modules/UIElements/Core/Controls/BaseVerticalCollectionView.cs#L560-L574). | `UIScrollView`, scroll bars, `UIWrapContent`, and centering components divide scrolling and repeated-content behavior. See [`UIScrollView.cs`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/Interaction/UIScrollView.cs) and [`UIWrapContent.cs`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/Interaction/UIWrapContent.cs). |
| Lifecycle and serialization | MonoBehaviour callbacks register and unregister Graphics and layout state; scenes and prefabs serialize component fields and events. Inspect runtime-created objects and domain reload behavior separately. | `UIDocument`, Panel Settings, UXML/`VisualTreeAsset`, USS, and runtime Panel attachment create a distinct serialized-asset and runtime-tree lifecycle. | MonoBehaviours, prefabs, atlases, fonts, and serialized delegates carry state. Inspect runtime-created widgets, atlas/font ownership, and callback teardown directly. |
| Editor and runtime | Runtime and Editor assemblies are separate; editor menu code can create Canvas controls. See [`MenuOptions.cs`](https://github.com/Unity-Technologies/uGUI/blob/9edb4420267b6652090ece4c28c38bd98746a68e/com.unity.ugui/Editor/UGUI/UI/MenuOptions.cs#L205-L282). | Runtime Panels and editor-root contexts are separate. See [`RuntimePanel.cs`](https://github.com/Unity-Technologies/UnityCsReference/blob/79f16640303119112ca5caed4d71c607d0dff6fb/Modules/UIElements/Core/GameObjects/RuntimePanel.cs#L27-L48). | Runtime scripts, editor tools, and inspectors coexist. See [`UICreateNewUIWizard.cs`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/Editor/UICreateNewUIWizard.cs) and [`UIPanelInspector.cs`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/Assets/NGUI/Scripts/Editor/UIPanelInspector.cs). |
| Current and historical boundary | The pinned 6000.3 branch is the evidence boundary for this page; record the project's exact package revision before applying it. | The pinned 6000.3 reference source is the evidence boundary. UIElements conference demos and 2019–2020 runtime samples are historical technique records, not current-version contracts. | NGUI is third-party. Record the exact repository or asset-distribution revision and license context instead of using the name alone as a version marker. |

## Opinionated Guidance

- Start a review by naming the tree owner and input owner; those two facts reduce cross-stack ambiguity.
- Capture both serialized assets and the runtime tree because project folders or Scene hierarchy alone can omit runtime ownership.
- Treat mixed-stack projects as explicit integrations. Record render order, camera or Panel ownership, input routing, focus transfer, and teardown at each bridge.
- Prefer version-pinned system source for architecture claims and use samples only for the narrower behavior they actually demonstrate.

## Platform-Specific Guidance

- For uGUI, record Canvas mode, scaler, sorting, raycaster, EventSystem, input module, selected object, and ScrollRect structure.
- For UI Toolkit, record Panel Settings, UIDocument, UXML and USS assets, runtime `rootVisualElement`, focus order, data source, and collection controller.
- For NGUI, record UIRoot scaling, UIPanel clipping and depth, atlas/font assets, UICamera event type and delegates, tweener ownership, and scroll components.
- For every stack, distinguish editor-only tooling from runtime code and current sources from historical examples.

## Unsupported Absolutes

- Do not infer input routing from visual similarity or a shared GameObject parent.
- Do not infer a VisualElement tree from the Transform hierarchy.
- Do not infer current behavior from an unarchived repository or a recent push date alone.
- Do not infer rendered behavior, focus behavior, or lifecycle correctness from serialized files alone.

## Verification Contract

Record exact revisions, open the relevant Scene or document, and capture the serialized owner, runtime tree, active input path, initial and returned focus, layout changes, scrolling behavior, dynamic content reuse, and teardown. Exercise pointer, keyboard, gamepad, or touch modes actually declared by the project. Recheck historical examples against their own Unity version instead of using them as a current baseline.

## Source, License, And Attribution

- uGUI source: [Unity-Technologies/uGUI at `9edb4420267b6652090ece4c28c38bd98746a68e`](https://github.com/Unity-Technologies/uGUI/blob/9edb4420267b6652090ece4c28c38bd98746a68e/com.unity.ugui/LICENSE.md)
- UI Toolkit reference source: [Unity-Technologies/UnityCsReference at `79f16640303119112ca5caed4d71c607d0dff6fb`](https://github.com/Unity-Technologies/UnityCsReference/blob/79f16640303119112ca5caed4d71c607d0dff6fb/LICENSE.md)
- NGUI source: [tasharen/ngui at `9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2`](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/README.md) and its pinned [license](https://github.com/tasharen/ngui/blob/9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2/License.txt)
- Reuse form: locally authored comparison of source-observable ownership and responsibilities; no upstream prose or implementation sample is reproduced.

## IA Navigation

Parent: [Game UI](../index.md).
Next: [Unity CLI Loop](cli-loop.md).
