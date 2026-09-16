# State Management Recipes

Domain classification: design-engineering. Lifecycle: `experimental`.

## Repository Boundary

These are Design Engineering behavior recipes. The root `recipes/` directory remains the Layout corpus. A behavior recipe may reference a Layout recipe but cannot import state logic into its reusable CSS.

## Reusable Method

Choose a task, then review its owner map, event flow, substitution rules, and acceptance sequences.

- [Settings with explicit save](settings-save.md): draft, submission, acknowledgement, and guarded departure.
- [Search filters and detail](search-detail.md): route state, out-of-order reads, and stable selection.
- [Multi-step form](multi-step-form.md): retained fields, validation, branching, and final submit.
- [Deletion and supported undo](delete-undo.md): identity, duplicate policy, recovery, and actual reversibility.

### Composition Matrix

`E` means essential to this recipe's declared behavior; `S` means substitutable when the stated requirement changes; `O` is optional with its own contract; `—` means not required. Pattern names link to their standalone contracts.

| Pattern | Settings | Search/detail | Multi-step form | Delete/undo |
| --- | --- | --- | --- | --- |
| [Single owner](../patterns/single-owner.md) | E | E | E | E |
| [Derived state](../patterns/derived-state.md) | E | E | E | O |
| [ID selection](../patterns/id-selection.md) | — | E | — | E |
| [Draft/baseline](../patterns/draft-and-baseline.md) | E | — | E | — |
| [Submitted snapshot](../patterns/submitted-snapshot.md) | E | — | E | — |
| [Unsaved navigation](../patterns/unsaved-navigation.md) | E | — | E | — |
| [Latest request wins](../patterns/latest-request-wins.md) | O | E | O | — |
| [Single flight](../patterns/single-flight.md) | E | — | E | E |
| [Optimistic overlay](../patterns/optimistic-overlay.md) | O | — | — | S |
| [URL state](../patterns/url-state.md) | O | S | O | O |
| [Identity reset](../patterns/identity-reset.md) | E | E | E | E |
| [Versioned restore](../patterns/versioned-restore.md) | O | — | O | — |

Single owner and identity reset are lifecycle foundations in these recipes even where the short stack emphasizes task-specific mechanisms. For a fixed identity, reset may be implemented simply by disposal; reused screens must invalidate their old generation.

Substitution risks: replacing URL state loses history/deep-link recovery unless another navigation owner provides it. Replacing a pending deletion with an optimistic overlay requires definitive rejection versus uncertain-outcome handling. Replacing explicit save with autosave changes the recipe and needs a separate write ordering contract.

## Opinionated Guidance

Keep compositions smaller than the complete catalog. Optional restore and optimistic display should solve a named user need. Do not create a new primitive merely because a screen combines several existing ones.

## Platform-Specific Guidance

Keep native form behavior, router transitions, and focus restoration in the consuming UI. Model examples have no rendered geometry; use the linked Layout recipes to name scroll and source-order ownership.

## Unsupported Absolutes

The matrix describes proposed compositions, not universal requirements for every settings or search screen. It does not claim that all combinations have executed browser evidence.

## Verification Contract

Each recipe must expose a unique ownership map, a failure interleaving, and the consequence of replacing an essential choice. Execute consumer integration sequences separately from the 12 pattern model examples.

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](../index.md).
Next: [Continue the state management route](../verification.md).
