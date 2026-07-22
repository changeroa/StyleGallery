---
type: Domain Guide
title: Game UI Screen Hierarchy
description: Engine-neutral ownership model for composing game-interface shells, screens, layers, regions, components, and controls.
domain: game-ui
lifecycle: experimental
---

# Game UI Screen Hierarchy

Primary role: engine-neutral hierarchy guide.

## Repository Boundary

This hierarchy describes interface responsibility, not a required scene graph or prefab tree. Engines may realize the same roles through scenes, widgets, documents, entities, prefabs, or runtime objects.

## Reusable Method

Read a game UI hierarchy from ownership outward:

1. Identify the lifetime owner.
2. Identify the active player task.
3. Separate persistent, replaceable, modal, transient, and world-linked layers.
4. Name screen regions by responsibility.
5. Find repeated components and atomic controls.
6. Record navigation, input blocking, sorting, focus, and teardown ownership.

## Reference Hierarchy

```text
Application UI Root
├── Persistent Services
│   ├── Input and Focus Routing
│   ├── Loading and Blocking
│   ├── Notifications
│   └── Accessibility and Localization
├── Screen Host
│   └── Active Screen
│       ├── Screen Header
│       ├── Primary Region
│       ├── Supporting Region
│       └── Screen Actions
├── HUD Layer
│   ├── Player Status
│   ├── World Status
│   ├── Objectives
│   └── Context Actions
├── Modal Layer
│   ├── Blocker
│   └── Dialog or Popup Stack
├── Transient Layer
│   ├── Toasts
│   ├── Tooltips
│   └── Reward and Feedback Effects
└── World-Linked UI
    ├── Markers
    ├── Labels
    └── Interaction Prompts
```

## Hierarchy Roles

| Level | Owns | Must not silently own |
| --- | --- | --- |
| Application root | Cross-screen lifetime, global routing, top-level sorting | Screen-specific business state |
| Layer host | Ordering, visibility policy, input blocking | Individual component presentation |
| Screen | One primary player task and its navigation boundary | Unrelated global services |
| Region | A stable information or action responsibility | Whole-screen lifecycle |
| Component | Reusable stateful presentation unit | Global navigation policy |
| Control | One direct interaction or value presentation | Hidden cross-screen side effects |

## Composition Rules

- Keep persistent services independent from replaceable screen content.
- Assign explicit ownership for modal blocking and modal content.
- Separate popup stacks, notifications, tooltips, and reward effects when their lifetime, input, sorting, or interruption responsibilities differ.
- Distinguish world-linked UI from screen-space HUD by camera, target, and lifetime ownership, not shared visual tokens.
- Prefer explicit data and state inputs for repeated list cells, slots, tabs, meters, and buttons over implicit global-state access.
- Preserve logical navigation order when visual sorting or animation changes.

## Opinionated Guidance

A shallow tree is not automatically better than a deep tree. Prefer boundaries that make lifetime, input, sorting, and reuse obvious. Undocumented nodes used only to offset animation, scaling, or masking side effects are a fragility signal.

## Platform-Specific Guidance

Map these roles to the target engine without copying the hierarchy literally. See [Unity UI Architecture](unity/architecture.md) for Unity Scene, Canvas, prefab, and runtime mapping.

## Unsupported Absolutes

- Do not require one root Canvas, widget tree, or scene for every game.
- Do not equate folder nesting with runtime ownership.
- Do not assume a prefab, widget, or component boundary is also a navigation boundary.
- Do not infer input blocking or render order from hierarchy position alone.

## Verification Contract

Trace one screen from creation through teardown. Record its creator, sorting layer, input blocker, focus entry and return, what survives screen changes, and modal or transition interruption behavior.

## Source, License, And Attribution

This page synthesizes recurring hierarchy responsibilities observed across game UI implementations without reproducing any project-specific object tree.

## IA Navigation

Parent: [Game UI](index.md).
Next: [Game UI Reference Record](reference-record.md).
