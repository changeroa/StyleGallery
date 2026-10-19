import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const mimeTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".md": "text/markdown; charset=utf-8" };
export function serveDirectory(directory, { port = 0, host = "127.0.0.1" } = {}) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    let target = path.join(directory, decodeURIComponent(url.pathname));
    if (target !== directory && !target.startsWith(`${directory}${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        response.writeHead(301, { location: `${url.pathname}/` }).end();
        return;
      }
      target = path.join(target, "index.html");
    }
    if (!fs.existsSync(target)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": mimeTypes[path.extname(target)] ?? "application/octet-stream" });
    fs.createReadStream(target).pipe(response);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve(server);
    });
  });
}
const widths = [320, 768, 1440];
const viewportHeight = 900;
const shortViewport = { width: 1280, height: 620 };
const scrollStops = ["top", "middle", "bottom"];
const maxTabStops = 60;
const settleTimeoutMs = 6000;
// Audit runs on live sites (fast mode) cap each settle wait: pages that never stop animating
// would otherwise spend the whole wait at every scroll stop.
const fastSettleTimeoutMs = 1000;

// ---------- time budget ----------

// A budget bounds one audit run. Each stage receives a share of the remaining time in proportion
// to its weight; a stage that overruns has its browser contexts closed and is reported as
// timed out, so the run always ends with partial results instead of waiting indefinitely.
export const STAGE_INCOMPLETE = Symbol("stage_incomplete");
export function createBudget(totalMs, totalWeight) {
  return { end: Date.now() + totalMs, weightLeft: totalWeight, contexts: new Set(), stages: [], remaining() { return this.end - Date.now(); } };
}
export async function runStage(budget, name, weight, fn) {
  if (!budget) return fn();
  const remaining = budget.remaining();
  // Most stages finish well inside their share; a 3x allowance lets a heavy stage borrow from
  // that slack while still leaving later stages a turn.
  const share = budget.weightLeft > 0 ? remaining * Math.min(1, (weight / budget.weightLeft) * 3) : remaining;
  budget.weightLeft -= weight;
  const allowed = Math.min(remaining, Math.max(share, 5000));
  if (allowed < 500) {
    budget.stages.push({ name, status: "skipped", ms: 0, reason: "time budget exhausted" });
    return STAGE_INCOMPLETE;
  }
  const started = Date.now();
  const before = new Set(budget.contexts);
  let timer;
  const outcome = await Promise.race([
    Promise.resolve().then(fn).then((value) => ({ value }), (error) => ({ error })),
    new Promise((resolve) => { timer = setTimeout(() => resolve({ timeout: true }), allowed); }),
  ]);
  clearTimeout(timer);
  if (outcome.timeout) {
    await Promise.all([...budget.contexts].filter((context) => !before.has(context)).map((context) => context.close().catch(() => {})));
    budget.stages.push({ name, status: "timed_out", ms: Date.now() - started, limit_ms: Math.round(allowed) });
    return STAGE_INCOMPLETE;
  }
  if (outcome.error) {
    budget.stages.push({ name, status: "error", ms: Date.now() - started, reason: outcome.error.message.split("\n")[0] });
    return STAGE_INCOMPLETE;
  }
  budget.stages.push({ name, status: "done", ms: Date.now() - started });
  return outcome.value;
}
// Richness floor (showcase/QA.md I16-I18), calibrated on expression/measured-benchmarks.md.
const richness = { surfaceShare: 0.08, textShare: 0.1, transitionsPerScreen: 4, minTransitions: 12, slowHoverMs: 350, minClipped: 2, minHairlines: 3 };

// Runs in the page for the screen currently in view: share of the viewport covered by visual surfaces and by text.
function screenCoverage() {
  const W = innerWidth, H = innerHeight;
  const clip = (r) => Math.max(0, Math.min(r.right, W) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0));
  const shown = (el) => { const s = getComputedStyle(el); return s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05; };
  let surface = 0;
  const counted = [];
  for (const el of document.querySelectorAll("img, picture, video, canvas, svg, [data-surface], body *")) {
    const isMedia = el.matches("img, picture, video, canvas, svg, [data-surface]");
    const bg = !isMedia && /url\(/.test(getComputedStyle(el).backgroundImage);
    if (!isMedia && !bg) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 120 || r.height < 80 || !shown(el)) continue;
    if (counted.some((parent) => parent.contains(el))) continue;
    counted.push(el);
    surface += clip(r);
  }
  let text = 0;
  for (const el of document.querySelectorAll("body *")) {
    if (![...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim())) continue;
    if (!shown(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    for (const r of range.getClientRects()) text += clip(r);
  }
  return { surface: Math.min(1, surface / (W * H)), text: Math.min(1, text / (W * H)) };
}

// Runs in the page: responsive elements, link and button transition speed, masks or clips, and hairlines.
function detailCounts() {
  let transitions = 0, clipped = 0, hairlines = 0;
  const hover = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const s = getComputedStyle(el);
    const durations = s.transitionDuration.split(",").map(parseFloat);
    if (durations.some((d) => d > 0)) {
      transitions += 1;
      if (el.matches("a, button")) hover.push(Math.max(...durations) * 1000);
    }
    if (s.clipPath !== "none" || (s.maskImage && s.maskImage !== "none")) clipped += 1;
    if (["Top", "Right", "Bottom", "Left"].some((side) => s[`border${side}Width`] === "1px" && s[`border${side}Style`] !== "none")) hairlines += 1;
  }
  hover.sort((a, b) => a - b);
  return { transitions, clipped, hairlines, hoverMedian: hover.length ? hover[Math.floor(hover.length / 2)] : null, screens: document.documentElement.scrollHeight / innerHeight };
}

async function checkRichness(page, label) {
  const findings = [];
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const stops = [];
  for (let top = 0; top < height - viewportHeight; top += viewportHeight) stops.push(top);
  stops.push(Math.max(0, height - viewportHeight));
  for (const [index, top] of [...new Set(stops)].entries()) {
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.evaluate(waitForScrollIdle);
    await settle(page);
    const cover = await page.evaluate(screenCoverage);
    if (cover.surface < richness.surfaceShare && cover.text < richness.textShare) {
      findings.push(`${label} richness: screen ${index + 1} (${top}-${top + viewportHeight}px) is empty: images, drawn scenes, and product surfaces cover ${Math.round(cover.surface * 100)}% and text ${Math.round(cover.text * 100)}% (floor ${richness.surfaceShare * 100}% or ${richness.textShare * 100}%)`);
    }
  }
  const detail = await page.evaluate(detailCounts);
  const floor = Math.max(richness.minTransitions, Math.round(richness.transitionsPerScreen * detail.screens));
  if (detail.transitions < floor) findings.push(`${label} richness: ${detail.transitions} responsive elements with transitions, below ${floor} (${richness.transitionsPerScreen} per screen)`);
  if (detail.hoverMedian !== null && detail.hoverMedian > richness.slowHoverMs) findings.push(`${label} richness: link and button transitions have a median of ${Math.round(detail.hoverMedian)}ms, slower than ${richness.slowHoverMs}ms`);
  if (detail.clipped < richness.minClipped) findings.push(`${label} richness: ${detail.clipped} elements use a mask or clip-path, below ${richness.minClipped}`);
  if (detail.hairlines < richness.minHairlines) findings.push(`${label} richness: ${detail.hairlines} elements carry 1px hairline borders, below ${richness.minHairlines}`);
  return findings;
}

// ---------- in-page helpers (serialized into the page) ----------

// Resolves once GSAP tweens (other than scrubbed or infinite ones) and finite CSS animations have finished.
function pageIsSettled() {
  const gsapIdle = !window.gsap || window.gsap.globalTimeline.getChildren(true, true, false)
    .filter((tween) => (!tween.scrollTrigger || !tween.scrollTrigger.vars.scrub) && tween.vars.repeat !== -1)
    .every((tween) => !tween.isActive());
  const cssIdle = document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getComputedTiming().iterations === Infinity);
  return gsapIdle && cssIdle;
}

async function waitForScrollIdle() {
  let last = -1;
  let stable = 0;
  for (let frame = 0; frame < 600 && stable < 8; frame += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (Math.abs(scrollY - last) < 0.5) stable += 1;
    else { stable = 0; last = scrollY; }
  }
}

// Bottom edge of sticky or fixed bars pinned to the top of the viewport (site headers).
function topBarBottom(exclude) {
  let bottom = 0;
  for (const element of document.querySelectorAll("body *")) {
    const style = getComputedStyle(element);
    if (style.position !== "fixed" && style.position !== "sticky") continue;
    if (exclude && (element.contains(exclude) || exclude.contains(element))) continue;
    const rect = element.getBoundingClientRect();
    if (rect.top > 1 || rect.height === 0 || rect.height > innerHeight / 3 || !element.querySelector("a, button")) continue;
    bottom = Math.max(bottom, rect.bottom);
  }
  return bottom;
}

export function hiddenTextFailures() {
  const failures = [];
  const hiddenBy = (element) => {
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.visibility === "hidden" || style.display === "none") return "hidden";
      if (Number(style.opacity) < 0.5) return `opacity ${style.opacity}`;
    }
    return null;
  };
  for (const element of document.querySelectorAll("main h1, main h2, main h3, main p")) {
    if (!element.textContent.trim() || element.closest("[aria-hidden='true']")) continue;
    const reason = hiddenBy(element);
    if (reason) failures.push(`"${element.textContent.trim().slice(0, 40)}" is ${reason}`);
  }
  return failures;
}

export function infiniteAnimationFailures() {
  return document.getAnimations()
    .filter((animation) => animation.playState === "running" && animation.effect?.getComputedTiming().iterations === Infinity)
    .map((animation) => `infinite animation ${animation.animationName ?? animation.id ?? "unnamed"} is running`);
}

function contrastFailures() {
  const parse = (value) => (value.match(/[\d.]+/g) ?? []).map(Number);
  const luminance = (rgb) => {
    const [r, g, b] = rgb.slice(0, 3).map((channel) => { const c = channel / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const solidBackground = (element) => {
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== "none") return null;
      const color = parse(style.backgroundColor);
      if (color.length >= 3 && (color[3] ?? 1) >= 0.95) return color;
    }
    const root = parse(getComputedStyle(document.documentElement).backgroundColor);
    return root.length >= 3 && (root[3] ?? 1) >= 0.95 ? root : [255, 255, 255];
  };
  const failures = new Set();
  for (const element of document.querySelectorAll("body *")) {
    if (![...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim())) continue;
    if (element.closest("[aria-hidden='true']")) continue;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    if (style.visibility === "hidden" || style.display === "none" || rect.width <= 1 || rect.height <= 1) continue;
    const foreground = parse(style.color);
    if ((foreground[3] ?? 1) === 0) continue; // gradient-clipped text
    const background = solidBackground(element);
    if (!background) continue;
    const alpha = foreground[3] ?? 1;
    const blended = [0, 1, 2].map((index) => foreground[index] * alpha + background[index] * (1 - alpha));
    const [light, dark] = [luminance(blended), luminance(background)].sort((a, b) => b - a);
    const ratio = (light + 0.05) / (dark + 0.05);
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
    const required = large ? 3 : 4.5;
    if (ratio < required) failures.add(`contrast ${ratio.toFixed(2)} < ${required} for ${element.tagName.toLowerCase()} "${element.textContent.trim().slice(0, 32)}"`);
  }
  return [...failures];
}

function linkFailures() {
  const failures = [];
  for (const link of document.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href");
    const label = link.textContent.trim().slice(0, 32) || href;
    if (/\.md(?:[#?]|$)/.test(href)) failures.push(`link "${label}" opens raw Markdown (${href})`);
    if (href === "#") failures.push(`link "${label}" has an empty fragment`);
    if (href.startsWith("#") && href.length > 1) {
      const target = document.getElementById(decodeURIComponent(href.slice(1)));
      if (!target) failures.push(`link "${label}" targets missing ${href}`);
      else if (href === "#top" && !link.closest("header")) failures.push(`link "${label}" loops back to #top`);
    }
  }
  return failures;
}

