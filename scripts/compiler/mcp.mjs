import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { createStyleGalleryMcpServer } from "../agent-native/mcp-adapter.mjs";
import { agentNativeRegistry } from "../agent-native/registry.mjs";
import { compilerOperations, compilerToolDefinitions } from "./operations.mjs";
import { withCompilerDiscovery } from "./cli.mjs";
import { executeCompiler, failure } from "./runtime.mjs";

// Compose at the transport boundary. The byte-frozen v1 server, registry,
// conformance receipts, and resources remain independently usable.
export function createSgMcpServer(config = {}) {
  const server = createStyleGalleryMcpServer();
  const lifetime = new AbortController();
  server.server.onclose = () => lifetime.abort();
  const legacy = agentNativeRegistry.operations.filter(({ read_only }) => read_only);
  const legacyByName = new Map(legacy.map((operation) => [operation.name, operation]));
  const legacyTools = legacy.map((operation) => {
    const inputSchema = structuredClone(operation.input_schema);
    if (Object.hasOwn(inputSchema.properties ?? {}, "reference")) {
      inputSchema.properties.stable_ref = structuredClone(inputSchema.properties.reference);
      inputSchema.required = (inputSchema.required ?? []).filter((key) => key !== "reference");
      inputSchema.anyOf = [{ required: ["reference"] }, { required: ["stable_ref"] }];
    }
    return {
      name: operation.name, description: operation.description, inputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    };
  });
  server.server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...legacyTools, ...compilerToolDefinitions()].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  }));
  const callSchema = CallToolRequestSchema.extend({
    params: CallToolRequestSchema.shape.params.extend({ arguments: z.unknown().optional() }),
  });
  server.server.setRequestHandler(callSchema, async (request, extra) => {
    const operation = request.params.name;
    let input = request.params.arguments ?? {};
    let report;
    if (Object.hasOwn(compilerOperations, operation) || operation === "workflow") {
      const signals = [lifetime.signal, extra.signal, config.signal].filter(Boolean);
      report = await executeCompiler(operation, input, { ...config, signal: AbortSignal.any(signals) });
    } else if (legacyByName.has(operation)) {
      if (input && typeof input === "object" && !Array.isArray(input) && Object.hasOwn(input, "stable_ref")) {
        input = { ...input, reference: input.reference ?? input.stable_ref };
        delete input.stable_ref;
      }
      report = withCompilerDiscovery(agentNativeRegistry.invoke(operation, input), config);
    } else report = failure(operation, "operation_not_exposed", `Operation ${operation} is not exposed.`);
    return { content: [{ type: "text", text: JSON.stringify(report) }], structuredContent: report, isError: report.ok !== true };
  });
  return server;
}
