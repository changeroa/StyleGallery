---
type: Domain Recipe
title: Canvas 3D Without WebGL
description: A dependency-free recipe for a pointer-reactive 3D object field on a 2D canvas, with depth-sorted shaded spheres, visibility pausing, and a reduced-motion still.
domain: expression
lifecycle: experimental
provenance_kind: local
---

# Canvas 3D Without WebGL

Primary role: visual technique recipe.

## Repository Boundary

Product-layer JavaScript and CSS for `showcase/` works and consumer pages. Never add these to reusable Layout pattern CSS.

## Reusable Method

The Lusion study needed a stage full of glossy six-armed pieces that turn toward the pointer. A WebGL scene would need a library from a CDN, which breaks offline reading; a 2D canvas can fake convincing 3D for a few hundred primitives by drawing shaded spheres, projected with perspective and sorted back to front. Use [WebGL Hero Field](webgl-hero.md) when you need shaders or thousands of objects; use this when the scene is a handful of solid shapes.

```html
<div class="stage" data-stage>
  <canvas data-canvas role="img" aria-label="A dark stage of white, cobalt, and black six-armed pieces that turn toward the pointer"></canvas>
  <p class="caption">Move the pointer over the stage.</p>
</div>
```

```js
const ARMS = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const rot = ([x, y, z], ax, ay) => {
  const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
  const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  return [x1, y * cx - z1 * sx, y * sx + z1 * cx];
};
function draw() {
  ctx.clearRect(0, 0, W, H);
  const f = Math.min(W, H) * 0.55, balls = [];
  for (const j of jacks) {
    balls.push([j.x, j.y, j.z, j.s * 0.55, j.c]);                     // hub
    for (const a of ARMS) for (let k = 1; k <= 5; k++) {              // five spheres per arm
      const [x, y, z] = rot(a.map((v) => v * j.s * k / 5), j.ax + my * 0.6, j.ay + mx * 0.6);
      balls.push([j.x + x, j.y + y, j.z + z, j.s * 0.26, j.c]);
    }
  }
  balls.sort((a, b) => b[2] - a[2]);                                  // far first
  for (const [x, y, z, r, [lit, shade]] of balls) {
    const p = 1 / (1.6 + z), sx = W / 2 + x * f * p, sy = H / 2 + y * f * p, sr = r * f * p * 0.5;
    const g = ctx.createRadialGradient(sx - sr * 0.35, sy - sr * 0.4, sr * 0.1, sx, sy, sr);
    g.addColorStop(0, "#fff"); g.addColorStop(0.35, lit); g.addColorStop(1, shade);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  }
}
```

Sixteen pieces with thirty-one spheres each is about five hundred arcs per frame, which a phone draws comfortably at 60fps.

### Loop Discipline

```js
let running = false, still = matchMedia("(prefers-reduced-motion: reduce)").matches, visible = true;
const sync = () => {
  const go = !still && visible && !document.hidden;
  if (go && !running) { running = true; requestAnimationFrame(step); } else if (!go) running = false;
};
new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }).observe(stage);
document.addEventListener("visibilitychange", sync);
```

Under reduced motion draw one still frame and redraw only on `pointermove`, so the scene still answers the visitor without moving by itself. A visible pause button (`aria-pressed`) sets `still` too.

## Opinionated Guidance

Three materials are enough: a lit white, a saturated brand colour, and a glossy black, each as a two-stop radial gradient with a white specular point. More colours turn the stage into confetti.

Ease the pointer: store a target and move 6% of the way each frame. Direct mapping feels twitchy.

## Platform-Specific Guidance

Scale the backing store by `devicePixelRatio` (capped at 2) and reset the transform after each resize, or the spheres blur on retina screens. Sorting by centre depth is enough for spheres; it fails for long overlapping shapes, which is why arms are built from spheres rather than cylinders.

## Unsupported Absolutes

This recipe produced the Lusion study's stage, which passes the showcase checks. It has no lighting model beyond the fixed highlight and no occlusion beyond painter's order.

## Verification Contract

A page using this recipe passes `node scripts/check-showcase.mjs`. Keep any caption paragraph visible in every mode; hiding a `<p>` inside `main` once the canvas starts fails the hidden-text check offline and under reduced motion.

## Source, License, And Attribution

Locally authored for the StyleGallery Lusion study. The projection and painter's-order approach are standard graphics techniques; no upstream code is reproduced.

## IA Navigation

Parent: [Expression](../index.md).
Next: [Measured Expression Benchmarks](../measured-benchmarks.md).
