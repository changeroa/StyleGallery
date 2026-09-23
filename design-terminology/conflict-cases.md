---
type: Domain Guide
title: Cross-System Term Cases
description: Directly sourced terms and scoped relations for values, token resolution, interaction semantics, typography, components, and historical formats.
domain: design-terminology
lifecycle: experimental
---

# Cross-System Term Cases

Primary role: applied cross-system term relation record.

## Repository Boundary

This page applies the [typed relation model](relation-types.md) to recorded term records and conflict scenarios. It does not rename StyleGallery's own terms, and its relations are working judgments with boundaries, not claims that one source's definition is correct. V0.1 records these as Markdown; the structured registry is a promotion prerequisite.

## Reusable Method

1. Name the sources in tension and the terms or concepts being compared.
2. Record each side as a term record with source, kind, concept, status, and scope.
3. Assign one relation type per pair per explicit scope and declare its direction.
4. Write the non-equivalence boundary: where substitution breaks.
5. Stamp `reviewed_on`; re-verify when any involved source revises its term.

## Term Records

| Term | Label | Source (kind) | Concept | Status | Scope | Reviewed on |
| --- | --- | --- | --- | --- | --- | --- |
| `figma.variable` | Variable | [Figma](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes) (`design-tool`) | named-design-value | current | variable collection; dated help page | 2026-09-08 |
| `figma.mode` | Mode | [Figma](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes) (`design-tool`) | value-context | current | values selected within a collection | 2026-09-08 |
| `figma.collection` | Collection | [Figma](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes) (`design-tool`) | variable-organization | current | collection containing variables and modes | 2026-09-08 |
| `figma.component` | Component | [Figma](https://help.figma.com/hc/en-us/articles/360038662654-Guide-to-components-in-Figma) (`design-tool`) | tool-instance-model | current | reusable design object and its instances | 2026-09-08 |
| `dtcg.token` | Token | [DTCG](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/#design-token) (`specification`) | interchange-record | current | Format Module 2025.10 | 2026-09-21 |
| `dtcg.group` | Group | [DTCG](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/#groups) (`specification`) | token-organization | current | Format Module 2025.10 | 2026-09-21 |
| `dtcg.token.draft2` | Token | [DTCG](https://www.designtokens.org/tr/second-editors-draft/format/#design-token) (`specification`) | interchange-record | historical | Second Editors' Draft, 2022-06-14 | 2026-09-08 |
| `css.custom-property` | Custom property | [CSSWG](https://www.w3.org/TR/css-variables-1/#defining-variables) (`web-platform`) | runtime-value-slot | current | CSS Custom Properties Level 1 | 2026-09-21 |
| `carbon.component` | Component | [Carbon](https://carbondesignsystem.com/all-about-carbon/what-is-carbon/) (`design-system`) | published-ui-building-block | current | Carbon design and implementation resources | 2026-09-08 |
| `carbon.pattern` | Pattern | [Carbon](https://carbondesignsystem.com/patterns/overview/) (`design-system`) | workflow-guidance | current | Carbon patterns catalog | 2026-09-08 |
| `stylegallery.pattern` | Pattern | [StyleGallery](../layout/index.md) (`pattern-library`) | spatial-primitive | current | repository Layout corpus | 2026-09-08 |
| `dtcg.alias` | Alias | [DTCG](https://www.designtokens.org/tr/2025.10/format/#alias-reference) (`specification`) | token-value-reference | current | Format Module 2025.10 | 2026-09-21 |
| `fluent.alias-token` | Alias token | [Fluent 2](https://fluent2.microsoft.design/design-tokens#alias-tokens) (`design-system`) | semantic-design-value | current | dated Fluent token-layer guidance | 2026-09-21 |
| `fluent.global-token` | Global token | [Fluent 2](https://fluent2.microsoft.design/design-tokens#global-tokens) (`design-system`) | context-independent-design-value | current | dated Fluent token-layer guidance | 2026-09-21 |
| `carbon.color-token` | Token | [Carbon](https://carbondesignsystem.com/elements/color/overview/) (`design-system`) | theme-stable-color-role | current | Carbon color role and theme guidance | 2026-09-21 |
| `dtcg.resolver-modifier` | Modifier | [DTCG Resolver](https://www.designtokens.org/tr/2025.10/resolver/#modifiers) (`specification`) | conditional-token-source-selection | current | Resolver Module 2025.10 | 2026-09-21 |
| `html.popover` | Popover | [WHATWG HTML](https://html.spec.whatwg.org/multipage/popover.html) (`web-platform`) | temporary-presentation-mechanism | current | HTML popover attribute and APIs | 2026-09-21 |
| `apple.popover` | Popover | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/popovers) (`platform-guideline`) | native-transient-presentation | current | dated HIG with per-platform considerations | 2026-09-21 |
| `html.dialog` | Dialog | [WHATWG HTML](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element) (`web-platform`) | native-dialog-element | current | native HTML dialog without role override | 2026-09-21 |
| `aria.dialog` | Dialog | [WAI-ARIA](https://www.w3.org/TR/wai-aria-1.2/#dialog) (`specification`) | accessible-dialog-role | current | WAI-ARIA 1.2 dialog semantics | 2026-09-21 |
| `apple.text-style` | Text style | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/typography) (`platform-guideline`) | native-typography-role-and-scaling | current | system text-style guidance and text-size adaptation | 2026-09-21 |
| `fluent.type-ramp` | Type ramp | [Fluent 2](https://fluent2.microsoft.design/typography#type-ramp) (`design-system`) | platform-typography-role-collection | current | dated Fluent platform type guidance | 2026-09-21 |
| `material3.typography` | Typography | [Material 3 Compose](https://developer.android.com/develop/ui/compose/designsystems/material3#typography) (`design-system`) | implemented-typography-role-collection | current | Compose implementation surface of Material 3 | 2026-09-21 |
| `dtcg.typography` | Typography | [DTCG](https://www.designtokens.org/tr/2025.10/format/#typography) (`specification`) | composite-typography-record | current | Format Module 2025.10 | 2026-09-21 |
| `css.font` | font | [CSSWG](https://www.w3.org/TR/css-fonts-4/#font-prop) (`web-platform`) | runtime-font-shorthand | current | CSS Fonts Level 4 font shorthand | 2026-09-21 |

The external locators and local Layout contract were rechecked on the dates shown. Current status is bounded by the named source/version, not a promise about every later release. Concept labels are local classification summaries.

## Recorded Relations

| From | To | Type | Scope | Direction | Boundary | Reviewed on |
| --- | --- | --- | --- | --- | --- | --- |
| `figma.variable` | `dtcg.token` | `partial_overlap` | value-interchange | symmetric | Exportable design values overlap; Figma prototype values need not be tokens, while the format has composite structures not supplied by one scalar variable | 2026-09-08 |
| `css.custom-property` | `dtcg.token` | `implementation_representation` | token-to-css-output | directional | A custom property can consume a translated token value; it also holds non-design values and does not preserve the entire token record | 2026-09-08 |
| `figma.collection` | `dtcg.group` | `partial_overlap` | value-organization | symmetric | Both organize named values; a Figma collection includes modes, while a format group can nest groups and carry format-specific metadata | 2026-09-08 |
| `figma.mode` | `dtcg.group` | `not_comparable` | context-versus-containment | symmetric | A mode selects value context; a group organizes token records. Containment alone does not choose the active context | 2026-09-08 |
| `figma.component` | `carbon.component` | `same_label_different_meaning` | handoff-artifact-identity | symmetric | A reusable tool object and a system-published UI unit share a label; a design instance is not by itself the system's implementation contract | 2026-09-08 |
| `carbon.pattern` | `stylegallery.pattern` | `partial_overlap` | reusable-interface-guidance | symmetric | Both describe reusable interface arrangements; Carbon includes task sequences and flows, while StyleGallery Layout covers spatial constraints without those interaction contracts | 2026-09-08 |
| `carbon.component` | `carbon.pattern` | `not_comparable` | catalog-unit-subtyping | symmetric | Composition is not set containment: a workflow can use components without being a broader class whose instances include component instances | 2026-09-08 |
| `dtcg.token.draft2` | `dtcg.token` | `near_equivalent` | versioned-token-concept | symmetric | The named-value interchange concept overlaps; the 2022 draft and 2025.10 format have different conformance details, so historical files need version-specific validation | 2026-09-08 |
| `fluent.alias-token` | `dtcg.alias` | `partial_overlap` | semantic-layer-versus-reference | symmetric | Semantic values can use references; a DTCG reference need not carry a semantic role, while a flattened semantic export can lose its reference edge | 2026-09-21 |
| `fluent.alias-token` | `carbon.color-token` | `partial_overlap` | role-oriented-color-values | symmetric | Both cover role-oriented color decisions; Fluent aliases also cover non-color values, while Carbon defines its own theme and layer roles without a one-to-one Fluent mapping | 2026-09-21 |
| `fluent.global-token` | `dtcg.token` | `partial_overlap` | named-design-value-interchange | symmetric | Global values can be encoded as token records; Fluent's values are not intrinsically DTCG files, and DTCG records also express context-specific decisions beyond Fluent global values | 2026-09-21 |
| `dtcg.resolver-modifier` | `dtcg.group` | `not_comparable` | organization-versus-resolution | symmetric | A modifier selects conditional token sources, while a group organizes records; neither grouping nor a group name supplies the resolver's input selection | 2026-09-21 |
| `html.popover` | `apple.popover` | `partial_overlap` | temporary-content-presentation | symmetric | Temporary related content can fit both; HTML supplies a generic mechanism for varied semantics, while HIG adds native presentation and adaptation conventions that HTML does not supply | 2026-09-21 |
| `html.dialog` | `aria.dialog` | `implementation_representation` | web-dialog-semantics | directional | The native HTML element can represent dialog semantics and adds lifecycle behavior; other markup can carry the ARIA role without acquiring that native behavior | 2026-09-21 |
| `apple.text-style` | `dtcg.typography` | `partial_overlap` | typographic-attribute-exchange | symmetric | Static typography attributes overlap; native style scaling is outside the composite record, while DTCG records can describe styles outside Apple's system | 2026-09-21 |
| `css.font` | `dtcg.typography` | `implementation_representation` | partial-typography-output | directional | The CSS shorthand can consume translated font attributes but omits letter spacing and source metadata, so additional output and provenance are required | 2026-09-21 |
| `material3.typography` | `fluent.type-ramp` | `partial_overlap` | named-typography-roles | symmetric | Both organize typographic roles, but Compose exposes Material-specific slots while Fluent defines target-specific ramps; their role inventories and defaults are not interchangeable | 2026-09-21 |

## Scenario A: Component Versus Pattern

Query phrasing: `component versus pattern terminology`, `difference between component and pattern across design systems`.

Distinguish Figma's design object from Carbon's published component before comparing either with a pattern. `figma.component` and `carbon.component` use `same_label_different_meaning`. Within Carbon, components participate in patterns; composition does not establish the set-theoretic `broader_than` relation. Carbon and StyleGallery patterns have `partial_overlap` within reusable interface guidance, with different behavioral boundaries.

## Scenario B: Variable, Design Token, And CSS Custom Property

Query phrasing: `figma variable design token custom property`.

These are different labels from three source kinds. Their relation is not the same-label case. `figma.variable` and `dtcg.token` have `partial_overlap`; `css.custom-property` → `dtcg.token` is `implementation_representation`, with the representation first. A tool-to-code binding requires a consumer-owned translation; it does not establish equivalence or guarantee a lossless round trip.

## Scenario C: Historical And Current Token Formats

Query phrasing: `historical design token format`, `DTCG second editors draft versus 2025.10`.

The retained 2022 source describes a historical draft. The versioned 2025.10 source describes an intended-for-implementation format. Both remain records; a common label does not make their file contracts identical. The relation is `near_equivalent` for the concept, not `renamed_to`: the label did not change. Neither Community Group report is a W3C Recommendation.

## Scenario D: Style Guide Versus Design System

Query phrasing: `style guide versus design system`.

Result: insufficient context until an organization and dated source are named on both sides. “Industry history” cannot stand in for a specific historical style guide. Do not create a universal rename or deprecation event; request the two sources and then use the [Comparison Workflow](comparison-workflow.md).

## Scenario E: Alias, Role, And Resolution

Query phrasing: `Fluent alias DTCG reference`, `semantic token group theme resolver`.

[Token Semantics And Resolution](token-semantics.md) compares semantic layering, reference edges, role-oriented color, group organization, and resolver selection. Record the selected context and translation losses; equal rendered values do not establish equivalent roles.

## Scenario F: Dialog And Popover

Query phrasing: `HTML popover Apple popover`, `dialog element ARIA dialog difference`.

[Dialog And Popover Semantics](interaction-semantics.md) separates native vocabulary, web presentation mechanisms, accessibility roles, and the consumer's task. Carry the relation boundary into the implementation handoff instead of using a component name as a behavior specification.

## Scenario G: Type Style, Type Ramp, And Font Output

Query phrasing: `Dynamic Type typography token`, `Material Typography Fluent type ramp`, `CSS font DTCG typography`.

[Typography Semantics](typography-semantics.md) distinguishes one style from a role collection and a runtime representation. Native scaling and missing output properties remain explicit translation work.

## Opinionated Guidance

- Resolve a conflict only after naming every source involved; silent resolution creates the next conflict.
- Prefer surface-prefixed translations over merged definitions when handing off.
- StyleGallery's own [Controlled Vocabulary](../guides/vocabulary.md) stays authoritative inside this repository.
- Add a case only with at least two named, cited sources in genuine tension.

## Platform-Specific Guidance

When a case involves a platform guideline source, cite that platform's surface and route deeper convention comparison to [Platform Guides](../platform-guides/index.md); engine terms route to Game UI; motion terms to Motion.

## Unsupported Absolutes

- A working relation is not a standard.
- One source's revision does not obligate others to follow.
- A recorded case does not close the conflict outside its boundary.
- Tool feature names do not settle system-layer definitions.

## Verification Contract

Run `node scripts/validate-design-terminology.mjs --json` and `node scripts/test-validate-design-terminology.mjs` after editing. The [fixture runner](../scripts/test-validate-design-terminology.mjs) checks rejection of invalid records and relations. Verify both direct source locators, the comparison scope, direction, and boundary against the [relation definitions](relation-types.md). The validator checks record shape and graph invariants; semantic accuracy still requires source review. Re-review when a named source changes the cited meaning.

## Source, License, And Attribution

Locally authored summaries and judgments, with direct source links per term. Rechecked 2026-09-08: Figma variables/components, DTCG 2025.10 and second draft, CSS Custom Properties Level 1, Carbon system/pattern pages, and the local Layout hub. No source prose or code samples are copied. This is an author source review, not independent semantic approval.

Rechecked 2026-09-21: DTCG Format and Resolver 2025.10, Fluent tokens and typography, Carbon color overview/usage, WHATWG dialog/popover, WAI-ARIA 1.2 dialog, Apple HIG popovers/typography, Material 3 Compose typography, and CSS Fonts/Custom Properties. Apple bodies were inspected through official documentation JSON. Older record dates remain their original review bounds; this session did not recheck Figma, the historical DTCG draft, Carbon component/pattern meaning, or local Layout term meaning.

## IA Navigation

Parent: [Design Terminology](index.md).
Next: [Design Term Comparison Workflow](comparison-workflow.md).
