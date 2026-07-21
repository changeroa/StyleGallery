---
type: Domain Guide
title: Game UI Reference Record
description: Minimum evidence record for adding a game-interface reference to StyleGallery.
domain: game-ui
lifecycle: experimental
---

# Game UI Reference Record

Primary role: gallery evidence template.

## Repository Boundary

This record captures enough context to compare a game UI reference without importing its assets, source hierarchy, or implementation assumptions as gallery policy.

## Reusable Method

Complete the record from rendered evidence first, then add hierarchy and implementation facts. Mark unknown fields instead of guessing from names.

## Minimum Record

| Field | Required content |
| --- | --- |
| Identity | Entry name, source, capture date, source revision or version |
| Player task | One primary class and justified secondary classes |
| Presentation | Two or three visual-language tags with rendered evidence |
| Hierarchy | Root, layer, screen, region, component, and control ownership |
| Platform | Engine, UI framework, relevant package or runtime versions |
| Surface | Render space, aspect ratios, safe area, scaling policy |
| Input | Supported modes, initial focus, navigation, cancellation, focus return |
| States | Default, selected, disabled, loading, error, empty, modal |
| Motion | Role, trigger, properties, timing, interruption, completion |
| Evidence | Screen capture, recording, hierarchy capture, relevant source paths |
| Boundary | Observed facts, inferences, unknowns, and reuse restrictions |

## Opinionated Guidance

Prefer a complete record to a large screenshot collection missing state, hierarchy, or input evidence. It must explain the classification and what remains unproven.

## Platform-Specific Guidance

Use the matching engine-specific Game UI guide to fill implementation fields. Engine terms supplement this record; they do not replace the engine-neutral player-task and hierarchy roles.

## Unsupported Absolutes

- A source path is not rendered evidence.
- A polished capture is not proof of edge-state behavior.
- A single aspect ratio or input mode is not broad platform coverage.

## Verification Contract

Reject an entry if its primary player task, rendered state, source identity, or evidence boundary is unknown. Keep incomplete entries in draft; do not infer missing facts.

## Source, License, And Attribution

Record source licensing and reuse restrictions per entry. Do not copy protected game assets into the repository merely to make the record self-contained.

## IA Navigation

Parent: [Game UI](index.md).
Next: [Unity UI Architecture](unity/architecture.md).
