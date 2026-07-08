# Quality Gates

`quality/` records principle-backed claim gates for design-side judgments in `layout-gallery`.

This layer does not turn the repository into a visual design system. Pattern files still own spatial structure only. Quality records explain how high-impact claims are framed, what evidence can support them, and when review or debt is required.

## Concepts

- [Structured quality claims](claims.md) - Claim-record template, high-impact scope, and low-risk prose boundary.
- [Gate index](gates/index.md) - Gate contracts for design claims, rationale, and harmony evaluation.
- [Evidence index](evidence/index.md) - Evidence-family vocabulary for claim records.
- [Claim records](claim-records/index.md) - Filled examples for high-impact claims.

## Admission Model

Every high-impact non-layout design claim should follow this chain:

```txt
principle -> claim -> context -> warrant -> evidence family -> verification protocol -> boundary/debt
```

Evidence is not the gate. Evidence supports a claim only when the principle, gate, warrant, and boundary are explicit.

High-impact claims use the [claim record template](claims.md#claim-record-template). Low-risk prose can stay as prose when it does not approve, block, redirect, or hand off implementation work.
