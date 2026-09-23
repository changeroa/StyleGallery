import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { runCli } from "./agent-native/cli-adapter.mjs";
import { runSgCli } from "./compiler/cli.mjs";
import { createSgMcpServer } from "./compiler/mcp.mjs";
import { executeCompiler } from "./compiler/runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "sg compiler "));
const compilerRoot = path.join(temporary, "private checkout");
const cwd = path.join(temporary, "consumer project");
fs.mkdirSync(compilerRoot);
fs.mkdirSync(cwd);
fs.writeFileSync(path.join(compilerRoot, "package.json"), '{"name":"site-compiler","version":"0.1.0","type":"module"}');
fs.writeFileSync(path.join(compilerRoot, "SKILL.md"), "# Installed workflow\nConsumer-owned output.\n");
fs.writeFileSync(path.join(compilerRoot, "README.md"), "# Installed compiler\n");
const childScript = `
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
const args = process.argv.slice(2);
console.log(JSON.stringify({ args, cwd: process.cwd() }));
if (args.includes('https://failure.example/')) { console.error('capture failed'); process.exitCode = 7; }
else if (args.includes('https://sleep.example/')) { setInterval(() => {}, 1000); }
else if (args.includes('https://tree.example/')) {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  const out = args[args.indexOf('--out') + 1];
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'pids.json'), JSON.stringify([process.pid, child.pid]));
  setInterval(() => {}, 1000);
}
else if (args.includes('https://noisy.example/')) { process.stdout.write('x'.repeat(100000)); }
`;
for (const name of ["compile.mjs", "timeline.mjs", "qa-gate.mjs", "sale-edition.mjs", "transcribe.mjs", "build.mjs"]) fs.writeFileSync(path.join(compilerRoot, name), childScript);
const config = { compilerRoot, cwd };
after(() => fs.rmSync(temporary, { recursive: true, force: true }));

