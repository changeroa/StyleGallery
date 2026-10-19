import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { once } from "node:events";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { initAudit, auditCatalogs, parseViewports } from "./audit-kit.mjs";
import { validateLedger } from "./stylegallery-audit.mjs";
import { runStylegalleryCli } from "./stylegallery-cli.mjs";
import { createSgMcpServer } from "./compiler/mcp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envelope = (result) => result.structuredContent ?? JSON.parse(result.content[0].text);
test("init writes a valid complete ledger and never overwrites consumer files", async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "sg-audit-init-"));
  try {
    const result = await runStylegalleryCli(["audit", "init", "https://example.com", "--out", out]);
    assert.equal(result.exitCode, 0, result.output);
    const ledger = JSON.parse(fs.readFileSync(path.join(out, "ledger.json")));
    assert.deepEqual(validateLedger(ledger), []);
    const { hig, slop } = auditCatalogs();
    assert.deepEqual(ledger.principles.map((p) => p.principle_id), [
      ...hig.principles.filter((p) => ["universal", "adapt"].includes(p.class)).map((p) => p.id),
      ...slop.entries.map((e) => e.id),
    ]);
    assert.ok(ledger.principles.every((p) => p.violations.length === 0));
    const before = fs.readFileSync(path.join(out, "ledger.json"), "utf8");
    assert.throws(() => initAudit("https://other.example", { out }), /overwrite/);
    assert.equal(fs.readFileSync(path.join(out, "ledger.json"), "utf8"), before);
    assert.equal((await runStylegalleryCli(["audit", "status", path.join(out, "ledger.json"), "--json"])).exitCode, 0);
  } finally { fs.rmSync(out, { recursive: true, force: true }); }
});

test("input errors do not launch a browser or write files", async () => {
  for (const args of [
    ["init"], ["init", "file:///etc/hosts"], ["init", "https://example.com", "--out"],
    ["init", "https://example.com", "--unknown"],
    ["check"], ["check", "https://example.com", "--viewports", "0"],
    ["check", "https://example.com", "--viewports", "1440,1440"],
    ["check", "https://example.com", "--viewports", "NaN"],
  ]) assert.equal((await runStylegalleryCli(["audit", ...args])).exitCode, 1, args.join(" "));
  assert.deepEqual(parseViewports("320,1440"), [320, 1440]);
  assert.throws(() => parseViewports([]), /viewports/);
});

test("CLI cancellation closes a browser waiting for its target", { timeout: 15000 }, async () => {
  const server = http.createServer(() => {});
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const controller = new AbortController();
  const requested = once(server, "request", { signal: AbortSignal.timeout(10000) });
  try {
    const run = runStylegalleryCli(["audit", "check", `http://127.0.0.1:${server.address().port}/`], { signal: controller.signal });
    await requested;
    controller.abort();
    const result = await run;
    assert.equal(result.exitCode, 1);
    assert.equal(result.report.ok, false);
    assert.equal(result.report.operation, "audit check");
  } finally {
    controller.abort();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("MCP exposes separate effect annotations and real init/status handlers", async () => {
  const server = createSgMcpServer();
  const client = new Client({ name: "audit-test", version: "1.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "sg-audit-mcp-"));
  try {
    await Promise.all([server.connect(b), client.connect(a)]);
    const tools = (await client.listTools()).tools.filter((t) => t.name.startsWith("audit_"));
    assert.deepEqual(tools.map((t) => t.name), ["audit_check", "audit_init", "audit_status"]);
    assert.equal(tools[0].annotations.readOnlyHint, false);
    assert.equal(tools[0].annotations.openWorldHint, true);
    assert.equal(tools[1].annotations.readOnlyHint, false);
    assert.equal(tools[2].annotations.readOnlyHint, true);
    const init = envelope(await client.callTool({ name: "audit_init", arguments: { url: "https://example.com", out } }));
    assert.equal(init.ok, true, JSON.stringify(init));
    assert.equal(envelope(await client.callTool({ name: "audit_status", arguments: { ledger: path.join(out, "ledger.json") } })).ok, true);
    for (const [name, input] of [
      ["audit_check", { target: "https://example.com", viewports: [0] }],
      ["audit_init", { url: "https://example.com", extra: true }],
      ["audit_status", { ledger: 42 }],
    ]) {
      const invalid = await client.callTool({ name, arguments: input });
      assert.equal(invalid.isError, true);
      assert.equal(envelope(invalid).failures[0].code, "audit_input_invalid");
    }
    await assert.rejects(client.callTool({ name: "audit_check", arguments: null }), /Invalid tools\/call request/);
    const checked = envelope(await client.callTool({
      name: "audit_check",
      arguments: { target: path.join(root, "tests/fixtures/audit-checks/clean.html"), viewports: [1440] },
    }));
    assert.equal(checked.ok, true, JSON.stringify(checked));
    assert.equal(checked.checks.length, 23);
    assert.equal(checked.review.length, 4);
    assert.ok(checked.checks.every((c) => c.pass && c.evidence));
  } finally {
    await client.close(); await server.close();
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("public stdio MCP exposes audit tools without changing frozen v1", async () => {
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(root, "scripts/sg-server.mjs")], stderr: "pipe" });
  const client = new Client({ name: "audit-stdio-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    assert.equal((await client.listTools()).tools.filter((t) => t.name.startsWith("audit_")).length, 3);
    const invalid = envelope(await client.callTool({ name: "audit_status", arguments: { ledger: "/does-not-exist/audit.json" } }));
    assert.equal(invalid.ok, false);
    assert.equal(invalid.failures[0].code, "ledger_unreadable");
  } finally { await client.close(); }
});
