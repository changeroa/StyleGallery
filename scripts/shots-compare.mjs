// `stylegallery shots --before <ref|url> --after <ref|url>`: capture the same
// viewport x color-scheme x state matrix for two revisions of a page, diff each
// pair, and write PNGs, a JSON report, and a Markdown PR-body section.
// Runs locally with Playwright Chromium; it does not use the site compiler.
// Screenshot diffs show rendered change, not usability (quality/evidence/visual-qa.md).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

export const VIEWPORTS = Object.freeze([{ width: 390, height: 844 }, { width: 1440, height: 900 }]);
export const SCHEMES = Object.freeze(["light", "dark"]);
const GRID_SIZE = 8;
const handoff = { consumer_reference: "consumer-reference/agent-native/registry.json" };
const BOUNDARY = "Screenshot diffs show rendered change, not usability.";
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".woff2": "font/woff2", ".woff": "font/woff", ".mp4": "video/mp4", ".webm": "video/webm", ".txt": "text/plain; charset=utf-8" };

function failure(code, message) {
  const report = { ok: false, operation: "shots", failures: [{ code, message }] };
  return { report, exitCode: 1, output: `${JSON.stringify(report, null, 2)}\n` };
}

const SPECS = {
  "--before": { field: "before" }, "--after": { field: "after" }, "--page": { field: "page" }, "--out": { field: "out" },
  "--selector": { field: "selector" }, "--threshold": { field: "threshold", number: true }, "--wait": { field: "wait", integer: true },
  "--violations": { field: "violations" }, "--full-page": { field: "full_page", flag: true }, "--format": { field: "format" },
};

export function parseShotsCompareArgs(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 1) {
    const spec = SPECS[args[index]];
    if (!spec) return { error: failure("argument_invalid", `Unknown argument for shots --before/--after: ${args[index]}`) };
    if (Object.hasOwn(values, spec.field)) return { error: failure("argument_duplicate", `${args[index]} was supplied more than once`) };
    if (spec.flag) { values[spec.field] = true; continue; }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) return { error: failure("argument_value_required", `${args[index]} requires a value`) };
    index += 1;
    if (spec.integer && !/^[0-9]+$/.test(value)) return { error: failure("argument_integer_invalid", `${args[index - 1]} must be an unsigned integer`) };
    if (spec.number && !(/^(0|1|0?\.[0-9]+)$/.test(value))) return { error: failure("argument_number_invalid", `${args[index - 1]} must be a number from 0 to 1`) };
    values[spec.field] = spec.integer || spec.number ? Number(value) : value;
  }
  if (values.format !== undefined && values.format !== "json") return { error: failure("format_unsupported", "Only --format json is supported.") };
  if (!values.before || !values.after) return { error: failure("argument_value_required", "shots comparison needs both --before <ref|url> and --after <ref|url>") };
  return { values: { page: "index.html", out: path.join(os.tmpdir(), "stylegallery-shots-compare"), threshold: 0.05, wait: 0, full_page: false, ...values } };
}

const isUrl = (value) => /^(https?|file):\/\//i.test(value);

function git(cwd, args, options = {}) {
  const result = spawnSync("git", ["-C", cwd, ...args], { encoding: options.encoding ?? "utf8", maxBuffer: 1 << 30, timeout: 120000 });
  if (result.status !== 0) throw Object.assign(new Error(`git ${args.join(" ")} failed: ${(result.stderr ?? "").toString().trim()}`), { code: "git_failed" });
  return result.stdout;
}