const envelope = (result) => result.structuredContent ?? JSON.parse(result.content[0].text);
async function connect(serverConfig = config) {
  const server = createSgMcpServer(serverConfig);
  const client = new Client({ name: "sg-compiler-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, close: async () => { await client.close(); await server.close(); } };
}

test("SG preserves knowledge payloads and adds installation discovery", async () => {
  for (const args of [["discover"], ["ops"], ["resolve", "sg:profile/editorial-reference-profile"], ["context", "sg:profile/editorial-reference-profile"]]) {
    const legacy = runCli(args).report;
    const current = (await runSgCli(args, config)).report;
    const { compiler, ...knowledge } = current;
    assert.deepEqual(knowledge, legacy);
    if (["discover", "ops"].includes(args[0])) {
      assert.equal(compiler.installation.configured, true);
      assert.equal(compiler.installation.revision, null, "a directory inside another repository must not inherit its revision");
      assert.ok(compiler.operations.some(({ name }) => name === "compile"));
    }
  }
  const discovery = await runSgCli(["discover"], { compilerRoot: path.join(temporary, "missing") });
  assert.equal(discovery.report.ok, true);
  assert.equal(discovery.report.compiler.installation.configured, false);
});

test("direct CLI runs the fixed entry without shell expansion and returns JSON", async () => {
  const output = "captures with spaces/$(must-not-run) `literal`";
  const result = await runSgCli(["compile", "--url", "https://example.com/", "--out", output, "--width", "375", "--wait", "0", "--format", "json"], config);
  assert.equal(result.exitCode, 0, result.output);
  const log = JSON.parse(result.report.result.stdout);
  assert.deepEqual(log.args, ["--url", "https://example.com/", "--out", path.join(cwd, output), "--width", "375", "--wait", "0"]);
  assert.equal(log.cwd, fs.realpathSync(compilerRoot));
  assert.equal(result.report.result.script, "compile.mjs");
  assert.match(result.report.result.script_sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(JSON.parse(result.output), result.report);
});

test("invalid flags, URLs, numeric values, and private-audit placement fail before execution", async () => {
  for (const args of [
    ["compile", "--url", "file:///etc/hosts", "--out", "capture"],
    ["compile", "--url", "https://example.com", "--out", "capture", "--width", "0"],
    ["compile", "--url", "https://example.com", "--out", "capture", "--wait", "NaN"],
    ["compile", "--url", "https://example.com", "--out", "capture", "--out", "other"],
    ["compile", "--url", "https://example.com", "--output", "capture"],
    ["compile", "--url", "https://example.com", "--out"],
    ["timeline", "--url", "https://example.com", "--out", "capture", "--step", "0"],
    ["sale", "--in", "capture", "--out", "capture"],
    ["sale", "--in", "capture", "--out", "sale", "--audit", "sale/private.json"],
    ["compile", "--compiler-root"],
  ]) {
    const result = await runSgCli(args, config);
    assert.equal(result.exitCode, 1, args.join(" "));
    assert.equal(result.report.result, undefined, args.join(" "));
  }
  const unknown = await executeCompiler("constructor", {}, config);
  assert.equal(unknown.failures[0].code, "command_unknown");
});

test("failures, bounded logs, timeouts, and cancellation remain machine-readable", async () => {
  const failed = await executeCompiler("compile", { url: "https://failure.example/", out: "capture" }, config);
  assert.equal(failed.ok, false);
  assert.equal(failed.result.exit_code, 7);
  assert.match(failed.result.stderr, /capture failed/);
  const noisy = await executeCompiler("compile", { url: "https://noisy.example/", out: "capture" }, config);
  assert.equal(noisy.ok, true);
  assert.equal(noisy.result.stdout_truncated, true);
  assert.equal(Buffer.byteLength(noisy.result.stdout), 65536);
  const timed = await executeCompiler("compile", { url: "https://sleep.example/", out: "capture", runner_timeout_ms: 100 }, config);
  assert.equal(timed.ok, false);
  assert.equal(timed.failures[0].code, "compiler_timeout");
  const controller = new AbortController();
  const promise = executeCompiler("compile", { url: "https://sleep.example/", out: "capture" }, { ...config, signal: controller.signal });
  setTimeout(() => controller.abort(), 100);
  assert.equal((await promise).failures[0].code, "compiler_cancelled");
});

test("workflow reads installed documents; model commands receive the SG corpus", async () => {
  const workflow = await runSgCli(["workflow"], config);
  assert.equal(workflow.report.result.text, "# Installed workflow\nConsumer-owned output.\n");
  assert.match(workflow.report.result.sha256, /^[a-f0-9]{64}$/);
  const transcribe = await executeCompiler("transcribe", { in: "captures", only: "example" }, config);
  const args = JSON.parse(transcribe.result.stdout).args;
  assert.equal(args[args.indexOf("--stylegallery") + 1], root);
  assert.equal(transcribe.result.ledger, path.join(cwd, "captures/transcribe.json"));
  assert.match(transcribe.result.success_scope, /process_exit_only/);
});

test("MCP advertises unprefixed commands with effects and retains frozen resources", async () => {
  const connection = await connect();
  try {
    const { tools } = await connection.client.listTools();
    const expected = ["claims", "context", "discover", "ops", "resolve", "retrieve", "compile", "timeline", "transcribe", "sale", "gate", "build", "shots", "probe", "batch-triage", "triage", "batch-capture", "pack-status", "pack-release", "workflow"].sort();
    assert.deepEqual(tools.map(({ name }) => name), expected);
    assert.equal(tools.find(({ name }) => name === "compile").annotations.readOnlyHint, false);
    assert.equal(tools.find(({ name }) => name === "workflow").annotations.readOnlyHint, true);
    const input = { url: "https://example.com/", out: "capture", width: 375 };
    const called = envelope(await connection.client.callTool({ name: "compile", arguments: input }));
    const cli = (await runSgCli(["compile", "--url", input.url, "--out", input.out, "--width", "375"], config)).report;
    assert.deepEqual(called, cli);
    const resolved = envelope(await connection.client.callTool({ name: "resolve", arguments: { stable_ref: "sg:profile/editorial-reference-profile" } }));
    assert.equal(resolved.ok, true);
    assert.ok((await connection.client.readResource({ uri: "sg://self" })).contents.length);
    assert.equal((await connection.client.listResources()).resources.length, 31);
    const denied = await connection.client.callTool({ name: "proposal.create", arguments: {} });
    assert.equal(denied.isError, true);
    const invalid = await connection.client.callTool({ name: "compile", arguments: { ...input, unknown: true } });
    assert.equal(invalid.isError, true);
  } finally { await connection.close(); }
});

test("MCP cancellation stops both the compiler and its child processes", { timeout: 10000 }, async () => {
  const connection = await connect();
  const controller = new AbortController();
  const out = path.join(cwd, "process tree");
  const pidsPath = path.join(out, "pids.json");
  const delay = () => new Promise((resolve) => setTimeout(resolve, 20));
  try {
    const call = connection.client.callTool({ name: "compile", arguments: { url: "https://tree.example/", out } }, undefined, { signal: controller.signal });
    const outcome = call.catch((error) => error);
    for (let i = 0; i < 100 && !fs.existsSync(pidsPath); i += 1) await delay();
    assert.ok(fs.existsSync(pidsPath), "compiler must launch before cancellation");
    const pids = JSON.parse(fs.readFileSync(pidsPath));
    controller.abort();
    assert.ok(await outcome instanceof Error);
    const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
    for (let i = 0; i < 150 && pids.some(alive); i += 1) await delay();
    assert.deepEqual(pids.filter(alive), [], "cancelled process tree must not survive the request");
  } finally { controller.abort(); await connection.close(); }
});

test("packaged entrypoints use the new CLI and real MCP stdio without stdout pollution", async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json")));
  assert.equal(manifest.bin.sg, "scripts/sg-entry.mjs");
  assert.equal(manifest.bin["stylegallery-mcp"], "scripts/sg-server.mjs");
  for (const relative of [manifest.bin.sg, manifest.bin["stylegallery-mcp"], "scripts/compiler/cli.mjs", "scripts/compiler/operations.mjs", "scripts/compiler/runtime.mjs", "scripts/compiler/mcp.mjs", "scripts/compiler/README.md"]) assert.ok(manifest.files.includes(relative), relative);
  const child = spawnSync(process.execPath, [path.join(root, manifest.bin.sg), "compile", "--compiler-root", compilerRoot, "--url", "https://failure.example/", "--out", "capture"], { cwd, encoding: "utf8" });
  assert.equal(child.status, 1);
  assert.equal(child.stderr, "");
  assert.equal(JSON.parse(child.stdout).result.exit_code, 7);
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(root, manifest.bin["stylegallery-mcp"])], cwd, env: { ...process.env, SG_COMPILER_ROOT: compilerRoot }, stderr: "pipe" });
  const stderr = [];
  transport.stderr.on("data", (chunk) => stderr.push(chunk));
  const client = new Client({ name: "sg-compiler-stdio", version: "1.0.0" });
  try {
    await client.connect(transport);
    assert.equal((await client.listTools()).tools.length, 20);
    const result = envelope(await client.callTool({ name: "workflow", arguments: { document: "readme" } }));
    assert.equal(result.result.text, "# Installed compiler\n");
    assert.equal(envelope(await client.callTool({ name: "discover", arguments: {} })).compiler.installation.configured, true);
  } finally { await client.close(); }
  assert.equal(Buffer.concat(stderr).toString(), "");
});

