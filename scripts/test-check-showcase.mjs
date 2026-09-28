#!/usr/bin/env node
// Self-test for scripts/check-showcase.mjs: one fixture that must pass and one fixture per check that
// must fail with only that check's failures. Runs offline: the "external" library is served by a
// second local server so the offline check can block it deterministically.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checker = path.join(repositoryRoot, "scripts", "check-showcase.mjs");

const external = http.createServer((request, response) => {
  response.writeHead(200, { "content-type": "text/javascript", "access-control-allow-origin": "*" });
  response.end("window.fixtureLibrary = true;");
});
await new Promise((resolve) => external.listen(0, "127.0.0.1", resolve));
const externalUrl = `http://127.0.0.1:${external.address().port}/library.js`;

const baseStyle = "html{scroll-padding-top:4rem}body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#fff;color:#111}header{background:#fff;padding:8px 16px;position:sticky;top:0}section{min-height:120vh;padding:96px 16px}a{color:#0645ad}";

function page({ head = "", beforeMain = "", main = "", second = "", after = "", icon = true, style = "" } = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fixture</title>${icon ? '<link rel="icon" href="data:,">' : ""}<style>${baseStyle}${style}</style>${head}</head>
<body>${beforeMain}<header><nav><a href="#two">Two</a></nav></header>
<main><section id="one"><h1>One</h1><p>First section text.</p>${main}</section><section id="two"><h2>Two</h2><p>Second section text.</p>${second}</section></main>
<footer><p><a href="../">Back to the hub</a></p></footer>${after}</body></html>`;
}

// Richness building blocks: a drawn surface per section, responsive elements, masks, and hairlines.
const surface = '<svg data-surface viewBox="0 0 10 7" preserveAspectRatio="none" style="display:block;width:70%;height:60vh" aria-hidden="true"><rect width="10" height="7" fill="#dde3ee"/></svg>';
const responsive = '<p>' + Array.from({ length: 14 }, (_, i) => `<span class="r">Tag ${i + 1}</span>`).join(" ") + '</p>';
const masked = '<div class="m"></div><div class="m"></div>';
const hairlines = '<div class="h"></div><div class="h"></div><div class="h"></div>';
const richStyle = ".r{display:inline-block;padding:4px;transition:color .2s ease}.m{height:8px;background:#ccd;mask-image:linear-gradient(#000,transparent)}.h{border-top:1px solid #ddd;height:8px}";
const rich = (parts = {}) => page({ style: richStyle, main: `${parts.responsive ?? responsive}${parts.masked ?? masked}${parts.hairlines ?? hairlines}${surface}`, second: parts.second ?? surface });

const brief = (extra = "") => `---\ntype: Showcase Brief\ntitle: Fixture\ndescription: Checker fixture.\nbrand_study: false\n${extra}---\n\n# Fixture\n`;

// slug -> { html, brief?, files?, expect: RegExp matching every failure line }
const fixtures = {
  good: { html: page(), expect: null },
  overflow: { html: page({ main: '<div style="width:2000px;height:1px"></div>' }), expect: /horizontal overflow/ },
  "page-error": { html: page({ after: "<script>throw new Error('fixture boom')</script>" }), expect: /page error .*fixture boom/ },
  "focus-order": { html: page({ main: '<p><a href="#two" tabindex="1">Jump first</a></p>' }), expect: /out of DOM order/ },
  "focus-covered": { html: page({ after: '<div style="position:fixed;left:0;right:0;bottom:0;height:45vh;background:#eee">Cover panel</div>' }), expect: /is covered by div/ },
  "reduced-hidden": { html: page({ style: "@media (prefers-reduced-motion: reduce){h1{opacity:0}}" }), expect: /reduced-motion: "One" is opacity 0/ },
  "reduced-infinite": { html: page({ style: "@keyframes spin{to{rotate:360deg}}.spin{animation:spin 2s linear infinite;bottom:8px;margin:0;position:fixed;right:8px}", after: '<p class="spin">Spinning</p>' }), expect: /reduced-motion: infinite animation spin/ },
  "ambient-offscreen": { html: page({ style: "@keyframes pulse{to{opacity:.6}}@media (prefers-reduced-motion: no-preference){.pulse{animation:pulse 1s ease-in-out infinite alternate}}", main: '<p class="pulse">Pulsing</p>' }), expect: /infinite animation pulse keeps running on offscreen p\.pulse/ },
  "gsap-offscreen": { html: page({ main: '<p class="float">Floating</p>', after: "<script>const el=document.querySelector('.float');window.gsap={globalTimeline:{getChildren:()=>[{vars:{repeat:-1},paused:()=>false,isActive:()=>true,targets:()=>[el]}]}};</script>" }), expect: /repeating GSAP tween keeps running on offscreen p\.float/ },
  "brand-study": { html: page(), brief: brief().replace("brand_study: false", "brand_study: true"), expect: /brand study/ },
  contrast: { html: page({ main: '<p style="color:#b5b5b5">Low contrast sentence.</p>' }), expect: /contrast \d\.\d\d < 4\.5 for p "Low contrast sentence\."/ },
  "circular-link": { html: page({ beforeMain: '<div id="top"></div>', main: '<p><a href="#top">Back to top</a></p>' }), expect: /loops back to #top/ },
  "markdown-link": { html: page({ main: '<p><a href="notes.md">Notes</a></p>' }), files: { "notes.md": "# Notes\n" }, expect: /opens raw Markdown/ },
  "tall-fixed": { html: page({ after: '<div style="position:fixed;top:0;right:0;width:12px;height:150vh;overflow:hidden;color:#111">x</div>' }), expect: /px tall in a 620px viewport/ },
  "hash-silent": { html: page({ after: "<script>document.querySelector('nav a').addEventListener('click',(e)=>{e.preventDefault();document.getElementById('two').scrollIntoView();});</script>" }), expect: /left the URL hash|Back after #two/ },
  "direct-hash": { html: page({ style: "html{overflow-anchor:none}", after: "<script>addEventListener('load',()=>requestAnimationFrame(()=>document.getElementById('one').insertAdjacentHTML('afterbegin','<div style=\"height:3000px\"></div>')));</script>" }), expect: /opening #two directly landed/ },
  "no-favicon": { html: page({ icon: false }), expect: /declares no favicon/ },
  "demo-silent": { html: page({ main: '<p><button type="button" data-demo="Nothing happens">Demo</button></p>' }), expect: /shows no visible role="status" message/ },
  "missing-asset": { html: page({ main: '<img src="missing.png" alt="" width="10" height="10">' }), expect: /404 for \/missing-asset\/missing\.png/ },
  "offline-break": { html: page({ head: `<script src="${externalUrl}"></script>`, after: "<script>if(!window.fixtureLibrary)throw new Error('external library missing')</script>" }), expect: /offline w390: page error external library missing/ },
  "noscript-break": { html: page({ style: "main{opacity:0}.js main{opacity:1}", head: '<script src="app.js"></script>' }), files: { "app.js": "document.documentElement.classList.add('js');" }, expect: /no-script w390: "/ },
  unlisted: { html: page(), expect: null, hubOmits: true },
  // Richness is reported as warnings by default: these fixtures must have no failures and only the targeted warnings.
  rich: { html: rich(), expect: null, warn: null },
  "empty-screen": { html: rich({ second: "" }), expect: null, warn: /richness: screen \d+ \(\d+-\d+px\) is empty/ },
  static: { html: rich({ responsive: "" }), expect: null, warn: /richness: \d+ responsive elements with transitions, below \d+/ },
  flat: { html: rich({ masked: "", hairlines: "" }), expect: null, warn: /richness: \d+ elements (use a mask or clip-path|carry 1px hairline borders), below \d/ },
};

const root = fs.mkdtempSync(path.join(os.tmpdir(), "showcase-selftest-"));
const out = fs.mkdtempSync(path.join(os.tmpdir(), "showcase-selftest-out-"));
for (const [slug, fixture] of Object.entries(fixtures)) {
  const dir = path.join(root, slug);
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, "index.html"), fixture.html);
  fs.writeFileSync(path.join(dir, "brief.md"), fixture.brief ?? brief());
  for (const [name, content] of Object.entries(fixture.files ?? {})) fs.writeFileSync(path.join(dir, name), content);
}
const listed = Object.entries(fixtures).filter(([, fixture]) => !fixture.hubOmits).map(([slug]) => `<li><a href="${slug}/">${slug}</a></li>`).join("");
fs.writeFileSync(path.join(root, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fixture hub</title><link rel="icon" href="data:,"><style>body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#fff;color:#111}a{color:#0645ad}</style></head><body><main><h1>Fixtures</h1><ul>${listed}</ul></main></body></html>`);

// Asynchronous on purpose: the "external" server above lives in this process and must keep answering.
const run = await new Promise((resolve) => {
  const child = spawn(process.execPath, [checker, "--root", root, "--out", out, "--json"]);
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("close", (status) => resolve({ status, stdout, stderr }));
});
// A second run proves --richness error turns richness findings into failures and a non-zero exit.
const strict = await new Promise((resolve) => {
  const child = spawn(process.execPath, [checker, "--root", root, "--out", out, "--json", "--work", "empty-screen", "--richness", "error"]);
  let stdout = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.on("close", (status) => resolve({ status, stdout }));
});
external.close();
let report;
try {
  report = JSON.parse(run.stdout);
} catch {
  console.error(run.stdout, run.stderr);
  throw new Error("checker did not return JSON");
}
fs.rmSync(root, { recursive: true, force: true });
fs.rmSync(out, { recursive: true, force: true });

const results = [];
const bySlug = Object.fromEntries(report.works.map((work) => [work.slug, work]));
for (const [slug, fixture] of Object.entries(fixtures)) {
  const work = bySlug[slug];
  try {
    assert.ok(work, `${slug}: missing from checker output`);
    if (fixture.expect === null) assert.deepEqual(work.failures, [], `${slug}: expected no failures`);
    else {
      assert.ok(work.failures.length > 0, `${slug}: expected failures matching ${fixture.expect}`);
      const stray = work.failures.filter((failure) => !fixture.expect.test(failure));
      assert.deepEqual(stray, [], `${slug}: failures outside the targeted check`);
    }
    if (fixture.warn === null) assert.deepEqual(work.warnings ?? [], [], `${slug}: expected no richness warnings`);
    else if (fixture.warn) {
      assert.ok((work.warnings ?? []).length > 0, `${slug}: expected richness warnings matching ${fixture.warn}`);
      const strayWarnings = work.warnings.filter((warning) => !fixture.warn.test(warning));
      assert.deepEqual(strayWarnings, [], `${slug}: richness warnings outside the targeted check`);
    }
    results.push({ name: slug, ok: true });
  } catch (error) {
    results.push({ name: slug, ok: false, message: error.message, failures: work?.failures });
  }
}
try {
  assert.deepEqual(bySlug["(hub)"].failures, ["hub does not link work unlisted (expected href \"unlisted/\")"]);
  results.push({ name: "hub-lists-every-work", ok: true });
} catch (error) {
  results.push({ name: "hub-lists-every-work", ok: false, message: error.message, failures: bySlug["(hub)"]?.failures });
}
try {
  assert.equal(run.status, 1, "checker must exit 1 when any work fails");
  results.push({ name: "exit-code", ok: true });
} catch (error) {
  results.push({ name: "exit-code", ok: false, message: error.message });
}

try {
  const strictReport = JSON.parse(strict.stdout);
  const work = strictReport.works.find((entry) => entry.slug === "empty-screen");
  assert.equal(strict.status, 1, "--richness error must exit 1 on a richness finding");
  assert.ok(work && work.failures.length > 0 && work.failures.every((failure) => /richness: screen \d+/.test(failure)), "--richness error must report the empty screen as failures");
  assert.deepEqual(work.warnings, [], "--richness error must not also report warnings");
  results.push({ name: "richness-error-mode", ok: true });
} catch (error) {
  results.push({ name: "richness-error-mode", ok: false, message: error.message });
}

const ok = results.every((result) => result.ok);
console.log(JSON.stringify({ ok, results: results.filter((result) => !result.ok), passed: results.filter((result) => result.ok).length, total: results.length }, null, 2));
process.exitCode = ok ? 0 : 1;
