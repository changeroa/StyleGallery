import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { canonicalize } from "./canonical-json.mjs";
import { parseStableRef } from "./identity.mjs";
import { agentNativeRegistry } from "./registry.mjs";

function operationInputSchema(operation) {
  const schema = structuredClone(operation.input_schema ?? { type: "object" });
  if (Object.hasOwn(schema.properties ?? {}, "reference")) {
    schema.properties.stable_ref = structuredClone(schema.properties.reference);
    schema.required = (schema.required ?? []).filter((name) => name !== "reference");
    schema.anyOf = [{ required: ["reference"] }, { required: ["stable_ref"] }];
  }
  return schema;
}

function normalizeInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  if (!Object.hasOwn(input, "stable_ref")) return input;
  const normalized = { ...input };
  if (!Object.hasOwn(normalized, "reference")) normalized.reference = normalized.stable_ref;
  delete normalized.stable_ref;
  return normalized;
}

function toolResponse(envelope) {
  return {
    content: [{ type: "text", text: canonicalize(envelope) }],
    isError: envelope.ok !== true,
    structuredContent: envelope,
  };
}

function deniedTool(operation) {
  return toolResponse({
    failures: [{
      code: "operation_not_exposed",
      message: `operation ${operation} is not exposed by the read-only MCP surface`,
      path: "operation",
    }],
    ok: false,
    operation,
  });
}

function toolDefinition(operation) {
  return {
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
      readOnlyHint: true,
    },
    description: operation.description,
    inputSchema: operationInputSchema(operation),
    name: operation.name,
  };
}

function resourceContents(uri, value) {
  return {
    contents: [{
      mimeType: "application/json",
      text: canonicalize(value),
      uri,
    }],
  };
}

function assertRegistry(registry) {
  if (!registry || typeof registry.invoke !== "function" || !Array.isArray(registry.operations)) {
    throw new TypeError("MCP registry must expose invoke and operations");
  }
  if (!registry.fixture?.manifest || !registry.selfDescription) {
    throw new TypeError("MCP registry must expose an immutable manifest and self-description");
  }
  for (const operation of registry.operations) {
    if (typeof operation.read_only !== "boolean") throw new TypeError(`${operation.name} must declare read_only`);
    if (operation.read_only && operation.effect_class !== "NONE") {
      throw new TypeError(`${operation.name} cannot expose ${operation.effect_class} effects as read-only`);
    }
  }
}

function objectUri(stableRef) {
  return `sg://object/${encodeURIComponent(stableRef)}`;
}

function objectReference(encoded) {
  if (typeof encoded !== "string" || encoded.length === 0) {
    throw new McpError(ErrorCode.InvalidParams, "object reference must be an encoded StableRef");
  }
  let decoded;
  try { decoded = decodeURIComponent(encoded); } catch {
    throw new McpError(ErrorCode.InvalidParams, "object reference contains invalid percent encoding");
  }
  try { return parseStableRef(decoded).stable_ref; } catch {
    throw new McpError(ErrorCode.InvalidParams, "object reference must decode to one governed StableRef");
  }
}

function resolveObject(registry, encoded) {
  const resolved = registry.invoke("resolve", { reference: objectReference(encoded) });
  if (resolved.ok) return resolved.result;
  const failure = resolved.failures?.[0] ?? { code: "object_not_found", message: "object could not be resolved" };
  throw new McpError(ErrorCode.InvalidParams, `${failure.code}: ${failure.message}`);
}

export function createStyleGalleryMcpServer({ registry = agentNativeRegistry } = {}) {
  assertRegistry(registry);
  const server = new McpServer({ name: "StyleGallery", version: "1.0.0" });
  const operations = registry.operations
    .filter((operation) => operation.read_only)
    .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  const operationByName = new Map(operations.map((operation) => [operation.name, operation]));

  server.registerResource(
    "stylegallery-self-description",
    "sg://self",
    {
      description: "Immutable StyleGallery self-description and conformance profile.",
      mimeType: "application/json",
    },
    async () => resourceContents("sg://self", registry.selfDescription),
  );
  server.registerResource(
    "stylegallery-manifest",
    "sg://manifest",
    {
      description: "Immutable manifest for the agent-native StyleGallery fixture.",
      mimeType: "application/json",
    },
    async () => resourceContents("sg://manifest", registry.fixture.manifest),
  );
  server.registerResource(
    "stylegallery-object",
    new ResourceTemplate("sg://object/{reference}", {
      list: async () => ({
        resources: registry.fixture.records.map((record) => ({
          description: `Immutable ${record.record_kind} record resolved from the common registry.`,
          mimeType: "application/json",
          name: record.stable_ref,
          uri: objectUri(record.stable_ref),
        })),
      }),
    }),
    {
      description: "Resolve one encoded StableRef through the immutable common registry.",
      mimeType: "application/json",
    },
    async (uri, variables) => resourceContents(uri.toString(), resolveObject(registry, variables.reference)),
  );

  server.server.registerCapabilities({ tools: { listChanged: false } });
  server.server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: operations.map(toolDefinition),
  }));
  server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const operation = operationByName.get(request.params.name);
    if (!operation) return deniedTool(request.params.name);
    const input = normalizeInput(request.params.arguments ?? {});
    return toolResponse(registry.invoke(operation.name, input));
  });
  return server;
}

export const createMcpServer = createStyleGalleryMcpServer;
