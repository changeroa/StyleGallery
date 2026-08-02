import fs from "node:fs";
import path from "node:path";
import { BASELINE_ENVIRONMENT, BASELINE_METADATA_SHA256, BASELINE_REFERENCE, sha256 } from "./baseline-contract.mjs";

const EXPECTED_TEST = "canonical consumer reference preserves computed layout before its locator screenshot";

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function playwrightReport() {
  return {
    config: { projects: [{ id: "chromium", name: "chromium" }], version: "1.61.0", workers: 1 },
    errors: [],
    stats: { expected: 1, flaky: 0, skipped: 0, unexpected: 0 },
    suites: [{
      file: "consumer-reference-sentinels.spec.mjs",
      specs: [{
        ok: true,
        tests: [{
          expectedStatus: "passed",
          projectId: "chromium",
          projectName: "chromium",
          results: [{ errors: [], status: "passed" }],
          status: "expected",
        }],
        title: EXPECTED_TEST,
      }],
    }],
  };
}

export function writeCalibrationRun(root, run, png) {
  const runRoot = path.join(root, `run-${String(run).padStart(2, "0")}`);
  const dom = Buffer.from("<section class=card_grid></section>\n");
  const ax = Buffer.from("- region \"Project cards\"\n");
  const pngHash = sha256(png);
  fs.mkdirSync(runRoot, { recursive: true });
  fs.writeFileSync(path.join(runRoot, "actual.png"), png);
  fs.writeFileSync(path.join(runRoot, "dom.html"), dom);
  fs.writeFileSync(path.join(runRoot, "ax.txt"), ax);
  writeJson(path.join(runRoot, "playwright.json"), playwrightReport());
  writeJson(path.join(runRoot, "exit.json"), { exit_code: 0, run, schema_version: "1.0" });
  writeJson(path.join(runRoot, "comparison.json"), {
    actual_sha256: pngHash,
    assertion: "visual_geometry_matches_proposed_baseline",
    diff_pixels: 0,
    expected_sha256: BASELINE_REFERENCE.baseline.sha256,
    max_diff_pixels: 0,
    run,
    schema_version: "1.0",
    status: "passed",
    threshold: 0,
  });
  writeJson(path.join(runRoot, "metadata.json"), {
    architecture: "amd64",
    ax_sha256: sha256(ax),
    dom_sha256: sha256(dom),
    environment: BASELINE_ENVIRONMENT,
    metadata_sha256: BASELINE_METADATA_SHA256,
    png_sha256: pngHash,
    reference: BASELINE_REFERENCE,
    run,
    schema_version: "1.0",
  });
  return runRoot;
}

export function createCalibrationBase(root, repositoryRoot, runCount = 20) {
  const png = fs.readFileSync(path.join(repositoryRoot, BASELINE_REFERENCE.baseline.path));
  fs.mkdirSync(root, { recursive: true });
  for (let run = 1; run <= runCount; run += 1) writeCalibrationRun(root, run, png);
  return root;
}

export function cloneCalibrationBase(base, destination) {
  fs.cpSync(base, destination, { recursive: true });
  return destination;
}

export function mutateJson(file, mutate) {
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  writeJson(file, mutate(value));
}

export function treeDigest(root) {
  return sha256(fs.readdirSync(root).sort().flatMap((name) => {
    const entry = path.join(root, name);
    if (!fs.lstatSync(entry).isDirectory()) return [`${name}:${sha256(fs.readFileSync(entry))}`];
    return fs.readdirSync(entry).sort().map((child) => {
      const file = path.join(entry, child);
      return `${name}/${child}:${sha256(fs.readFileSync(file))}`;
    });
  }).join("\n"));
}
