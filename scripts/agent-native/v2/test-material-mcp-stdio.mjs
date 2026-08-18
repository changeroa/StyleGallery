#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { executeMaterialCli } from "./material-cli-adapter.mjs";
import { materialResourceUri } from "./material-mcp-adapter.mjs";
import { MATERIAL_MCP_MAX_FRAME_BYTES, MaterialMcpStdin } from "../../sg-material-mcp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "consumer-reference/agent-native/v2/material-registry.json"), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function deadline(promise, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), 20_000);
        timer.unref();
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
const envelope = (response) => response.structuredContent ?? JSON.parse(response.content.find(({ type }) => type === "text").text);

async function rejected(action, pattern) {
  try {
    const result = await action();
    assert.equal(result?.isError, true, "request must be an MCP/domain error");
    assert.match(result.content?.[0]?.text ?? "", pattern);
  } catch (error) {
    assert.match(String(error?.message ?? error), pattern);
  }
}

async function connection(script, cwd, name) {
  const transport = new StdioClientTransport({ command: process.execPath, args: [script], cwd, stderr: "pipe" });
  let stderr = "";
  transport.stderr.setEncoding("utf8");
  transport.stderr.on("data", (chunk) => { stderr += chunk; });
  const client = new Client({ name, version: "1.0.0" });
  await deadline(client.connect(transport), `${name} initialize`);
  return { client, transport, stderr: () => stderr };
}

async function rawProtocolProbe(script, cwd) {
  const child = spawn(process.execPath, [script], { cwd, stdio: ["pipe", "pipe", "pipe"] });
  let stderr = "";
  let pendingText = "";
  const queued = [];
  const waiters = [];
  const allMessages = [];
  const closed = new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    pendingText += chunk;
    while (pendingText.includes("\n")) {
      const newline = pendingText.indexOf("\n");
      const line = pendingText.slice(0, newline);
      pendingText = pendingText.slice(newline + 1);
      const message = JSON.parse(line);
      allMessages.push(message);
      const index = waiters.findIndex(({ predicate }) => predicate(message));
      if (index === -1) queued.push(message);
      else waiters.splice(index, 1)[0].resolve(message);
    }
  });
  const next = (predicate, label) => {
    const index = queued.findIndex(predicate);
    if (index !== -1) return Promise.resolve(queued.splice(index, 1)[0]);
    return deadline(new Promise((resolve) => waiters.push({ predicate, resolve })), label);
  };
  const send = (value) => child.stdin.write(`${typeof value === "string" ? value : JSON.stringify(value)}\n`);
  try {
    const initialized = next((message) => message.id === 7, "raw initialize response");
    const initialize = JSON.stringify({ jsonrpc: "2.0", id: 7, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "raw-stdio-probe", version: "1.0.0" } } });
    send(`${initialize}${" ".repeat(MATERIAL_MCP_MAX_FRAME_BYTES - Buffer.byteLength(initialize))}`);
    const initializeResponse = await initialized;
    assert.equal(initializeResponse.result.serverInfo.name, "StyleGallery Material");
    send({ jsonrpc: "2.0", method: "notifications/initialized" });

    const repeatedA = next((message) => message.id === 31, "first repeated-id response");
    const repeatedB = next((message) => message.id === 31, "second repeated-id response");
    send({ jsonrpc: "2.0", id: 31, method: "tools/call", params: { name: "material-discover", arguments: {} } });
    send({ jsonrpc: "2.0", id: 31, method: "tools/call", params: { name: "material-discover", arguments: {} } });
    const repeated = await Promise.all([repeatedA, repeatedB]);
    assert.ok(repeated.every(({ result }) => result?.structuredContent?.ok === true));

    const oversized = next((message) => message.id === 41, "oversized request response");
    const oversizedQuery = "x".repeat(4097);
    send({ jsonrpc: "2.0", id: 41, method: "tools/call", params: { name: "material-search", arguments: { query: oversizedQuery } } });
    const oversizedResponse = await oversized;
    assert.equal(oversizedResponse.result.isError, true);
    assert.doesNotMatch(JSON.stringify(oversizedResponse), new RegExp(oversizedQuery.slice(0, 128)));

    const afterNotification = next((message) => message.id === 51, "post-notification response");
    send({ jsonrpc: "2.0", method: "notifications/unknown", params: { ignored: true } });
    send({ jsonrpc: "2.0", id: 51, method: "tools/list", params: {} });
    assert.equal((await afterNotification).result.tools.length, 4);

    const afterMalformed = next((message) => message.id === 61, "post-malformed response");
    send("{malformed-json");
    send({ jsonrpc: "2.0", id: 61, method: "resources/list", params: {} });
    assert.equal((await afterMalformed).result.resources.length, 133);
    assert.equal(allMessages.filter((message) => message.id === undefined).length, 0);
  } finally {
    child.stdin.end();
  }
  const close = await deadline(closed, "raw stdio shutdown");
  assert.equal(close.code, 0);
  assert.equal(close.signal, null);
  assert.equal(stderr, "");
  assert.equal(child.exitCode, 0);
  return { repeated_ids: 2, notifications: 2, oversized_requests: 1, malformed_requests: 1, clean_shutdown: true };
}

