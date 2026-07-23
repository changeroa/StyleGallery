#!/usr/bin/env node

/**
 * MCP adapter contract harness.
 *
 * This is deliberately an in-memory test: it exercises the official stable
 * MCP SDK's initialize/list/read/call path without making stdio, network, or
 * filesystem state part of the proof.  The StyleGallery adapter remains the
 * only domain implementation under test.
 */

function parseTextContent(response) {
  const text = response?.content?.find((item) => item?.type === "text")?.text;
  if (typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function responseEnvelope(response) {
  if (response?.structuredContent && typeof response.structuredContent === "object") {
    return response.structuredContent;
  }
  return parseTextContent(response);
}

function result(name, expected, actual, ok) {
  return { actual, expected, name, ok };
}

function denialObserved(error, response) {
  if (error) {
    const code = error?.code ?? error?.data?.code;
    const message = String(error?.message ?? error);
    return {
      code,
      message,
      observed: ["-32601", "-32602", "method_not_found", "operation_not_exposed", "read_only_denied"]
        .some((item) => String(code) === item || message.toLowerCase().includes(item.replaceAll("_", " ")))
        || /unknown|not found|not exposed|read.?only|proposal/i.test(message),
    };
  }
  const envelope = responseEnvelope(response);
  const codes = Array.isArray(envelope?.failures)
    ? envelope.failures.map((item) => item?.code).filter((item) => typeof item === "string")
    : [];
  const message = typeof envelope === "string"
    ? envelope
    : String(response?.content?.find((item) => item?.type === "text")?.text ?? "");
  const protocolCode = message.match(/-326\d+/)?.[0] ?? null;
  const codeDenied = codes.some((code) => /denied|not.?exposed|not.?found|read.?only|unknown/i.test(code));
  const messageDenied = /unknown|not found|not exposed|read.?only|proposal|(-32601)|(-32602)/i.test(message);
  return {
    code: codes[0] ?? protocolCode,
    message,
    isError: response?.isError === true,
    observed: response?.isError === true && (codeDenied || messageDenied),
  };
}

async function importDependencies(results) {
  let sdk;
  try {
    sdk = {
      ...(await import("@modelcontextprotocol/sdk/server/mcp.js")),
      ...(await import("@modelcontextprotocol/sdk/client/index.js")),
      ...(await import("@modelcontextprotocol/sdk/inMemory.js")),
    };
  } catch (error) {
    results.push(result(
      "stable_sdk_available",
      "official @modelcontextprotocol/sdk v1 can be imported",
      { code: "mcp_sdk_unavailable", error: error instanceof Error ? error.message : String(error) },
      false,
    ));
    return null;
  }
  results.push(result(
    "stable_sdk_available",
    "official McpServer, Client, and InMemoryTransport exports are available",
    { exports: ["McpServer", "Client", "InMemoryTransport"].filter((name) => typeof sdk[name] === "function") },
    typeof sdk.McpServer === "function" && typeof sdk.Client === "function" && typeof sdk.InMemoryTransport?.createLinkedPair === "function",
  ));
  if (typeof sdk.McpServer !== "function" || typeof sdk.Client !== "function" || typeof sdk.InMemoryTransport?.createLinkedPair !== "function") return null;
  return sdk;
}

async function importAdapter(results) {
  try {
    const adapter = await import("./agent-native/mcp-adapter.mjs");
    const factory = adapter.createStyleGalleryMcpServer ?? adapter.createMcpServer;
    results.push(result(
      "adapter_factory_available",
      "mcp-adapter exports createStyleGalleryMcpServer",
      { exports: Object.keys(adapter).sort() },
      typeof factory === "function",
    ));
    return factory;
  } catch (error) {
    results.push(result(
      "adapter_factory_available",
      "mcp-adapter exports createStyleGalleryMcpServer",
      { code: "mcp_adapter_unavailable", error: error instanceof Error ? error.message : String(error) },
      false,
    ));
    return null;
  }
}

async function main() {
  const results = [];
  const sdk = await importDependencies(results);
  const createServer = await importAdapter(results);
  if (!sdk || !createServer) {
    const report = { ok: false, results };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const server = await createServer();
  const [clientTransport, serverTransport] = sdk.InMemoryTransport.createLinkedPair();
  const client = new sdk.Client({ name: "stylegallery-mcp-conformance", version: "1.0.0" });
  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const capabilities = client.getServerCapabilities?.() ?? {};
    results.push(result(
      "initialize_capability_negotiation",
      "initialized client/server expose resources and tools",
      { capabilities },
      Boolean(capabilities && typeof capabilities === "object"
        && capabilities.resources && capabilities.tools),
    ));

    const listedTools = await client.listTools();
    const toolNames = (listedTools?.tools ?? []).map((item) => item?.name).filter((item) => typeof item === "string").sort();
    const expectedTools = ["claims", "context", "discover", "ops", "resolve", "retrieve"];
    results.push(result(
      "read_only_tool_allowlist",
      "exactly the six public read operations are advertised",
      { toolNames, expectedTools },
      expectedTools.every((name) => toolNames.includes(name))
        && toolNames.length === expectedTools.length
        && !toolNames.some((name) => /proposal|promote|decide|reconcile|write|delete|execute/i.test(name)),
    ));

    const listedResources = await client.listResources();
    const resourceUris = (listedResources?.resources ?? []).map((item) => item?.uri).filter((item) => typeof item === "string").sort();
    const expectedResources = ["sg://manifest", "sg://self"];
    results.push(result(
      "read_only_resource_catalog",
      "sg://self and sg://manifest are advertised as immutable resources",
      { resourceUris, expectedResources },
      expectedResources.every((uri) => resourceUris.includes(uri)),
    ));

    for (const uri of expectedResources) {
      let response;
      try {
        response = await client.readResource({ uri });
        const contents = response?.contents ?? [];
        const text = contents.find((item) => item?.uri === uri)?.text;
        let parsed = null;
        try { parsed = JSON.parse(text); } catch { /* structured resource text is checked below */ }
        results.push(result(
          `read_resource_${uri.slice("sg://".length)}`,
          "one JSON resource content with the requested immutable URI",
          { contents: contents.length, parsedType: parsed === null ? typeof text : typeof parsed, response },
          contents.length > 0 && typeof text === "string" && text.length > 0 && parsed !== null && typeof parsed === "object",
        ));
      } catch (error) {
        results.push(result(
          `read_resource_${uri.slice("sg://".length)}`,
          "resource/read succeeds over the official SDK",
          { code: "resource_read_failed", error: error instanceof Error ? error.message : String(error) },
          false,
        ));
      }
    }

    for (const name of ["discover", "ops"]) {
      try {
        const response = await client.callTool({ name, arguments: {} });
        const envelope = responseEnvelope(response);
        results.push(result(
          `call_read_tool_${name}`,
          "tools/call returns a successful structured domain envelope",
          { response, envelope },
          response?.isError !== true && envelope?.ok === true && envelope?.operation === name && envelope?.result && typeof envelope.result === "object",
        ));
      } catch (error) {
        results.push(result(
          `call_read_tool_${name}`,
          "tools/call returns a successful structured domain envelope",
          { code: "tool_call_failed", error: error instanceof Error ? error.message : String(error) },
          false,
        ));
      }
    }

    let denial;
    try {
      const response = await client.callTool({ name: "proposal.create", arguments: {} });
      denial = denialObserved(null, response);
    } catch (error) {
      denial = denialObserved(error, null);
    }
    results.push(result(
      "mutating_tool_denied",
      "a mutating operation is not exposed and is denied by the read-only MCP surface",
      denial,
      denial.observed === true,
    ));
  } catch (error) {
    results.push(result(
      "sdk_round_trip",
      "MCP initialize/list/read/call completes without transport failure",
      { code: "mcp_round_trip_failed", error: error instanceof Error ? error.message : String(error) },
      false,
    ));
  } finally {
    await client.close().catch(() => {});
    const closed = server.close?.();
    if (closed && typeof closed.catch === "function") await closed.catch(() => {});
  }

  const report = { ok: results.every((item) => item.ok), results };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.ok ? 0 : 1;
}

await main().catch((error) => {
  const report = {
    ok: false,
    results: [result(
      "mcp_harness_runtime",
      "harness emits structured JSON instead of crashing",
      { code: "mcp_harness_runtime", error: error instanceof Error ? error.message : String(error) },
      false,
    )],
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = 1;
});
