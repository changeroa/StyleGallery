#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { executeMaterialCli } from "./material-cli-adapter.mjs";
import { createMaterialMcpServer, materialResourceUri, normalizeMaterialMcpInput } from "./material-mcp-adapter.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "consumer-reference/agent-native/v2/material-registry.json"), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
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

let accessorInvocations = 0;
const accessorInput = {};
Object.defineProperty(accessorInput, "query", { enumerable: true, get() { accessorInvocations += 1; return "layout"; } });
assert.throws(() => normalizeMaterialMcpInput(accessorInput), /own plain data/);
assert.equal(accessorInvocations, 0);
const symbolInput = { query: "layout" };
symbolInput[Symbol("forbidden")] = "value";
assert.throws(() => normalizeMaterialMcpInput(symbolInput), /own plain data/);
assert.throws(() => normalizeMaterialMcpInput(Object.assign(Object.create({ inherited: true }), { query: "layout" })), /own plain data/);
const hiddenInput = { query: "layout" };
Object.defineProperty(hiddenInput, "hidden", { value: true });
assert.throws(() => normalizeMaterialMcpInput(hiddenInput), /own plain data/);
const nullPrototypeInput = Object.assign(Object.create(null), { query: "layout" });
assert.deepEqual(normalizeMaterialMcpInput(nullPrototypeInput), { query: "layout" });

