#!/usr/bin/env node
// Regression gate for the 2026-10-19 real-site run: local reproductions in
// tests/fixtures/audit-realsites must keep their true violations, show none of the fixed
// false positives, resolve the expected profile, and finish inside their time budget.
// Cases run four at a time, the concurrency of the original run.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkAudit } from "./audit-kit.mjs";
import { serveDirectory } from "./audit-browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = path.join(root, "tests/fixtures/audit-realsites");
const manifest = JSON.parse(fs.readFileSync(path.join(fixtures, "manifest.json"), "utf8"));
const onDisk = fs.readdirSync(fixtures).filter((file) => file.endsWith(".html")).sort();
assert.deepEqual(manifest.cases.map((c) => c.fixture).sort(), onDisk, "every fixture has exactly one manifest case");

const server = await serveDirectory(fixtures);
const base = `http://127.0.0.1:${server.address().port}`;
const rows = [];
const failures = [];
try {
  let next = 0;
  const worker = async () => {
    while (next < manifest.cases.length) {
      const item = manifest.cases[next++];
      const started = Date.now();
      try {
        const result = await checkAudit(`${base}/${item.fixture}`, item.options);
        const elapsed = Date.now() - started;
        const byId = new Map(result.checks.map((check) => [check.check_id, check]));
        if (item.verdict) assert.equal(result.verdict, item.verdict, `${item.fixture}: verdict`);
        if (item.verdict_in) assert.ok(item.verdict_in.includes(result.verdict), `${item.fixture}: verdict ${result.verdict} not in ${item.verdict_in}`);
        if (item.profile) assert.equal(result.profile.value, item.profile, `${item.fixture}: profile (${result.profile.reason})`);
        if (item.max_elapsed_ms) assert.ok(elapsed <= item.max_elapsed_ms, `${item.fixture}: took ${elapsed}ms, over ${item.max_elapsed_ms}ms`);
        if (result.verdict === "blocked_or_empty") assert.ok(result.checks.every((check) => check.status === "skipped"), `${item.fixture}: blocked pages run no checks`);
        if (result.timed_out) assert.ok(result.checks.some((check) => check.status === "timed_out"), `${item.fixture}: timed_out run marks unfinished checks`);
        for (const id of item.must_fail ?? []) {
          assert.equal(byId.get(id)?.status, "fail", `${item.fixture}: ${id} must stay a failure\n${JSON.stringify(byId.get(id)?.evidence).slice(0, 600)}`);
        }
        for (const id of item.must_not_fail ?? []) {
          assert.notEqual(byId.get(id)?.status, "fail", `${item.fixture}: ${id} is a fixed false positive\n${JSON.stringify(byId.get(id)?.evidence).slice(0, 900)}`);
        }
        rows.push({ fixture: item.fixture, sites: item.sites, verdict: result.verdict, profile: result.profile?.value ?? null, elapsed_ms: elapsed, failing: result.checks.filter((c) => c.status === "fail").map((c) => c.check_id), warnings: result.warnings ?? [] });
        console.log(`ok ${item.fixture}: ${result.verdict}${result.profile?.value ? ` (${result.profile.value})` : ""} in ${(elapsed / 1000).toFixed(1)}s`);
      } catch (error) {
        failures.push(error);
        console.error(`FAIL ${item.fixture}: ${error.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
} finally { await new Promise((resolve) => server.close(resolve)); }
fs.mkdirSync(path.join(root, ".tmp/audit"), { recursive: true });
fs.writeFileSync(path.join(root, ".tmp/audit/realsites.json"), `${JSON.stringify({ ok: failures.length === 0, rows }, null, 2)}\n`);
if (failures.length) {
  console.error(`FAIL: ${failures.length}/${manifest.cases.length} real-site reproductions`);
  process.exitCode = 1;
} else console.log(`PASS: ${rows.length}/${manifest.cases.length} real-site reproductions`);
