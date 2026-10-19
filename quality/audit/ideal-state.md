---
type: Quality Template
title: Audit Ideal States And Checks
description: Connect each user outcome to principle identifiers, scenarios, executable checks, and bounded evidence.
aliases: ["audit ideal state template", "principle check mapping", "checks that can fail"]
questions: ["How do I link audit ideal states to principles and checks?"]
---

# Audit Ideal States And Checks

Primary role: audit acceptance template.

## Ideal State

Number outcomes I1 through In. Each must name a persona, journey, principle id, and check id. These starting rows use ids from the [HIG extraction](../../platform-guides/hig-universal-principles.md); the extraction is a dated reference, not an Apple certification.

| Ideal | User outcome | Principle ids | Check id |
| --- | --- | --- | --- |
| I1 | Content fits the available width | hig.foundations.layout.adapt-to-space | audit.overflow |
| I2 | Keyboard focus is visible and follows reading order | hig.foundations.accessibility.keyboard-only | audit.focus |
| I3 | Reduced motion retains a complete static page | hig.foundations.motion.optional | audit.reduced-motion |
| I4 | Text on solid backgrounds meets AA contrast | hig.foundations.accessibility.contrast | audit.contrast |
| I5 | Section navigation and Back preserve location | hig.foundations.layout.importance-order | audit.hash-navigation |
| I6 | Fixed content fits a short viewport | hig.foundations.layout.adapt-to-space | audit.short-viewport |
| I7 | Essential reading survives blocked third-party resources | hig.patterns.loading.show-something-soon | audit.offline |
| I8 | Essential reading survives disabled JavaScript | hig.patterns.loading.show-something-soon | audit.no-script |
| I9 | State transitions respond promptly | hig.foundations.motion.brief-and-cancelable | audit.link-transition |
| I10 | Each screen has imagery or substantial text | slop.empty-screen | audit.empty-screen |
| I11 | The page loads without runtime or resource errors | hig.patterns.loading.show-something-soon | audit.load |
| I12 | Each machine slop rule has an explicit verdict | slop.static-interactive | slop.static-interactive |
| I13 | Every automated check rejects an injected violation | hig.patterns.feedback.accessible-feedback | manual.check-self-tests |

## QA Scenarios

| Scenario | Ideal | Persona and journey refs | Action | Expected | Evidence |
| --- | --- | --- | --- | --- | --- |
| q1 | I1 | visitor, discover | Open at 320, 768, 1440 wide and scroll | No horizontal overflow | audit.overflow JSON |
| q2 | I2 | keyboard, discover | Tab through the page | Focus visible, not covered, in DOM order | audit.focus JSON |
| q3 | I13 | maintainer, verify | Run clean and violation fixtures | Clean passes; the targeted broken check fails | Self-test output |

Add product-specific manual scenarios for every principle not covered by automation. A passing check proves only its named measurement: contrast over imagery, task completion, content meaning, and usability still require review.

## Boundaries

This is shared Quality methodology and local synthesis of the [Showcase QA](../../showcase/QA.md) structure. It owns no visual defaults. Consumer audit documents and ledgers are non-governed artifacts, like showcase outputs; creating one does not admit it into material retrieval.

## IA Navigation

Parent: [Audit Kit](README.md).
Next: [Severity Scale](severity.md).
