#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const sentinels = [
  ".omo/evidence/private-key.txt",
  "layout/.omo/evidence/private-key.txt",
  ".env",
  ".env.production",
  "tmp/session-secret.json",
  "credentials.pem",
  "private.key",
  "server.crt",
  "access-token.txt",
  "layout/future-secret-token.md",
  "patterns/unapproved-future.md",
  "scripts/agent-native/unapproved-runtime.mjs",
  "consumer-reference/agent-native/schema/private-key.pem",
  "consumer-reference/fixtures/unapproved-package-fixture.json",
  "scripts/unapproved-package-test.mjs",
  "scripts/sg-mcp-shadow.mjs",
];
const mandatory = ["README.md", "package.json"];

function relativeImports(source) {
  const imports = [];
  for (const match of source.matchAll(/(?:from\s+|import\s*\()?["'](\.[^"']+)["']/g)) imports.push(match[1]);
  return imports;
}

function runtimeClosure(root, manifest) {
  const seen = new Set();
  const declaredScripts = Object.entries(manifest.scripts)
    .filter(([name]) => name === "sg" || name.startsWith("sg:"))
    .map(([, command]) => /^node (scripts\/[^ ]+\.mjs)$/.exec(command)?.[1])
    .filter(Boolean);
  const pending = [...new Set([
    ...Object.values(manifest.bin),
    ...declaredScripts,
    "scripts/agent-native/a2a-projection.mjs",
    "scripts/agent-native/agui-projection.mjs",
    "scripts/agent-native/v2/experimental-extension-registry.mjs",
  ])];
  while (pending.length > 0) {
    const relative = pending.shift();
    if (seen.has(relative)) continue;
    seen.add(relative);
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    for (const specifier of relativeImports(source)) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(relative), specifier));
      if (target.endsWith(".mjs") && fs.existsSync(path.join(root, target))) pending.push(target);
    }
  }
  return [...seen];
}