function serve(root) {
  const server = http.createServer((request, response) => {
    let relative;
    try { relative = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
    catch { response.writeHead(400).end(); return; }
    let target = path.resolve(root, `.${relative}`);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { response.writeHead(404).end(); return; }
    response.writeHead(200, { "content-type": TYPES[path.extname(target).toLowerCase()] ?? "application/octet-stream", "cache-control": "no-store" });
    fs.createReadStream(target).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// A side is an http(s)/file URL, "." for the current working tree, or a Git ref
// whose tree is exported with `git archive` into a temporary directory.
async function prepareSide(input, { cwd, page, cleanups }) {
  if (isUrl(input)) return { input, kind: "url", url: input };
  const top = git(cwd, ["rev-parse", "--show-toplevel"]).trim();
  let root = top;
  let revision = null;
  if (input !== ".") {
    revision = git(cwd, ["rev-parse", "--verify", "--quiet", `${input}^{commit}`]).trim();
    root = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-shots-"));
    cleanups.push(() => fs.rmSync(root, { recursive: true, force: true }));
    const archive = git(top, ["archive", "--format=tar", revision], { encoding: "buffer" });
    const extract = spawnSync("tar", ["-x", "-C", root], { input: archive, maxBuffer: 1 << 30 });
    if (extract.status !== 0) throw Object.assign(new Error(`tar failed: ${extract.stderr.toString().trim()}`), { code: "archive_failed" });
  }
  root = fs.realpathSync(root);
  if (!fs.existsSync(path.join(root, page))) throw Object.assign(new Error(`${page} does not exist in ${input === "." ? "the working tree" : input}`), { code: "page_missing" });
  const server = await serve(root);
  cleanups.push(() => new Promise((resolve) => server.close(resolve)));
  const pagePath = page.split(path.sep).map(encodeURIComponent).join("/");
  return { input, kind: input === "." ? "working_tree" : "git_ref", ...(revision ? { revision } : {}), page, url: `http://127.0.0.1:${server.address().port}/${pagePath}` };
}

export function captureMatrix(selector) {
  const states = selector ? ["default", "focus", "hover"] : ["default"];
  return VIEWPORTS.flatMap((viewport) => SCHEMES.flatMap((scheme) => states.map((state) => ({ viewport, scheme, state, id: `w${viewport.width}-${scheme}-${state}` }))));
}

async function capture(browser, url, cell, options) {
  const context = await browser.newContext({ viewport: cell.viewport, colorScheme: cell.scheme, reducedMotion: "reduce", deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.evaluate(() => document.fonts?.ready);
    if (cell.state !== "default") {
      const target = page.locator(options.selector).first();
      try {
        if (cell.state === "focus") await target.focus({ timeout: 10000 });
        else await target.hover({ timeout: 10000 });
      } catch (error) {
        throw Object.assign(new Error(`${cell.id}: cannot ${cell.state} ${options.selector} at ${url}: ${error.message.split("\n")[0]}`), { code: "state_capture_failed" });
      }
    }
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (options.wait > 0) await page.waitForTimeout(options.wait);
    return await page.screenshot({ fullPage: options.full_page, animations: "disabled", caret: "hide" });
  } finally { await context.close(); }
}

// Decodes both PNGs in Chromium, so the diff needs no image dependency.
// Pixels outside the shared area count as changed; hotspots follow the
// visual-qa image-diff 8x8 grid over the compared area.
async function diffInBrowser(page, beforePng, afterPng, threshold) {
  return page.evaluate(async ({ before, after, threshold, grid }) => {
    const decode = async (base64) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext("2d");
      context.drawImage(bitmap, 0, 0);
      return { width: bitmap.width, height: bitmap.height, data: context.getImageData(0, 0, bitmap.width, bitmap.height).data };
    };
    const [a, b] = await Promise.all([decode(before), decode(after)]);
    const width = Math.max(a.width, b.width);
    const height = Math.max(a.height, b.height);
    const out = new ImageData(width, height);
    const limit = threshold * 255;
    const cols = Math.max(1, Math.min(grid, width));
    const rows = Math.max(1, Math.min(grid, height));
    const cellDiff = new Array(cols * rows).fill(0);
    const cellTotal = new Array(cols * rows).fill(0);
    let diffPixels = 0;
    let minX = width; let minY = height; let maxX = -1; let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      const cy = Math.min(rows - 1, Math.floor((y * rows) / height));
      for (let x = 0; x < width; x += 1) {
        const cell = cy * cols + Math.min(cols - 1, Math.floor((x * cols) / width));
        cellTotal[cell] += 1;
        const inA = x < a.width && y < a.height;
        const inB = x < b.width && y < b.height;
        const ia = (y * a.width + x) * 4;
        const ib = (y * b.width + x) * 4;
        let changed = inA !== inB;
        if (inA && inB) {
          for (let channel = 0; channel < 4 && !changed; channel += 1) changed = Math.abs(a.data[ia + channel] - b.data[ib + channel]) > limit;
        }
        const o = (y * width + x) * 4;
        if (changed) {
          diffPixels += 1; cellDiff[cell] += 1;
          if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y;
          out.data[o] = 230; out.data[o + 1] = 0; out.data[o + 2] = 60; out.data[o + 3] = 255;
        } else {
          const lum = 0.299 * a.data[ia] + 0.587 * a.data[ia + 1] + 0.114 * a.data[ia + 2];
          const faded = 255 - (255 - lum) * 0.15;
          out.data[o] = faded; out.data[o + 1] = faded; out.data[o + 2] = faded; out.data[o + 3] = 255;
        }
      }
    }
    const hotspots = [];
    for (let gy = 0; gy < rows; gy += 1) for (let gx = 0; gx < cols; gx += 1) {
      const index = gy * cols + gx;
      if (cellDiff[index] === 0) continue;
      const left = Math.floor((gx * width) / cols); const right = Math.floor(((gx + 1) * width) / cols);
      const top = Math.floor((gy * height) / rows); const bottom = Math.floor(((gy + 1) * height) / rows);
      hotspots.push({ gridX: gx, gridY: gy, x: left, y: top, width: right - left, height: bottom - top, diffRatio: Math.round((cellDiff[index] / cellTotal[index]) * 10000) / 10000 });
    }
    hotspots.sort((left, right) => right.diffRatio - left.diffRatio);
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext("2d").putImageData(out, 0, 0);
    const bytes = new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return {
      reference: { width: a.width, height: a.height }, actual: { width: b.width, height: b.height },
      totalPixels: width * height, diffPixels, hotspots,
      bbox: maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
      diffPng: btoa(binary),
    };
  }, { before: beforePng.toString("base64"), after: afterPng.toString("base64"), threshold, grid: GRID_SIZE });
}

const round4 = (value) => Math.round(value * 10000) / 10000;
const describeSide = (side) => side.kind === "git_ref" ? `\`${side.input}\` (\`${side.revision.slice(0, 12)}\`)` : side.kind === "working_tree" ? "working tree" : `<${side.url}>`;
const box = (bbox) => bbox ? `${bbox.x},${bbox.y} ${bbox.width}x${bbox.height}` : "none";

export function renderMarkdown(report) {
  const lines = ["## Before/After", "", `Before: ${describeSide(report.before)}. After: ${describeSide(report.after)}.${report.before.page ? ` Page: \`${report.before.page}\`.` : ""}`, ""];
  for (const viewport of VIEWPORTS) {
    lines.push(`### ${viewport.width}px`, "", "| State | Scheme | Before | After | Diff ratio | Hotspot bbox |", "| --- | --- | --- | --- | --- | --- |");
    for (const pair of report.pairs.filter((item) => item.viewport.width === viewport.width)) {
      lines.push(`| ${pair.state} | ${pair.scheme} | ![before ${pair.id}](${pair.before}) | ![after ${pair.id}](${pair.after}) | ${pair.ratio} | ${box(pair.bbox)} |`);
    }
    lines.push("");
  }
  lines.push("### Violation IDs", "", ...(report.violations.length ? report.violations.map((id) => `- \`${id}\``) : ["- None recorded. List each audit violation id this change addresses."]), "");
  lines.push("### Verification", "", `- Captured ${report.pairs.length} pairs with Chromium ${report.browser}; ${report.summary.changed} changed (max ratio ${report.summary.max_ratio}, per-channel threshold ${report.threshold}).`, "- Add each command run for this change and its result.", "");
  lines.push(BOUNDARY, "");
  return lines.join("\n");
}

export async function runShotsCompare(args, config = {}) {
  const parsed = parseShotsCompareArgs(args);
  if (parsed.error) return parsed.error;
  const options = parsed.values;
  const cwd = config.cwd ?? process.cwd();
  const out = path.resolve(cwd, options.out);
  const cleanups = [];
  let browser;
  try {
    const before = await prepareSide(options.before, { cwd, page: options.page, cleanups });
    const after = await prepareSide(options.after, { cwd, page: options.page, cleanups });
    for (const side of ["before", "after", "diff"]) fs.mkdirSync(path.join(out, side), { recursive: true });
    const { chromium } = await import("playwright");
    browser = await chromium.launch();
    const diffContext = await browser.newContext();
    const diffPage = await diffContext.newPage();
    const pairs = [];
    for (const cell of captureMatrix(options.selector)) {
      if (config.signal?.aborted) throw Object.assign(new Error("shots comparison cancelled"), { code: "cancelled" });
      const file = `${cell.id}.png`;
      const beforePng = await capture(browser, before.url, cell, options);
      const afterPng = await capture(browser, after.url, cell, options);
      const { diffPng, ...diff } = await diffInBrowser(diffPage, beforePng, afterPng, options.threshold);
      fs.writeFileSync(path.join(out, "before", file), beforePng);
      fs.writeFileSync(path.join(out, "after", file), afterPng);
      fs.writeFileSync(path.join(out, "diff", file), Buffer.from(diffPng, "base64"));
      const ratio = diff.totalPixels === 0 ? 0 : round4(diff.diffPixels / diff.totalPixels);
      const similarityScore = Math.round((1 - ratio) * 100);
      const dimensionsMatch = diff.reference.width === diff.actual.width && diff.reference.height === diff.actual.height;
      pairs.push({
        id: cell.id, viewport: cell.viewport, scheme: cell.scheme, state: cell.state,
        before: `before/${file}`, after: `after/${file}`, diff: `diff/${file}`, ratio, bbox: diff.bbox,
        command: "image-diff", dimensionsMatch, reference: diff.reference, actual: diff.actual,
        totalPixels: diff.totalPixels, diffPixels: diff.diffPixels, diffRatio: ratio, similarityScore,
        alphaChannelIntact: true, hotspots: diff.hotspots,
        summary: `${similarityScore}/100 similarity; ${diff.diffPixels}/${diff.totalPixels} pixels differ${dimensionsMatch ? "" : "; dimensions differ"}${diff.hotspots.length ? `; ${diff.hotspots.length} hotspot region(s)` : ""}.`,
      });
    }
    const changed = pairs.filter((pair) => pair.diffPixels > 0);
    const report = {
      ok: true, operation: "shots", mode: "before_after", schema_version: "1.0",
      before: { ...before, url: before.kind === "url" ? before.url : undefined }, after: { ...after, url: after.kind === "url" ? after.url : undefined },
      browser: browser.version(), threshold: options.threshold, full_page: options.full_page, selector: options.selector ?? null,
      violations: options.violations ? options.violations.split(",").map((id) => id.trim()).filter(Boolean) : [],
      out, report: path.join(out, "report.json"), markdown: path.join(out, "pr-body.md"),
      summary: { pairs: pairs.length, changed: changed.length, max_ratio: Math.max(0, ...pairs.map((pair) => pair.ratio)) },
      pairs, evidence_boundary: BOUNDARY, ...handoff,
    };
    fs.writeFileSync(report.report, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(report.markdown, renderMarkdown(report));
    return { report, exitCode: 0, output: `${JSON.stringify(report, null, 2)}\n` };
  } catch (error) {
    return failure(error.code ?? "shots_compare_failed", error.message);
  } finally {
    await browser?.close();
    for (const cleanup of cleanups.reverse()) await cleanup();
  }
}