const server = createMaterialMcpServer();
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const client = new Client({ name: "material-mcp-in-memory-test", version: "1.0.0" });
try {
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const capabilities = client.getServerCapabilities();
  assert.deepEqual(Object.keys(capabilities).sort(), ["resources", "tools"]);

  const tools = (await client.listTools()).tools;
  assert.deepEqual(tools.map(({ name }) => name), ["material-context", "material-discover", "material-get", "material-search"]);
  for (const tool of tools) {
    assert.deepEqual(tool.annotations, { destructiveHint: false, idempotentHint: true, openWorldHint: false, readOnlyHint: true });
    assert.equal(tool._meta.effect_class, "NONE");
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.equal(tool.outputSchema.type, "object");
  }

  let mcpAccessorInvocations = 0;
  const mcpAccessorInput = {};
  Object.defineProperty(mcpAccessorInput, "query", { enumerable: true, get() { mcpAccessorInvocations += 1; return "layout"; } });
  await rejected(() => client.callTool({ name: "material-search", arguments: mcpAccessorInput }), /own plain data/i);
  assert.equal(mcpAccessorInvocations, 0);
  const mcpSymbolInput = { query: "layout" };
  mcpSymbolInput[Symbol("forbidden")] = "value";
  await rejected(() => client.callTool({ name: "material-search", arguments: mcpSymbolInput }), /own plain data/i);
  await rejected(() => client.callTool({ name: "material-search", arguments: Object.assign(Object.create({ inherited: true }), { query: "layout" }) }), /own plain data/i);
  const mcpHiddenInput = { query: "layout" };
  Object.defineProperty(mcpHiddenInput, "hidden", { value: true });
  await rejected(() => client.callTool({ name: "material-search", arguments: mcpHiddenInput }), /own plain data/i);

  const proxyToolInputs = [
    ["material-discover", {}],
    ["material-search", { query: "layout" }],
    ["material-get", { reference: manifest.materials[0].stable_ref }],
    ["material-context", { query: "layout", budget_tokens: 256 }],
  ];
  let proxyTrapInvocations = 0;
  const trappingHandler = new Proxy({}, {
    get(_target, trap) {
      return (...parameters) => {
        proxyTrapInvocations += 1;
        return Reflect[trap](...parameters);
      };
    },
  });
  for (const [name, input] of proxyToolInputs) {
    await rejected(() => client.callTool({ name, arguments: new Proxy(input, {}) }), /own plain data/i);
    await rejected(() => client.callTool({ name, arguments: new Proxy(input, trappingHandler) }), /own plain data/i);
  }
  const revocable = Proxy.revocable({ query: "layout" }, trappingHandler);
  await rejected(() => client.callTool({ name: "material-search", arguments: revocable.proxy }), /own plain data/i);
  revocable.revoke();
  await rejected(() => client.callTool({ name: "material-search", arguments: revocable.proxy }), /own plain data/i);
  await rejected(() => client.callTool({ name: "material-search", arguments: new Proxy(Object.assign(Object.create(null), { query: "layout" }), trappingHandler) }), /own plain data/i);
  await rejected(() => client.callTool({ name: "material-search", arguments: { query: new Proxy({ value: "layout" }, trappingHandler) } }), /own plain data/i);
  const proxyGetterInput = new Proxy(accessorInput, trappingHandler);
  await rejected(() => client.callTool({ name: "material-search", arguments: proxyGetterInput }), /own plain data/i);
  assert.equal(proxyTrapInvocations, 0);
  assert.equal(accessorInvocations, 0);

  const nullPrototypeResponse = await client.callTool({ name: "material-search", arguments: Object.assign(Object.create(null), { query: "layout", limit: 1 }) });
  assert.equal(nullPrototypeResponse.structuredContent?.ok, true);

  const resources = (await client.listResources()).resources;
  assert.equal(resources.length, 112);
  assert.deepEqual((await client.listResourceTemplates()).resourceTemplates.map(({ uriTemplate }) => uriTemplate), ["sg://v2/material/{reference}"]);
  assert.ok(resources.every(({ uri }) => uri === materialResourceUri(resources.find((entry) => entry.uri === uri).name)));

  const calls = [
    ["material-discover", {}, ["discover"]],
    ["material-search", { query: "layout", limit: 2 }, ["search", "--query", "layout", "--limit", "2"]],
    ["material-get", { reference: manifest.materials[0].stable_ref }, ["get", "--reference", manifest.materials[0].stable_ref]],
    ["material-context", { query: "layout", budget_tokens: 256 }, ["context", "--query", "layout", "--budget-tokens", "256"]],
  ];
  for (const [name, args, cliArgs] of calls) {
    const response = await client.callTool({ name, arguments: args });
    assert.equal(response.isError, undefined);
    assert.deepEqual(envelope(response), executeMaterialCli(cliArgs));
  }

  const domainRecords = manifest.materials.filter(({ repository_path }) => ["layout/index.md", "motion/index.md", "design-engineering/index.md", "game-ui/index.md", "platform-guides/index.md"].includes(repository_path));
  const generated = manifest.materials.find(({ domain, lifecycle }) => domain === "layout" && lifecycle === "generated");
  assert.equal(domainRecords.length, 5);
  for (const record of [...domainRecords, generated]) {
    const response = await client.readResource({ uri: materialResourceUri(record.stable_ref) });
    const payload = JSON.parse(response.contents[0].text);
    assert.deepEqual(payload, executeMaterialCli(["get", "--reference", record.stable_ref]));
    const bytes = Buffer.from(payload.result.bytes_base64, "base64");
    assert.equal(sha256(bytes), record.source_sha256);
    assert.equal(bytes.byteLength, record.byte_length);
  }

  await Promise.all(Array.from({ length: 8 }, (_, index) => client.callTool({ name: "material-search", arguments: { query: "layout", limit: (index % 3) + 1 } })));
  const repeated = await Promise.all(Array.from({ length: 4 }, () => client.readResource({ uri: materialResourceUri(generated.stable_ref) })));
  assert.ok(repeated.every((item) => item.contents[0].text === repeated[0].contents[0].text));

  for (const name of ["proposal.create", "material-delete", "discover"]) {
    await rejected(() => client.callTool({ name, arguments: {} }), /unknown|not exposed|not found/i);
  }
  for (const forbidden of ["path", "repository_path", "head", "manifest", "adapter", "trust", "proposal", "write"]) {
    await rejected(() => client.callTool({ name: "material-search", arguments: { query: "layout", [forbidden]: "forbidden" } }), /invalid|additional|unsupported/i);
  }
  await rejected(() => client.callTool({ name: "material-get", arguments: { reference: "../README.md" } }), /invalid|StableRef/i);

  const encoded = encodeURIComponent(generated.stable_ref);
  const badUris = [
    "sg://v2/material/..%2FREADME.md",
    `sg://v2/%2e%2e/material/${encoded}`,
    `sg://v2/material/%2E%2E%2F${encoded}`,
    `sg://v2/material/${encodeURIComponent(encoded)}`,
    `sg://v2/material/${encoded.replaceAll("%", "%25")}`,
    `sg://v2/material/${encoded.toLowerCase()}`,
    `sg://v2/material/${"a".repeat(257)}`,
    "sg://v2/material/%E0%A4%A",
    "sg://v2/material/sg:material/path-sha256-002803d65d057faaa4e8c1bb3e32ef3f41032b011251fc9f0f7b1db907b01ceb",
    "file://v2/material/README.md",
    "sg://other/material/x",
    "sg://v2/other/x",
  ];
  for (const uri of badUris) await rejected(() => client.readResource({ uri }), /invalid|canonical|encoded|not found|scheme|resource/i);

  process.stdout.write(`${JSON.stringify({ ok: true, transport: "in-memory", tools: tools.length, resources: resources.length, domains: domainRecords.length, generated: generated.stable_ref, concurrent_requests: 12, unsafe_input_cases: 8, proxy_input_cases: 14, forbidden_input_cases: 8, accessor_getter_invocations: mcpAccessorInvocations, proxy_trap_invocations: proxyTrapInvocations, null_prototype_json: true, negative_cases: badUris.length + 35 }, null, 2)}\n`);
} finally {
  await client.close();
  await server.close();
}
