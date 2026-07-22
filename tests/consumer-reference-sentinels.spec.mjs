import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { BASELINE_ENVIRONMENT, BASELINE_REFERENCE } from "../scripts/baseline-contract.mjs";
import { renderConsumerReference } from "./helpers/render-consumer-reference.mjs";

const mutation = process.env.SENTINEL_MUTATION ?? "none";
const artifactRoot = process.env.SENTINEL_ARTIFACT_DIR;

test("canonical consumer reference preserves computed layout before its locator screenshot", async ({ page }) => {
  await renderConsumerReference(page, mutation);
  const root = page.locator(".card_grid");
  await expect(root).toHaveCount(1);
  await expect(root, "computed_layout_visible").toBeVisible();
  await expect(root.locator(":scope > article"), "computed_cardinality").toHaveCount(3);
  const computed = await root.evaluate((element) => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return {
      clientWidth: document.documentElement.clientWidth,
      display: style.display,
      gap: style.gap,
      gridTemplateColumns: style.gridTemplateColumns,
      height: box.height,
      scrollWidth: document.documentElement.scrollWidth,
      width: box.width,
    };
  });
  expect(computed.display, "computed_layout_display_grid").toBe("grid");
  expect(computed.gap, "computed_layout_gap").toBe("16px");
  expect(computed.gridTemplateColumns, "computed_layout_columns").not.toBe("none");
  expect(computed.width > 0 && computed.height > 0, "computed_layout_nonzero_box").toBe(true);
  expect(computed.scrollWidth <= computed.clientWidth, "computed_long_content_reflow").toBe(true);
  const mask = [root.locator(":scope > article")];
  const png = await root.screenshot({ animations: "disabled", caret: "hide", mask });
  const actualHash = crypto.createHash("sha256").update(png).digest("hex");
  const calibrationRun = Number(process.env.SENTINEL_CALIBRATION_RUN ?? 1);
  if (artifactRoot) {
    fs.mkdirSync(artifactRoot, { recursive: true });
    const dom = await root.evaluate((element) => element.outerHTML);
    const ax = await page.locator("body").ariaSnapshot();
    const domBytes = Buffer.from(`${dom}\n`);
    const axBytes = Buffer.from(`${ax}\n`);
    fs.writeFileSync(path.join(artifactRoot, "actual.png"), png);
    fs.writeFileSync(path.join(artifactRoot, "dom.html"), domBytes);
    fs.writeFileSync(path.join(artifactRoot, "ax.txt"), axBytes);
    const localEnvironment = {
      architecture: process.arch === "x64" ? "amd64" : process.arch,
      browser_revision: "1228",
      browser_version: page.context().browser()?.version() ?? "unknown",
      container_image: process.env.SENTINEL_CONTAINER_IMAGE ?? "local-unpinned",
      node: process.versions.node,
      os: process.platform,
      platform: process.platform === "linux" ? "linux/amd64" : `${process.platform}/${process.arch}`,
      playwright: "1.61.0",
      viewport: page.viewportSize(),
    };
    if (process.env.SENTINEL_CALIBRATION_RUN) {
      expect(process.platform, "calibration_runtime_platform").toBe("linux");
      expect(localEnvironment.architecture, "calibration_runtime_architecture").toBe("amd64");
      expect(process.versions.node.split(".")[0], "calibration_runtime_node").toBe("22");
      expect(process.env.SENTINEL_CONTAINER_IMAGE, "calibration_runtime_container").toBe(BASELINE_ENVIRONMENT.container_image);
      expect(localEnvironment.browser_version, "calibration_runtime_browser_version").toBe(BASELINE_ENVIRONMENT.browser_version);
      expect(localEnvironment.viewport, "calibration_runtime_viewport").toEqual(BASELINE_ENVIRONMENT.viewport);
    }
    const environment = process.env.SENTINEL_CALIBRATION_RUN ? BASELINE_ENVIRONMENT : localEnvironment;
    fs.writeFileSync(path.join(artifactRoot, "metadata.json"), `${JSON.stringify({
      architecture: environment.architecture,
      ax_sha256: crypto.createHash("sha256").update(axBytes).digest("hex"),
      dom_sha256: crypto.createHash("sha256").update(domBytes).digest("hex"),
      environment,
      metadata_sha256: crypto.createHash("sha256").update(JSON.stringify({ environment, reference: BASELINE_REFERENCE })).digest("hex"),
      png_sha256: actualHash,
      reference: BASELINE_REFERENCE,
      run: calibrationRun,
      schema_version: "1.0",
    }, null, 2)}\n`);
  }
  await expect(root, "visual_geometry_matches_proposed_baseline").toHaveScreenshot("consumer-reference-card-grid.png", {
    animations: "disabled",
    caret: "hide",
    mask,
    maxDiffPixels: 0,
    threshold: 0,
  });
  if (artifactRoot) {
    fs.writeFileSync(path.join(artifactRoot, "comparison.json"), `${JSON.stringify({
      actual_sha256: actualHash,
      assertion: "visual_geometry_matches_proposed_baseline",
      diff_pixels: 0,
      expected_sha256: BASELINE_REFERENCE.baseline.sha256,
      max_diff_pixels: 0,
      run: calibrationRun,
      schema_version: "1.0",
      status: "passed",
      threshold: 0,
    }, null, 2)}\n`);
  }
});
