#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { canonicalize } from "./agent-native/canonical-json.mjs";
import { createStyleGalleryMcpServer } from "./agent-native/mcp-adapter.mjs";
import { agentNativeRegistry } from "./agent-native/registry.mjs";

const MUTATIONS = [
  "effect.record",
  "effect.reconcile",
  "proposal.create",
  "proposal.decide",
  "proposal.promote",
  "proposal.verify",
  "run.start",
  "task.create",
];
const PROFILE_REF = "sg:profile/editorial-reference-profile";

function result(name, expected, actual, ok) {
  return { actual, expected, name, ok };
}

function equal(left, right) {
  return canonicalize(left) === canonicalize(right);
}

function envelope(response) {
  if (response?.structuredContent && typeof response.structuredContent === "object") return response.structuredContent;
  const text = response?.content?.find((item) => item?.type === "text")?.text;
  try { return JSON.parse(text); } catch { return null; }
}

async function connected(registry = agentNativeRegistry) {
  const server = createStyleGalleryMcpServer({ registry });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "stylegallery-registry-mcp-integrity", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

async function close(connection) {
  await connection.client.close().catch(() => {});
  const closed = connection.server.close?.();
  if (closed && typeof closed.catch === "function") await closed.catch(() => {});
}

async function rejected(action) {
  try {
    const response = await action();
    return { error: null, response };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), response: null };
  }
}

