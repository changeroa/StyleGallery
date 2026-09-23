---
type: Domain Guide
title: Loading, Progress, And Feedback
description: Separate input acknowledgement, pending work, stale content, confirmed completion, and measurable responsiveness.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-09-21
---

# Loading, Progress, And Feedback

Primary role: asynchronous presentation and measurement guide.

## Repository Boundary

This page owns the product's account of pending work and results. Request authority remains in [State Management](state-management/index.md), motion in [Motion](../motion/index.md), and evidence claims in [Quality](../quality/index.md). A loading treatment is not a reusable Layout pattern.

## Reusable Method

Identify the fact behind each displayed state. Distinguish input received, request started, work in progress, result accepted, result rendered, and result announced. Select a feedback mechanism only after its state owner and truth condition are explicit.

### Source Findings

| Source | Bounded finding | Implication |
| --- | --- | --- |
| [HTML progress element](https://html.spec.whatwg.org/multipage/form-elements.html#the-progress-element) | A progress element can represent determinate or indeterminate task completion; omitting `value` expresses indeterminate progress. | Do not fabricate a percent complete when total work is unknown. |
| [WAI-ARIA 1.2 busy state](https://www.w3.org/TR/wai-aria-1.2/#aria-busy) | `aria-busy` indicates an element is being modified; assistive technologies may defer exposing changes while it is busy. | Clear the state on every terminal path and verify actual announcements. |
| [Status Messages explanation](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | A result summary may be a status message, while the entire returned result list is not thereby a status message. | Announce concise state/result information rather than every changing node. |
| [Interaction to Next Paint](https://web.dev/articles/inp) | INP measures interaction responsiveness through the next paint; good field responsiveness is described as at most 200 ms at the 75th percentile, assessed by device category. | Do not use that number as a required animation duration or server-response deadline. |
| [Optimize INP](https://web.dev/articles/optimize-inp) | Input delay, event processing, and presentation delay contribute to the interaction latency. | Diagnose which interval is slow before changing a loading indicator. |
| [Event Timing API](https://www.w3.org/TR/event-timing/) | The API defines event timing observations with implementation and exposure constraints. | Record the instrument and observation scope rather than treating callback time as total latency. |
| [Cumulative Layout Shift](https://web.dev/articles/cls) | CLS measures unexpected layout movement with defined exclusions and aggregation. | A stable placeholder can help spatial stability without proving timely or correct completion. |

Sources were inspected 2026-09-21. Browser metric guidance is a measurement convention, not a guarantee of perceived quality. Standards-track drafts and actual browser instrumentation must be distinguished.

### State-To-Presentation Contract

| State | Required truth | Local presentation proposal |
| --- | --- | --- |
| Initial pending | No accepted content exists for this request. | Explain what is loading; use stationary structure if useful. |
| Refreshing | Previously accepted content remains visible while a new request runs. | Identify its freshness/query boundary and avoid implying it is the new result. |
| Partial result | Some units are accepted and others remain pending or failed. | Distinguish completed units from missing units and provide a bounded retry. |
| Determinate progress | A meaningful completed/total measure exists. | Expose that measure and its scope; distinguish upload from server processing. |
| Indeterminate progress | The operation runs but no honest completion ratio exists. | Explain the current stage without a fabricated percentage. |
| Success | The relevant authoritative result was accepted. | Make the result durable and expose the next action. |
| Failure or unknown outcome | Failure is confirmed, or acknowledgement is missing. | Preserve recoverable input; distinguish safe retry from possible duplicate work. |
| Cancel requested | A request to stop was issued. | Avoid claiming cancellation is complete until the contract supports that fact. |

These treatments are local proposals. A skeleton, toast, or spinner is neither mandatory nor sufficient for any row.

### Worked Scenario: Search While Keeping Results

The user has query A results and submits B. Keep A visible under an explicit refreshing state. Accept B only if its request identity remains current. If A's late failure arrives while B is pending, it cannot clear B's busy state. If B fails, label the retained content as A and provide a retry tied to B.

The result summary, busy state, empty state, and visible records must describe the same accepted request. “No results” is a completed result, not a synonym for “nothing rendered yet.” A late finally handler can violate this even when success callbacks are guarded; use the [latest-request contract](state-management/patterns/latest-request-wins.md).

### Worked Scenario: Save With An Unknown Outcome

The editor submits a snapshot. Connectivity drops after the server may have received it. The consumer must decide how to reconcile that uncertainty: a supported operation identity, refetch, or a documented recovery flow. Merely showing a retry button cannot prove that retrying is safe.

Keep the submitted snapshot distinct from edits made while saving. A successful acknowledgement for the earlier snapshot cannot mark the newer draft saved. Compose [submitted snapshot](state-management/patterns/submitted-snapshot.md) with [draft and baseline](state-management/patterns/draft-and-baseline.md).

## Opinionated Guidance

Prefer feedback that explains the actual stage and preserves a useful next action. Evaluate delays before showing indicators against measured task frequency and latency distribution; do not turn a borrowed delay into a universal rule. Avoid artificially holding completed content merely to finish a decorative loading cycle.

Keep repeated announcements bounded. When several regions update, establish which summary owns the user-facing completion message instead of making every region assertive.

## Platform-Specific Guidance

Native progress controls and web progress semantics differ in APIs and announcement behavior. Real screen-reader tests are needed for the selected combination. For reduced-motion loading treatment, use [Accessible Motion](../motion/accessible-motion.md); for app suspension and navigation lifetime, preserve the state owner's contract.

## Unsupported Absolutes

A spinner cannot prove ongoing backend work. A good INP cannot prove a successful save. A zero CLS measurement cannot prove usable loading feedback. `aria-busy` alone does not guarantee that a specific message is spoken.

## Verification Contract

The unexecuted scenario set includes immediate completion, slow completion, stale success, stale error, partial response, cancelled request, lost acknowledgement, retry, unmount, and reduced motion. Observe focus and announcements as well as the displayed status.

For latency claims, collect a timestamp for input, first useful presentation, authoritative result, and final presentation where each is observable. Name the clock boundary; client and server timestamps cannot be subtracted without a supported synchronization method. Separate local repeatable scenarios from field distributions. Re-review after request policy, feedback ownership, or instrumentation changes.

## Source, License, And Attribution

Locally authored synthesis. The linked specifications and first-party performance guidance were inspected 2026-09-21. No source samples are reproduced. `consumer_reference: not_applicable` because no consumer request or evidence record is selected.

## IA Navigation

Parent: [Design Engineering](index.md).
Next: [State Verification Matrix](state-management/verification.md).
