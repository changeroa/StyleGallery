#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const availableCases = new Map([
  ["overflow", { expected: "document_no_horizontal_overflow", grep: "@sentinel-overflow", mutation: "overflow" }],
  ["clipped-focus", { expected: "focus_geometry_visible", grep: "@sentinel-clipped-focus", mutation: "clipped-focus" }],
  ["low-contrast", { expected: "color-contrast", grep: "@sentinel-low-contrast", mutation: "low-contrast" }],
  ["dialog-focus-leak", { expected: "dialog_focus_trap", grep: "@sentinel-dialog-focus-leak", mutation: "dialog-focus-leak" }],
  ["console-error", { expected: "console_error_free", grep: "@sentinel-console-error", mutation: "console-error" }],
  ["page-evidence-symlink", { expected: "page_evidence_output_symlink", pageEvidence: "symlink" }],
  ["page-evidence-existing-output", { expected: "page_evidence_output_exists", pageEvidence: "existing-output" }],
  ["ci-cleanup-symlink", { ciCleanup: true, expected: ".tmp must be a real directory" }],
]);
const selected = [];
let json = false;
const argumentFailures = [];

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") json = true;
  else if (argument === "--case") {
    const name = process.argv[index + 1];
    if (!name || name.startsWith("--")) argumentFailures.push("--case requires a value");
    else {
      selected.push(name);
      index += 1;
    }
  } else argumentFailures.push(`unsupported argument ${argument}`);
}

const names = selected.length > 0 ? [...new Set(selected)] : [...availableCases.keys()];
for (const name of names) if (!availableCases.has(name)) argumentFailures.push(`unknown case ${name}`);

function runPlaywright(grep, environment) {
  return spawnSync(
    path.join(repositoryRoot, "node_modules", ".bin", "playwright"),
    ["test", "tests/consumer-conformance.spec.mjs", "--project=chromium", "--reporter=line", "--grep", grep],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, ...environment },
      maxBuffer: 4 * 1024 * 1024,
    },
  );
}

function runMutationControl(name, control) {
  const child = runPlaywright(control.grep, { CONSUMER_CONFORMANCE_MUTATION: control.mutation });
  const output = `${child.stdout}\n${child.stderr}`;
  return {
    actual: { named: output.includes(control.expected), status: child.status },
    expected: control.expected,
    name,
    ok: child.status !== 0 && output.includes(control.expected),
  };
}

function writeReceipt(root) {
  const receipt = {
    attempt: 1,
    intended_scenario_ids: ["responsive-layout"],
    nonce: "a".repeat(64),
    repository: "changeroa/StyleGallery",
    revision: "b".repeat(40),
    run_id: "consumer-conformance-sentinel-run",
    session_id: "consumer-conformance-sentinel-session",
    source: { sha256: "c".repeat(64) },
  };
  fs.writeFileSync(path.join(root, "page-evidence-session.json"), `${JSON.stringify(receipt)}\n`, { flag: "wx" });
}

function runPageEvidenceControl(name, control) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-page-evidence-sentinel-"));
  const observations = [];
  try {
    for (const outputKind of ["captures", "runner"]) {
      const caseRoot = path.join(temporaryRoot, outputKind);
      const artifactRoot = path.join(caseRoot, "artifacts");
      const outside = path.join(caseRoot, "outside");
      fs.mkdirSync(artifactRoot, { recursive: true });
      fs.mkdirSync(outside, { recursive: true });
      writeReceipt(artifactRoot);

      const filename = outputKind === "captures"
        ? "responsive-layout-state-w1024-focus.png"
        : "responsive-layout.json";
      const outputPath = path.join(artifactRoot, outputKind, filename);
      const outsidePath = path.join(outside, filename);
      const marker = "do-not-overwrite";
      if (control.pageEvidence === "symlink") fs.symlinkSync(outside, path.join(artifactRoot, outputKind), "dir");
      else {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, marker, { flag: "wx" });
      }

      const child = runPlaywright("state-w1024-focus", {
        CONSUMER_CONFORMANCE_CAPTURE_DIR: "",
        CONSUMER_CONFORMANCE_MUTATION: "none",
        PAGE_EVIDENCE_ARTIFACT_ROOT: artifactRoot,
        PAGE_EVIDENCE_CASE_ID: "state-w1024-focus",
        PAGE_EVIDENCE_SCENARIO_ID: "responsive-layout",
      });
      const output = `${child.stdout}\n${child.stderr}`;
      observations.push({
        named: output.includes(control.expected),
        output_kind: outputKind,
        outside_write: fs.existsSync(outsidePath),
        preserved: control.pageEvidence === "existing-output" ? fs.readFileSync(outputPath, "utf8") === marker : true,
        status: child.status,
      });
    }
  } finally {
    fs.rmSync(temporaryRoot, { force: true, recursive: true });
  }

  return {
    actual: { observations },
    expected: control.expected,
    name,
    ok: observations.every((observation) => observation.status !== 0 && observation.named && !observation.outside_write && observation.preserved),
  };
}

function runCiCleanupControl(name, control) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-ci-cleanup-sentinel-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-ci-cleanup-outside-"));
  const marker = path.join(outside, "consumer", "preserve.txt");
  try {
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, "preserve\n", { flag: "wx" });
    fs.symlinkSync(outside, path.join(workspace, ".tmp"), "dir");
    const child = spawnSync(process.execPath, [path.join(repositoryRoot, "scripts", "run-consumer-page-evidence-ci.mjs"), "cleanup", "--consumer-root", ".tmp/consumer"], { cwd: workspace, encoding: "utf8" });
    const output = `${child.stdout}\n${child.stderr}`;
    return {
      actual: { markerPreserved: fs.readFileSync(marker, "utf8") === "preserve\n", named: output.includes(control.expected), status: child.status },
      expected: control.expected,
      name,
      ok: child.status !== 0 && output.includes(control.expected) && fs.readFileSync(marker, "utf8") === "preserve\n",
    };
  } finally {
    fs.rmSync(workspace, { force: true, recursive: true });
    fs.rmSync(outside, { force: true, recursive: true });
  }
}

const results = argumentFailures.length === 0 ? names.map((name) => {
  const control = availableCases.get(name);
  return control.pageEvidence ? runPageEvidenceControl(name, control) : control.ciCleanup ? runCiCleanupControl(name, control) : runMutationControl(name, control);
}) : [];

const failures = [
  ...argumentFailures.map((message) => `argument_invalid:${message}`),
  ...results.filter((result) => !result.ok).map((result) => `missing_semantic:${result.name}:${result.expected}`),
];
const report = { failures, ok: failures.length === 0, results };
if (json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
else if (report.ok) process.stdout.write(`consumer conformance sentinel passed ${results.length} mutation controls\n`);
else process.stderr.write(`${failures.join("\n")}\n`);
if (!report.ok) process.exitCode = 1;