test("real upstream captures independently served geometry through CLI and MCP", { skip: !process.env.SG_COMPILER_INTEGRATION_ROOT, timeout: 120000 }, async () => {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end('<!doctype html><html lang="en"><meta charset="utf-8"><title>SG capture fixture</title><style>body{margin:0}section{height:900px}section:nth-child(2){background:#579}</style><body><main><section><h1>First scene</h1></section><section><h2>Second scene</h2></section></main></body></html>');
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const out = path.join(temporary, "actual capture");
  const actual = { compilerRoot: process.env.SG_COMPILER_INTEGRATION_ROOT, cwd };
  const connection = await connect(actual);
  try {
    const capture = await runSgCli(["compile", "--url", url, "--out", out, "--width", "1024", "--height", "600", "--wait", "0"], actual);
    assert.equal(capture.report.ok, true, capture.output);
    const scenes = JSON.parse(fs.readFileSync(path.join(out, "scenes.json")));
    assert.equal(scenes.url, url);
    assert.equal(scenes.viewport, "1024x600");
    assert.ok(scenes.totalHeight >= 1800);
    assert.equal(scenes.scenes.length, 2);
    for (const scene of scenes.scenes) for (const frame of scene.frames) assert.ok(fs.statSync(path.join(out, frame)).size > 0);
    const timeline = envelope(await connection.client.callTool({ name: "timeline", arguments: { url, out, width: 1024, height: 600, step: 600, wait: 0, grow: true } }));
    assert.equal(timeline.ok, true, JSON.stringify(timeline));
    const curve = JSON.parse(fs.readFileSync(path.join(out, "timeline-curve.json")));
    assert.equal(curve.viewport, scenes.viewport);
    assert.equal(curve.frames.length, curve.diffs.length + 1);
    assert.ok(curve.frames.length >= 3);
    for (const frame of curve.frames) assert.ok(fs.statSync(path.join(out, frame.f)).size > 0);
    const gate = await executeCompiler("gate", { in: out }, actual);
    assert.equal(gate.ok, false, "raw captures alone must not pass the transcription gate");
  } finally { await connection.close(); await new Promise((resolve) => server.close(resolve)); }
});
