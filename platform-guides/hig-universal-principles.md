---
type: Domain Guide
title: Apple HIG Universal Principles Extraction
description: Dated, paraphrased extraction of Apple Human Interface Guidelines principles classified as universal, adapt, or apple-specific, with WCAG 2.2, Material 3, and WAI-ARIA APG counterparts.
aliases: ["HIG principles","HIG audit checklist","universal design principles","apple-specific vs universal"]
questions: ["Which Apple HIG principles apply to a web product and which are Apple-specific?","What WCAG criterion corresponds to an HIG accessibility principle?"]
domain: platform-guides
lifecycle: experimental
provenance_kind: local
platform: Apple Human Interface Guidelines (Foundations, Patterns, Components, Inputs, Technologies)
platform_version: dated living-document review; recheck against the official documentation data before relying on a principle
reviewed_on: 2026-10-19
---

# Apple HIG Universal Principles Extraction

Primary role: dated principle extraction and audit index.

## Repository Boundary

This page and its machine-readable companion, [`hig-universal-principles.json`](hig-universal-principles.json), record which Apple Human Interface Guidelines (HIG) themes carry over to web and cross-platform products. Every statement is a StyleGallery paraphrase with a link to the official page. No HIG prose, tables, images, or sequences are reproduced, and nothing here implies affiliation with Apple.

The extraction follows the [Apple Interaction](apple-interaction.md) boundary: comparison, not imitation. Apple system materials, typefaces, symbols, hardware controls, and brand marks are recorded only so that an audit can skip them. They are never web defaults. Layout owns spatial mechanics, Design Engineering owns component behavior, and shared quality owns accessibility evidence. No value from this page enters `layout/**`, `patterns/**`, or reusable Layout CSS.

## Reusable Method

### Source Walk

