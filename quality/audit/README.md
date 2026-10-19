---
type: Quality Reference
title: Audit Ledger
description: JSON ledger that tracks a principle-based design audit from violation to verified fix, and the command that reports its progress.
aliases: ["audit ledger","design audit progress","violation tracker","audit status command","heuristic evaluation ledger"]
questions: ["How do I track design audit violations through fix PRs to verification?","How do I check that a design audit covered every principle?"]
---

# Audit Ledger

Primary role: progress record for a design audit.

A design audit against HIG-derived principles and AI-slop patterns produces many findings. The ledger records each finding once and follows it to a verified fix, so progress is computed instead of re-described in every report.

## Audit Kit

Start with [Persona And Journey](persona-journey.md), define [Ideal States And Checks](ideal-state.md), and prioritize observations with the [Severity Scale](severity.md).

```sh
stylegallery audit init https://example.com --out ./audit
stylegallery audit check https://example.com --json --viewports 320,768,1440
stylegallery audit check ./index.html --json
```

`init` writes `audit.md` and `ledger.json` without overwriting existing files. The ledger pre-lists universal/adapt HIG principles and every slop catalog id with no violations triaged. Fill the product-specific assumptions and manual scenarios before claiming coverage.

`check` runs the shared showcase browser measurements and every machine-detectable [slop rule](../../expression/anti-patterns.md). JSON includes check ids, principle/slop ids, verdicts, and evidence. Review-only rules remain review questions, never machine failures. Use on a test instance: the dishonest-CTA rule activates controls and can trigger real actions. Third-party blocking is the offline test; it does not simulate a service-worker cache or a fully disconnected first visit.

The public MCP server exposes `audit_init`, `audit_check`, and `audit_status` separately from the frozen v1 knowledge interface. `audit_init` writes consumer-owned files; `audit_check` visits and interacts with its target; neither mutates governed knowledge.

## Ledger Structure

The schema is [`ledger.schema.json`](ledger.schema.json). One ledger covers one audited subject:

```txt
principle_id -> violations[] -> fix (PR) -> check_id -> status
```

- `principle_id`: an HIG universal principle id (`hig.<section>.<slug>`) or an AI-slop catalog id (`slop.<slug>`). A principle with an empty `violations` list is reported as having no violations triaged, so an unexamined principle stays visible.
- `violation_id`: unique across the ledger. Each violation names at least one screenshot path, a `severity` on the NN/g 0-4 scale (0 not a usability problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe), and `persona_refs` and `journey_refs` ids.
- `fix`: the pull request, as `pr_url`, `pr_number`, or both.
- `check_id`: the check that proves the fix, preferably one that has been shown to fail on the broken state.
- `status`: `open`, `fixing`, `fixed`, `verified`, or `wont_fix`. `fixing`, `fixed`, and `verified` require `fix`; `verified` also requires `check_id`; `wont_fix` requires a `note` with the reason.

## Progress Command

```sh
stylegallery audit status audit/ledger.json
stylegallery audit status audit/ledger.json --principles principles.json --json
```

The command validates the ledger against the schema and the unique-id rules, then prints counts per status and severity, percent verified over actionable violations (`wont_fix` excluded), and the principles with no violations triaged. With `--principles`, it also fails when an id from that list is missing from the ledger. The list may be an array of ids, an array of objects with `id` or `principle_id`, or an object with a `principles` array. Exit code 0 means a valid ledger and complete coverage.

## Boundaries

- A `verified` status records that a named check passed. It does not prove usability; screenshot diffs show rendered change, not usability ([Visual QA Evidence](../evidence/visual-qa.md)).
- The ledger holds no visual values and is not a Layout input.
- Severity is a reviewer judgment on the NN/g scale, not a measured quantity.

## IA Navigation

Parent: [Quality Gates](../index.md).
Next: [Visual Evidence Gate](../gates/visual-evidence.md).