async function filterFrames(chunks, maxFrameBytes) {
  const input = new MaterialMcpStdin(maxFrameBytes);
  const output = [];
  input.on("data", (chunk) => output.push(Buffer.from(chunk)));
  const completed = new Promise((resolve, reject) => {
    input.once("end", resolve);
    input.once("error", reject);
  });
  for (const chunk of chunks) input.write(chunk);
  input.end();
  await completed;
  return Buffer.concat(output);
}

async function frameBoundaryProbe() {
  assert.equal((await filterFrames(["12345678\n"], 8)).toString(), "12345678\n");
  await assert.rejects(filterFrames(["12345678", "9"], 8), (error) => error?.code === "ERR_MATERIAL_MCP_FRAME_TOO_LARGE");
  assert.equal((await filterFrames(["123", "456", "78", "\n"], 8)).toString(), "12345678\n");
  assert.equal((await filterFrames(["one\ntw", "o\n"], 8)).toString(), "one\ntwo\n");
  assert.equal((await filterFrames([Buffer.from("😀"), "\n"], 4)).toString(), "😀\n");
  await assert.rejects(filterFrames([Buffer.from("😀"), "x"], 4), (error) => error?.code === "ERR_MATERIAL_MCP_FRAME_TOO_LARGE");
  return { exact_boundary: true, boundary_plus_one: true, multi_chunk: true, multiple_frames: true, utf8_bytes: true };
}

async function oversizedFrameProbe(script, cwd) {
  const timeArgs = process.platform === "darwin" ? ["-l"] : ["-v"];
  const child = spawn("/usr/bin/time", [...timeArgs, process.execPath, script], { cwd, stdio: ["pipe", "ignore", "pipe"] });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const closed = new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
  const inputError = new Promise((resolve) => child.stdin.once("error", resolve));
  const chunk = Buffer.alloc(64 * 1024, 0x78);
  try {
    for (let written = 0; written < 16 * 1024 * 1024; written += chunk.byteLength) {
      if (!child.stdin.write(chunk)) await Promise.race([once(child.stdin, "drain"), inputError]);
      if (child.stdin.destroyed) break;
    }
    if (!child.stdin.destroyed) child.stdin.end();
  } catch (error) {
    if (error?.code !== "EPIPE" && error?.code !== "ERR_STREAM_DESTROYED") throw error;
  }
  const close = await deadline(closed, "oversized frame shutdown");
  const rssMatch = process.platform === "darwin"
    ? /^\s*(\d+)\s+maximum resident set size$/m.exec(stderr)
    : /^\s*Maximum resident set size \(kbytes\):\s*(\d+)$/m.exec(stderr);
  assert.ok(rssMatch, "OS resource report must contain maximum RSS");
  const maximumRssBytes = Number(rssMatch[1]) * (process.platform === "darwin" ? 1 : 1024);
  const applicationStderr = stderr.split("\n").filter((line) => line.startsWith("material MCP ")).join("\n");
  assert.equal(close.code, 1, `oversized frame must fail predictably; stderr: ${applicationStderr}`);
  assert.equal(close.signal, null);
  assert.equal(applicationStderr, "material MCP input frame exceeds 1048576-byte limit");
  assert.ok(maximumRssBytes < 256 * 1024 * 1024, `maximum RSS must remain below 256 MiB, got ${maximumRssBytes}`);
  assert.doesNotMatch(applicationStderr, /x{32}|\/Users\/|repository_path|source body/i);
  return { input_bytes: 16 * 1024 * 1024, maximum_rss_bytes: maximumRssBytes, rss_limit_bytes: 256 * 1024 * 1024, exit_code: close.code };
}


