---
type: Domain Guide
title: Native Interaction Contracts
description: Choose disclosure, dialog, popover, menu, and combobox behavior by semantics, focus, dismissal, and input ownership.
domain: design-engineering
lifecycle: experimental
provenance_kind: local
reviewed_on: 2026-09-21
---

# Native Interaction Contracts

Primary role: product component selection and behavior guide.

## Repository Boundary

This guide extends the [Component Contract](component-contract.md) with source-backed decisions for native HTML and custom composites. It owns product behavior, not reusable Layout CSS. The [shared accessibility evidence contract](../quality/evidence/accessibility.md) remains the authority for evidence claims.

## Reusable Method

Write the user's task, the information being exposed, whether background interaction remains available, and what closes the surface. Choose semantics before appearance. Then assign keyboard, focus, pointer, and state ownership. A floating rectangle is insufficient information to choose a component.

### Mechanisms And Obligations

| Source | Bounded finding | Consumer responsibility |
| --- | --- | --- |
| [HTML interactive elements](https://html.spec.whatwg.org/multipage/interactive-elements.html) | `details` is a disclosure; `dialog` supports distinct modal and nonmodal presentation. `showModal()` participates in the modal/inert model. | Choose the right behavior, accessible name, initial focus, and close policy. |
| [HTML popover](https://html.spec.whatwg.org/multipage/popover.html) | The attribute adds presentation behavior to elements with their own semantics; custom menu keyboard behavior still needs implementation. | Select a semantic element or role and implement its interaction contract. |
| [APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | The pattern describes contained keyboard navigation, focus placement, and return. Initial focus depends on content and task. | Test focus with long content and a missing invocation control. |
| [APG menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) | A menu button opens a menu of actions or functions with the menu keyboard model. | Do not assign menu roles solely because links appear in a dropdown. |
| [APG combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | A combobox has a value and a popup with defined keyboard/state relationships. | Specify text editing, suggestion navigation, selection, and escape separately. |
| [APG disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) | The disclosure control exposes expanded/collapsed state and toggles associated content. | Keep the control name, state, and controlled content consistent. |
| [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/#aria-disabled) | `aria-disabled` communicates disabled semantics. It does not implement event suppression. | Prevent disallowed activation in the application's actual event paths. |

HTML is a Living Standard; WAI-ARIA 1.2 is a Recommendation; APG is informative implementation guidance. Sources were inspected 2026-09-21. Pattern examples do not establish support for an unspecified browser and assistive-technology combination.

### Selection Questions

| User need | Starting point | Question that can change the choice |
| --- | --- | --- |
| Reveal optional explanatory content | Native disclosure | Does this actually switch mutually exclusive views or choose a value? |
| Complete a bounded task while background interaction is unavailable | Modal dialog | Must the user compare or interact with the background during this task? |
| Temporarily expose nonmodal related content | Semantically appropriate element with popover behavior | Is the content a menu, a list of links, a form, or plain information? |
| Invoke commands from a compact control | Menu button and menu behavior | Are these ordinary navigation links better served by ordinary link navigation? |
| Edit a value with selectable suggestions | Combobox | Is an ordinary input, select, or separate search-result list sufficient? |

These are local selection heuristics. Similar visuals can correctly produce different DOM, focus, and keyboard behavior.

### Worked Contract: Edit A Record

The user opens an editor from a list row. The consumer chooses a modal because this task intentionally suspends interaction with the list. Save commits a submitted snapshot; Close requests dismissal; an unsaved-change decision belongs to the state owner.

| Stage | Decision to record | Adversarial case |
| --- | --- | --- |
| Open | Accessible name and initial focus target | Long introduction would be scrolled out of view by focusing the first input. |
| Edit | Draft lifetime and field-error relationship | Background data refresh replaces the edited row. |
| Save | Request identity and pending activation rule | Enter and a pointer click arrive before the request settles. |
| Dismiss | Which paths request close and which discard changes | Escape, an outside interaction, and an explicit Cancel have different intended meanings. |
| Return | Valid focus destination after closing | The original row was deleted or filtered out. |

Compose [submitted snapshot](state-management/patterns/submitted-snapshot.md), [single flight](state-management/patterns/single-flight.md), and [unsaved navigation](state-management/patterns/unsaved-navigation.md) as needed. Animation completion cannot authorize a write or decide whether a draft is disposable.

### Preserve Editing Inside Composites

An editable combobox has at least two responsibilities: editing text and navigating candidate options. Specify when Arrow keys move a candidate, when Enter accepts it, and when Escape dismisses suggestions while retaining the typed text. During IME composition, those keys may belong to the input method; follow [Text Input And Internationalization](text-input-and-internationalization.md).

A disabled-looking control needs a deliberate discoverability policy. Native `disabled` and `aria-disabled` have different behavior; choose which focus and activation behavior the task requires, and explain why an action is unavailable without relying only on color.

## Opinionated Guidance

Prefer native semantics when they fit the task, and build the smallest custom behavior that remains necessary. Name the semantic reason for every role override. Treat multiple open surfaces as an ownership question: which surface receives Escape, where focus stays, and which state survives dismissal.

## Platform-Specific Guidance

Native HTML behavior, browser support, and accessibility mappings are separate from framework component names. Record the browser, framework adapter, and assistive technology used in verification. A native platform's “popover” does not settle the web contract; compare [Interaction Semantics](../design-terminology/interaction-semantics.md) and [Platform Adaptation](../platform-guides/adaptation-workflow.md).

## Unsupported Absolutes

Top-layer presentation does not imply modality. A role does not supply keyboard handlers. Native HTML does not remove the need for an accessible name or target verification. Escape does not intrinsically mean “discard all work.”

## Verification Contract

The proposed matrix includes keyboard-only opening and closing, forward/backward Tab, active popup navigation, IME input, a removed opener, nested surface dismissal, long content, zoom, and reduced motion. Check visible behavior, DOM state, accessibility semantics, and the actual announcement path separately.

Record the selected widget model and expected key behavior before testing. Passing a self-written handler test establishes that handler's behavior, not conformance with APG or the platform. Compare observed behavior with the cited contract. No browser or screen-reader execution is claimed by this guide. Re-review when the widget model, browser, or focus owner changes.

## Source, License, And Attribution

Locally authored synthesis of the official sources linked above, inspected 2026-09-21. No upstream examples or implementation are reproduced. `consumer_reference: not_applicable` because this guide selects no consumer component record.

## IA Navigation

Parent: [Design Engineering](index.md).
Next: [Text Input And Internationalization](text-input-and-internationalization.md).