// Infinite CSS animations or repeating GSAP tweens that keep running on elements entirely offscreen.
function offscreenAmbientFailures() {
  const offscreen = (element) => {
    if (!(element instanceof Element) || !element.isConnected) return false;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth;
  };
  const describe = (element) => `${element.tagName.toLowerCase()}.${String(element.className?.baseVal ?? element.className).split(" ")[0]}`;
  const failures = new Set();
  for (const animation of document.getAnimations()) {
    const target = animation.effect?.target;
    if (animation.playState === "running" && animation.effect?.getComputedTiming().iterations === Infinity && offscreen(target)) {
      failures.add(`infinite animation ${animation.animationName ?? "unnamed"} keeps running on offscreen ${describe(target)}`);
    }
  }
  if (window.gsap) {
    for (const tween of window.gsap.globalTimeline.getChildren(true, true, false)) {
      if (tween.vars.repeat !== -1 || tween.paused() || !tween.isActive() || typeof tween.targets !== "function") continue;
      for (const target of tween.targets()) {
        if (offscreen(target)) failures.add(`repeating GSAP tween keeps running on offscreen ${describe(target)}`);
      }
    }
  }
  return [...failures];
}

function fixedTooTall() {
  const failures = [];
  for (const element of document.querySelectorAll("body *")) {
    if (getComputedStyle(element).position !== "fixed" || !element.textContent.trim()) continue;
    const rect = element.getBoundingClientRect();
    if (rect.height > innerHeight + 1) failures.push(`fixed or pinned ${element.tagName.toLowerCase()}.${String(element.className).split(" ")[0]} is ${Math.round(rect.height)}px tall in a ${innerHeight}px viewport`);
  }
  return failures;
}

