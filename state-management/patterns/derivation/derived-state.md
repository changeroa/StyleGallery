---
type: State Management Pattern
title: Derived State
description: Compute a value from authoritative inputs instead of storing another mutable copy.
domain: state-management
lifecycle: experimental
provenance_kind: local
category: derivation
primary_state_problem: a computable value risks becoming a second mutable source of truth
---

# Derived State

## Repository Boundary

This pattern governs pure computation from existing authority. It does not define visual presentation, expensive-computation infrastructure, analytics, or backend materialized views.

## Reusable Method

- Inputs: named authoritative values with stable identity semantics.
- Output: a deterministic projection with no independent writer.
- Lifetime: the output is valid only for the current input versions.
- Invariant: every observed output equals the declared computation over current inputs.
- Optimization: memoization may retain computation results but must not create a competing authority.
- Failure: invalid or missing inputs produce a documented empty, pending, or error result.

## Opinionated Guidance

Derive filtered collections, totals, eligibility, dirty state, and display groupings when the result is fully determined by existing inputs. Store an explicit event result only when the domain requires historical or independently authoritative meaning.

## Platform-Specific Guidance

Memoization, selector, reactive-computation, and server-rendering mechanisms are implementation-specific. Their cache lifetime must not change the logical authority contract.

## Unsupported Absolutes

Not every computed value must be recomputed eagerly, and not every performance optimization is premature. Optimization needs measured cost and preserved semantics.

## Verification Contract

Verify empty inputs, dependency changes, reorder, removal, identity replacement, and any memoization invalidation. Assert the invariant directly rather than snapshotting a whole store.

## Composition Notes

Use with any ownership pattern. The derivation must name which owner supplies each input and must not write back merely to keep a mirror synchronized.

## Anti-patterns

- Updating a stored total in every mutation path.
- Copying props or cache data into local mutable state without a reset contract.
- Using an effect to synchronize a value that can be computed during read.

## Source, License, And Attribution

- Provenance: locally authored StyleGallery pattern.
- No upstream source fields apply.

## IA Navigation

Parent: [State Management Patterns](../index.md).
Next: [Explicit Transition Model](../transitions/explicit-transition-model.md).
