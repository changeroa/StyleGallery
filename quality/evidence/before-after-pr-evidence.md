---
type: Evidence Reference
title: Before/After PR Evidence
description: Capture before and after screenshots of a page for a pull request, diff each pair, and write a PR-body section.
aliases: ["before after screenshots","pull request screenshots","visual diff for a PR","shots before after","pixel diff report"]
questions: ["How do I attach before and after screenshots to a pull request?","How do I measure how much a page changed between two Git revisions?"]
---

# Before/After PR Evidence

Primary role: how-to for rendered change evidence in pull requests.

`stylegallery shots --before <ref|url> --after <ref|url>` captures the same matrix for two revisions of one page, measures the pixel change of each pair, and writes a Markdown section for the pull request body. Use it whenever a pull request changes rendered output. It runs locally with Playwright Chromium; it does not need the site compiler that plain `stylegallery shots` drives.

## Run It

```sh
stylegallery shots --before origin/main --after . --page showcase/zed/index.html --selector "nav a" --out /tmp/shots-zed
```

From an unreleased checkout, use `bun run stylegallery -- shots ...`. Each side is one of:

- a Git ref, exported with `git archive` and served from a local static server;
- `.` for the current working tree;
- an `http`, `https`, or `file` URL, loaded as is.

`--page` names the repository-relative file to open for a ref or `.`; it defaults to `index.html`. For URLs it is ignored.

## Capture Matrix

| Axis | Values |
| --- | --- |
| Viewport | 390x844 and 1440x900 CSS pixels at device scale 1 |
| Color scheme | `light` and `dark` through `prefers-color-scheme` |
| State | `default`; also `focus` and `hover` on the first `--selector` match |

Captures use `prefers-reduced-motion: reduce`, disabled CSS animations, and a hidden caret so that unchanged pages compare as identical. `--full-page` captures the whole document instead of the viewport. `--wait <ms>` adds settle time for pages that load late content.

## Outputs

The out directory, `stylegallery-shots-compare` under the system temporary directory by default, receives `before/`, `after/`, and `diff/` PNGs named `w<width>-<scheme>-<state>.png`, plus `report.json` and `pr-body.md`.

Each `report.json` pair carries `before`, `after`, `diff`, `ratio`, `viewport`, `scheme`, `state`, and `bbox`, the bounding box of every changed pixel. It also carries the visual-qa `image-diff` fields: `command`, `dimensionsMatch`, `reference`, `actual`, `totalPixels`, `diffPixels`, `diffRatio`, `similarityScore`, `alphaChannelIntact`, `hotspots`, and `summary`. Hotspots use the same 8x8 grid. A pixel counts as changed when any channel differs by more than `--threshold` (default `0.05` of 255). Pixels outside the shared area of differently sized captures also count as changed.

`pr-body.md` has one before/after table per viewport, a violation-id list filled from `--violations`, a verification list, and the required evidence boundary sentence. GitHub does not render local image paths, so upload the PNGs (drag them into the PR editor, or attach the out directory as a CI artifact) and replace the paths with the uploaded links. A pull request that changes no rendered output shows CLI or validator output before and after instead.

## Pull Request Template

Copy this body into a pull request description; paste `pr-body.md` into its Before/After section. It is kept here rather than in `.github/pull_request_template.md` because every tracked Markdown file carries OKF frontmatter, which GitHub would insert into each new pull request body.

````markdown
## Summary

<!-- What changed and why, in two to five sentences. -->

## Governance Classification

<!-- Owning domain or shared area (see DOMAINS.md and GOVERNANCE.md), lifecycle state, and any generated artifacts regenerated. -->

## Consumer Reference

consumer_reference: <!-- consumer-reference/agent-native/registry.json, one repository-relative JSON record, or not_applicable with a one-sentence reason -->

## Before/After

<!--
UI change: run
  stylegallery shots --before origin/main --after . --page <path> [--selector <css>] [--violations <ids>]
and paste the generated pr-body.md here, replacing local image paths with uploaded images.
Non-UI change: show the relevant CLI or validator output on origin/main and on this branch.
See quality/evidence/before-after-pr-evidence.md.
-->

### Violation IDs

<!-- Audit violation ids this change addresses, or "none". -->

### Verification

<!-- Each command run and its result, for example `bun run validate` (exit 0). -->

Screenshot diffs show rendered change, not usability.
````

## Limits

A ratio measures how many pixels changed, not whether the change is right. It cannot prove usability, accessibility, or brand fit; route those claims through [Visual QA evidence](visual-qa.md) and the [Visual Evidence Gate](../gates/visual-evidence.md). A zero ratio covers only the captured matrix: other widths, states, browsers, and content can still differ.

Screenshot diffs show rendered change, not usability.

## IA Navigation

Parent: [Evidence References](index.md).
Next: [Visual QA](visual-qa.md) for what rendered evidence can and cannot support.
