#!/usr/bin/env node
// Outcome checks for showcase works and the showcase hub. Each check maps to a scenario in
// showcase/QA.md. Taste is reviewed from the settled screenshots, not judged here.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const widths = [320, 768, 1440];
const viewportHeight = 900;
const shortViewport = { width: 1280, height: 620 };
const scrollStops = ["top", "middle", "bottom"];
const maxTabStops = 60;
const settleTimeoutMs = 6000;
export const mimeTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".md": "text/markdown; charset=utf-8" };

function parseArgs(argv) {
  const value = (flag) => { const index = argv.indexOf(flag); return index === -1 ? null : argv[index + 1]; };
  return {
    json: argv.includes("--json"),
    work: value("--work"),
    root: path.resolve(repositoryRoot, value("--root") ?? "showcase"),
    out: path.resolve(repositoryRoot, value("--out") ?? ".tmp/showcase"),
    concurrency: Math.max(1, Number(value("--concurrency") ?? 3)),
    richness: value("--richness") ?? "warn",
  };
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
    await page.waitForTimeout(250);
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

function frontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  return Object.fromEntries(match[1].split("\n").filter((line) => line.includes(":")).map((line) => {
    const index = line.indexOf(":");
    return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")];
  }));
}

export function checkBrief(slug, briefContent, htmlContent) {
  const failures = [];
  const meta = frontmatter(briefContent);
  if (!meta) return [`${slug}/brief.md: missing frontmatter`];
  if (meta.type !== "Showcase Brief") failures.push(`${slug}/brief.md: type must be Showcase Brief`);
  for (const field of ["title", "description"]) if (!meta[field]) failures.push(`${slug}/brief.md: missing ${field}`);
  if (!["true", "false"].includes(meta.brand_study)) failures.push(`${slug}/brief.md: brand_study must be true or false`);
  if (meta.brand_study === "true") {
    if (!meta.subject) failures.push(`${slug}/brief.md: brand study must name its subject`);
    if (!/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(htmlContent)) failures.push(`${slug}/index.html: brand study must set robots noindex`);
  }
  return failures;
}

function listWorks(showcaseRoot) {
  return fs.readdirSync(showcaseRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(showcaseRoot, entry.name, "index.html")))
    .map((entry) => entry.name)
    .sort();
}

