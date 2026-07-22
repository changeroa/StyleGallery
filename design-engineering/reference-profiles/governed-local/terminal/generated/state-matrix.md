---
type: Generated Evidence
title: "terminal button state matrix"
description: "Compound state sets and channel expectations derived from canonical JSON."
---

<!-- Generated from canonical JSON. Do not edit. -->
# terminal button state matrix

| Scenario | Mode | State set | ARIA | Visual | Activation |
| --- | --- | --- | --- | --- | --- |
| <code>action-disabled-busy</code> | action | <code>busy</code>, <code>disabled</code> | <code>aria-busy=true</code><br><code>aria-disabled=true</code> | <code>busy</code>, <code>disabled</code> | suppressed |
| <code>action-focused</code> | action | <code>focus</code> | none | <code>focus</code>, <code>ready</code> | allowed |
| <code>action-loading-busy</code> | action | <code>busy</code>, <code>focus</code>, <code>loading</code> | <code>aria-busy=true</code> | <code>busy</code>, <code>focus</code>, <code>loading</code> | suppressed |
| <code>disclosure-expanded-loading</code> | disclosure | <code>busy</code>, <code>expanded</code>, <code>focus</code>, <code>loading</code> | <code>aria-busy=true</code><br><code>aria-expanded=true</code> | <code>busy</code>, <code>expanded</code>, <code>focus</code>, <code>loading</code> | allowed |
| <code>toggle-focused-pressed</code> | toggle | <code>focus</code>, <code>pressed</code> | <code>aria-pressed=true</code> | <code>focus</code>, <code>pressed</code> | allowed |

## IA Navigation

Parent: [Governed Local Profiles](../../index.md).
Next: [Keyboard Matrix](keyboard-matrix.md).