On 2026-10-19 the [HIG documentation index](https://developer.apple.com/tutorials/data/design/human-interface-guidelines.json) was walked through its five guidance sections: [Foundations](https://developer.apple.com/design/human-interface-guidelines/foundations), [Patterns](https://developer.apple.com/design/human-interface-guidelines/patterns), [Components](https://developer.apple.com/design/human-interface-guidelines/components) (including every page under its eight groups), [Inputs](https://developer.apple.com/design/human-interface-guidelines/inputs), and [Technologies](https://developer.apple.com/design/human-interface-guidelines/technologies). The per-platform Getting Started overviews are out of scope.

All 149 pages reached by that walk appear in the JSON `source_pages` inventory with one disposition:

| Disposition | Count | Meaning |
| --- | --- | --- |
| `extracted` | 95 | The page yields one or more principles listed below. |
| `covered` | 8 | The page's transferable idea is already captured by the named `covered_by` principle on another page. |
| `excluded` | 46 | The page depends on Apple hardware, system surfaces, or services with no web default; the JSON records the reason. |

### Classification

| Class | Count | Rule |
| --- | --- | --- |
| `universal` | 147 | The principle holds on the web and on other platforms without translating an Apple mechanism. |
| `adapt` | 34 | The goal is universal, but HIG expresses it through an Apple mechanism or value. The `class_reason` names the web or cross-platform counterpart to use instead. |
| `apple-specific` | 6 | The guidance depends on Apple hardware, system rendering, licensing, or brand assets. Treat it as a do-not-imitate check. |

### Record Shape

Each JSON principle carries `id` (`hig.<section>.<page>.<slug>`), `statement`, `source_url`, `class`, `class_reason`, `wcag` (WCAG 2.2 success criteria), `material3` and `apg` (keys into the record's reference dictionaries, or `null`), `verification_question`, and `reviewed_on`. The record also declares `review_by`, which the [evidence-freshness audit](../GOVERNANCE.md) reads as an explicit review deadline.

### Using It In An Audit

1. Filter principles to `universal` and `adapt` for a web product; keep `apple-specific` entries as imitation checks.
2. For each principle, ask its `verification_question` against the real surface and record pass, fail, or not applicable with evidence.
3. Use the mapped WCAG criterion as the normative test where one exists. The HIG link supplies context only.
4. For `adapt` entries, verify the named web counterpart, not the Apple mechanism.

## Principles

### Foundations

| ID | Class | Principle | WCAG 2.2 |
| --- | --- | --- | --- |
| `hig.foundations.accessibility.target-size` | `adapt` | Give every interactive control a hit area and surrounding spacing large enough that a person with limited dexterity reliably activates the intended control. | 2.5.8, 2.5.5 |
| `hig.foundations.accessibility.text-resize` | `adapt` | Let people enlarge text without losing content, controls, or reading order. | 1.4.4, 1.4.10, 1.4.12 |
| `hig.foundations.accessibility.contrast` | `universal` | Keep text, icons, and control boundaries distinguishable from their background in every supported appearance. | 1.4.3, 1.4.11 |
| `hig.foundations.accessibility.not-color-alone` | `universal` | Never make color the only carrier of status, meaning, or interactivity; pair it with text, shape, or position. | 1.4.1 |
| `hig.foundations.accessibility.assistive-names` | `universal` | Expose a meaningful name, role, and current state for every control and informative image to assistive technology. | 1.1.1, 4.1.2 |
| `hig.foundations.accessibility.media-alternatives` | `universal` | Offer text-based and described alternatives such as captions, transcripts, and audio description for audio and video content. | 1.2.2, 1.2.5 |
| `hig.foundations.accessibility.multimodal-cues` | `universal` | When a cue is delivered by sound or vibration, deliver the same information through a visible channel too. | 1.3.3 |
| `hig.foundations.accessibility.gesture-alternatives` | `universal` | Keep common actions reachable with simple single-pointer input and provide an alternative for any path-based, multi-finger, or drag gesture. | 2.5.1, 2.5.7 |
| `hig.foundations.accessibility.keyboard-only` | `universal` | Make the whole experience operable with a keyboard alone, with a visible focus indicator and no traps. | 2.1.1, 2.1.2, 2.4.7 |
| `hig.foundations.accessibility.label-in-name` | `adapt` | Make the spoken name of each control match its visible label so voice-input users can target it by saying what they see. | 2.5.3 |
| `hig.foundations.accessibility.time-limits` | `universal` | Avoid interface elements that expire on a timer; when a limit is unavoidable, let people extend or turn it off. | 2.2.1 |
| `hig.foundations.accessibility.flashing-and-fast-motion` | `universal` | Let people stop moving or blinking content and avoid flashes that can trigger seizures. | 2.3.1, 2.2.2 |
| `hig.foundations.color.consistent-meaning` | `universal` | Assign each color one meaning and keep that meaning stable across the product. | 3.2.4 |
| `hig.foundations.color.appearance-coverage` | `universal` | Check every color pairing in each appearance the product ships, including high-contrast modes, and under varied ambient lighting. | 1.4.3, 1.4.11 |
| `hig.foundations.color.semantic-roles` | `adapt` | Reference colors through named semantic roles that resolve per appearance, rather than hard-coding literal values. | - |
| `hig.foundations.color.cultural-meaning` | `universal` | Consider that color connotations differ across cultures and regions before attaching meaning to a hue. | - |
| `hig.foundations.color.glass-tinting` | `apple-specific` | Tinting rules for Apple's system glass material describe an Apple-rendered surface and are not a web default. | - |
| `hig.foundations.dark-mode.follow-system-appearance` | `adapt` | Follow the person's system-wide light or dark preference by default. | - |
| `hig.foundations.dark-mode.both-appearances` | `universal` | Make content, images, and icons legible and well-balanced in both light and dark appearances. | 1.4.3, 1.4.11 |
| `hig.foundations.dark-mode.soften-bright-backgrounds` | `universal` | Avoid pure, glaring white backgrounds in dark contexts; dim large bright surfaces so they do not overpower nearby content. | - |
| `hig.foundations.icons.single-concept` | `universal` | Design each interface icon around one simplified, recognizable concept and keep the icon family visually consistent. | - |
| `hig.foundations.icons.text-alternative` | `universal` | Give every icon-only control a text alternative that names its action. | 1.1.1, 4.1.2 |
| `hig.foundations.icons.vector-and-optical-alignment` | `universal` | Prefer vector formats for interface icons and align them optically with adjacent text. | - |
| `hig.foundations.images.density-ready` | `adapt` | Deliver images that stay sharp at every display density the product supports, preferring vector art for flat graphics. | - |
| `hig.foundations.images.real-device-check` | `universal` | Verify artwork on real target displays, not only in design tools. | - |
| `hig.foundations.inclusion.plain-language` | `universal` | Write in plain language, define specialist terms, and avoid idioms that do not translate. | 3.1.3 |
| `hig.foundations.inclusion.respectful-reference` | `universal` | Refer to people respectfully, use people-first wording about disability, and avoid assumptions about identity. | - |
| `hig.foundations.inclusion.inclusive-imagery` | `universal` | Choose imagery and examples that represent a broad range of people and do not exclude people with disabilities. | - |
| `hig.foundations.layout.importance-order` | `universal` | Order content by importance so the most relevant information comes first in both visual and reading order. | 1.3.2, 2.4.3 |
| `hig.foundations.layout.group-related` | `universal` | Group related items and use alignment and indentation to express hierarchy. | 1.3.1 |
| `hig.foundations.layout.progressive-disclosure` | `universal` | Reveal secondary detail on demand rather than showing everything at once. | - |
| `hig.foundations.layout.adapt-to-space` | `adapt` | Base layout changes on the space actually available, keeping functionality the same and changes recognizable as size changes. | 1.4.10, 1.3.4 |
| `hig.foundations.layout.controls-vs-content` | `universal` | Make controls visually distinguishable from the content they act on. | 1.4.11 |
| `hig.foundations.layout.safe-regions` | `adapt` | Keep controls and essential content out of regions that hardware or system interface may cover. | 2.4.11 |
| `hig.foundations.materials.system-material` | `apple-specific` | Apple's translucent system materials, including Liquid Glass, are rendered by Apple frameworks and are not a pattern to recreate on the web. | - |
| `hig.foundations.materials.legibility-over-translucency` | `adapt` | When content sits over any translucent or blurred surface, verify legibility against the worst-case background, not the typical one. | 1.4.3, 1.4.11 |
| `hig.foundations.motion.purposeful` | `universal` | Use motion only where it communicates status, feedback, or spatial relationship, and keep it from dominating the task. | - |
| `hig.foundations.motion.optional` | `adapt` | Make motion optional and provide an equivalent non-moving presentation when people reduce motion. | 2.3.3, 2.2.2 |
| `hig.foundations.motion.brief-and-cancelable` | `universal` | Keep feedback motion short and precise, and let people interrupt or cancel it without waiting. | 2.2.2 |
| `hig.foundations.motion.avoid-frequent` | `universal` | Avoid animating interactions that people repeat many times in a session. | - |
| `hig.foundations.privacy.minimal-data` | `universal` | Collect only data the feature genuinely needs and explain how it is used. | - |
| `hig.foundations.privacy.ask-in-context` | `universal` | Request access to sensitive resources at the moment a feature needs it, with copy that explains why, rather than at first launch. | - |
| `hig.foundations.privacy.no-misleading-preprompt` | `universal` | Never place a screen before a system permission prompt that pressures, confuses, or misrepresents the choice. | - |
| `hig.foundations.privacy.beyond-passwords` | `adapt` | Offer authentication that does not rely only on a memorized password, such as passkeys. | 3.3.8 |
| `hig.foundations.right-to-left.mirror-interface` | `universal` | Mirror interface direction for right-to-left scripts, flipping controls that express reading order or progress. | 1.3.2 |
| `hig.foundations.right-to-left.numerals-and-real-direction` | `universal` | Keep the digits within a number in their natural order and keep icons that depict physical direction or real objects unflipped. | - |
| `hig.foundations.right-to-left.align-by-language` | `universal` | Align each paragraph according to its own language, not the surrounding interface direction. | 3.1.2 |
| `hig.foundations.sf-symbols.system-symbol-set` | `apple-specific` | Apple's symbol set is licensed for Apple platforms and integrates with Apple's system font; it is not an icon source for web products. | - |
| `hig.foundations.branding.brand-defers-to-content` | `universal` | Express brand through voice, accent color, and type while keeping standard components and letting content stay primary. | - |
| `hig.foundations.branding.no-brand-gate` | `universal` | Do not use launch or loading screens, or repeated logos, as branding moments that delay people. | - |
| `hig.foundations.typography.legible-defaults` | `adapt` | Use default text sizes most people read comfortably and avoid very thin weights for body text. | 1.4.4, 1.4.12 |
| `hig.foundations.typography.hierarchy-few-typefaces` | `universal` | Build hierarchy with size, weight, and color, and keep the number of typefaces small. | 1.3.1 |
| `hig.foundations.typography.system-fonts` | `apple-specific` | Apple's system typefaces are licensed for Apple platforms; the web counterpart is the system-ui stack, not a bundled copy of Apple fonts. | - |
| `hig.foundations.typography.prioritize-on-resize` | `universal` | When text grows, keep the most important content visible and let layout reflow instead of truncating it. | 1.4.4, 1.4.10 |
| `hig.foundations.writing.clear-and-action-oriented` | `universal` | Label actions with specific verbs and keep copy short, clear, and suited to each screen's purpose. | 2.4.6, 2.4.4 |
| `hig.foundations.writing.consistent-language` | `universal` | Use the same term for the same thing and the same capitalization style throughout, especially across multi-step flows. | 3.2.4 |
| `hig.foundations.writing.empty-states-next-step` | `universal` | Give every empty screen a clear next step. | - |
| `hig.foundations.writing.helpful-errors` | `universal` | Write error messages that say what went wrong and how to fix it, in a neutral tone. | 3.3.1, 3.3.3 |

### Patterns

| ID | Class | Principle | WCAG 2.2 |
| --- | --- | --- | --- |
| `hig.patterns.charting-data.accessible-charts` | `universal` | Make every chart understandable without sight and without color, with a text summary of its key insight. | 1.1.1, 1.4.1 |
| `hig.patterns.charting-data.simple-then-detail` | `universal` | Prefer familiar chart types and a simple default view, letting people choose to see more detail. | - |
| `hig.patterns.collaboration-and-sharing.clear-sharing-scope` | `universal` | Describe who can access shared content and what they can do in short, plain phrases before sharing. | - |
| `hig.patterns.drag-and-drop.non-drag-alternative` | `universal` | Offer a non-dragging way to perform anything that drag and drop can do. | 2.5.7, 2.1.1 |
| `hig.patterns.drag-and-drop.drop-target-feedback` | `universal` | Show whether a destination accepts the dragged item and what the drop will do. | - |
| `hig.patterns.drag-and-drop.undoable-drop` | `universal` | Let people undo a drop, especially one that moves rather than copies. | - |
| `hig.patterns.entering-data.prefer-choices` | `universal` | Offer choices, defaults, and pasting instead of free text entry where possible. | 3.3.7 |
| `hig.patterns.entering-data.autofill-input-purpose` | `adapt` | Obtain known information from the system rather than asking for it again. | 1.3.5, 3.3.7 |
| `hig.patterns.entering-data.validate-early` | `universal` | Check values as people work and make required information clear before they try to continue. | 3.3.1, 3.3.2, 3.3.3 |
| `hig.patterns.entering-data.protect-secrets` | `universal` | Mask secret entry and never prefill a password field with a stored value visible to others. | - |
| `hig.patterns.feedback.accessible-feedback` | `universal` | Deliver status feedback in ways every person can perceive, including assistive technology. | 4.1.3 |
| `hig.patterns.feedback.warn-before-irreversible` | `universal` | Warn before an action causes unexpected, irreversible data loss. | 3.3.4 |
| `hig.patterns.feedback.explain-unavailable` | `universal` | When a command cannot run, show that it is unavailable and explain why. | - |
| `hig.patterns.file-management.work-is-preserved` | `universal` | Keep people's work safe automatically unless they explicitly discard it. | - |
| `hig.patterns.going-full-screen.keep-essentials-and-exit` | `universal` | In full-screen views, keep essential controls reachable and let people choose when to leave. | 2.1.2 |
| `hig.patterns.going-full-screen.resume-position` | `universal` | When people return to a full-screen experience, resume where they left off. | - |
| `hig.patterns.launching.fast-start` | `universal` | Show the first usable screen as quickly as possible and avoid splash screens that only delay. | - |
| `hig.patterns.launching.restore-state` | `universal` | Bring back the prior view, selection, and position when someone returns, so the session picks up without rework. | - |
| `hig.patterns.loading.show-something-soon` | `universal` | Display available content immediately and fill in the rest as it loads. | - |
| `hig.patterns.loading.communicate-progress` | `universal` | Make clear that content is loading and, when possible, how long it will take. | 4.1.3 |
| `hig.patterns.loading.non-blocking-wait` | `universal` | Let people keep using other parts of the product while content loads. | - |
| `hig.patterns.managing-accounts.delay-sign-in` | `universal` | Let people explore before requiring registration, and explain what an account gives them when you do ask. | - |
| `hig.patterns.managing-accounts.clear-account-deletion` | `universal` | Provide an easy-to-find way to delete an account, consistent across app and website. | - |
| `hig.patterns.managing-accounts.name-auth-method` | `adapt` | Name the authentication methods that are actually available in the current context. | 3.3.8 |
| `hig.patterns.managing-notifications.honest-urgency` | `universal` | Represent each notification's urgency accurately and never use urgent channels for marketing. | - |
| `hig.patterns.managing-notifications.consent-and-control` | `universal` | Get explicit permission for promotional notifications and let people manage notification settings inside the product. | - |
| `hig.patterns.modality.modal-only-when-needed` | `universal` | Use modal presentation only when focusing on a short, self-contained task brings a clear benefit. | - |
| `hig.patterns.modality.obvious-dismiss` | `universal` | Every modal view needs a clear exit, and closing it must not silently discard work in progress. | 2.1.2 |
| `hig.patterns.modality.one-modal-at-a-time` | `universal` | Avoid stacking modal views; close one before presenting another. | - |
| `hig.patterns.multitasking.pause-when-hidden` | `adapt` | Pause activities that need attention when people switch away, and resume smoothly. | - |
| `hig.patterns.offering-help.task-based-help` | `universal` | Shape help around the tasks people perform, using consistent wording and imagery. | 3.2.6 |
| `hig.patterns.offering-help.short-dismissible-tips` | `universal` | Keep tips brief and actionable, and make them dismissible without moving focus or hiding content. | 1.4.13 |
| `hig.patterns.onboarding.learn-by-doing` | `universal` | Teach through interaction in context rather than through long upfront tutorials. | - |
| `hig.patterns.onboarding.optional-and-brief` | `universal` | Keep any required onboarding short, make tutorials optional, and postpone nonessential setup. | - |
| `hig.patterns.playing-audio.respect-sound-settings` | `adapt` | Respect people's silence and volume choices and never start sound unexpectedly. | 1.4.2 |
| `hig.patterns.playing-haptics.haptics-supplement` | `adapt` | Treat haptics as optional reinforcement of feedback that is already visible. | 1.3.3 |
| `hig.patterns.playing-video.preserve-aspect-ratio` | `universal` | Show video at its original aspect ratio without stretching or cropping essential content. | - |
| `hig.patterns.playing-video.expected-controls` | `adapt` | Support the playback interactions people expect for their input device, preferring the platform's player. | 2.1.1 |
| `hig.patterns.printing.discoverable-relevant-printing` | `universal` | Offer printing only when output is meaningful, and keep frequently used print options separate from advanced ones. | - |
| `hig.patterns.ratings-and-reviews.ask-at-good-moments` | `universal` | Ask for feedback only after people have engaged, never mid-task, and not repeatedly. | - |
| `hig.patterns.searching.prominent-search` | `universal` | When finding things is central to the product, put search in a prominent, stable location with one entry point. | 3.2.3 |
| `hig.patterns.searching.visible-scope-and-suggestions` | `universal` | Show the current search scope and offer suggestions to reduce typing. | 4.1.3 |
| `hig.patterns.searching.private-history` | `universal` | Consider privacy before displaying recent searches, and let people clear them. | - |
| `hig.patterns.settings.good-defaults-few-settings` | `universal` | Choose defaults that serve most people and keep the number of settings small. | - |
| `hig.patterns.settings.respect-system-preferences` | `adapt` | Honor system-wide preferences rather than duplicating them in product settings. | - |
| `hig.patterns.settings.options-in-context` | `universal` | Let people adjust task-specific options where they work rather than in a distant settings area. | - |
| `hig.patterns.undo-and-redo.predictable-undo` | `universal` | Make undo predictable: describe what will be undone, show its result, and allow multiple steps. | - |
| `hig.patterns.undo-and-redo.standard-undo-shortcuts` | `adapt` | Support the platform's standard undo and redo shortcuts and avoid redefining them. | 2.1.4 |

### Components

| ID | Class | Principle | WCAG 2.2 |
| --- | --- | --- | --- |
| `hig.components.charts.meaningful-axes` | `universal` | Choose axis ranges and lower bounds that match what the data means, and use familiar tick values. | - |
| `hig.components.image-views.text-over-images` | `universal` | When text overlays an image, guarantee its contrast against every part of the image it can cover. | 1.4.3 |
| `hig.components.image-views.interactive-images-are-buttons` | `universal` | Make a clickable image a real button or link, not a passive image with a click handler. | 4.1.2 |
| `hig.components.text-views.selectable-useful-text` | `universal` | Let people select and copy text that is useful outside the product. | - |
| `hig.components.text-views.matching-keyboard` | `adapt` | Show the on-screen keyboard that matches the content being entered. | 1.3.5 |
| `hig.components.web-views.embedded-navigation` | `universal` | When embedding navigable web content, support back and forward movement within it. | - |
| `hig.components.boxes.titled-groups` | `universal` | Give a visually grouped set of controls a short title that describes its contents. | 1.3.1 |
| `hig.components.collections.standard-grid-calm-changes` | `universal` | Prefer standard row or grid arrangements and avoid disorienting layout changes when items are inserted or removed. | 2.3.3 |
| `hig.components.disclosure-controls.labeled-adjacent-disclosure` | `universal` | Label each disclosure control with what it reveals and place it next to the content it controls. | 4.1.2 |
| `hig.components.lists-and-tables.text-in-lists` | `universal` | Present primarily textual items as lists or tables with succinct rows and descriptive column headings. | 1.3.1 |
| `hig.components.lists-and-tables.avoid-clipping` | `universal` | Preserve readability of long item text instead of clipping meaning through truncation. | 1.4.10 |
| `hig.components.lists-and-tables.selection-feedback` | `universal` | Give clear feedback when a list item is selected. | 4.1.2, 1.4.11 |
| `hig.components.outline-views.hierarchy-first-column` | `universal` | Show hierarchy in a single leading column, make nested groups easy to expand and collapse, and use a plain table for flat data. | 1.3.1 |
| `hig.components.split-views.persistent-selection` | `universal` | In multi-pane layouts, keep the chosen item marked in every navigation pane above the detail view. | - |
| `hig.components.split-views.collapse-for-narrow` | `universal` | Account for narrow, intermediate, and wide widths, with sensible minimum and maximum pane sizes and the option to hide a pane. | 1.4.10 |
| `hig.components.tab-views.related-panes` | `universal` | Use tabs only for closely related content areas, with descriptive labels and a small number of tabs. | 4.1.2, 2.4.6 |
| `hig.components.tab-views.pane-local-controls` | `universal` | Controls inside a tab pane should affect only that pane. | - |
| `hig.components.buttons.press-state` | `universal` | Give every custom button a visible pressed state in addition to hover and focus states. | 2.4.7 |
| `hig.components.buttons.one-prominent-action` | `universal` | Give the most likely action the most prominent style and keep prominent buttons few per view. | - |
| `hig.components.buttons.role-is-clear` | `universal` | Indicate a button's role, such as destructive or cancel, through label and styling, not color alone. | 1.4.1 |
| `hig.components.context-menus.context-menu-redundancy` | `universal` | Make every context menu command also available from the main interface, and keep these menus short and relevant. | 2.1.1 |
| `hig.components.context-menus.shallow-submenus` | `universal` | Limit submenus to one level and hide items that do not apply in a context menu. | - |
| `hig.components.edit-menus.platform-edit-commands` | `adapt` | Rely on the platform's own edit commands for cut, copy, paste, and undo rather than rebuilding them. | - |
| `hig.components.menus.clear-menu-labels` | `universal` | Label each menu item with a succinct description of its action and show when an item is unavailable. | 4.1.2 |
| `hig.components.menus.more-input-indicator` | `adapt` | Signal when a menu command needs more input before it completes. | - |
| `hig.components.pop-up-buttons.exclusive-options-with-default` | `universal` | Use a compact single-choice control when exactly one of several options applies, and preselect a sensible value. | 4.1.2 |
| `hig.components.pull-down-buttons.related-commands-confirm-destructive` | `universal` | Group only commands related to the button's action in its menu and confirm destructive items. | 3.3.4 |
| `hig.components.the-menu-bar.system-menu-bar` | `apple-specific` | The macOS menu bar is a system-owned surface with a fixed structure; web products should not draw an imitation of it. | - |
| `hig.components.toolbars.uncrowded-toolbars` | `universal` | Choose toolbar items deliberately, move overflow into a more menu, and prefer standard controls. | - |
| `hig.components.search-fields.search-hint-and-instant-results` | `universal` | Use placeholder hints to describe what can be searched and start showing results as people type when feasible. | 3.3.2, 4.1.3 |
| `hig.components.search-fields.filterable-results` | `universal` | Keep search results simple and let people filter by clearly defined scopes. | - |
| `hig.components.sidebars.shallow-hideable-sidebar` | `universal` | Keep sidebar hierarchy to about two levels, let people hide it, and group deep content with disclosure. | - |
| `hig.components.tab-bars.navigation-not-actions` | `universal` | Use a bottom or top navigation bar only to move between sections, never to trigger actions. | 3.2.3 |
| `hig.components.tab-bars.stable-labeled-destinations` | `universal` | Keep the section navigation visible and stable, label every item, and do not hide or disable destinations. | 3.2.3, 2.4.6 |
| `hig.components.action-sheets.choices-for-intentional-action` | `universal` | Present a set of choices tied to an action the person started, include a way to cancel, and make destructive choices prominent. | - |
| `hig.components.alerts.alerts-sparingly` | `universal` | Reserve alerts for critical, actionable situations; do not use them for information or for common actions that can be undone. | - |
| `hig.components.alerts.clear-alert-copy` | `universal` | Write alert titles that state the situation directly and buttons that name the outcome. | 2.4.6 |
| `hig.components.page-controls.ordered-page-position` | `universal` | Indicate the current position among a small ordered set of pages with simple, consistent indicators. | 4.1.2 |
| `hig.components.popovers.small-single-popover` | `universal` | Use a popover for a small amount of related content, show one at a time, and keep any work when it closes automatically. | 1.4.13 |
| `hig.components.scroll-views.visible-scrollability` | `universal` | Make it apparent when content scrolls and support standard scrolling input including the keyboard. | 2.1.1 |
| `hig.components.scroll-views.no-same-axis-nesting` | `universal` | Avoid nesting a scroll area inside another that scrolls in the same direction. | - |
| `hig.components.sheets.one-sheet-with-dismiss` | `universal` | Show one sheet at a time, offer an alternative to the confirm action for dismissal, and choose a different surface for long flows. | 2.1.2 |
| `hig.components.windows.fluid-sizing` | `universal` | Let windows and app frames adapt fluidly to any size people choose. | 1.4.10 |
| `hig.components.windows.no-fake-system-chrome` | `adapt` | Avoid drawing custom window chrome that mimics the operating system. | - |
| `hig.components.color-wells.platform-color-picker` | `adapt` | Prefer the color selection UI the platform already provides over a custom picker. | - |
| `hig.components.combo-boxes.default-and-relevant-choices` | `universal` | Prefill a combined text-and-list control with a meaningful default, label it, and offer relevant choices. | 3.3.2, 4.1.2 |
| `hig.components.digit-entry-views.purposeful-code-entry` | `adapt` | State the purpose of short code entry and protect it when the code is secret. | 1.3.5, 3.3.2 |
| `hig.components.pickers.ordered-in-place-pickers` | `universal` | Offer predictable, logically ordered values in place without switching views, and avoid needless precision. | - |
| `hig.components.segmented-controls.few-related-segments` | `universal` | Use a segmented control for a few closely related choices, with consistent segment size and either all text or all icons. | 4.1.2 |
| `hig.components.sliders.slider-with-precise-entry` | `universal` | Pair a slider with precise entry when exact values matter, give live feedback, and use the expected direction. | 2.5.7, 2.1.1 |
| `hig.components.steppers.visible-stepped-value` | `adapt` | Make the value a stepper changes obvious and pair it with text entry for large changes. | 4.1.2 |
| `hig.components.text-fields.sized-and-labeled-fields` | `universal` | Size each text field to its expected content and keep a persistent label, using placeholder text only as a hint. | 3.3.2 |
| `hig.components.text-fields.expected-field-order` | `universal` | Make moving between fields follow the order people expect. | 2.4.3 |
| `hig.components.toggles.obvious-two-state-toggle` | `universal` | Use a toggle for two opposing states, identify what it controls, and make its states visually obvious. | 1.4.1, 1.4.11, 4.1.2 |
| `hig.components.virtual-keyboards.content-matched-keyboard` | `adapt` | Match the on-screen keyboard and its return key to the content and next step. | 1.3.5 |
| `hig.components.gauges.labeled-range` | `universal` | Label a gauge's current value and both ends of its range. | 1.1.1 |
| `hig.components.progress-indicators.determinate-when-possible` | `universal` | Prefer a determinate progress indicator, report advancement honestly, and switch from indeterminate to determinate once duration is known. | 4.1.3 |
| `hig.components.progress-indicators.visible-continuation` | `universal` | Keep a progress display visibly alive while work continues, so a running task never looks frozen. | - |
| `hig.components.rating-indicators.clear-adjustable-rating` | `universal` | Make ratings easy to change and keep any custom rating symbol understandable. | 4.1.2 |
| `hig.components.notifications.concise-respectful-notifications` | `adapt` | Send concise notifications without duplicates or sensitive details, and show errors inside the product rather than as notifications. | - |

### Inputs

| ID | Class | Principle | WCAG 2.2 |
| --- | --- | --- | --- |
| `hig.inputs.apple-pencil-and-scribble.hover-previews-not-actions` | `adapt` | Use hover to preview what will happen, never to commit an action. | 1.4.13 |
| `hig.inputs.focus-and-selection.no-unexpected-focus-moves` | `universal` | Do not move focus without the person's action. | 3.2.1, 3.2.2 |
| `hig.inputs.focus-and-selection.logical-focus-path` | `universal` | Make focus move through custom views in a sensible, predictable order. | 2.4.3 |
| `hig.inputs.focus-and-selection.platform-consistent-focus-indicator` | `adapt` | Indicate focus with a visible appearance consistent with the platform and never let it be hidden behind other content. | 2.4.7, 2.4.11 |
| `hig.inputs.gestures.multiple-input-paths` | `universal` | Offer several input routes to each action, and treat shortcut gestures as extras on top of standard controls. | 2.5.1, 2.1.1 |
| `hig.inputs.gestures.responsive-expected-gestures` | `universal` | Respond to standard gestures quickly and in the way people expect, and show when a gesture is unavailable. | 2.5.2 |
| `hig.inputs.gestures.no-system-gesture-conflicts` | `adapt` | Avoid custom gestures that collide with system or browser gestures. | - |
| `hig.inputs.gyro-and-accelerometer.motion-input-alternatives` | `universal` | Use device-motion input only for a tangible benefit, and always provide a conventional alternative. | 2.5.4 |
| `hig.inputs.keyboards.respect-standard-shortcuts` | `adapt` | Keep standard keyboard shortcuts working and reserve custom shortcuts for the most frequent commands. | 2.1.4 |
| `hig.inputs.keyboards.describe-shortcuts` | `universal` | Give every shortcut a descriptive name so it can be discovered from menus or help. | - |
| `hig.inputs.pointing-devices.consistent-across-inputs` | `universal` | Deliver a consistent experience whether people use touch, a pointer, a keyboard, or other input. | 2.1.1 |
| `hig.inputs.pointing-devices.reveal-hidden-controls` | `universal` | Let people reveal controls that auto-hide by moving the pointer or focusing, and keep them visible while in use. | 1.4.13, 2.4.7 |

### Technologies

| ID | Class | Principle | WCAG 2.2 |
| --- | --- | --- | --- |
| `hig.technologies.apple-in-app-purchase.transparent-pricing` | `adapt` | Let people try the product before paying and show the total price and billing period of each purchase. | 3.3.4 |
| `hig.technologies.apple-pay.apple-payment-marks` | `apple-specific` | Apple payment buttons and marks are trademarked, system-defined artwork used only to start Apple Pay; they are not a generic payment pattern. | - |
| `hig.technologies.generative-ai.people-in-control` | `universal` | Keep people in control of generated output, disclose where AI is used, and keep the experience useful when generation is unavailable or declined. | - |
| `hig.technologies.icloud.graceful-sync-absence` | `universal` | Keep content current when sync is available and keep the product usable when it is not. | - |
| `hig.technologies.machine-learning.voluntary-feedback` | `universal` | Make explicit feedback on automated results voluntary, describe each option plainly, and act on it promptly. | - |
| `hig.technologies.maps.legible-interactive-maps` | `universal` | Make maps interactive, cluster overlapping points, and clearly identify the selected element. | 1.4.11 |
| `hig.technologies.researchkit.understood-consent` | `universal` | Break long consent into digestible sections and confirm understanding before asking for agreement. | - |
| `hig.technologies.voiceover.decorative-hidden-meaningful-described` | `universal` | Describe meaningful images and hide purely decorative ones from screen readers. | 1.1.1 |
| `hig.technologies.voiceover.structure-for-navigation` | `universal` | Use headings, grouping, and a logical order so screen-reader users can navigate the information hierarchy. | 1.3.1, 1.3.2, 2.4.6 |

## Opinionated Guidance

Start a web audit from the WCAG-mapped `universal` rows: they have normative tests and the lowest risk of importing Apple taste. Treat `adapt` rows as prompts to name the web mechanism explicitly, for example reduced-motion media queries instead of an Apple setting name. When a principle seems to demand a specific look, re-read its `class_reason`; the transferable part is almost always behavior, not appearance.

## Platform-Specific Guidance

Apple-specific entries cover system materials, system typefaces, the system symbol set, the macOS menu bar, and payment marks. For each one, the web decision is a separately verified surface: an opaque or tonal background checked for contrast, the `system-ui` font stack, an openly licensed icon set, WAI-ARIA menubar semantics, and official payment integrations used only as documented. Native values such as point sizes or haptic patterns are not web units. Translate them through the cited WCAG criterion or a measured local decision.

## Unsupported Absolutes

- Do not treat a `universal` classification as proof that a product passes; it is a question to verify.
- Do not cite this page as Apple guidance; cite the linked official page and its review date.
- Do not equate HIG point minimums with WCAG CSS-pixel criteria.
- Do not adopt Apple materials, typefaces, symbols, or system chrome on the web because a principle mentions them.
- Do not assume the extraction is complete after HIG changes; the inventory reflects one dated walk.

## Verification Contract

`node scripts/validate-hig-principles.mjs --json` checks the JSON record and this page together. It fails on missing fields, unknown classes, duplicate or malformed ids, unknown WCAG, Material 3, or APG keys, source URLs that do not match the page slug, inventory pages without principles or dispositions, dangling `covered_by` links, and principle ids missing from this page. `node scripts/test-validate-hig-principles.mjs` proves those failures with committed fixtures under `tests/fixtures/hig-principles/`. Both run on every pull request in `.github/workflows/hig-principles.yml`. `node scripts/audit-evidence-freshness.mjs --record platform-guides/hig-universal-principles.json --as-of <date> --mode advisory` reports `review_due` once `review_by` passes.

Review this extraction when `review_by` arrives, when the HIG index adds, removes, or renames a page, when a cited WCAG, Material 3, or APG page changes materially, or when an audit finds a principle misclassified. A review re-walks the index, updates the inventory and `reviewed_on`, and moves `review_by` forward.

## Source, License, And Attribution

- Official source: [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) and its documentation data, read on 2026-10-19. Apple content is not reproduced; statements are StyleGallery paraphrases with links.
- Cross-references: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) (normative), [Material Design 3](https://m3.material.io/) (comparative), and the [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/) (informative).
- Provenance: StyleGallery-local synthesis with `provenance_kind: local`. No upstream repository content is adapted.

## IA Navigation

Parent: [Platform Guides](index.md).
Next: [Apple Interaction As A Comparative Reference](apple-interaction.md).
