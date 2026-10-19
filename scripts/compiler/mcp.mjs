import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { createStyleGalleryMcpServer } from "../agent-native/mcp-adapter.mjs";
import { agentNativeRegistry } from "../agent-native/registry.mjs";
import { compilerOperations, compilerToolDefinitions } from "./operations.mjs";
import { withCompilerDiscovery } from "./cli.mjs";
import { executeCompiler, failure } from "./runtime.mjs";
import { materialRuntimeOptions } from "../agent-native/v2/material-cli-adapter.mjs";
import { invokeSearchOperation } from "../agent-native/v2/material-search-v3.mjs";

const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
export const searchToolDefinitions = Object.freeze([
  {
    name: "search",
    description: "Search the StyleGallery Markdown corpus (layout patterns, recipes, motion, design engineering, platform guides, terminology, expression). Hybrid ranking by default: BM25F fused with an English embedding model (downloaded once, then offline); falls back to BM25F alone when the model is unavailable, and the result's mode field says which ran. Returns light results: id, path, title, description, a verbatim snippet, and the next read command. When the question is not in English, also pass query_en with an English rewrite; Korean-only queries match only documents with Korean aliases.",
    inputSchema: {
      type: "object", additionalProperties: false, required: ["query"],
      properties: {
        query: { type: "string", description: "The question or keywords, in any language." },
        query_en: { type: "string", description: "English rewrite of query. Strongly recommended when query is not English." },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 5 },
        paths_only: { type: "boolean", description: "Return repository-relative paths only." },
        mode: { type: "string", enum: ["hybrid", "lexical"], default: "hybrid", description: "hybrid fuses BM25F with embedding similarity; lexical is BM25F only." },
        response_format: { type: "string", enum: ["concise", "detailed"], default: "concise", description: "detailed adds scores, hash identities, and ranking terms." },
      },
    },
    annotations: readOnly,
  },
  {
    name: "read",
    description: "Read one StyleGallery document by id (for example sg:layout/sticky-header), repository path, or StableRef. Use outline to list section slugs, then section to read only that part.",
    inputSchema: {
      type: "object", additionalProperties: false, required: ["reference"],
      properties: {
        reference: { type: "string" },
        outline: { type: "boolean" },
        section: { type: "string", description: "Heading slug from outline." },
      },
    },
    annotations: readOnly,
  },
]);

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
    tools: [...legacyTools, ...compilerToolDefinitions(), ...searchToolDefinitions].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  }));
  const callSchema = CallToolRequestSchema.extend({
    params: CallToolRequestSchema.shape.params.extend({ arguments: z.unknown().optional() }),
  });
  server.server.setRequestHandler(callSchema, async (request, extra) => {
    const operation = request.params.name;
    let input = request.params.arguments ?? {};
    let report;
    if (operation === "search" || operation === "read") {
      report = await invokeSearchOperation(operation, input, materialRuntimeOptions());
    } else if (Object.hasOwn(compilerOperations, operation) || operation === "workflow") {
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
