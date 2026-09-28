---
type: Domain Recipe
title: WebGL Hero Field
description: A three.js point field behind a hero, with pointer parallax, offscreen pausing, and safe fallbacks.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# WebGL Hero Field

Primary role: visual technique recipe.

## Repository Boundary

Product-layer script for `showcase/` works and consumer pages. The canvas is decorative atmosphere; no content or control may live only inside it.

## Reusable Method

```html
<section class="hero">
  <canvas class="hero_canvas" aria-hidden="true"></canvas>
  <!-- content -->
</section>
```

```css
.hero { isolation: isolate; overflow: clip; position: relative; }
.hero_canvas { block-size: 100%; inline-size: 100%; inset: 0; position: absolute; z-index: -1; }
```

```js
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

async function startHeroField(canvas) {
  let THREE, renderer;
  try {
    THREE = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js");
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  } catch {
    return; // CSS atmosphere behind the canvas remains
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 1.4, 7);

  const columns = 140, rows = 70;
  const positions = new Float32Array(columns * rows * 3);
  const colors = new Float32Array(columns * rows * 3);
  const a = new THREE.Color("#ff5a36"), b = new THREE.Color("#7b5cff");
  for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
    const i = (r * columns + c) * 3;
    positions[i] = (c / (columns - 1) - 0.5) * 18;
    positions[i + 2] = (r / (rows - 1) - 0.5) * 12;
    const color = a.clone().lerp(b, c / (columns - 1));
    colors.set([color.r, color.g, color.b], i);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: 0.045, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(points);

  const pointer = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  function resize() {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    camera.updateProjectionMatrix();
    points.position.y = camera.aspect < 1 ? -3.2 : -1.2; // keep the field under portrait copy
  }
  function frame(time) {
    const t = time * 0.00045, p = geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      p[i + 1] = Math.sin(p[i] * 0.55 + t * 2) * 0.35 + Math.cos(p[i + 2] * 0.7 + t * 1.4) * 0.3;
    }
    geometry.attributes.position.needsUpdate = true;
    camera.position.x += (pointer.x * 1.6 - camera.position.x) * 0.04;
    camera.position.y += (1.4 - pointer.y * 0.8 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  resize();
  addEventListener("resize", resize);
  if (reduceMotion) return frame(0); // one still frame
  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(canvas);
  renderer.setAnimationLoop((time) => { if (visible) frame(time); });
}

startHeroField(document.querySelector(".hero_canvas"));
```

Variations: swap the plane for `THREE.SphereGeometry` vertices for a globe of points, raise `size` and lower the count for bokeh, or map `scrollY` into `t` for a scroll-scrubbed field.

## Opinionated Guidance

Put a [CSS gradient atmosphere](gradient-atmosphere.md) behind the canvas. When WebGL fails, the hero still looks intentional instead of empty.

## Platform-Specific Guidance

Cap device pixel ratio at 2, request `low-power`, and pause rendering offscreen; a 10k-point field updated on the CPU is fine on laptops but should drop to about half the points on phones if frame rate matters. Import three.js as an ES module from a pinned version, never `@latest`.

## Unsupported Absolutes

Point counts and wave constants were tuned for one hero. They are not a performance guarantee; measure on the slowest device you care about.

## Verification Contract

The showcase check reports no page errors with or without network access to the CDN. Under reduced motion, only a still frame renders. The canvas is `aria-hidden` and holds no focusable content.

## Source, License, And Attribution

Locally authored recipe. three.js is MIT licensed and loaded at runtime; no three.js source is reproduced.

## IA Navigation

Parent: [Expression](../index.md).
Next: [Fintech Clarity Direction](../directions/fintech-clarity.md).
