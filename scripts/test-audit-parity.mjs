#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serveDirectory } from "./check-showcase.mjs";
import { sharedCheckPrinciples } from "./audit-browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const works = ["hearth-clay", "linear", "zed"];
const out = path.join(root, ".tmp/audit/parity");
const server = await serveDirectory(path.join(root, "showcase"));
const base = `http://127.0.0.1:${server.address().port}`;
const run = (args) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { cwd: root });
  let stdout = "", stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", reject);
  child.on("close", (code) => {
    try {
      const report = JSON.parse(stdout);
      assert.equal(code, report.ok ? 0 : 1, stderr);
      resolve(report);
    } catch (error) { reject(new Error(`${args.join(" ")}: ${error.message}\n${stdout}\n${stderr}`)); }
  });
});
const results = [];
try {
  for (const slug of works) {
    const showcase = await run(["scripts/check-showcase.mjs", "--work", slug, "--json", "--out", out]);
    const audit = await run(["scripts/sg-entry.mjs", "audit", "check", `${base}/${slug}/`, "--json"]);
    const shared = Object.keys(sharedCheckPrinciples);
    const verdicts = (checks) => Object.fromEntries(shared.map((id) => {
      const check = checks?.find((c) => c.check_id === id);
      assert.ok(check, `${slug}: missing ${id}`);
      return [id, check.pass];
    }));
    const left = verdicts(showcase.works[0].checks), right = verdicts(audit.checks);
    assert.deepEqual(right, left, `${slug}: shared verdict mismatch`);
    results.push({ work: slug, shared_checks: shared.length, identical: true, verdicts: left });
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, `${slug}-audit.json`), JSON.stringify(audit, null, 2));
    console.log(`PASS ${slug}: ${shared.length}/${shared.length} identical shared verdicts`);
  }
  fs.writeFileSync(path.join(out, "results.json"), `${JSON.stringify({ ok: true, results }, null, 2)}\n`);
} finally { await new Promise((resolve) => server.close(resolve)); }
