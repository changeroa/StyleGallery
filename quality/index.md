# Quality Gates

`quality/` is shared StyleGallery infrastructure for deciding whether Layout, Motion, Design Engineering, Game UI, and Platform Guides claims are admissible.

This shared layer does not make the repository a visual design system. Layout pattern files still own spatial structure only; domain guidance cannot bypass these gates. Quality gates explain how claims are framed, what evidence can support them, and when review or debt is required.

The [Consumer Reference Receiver Contract](../consumer-reference/contract.md) is adjacent shared infrastructure: it routes an optional consumer-owned record without turning Quality or Layout into owners of profile values.

## Concepts

- [Quality principles](principles.md) - Principles shared by the quality gate layer.
- [Controlled vocabulary](../guides/vocabulary.md) - Canonical terms for claims, gates, warrants, boundaries, evidence families, harmony, and debt.
- [Structured quality claims](claims.md) - Claim-record template, high-impact scope, and low-risk prose boundary.
- [Gate index](gates/index.md) - Gate contracts for layout, design claims, visual evidence, accessibility evidence, and rationale.
- [Evidence index](evidence/index.md) - Reference sources and evidence boundaries for design-side claims.
- [Claim records](claim-records/index.md) - Filled examples for high-impact claims.
- [Accessibility evidence register](evidence/accessibility.md) - Classification for accessibility claims: automated, manual, user, or debt.
- [Executable evidence coverage](evidence/executable-evidence.md) - Validator, fixture, CI, rendered-evidence, and review boundaries.

## Admission Model

Every non-layout design claim should follow this chain:

```txt
principle -> claim -> context -> warrant -> evidence family -> verification protocol -> boundary/debt
```

Evidence is not the gate. Evidence supports a claim only when the principle, gate, warrant, and boundary are explicit.

High-impact claims use the [claim record template](claims.md#claim-record-template). Low-risk prose can stay as prose when it does not approve, block, redirect, or hand off implementation work.

## Tree-Test Findability QA

Findability QA checks whether a reader can choose the correct route for a task without already knowing the repository structure.

Use this script for lightweight tree tests:

| Scenario | Start | Expected primary route | PASS condition |
| --- | --- | --- | --- |
| Build a homepage from raw content. | [README](../README.md) | [Webpage Generation Workflow](../guides/webpage-generation-workflow.md) | The reader chooses the workflow before a recipe or catalog entry. |
| Choose a layout for a screen with unknown constraints. | [README](../README.md) | [Layout Planning Guide](../GUIDE.md) | The reader starts with planning instead of a primitive. |
| Find a primitive for a known spatial problem. | [README](../README.md) | [Layout Pattern Catalog](../CATALOG.md) | The reader reaches the generated catalog. |
| Browse all spatial families. | [OKF index](../index.md) | [Pattern Categories](../patterns/index.md) | The reader reaches category-level browsing. |
| Verify whether a claim has enough evidence. | [README](../README.md) | [Quality Gates](index.md) | The reader reaches gates before evidence references. |
| Inspect validator coverage. | [Quality Gates](index.md) | [Executable Evidence Coverage](evidence/executable-evidence.md) | The reader can name what each validator proves and cannot prove. |
| Name an observed motion effect. | [README](../README.md) | [Motion Vocabulary](../motion/vocabulary.md) | The first selected route is Motion and the term reference is reached within two hops. |
| Review product-level interface craft. | [README](../README.md) | [Interface Craft Decisions](../design-engineering/interface-craft.md) | The first selected route is Design Engineering and shared quality gates remain visible. |
| Compare an Apple interaction convention. | [README](../README.md) | [Apple Interaction](../platform-guides/apple-interaction.md) | The first selected route is Platform Guides and source/version limits are reached within two hops. |
| Declare whether a consumer reference applies. | [README](../README.md) | [Consumer Reference](../consumer-reference/index.md) | The handoff reaches the shared contract without classifying it as a sixth domain. |
| Find the authority route for uGUI, UI Toolkit, or NGUI. | [README](../README.md) | [Unity UI Systems](../game-ui/unity/ui-systems.md) | The first selected route is Game UI, and the system-specific source and version boundary is reached within three hops. |

Record `PASS` only when the expected primary route is the first route selected. A link resolving successfully is not enough; the selected route must match the task intent.
