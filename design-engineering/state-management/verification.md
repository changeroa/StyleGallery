---
type: Domain Guide
title: State Management Verification Matrix
description: Test event ordering, failure recovery, navigation, and identity boundaries separately from UI presentation.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# State Management Verification Matrix

## Repository Boundary

This matrix verifies consumer behavior under Design Engineering. Shared [quality gates](../../quality/index.md) own evidence admissibility. Passing a local model does not promote a domain or certify a consumer.

## Reusable Method

Start with the selected pattern's invariant. Use controlled promises or an injected transport to choose completion order. Assert both displayed state and effect count or persistence payload; a screenshot alone cannot show which snapshot was saved.

| Dimension | Required stress when applicable | Observable |
| --- | --- | --- |
| Ordering | Start A/B; resolve B/A; stale error after new success | Current result, status, and error remain correlated |
| Mutation | Edit during save; normalized result; version conflict | Draft, baseline, submitted payload, revision |
| Duplication | Keyboard + pointer + another caller | Declared count and outcome sharing |
| Failure | Definitive rejection versus unknown write outcome | Draft retained; reconciliation before unsafe retry |
| Lifetime | Dispose; A → B → A; logout | No old-generation updates or scope leakage |
| Navigation | Back, Forward, reload, deep link, canceled departure | URL, visible controls, draft, and selection agree |
| Persistence | Corrupt version, wrong scope, unavailable storage, delayed restore | Valid defaults and preserved newer edits |
| Accessibility | Pending, error, empty, removed invoker | Announcements and logical focus recovery |
| Composition | Filter while deleting; edit during save-and-leave | Combined invariants survive interleaving |

### Executable Local Coverage

From a repository checkout, `npm run test:state-management` extracts and executes the standalone `js` block from each of the 12 pattern pages in an isolated Node process. The examples assert model outcomes for ownership, projections, selection, drafts, save snapshots, navigation decisions, stale completions, duplicate effects, optimistic recovery, URL parsing, identity generations, and restore validation.

The four recipes declare integration acceptance sequences; they are not runnable browser fixtures. Existing [Interaction Lab](../../examples/domain-interactions/README.md) is a separate prototype with its own evidence scope. New recipe acceptance remains unexecuted until adapted to a consumer.

### Evidence Record

Record source revision, runtime, selected pattern/recipe, initial state, event sequence, submitted payload/effect count, expected state, actual state, and remaining limitations. Label unrun cases `not_run`; separate a model assertion from a browser observation and a server acknowledgement.

## Opinionated Guidance

Use deterministic event ordering instead of sleeps. Test the stale failure path as well as stale success, and inspect cleanup/finally paths that can accidentally clear a newer pending operation.

## Platform-Specific Guidance

Run browser navigation, focus, assistive-technology announcements, and storage failure checks in the actual target environment. Node URL and reducer examples cannot certify those integrations.

## Unsupported Absolutes

A green model suite does not prove race freedom under every interleaving, real persistence, or accessibility. Synthetic transports do not establish server idempotency.

## Verification Contract

For every consumer claim, identify a matching executed case or explicitly list missing evidence. Revisit the matrix when a real failure is not representable by its dimensions.

## Source, License, And Attribution

Locally authored synthesis and examples. No upstream implementation is copied. These experimental contracts describe consumer-owned behavior; review when a failure, ownership change, or platform change invalidates an assumption.

## IA Navigation

Parent: [State Management](index.md).
Next: [Continue the state management route](recipes/index.md).