// ---------- node-side helpers ----------

export async function settle(page) {
  await page.waitForFunction(pageIsSettled, null, { timeout: page.sgFast ? fastSettleTimeoutMs : settleTimeoutMs, polling: "raf" }).catch(() => {});
}

export async function openPage(browser, url, contextOptions, sameOriginBase, failures, label) {
  const { blockExternal, blockScripts, budget, fast, ...browserContextOptions } = contextOptions;
  const context = await browser.newContext(browserContextOptions);
  if (budget) {
    budget.contexts.add(context);
    context.on("close", () => budget.contexts.delete(context));
  }
  if (blockExternal || blockScripts) {
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (blockExternal && new URL(request.url()).origin !== new URL(sameOriginBase).origin) return route.abort();
      if (blockScripts && request.resourceType() === "script") return route.abort();
      if (blockScripts && request.resourceType() === "document") {
        // Inline scripts too: a CSP that allows no script at all is a true no-JavaScript page.
        const response = await route.fetch();
        return route.fulfill({ response, headers: { ...response.headers(), "content-security-policy": "script-src 'none'" } });
      }
      return route.continue();
    });
  }
  const page = await context.newPage();
  page.sgFast = Boolean(fast);
  page.on("pageerror", (error) => failures.push(`${label}: page error ${error.message}`));
  page.on("response", (response) => {
    if (new URL(response.url()).origin === new URL(sameOriginBase).origin && response.status() >= 400) failures.push(`${label}: ${response.status()} for ${response.url().slice(sameOriginBase.length)}`);
  });
  try {
    if (fast) {
      // Live sites keep loading trackers and ads; the document is what the checks read.
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForLoadState("load", { timeout: 5000 }).catch(() => {});
    } else await page.goto(url, { waitUntil: "load", timeout: 20000 });
  } catch (error) {
    failures.push(`${label}: page did not finish loading (${error.message.split("\n")[0]})`);
  }
  await page.evaluate((fast) => (fast ? Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 3000))]) : document.fonts.ready), Boolean(fast)).catch(() => {});
  await settle(page);
  return { context, page };
}

