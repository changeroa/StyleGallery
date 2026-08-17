import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { scenarioMatrix } from "./fixtures/consumer-conformance-scenarios.mjs";
import {
  capturePageEvidence as capturePageEvidenceImpl,
  captureVisualQa as captureVisualQaImpl,
  collectContrastViolations,
  focusGeometry,
  observeRuntimeErrors,
  pageGeometry,
  renderConsumerConformance,
  setChromiumPageScale,
} from "./helpers/render-consumer-conformance.mjs";

const mutation = process.env.CONSUMER_CONFORMANCE_MUTATION ?? "none";
const matrixName = process.env.CONSUMER_CONFORMANCE_MATRIX ?? "full";
const scenarios = scenarioMatrix(matrixName);
const scenariosOfKind = (kind) => scenarios.filter((scenario) => scenario.kind === kind);
const observation = {
  axe_analyze_calls: 0,
  axe_root_ids: [],
  contrast_helper_calls: 0,
  contrast_root_checks: 0,
  evidence_artifacts: [],
  evidence_helper_calls: 0,
  screenshot_artifacts: [],
  screenshot_helper_calls: 0,
};

function artifact(file, root, caseId) {
  if (!file || !fs.existsSync(file)) return undefined;
  const bytes = fs.statSync(file).size;
  return { bytes, case_id: caseId, file: path.relative(root, file) };
}

async function captureVisualQa(page, options) {
  observation.screenshot_helper_calls += 1;
  const root = process.env.CONSUMER_CONFORMANCE_CAPTURE_DIR;
  const safeCase = String(options.caseId).replaceAll(/[^a-z0-9-]/g, "-");
  const safeSuffix = String(options.suffix ?? "rendered").replaceAll(/[^a-z0-9-]/g, "-");
  const file = root ? path.resolve(root, `${safeCase}-${safeSuffix}.png`) : undefined;
  const existed = file ? fs.existsSync(file) : false;
  await captureVisualQaImpl(page, options);
  const written = file && !existed ? artifact(file, path.resolve(root), options.caseId) : undefined;
  if (written) observation.screenshot_artifacts.push(written);
}

async function capturePageEvidence(page, options) {
  observation.evidence_helper_calls += 1;
  const rootValue = process.env.PAGE_EVIDENCE_ARTIFACT_ROOT ?? process.env.PAGE_EVIDENCE_ARTIFACT_DIR;
  const selected = options.caseId === (process.env.PAGE_EVIDENCE_CASE_ID ?? "state-w1024-focus");
  const root = rootValue ? path.resolve(rootValue) : undefined;
  const scenario = process.env.PAGE_EVIDENCE_SCENARIO_ID;
  const runner = root && selected ? path.resolve(root, process.env.PAGE_EVIDENCE_RUNNER_RESULT ?? `runner/${scenario}.json`) : undefined;
  const captures = root && selected ? path.resolve(root, "captures") : undefined;
  const before = captures && fs.existsSync(captures) ? new Set(fs.readdirSync(captures)) : new Set();
  await capturePageEvidenceImpl(page, options);
  if (runner) {
    const runnerArtifact = artifact(runner, root, options.caseId);
    if (runnerArtifact) observation.evidence_artifacts.push(runnerArtifact);
    if (fs.existsSync(captures)) for (const name of fs.readdirSync(captures)) if (!before.has(name)) {
      const captureArtifact = artifact(path.join(captures, name), root, options.caseId);
      if (captureArtifact) observation.evidence_artifacts.push(captureArtifact);
    }
  }
}

const observationRoot = process.env.CONSUMER_CONFORMANCE_OBSERVATION_DIR;
if (observationRoot) process.once("exit", () => {
  fs.mkdirSync(observationRoot, { recursive: true });
  fs.writeFileSync(path.join(observationRoot, `observation-${process.pid}.json`), `${JSON.stringify(observation, null, 2)}\n`, { flag: "wx" });
});
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

function sentinelTag(caseId) {
  const tags = {
    "dialog-w375": "@sentinel-dialog-focus-leak",
    "layout-w320-full-unbroken": "@sentinel-overflow",
    "state-w320-loading": "@sentinel-console-error",
    "state-w375-default": "@sentinel-low-contrast",
    "state-w375-focus": "@sentinel-clipped-focus",
  };
  return tags[caseId] ? ` ${tags[caseId]}` : "";
}

async function expectGeometry(page) {
  const geometry = await pageGeometry(page);
  expect(geometry.document.scrollWidth, "document_no_horizontal_overflow").toBeLessThanOrEqual(geometry.document.clientWidth);
  for (const owner of geometry.scrollOwners) {
    expect(owner.scrollWidth, `scroll_owner_no_horizontal_overflow:${owner.id}`).toBeLessThanOrEqual(owner.clientWidth);
    expect(["auto", "scroll"], `scroll_owner_declared:${owner.id}`).toContain(owner.overflowY);
  }
  for (const essential of geometry.essentials) {
    expect(essential.width > 0 && essential.height > 0, `essential_nonzero:${essential.id}`).toBe(true);
    expect(essential.intersectsViewport, `essential_observable:${essential.id}`).toBe(true);
    expect(essential.fullyVisibleInViewport && essential.fullyVisibleInScrollOwner, `essential_fully_observable:${essential.id}`).toBe(true);
  }
}

