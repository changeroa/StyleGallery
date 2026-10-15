#!/usr/bin/env node
// Browser render oracle for a layout pattern's demo fixture. It reuses the check-showcase harness
// to render tests/fixtures/pattern-oracle/<pattern>/index.html at 320, 768, and 1440 CSS pixels and
// checks horizontal overflow, scroll ownership, focus order, reduced motion, and axe-core rules.
// A pass supports the rendered layout contract on one Chromium engine; it does not prove usability
// or complete accessibility.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import {
  checkFocus, hiddenTextFailures, infiniteAnimationFailures, openPage, overflowFailure, serveDirectory,
} from "./check-showcase.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const oracleWidths = [320, 768, 1440];
const viewportHeight = 720;
const blockingImpacts = new Set(["serious", "critical"]);

async function scrollOwnershipFailures(page, label) {
  const state = await page.evaluate(() => {
    const owner = document.querySelector("[data-scroll-owner]");
    const root = document.documentElement;
    if (!owner) return { found: false };
    const before = owner.scrollTop;
    owner.scrollTop = 120;
    const moved = owner.scrollTop !== before;
    owner.scrollTop = before;
    return {
      found: true,
      ownerOverflows: owner.scrollHeight > owner.clientHeight + 1,
      moved,
      rootOverflow: root.scrollHeight - root.clientHeight,
    };
  });
  if (!state.found) return [`${label}: no [data-scroll-owner] element names the scroll container`];
  const failures = [];
  if (!state.ownerOverflows || !state.moved) failures.push(`${label}: scroll owner does not scroll its overflowing content`);
  if (state.rootOverflow > 1) failures.push(`${label}: document root overflows by ${state.rootOverflow}px, so the scroll owner is not the only scroller`);
  return failures;
}

async function axeFailures(page, label) {
  const result = await new AxeBuilder({ page }).analyze();
  return result.violations
    .filter((violation) => blockingImpacts.has(violation.impact))
    .map((violation) => `${label}: axe ${violation.impact} ${violation.id} (${violation.nodes.length} nodes)`);
}

export async function checkPatternOracle({
  root = path.join(repositoryRoot, "tests/fixtures/pattern-oracle"),
  pattern = "scroll-body-shell",
  out = null,
} = {}) {
  const started = Date.now();
  const fixture = path.join(root, pattern, "index.html");
  if (!fs.existsSync(fixture)) return { ok: false, pattern, widths: oracleWidths, checks: [], failures: [`missing fixture ${path.relative(repositoryRoot, fixture)}`] };
  const server = await serveDirectory(root);
  const base = `http://127.0.0.1:${server.address().port}`;
  const url = `${base}/${pattern}/`;
  const browser = await chromium.launch();
  const failures = [];
  const checks = [];
  try {
    for (const width of oracleWidths) {
      const label = `w${width}`;
      const motion = await openPage(browser, url, { viewport: { width, height: viewportHeight } }, base, failures, label);
      const widthFailures = [
        ...await overflowFailure(motion.page, label),
        ...await scrollOwnershipFailures(motion.page, label),
        ...await checkFocus(motion.page, label),
        ...await axeFailures(motion.page, label),
      ];
      await motion.context.close();
      const reduced = await openPage(browser, url, { viewport: { width, height: viewportHeight }, reducedMotion: "reduce" }, base, failures, `${label} reduced`);
      widthFailures.push(...(await reduced.page.evaluate(infiniteAnimationFailures)).map((failure) => `${label} reduced-motion: ${failure}`));
      widthFailures.push(...(await reduced.page.evaluate(hiddenTextFailures)).map((failure) => `${label} reduced-motion: ${failure}`));
      await reduced.context.close();
      checks.push({ width, ok: widthFailures.length === 0, checks: ["overflow", "scroll-ownership", "focus-order", "axe-core", "reduced-motion"] });
      failures.push(...widthFailures);
    }
  } finally {
    await browser.close();
    server.close();
  }
  const result = { ok: failures.length === 0, pattern, widths: oracleWidths, checks, failures: [...new Set(failures)], durationMs: Date.now() - started };
  if (out) {
    fs.mkdirSync(path.join(out, pattern), { recursive: true });
    fs.writeFileSync(path.join(out, pattern, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
  }
  return result;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const value = (flag) => { const index = argv.indexOf(flag); return index === -1 ? null : argv[index + 1]; };
  const result = await checkPatternOracle({
    pattern: value("--pattern") ?? "scroll-body-shell",
    out: path.resolve(repositoryRoot, value("--out") ?? ".tmp/pattern-oracle"),
  });
  if (argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else if (result.ok) console.log(`ok: ${result.pattern} at ${result.widths.join("/")} in ${result.durationMs}ms`);
  else console.error(result.failures.join("\n"));
  process.exitCode = result.ok ? 0 : 1;
}
