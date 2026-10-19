#!/usr/bin/env node
// Outcome checks for showcase works and the showcase hub. Each check maps to a scenario in
// showcase/QA.md. Taste is reviewed from the settled screenshots, not judged here.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { checkPage, serveDirectory } from "./audit-browser.mjs";
export { serveDirectory, mimeTypes } from "./audit-browser.mjs";
export { settle, openPage, scrollToStop, overflowFailure, checkFocus, hiddenTextFailures, infiniteAnimationFailures } from "./audit-browser.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viewportHeight = 900;

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
  const { failures: pageFailures, screenshots, warnings, checks } = await checkPage(browser, { slug, url, base, outDir, rich: richnessMode !== "off" });
  failures.push(...pageFailures);
  // Richness is a warning by default so existing works keep passing; --richness error makes it a failure.
  if (richnessMode === "error") failures.push(...warnings);
  return { slug, ok: failures.length === 0, failures: [...new Set(failures)], warnings: richnessMode === "error" ? [] : [...new Set(warnings)], screenshots, checks };
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
