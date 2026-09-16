# State Management

Domain classification: design-engineering. Lifecycle: `experimental`.

## Repository Boundary

State management is a Design Engineering topic, not a seventh domain. It owns consumer UI decisions about authoritative values, events, effects, reconciliation, and lifetime. Layout continues to own spatial composition; Motion owns optional presentation timing. Server transaction protocols, universal library rankings, and shared component implementations are outside this collection.

## Reusable Method

Start with [the decision tree](decision-tree.md), fill in the [state brief](state-brief.md), select the smallest relevant patterns, then compose a [screen recipe](recipes/index.md). The [verification matrix](verification.md) separates expected behavior from observed evidence.

한국어 검색 안내: 상태 관리, 상태 소유권, 파생 상태, 초안과 저장본, 비동기 요청 경합, URL 동기화, 상태 복원은 아래 패턴에서 찾을 수 있습니다.

### Pattern Catalog

| Category | Pattern | Failure prevented |
| --- | --- | --- |
| Ownership and derivation | [Single Owner And Controlled Inputs](patterns/single-owner.md) | Keep one authoritative value when several controls edit the same setting. |
| Ownership and derivation | [Derived State From Authoritative Inputs](patterns/derived-state.md) | Prevent totals, filtered lists, and dirty flags from drifting away from their inputs. |
| Ownership and derivation | [Selection By Stable Identity](patterns/id-selection.md) | Keep selection attached to an entity while a collection reorders or refreshes. |
| Editing and persistence | [Draft And Persisted Baseline](patterns/draft-and-baseline.md) | Preserve editable work while distinguishing it from the last acknowledged saved value. |
| Editing and persistence | [Submitted Snapshot And Save Acknowledgement](patterns/submitted-snapshot.md) | Keep later edits dirty when an earlier submitted snapshot finishes saving. |
| Editing and persistence | [Unsaved Changes And Navigation](patterns/unsaved-navigation.md) | Make leaving an edited screen an explicit decision without losing the current draft. |
| Asynchronous consistency | [Latest Request Wins](patterns/latest-request-wins.md) | Prevent an older read response from replacing the result of a newer user intent. |
| Asynchronous consistency | [Single Flight And Duplicate Submission](patterns/single-flight.md) | Apply an explicit policy to repeated activation of one pending operation. |
| Asynchronous consistency | [Optimistic Overlay And Recovery](patterns/optimistic-overlay.md) | Show a speculative change while preserving an authoritative base for recovery. |
| Navigation and lifetime | [URL State And History](patterns/url-state.md) | Keep shareable screen state consistent across links, refresh, and browser history. |
| Navigation and lifetime | [Identity Boundary And Reset](patterns/identity-reset.md) | Prevent temporary state and pending outcomes from leaking across entity or account changes. |
| Navigation and lifetime | [Versioned And Scoped State Restore](patterns/versioned-restore.md) | Restore persisted preferences only when their schema and ownership scope are valid. |

### Relationship To Existing Contracts

The [Component Contract](../component-contract.md) remains the public handoff for semantics, events, focus, and asynchronous ownership. Its save example remains in place. [Worked Examples](../worked-examples.md) supplies existing product scenarios; these patterns make their mechanisms individually selectable.

This collection contains 12 patterns in four categories and four [recipes](recipes/index.md). The [composition matrix](recipes/index.md#composition-matrix) records essential and replaceable choices. Plain JavaScript examples are the local executable reference; framework adapters must preserve their declared invariants.

## Opinionated Guidance

Start by locating the authoritative value and its lifetime. Introduce a shared store only when shared ownership or subscriptions require it. Keep remote data authority distinct from local cache ownership, and model request status separately from draft validity and persisted revision.

## Platform-Specific Guidance

Choose native controls and platform navigation before adapters. URL parsing, storage access, focus recovery, and framework disposal each need target-runtime checks beyond the Node examples.

## Unsupported Absolutes

Neither a reducer nor a state machine guarantees race freedom. No library is the default for this collection. Local executable examples do not establish backend, accessibility, or browser conformance.

## Verification Contract

A reader should find a pattern from a failure symptom, identify its owner and minimal implementation, compose it into a screen, and locate a repeatable acceptance sequence. Run `npm run test:state-management` for the 12 local examples; record browser and backend checks separately.

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [Design Engineering](../index.md).
Next: [Continue the state management route](decision-tree.md).