export async function scrollToStop(page, stop) {
  await page.evaluate(async (stop) => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const target = stop === "top" ? 0 : stop === "middle" ? max / 2 : stop === "bottom" ? max : max * stop;
    const steps = 12;
    const start = scrollY;
    for (let index = 1; index <= steps; index += 1) {
      window.scrollTo(0, start + ((target - start) * index) / steps);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
  }, stop);
  await settle(page);
}

export async function overflowFailure(page, label) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  return scrollWidth > clientWidth + 1 ? [`${label}: horizontal overflow ${scrollWidth}px > ${clientWidth}px`] : [];
}

export async function checkFocus(page, label) {
  const failures = [];
  // Resting styles stay in the page: sending one string per element on every Tab press made
  // large live pages spend most of the focus walk on serialization.
  await page.evaluate(() => {
    window.__sgRestStyles = [...document.querySelectorAll("*")].map((element) => {
      const s = getComputedStyle(element);
      return [s.color, s.backgroundColor, s.boxShadow, s.borderColor, s.textDecorationLine].join("|");
    });
  });
  const tabbables = await page.evaluate(() => {
    const selector = "a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex='-1'])";
    return [...document.querySelectorAll(selector)].filter((element) => !element.disabled && !element.closest("[inert]") && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden").length;
  });
  await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur(); });
  let previousIndex = -1;
  const limit = Math.min(tabbables, maxTabStops);
  for (let step = 0; step < limit; step += 1) {
    await page.keyboard.press("Tab");
    const state = await page.evaluate(async () => {
      const restStyles = window.__sgRestStyles;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const element = document.activeElement;
      if (!element || element === document.body) return null;
      const rect = element.getBoundingClientRect();
      const index = [...document.querySelectorAll("*")].indexOf(element);
      const s = getComputedStyle(element);
      const ring = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 && s.outlineColor !== "rgba(0, 0, 0, 0)";
      const changed = [s.color, s.backgroundColor, s.boxShadow, s.borderColor, s.textDecorationLine].join("|") !== restStyles[index];
      // Hit-test the center of each line box (a wrapped link has several): stacking order decides
      // what covers what. The element is obscured only if no line box is reachable.
      let coveredBy = "";
      const reachable = [...element.getClientRects()].some((box) => {
        const x = Math.min(Math.max((box.left + box.right) / 2, 1), innerWidth - 1);
        const y = Math.min(Math.max((box.top + box.bottom) / 2, 1), innerHeight - 1);
        const hit = document.elementFromPoint(x, y);
        if (!hit || hit === element || element.contains(hit)) return true;
        coveredBy = `${hit.tagName.toLowerCase()}.${String(hit.className).split(" ")[0]}`;
        return false;
      });
      return {
        index,
        indicator: ring || changed,
        label: `${element.tagName.toLowerCase()} "${(element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 24)}"`,
        hasBox: rect.width > 0 && rect.height > 0,
        inViewport: rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth,
        obscured: !reachable,
        coveredBy,
      };
    });
    if (!state) {
      failures.push(`${label}: tab stop ${step + 1} of ${limit} left the document`);
      break;
    }
    if (!state.hasBox) failures.push(`${label}: focused ${state.label} has no box`);
    if (!state.indicator) failures.push(`${label}: focused ${state.label} has no visible focus indicator`);
    if (!state.inViewport) failures.push(`${label}: focused ${state.label} is outside the viewport`);
    if (state.inViewport && state.obscured) failures.push(`${label}: focused ${state.label} is covered by ${state.coveredBy}`);
    if (state.index <= previousIndex) failures.push(`${label}: focused ${state.label} out of DOM order`);
    previousIndex = state.index;
  }
  return failures;
}