async function epipeProbe(script, cwd) {
  const child = spawn(process.execPath, [script], { cwd, stdio: ["pipe", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const closed = new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
  const inputError = new Promise((resolve) => child.stdin.once("error", resolve));
  child.stdout.destroy();
  const request = `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "epipe-probe", version: "1.0.0" } } })}\n`;
  try {
    if (!child.stdin.write(request)) await Promise.race([once(child.stdin, "drain"), inputError]);
    if (!child.stdin.destroyed) child.stdin.end();
  } catch (error) {
    if (error?.code !== "EPIPE" && error?.code !== "ERR_STREAM_DESTROYED") throw error;
  }
  const close = await deadline(closed, "EPIPE shutdown");
  assert.deepEqual(close, { code: 1, signal: null });
  assert.equal(stderr, "material MCP output closed\n");
  assert.doesNotMatch(stderr, /\/Users\/|repository_path|source body/i);
  return { exit_code: close.code, path_leakage: false };
}

function importGuardProbe(script, cwd) {
  const moduleUrl = new URL(`file://${script}`).href;
  const cases = [
    ["missing", "delete process.argv[1]"],
    ["nonexistent", 'process.argv[1] = "/definitely/nonexistent/material-mcp-entry.mjs"'],
  ];
  for (const [name, setup] of cases) {
    const child = spawnSync(process.execPath, ["--input-type=module", "--eval", `${setup}; await import(${JSON.stringify(moduleUrl)})`], {
      cwd, encoding: "utf8", timeout: 20_000,
    });
    assert.equal(child.status, 0, `${name} argv import must not throw: ${child.stderr}`);
    assert.equal(child.stderr, "");
  }
  return { missing_argv: true, nonexistent_argv: true };
}

const frameBoundaries = await frameBoundaryProbe();

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sg material mcp "));
const separateCwd = path.join(temporaryRoot, "client cwd with spaces");
fs.mkdirSync(separateCwd);
const materialScript = path.join(root, "scripts/sg-material-mcp.mjs");
const importGuard = importGuardProbe(materialScript, separateCwd);
const linkedScript = path.join(temporaryRoot, "linked material server with spaces.mjs");
fs.symlinkSync(materialScript, linkedScript);
const linked = await connection(linkedScript, separateCwd, "material-symlink-stdio-test");
await deadline(linked.client.close(), "material symlink shutdown");
assert.equal(linked.stderr(), "");
const material = await connection(materialScript, separateCwd, "material-stdio-test");
let v1;
try {
  assert.deepEqual(Object.keys(material.client.getServerCapabilities()).sort(), ["resources", "tools"]);
  const tools = (await deadline(material.client.listTools(), "list tools")).tools;
  assert.deepEqual(tools.map(({ name }) => name), ["material-context", "material-discover", "material-get", "material-search"]);
  assert.equal((await deadline(material.client.listResources(), "list resources")).resources.length, 133);
  assert.deepEqual((await deadline(material.client.listResourceTemplates(), "list templates")).resourceTemplates.map(({ uriTemplate }) => uriTemplate), ["sg://v2/material/{reference}"]);

  const calls = [
    ["material-discover", {}, ["discover"]],
    ["material-search", { query: "layout", limit: 3 }, ["search", "--query", "layout", "--limit", "3"]],
    ["material-search", { query: "layout", paths_only: true, limit: 3 }, ["search", "--query", "layout", "--paths-only", "--limit", "3"]],
    ["material-get", { reference: manifest.materials[0].stable_ref }, ["get", "--reference", manifest.materials[0].stable_ref]],
    ["material-context", { query: "layout", budget_tokens: 256 }, ["context", "--query", "layout", "--budget-tokens", "256"]],
  ];
  for (const [name, args, cli] of calls) {
    const response = await deadline(material.client.callTool({ name, arguments: args }), `call ${name}`);
    assert.deepEqual(envelope(response), executeMaterialCli(cli));
  }

  const selected = manifest.materials.filter(({ repository_path }) => ["layout/index.md", "motion/index.md", "design-engineering/index.md", "game-ui/index.md", "platform-guides/index.md"].includes(repository_path));
  selected.push(manifest.materials.find(({ domain, lifecycle }) => domain === "layout" && lifecycle === "generated"));
  for (const record of selected) {
    const response = await deadline(material.client.readResource({ uri: materialResourceUri(record.stable_ref) }), "read material");
    const payload = JSON.parse(response.contents[0].text);
    assert.deepEqual(payload, executeMaterialCli(["get", "--reference", record.stable_ref]));
    const bytes = Buffer.from(payload.result.bytes_base64, "base64");
    assert.equal(bytes.byteLength, record.byte_length);
    assert.equal(sha256(bytes), record.source_sha256);
  }

  await deadline(Promise.all(Array.from({ length: 8 }, () => material.client.callTool({ name: "material-discover", arguments: {} }))), "concurrent calls");
  for (const name of ["proposal.create", "material-write", "resolve"]) await rejected(() => material.client.callTool({ name, arguments: {} }), /unknown|not found|not exposed/i);
  await rejected(() => material.client.callTool({ name: "material-search", arguments: { query: "layout", repository_path: "../README.md" } }), /invalid|additional|unsupported/i);
  for (const uri of [
    "sg://v2/material/..%2FREADME.md",
    `sg://v2/material/${encodeURIComponent(encodeURIComponent(selected[0].stable_ref))}`,
    "sg://v2/material/%E0%A4%A",
    `sg://v2/material/${"x".repeat(257)}`,
    "sg://v2/material/sg%3amaterial%2fpath-sha256-002803d65d057faaa4e8c1bb3e32ef3f41032b011251fc9f0f7b1db907b01ceb",
    "file://v2/material/README.md",
    "sg://evil/material/x",
  ]) await rejected(() => material.client.readResource({ uri }), /invalid|canonical|encoded|not found|resource/i);

  const rawProtocol = await rawProtocolProbe(path.join(root, "scripts/sg-material-mcp.mjs"), separateCwd);
  const oversizedFrame = await oversizedFrameProbe(path.join(root, "scripts/sg-material-mcp.mjs"), separateCwd);
  const epipe = await epipeProbe(path.join(root, "scripts/sg-material-mcp.mjs"), separateCwd);

  v1 = await connection(path.join(root, "scripts/sg-mcp.mjs"), separateCwd, "v1-cross-server-test");
  const v1Tools = (await v1.client.listTools()).tools.map(({ name }) => name).sort();
  assert.deepEqual(v1Tools, ["claims", "context", "discover", "ops", "resolve", "retrieve"]);
  await rejected(() => v1.client.readResource({ uri: materialResourceUri(selected[0].stable_ref) }), /not found|resource/i);
  await rejected(() => material.client.readResource({ uri: "sg://self" }), /not found|resource/i);

  process.stdout.write(`${JSON.stringify({ ok: true, transport: "stdio", cwd_with_spaces: true, direct_run: { real_path: true, symlink_with_spaces: true }, import_guard: importGuard, tools: 4, resources: 133, domains: 6, generated: selected[5].stable_ref, source_hashes_verified: 6, concurrent_requests: 8, raw_protocol: rawProtocol, frame_boundaries: frameBoundaries, oversized_frame: oversizedFrame, epipe, v1_tools: v1Tools, stderr_empty: true }, null, 2)}\n`);
} finally {
  if (v1) {
    await deadline(v1.client.close(), "v1 shutdown");
    assert.equal(v1.stderr(), "");
  }
  await deadline(material.client.close(), "material shutdown");
  assert.equal(material.stderr(), "");
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
