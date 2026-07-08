# Quality Gates

`quality/` records the principle-backed gates used to decide whether layout and design claims are admissible in `layout-gallery`.

This layer does not make the repository a visual design system. Pattern files still own spatial structure only. Quality gates explain how claims are framed, what evidence can support them, and when review or debt is required.

## Concepts

- [Quality principles](principles.md) - Principles shared by the quality gate layer.
- [Gate index](gates/index.md) - Gate contracts for layout, design claims, visual evidence, accessibility evidence, and rationale.
- [Evidence index](evidence/index.md) - Reference sources and evidence boundaries for design-side claims.
- [Accessibility evidence register](evidence/accessibility.md) - Classification for accessibility claims: automated, manual, user, or debt.

## Admission Model

Every non-layout design claim should follow this chain:

```txt
principle -> claim -> context -> warrant -> evidence family -> verification protocol -> boundary/debt
```

Evidence is not the gate. Evidence supports a claim only when the principle, gate, warrant, and boundary are explicit.
