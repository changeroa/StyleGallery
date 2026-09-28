---
type: Domain Recipe
title: Kinetic Type Technique
description: Copy-ready split-word headline rises, scroll-lit paragraphs, count-ups, and marquees that keep accessible text intact.
domain: motion
lifecycle: experimental
provenance_kind: local
---

# Kinetic Type Technique

Primary role: executable motion technique.

## Repository Boundary

Product-layer script and CSS for `showcase/` works and consumer pages. Setup and the `.motion` enhancement gate come from [Scroll Choreography Technique](scroll-choreography.md).

## Reusable Method

### Split-Word Rise

Each word rises out of its own clipped line box. The heading keeps its full sentence as the accessible name, and the visual word spans are hidden from assistive technology.

```js
function splitHeadings() {
  for (const heading of document.querySelectorAll("[data-split]")) {
    heading.setAttribute("aria-label", heading.textContent.replace(/\s+/g, " ").trim());
    const fragment = document.createDocumentFragment();
    for (const node of [...heading.childNodes]) {
      const tag = node.nodeName === "EM" ? "em" : "span";
      for (const word of node.textContent.split(/(\s+)/)) {
        if (!word) continue;
        if (/^\s+$/.test(word)) { fragment.append(" "); continue; }
        const outer = document.createElement("span");
        outer.className = "split_word";
        outer.setAttribute("aria-hidden", "true");
        const inner = document.createElement(tag);
        inner.className = "split_inner";
        inner.textContent = word;
        outer.append(inner);
        fragment.append(outer);
      }
    }
    heading.replaceChildren(fragment);
  }
}
splitHeadings();
gsap.to(".split_inner", { y: 0, duration: 1.3, ease: "expo.out", stagger: 0.06, delay: 0.15 });
```

```css
.motion .split_word { display: inline-block; overflow: clip; padding-block-end: 0.08em; vertical-align: top; }
.motion .split_inner { display: inline-block; transform: translateY(105%); }
```

The `padding-block-end` keeps descenders from being clipped. Run the split before measuring anything, and only once.

### Scroll-Lit Paragraph

Words start dim and light up with scroll progress.

```js
for (const paragraph of document.querySelectorAll("[data-words]")) {
  const words = paragraph.textContent.trim().split(/\s+/);
  paragraph.replaceChildren(...words.flatMap((word, index) => {
    const span = Object.assign(document.createElement("span"), { className: "word_dim", textContent: word });
    return index === 0 ? [span] : [" ", span];
  }));
}
gsap.to(".word_dim", {
  opacity: 1, ease: "none", stagger: 0.4,
  scrollTrigger: { trigger: "[data-words]", start: "top 78%", end: "bottom 45%", scrub: true },
});
```

```css
.motion .word_dim { opacity: 0.16; }
```

### Count-Up

The final number is in the HTML; motion only animates toward it.

```html
<dd data-count="41920">41,920</dd>
```

```js
for (const element of document.querySelectorAll("[data-count]")) {
  const state = { value: 0 };
  gsap.to(state, {
    value: Number(element.dataset.count), duration: 2, ease: "power3.out",
    onUpdate: () => { element.textContent = Math.round(state.value).toLocaleString("en-US"); },
    scrollTrigger: { trigger: element, start: "top 88%", once: true },
  });
}
```

Use `font-variant-numeric: tabular-nums` so the width does not jitter while counting.

### Marquee

Pure CSS. Duplicate the content once and translate by half.

```html
<div class="marquee" aria-hidden="true">
  <div class="marquee_track"><span>One</span><span>Two</span><span>One</span><span>Two</span></div>
</div>
```

```css
.marquee { overflow: clip; }
.marquee_track { animation: marquee 32s linear infinite; display: flex; gap: 2.5rem; inline-size: max-content; white-space: nowrap; }
@keyframes marquee { to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) {
  .marquee_track { animation: none; flex-wrap: wrap; inline-size: auto; white-space: normal; }
}
```

The marquee is decorative and `aria-hidden`. Never put the only copy of important text in it.

## Opinionated Guidance

Animate words, not letters. Letter-by-letter reveals look impressive once and read slowly every time after that.

## Platform-Specific Guidance

Splitting text breaks browser hyphenation and some `text-wrap: balance` results across word spans; check the split headline at 320px. Screen readers read the `aria-label`, so keep it identical to the visible sentence.

## Unsupported Absolutes

Stagger and duration values suit short display headlines. Long paragraphs should not rise word by word.

## Verification Contract

Under reduced motion or with no GSAP, every split heading and lit paragraph is fully visible and the marquee is static. `node scripts/check-showcase.mjs` enforces both.

## Source, License, And Attribution

Locally authored technique. GSAP is loaded at runtime under its own license; no library source is reproduced.

## IA Navigation

Parent: [Motion](../index.md).
Next: [Showcase](../../showcase/README.md).