export function serveDirectory(directory, { port = 0, host = "127.0.0.1" } = {}) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    let target = path.join(directory, decodeURIComponent(url.pathname));
    if (!target.startsWith(directory)) {
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

function hiddenTextFailures() {
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

function infiniteAnimationFailures() {
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

async function settle(page) {
  await page.waitForFunction(pageIsSettled, null, { timeout: settleTimeoutMs, polling: "raf" }).catch(() => {});
}

async function openPage(browser, url, contextOptions, sameOriginBase, failures, label) {
  const { blockExternal, blockScripts, ...browserContextOptions } = contextOptions;
  const context = await browser.newContext(browserContextOptions);
  if (blockExternal || blockScripts) {
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (blockExternal && !request.url().startsWith(sameOriginBase)) return route.abort();
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
  page.on("pageerror", (error) => failures.push(`${label}: page error ${error.message}`));
  page.on("response", (response) => {
    if (response.url().startsWith(sameOriginBase) && response.status() >= 400) failures.push(`${label}: ${response.status()} for ${response.url().slice(sameOriginBase.length)}`);
  });
  try {
    await page.goto(url, { waitUntil: "load", timeout: 20000 });
  } catch (error) {
    failures.push(`${label}: page did not finish loading (${error.message.split("\n")[0]})`);
  }
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await settle(page);
  return { context, page };
}

async function scrollToStop(page, stop) {
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

async function overflowFailure(page, label) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  return scrollWidth > clientWidth + 1 ? [`${label}: horizontal overflow ${scrollWidth}px > ${clientWidth}px`] : [];
}

async function checkFocus(page, label) {
  const failures = [];
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
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const element = document.activeElement;
      if (!element || element === document.body) return null;
      const rect = element.getBoundingClientRect();
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
        index: [...document.querySelectorAll("*")].indexOf(element),
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

async function checkHashNavigation(browser, url, base, label) {
  const failures = [];
  const { context, page } = await openPage(browser, url, { viewport: { width: 1440, height: viewportHeight } }, base, failures, label);
  const navTargets = await page.evaluate(() => [...document.querySelectorAll("header nav a[href^='#']")]
    .filter((link) => link.getClientRects().length > 0 && link.getAttribute("href") !== "#top")
    .map((link) => link.getAttribute("href")));
  if (navTargets.length > 0) {
    const first = navTargets[0];
    await page.click(`header nav a[href='${first}']`);
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
    const direct = await openPage(browser, `${url}${last}`, { viewport: { width: 1440, height: viewportHeight } }, base, failures, label);
    await direct.page.evaluate(waitForScrollIdle);
    await settle(direct.page);
    const landed = await landingState(direct.page, last.slice(1));
    if (landed.top < landed.bar - 1 || landed.top > landed.height - 60) failures.push(`${label}: opening ${last} directly landed its heading at ${landed.top}px (header ${landed.bar}px, viewport ${landed.height}px)`);
    await direct.context.close();
  }
  return failures;
}

async function checkShortViewport(browser, url, base, label) {
  const failures = [];
  const { context, page } = await openPage(browser, url, { viewport: shortViewport }, base, failures, label);
  const found = new Set();
  for (let stop = 0; stop <= 24; stop += 1) {
    await scrollToStop(page, stop / 24);
    for (const failure of await page.evaluate(fixedTooTall)) found.add(failure);
  }
  failures.push(...[...found].map((failure) => `${label}: ${failure}`));
  await context.close();
  return failures;
}

async function checkDegraded(browser, url, base, label, contextOptions) {
  const failures = [];
  const { context, page } = await openPage(browser, url, { viewport: { width: 390, height: 844 }, ...contextOptions }, base, failures, label);
  failures.push(...(await page.evaluate(hiddenTextFailures)).map((failure) => `${label}: ${failure}`));
  for (const stop of ["top", "bottom"]) {
    await scrollToStop(page, stop);
    failures.push(...await overflowFailure(page, `${label} ${stop}`));
  }
  await context.close();
  return failures;
}

async function checkPage(browser, { slug, url, base, outDir, rich = false }) {
  const failures = [];
  const warnings = [];
  const screenshots = [];
  fs.mkdirSync(path.join(outDir, slug), { recursive: true });
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const mode = reducedMotion === "reduce" ? "reduced" : "motion";
    for (const width of widths) {
      const label = `${mode} w${width}`;
      const { context, page } = await openPage(browser, url, { viewport: { width, height: viewportHeight }, reducedMotion }, base, failures, label);
      for (const stop of scrollStops) {
        await scrollToStop(page, stop);
        failures.push(...await overflowFailure(page, `${label} ${stop}`));
        const file = path.join(outDir, slug, `${mode}-w${width}-${stop}.png`);
        await page.screenshot({ path: file });
        screenshots.push(path.relative(repositoryRoot, file));
      }
      if (mode === "motion" && width === 1440) {
        for (const stop of ["top", "bottom"]) {
          await scrollToStop(page, stop);
          failures.push(...(await page.evaluate(offscreenAmbientFailures)).map((failure) => `${label} ${stop}: ${failure}`));
        }
        if (rich) warnings.push(...await checkRichness(page, label));
      }
      if (mode === "motion") failures.push(...await checkFocus(page, label));
      else {
        await scrollToStop(page, "top");
        failures.push(...(await page.evaluate(hiddenTextFailures)).map((failure) => `${label} reduced-motion: ${failure}`));
        failures.push(...(await page.evaluate(infiniteAnimationFailures)).map((failure) => `${label} reduced-motion: ${failure}`));
      }
      if (mode === "reduced" && width === 1440) {
        failures.push(...(await page.evaluate(contrastFailures)).map((failure) => `${label}: ${failure}`));
        failures.push(...(await page.evaluate(linkFailures)).map((failure) => `${label}: ${failure}`));
        const identity = await page.evaluate(() => ({ title: document.title.trim(), icon: Boolean(document.querySelector("link[rel~='icon']")) }));
        if (!identity.title) failures.push(`${label}: page has no title`);
        if (!identity.icon) failures.push(`${label}: page declares no favicon`);
        failures.push(...await checkDemoActions(page, label));
      }
      await context.close();
    }
  }
  failures.push(...await checkHashNavigation(browser, url, base, "motion w1440 navigation"));
  failures.push(...await checkShortViewport(browser, url, base, `motion ${shortViewport.width}x${shortViewport.height}`));
  failures.push(...await checkDegraded(browser, url, base, "offline w390", { blockExternal: true }));
  failures.push(...await checkDegraded(browser, url, base, "no-script w390", { blockScripts: true }));
  return { failures, screenshots, warnings };
}

async function checkHub(browser, showcaseRoot, works, base, outDir) {
  const hubPath = path.join(showcaseRoot, "index.html");
  if (!fs.existsSync(hubPath)) return { slug: "(hub)", ok: false, failures: ["showcase/index.html is missing; the showcase root must be a hub"], screenshots: [] };
  const { failures, screenshots } = await checkPage(browser, { slug: "_hub", url: `${base}/`, base, outDir });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: "load" });
  const linked = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((link) => new URL(link.getAttribute("href"), location.href).pathname));
  for (const slug of works) {
    if (!linked.includes(`/${slug}/`)) failures.push(`hub does not link work ${slug} (expected href "${slug}/")`);
  }
  await context.close();
  return { slug: "(hub)", ok: failures.length === 0, failures: [...new Set(failures)], screenshots };
}

async function checkWork(browser, showcaseRoot, slug, base, outDir, richnessMode = "warn") {
  const failures = [];
  const workDir = path.join(showcaseRoot, slug);
  const briefPath = path.join(workDir, "brief.md");
  const html = fs.readFileSync(path.join(workDir, "index.html"), "utf8");
  const brief = fs.existsSync(briefPath) ? fs.readFileSync(briefPath, "utf8") : "";
  if (!brief) failures.push(`${slug}/brief.md: missing file`);
  else failures.push(...checkBrief(slug, brief, html));
  const url = `${base}/${slug}/`;
  if (frontmatter(brief)?.brand_study === "true") {
    const context = await browser.newContext({ viewport: { width: 320, height: viewportHeight } });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "load" });
    if (!/unofficial/i.test(await page.evaluate(() => document.body.innerText))) failures.push(`${slug}: brand study must show visible Unofficial text`);
    await context.close();
  }
  const { failures: pageFailures, screenshots, warnings } = await checkPage(browser, { slug, url, base, outDir, rich: richnessMode !== "off" });
  failures.push(...pageFailures);
  // Richness is a warning by default so existing works keep passing; --richness error makes it a failure.
  if (richnessMode === "error") failures.push(...warnings);
  return { slug, ok: failures.length === 0, failures: [...new Set(failures)], warnings: richnessMode === "error" ? [] : [...new Set(warnings)], screenshots };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const works = listWorks(options.root);
  if (options.work && options.work !== "hub" && !works.includes(options.work)) throw new Error(`unknown showcase work: ${options.work}`);
  if (!["warn", "error", "off"].includes(options.richness)) throw new Error(`--richness must be warn, error, or off (got ${options.richness})`);
  const server = await serveDirectory(options.root);
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  // Each task is isolated: a crash in one work becomes that work's failure, never an aborted run.
  const tasks = [];
  // The hub is required once any work exists; an empty showcase has nothing to route to.
  const hubExists = fs.existsSync(path.join(options.root, "index.html"));
  if ((!options.work || options.work === "hub") && (works.length > 0 || hubExists)) tasks.push({ slug: "(hub)", run: () => checkHub(browser, options.root, works, base, options.out) });
  for (const slug of works) {
    if (!options.work || options.work === slug) tasks.push({ slug, run: () => checkWork(browser, options.root, slug, base, options.out, options.richness) });
  }
  const results = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const index = next++;
      try {
        results[index] = await tasks[index].run();
      } catch (error) {
        results[index] = { slug: tasks[index].slug, ok: false, failures: [`checker error: ${error.message.split("\n")[0]}`], screenshots: [] };
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(options.concurrency, tasks.length) }, worker));
  } finally {
    await browser.close();
    server.close();
  }
  const result = { ok: results.every((work) => work.ok), works: results, ...(results.length === 0 ? { note: "no showcase works to check" } : {}) };
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else if (results.length === 0) console.log("ok: no showcase works to check");
  else for (const work of results) {
    const warnings = work.warnings ?? [];
    console.log(`${work.ok ? "ok" : "FAIL"}: ${work.slug}${warnings.length ? ` (${warnings.length} richness warnings)` : ""}${work.ok ? "" : "\n  " + work.failures.join("\n  ")}${warnings.length ? "\n  warn: " + warnings.join("\n  warn: ") : ""}`);
  }
  process.exitCode = result.ok ? 0 : 1;
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) await main();