async function checkDemoActions(page, label) {
  const failures = [];
  const count = await page.locator("[data-demo]").count();
  for (let index = 0; index < count; index += 1) {
    const action = page.locator("[data-demo]").nth(index);
    const tag = await action.evaluate((element) => element.tagName.toLowerCase());
    const name = (await action.textContent()).trim().slice(0, 32);
    if (tag !== "button") failures.push(`${label}: demo action "${name}" must be a button`);
    await action.scrollIntoViewIfNeeded();
    await page.evaluate(waitForScrollIdle);
    const before = await page.evaluate(() => scrollY);
    await action.click();
    const announced = await page.waitForFunction(() => [...document.querySelectorAll("[role='status']")].some((status) => {
      if (!status.textContent.trim()) return false;
      const style = getComputedStyle(status);
      const rect = status.getBoundingClientRect();
      return style.visibility !== "hidden" && Number(style.opacity) > 0.5 && rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight;
    }), null, { timeout: 2500 }).then(() => true, () => false);
    if (!announced) failures.push(`${label}: demo action "${name}" shows no visible role="status" message`);
    await page.evaluate(waitForScrollIdle);
    const after = await page.evaluate(() => scrollY);
    if (Math.abs(after - before) > 2) failures.push(`${label}: demo action "${name}" moved the page by ${Math.round(after - before)}px`);
  }
  return failures;
}

