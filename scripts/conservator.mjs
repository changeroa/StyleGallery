#!/usr/bin/env node
// The Conservator inspects the gallery's Layout patterns in a real browser. For every exhibit in
// scripts/conservator-exhibits.mjs it renders the pattern doc's CSS block verbatim around stress
// content at 320, 768, and 1440 CSS pixels and measures the spatial behavior the doc claims, plus
// root inline overflow, keyboard focus order, axe-core serious or critical rules, and running
// infinite animations under reduced motion. Negative controls (--controls) remove a declaration the
// doc says the layout depends on and require the named behavior to fail.
// A pass supports the rendered layout contract on one Chromium engine; it does not prove usability
// or complete accessibility.

import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exhibits, notMeasured, sharedMeasures } from "./conservator-exhibits.mjs";

const galleryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const conservatorWidths = [320, 768, 1440];
const viewportHeight = 720;
const blockingImpacts = new Set(["serious", "critical"]);
const maxTabStops = 40;

// Harness normalization only: a readable default face and no UA margins on text and figures, so
// measured gaps come from the pattern CSS. The pattern CSS follows and wins on its own selectors.
const harnessCss = `body { background: #fff; color: #111; font: 16px/1.5 system-ui, sans-serif; margin: 0; }
h1, h2, p, figure { margin: 0; }
a { color: #0a3a8a; }`;

