#!/usr/bin/env node
// Optional, network-dependent: runs `audit check` on the 12 homepages of the 2026-10-19
// real-site run, one at a time, and writes a JSON and Markdown summary. Not part of CI;
// tests/fixtures/audit-realsites holds the offline reproductions CI uses instead.
//   node scripts/audit-realsites-live.mjs [--bin stylegallery] [--out .tmp/audit/realsites-live] [--wall 420] [site ...]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REALSITES = ["https://stripe.com", "https://linear.app", "https://www.apple.com", "https://github.com", "https://toss.im", "https://www.naver.com", "https://www.notion.com", "https://vercel.com", "https://www.gov.uk", "https://craigslist.org", "https://www.airbnb.com", "https://news.ycombinator.com"];

const argv = process.argv.slice(2);
const option = (flag, fallback) => { const index = argv.indexOf(flag); if (index === -1) return fallback; const [value] = argv.splice(index, 2).slice(1); return value; };
const bin = option("--bin", null);
const out = path.resolve(option("--out", path.join(root, ".tmp/audit/realsites-live")));
const wallSeconds = Number(option("--wall", 420));
const sites = argv.length ? argv : REALSITES;
const command = bin ? [bin] : [process.execPath, path.join(root, "scripts/sg-entry.mjs")];

function run(url) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command[0], [...command.slice(1), "audit", "check", url, "--json"], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    // The wall limit is the harness's own guard, the same 420 s the original run used.
    const wall = setTimeout(() => child.kill("SIGKILL"), wallSeconds * 1000);
    child.on("close", (code, signal) => {
      clearTimeout(wall);
      const secs = Math.round((Date.now() - started) / 100) / 10;
      try {
        const report = JSON.parse(stdout);
        resolve({ url, secs, exit: code, completed: true, verdict: report.verdict, profile: report.profile?.value ?? null, timed_out: report.timed_out,
          fails: (report.checks ?? []).filter((c) => c.status === "fail").map((c) => c.check_id),
          warnings: report.warnings ?? [], timed_out_checks: (report.checks ?? []).filter((c) => c.status === "timed_out").map((c) => c.check_id),
          blocked: report.blocked?.reason ?? null, report });
      } catch {
        resolve({ url, secs, exit: code, completed: false, error: signal ? `killed by ${signal} after ${wallSeconds}s` : `no JSON report: ${stderr.slice(0, 300)}` });
      }
    });
  });
}

fs.mkdirSync(out, { recursive: true });
const rows = [];
for (const url of sites) {
  const row = await run(url);
  if (row.report) fs.writeFileSync(path.join(out, `${new URL(url).host}.json`), `${JSON.stringify(row.report, null, 2)}\n`);
  delete row.report;
  rows.push(row);
  console.log(`${row.completed ? row.verdict : "INCOMPLETE"} ${url} ${row.secs}s${row.fails?.length ? ` fails: ${row.fails.join(", ")}` : ""}${row.error ? ` (${row.error})` : ""}`);
}
const table = ["| Site | Seconds | Completed | Verdict | Profile | Failing checks | Warnings | Timed-out checks |", "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ...rows.map((r) => `| ${new URL(r.url).host} | ${r.secs} | ${r.completed ? "yes" : "no"} | ${r.verdict ?? r.error} | ${r.profile ?? "-"} | ${r.fails?.join(", ") || "-"} | ${r.warnings?.join(", ") || "-"} | ${r.timed_out_checks?.join(", ") || "-"} |`)].join("\n");
fs.writeFileSync(path.join(out, "summary.json"), `${JSON.stringify(rows, null, 2)}\n`);
fs.writeFileSync(path.join(out, "summary.md"), `${table}\n`);
console.log(`\n${table}`);
