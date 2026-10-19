#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkAudit, auditCatalogs } from "./audit-kit.mjs";
import { sharedCheckPrinciples } from "./audit-browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = path.join(root, "tests/fixtures/audit-checks");
const expected = [...Object.keys(sharedCheckPrinciples), ...auditCatalogs().slop.entries.filter((e) => e.detectable === "machine").map((e) => e.id)].sort();
assert.deepEqual(fs.readdirSync(fixtures).filter((f) => f !== "clean.html").map((f) => f.replace(/\.html$/, "")).sort(), expected);
const external = http.createServer((_, response) => response.writeHead(200, { "content-type": "text/javascript" }).end("window.auditFixtureLibrary=true;"));
await new Promise((resolve) => external.listen(0, "127.0.0.1", resolve));
const externalBase = `http://127.0.0.1:${external.address().port}`;
const server = http.createServer((request, response) => {
  const name = path.basename(new URL(request.url, "http://localhost").pathname);
  if (!fs.existsSync(path.join(fixtures, name))) { response.writeHead(404).end(); return; }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" })
    .end(fs.readFileSync(path.join(fixtures, name), "utf8").replaceAll("__EXTERNAL__", externalBase));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const rows = new Array(expected.length);
try {
  const clean = await checkAudit(`${base}/clean.html`);
  assert.equal(clean.ok, true, JSON.stringify(clean.checks.filter((c) => !c.pass), null, 2));
  assert.deepEqual(clean.checks.map((c) => c.check_id).sort(), expected);
  let next = 0;
  const worker = async () => {
    while (next < expected.length) {
      const index = next++, id = expected[index];
      const bad = await checkAudit(`${base}/${id}.html`, { viewports: [1440] });
      const target = bad.checks.find((c) => c.check_id === id);
      assert.ok(target, `${id}: missing verdict`);
      assert.equal(target.pass, false, `${id}: injected violation passed\n${JSON.stringify(target)}`);
      rows[index] = { check_id: id, clean: "PASS", violation: "FAIL", detected: true };
      console.log(`ok ${id}: clean PASS / violation FAIL`);
    }
  };
  await Promise.all(Array.from({ length: 3 }, worker));
  fs.mkdirSync(path.join(root, ".tmp/audit"), { recursive: true });
  fs.writeFileSync(path.join(root, ".tmp/audit/fixtures.json"), `${JSON.stringify({ ok: true, rows }, null, 2)}\n`);
  console.log(`PASS: ${rows.length}/${expected.length} checks reject violations and accept the clean fixture`);
} finally {
  await Promise.all([new Promise((resolve) => server.close(resolve)), new Promise((resolve) => external.close(resolve))]);
}
