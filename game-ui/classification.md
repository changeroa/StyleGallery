---
type: Domain Guide
title: Game UI Classification
description: Engine-neutral method for classifying game interfaces by player task, presentation, input, state, and motion.
domain: game-ui
lifecycle: experimental
---

# Game UI Classification

Primary role: game-interface classification guide.

## Repository Boundary

This guide proposes a local, project-neutral taxonomy for classifying observable game-interface behavior without assuming a specific engine or art direction. Its player-task classes and classification axes are review tools, not a universal ontology. It does not turn a visual genre into a functional category or authorize decorative properties in reusable Layout patterns.

## Reusable Method

1. Capture the rendered screen or interaction in context.
2. Assign one primary player-task class.
3. Add secondary classes only when the same surface genuinely composes responsibilities.
4. Record visual language, input, state, motion, and implementation as separate axes.
5. Attach evidence for default, exceptional, and transitional states.
6. State what is observed, inferred, and still unverified.

## Player-Task Classes

| Primary class | Player question | Typical examples |
| --- | --- | --- |
| `hud` | What is happening during play right now? | Health, ammo, objective, marker, cooldown |
| `navigation` | Where can I go next? | Main menu, pause menu, chapter or mode selection |
| `dialog` | What decision or interruption needs attention? | Confirmation, reconnect, privacy, system notice |
| `inventory` | What do I own, equip, compare, or improve? | Loadout, stash, equipment, crafting, upgrade |
| `progression` | What did I unlock or how am I advancing? | Results, level up, rewards, rank change |
| `commerce` | What can I acquire and at what cost? | Shop, offer, product detail, currency shortage |
| `tutorial` | What action should I learn or perform? | Coach mark, forced step, contextual hint |
| `narrative` | What story or authored event is being presented? | Dialogue, boss intro, cinematic overlay |
| `system-status` | Is the application ready and connected? | Splash, loading, sign-in, reconnect, patch status |
| `input-surface` | How do I directly control the game? | Virtual stick, action button, key binding |

## Classification Axes

| Axis | Example values | Evidence requirement |
| --- | --- | --- |
| World relationship | `diegetic`, `spatial`, `overlay`, `full-screen` | Capture placement relative to play space |
| Material character | `flat-graphic`, `framed`, `skeuomorphic`, `translucent`, `textural` | Capture repeated surface treatment |
| Genre signal | `tactical`, `industrial`, `fantasy-ornamental`, `arcade`, `horror`, `casual` | Show repeated shape, type, icon, and material cues |
| Information density | `sparse`, `standard`, `dense` | Count simultaneous choices and information groups |
| Emphasis model | `typographic`, `icon-led`, `character-led`, `item-led`, `effect-led` | Identify first and second attention targets |
| Input | pointer, keyboard, gamepad, touch, gaze, mixed | Exercise every declared input mode |
| Motion role | affordance, activation, state change, transition, value change, reward, guidance, ambient | Record trigger, properties, timing, and interruption |

## Opinionated Guidance

- Organize the gallery first by player task, then filter by presentation and implementation axes.
- Use two or three visual tags supported by repeated evidence.
- Classify independent player-task regions separately when a screen composes them.
- Do not infer style or behavior from project, prefab, widget, scene, or class names alone.

## Platform-Specific Guidance

Record engine, UI framework, render space, scaling policy, navigation system, text system, and motion system as implementation evidence. Route detailed engine hierarchy and API guidance to the matching engine-specific Game UI guide.

## Unsupported Absolutes

- A genre label does not establish a visual style.
- A screenshot does not prove responsive behavior, focus behavior, or motion interruption.
- A production project's folder structure is not a universal architecture.
- Similar appearance does not prove equivalent accessibility, performance, or interaction behavior.

## Verification Contract

Verify narrow and wide surfaces, every declared input mode, long localized text, empty and loading states, disabled and error states, repeated open and close, rapid selection changes, and interrupted motion where relevant.

## Source, License, And Attribution

This page is a locally authored, project-neutral proposed taxonomy. It reproduces no game assets, project-specific hierarchy, or upstream implementation samples.

## IA Navigation

Parent: [Game UI](index.md).
Next: [Game UI Screen Hierarchy](screen-hierarchy.md).
