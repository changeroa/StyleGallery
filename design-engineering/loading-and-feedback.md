---
type: Domain Guide
title: Loading, Progress, And Feedback
description: Separate input acknowledgement, pending work, stale content, confirmed completion, and measurable responsiveness.
aliases: ["loading state","spinner","skeleton","progress indicator","로딩 상태","스켈레톤","진행 표시"]
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-10-19
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

### Indicator Choice And Time Boundaries

Extend this owner rather than creating a second loading-state catalog. A skeleton is useful only when the eventual structure is sufficiently predictable; keep placeholders stationary under reduced motion and reserve realistic space. A spinner conveys indeterminate waiting, not a completion percentage. Prefer real progress when completed and total work are meaningful. None of these choices proves shorter perceived waiting for the current task.

| Source | Year | What was measured or specified |
| --- | --- | --- |
| [NN/g response-time limits](https://www.nngroup.com/articles/response-times-3-important-limits/) | 1993; 2014 addendum | Synthesizes approximately 0.1 seconds for immediate-feeling response, 1 second for uninterrupted flow, and 10 seconds for sustained attention. These are published heuristics drawing on earlier HCI work, not a new controlled skeleton-versus-spinner experiment. |
| [Status Messages explanation](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | 2024 Recommendation; living explanation read 2026 | SC 4.1.3 addresses programmatically determinable status without taking focus; it specifies no toast timeout. |

Those two sources were rechecked 2026-10-19. The 0.1/1/10-second heuristics help identify a feedback need; they are not exact trigger timers. For work expected to exceed about 10 seconds, explain stage, honest progress where available, and a supported interruption/recovery path. Never fabricate a percent to satisfy that heuristic. Do not artificially hold fast results to display a spinner.

### Toast Versus Inline Feedback

Local selection proposal: keep field errors inline, long-running state with its affected region, and important outcomes in a durable location. A nonmodal toast can supplement a low-priority completed action when missing it does not block recovery. Do not put the only error explanation, required decision, or sole recovery action in a disappearing toast. There is no source-backed universal three-, five-, or ten-second toast duration.

For dynamic status, update an existing concise region without moving focus. Use assertive interruptions only when urgency warrants them; repeated routine success messages should not continually interrupt speech.

```html
<section aria-labelledby="upload-heading">
  <h2 id="upload-heading">Upload</h2>
  <p id="upload-status" role="status">Uploading file 2 of 4.</p>
  <progress max="4" value="1" aria-label="Files uploaded">1 of 4</progress>
</section>
```

This local fragment describes one completed file and the second in progress. The state owner must update both values together from accepted work; it does not implement uploading. For completed-zero and first-use guidance, use [Empty States And No Results](evidence-patterns/empty-states.md).

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