async function landingState(page, id) {
  return page.evaluate(({ id, topBarSource }) => {
    const target = document.getElementById(id);
    const heading = target.querySelector("h1, h2, h3") ?? target;
    const topBar = new Function(`return (${topBarSource})`)();
    const rect = heading.getBoundingClientRect();
    return { top: Math.round(rect.top), bar: Math.round(topBar(target)), height: innerHeight, hash: location.hash, scrollY: Math.round(scrollY) };
  }, { id, topBarSource: topBarBottom.toString() });
}

async function checkHashNavigation(browser, url, base, label, env = {}) {
  const entry = new URL(url);
  entry.hash = "";
  url = entry.href;
  const failures = [];
  const { context, page } = await openPage(browser, url, { viewport: { width: 1440, height: viewportHeight }, ...env }, base, failures, label);
  failures.push(...await page.evaluate(() => [...document.querySelectorAll("a[href^='#']")].flatMap((link) => {
    const hash = link.getAttribute("href");
    return hash.length > 1 && !document.getElementById(decodeURIComponent(hash.slice(1))) ? [`missing hash target ${hash}`] : [];
  })));
  const navTargets = await page.evaluate(() => [...document.querySelectorAll("nav a[href^='#']")]
    .filter((link) => link.getClientRects().length > 0 && link.getAttribute("href") !== "#top" && document.getElementById(decodeURIComponent(link.getAttribute("href").slice(1))))
    .map((link) => link.getAttribute("href")));
  if (navTargets.length > 0) {
    const first = navTargets[0];
    await page.locator(`nav a[href=${JSON.stringify(first)}]`).first().click();
    await page.evaluate(waitForScrollIdle);
    await settle(page);
    const landed = await landingState(page, first.slice(1));
    if (landed.hash !== first) failures.push(`${label}: clicking ${first} left the URL hash as "${landed.hash}"`);
    if (landed.top < landed.bar - 1) failures.push(`${label}: after clicking ${first} its heading is under the header (${landed.top}px < ${landed.bar}px)`);
    if (landed.top > landed.height / 2) failures.push(`${label}: after clicking ${first} its heading is ${landed.top}px down, below the top half`);
    await page.goBack();
    await page.evaluate(waitForScrollIdle);
    const back = await page.evaluate(() => ({ hash: location.hash, scrollY: scrollY, height: innerHeight }));
    if (back.hash !== "") failures.push(`${label}: Back after ${first} left hash "${back.hash}"`);
    if (back.scrollY > back.height * 0.25) failures.push(`${label}: Back after ${first} stayed at ${Math.round(back.scrollY)}px instead of returning near the top`);
  }
  await context.close();

  if (navTargets.length > 0) {
    const last = navTargets[navTargets.length - 1];
    const direct = await openPage(browser, `${url}${last}`, { viewport: { width: 1440, height: viewportHeight }, ...env }, base, failures, label);
    await direct.page.evaluate(waitForScrollIdle);
    await settle(direct.page);
    const landed = await landingState(direct.page, last.slice(1));
    if (landed.top < landed.bar - 1 || landed.top > landed.height - 60) failures.push(`${label}: opening ${last} directly landed its heading at ${landed.top}px (header ${landed.bar}px, viewport ${landed.height}px)`);
    await direct.context.close();
  }
  return failures;
}