async function expectContrast(page, roots = ["body"]) {
  observation.contrast_helper_calls += 1;
  observation.contrast_root_checks += roots.length;
  const violations = await collectContrastViolations(page, roots);
  expect(violations, "color-contrast").toEqual([]);
}

async function expectAxeClean(page, roots = ["body"]) {
  const violations = [];
  for (const root of roots) {
    observation.axe_analyze_calls += 1;
    observation.axe_root_ids.push(root);
    const result = await new AxeBuilder({ page }).include(root).withTags(WCAG_TAGS).analyze();
    violations.push(...result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target),
      root,
    })));
  }
  expect(violations, "axe_declared_wcag_tags").toEqual([]);
}

async function expectRuntimeClean(errors) {
  expect(errors, "console_error_free").toEqual([]);
}

async function expectProtectedPhrases(page, phrases = []) {
  if (phrases.length === 0) return;
  const lineCounts = await page.locator(".probe-content").evaluate((element, protectedPhrases) => protectedPhrases.map((phrase) => {
    const text = element.textContent ?? "";
    const start = text.indexOf(phrase);
    if (start < 0 || !element.firstChild) return 0;
    const range = document.createRange();
    range.setStart(element.firstChild, start);
    range.setEnd(element.firstChild, start + phrase.length);
    return [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0).length;
  }), phrases);
  expect(lineCounts, "cjk_semantic_phrase_single_line").toEqual(phrases.map(() => 1));
}

for (const scenario of scenariosOfKind("layout")) {
  test(`layout ${scenario.caseId}${sentinelTag(scenario.caseId)}`, async ({ page }) => {
    const errors = observeRuntimeErrors(page);
    await page.setViewportSize(scenario.viewport);
    await renderConsumerConformance(page, { kind: "layout", mutation, ...scenario });
    await expect(page.locator("main"), "main_landmark_present").toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1, name: "Consumer conformance probe" }), "heading_semantics").toBeVisible();
    await expect(page.getByRole("button", { name: scenario.content.label }), "content_action_semantics").toMatchAriaSnapshot(`- button "${scenario.content.label}"`);
    await expectGeometry(page);
    await expectContrast(page);
    await expectAxeClean(page);
    await expectProtectedPhrases(page, scenario.content.protectedPhrases);
    await expectRuntimeClean(errors);
    await captureVisualQa(page, { caseId: scenario.caseId });
    await capturePageEvidence(page, { caseId: scenario.caseId, pageScaleFactor: 1 });
  });
}

for (const scenario of scenariosOfKind("state")) {
  test(`state ${scenario.caseId}${sentinelTag(scenario.caseId)}`, async ({ page }) => {
    const errors = observeRuntimeErrors(page);
    await page.setViewportSize(scenario.viewport);
    await renderConsumerConformance(page, { kind: "state", mutation, ...scenario });
    const control = page.getByRole("button", { name: "Submit migration" });
    let visualCaptured = false;
    await expect(control, "state_button_semantics").toBeVisible();

    if (scenario.state === "hover") {
      await control.hover();
      await expect(control, "hover_state_observed").toHaveAttribute("data-observed-state", "hover");
    } else if (scenario.state === "focus") {
      await page.keyboard.press("Tab");
      await expect(control, "focus_state_observed").toBeFocused();
      const geometry = await focusGeometry(control);
      expect(geometry.visible && !geometry.clippedBy, "focus_geometry_visible").toBe(true);
    } else if (scenario.state === "active") {
      const box = await control.boundingBox();
      expect(box, "active_control_box").toBeTruthy();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await expect(control, "active_state_observed").toHaveAttribute("data-observed-state", "active");
      await captureVisualQa(page, { caseId: scenario.caseId });
      visualCaptured = true;
      await page.mouse.up();
    } else if (scenario.state === "disabled") {
      await expect(control, "disabled_state_semantics").toBeDisabled();
    } else if (scenario.state === "error") {
      await expect(control, "error_state_semantics").toHaveAttribute("aria-invalid", "true");
      await expect(page.getByRole("alert"), "error_message_semantics").toHaveText("Migration could not be saved.");
    } else if (scenario.state === "loading") {
      await expect(control, "loading_state_semantics").toHaveAttribute("aria-busy", "true");
      await expect(page.getByRole("status"), "loading_status_semantics").toHaveText("Saving migration");
    } else {
      await expect(control, "default_state_semantics").toHaveAttribute("data-observed-state", "default");
    }

    await expectGeometry(page);
    await expectContrast(page);
    await expectAxeClean(page);
    await expectRuntimeClean(errors);
    if (!visualCaptured) await captureVisualQa(page, { caseId: scenario.caseId });
    await capturePageEvidence(page, { caseId: scenario.caseId, pageScaleFactor: 1 });
  });
}

