---
type: Decision Record
title: Design Terminology Domain Scope Decision
description: Decision to add Design Terminology as the sixth StyleGallery domain, with four placement alternatives compared and the domain's independent decision surface defined.
---

# Design Terminology Domain Scope Decision

## Decision

StyleGallery adds Design Terminology as a sixth explicit domain. The domain's independent decision surface, in one sentence:

> Design Terminology binds design terms to their named sources, classifies them by source kind and concept family, and judges typed semantic relations and conflicts between terms from different sources.

Concretely, this domain and only this domain decides: which named source a term belongs to, what kind of source that is, which concept family the term serves, and which typed relation with which boundary holds between two terms. The five existing domains keep their boundaries unchanged.

The domain does not own: StyleGallery's internal canonical naming (the [Controlled Vocabulary](../../guides/vocabulary.md) keeps it), actual UI behavior or implementation methods, accessibility rules, platform-specific interaction adaptation (Platform Guides keeps it), and any universal prescription about which term is generally better.

## Alternatives Compared

| Candidate | Strength | Weakness | Disposition |
| --- | --- | --- | --- |
| Extend `guides/vocabulary.md` | Close to existing terminology stewardship | Mixes StyleGallery's internal canonical word set with external systems' term meanings on one authoritative page; the vocabulary would then compete with external definitions it is supposed to route around | Rejected: internal canonical control and external comparative meaning are different decisions with different evidence and freshness rules |
| `platform-guides/terminology/` | Reuses an existing comparative domain | Tools (Figma), specifications (DTCG Format), and pattern libraries are not platforms; hosting them under Platform Guides would erase the source-kind axis this domain depends on | Rejected: source kind, not platform comparison, is the primary axis |
| Shared non-domain `terminology/` | Easy to reference across domains | No named owner, lifecycle, validator, or review authority; consumer-reference already carries the no-second-authority rule for shared infrastructure | Rejected: ungoverned placement reproduces the silent-collision problem the content exists to solve |
| New sixth domain `design-terminology/` | Owns an independent lifecycle, review owner, validator coverage, and experimental-to-stable promotion path | Widest infrastructure blast radius: manifest, validators, schemas, sealed material cardinality, and package inventory all change | Adopted, with the conditions below |

Adoption conditions: content starts `experimental`; a machine-readable term/concept/source/relation registry is a promotion prerequisite; every external meaning claim carries an official source and review date; typed relations replace plain term-pair tables.

## Naming

Terminology, not topology: topology suggests a formal relation graph or ontology that this domain does not yet provide; v0.1 compares definitions, usage scope, and conflicts. Terminology, not vocabulary: the [Controlled Vocabulary](../../guides/vocabulary.md) owns StyleGallery's canonical internal word set; this domain compares the meanings and relations of terms used by external named sources.

## Context

Named design systems, platform guidelines, specifications, and design tools define overlapping terms differently, and handoffs between them fail on silent term collisions. Recording these definitions inside Layout would violate the pattern boundary; the controlled vocabulary page is for internal canonical terms; Platform Guides compares interaction conventions rather than terminology.

## Warrant

A separate domain lets terminology comparison name its own evidence boundary: cited official sources, dated structural readings, typed relations with boundaries, and working translations that never override repository policy.

## Consequences

- `design-terminology/**` begins `experimental` with a named review owner and validator coverage.
- The domain manifest, root routes, quality scope, vocabulary domain list, and governance rows record six domains; Consumer Reference remains shared infrastructure and still cannot add a domain row.
- Record consistency is machine-enforced from v0.1 by `scripts/validate-design-terminology.mjs` (closed relation types, recorded terms on both sides, non-trivial boundaries, contradiction pairs, date and status shape, no orphan terms). Human semantic review is required at stable promotion only, per the repository promotion rules; it is not a merge gate for `experimental` content.
- Domain identity and cardinality are currently sealed in multiple surfaces (closed schema enums, identity sets, discover cardinality, package inventory, snapshot tests) requiring synchronized manual edits when a domain is added. This is recorded technical debt, not tamper evidence alone: one author changing all copies in one commit weakens duplication as independent evidence while keeping drift risk. Revisit triggers: a seventh domain id is added, manual-change sites exceed twelve, a cardinality drift incident occurs, or registry generation changes. Target structure when triggered: one canonical domain registry generating enums, lists, and package inventory, with an independently reviewed sealed digest as the tamper check. Named review owner for this debt: the Design Terminology domain owner until a governance owner is designated.
- Term relations recorded by the domain are working judgments, not repository policy for other domains.

## Boundary Or Limitation

This decision establishes ownership and governance only. It does not verify that any cited external vocabulary is current beyond each record's review date, does not make any external definition authoritative for product implementation, and does not claim the typed relation model is complete beyond the recorded cases.

## IA Navigation

Parent: [Claim Records](index.md) in [Quality Gates](../index.md).
Next: [StyleGallery Domains](../../DOMAINS.md) for the active domain manifest.
