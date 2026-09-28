---
type: Domain Recipe
title: Live Product Demos
description: Recipes for small working product mock-ups (calculators, queues, palettes, sequencers, scripted assistants) that answer honestly and pass the showcase floor.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Live Product Demos

Primary role: visual technique recipe.

## Repository Boundary

Product-layer HTML, CSS, and JavaScript for `showcase/` works and consumer pages. Never add these to reusable Layout pattern CSS.

## Reusable Method

The most engaging moment in nearly every one of the 54 brand studies is a piece of the product that works: the Wise converter, the Ramp expense queue, the Raycast palette, the teenage engineering sequencer, the Revolut assistant, the Tesla range estimator. They share one shape: a small input, a visible output that changes immediately, and an honest status when an action would need a real backend.

### Input To Output In Reading Order

Recompute everything on every `input` event and write results in the order a reader scans them. The Wise converter writes fee, converted amount, rate, and received amount top to bottom.

```html
<form data-conv onsubmit="return false">
  <label for="amt">You send exactly</label>
  <input id="amt" inputmode="decimal" value="1000">
  <div aria-live="polite">
    <p>Fee (invented) <b data-fee></b></p>
    <p>Rate (invented) <b data-rate></b></p>
  </div>
  <label for="got">Recipient gets</label>
  <output id="got" data-got></output>
</form>
```

```js
const calc = () => {
  const a = Math.max(0, parseFloat(amt.value.replace(/,/g, "")) || 0);
  const fee = a && Math.max(1, a * 0.0041);
  fee_.textContent = fee.toFixed(2); rate_.textContent = RATE.toFixed(4);
  got.textContent = ((a - fee) * RATE).toLocaleString("en-US", { maximumFractionDigits: 2 });
};
amt.addEventListener("input", calc); calc();
```

### Queues And Toggles

Lists the visitor can clear (Ramp approvals) and switches they can flip (policy rules) need the state in attributes and a spoken confirmation.

```js
li.setAttribute("data-done", "");                    // CSS styles the finished row
status.textContent = `${item} approved`;             // role="status", visually hidden
left.textContent = remaining ? `${remaining} left` : "All clear";
```

Use `role="switch"` with `aria-checked` for on/off rules and `aria-pressed` for segmented choices.

### Scripted Assistants

A chat mock answers a fixed set of prompt chips. Append both the question and the answer to a `role="log"` region, cap its length, and make every answer say what would really happen.

```js
log.append(q, a);                                    // textContent only, never innerHTML with visitor text
while (log.children.length > 4) log.firstElementChild.remove();
```

### Honest Actions

Anything that would sign up, buy, send, or book is a `<button data-demo="There is no store in this unofficial study.">`. The shared kit announces the message in a visible `role="status"` toast. Email forms validate first, then say nothing was sent.

## Opinionated Guidance

One working demo per page beats three half-working ones. Put it in the first or second viewport, where the capture usually shows the product.

Invent the numbers and say so next to them. A demo that shows a plausible fee, yield, or range is persuasive; in a study that persuasion must be labelled "(invented)".

Stop by yourself. Sequencers play two bars, counters tick only while visible, typed terminals finish. Nothing in a demo should run forever.

## Platform-Specific Guidance

Web Audio contexts must be created or resumed inside a user gesture. `IntersectionObserver` is the cheapest way to start and stop timers with visibility; clear the interval when the element leaves. `Intl.NumberFormat` handles currency decimals (KRW and JPY have none).

## Unsupported Absolutes

These recipes produced the study demos named above. They are mock-ups; none of them models real fees, rates, or ranges.

## Verification Contract

A page using these recipes passes `node scripts/check-showcase.mjs`, which clicks every `[data-demo]` button and requires a visible status without moving the page. Two failures recur:

- A tab or accordion that hides its own `<p>` with `hidden` fails the hidden-text check under reduced motion. Keep one shared caption outside the panels and update it, or move one detail paragraph to the active item (Rivian, Mercury).
- A demo row that overflows a panel with `overflow: hidden` at 320px leaves its buttons clipped, so keyboard focus lands on an invisible control (Ramp). Wrap actions onto their own grid row below 560px.

## Source, License, And Attribution

Locally authored from the StyleGallery showcase studies. No product code or copy from the studied brands is reproduced.

## IA Navigation

Parent: [Expression](../index.md).
Next: [Canvas 3D Without WebGL](canvas-3d.md).
