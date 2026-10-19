#!/usr/bin/env node
// Self-test for `stylegallery shots --before --after` (scripts/shots-compare.mjs):
// identical pages must diff to 0, an injected block must give a nonzero ratio with a
// hotspot bbox around it, Git refs and the working tree must resolve, and bad
// arguments must fail before a browser starts. Requires Playwright Chromium.
import assert from "node:assert/strict";
import { execFile, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(repositoryRoot, "scripts", "sg-entry.mjs");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-shots-test-"));

const page = (extra = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fixture</title>
<style>:root{color-scheme:light dark}body{margin:0;font:16px/1.5 sans-serif}main{padding:24px}a:focus{outline:3px solid #c00}a:hover{background:#ff0}
.injected{position:absolute;left:40px;top:300px;width:200px;height:120px;background:#0a7}</style></head>
<body><main><h1>Fixture</h1><p><a class="target" href="#x">Target link</a></p>${extra}</main></body></html>`;

const pages = { "/same-a.html": page(), "/same-b.html": page(), "/changed.html": page('<div class="injected"></div>') };
const server = http.createServer((request, response) => {
  const body = pages[request.url];
  response.writeHead(body ? 200 : 404, { "content-type": "text/html; charset=utf-8" });
  response.end(body ?? "");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
test.after(() => { server.close(); fs.rmSync(temp, { recursive: true, force: true }); });

// Async so the fixture server in this process keeps answering the child's browser.
function cli(args, cwd = repositoryRoot) {
  return new Promise((resolve) => {
    execFile(process.execPath, [entry, "shots", ...args], { cwd, encoding: "utf8", timeout: 300000, maxBuffer: 1 << 26 }, (error, stdout) => {
      resolve({ status: error ? error.code : 0, report: JSON.parse(stdout) });
    });
  });
}

test("identical pages diff to zero across the full light/dark matrix", async () => {
  const out = path.join(temp, "same");
  const { status, report } = await cli(["--before", `${origin}/same-a.html`, "--after", `${origin}/same-b.html`, "--out", out]);
  assert.equal(status, 0, JSON.stringify(report.failures));
  assert.deepEqual(report.pairs.map((pair) => pair.id), ["w390-light-default", "w390-dark-default", "w1440-light-default", "w1440-dark-default"]);
  for (const pair of report.pairs) {
    assert.ok(pair.ratio <= 0.0001, `${pair.id} ratio ${pair.ratio}`);
    assert.equal(pair.bbox, null);
    for (const key of ["before", "after", "diff"]) assert.ok(fs.statSync(path.join(out, pair[key])).size > 0, `${pair.id} ${key}`);
  }
  const written = JSON.parse(fs.readFileSync(path.join(out, "report.json"), "utf8"));
  assert.equal(written.summary.changed, 0);
});

test("an injected block gives a nonzero ratio, a bbox around it, and image-diff fields", async () => {
  const out = path.join(temp, "changed");
  const { status, report } = await cli(["--before", `${origin}/same-a.html`, "--after", `${origin}/changed.html`, "--out", out, "--selector", ".target", "--violations", "fx-01, fx-02"]);
  assert.equal(status, 0, JSON.stringify(report.failures));
  assert.equal(report.pairs.length, 12);
  assert.deepEqual([...new Set(report.pairs.map((pair) => pair.state))], ["default", "focus", "hover"]);
  for (const pair of report.pairs) {
    assert.ok(pair.ratio > 0.005, `${pair.id} ratio ${pair.ratio}`);
    assert.equal(pair.diffRatio, pair.ratio);
    assert.equal(pair.command, "image-diff");
    assert.equal(pair.dimensionsMatch, true);
    assert.equal(pair.diffPixels, 200 * 120);
    assert.deepEqual(pair.bbox, { x: 40, y: 300, width: 200, height: 120 });
    assert.ok(pair.hotspots.length > 0 && pair.hotspots[0].diffRatio > 0);
    assert.equal(typeof pair.viewport.width, "number");
    assert.ok(["light", "dark"].includes(pair.scheme));
  }
  const markdown = fs.readFileSync(path.join(out, "pr-body.md"), "utf8");
  for (const heading of ["## Before/After", "### 390px", "### 1440px", "### Violation IDs", "### Verification"]) assert.ok(markdown.includes(heading), heading);
  assert.ok(markdown.includes("`fx-02`"));
  assert.ok(markdown.includes("Screenshot diffs show rendered change, not usability."));
});

test("Git refs and the working tree resolve to served pages", async () => {
  const repo = path.join(temp, "repo");
  fs.mkdirSync(repo);
  const git = (...args) => assert.equal(spawnSync("git", ["-C", repo, "-c", "user.name=t", "-c", "user.email=t@example.com", ...args]).status, 0, args.join(" "));
  git("init", "-q");
  fs.writeFileSync(path.join(repo, "index.html"), page());
  git("add", "."); git("commit", "-qm", "base");
  fs.writeFileSync(path.join(repo, "index.html"), page('<div class="injected"></div>'));
  const { status, report } = await cli(["--before", "HEAD", "--after", ".", "--out", path.join(temp, "refs")], repo);
  assert.equal(status, 0, JSON.stringify(report.failures));
  assert.equal(report.before.kind, "git_ref");
  assert.match(report.before.revision, /^[0-9a-f]{40}$/);
  assert.equal(report.after.kind, "working_tree");
  assert.ok(report.pairs.every((pair) => pair.ratio > 0));
});

test("arguments fail before capture", async () => {
  assert.equal((await cli(["--before", "HEAD"])).report.failures[0].code, "argument_value_required");
  assert.equal((await cli(["--before", "HEAD", "--after", ".", "--threshold", "2"])).report.failures[0].code, "argument_number_invalid");
  assert.equal((await cli(["--before", "HEAD", "--after", ".", "--bogus", "1"])).report.failures[0].code, "argument_invalid");
  assert.equal((await cli(["--before", "no-such-ref-xyz", "--after", "."])).report.failures[0].code, "git_failed");
});
