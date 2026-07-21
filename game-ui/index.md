# Game UI

Game UI owns engine-neutral guidance for game-interface purpose, presentation, screen hierarchy, and evidence records, plus named engine implementation guides.

## Scope Boundary

In scope: player-task classification, screen and overlay hierarchy, reusable reference metadata, state coverage, cross-engine comparison vocabulary, and engine-specific implementation guidance.

Out of scope: reusable Layout CSS, universal visual prescriptions, and treating one engine's scene graph or API as a cross-engine requirement.

## Evidence And Research Boundary

The player-task classes and classification axes are a local taxonomy proposed for StyleGallery review, not Interface In Game's universal ontology.

Interface In Game was reviewed on 2026-07-14 through its [home page](https://interfaceingame.com/), [games index](https://interfaceingame.com/games/), and representative records for [Team Fortress 2](https://interfaceingame.com/games/team-fortress-2/), [Genshin Impact (Mobile)](https://interfaceingame.com/games/genshin-impact-mobile/), and [Gris](https://interfaceingame.com/games/gris/). In this bounded sample, the site exposed site-local facets such as Genres, Themes, and Platforms, while screenshots used Elements. The sample informs the local separation of player task from other axes; it does not cover the archive or establish the site's full information model.

## Available Guides

- [Game UI Classification](classification.md) separates player purpose from visual language, input, state, and motion.
- [Game UI Screen Hierarchy](screen-hierarchy.md) defines engine-neutral layers from application shell to atomic control.
- [Game UI Reference Record](reference-record.md) provides the minimum evidence schema for gallery entries.
- [Unity UI Architecture](unity/architecture.md) maps the hierarchy roles to Unity Scenes, Canvas layers, prefabs, runtime instances, input, and motion ownership.
- [Unity UI Systems](unity/ui-systems.md) compares uGUI, UI Toolkit, and NGUI ownership and capability shapes at pinned sources.
- [Unity CLI Loop](unity/cli-loop.md) defines a source-pinned command loop for Unity UI inspection and stack-specific interaction evidence.
- [Unity Repository Map](unity/repository-map.md) maps the public Unity-Technologies repository snapshot by UI relevance, authority, and lifecycle.
- [Unity Organization Compressed Wiki](unity/org-wiki.md) routes all 804 captured public repositories through a tracked inventory and bounded exclusive clusters.

## Domain Contract

Game UI describes interface purpose, screen composition, and how named engines can realize that model. Platform Guides cover non-game platform conventions; Layout owns portable spatial patterns.

## IA Navigation

Parent: [StyleGallery](../index.md).
Next: [Game UI Classification](classification.md).
