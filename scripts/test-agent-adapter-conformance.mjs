#!/usr/bin/env node

/**
 * Cross-surface conformance test.
 *
 * A CLI JSON-RPC-ish envelope and an MCP envelope are transport projections;
 * this harness removes only those envelopes and compares the canonical domain
 * payload (or the stable failure codes).  It therefore catches an adapter
 * that returns a plausible wrapper while silently changing domain semantics.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repositoryRoot, "scripts", "sg.mjs");
const profileRef = "sg:profile/editorial-reference-profile";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function equal(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function parseJson(text) {
  if (typeof text !== "string" || text.length === 0) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function codes(envelope) {
  return Array.isArray(envelope?.failures)
    ? envelope.failures.map((failure) => failure?.code).filter((code) => typeof code === "string").sort()
    : [];
}

function unwrap(value, operation) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.ok === "boolean") {
    if (value.ok === true) return { ok: true, operation: value.operation ?? operation, result: value.result ?? null };
    return { ok: false, operation: value.operation ?? operation, failures: codes(value) };
  }
  if (value.result && typeof value.result === "object" && typeof value.result.ok === "boolean") {
    return unwrap(value.result, operation);
  }
  return null;
}

function cliInvocation(args) {
  const child = spawnSync(process.execPath, [cliPath, ...args, "--format", "json"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  const parsed = parseJson(child.stdout);
  return {
    child,
    envelope: unwrap(parsed, args[0]),
    parsed,
  };
}

function mcpEnvelope(response, operation) {
  const structured = response?.structuredContent;
  const text = response?.content?.find((item) => item?.type === "text")?.text;
  const parsed = structured && typeof structured === "object" ? structured : parseJson(text);
  return unwrap(parsed, operation);
}

function result(name, expected, actual, ok) {
  return { actual, expected, name, ok };
}

function compare(name, cliRun, mcpRun) {
  const cliEnvelope = cliRun.envelope;
  const mcpEnvelopeValue = mcpRun.envelope;
  if (!cliEnvelope || !mcpEnvelopeValue) {
    return result(
      name,
      "both adapters produce a parseable {ok,operation,result|failures} envelope",
      {
        cli: { status: cliRun.child.status, stderr: cliRun.child.stderr, envelope: cliEnvelope, stdout: cliRun.child.stdout },
        mcp: { response: mcpRun.response, envelope: mcpEnvelopeValue },
      },
      false,
    );
  }
  if (cliEnvelope.ok !== mcpEnvelopeValue.ok) {
    return result(
      name,
      "CLI and MCP agree on success versus failure",
      { cli: cliEnvelope, mcp: mcpEnvelopeValue },
      false,
    );
  }
  if (cliEnvelope.ok === false) {
    const cliCodes = cliEnvelope.failures;
    const mcpCodes = mcpEnvelopeValue.failures;
    return result(
      name,
      "CLI and MCP expose identical stable error codes",
      { cliCodes, mcpCodes, cliStatus: cliRun.child.status, mcpResponse: mcpRun.response },
      cliRun.child.status !== 0 && cliRun.child.stderr.length === 0 && equal(cliCodes, mcpCodes),
    );
  }
  return result(
    name,
    "CLI and MCP expose identical operation and canonical domain result",
    { cli: cliEnvelope, mcp: mcpEnvelopeValue },
    cliRun.child.status === 0
      && cliRun.child.stderr.length === 0
      && cliEnvelope.operation === mcpEnvelopeValue.operation
      && equal(cliEnvelope.result, mcpEnvelopeValue.result),
  );
}

async function loadSdk(results) {
  try {
    const sdk = {
      ...(await import("@modelcontextprotocol/sdk/server/mcp.js")),
      ...(await import("@modelcontextprotocol/sdk/client/index.js")),
      ...(await import("@modelcontextprotocol/sdk/inMemory.js")),
    };
    const available = typeof sdk.McpServer === "function"
      && typeof sdk.Client === "function"
      && typeof sdk.InMemoryTransport?.createLinkedPair === "function";
    results.push(result(
      "conformance_sdk_available",
      "official stable MCP SDK is available",
      { available },
      available,
    ));
    return available ? sdk : null;
  } catch (error) {
    results.push(result(
      "conformance_sdk_available",
      "official stable MCP SDK is available",
      { code: "mcp_sdk_unavailable", error: error instanceof Error ? error.message : String(error) },
      false,
    ));
    return null;
  }
}

async function loadAdapter(results) {
  try {
    const adapter = await import("./agent-native/mcp-adapter.mjs");
    const factory = adapter.createStyleGalleryMcpServer ?? adapter.createMcpServer;
    results.push(result(
      "conformance_adapter_available",
      "mcp-adapter exports createStyleGalleryMcpServer",
      { exports: Object.keys(adapter).sort() },
      typeof factory === "function",
    ));
    return factory;
  } catch (error) {
    results.push(result(
      "conformance_adapter_available",
      "mcp-adapter exports createStyleGalleryMcpServer",
      { code: "mcp_adapter_unavailable", error: error instanceof Error ? error.message : String(error) },
      false,
    ));
    return null;
  }
}

async function main() {
  const results = [];
  const sdk = await loadSdk(results);
  const createServer = await loadAdapter(results);
  if (!sdk || !createServer) {
    const report = { ok: false, results };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const server = await createServer();
  const [clientTransport, serverTransport] = sdk.InMemoryTransport.createLinkedPair();
  const client = new sdk.Client({ name: "stylegallery-adapter-conformance", version: "1.0.0" });
  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const cases = [
      { name: "discover", cli: ["discover"], mcp: { name: "discover", arguments: {} } },
      { name: "ops", cli: ["ops"], mcp: { name: "ops", arguments: {} } },
      { name: "resolve", cli: ["resolve", profileRef], mcp: { name: "resolve", arguments: { stable_ref: profileRef } } },
      { name: "claims", cli: ["claims", profileRef], mcp: { name: "claims", arguments: { stable_ref: profileRef } } },
      { name: "context", cli: ["context", profileRef], mcp: { name: "context", arguments: { stable_ref: profileRef } } },
      { name: "resolve_malformed", cli: ["resolve", "not-a-stable-ref"], mcp: { name: "resolve", arguments: { stable_ref: "not-a-stable-ref" } } },
    ];
    for (const testCase of cases) {
      const cliRun = cliInvocation(testCase.cli);
      let response;
      let mcpError = null;
      try {
        response = await client.callTool(testCase.mcp);
      } catch (error) {
        mcpError = error;
      }
      const mcpRun = {
        envelope: mcpError ? null : mcpEnvelope(response, testCase.name.split("_")[0]),
        response: mcpError ? { error: mcpError instanceof Error ? mcpError.message : String(mcpError) } : response,
      };
      if (mcpError && cliRun.envelope?.ok === false) {
        results.push(result(
          `adapter_equivalence_${testCase.name}`,
          "both adapters preserve the same stable failure code",
          { cli: cliRun.envelope, mcpError: mcpRun.response },
          false,
        ));
      } else {
        results.push(compare(`adapter_equivalence_${testCase.name}`, cliRun, mcpRun));
      }
    }
  } catch (error) {
    results.push(result(
      "adapter_conformance_round_trip",
      "CLI and MCP conformance fixture executes over an initialized in-memory transport",
      { code: "conformance_round_trip_failed", error: error instanceof Error ? error.message : String(error) },
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
      "conformance_harness_runtime",
      "harness emits structured JSON instead of crashing",
      { code: "conformance_harness_runtime", error: error instanceof Error ? error.message : String(error) },
      false,
    )],
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = 1;
});
