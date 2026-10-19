---
type: Evidence Reference
title: Blind Design A/B Evaluation
description: Compare guidance-assisted and baseline pages using anonymised captures, independent scores, and separately recorded machine failures.
lifecycle: experimental
source_repository: leonxlnx/taste-skill
source_path: skills/taste-skill/evals/evals.json
source_revision: b9ca2fd8047f4c72d7da90ebc1c1203e57c72cd2
---

# Blind Design A/B Evaluation

Primary role: shared quality evidence protocol for testing design guidance.

## Scope and evidence boundary

This method belongs in shared `quality/evidence/`: it compares finished outcomes across domains. `eval/search/` contains retrieval questions and ranking scores, not visual preference evidence. The protocol supplies no Layout CSS, visual defaults, new machine rules, or universal quality gate. It is experimental; review it when the capture method, guidance, or scoring assumptions change.

Rule-violation 0 does not imply a better page. A checker can reward removing visible substance, while a judge rewards a page that communicates the brief. Keep both outcomes visible; neither substitutes for task-based usability testing.

## Prepare matched builds

1. Freeze a brief, supplied copy and assets, task scenarios, target viewports, build time/tool budget, builder model/version, and the exact guidance revision. Use fresh isolated builder contexts. Give one the guidance under test and the other no access to it; keep all other instructions and resources identical. Record deviations rather than quietly equalising the outputs later.
2. Freeze the rubric and checker command/version before building. Include previously unseen briefs when testing generalisation. Separate exploratory tuning briefs from a held-out comparison; repeated exposure is not new evidence.
3. Capture both builds with one browser/version, fonts, viewport set, motion preference, loading/animation settlement condition, scroll positions, and interaction states. Use desktop and narrow-screen captures of equivalent content, including the full reading path. Record failed captures and inaccessible states; do not omit them to improve scores.
4. An organiser who does not judge assigns random opaque folder names for each brief, such as `captures/brief-a/X/` and `captures/brief-a/Y/`. Strip build labels, path clues, and image metadata identifying the treatment. Keep the random assignment key, source revisions, build logs, and checker reports outside the judge packet until scores are locked. Balance presentation order across judges.

## Judge independently

Recruit at least three judges per brief, each reviewing both variants independently before discussion. Builders cannot judge their own comparison. Record whether judges are people or model instances, their relevant experience or model/version, and shared context that limits independence. Three calls to the same model are not three independent human opinions.

Give judges only the frozen brief, rubric, and anonymised screenshot folders. Do not reveal guidance labels, source, or machine FAIL counts before scoring. Screenshots support judgments of visible communication and composition; they cannot establish working controls, focus, performance, or assistive-technology behavior. Record those separately through runtime checks and task evidence.

Use a local reference rubric with scores from 1 to 10: visual coherence (40%), visible task clarity (30%), subject-specific concept (20%), and content specificity (10%). The weighted score is `0.4 * coherence + 0.3 * clarity + 0.2 * concept + 0.1 * content`. These are comparison weights, not calibrated measures of universal quality. Judges must cite visible evidence for each criterion and may mark an unjudgeable capture instead of inventing a score.

## Record and compare

For every brief and anonymous variant, retain:

- build and guidance revisions, assignment key (initially withheld), budget deviations, capture environment, screenshot paths and capture failures;
- each judge's identity/type, presentation order, four raw scores, weighted score, and concrete reasons;
- checker command/revision, full report, machine FAIL count, and failing rule ids; keep review-only observations separate from errors;
- after score lock, the revealed treatment, per-judge paired score difference, mean paired difference, score range, and each variant's FAIL count.

Report ties, disagreements, incomplete pairs, and all briefs, not only wins. Aggregate by brief so adding screenshots does not increase that brief's weight. Do not change weights, cap scores using FAIL counts, or revise pages during the locked comparison. A revised build starts a separately labelled round.

Treat roughly +/-0.5 points per judge as a caution from the taste-skill study (model panel), not a confidence interval or a precision guarantee for this protocol. Small differences are inconclusive without replication and agreement. Inspect criterion-level reasons and repeat on held-out briefs before attributing a gain to guidance.

## Verification and limits

A complete evaluation packet has matched inputs, both anonymised capture sets, at least three locked judge records per brief, reproducible score arithmetic, and machine reports for both variants. Missing or unusable evidence remains reported as incomplete. This document defines a procedure; it records no executed A/B trial or demonstrated improvement.

For task success or accessibility claims, add [HCI evaluation evidence](hci-evaluation.md) and [accessibility evidence](accessibility.md). `consumer_reference: not_applicable` because the protocol selects no consumer implementation record.

## Source, license, and attribution

Independently rewritten from the paired-build idea in [taste-skill's evaluation definitions](https://github.com/leonxlnx/taste-skill/blob/b9ca2fd8047f4c72d7da90ebc1c1203e57c72cd2/skills/taste-skill/evals/evals.json), MIT, Leonxlnx, 2026. The model-judge limitation and approximate noise are from [research section 11](https://github.com/leonxlnx/taste-skill/blob/b9ca2fd8047f4c72d7da90ebc1c1203e57c72cd2/skills/taste-skill/references/research.md); the weighted-rubric idea was checked in [critique](https://github.com/leonxlnx/taste-skill/blob/b9ca2fd8047f4c72d7da90ebc1c1203e57c72cd2/skills/taste-skill/references/critique.md). Sources were inspected on 2026-10-19. No upstream brief, sentences, tables, or code are retained. Blinding controls, the three-judge minimum, and reporting requirements are StyleGallery-local procedure.

## IA Navigation

Parent: [Evidence References](index.md).
Next: [HCI Evaluation Evidence](hci-evaluation.md).
