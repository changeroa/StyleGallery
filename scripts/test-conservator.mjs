#!/usr/bin/env node
// Self-test for scripts/conservator.mjs. Every Layout pattern must have an exhibit, every exhibit
// must pass on the pattern doc's own CSS, and every negative control must fail on the behavior tied
// to the declaration it removes and on nothing else.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { exhibitSlugs, exhibits } from "./conservator-exhibits.mjs";
import { ConservatorError, parseConservatorArgs, patternCss, runConservator, withoutDeclaration } from "./conservator.mjs";
import { patterns } from "./pattern-data.mjs";

const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push({ name, ok: true }); } catch (error) { results.push({ name, ok: false, message: error.message }); }
};

await check("every-pattern-has-an-exhibit", () => {
  assert.deepEqual([...exhibitSlugs].sort(), patterns.map(([slug]) => slug).sort());
  assert.equal(new Set(exhibitSlugs).size, exhibitSlugs.length);
});

await check("every-exhibit-measures-a-named-behavior", () => {
  for (const exhibit of exhibits) {
    assert.match(exhibit.measure.toString(), /c\.(expect|blockRhythm|gridColumns|multiColumn|twoPane|wrapRow)\(/, `${exhibit.slug} has no pattern-specific measurement`);
    assert.ok(exhibit.negative?.behavior, `${exhibit.slug} has no negative control behavior`);
  }
});

await check("controls-remove-a-declaration-the-doc-lists", () => {
  for (const { slug, negative } of exhibits) {
    const css = patternCss(process.cwd(), slug);
    const mutated = withoutDeclaration(css, negative.selector, negative.property);
    assert.notEqual(mutated, css, `${slug} control changes nothing`);
    assert.equal(css.split("\n").length - mutated.split("\n").length, 1, `${slug} control must remove exactly one declaration`);
  }
});

await check("control-target-missing-is-an-error", () => {
  assert.throws(() => withoutDeclaration(".a {\n    display: grid;\n}", ".a", "gap"), (error) => error instanceof ConservatorError && error.code === "control_target_missing");
  assert.throws(() => withoutDeclaration(".a {\n    display: grid;\n}", ".b", "display"), (error) => error.code === "control_target_missing");
});

await check("arguments-are-closed", () => {
  assert.deepEqual(parseConservatorArgs(["--pattern", "stack,box", "--controls"]).only, ["stack", "box"]);
  assert.throws(() => parseConservatorArgs(["--bogus"]), (error) => error.code === "argument_invalid");
  assert.throws(() => parseConservatorArgs(["--channel"]), (error) => error.code === "argument_value_required");
});

await check("unknown-exhibit-is-an-error", async () => {
  await assert.rejects(runConservator({ only: ["absent"] }), (error) => error.code === "exhibit_unknown");
});

await check("missing-browser-reports-the-install-command", () => {
  const browsers = fs.mkdtempSync(path.join(os.tmpdir(), "conservator-no-browser-"));
  try {
    const child = spawnSync(process.execPath, ["scripts/conservator.mjs", "--pattern", "stack"], { encoding: "utf8", env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsers } });
    assert.equal(child.status, 2);
    assert.match(child.stderr, /^browser_missing: .*npx playwright install chromium.*--install-browser.*--channel chrome/);
  } finally { fs.rmSync(browsers, { recursive: true, force: true }); }
});

await check("missing-pattern-doc-fails-the-exhibit", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "conservator-missing-"));
  try {
    const result = await runConservator({ root, only: ["stack"] });
    assert.equal(result.ok, false);
    assert.ok(result.failures.every((failure) => failure.includes("pattern-css: no pattern doc")), result.failures.join("\n"));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

let full;
await check("all-exhibits-pass-and-all-controls-discriminate", async () => {
  full = await runConservator({ controls: true });
  assert.equal(full.exhibits, exhibits.length);
  assert.deepEqual(full.failures, []);
  for (const entry of full.results) {
    assert.ok(entry.control.ok && entry.control.caught_at.length > 0, `${entry.slug} control did not fail ${entry.control.behavior}`);
  }
});

const report = {
  ok: results.every(({ ok }) => ok),
  cases: results.length,
  exhibits: exhibits.length,
  durationMs: full?.durationMs ?? null,
  failures: results.filter(({ ok }) => !ok),
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;