export class ConservatorError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export function patternDocPath(root, slug) {
  const patternsDir = path.join(root, "patterns");
  for (const category of fs.existsSync(patternsDir) ? fs.readdirSync(patternsDir).sort() : []) {
    const candidate = path.join(patternsDir, category, `${slug}.md`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function patternCss(root, slug) {
  const doc = patternDocPath(root, slug);
  if (!doc) throw new ConservatorError("pattern_missing", `no pattern doc patterns/*/${slug}.md`);
  const css = fs.readFileSync(doc, "utf8").split(/^## CSS\s*$/m)[1]?.match(/^```css\n([\s\S]*?)^```/m)?.[1];
  if (!css) throw new ConservatorError("pattern_css_missing", `${path.relative(root, doc)} has no css block under ## CSS`);
  return css;
}

export function withoutDeclaration(css, selector, property) {
  const start = css.indexOf(`${selector} {\n`);
  const end = start === -1 ? -1 : css.indexOf("\n}", start);
  if (end === -1) throw new ConservatorError("control_target_missing", `css has no rule for ${selector}`);
  const block = css.slice(start, end);
  const pattern = new RegExp(`\\n {4}${property.replace(/[-]/g, "\\-")}: [^;]+;`);
  if (!pattern.test(block)) throw new ConservatorError("control_target_missing", `${selector} declares no ${property}`);
  return css.slice(0, start) + block.replace(pattern, "") + css.slice(end);
}

export function exhibitPage(exhibit, css) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${exhibit.slug} Conservator exhibit</title>
<style data-conservator="harness">
${harnessCss}
${exhibit.harness ?? ""}
</style>
<style data-conservator="pattern">
${css}</style>
</head>
<body>
${exhibit.html}
</body>
</html>
`;
}

// Runs inside the page. Builds the helper object, loads the shared measures, and runs one measure.
function measureInPage({ measure, shared, width }) {
  const failures = [];
  const root = document.documentElement;
  const c = {
    W: root.clientWidth,
    H: innerHeight,
    root,
    q(selector) {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`exhibit has no ${selector}`);
      return element;
    },
    r(selector) { return c.q(selector).getBoundingClientRect(); },
    rs(selector) { return [...document.querySelectorAll(selector)].map((element) => element.getBoundingClientRect()); },
    near(a, b, tolerance = 1.5) { return Math.abs(a - b) <= tolerance; },
    rowsOf(rects) {
      const rows = [];
      for (const rect of rects) {
        const row = rows.at(-1);
        if (row && Math.abs(row[0].top - rect.top) < 2) row.push(rect);
        else rows.push([rect]);
      }
      return rows;
    },
    length(value, selector) {
      const probe = document.createElement("div");
      probe.style.cssText = `display:block;inline-size:${value};block-size:0;padding:0;border:0`;
      c.q(selector).append(probe);
      const size = probe.getBoundingClientRect().width;
      probe.remove();
      return size;
    },
    expect(condition, behavior, message) { if (!condition) failures.push(`${behavior}: ${message}`); },
  };
  for (const [name, source] of Object.entries(shared)) c[name] = (0, eval)(`(${source})`);
  try { (0, eval)(`(${measure})`)(c, width); } catch (error) { failures.push(`measure-error: ${error.message}`); }
  return failures;
}

async function focusFailures(page) {
  const failures = [];
  const count = await page.evaluate(() => [...document.querySelectorAll("a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex='-1'])")]
    .filter((element) => !element.disabled && element.getClientRects().length > 0).length);
  await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur(); });
  let previous = -1;
  for (let step = 0; step < Math.min(count, maxTabStops); step += 1) {
    await page.keyboard.press("Tab");
    const state = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return null;
      const rect = element.getBoundingClientRect();
      return {
        index: [...document.querySelectorAll("*")].indexOf(element),
        label: `${element.tagName.toLowerCase()} "${(element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 24)}"`,
        visible: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth,
      };
    });
    if (!state) { failures.push(`focus-order: tab stop ${step + 1} left the document`); break; }
    if (!state.visible) failures.push(`focus-order: focused ${state.label} is not visible in the viewport`);
    if (state.index <= previous) failures.push(`focus-order: focused ${state.label} out of DOM order`);
    previous = state.index;
  }
  return failures;
}

async function inspectAt(page, exhibit, css, width, { full, AxeBuilder }) {
  await page.setContent(exhibitPage(exhibit, css), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const shared = Object.fromEntries(Object.entries(sharedMeasures).map(([name, fn]) => [name, fn.toString()]));
  const failures = await page.evaluate(measureInPage, { measure: exhibit.measure.toString(), shared, width });
  await page.evaluate(() => window.scrollTo(0, 0));
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  if (scrollWidth > clientWidth + 1) failures.push(`overflow: document root overflows inline ${scrollWidth}px > ${clientWidth}px`);
  if (full) {
    failures.push(...await focusFailures(page));
    const axe = await new AxeBuilder({ page }).analyze();
    failures.push(...axe.violations.filter((violation) => blockingImpacts.has(violation.impact))
      .map((violation) => `axe: ${violation.impact} ${violation.id} (${violation.nodes.length} nodes)`));
    await page.emulateMedia({ reducedMotion: "reduce" });
    failures.push(...(await page.evaluate(() => document.getAnimations()
      .filter((animation) => animation.playState === "running" && animation.effect?.getComputedTiming().iterations === Infinity)
      .map((animation) => `reduced-motion: infinite animation ${animation.animationName ?? "unnamed"} is running`))));
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
  return failures;
}

const behaviorOf = (failure) => failure.split(": ")[0];

async function loadBrowser({ channel, installBrowser }) {
  let playwright;
  let AxeBuilder;
  try {
    playwright = await import("playwright");
    AxeBuilder = (await import("@axe-core/playwright")).default;
  } catch {
    throw new ConservatorError("playwright_missing", "The Conservator needs the playwright and @axe-core/playwright packages. Reinstall stylegallery, or run npm install playwright @axe-core/playwright in a checkout.");
  }
  if (installBrowser && !channel) await installChromium();
  try {
    return { browser: await playwright.chromium.launch(channel ? { channel } : {}), AxeBuilder };
  } catch (error) {
    const message = String(error.message ?? error);
    if (channel) throw new ConservatorError("browser_unavailable", `Could not launch the installed ${channel} browser: ${message.split("\n")[0]}`);
    throw new ConservatorError("browser_missing", "Chromium for Playwright is not installed. Run `npx playwright install chromium`, rerun with --install-browser, or use an installed Chrome with --channel chrome.");
  }
}

function installChromium() {
  const require = createRequire(import.meta.url);
  const cli = path.join(path.dirname(require.resolve("playwright/package.json")), "cli.js");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, "install", "chromium"], { stdio: ["ignore", process.stderr, process.stderr] });
    child.once("error", reject);
    child.once("exit", (code) => (code === 0 ? resolve() : reject(new ConservatorError("browser_install_failed", `playwright install chromium exited with ${code}`))));
  });
}

export async function runConservator({
  root = galleryRoot, only = null, controls = false, channel = null, installBrowser = false, out = null,
} = {}) {
  const started = Date.now();
  const selected = only ? exhibits.filter(({ slug }) => only.includes(slug)) : exhibits;
  const unknown = only ? only.filter((slug) => !exhibits.some((exhibit) => exhibit.slug === slug)) : [];
  if (unknown.length > 0) throw new ConservatorError("exhibit_unknown", `no Conservator exhibit named ${unknown.join(", ")}`);
  const { browser, AxeBuilder } = await loadBrowser({ channel, installBrowser });
  const results = [];
  try {
    const jobs = selected.flatMap((exhibit) => (exhibit.widths ?? conservatorWidths).map((width) => ({ exhibit, width })));
    const byWidth = new Map();
    for (const job of jobs) byWidth.set(job.width, [...(byWidth.get(job.width) ?? []), job]);
    const outcomes = [];
    // One page per width runs in parallel; exhibits run in sequence on each page.
    await Promise.all([...byWidth.entries()].map(async ([width, widthJobs]) => {
      const context = await browser.newContext({ viewport: { width, height: viewportHeight } });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(`page-error: ${error.message}`));
      try {
        for (const { exhibit } of widthJobs) {
          let css;
          try { css = patternCss(root, exhibit.slug); } catch (error) { outcomes.push({ slug: exhibit.slug, width, kind: "inspect", failures: [`pattern-css: ${error.message}`] }); continue; }
          pageErrors.length = 0;
          const failures = await inspectAt(page, exhibit, css, width, { full: true, AxeBuilder });
          outcomes.push({ slug: exhibit.slug, width, kind: "inspect", failures: [...failures, ...pageErrors] });
          if (controls) {
            const control = exhibit.negative;
            let mutated;
            try { mutated = withoutDeclaration(css, control.selector, control.property); } catch (error) { outcomes.push({ slug: exhibit.slug, width, kind: "control", failures: [`control-target: ${error.message}`] }); continue; }
            outcomes.push({ slug: exhibit.slug, width, kind: "control", failures: await inspectAt(page, exhibit, mutated, width, { full: false, AxeBuilder }) });
          }
        }
      } finally { await context.close(); }
    }));
    for (const exhibit of selected) {
      const widths = exhibit.widths ?? conservatorWidths;
      const inspections = widths.map((width) => outcomes.find((outcome) => outcome.slug === exhibit.slug && outcome.width === width && outcome.kind === "inspect"));
      const entry = {
        slug: exhibit.slug, claim: exhibit.claim, widths,
        ok: inspections.every((outcome) => outcome.failures.length === 0),
        failures: inspections.flatMap((outcome) => outcome.failures.map((failure) => `w${outcome.width}: ${failure}`)),
      };
      if (controls) {
        const control = exhibit.negative;
        const runs = widths.map((width) => outcomes.find((outcome) => outcome.slug === exhibit.slug && outcome.width === width && outcome.kind === "control"));
        const allowed = new Set([control.behavior, ...(control.allow ?? [])]);
        const observed = runs.flatMap((outcome) => outcome.failures);
        const caught = observed.some((failure) => behaviorOf(failure) === control.behavior);
        const stray = observed.filter((failure) => !allowed.has(behaviorOf(failure)));
        entry.control = {
          removed: `${control.selector} { ${control.property} }`, behavior: control.behavior,
          ok: caught && stray.length === 0,
          caught_at: runs.filter((outcome) => outcome.failures.some((failure) => behaviorOf(failure) === control.behavior)).map((outcome) => outcome.width),
          stray,
        };
      }
      results.push(entry);
    }
  } finally {
    await browser.close();
  }
  const failures = results.flatMap((entry) => [
    ...entry.failures.map((failure) => `${entry.slug} ${failure}`),
    ...(entry.control && !entry.control.ok ? [`${entry.slug} control ${entry.control.removed}: ${entry.control.caught_at.length === 0 ? `did not fail ${entry.control.behavior}` : `failed outside ${entry.control.behavior}: ${entry.control.stray.join("; ")}`}`] : []),
  ]);
  const result = {
    ok: failures.length === 0,
    exhibits: results.length,
    widths: conservatorWidths,
    controls,
    failures,
    results,
    not_measured: notMeasured,
    durationMs: Date.now() - started,
  };
  if (out) {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
    for (const exhibit of selected) {
      try {
        fs.mkdirSync(path.join(out, exhibit.slug), { recursive: true });
        fs.writeFileSync(path.join(out, exhibit.slug, "index.html"), exhibitPage(exhibit, patternCss(root, exhibit.slug)));
      } catch { /* a missing pattern is already reported as a failure */ }
    }
  }
  return result;
}

export function parseConservatorArgs(argv) {
  const options = { only: null, controls: false, channel: null, installBrowser: false, out: null, root: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = () => {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith("--")) throw new ConservatorError("argument_value_required", `${flag} requires a value`);
      index += 1;
      return next;
    };
    if (flag === "--controls") options.controls = true;
    else if (flag === "--install-browser") options.installBrowser = true;
    else if (flag === "--json") continue;
    else if (flag === "--pattern") options.only = [...(options.only ?? []), ...value().split(",")];
    else if (flag === "--channel") options.channel = value();
    else if (flag === "--out") options.out = path.resolve(value());
    else if (flag === "--root") options.root = path.resolve(value());
    else throw new ConservatorError("argument_invalid", `Unknown conservator argument: ${flag}`);
  }
  return options;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  try {
    const result = await runConservator(parseConservatorArgs(argv));
    if (argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else if (result.ok) console.log(`ok: ${result.exhibits} exhibits at ${result.widths.join("/")}${result.controls ? " with negative controls" : ""} in ${result.durationMs}ms`);
    else console.error(result.failures.join("\n"));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(`${error.code ?? "conservator_failed"}: ${error.message}`);
    process.exitCode = 2;
  }
}
