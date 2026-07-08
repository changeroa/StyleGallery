---
type: Planning Guide
title: Layout Planning Guide
description: Pre-design entry point for choosing and composing layout-gallery patterns.
---

# Layout Planning Guide

Use this guide before a layout problem appears. It helps you classify a screen, name its spatial responsibilities, and choose a small stack of layout patterns before writing application CSS.

`layout-gallery` has two modes:

- **After a problem appears:** find a named pattern in `CATALOG.md` and port its HTML/CSS contract.
- **Before a problem appears:** start with the screen type, answer the layout brief, then compose patterns from `recipes/`.
- **When content needs to become a webpage:** use the [Webpage generation workflow](guides/webpage-generation-workflow.md) to classify the use case, make the content-to-layout match, run harmony evaluation, create the GPT Image reference, and record the implementation handoff before writing product CSS.

## Planning Flow

1. Identify the primary user task.
2. Name the primary content and supporting content.
3. Decide what owns scrolling.
4. Decide whether the problem is viewport-level or component-local.
5. Choose a screen recipe.
6. Replace any recipe pattern that does not match the real content constraints.
7. Verify the result against long, empty, narrow, and wide content.

## Entry Points

- [Decision tree](guides/decision-tree.md): start here when you do not know the pattern name.
- [Layout brief](guides/layout-brief.md): answer these questions before selecting a pattern stack.
- [Webpage generation workflow](guides/webpage-generation-workflow.md): start here when content needs to become a homepage or ordinary webpage.
- [Recipe index](recipes/index.md): screen-type compositions built from reusable patterns.
- [Pattern catalog](CATALOG.md): individual layout primitives and their contracts.

## How To Choose A Recipe

Choose the recipe that matches the screen's spatial model, not the product category.

- A settings page and documentation app may both use a fixed side navigation.
- A dashboard and gallery may both use repeated grid regions.
- A support inbox and file browser may both use list-detail layout.
- A command surface and toolbar-heavy editor may both need wrapping or scrolling action rows.

Recipes are starting points. If a recipe has one pattern that does not fit, replace that pattern rather than copying the recipe blindly.

## What Not To Put Here

The planning layer does not define brand, typography, color, border, shadow, or animation. Those belong to the consuming product. This repository only records layout responsibility, semantic structure, constraints, scroll ownership, and composition.