async function bounded(promise, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out`)), 30000); timer.unref(); }),
  ]).finally(() => clearTimeout(timer));
}

function copyPackage(source, destination) {
  fs.cpSync(source, destination, {
    recursive: true,
    filter(candidate) {
      const relative = path.relative(source, candidate);
      if (relative === "") return true;
      const first = relative.split(path.sep)[0];
      return !new Set([".git", "node_modules", "test-results", "playwright-report", "blob-report"]).has(first);
    },
  });
}

const packageJson = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "consumer-reference/agent-native/v2/material-registry.json"), "utf8"));
const files = packageJson.files;
assert.ok(Array.isArray(files), "package.json files must be an explicit array");
assert.ok(files.length > 0, "package.json files must not be empty");
assert.equal(new Set(files).size, files.length, "package files must be unique");
assert.deepEqual(files, [...files].sort(), "package files must be bytewise sorted");
for (const entry of files) {
  assert.equal(typeof entry, "string");
  assert.ok(!/[?*{}[\]]/.test(entry), `package entry must be exact: ${entry}`);
  assert.ok(!entry.endsWith("/"), `package entry must name a file: ${entry}`);
  assert.ok(fs.statSync(path.join(repositoryRoot, entry)).isFile(), `package entry must exist: ${entry}`);
}

const schemas = fs.readdirSync(path.join(repositoryRoot, "consumer-reference/agent-native/schema"))
  .filter((name) => name.endsWith(".json")).map((name) => `consumer-reference/agent-native/schema/${name}`);
const v2Schemas = fs.readdirSync(path.join(repositoryRoot, "consumer-reference/agent-native/v2/schema"))
  .filter((name) => name.endsWith(".json")).map((name) => `consumer-reference/agent-native/v2/schema/${name}`);
const v1Registry = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "consumer-reference/agent-native/registry.json"), "utf8"));
const required = new Set([
  ...runtimeClosure(repositoryRoot, packageJson),
  ...schemas,
  ...v2Schemas,
  ...manifest.materials.map(({ repository_path }) => repository_path),
  ...v1Registry.records.map(({ repository_path }) => repository_path).filter(Boolean),
  "consumer-reference/agent-native/README.md",
  "design-engineering/reference-profiles/governed-local/index.md",
  "design-engineering/reference-profiles/index.md",
  "consumer-reference/agent-native/registry.json",
  "consumer-reference/agent-native/v2/admission-policy.json",
  "consumer-reference/agent-native/v2/material-registry.json",
]);
assert.deepEqual(files, [...required].sort(), "package files must equal the closed runtime/schema/material inventory");

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sg-material-package-"));
const packageCopy = path.join(temporaryRoot, "package copy with spaces");
const packOutput = path.join(temporaryRoot, "packed output");
try {
  copyPackage(repositoryRoot, packageCopy);
  fs.mkdirSync(packOutput, { recursive: true });
  for (const sentinel of sentinels) {
    const target = path.join(packageCopy, ...sentinel.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `must-not-publish:${sentinel}\n`);
  }
  const packed = spawnSync("npm", ["pack", "--json", "--pack-destination", packOutput], {
    cwd: packageCopy,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(packed.status, 0, packed.stderr || packed.stdout);
  assert.equal(packed.stderr, "");
  const description = JSON.parse(packed.stdout)[0];
  const inventory = description.files.map(({ path: entry }) => entry);
  const expected = [...new Set([...files, ...mandatory])].sort();
  assert.deepEqual(inventory, expected, "packed inventory must equal allow-list plus npm mandatory metadata");
  assert.deepEqual(inventory.filter((entry) => sentinels.includes(entry)), [], "sentinels must not be packed");
  assert.deepEqual(manifest.materials.map(({ repository_path }) => repository_path).filter((entry) => !inventory.includes(entry)), []);
  const modes = new Map(description.files.map((entry) => [entry.path, entry.mode]));
  assert.equal(modes.get("scripts/sg.mjs"), 0o755);
  assert.equal(modes.get("scripts/sg-material.mjs"), 0o755);
  assert.equal(modes.get("scripts/sg-material-mcp.mjs"), 0o755);
  assert.equal(modes.get("scripts/sg-mcp.mjs"), 0o755);

  const installedProject = path.join(temporaryRoot, "installed project with spaces");
  const externalCwd = path.join(temporaryRoot, "external cwd with spaces");
  fs.mkdirSync(installedProject);
  fs.mkdirSync(externalCwd);
  fs.writeFileSync(path.join(installedProject, "package.json"), '{"name":"installed-regression","private":true,"type":"module"}\n');
  const install = spawnSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", path.join(packOutput, description.filename)], {
    cwd: installedProject, encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(install.status, 0, install.stderr || install.stdout);
  const installedRoot = path.join(installedProject, "node_modules", packageJson.name);
  const serverPath = path.join(installedRoot, "scripts", "sg-mcp.mjs");
  assert.ok(fs.statSync(serverPath).isFile(), "installed v1 MCP entrypoint must exist");
  const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: externalCwd, stderr: "pipe" });
  const stderr = [];
  transport.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
  const client = new Client({ name: "installed-v1-package-regression", version: "1.0.0" });
  try {
    await bounded(client.connect(transport), "installed v1 MCP initialize");
    assert.deepEqual((await bounded(client.listTools(), "installed v1 MCP tools")).tools.map(({ name }) => name), ["claims", "context", "discover", "ops", "resolve", "retrieve"]);
    assert.equal((await bounded(client.listResources(), "installed v1 MCP resources")).resources.length, 31);
    assert.deepEqual((await bounded(client.listResourceTemplates(), "installed v1 MCP templates")).resourceTemplates.map(({ uriTemplate }) => uriTemplate), ["sg://object/{reference}"]);
  } finally {
    await bounded(client.close(), "installed v1 MCP shutdown");
  }
  assert.equal(Buffer.concat(stderr).toString("utf8"), "");

  const materialServerPath = path.join(installedRoot, "scripts", "sg-material-mcp.mjs");
  assert.ok(fs.statSync(materialServerPath).isFile(), "installed material MCP entrypoint must exist");
  const materialTransport = new StdioClientTransport({ command: process.execPath, args: [materialServerPath], cwd: externalCwd, stderr: "pipe" });
  const materialStderr = [];
  materialTransport.stderr.on("data", (chunk) => materialStderr.push(Buffer.from(chunk)));
  const materialClient = new Client({ name: "installed-material-package-regression", version: "1.0.0" });
  try {
    await bounded(materialClient.connect(materialTransport), "installed material MCP initialize");
    assert.deepEqual((await bounded(materialClient.listTools(), "installed material MCP tools")).tools.map(({ name }) => name), ["material-context", "material-discover", "material-get", "material-search"]);
    assert.equal((await bounded(materialClient.listResources(), "installed material MCP resources")).resources.length, 144);
    assert.deepEqual((await bounded(materialClient.listResourceTemplates(), "installed material MCP templates")).resourceTemplates.map(({ uriTemplate }) => uriTemplate), ["sg://v2/material/{reference}"]);
  } finally {
    await bounded(materialClient.close(), "installed material MCP shutdown");
  }
  assert.equal(Buffer.concat(materialStderr).toString("utf8"), "");

  process.stdout.write(`${JSON.stringify({
    ok: true,
    allow_list_count: files.length,
    mandatory_count: mandatory.length,
    packed_count: inventory.length,
    material_count: manifest.materials.length,
    runtime_count: runtimeClosure(repositoryRoot, packageJson).length,
    sentinel_count: sentinels.length,
    sentinels_excluded: true,
    exact_inventory: true,
    bins_executable: true,
    declared_runtime_roots_derived: true,
    installed_v1_mcp_official_sdk: true,
    installed_material_mcp_official_sdk: true,
    installed_external_spaced_cwd: true,
  }, null, 2)}\n`);
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
