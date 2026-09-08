---
type: Domain Guide
title: Windows Interaction As A Comparative Reference
description: Source-bounded Windows keyboard, focus, and command guidance with web adaptation cases.
domain: platform-guides
lifecycle: experimental
provenance_kind: local
platform: Windows applications and WinUI
platform_version: dated Microsoft Learn documentation; target Windows App SDK version required
reviewed_on: 2026-09-08
---

# Windows Interaction As A Comparative Reference

Primary role: Windows platform comparison guide.

## Repository Boundary

This guide compares keyboard and command behavior in Windows application guidance. It supplies no Fluent visual defaults and does not imply that WinUI focus APIs exist in the browser. The consumer records its actual Windows, SDK, browser, and control-library versions.

## Reusable Method

Start with the [Adaptation Workflow](adaptation-workflow.md). Identify the command, navigation group, and focus scope before choosing a shortcut or implementation API.

## Source-Bounded Conventions

| Concern | Official source and bounded fact | Transferable question |
| --- | --- | --- |
| Sequential and inner navigation | [Keyboard interactions](https://learn.microsoft.com/en-us/windows/apps/design/input/keyboard-interactions) distinguishes moving between controls from moving within some composite controls | Is the key moving between tasks, among items, or editing a value? |
| Initial focus | The same source discusses logical starting focus and avoiding an initially focused destructive action | Does the entry target help the intended task without accidental destructive activation? |
| Focus movement | [Focus navigation](https://learn.microsoft.com/en-us/windows/apps/develop/input/focus-navigation) documents native focus navigation and control behavior | Can focus reach every required action, and where does it return after dismissal? |
| Commands | [Keyboard accelerators](https://learn.microsoft.com/en-us/windows/apps/develop/input/keyboard-accelerators) describes command invocation and scoping in Windows applications | Does a shortcut invoke the same command and availability rules as its visible control? |

Source set reviewed 2026-09-08. These are platform guidance and API documentation, not evidence that a consumer implements them.

## Worked Adaptation: Searchable Command Surface

Task: find and invoke commands without a pointer. Begin with the [Command Surface recipe](../recipes/command-surface.md) for spatial composition. Use the correct web widget semantics for the chosen design; a native control's tab-stop policy should not be copied onto unrelated HTML elements.

Define the opening control, query input, result navigation, selected command, disabled-command explanation, and dismissal target. Command buttons and shortcuts share one operation owner. Editing text must not accidentally invoke a global command. A shortcut is supplemental: the visible action remains available when that key combination is reserved by the browser or OS.

| Test | Expected target behavior |
| --- | --- |
| Open with keyboard | Focus reaches the declared entry target |
| Search to zero results | Query remains editable and dismissal remains available |
| Attempt an unavailable command | No operation; availability is explained consistently |
| Dismiss after invoker removal | Focus reaches a documented surviving target |
| Use a reserved/unavailable shortcut | The visible control still performs the task |

Actual result: `not_run`. This is a fictional web adaptation contract.

## Opinionated Guidance

Centralize command availability so menu, button, and shortcut do not disagree. Do not add shortcuts before checking focus, text editing, and the complete visible operation path.

## Platform-Specific Guidance

WinUI accelerators and focus APIs have native routing rules. Web controls use HTML, the selected ARIA pattern where necessary, browser defaults, and the application's focus scope. See the [shared accessibility evidence gate](../quality/gates/accessibility-evidence.md) for the required evidence boundary.

## Unsupported Absolutes

Arrow keys are not a replacement for Tab in every UI. A Windows shortcut is not safe to intercept globally in every browser. A working pointer flow does not prove keyboard operation.

## Verification Contract

Verify entry, traversal, command invocation, text editing, cancellation, disabled state, and focus restoration on every claimed runtime/input. Include a missing invoker and nested surface. Review on Windows SDK, browser, source guidance, or command-routing changes.

## Source, License, And Attribution

Locally authored synthesis of the official Microsoft sources linked above, rechecked 2026-09-08. No upstream examples, control code, or visual assets are copied. `consumer_reference: not_applicable` because no consumer implementation record is selected.

## IA Navigation

Parent: [Platform Guides](index.md).
Next: [Platform Compatibility Matrix](compatibility-matrix.md).