async function checkShortViewport(browser, url, base, label, env = {}) {
  const failures = [];
  const { context, page } = await openPage(browser, url, { viewport: shortViewport, ...env }, base, failures, label);
  const found = new Set();
  for (let stop = 0; stop <= 24; stop += 1) {
    await scrollToStop(page, stop / 24);
    for (const failure of await page.evaluate(fixedTooTall)) found.add(failure);
  }
  failures.push(...[...found].map((failure) => `${label}: ${failure}`));
  await context.close();
  return failures;
}

async function checkDegraded(browser, url, base, label, contextOptions, env = {}) {
  const failures = [];
  const { context, page } = await openPage(browser, url, { viewport: { width: 390, height: 844 }, ...contextOptions, ...env }, base, failures, label);
  failures.push(...(await page.evaluate(hiddenTextFailures)).map((failure) => `${label}: ${failure}`));
  for (const stop of ["top", "bottom"]) {
    await scrollToStop(page, stop);
    failures.push(...await overflowFailure(page, `${label} ${stop}`));
  }
  await context.close();
  return failures;
}

export const sharedCheckPrinciples = {
  "audit.load": ["hig.patterns.loading.show-something-soon"],
  "audit.overflow": ["hig.foundations.layout.adapt-to-space"],
  "audit.focus": ["hig.foundations.accessibility.keyboard-only"],
  "audit.reduced-motion": ["hig.foundations.motion.optional"],
  "audit.contrast": ["hig.foundations.accessibility.contrast"],
  "audit.hash-navigation": ["hig.foundations.layout.importance-order"],
  "audit.short-viewport": ["hig.foundations.layout.adapt-to-space"],
  "audit.offline": ["hig.patterns.loading.show-something-soon"],
  "audit.no-script": ["hig.patterns.loading.show-something-soon"],
  "audit.link-transition": ["hig.foundations.motion.brief-and-cancelable"],
  "audit.empty-screen": ["slop.empty-screen", "slop.headline-only-gradient-screen"],
};

// Both entry points call this exact matrix. Showcase adds only its local identity,
// demo, ambient-loop and surface-finishing requirements.
// Stage weights for the audit time budget: one per viewport pass and one per follow-up scenario.
export function checkPageWeight(viewportCount) { return 2 * viewportCount + 4; }

