---
type: Domain Guide
title: Design Engineering Decision Tree
description: Route product craft work from the uncertain decision to a contract, example, and appropriate evidence.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
---

# Design Engineering Decision Tree

Primary role: product implementation planning route.

## Repository Boundary

This route turns a product request into a bounded implementation decision. It owns neither shared quality policy nor a default design system. Use the existing Layout corpus for geometry and Motion for temporal behavior.

## Reusable Method

1. Write the user's action and the expected result in one sentence.
2. Identify what is uncertain: content, structure, state, identity, platform behavior, or perception.
3. Select the route below and produce its named artifact.
4. Implement the smallest slice containing the risky state, including failure and recovery.
5. Verify the observable and record the remaining limitation using [Interface Craft Decisions](interface-craft.md).

## Task Routes

| Uncertain decision | Primary route | Artifact to produce |
| --- | --- | --- |
| What should this screen contain? | [Webpage Generation Workflow](../guides/webpage-generation-workflow.md) | Content inventory and task model |
| What owns size, flow, and scroll? | [Layout Planning Guide](../GUIDE.md) | Layout brief and pattern composition |
| What happens after activation or failure? | [Component Contract](component-contract.md) | State, event, focus, and asynchronous ownership tables |
| How should a form, search, or destructive action recover? | [Worked Examples](worked-examples.md) | Scenario-specific acceptance cases |
| Does a product detail serve the task? | [Interface Craft Decisions](interface-craft.md) | Claim with an observable and evidence boundary |
| How do distinct identities use one Layout contract? | [Reference Profiles](reference-profiles/index.md) | Explicit profile selection and value ownership |
| Will an existing consumer survive migration? | [Consumer Migration Readiness](consumer-migration-readiness.md) | Thirteen-dimension consumer-owned conformance record |
| What should move and why? | [Motion Decision Tree](../motion/decision-tree.md) | Motion brief with interruption policy |
| Is a platform convention transferable? | [Platform Adaptation Workflow](../platform-guides/adaptation-workflow.md) | Native fact, web mapping, fallback, and runtime matrix |

## Worked Intake

Request: “Make saving settings feel responsive.” The risky decision is whether acknowledgement means persistence. Begin with a component contract: clean, dirty, saving, saved, and failed. A saving label acknowledges submission; the saved state waits for the persistence response. Preserve unsaved edits when requests fail. Only then evaluate a completion treatment through Motion. This order exposes duplicate writes and lost edits before visual review.

An acceptance statement can be: “A failed save leaves the entered values available for retry.” “Feels responsive” remains a human perception hypothesis until measured in the relevant task.

## Opinionated Guidance

Prototype the uncertain state rather than an entire polished screen. A good first slice includes the initiating action, its failure, and a recovery path. Add complexity when it resolves an observed limitation.

## Platform-Specific Guidance

Distinguish browser, OS, assistive technology, framework, and component library versions in evidence. A library's state name is an implementation detail, not the user's task definition.

## Unsupported Absolutes

No selected framework, profile, token set, or prototype proves product quality. Component completion does not demonstrate migration readiness for an entire consumer.

## Verification Contract

The route succeeds when a reviewer can find the decision owner, artifact, failure case, and evidence needed without guessing. Verify one ordinary, one exceptional, and one interrupted task. Revisit when a route sends the reader to the wrong domain or cannot produce a testable acceptance statement.

## Source, License, And Attribution

Locally authored routing and settings example. Linked repository documents remain authoritative for their own contracts.

## IA Navigation

Parent: [Design Engineering](index.md).
Next: [Component Contract](component-contract.md).