async function main() {
  const results = [];
  const names = agentNativeRegistry.operations.map((operation) => operation.name).sort();
  const missingMutations = MUTATIONS.filter((name) => !names.includes(name));
  results.push(result(
    "common_registry_contains_governed_mutations",
    "proposal, task, run, effect recording, and effect reconciliation operations exist in the common registry",
    { missingMutations, names },
    missingMutations.length === 0,
  ));

  const invalidMetadata = agentNativeRegistry.operations
    .filter((operation) => typeof operation.read_only !== "boolean"
      || (operation.read_only === true && operation.effect_class !== "NONE"))
    .map((operation) => ({ effect_class: operation.effect_class, name: operation.name, read_only: operation.read_only }));
  const registryReads = agentNativeRegistry.operations.filter((operation) => operation.read_only === true).map((operation) => operation.name).sort();
  results.push(result(
    "registry_read_only_metadata_is_closed",
    "every operation declares read_only and no effectful operation is read-only",
    { invalidMetadata, registryReads },
    invalidMetadata.length === 0 && registryReads.length > 0,
  ));

  for (const name of MUTATIONS.filter((item) => names.includes(item))) {
    const invoked = agentNativeRegistry.invoke(name, {});
    const codes = (invoked.failures ?? []).map((failure) => failure.code);
    results.push(result(
      `registered_handler_${name}`,
      "the registered mutation reaches its schema or handler instead of operation_unknown",
      invoked,
      invoked.operation === name && !codes.includes("operation_unknown"),
    ));
  }

  const connection = await connected();
  try {
    const tools = (await connection.client.listTools()).tools.map((tool) => tool.name).sort();
    results.push(result(
      "mcp_tools_derive_from_registry_read_only",
      registryReads,
      tools,
      equal(tools, registryReads),
    ));

    const mutationCalls = [];
    for (const name of MUTATIONS) {
      const observed = await rejected(() => connection.client.callTool({ name, arguments: {} }));
      const body = envelope(observed.response);
      mutationCalls.push({ error: observed.error, isError: observed.response?.isError, name, body });
    }
    results.push(result(
      "existing_mutations_are_not_mcp_tools",
      "every mutation that exists in the registry is absent from MCP and denied on direct call",
      mutationCalls,
      mutationCalls.every((call) => !tools.includes(call.name)
        && (call.error !== null || (call.isError === true && call.body?.failures?.[0]?.code === "operation_not_exposed"))),
    ));

    const templates = (await connection.client.listResourceTemplates()).resourceTemplates ?? [];
    const template = templates.find((item) => item.uriTemplate === "sg://object/{reference}");
    results.push(result(
      "object_resource_template_is_discoverable",
      "sg://object/{reference} is advertised",
      templates,
      Boolean(template),
    ));

    const objectUri = `sg://object/${encodeURIComponent(PROFILE_REF)}`;
    const resources = (await connection.client.listResources()).resources ?? [];
    const listed = resources.some((resource) => resource.uri === objectUri);
    const resource = await rejected(() => connection.client.readResource({ uri: objectUri }));
    const text = resource.response?.contents?.find((item) => item.uri === objectUri)?.text;
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { /* asserted below */ }
    const resolved = agentNativeRegistry.invoke("resolve", { reference: PROFILE_REF });
    results.push(result(
      "object_resource_uses_registry_resolver",
      "the listed encoded object URI returns the exact registry resolve payload",
      { error: resource.error, listed, parsed, resolved },
      listed && resource.error === null && resolved.ok === true && equal(parsed, resolved.result),
    ));

    const unknown = await rejected(() => connection.client.readResource({
      uri: `sg://object/${encodeURIComponent("sg:profile/does-not-exist")}`,
    }));
    const malformed = await rejected(() => connection.client.readResource({ uri: "sg://object/%E0%A4%A" }));
    const versionId = resolved.ok ? resolved.result.version_id : "";
    const versioned = await rejected(() => connection.client.readResource({
      uri: `sg://object/${encodeURIComponent(versionId)}`,
    }));
    results.push(result(
      "object_resource_accepts_only_encoded_stable_refs",
      "unknown, malformed, and VersionID object references are rejected",
      { malformed, unknown, versioned },
      unknown.error !== null && malformed.error !== null && versioned.error !== null,
    ));
  } finally {
    await close(connection);
  }

  const dynamicName = "diagnostics.snapshot";
  const dynamicOperation = Object.freeze({
    adapters: [], description: "Dynamically registered read projection.", effect_class: "NONE",
    idempotent: true, input_schema: { additionalProperties: false, type: "object" },
    name: dynamicName, output_schema: { type: "object" }, read_only: true,
    record_kind: "operation", stable_ref: "sg:operation/diagnostics-snapshot",
  });
  const dynamicRegistry = Object.freeze({
    ...agentNativeRegistry,
    invoke: (name, input = {}) => name === dynamicName
      ? Object.freeze({ ok: true, operation: name, result: Object.freeze({ input, source: "dynamic-registry" }) })
      : agentNativeRegistry.invoke(name, input),
    operations: Object.freeze([...agentNativeRegistry.operations, dynamicOperation]),
  });
  const dynamic = await connected(dynamicRegistry);
  try {
    const namesFromMcp = (await dynamic.client.listTools()).tools.map((tool) => tool.name);
    const called = await dynamic.client.callTool({ name: dynamicName, arguments: {} });
    results.push(result(
      "new_read_operation_needs_no_adapter_allowlist_change",
      "a new read_only registry operation is automatically listed and callable",
      { called: envelope(called), namesFromMcp },
      namesFromMcp.includes(dynamicName) && envelope(called)?.ok === true,
    ));
  } finally {
    await close(dynamic);
  }

  const contradictoryRegistry = {
    ...agentNativeRegistry,
    operations: [...agentNativeRegistry.operations, {
      ...dynamicOperation,
      effect_class: "EXTERNAL",
      name: "diagnostics.unsafe",
      stable_ref: "sg:operation/diagnostics-unsafe",
    }],
  };
  let contradiction;
  try { createStyleGalleryMcpServer({ registry: contradictoryRegistry }); } catch (error) {
    contradiction = error instanceof Error ? error.message : String(error);
  }
  results.push(result(
    "contradictory_read_only_effect_metadata_is_rejected",
    "read_only:true cannot disguise an EXTERNAL operation",
    { contradiction },
    typeof contradiction === "string" && contradiction.includes("cannot expose EXTERNAL effects as read-only"),
  ));

  const report = { ok: results.every((item) => item.ok), results };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.ok ? 0 : 1;
}

await main().catch((error) => {
  process.stdout.write(`${JSON.stringify({ ok: false, results: [result("registry_mcp_integrity_runtime", "structured report", error instanceof Error ? error.message : String(error), false)] }, null, 2)}\n`);
  process.exitCode = 1;
});