export async function checkPage(browser, { slug = "audit", url, base = new URL(url).origin, outDir, rich = true, showcase = true, viewports = widths, budget, fast = false }) {
  const failures = [], warnings = [], screenshots = [];
  const env = { budget, fast };
  const incomplete = new Set();
  const stage = async (name, ids, fn) => {
    if (await runStage(budget, name, 1, fn) === STAGE_INCOMPLETE) for (const id of ids) incomplete.add(id);
  };
  const checks = Object.entries(sharedCheckPrinciples).map(([check_id, principle_ids]) => ({
    check_id, principle_ids, slop_ids: principle_ids.filter((id) => id.startsWith("slop.")), pass: true, evidence: [],
  }));
  const record = (id, messages, scenario) => {
    const check = checks.find(({ check_id }) => check_id === id);
    check.pass &&= messages.length === 0;
    check.evidence.push({ scenario, failures: messages });
    if (!["audit.link-transition", "audit.empty-screen"].includes(id)) failures.push(...messages);
  };
  if (outDir) fs.mkdirSync(path.join(outDir, slug), { recursive: true });
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const mode = reducedMotion === "reduce" ? "reduced" : "motion";
    for (const width of viewports) {
      const label = `${mode} w${width}`;
      const widest = width === Math.max(...viewports);
      const ids = ["audit.load", "audit.overflow", mode === "motion" ? "audit.focus" : "audit.reduced-motion",
        ...(widest ? (mode === "motion" ? ["audit.empty-screen", "audit.link-transition"] : ["audit.contrast"]) : [])];
      await stage(label, ids, async () => {
      const loadFailures = [];
      const { context, page } = await openPage(browser, url, { viewport: { width, height: viewportHeight }, reducedMotion, ...env }, base, loadFailures, label);
      try {
        for (const stop of scrollStops) {
          await scrollToStop(page, stop);
          record("audit.overflow", await overflowFailure(page, `${label} ${stop}`), `${label} ${stop}`);
          if (outDir) {
            const file = path.join(outDir, slug, `${mode}-w${width}-${stop}.png`);
            await page.screenshot({ path: file });
            screenshots.push(path.relative(repositoryRoot, file));
          }
        }
        if (mode === "motion") record("audit.focus", await checkFocus(page, label), label);
        else {
          await scrollToStop(page, "top");
          record("audit.reduced-motion", [...await page.evaluate(hiddenTextFailures), ...await page.evaluate(infiniteAnimationFailures)].map((f) => `${label} reduced-motion: ${f}`), label);
        }
        if (mode === "motion" && width === Math.max(...viewports)) {
          if (showcase) {
            for (const stop of ["top", "bottom"]) {
              await scrollToStop(page, stop);
              failures.push(...(await page.evaluate(offscreenAmbientFailures)).map((f) => `${label} ${stop}: ${f}`));
            }
          }
          const findings = await checkRichness(page, label);
          record("audit.empty-screen", findings.filter((f) => f.includes("is empty:")), label);
          record("audit.link-transition", findings.filter((f) => f.includes("transitions have a median")), label);
          if (rich) warnings.push(...findings);
        }
        if (mode === "reduced" && width === Math.max(...viewports)) {
          record("audit.contrast", (await page.evaluate(contrastFailures)).map((f) => `${label}: ${f}`), label);
          if (showcase) {
            failures.push(...(await page.evaluate(linkFailures)).map((f) => `${label}: ${f}`));
            const identity = await page.evaluate(() => ({ title: document.title.trim(), icon: Boolean(document.querySelector("link[rel~='icon']")) }));
            if (!identity.title) failures.push(`${label}: page has no title`);
            if (!identity.icon) failures.push(`${label}: page declares no favicon`);
            failures.push(...await checkDemoActions(page, label));
          }
        }
        record("audit.load", loadFailures, label);
      } finally { await context.close(); }
      });
    }
  }
  await stage("hash navigation", ["audit.hash-navigation"], async () => record("audit.hash-navigation", await checkHashNavigation(browser, url, base, "motion w1440 navigation", env), "click, Back, direct hash"));
  await stage("short viewport", ["audit.short-viewport"], async () => record("audit.short-viewport", await checkShortViewport(browser, url, base, "motion 1280x620", env), "24 scroll stops at 1280x620"));
  await stage("offline", ["audit.offline"], async () => record("audit.offline", await checkDegraded(browser, url, base, "offline w390", { blockExternal: true }, env), "third-party requests blocked"));
  await stage("no-script", ["audit.no-script"], async () => record("audit.no-script", await checkDegraded(browser, url, base, "no-script w390", { blockScripts: true }, env), "external and inline scripts blocked by CSP"));
  return { failures, screenshots, warnings, checks, incomplete: [...incomplete] };
}