for (const scenario of scenariosOfKind("overlay")) {
  test(`overlay ${scenario.caseId}${sentinelTag(scenario.caseId)}`, async ({ page }) => {
    const errors = observeRuntimeErrors(page);
    await page.setViewportSize(scenario.viewport);
    await renderConsumerConformance(page, { kind: "overlay", mutation, ...scenario });
    const opener = page.getByRole("button", { name: `Open ${scenario.overlay.label}` });
    const overlay = page.getByRole("dialog", { name: scenario.overlay.label });
    const first = overlay.getByRole("button", { name: `First ${scenario.overlay.id} action` });
    const last = overlay.getByRole("button", { name: `Close ${scenario.overlay.label}` });
    const outside = page.locator("#outside-control");

    await expect(overlay, "overlay_closed_initially").toBeHidden();
    await opener.click();
    await expect(overlay, "overlay_open_semantics").toBeVisible();
    await expect(overlay, "overlay_aria_snapshot").toMatchAriaSnapshot(`
      - dialog "${scenario.overlay.label}":
        - heading "${scenario.overlay.label}" [level=2]
        - button "First ${scenario.overlay.id} action"
        - link "${scenario.overlay.label} details"
        - button "Close ${scenario.overlay.label}"
    `);
    await expect(first, "overlay_initial_focus").toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(last, "dialog_focus_trap").toBeFocused();
    await page.keyboard.press("Tab");
    await expect(first, "dialog_focus_trap").toBeFocused();
    const outsideBox = await outside.boundingBox();
    expect(outsideBox, "dialog_background_control_box").toBeTruthy();
    await page.mouse.click(outsideBox.x + outsideBox.width / 2, outsideBox.y + outsideBox.height / 2);
    await expect(first, "dialog_pointer_focus_containment").toBeFocused();
    await outside.evaluate((element) => element.focus());
    await expect(first, "dialog_programmatic_focus_containment").toBeFocused();
    await expectContrast(page, ["body", "[data-overlay]:not([hidden])"]);
    await expectAxeClean(page, ["body", "[data-overlay]:not([hidden])"]);
    await captureVisualQa(page, { caseId: scenario.caseId, suffix: "open" });
    await page.keyboard.press("Escape");
    await expect(overlay, "overlay_escape_close").toBeHidden();
    await expect(opener, "overlay_escape_focus_return").toBeFocused();

    await opener.click();
    await last.click();
    await expect(overlay, "overlay_button_close").toBeHidden();
    await expect(opener, "overlay_button_focus_return").toBeFocused();
    await expectGeometry(page);
    await expectRuntimeClean(errors);
    await capturePageEvidence(page, { caseId: scenario.caseId, pageScaleFactor: 1 });
  });
}

for (const scenario of scenariosOfKind("zoom")) {
  test(`zoom ${scenario.caseId}`, async ({ page }) => {
    const errors = observeRuntimeErrors(page);
    await page.setViewportSize({ height: scenario.viewport.height, width: scenario.viewport.width });
    await renderConsumerConformance(page, {
      caseId: scenario.caseId,
      container: { id: "medium", inlineSize: "30rem" },
      content: { body: "Zoomed content remains readable and operable.", id: "zoom", label: "Zoom probe" },
      kind: "layout",
      mutation,
      viewport: scenario.viewport,
    });
    await setChromiumPageScale(page, scenario.viewport.pageScaleFactor);
    const scale = await page.evaluate(() => window.visualViewport?.scale);
    expect(scale, "chromium_page_scale_probe").toBe(scenario.viewport.pageScaleFactor);
    await page.keyboard.press("Tab");
    const control = page.getByRole("button", { name: "Zoom probe" });
    await expect(control, "zoom_focus_observable").toBeFocused();
    const essential = await control.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const viewport = window.visualViewport;
      const style = getComputedStyle(element);
      const focusExtent = (Number.parseFloat(style.outlineWidth) || 0) + Math.max(0, Number.parseFloat(style.outlineOffset) || 0);
      return rect.top - focusExtent >= viewport.offsetTop
        && rect.left - focusExtent >= viewport.offsetLeft
        && rect.bottom + focusExtent <= viewport.offsetTop + viewport.height
        && rect.right + focusExtent <= viewport.offsetLeft + viewport.width;
    });
    expect(essential, "zoom_essential_observable").toBe(true);
    await expectContrast(page);
    await expectAxeClean(page);
    await expectRuntimeClean(errors);
    await captureVisualQa(page, { caseId: scenario.caseId, suffix: "chromium-page-scale-probe" });
    await capturePageEvidence(page, { caseId: scenario.caseId, pageScaleFactor: scenario.viewport.pageScaleFactor, probe: "chromium_page_scale_probe" });
  });
}
