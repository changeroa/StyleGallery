import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { types as utilTypes } from "node:util";

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolRequestSchema, ErrorCode, McpError, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { canonicalize } from "../canonical-json.mjs";
import { parseMaterialStableRef } from "./material-identity.mjs";
import { createMaterialOperationRegistry, materialOperationSpecs } from "./material-operation-registry.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const manifestPath = path.join(repositoryRoot, "consumer-reference", "agent-native", "v2", "material-registry.json");
const exposedNames = new Set(["material-context", "material-discover", "material-get", "material-search"]);
const descriptions = Object.freeze({
  "material-context": "Build a deterministic, provenance-bound material context within a token budget.",
  "material-discover": "Discover the six governed StyleGallery domain entries.",
  "material-get": "Read bounded UTF-8 bytes for one canonical v2 material StableRef.",
  "material-search": "Search admitted material deterministically, optionally returning only repository-relative paths.",
});
const inputSchemas = Object.freeze({
  "material-context": z.strictObject({ query: z.string(), budget_tokens: z.number().int().min(256).max(32768).default(8192) }),
  "material-discover": z.strictObject({}),
  "material-get": z.strictObject({ reference: z.string(), offset: z.number().int().min(0).optional(), length: z.number().int().min(1).max(65536).optional() }),
  "material-search": z.strictObject({ query: z.string(), limit: z.number().int().min(1).max(100).optional(), paths_only: z.boolean().optional() }),
});
const outputSchema = z.strictObject({
  ok: z.boolean(),
  operation: z.string().nullable(),
  result: z.looseObject({}).optional(),
  failures: z.array(z.looseObject({})).optional(),
});
const safeCallToolRequestSchema = CallToolRequestSchema.extend({
  params: CallToolRequestSchema.shape.params.extend({ arguments: z.unknown().optional() }),
});
const unsafeInputMarker = Object.freeze({ __stylegallery_unsafe_material_input__: true });

function packagedInventoryRunner(root) {
  return () => {
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(root, "consumer-reference", "agent-native", "v2", "material-registry.json"), "utf8"));
      return {
        error: undefined,
        status: 0,
        stderr: Buffer.alloc(0),
        stdout: Buffer.from(manifest.materials.map((record) => `100644 ${record.source_sha256} 0\t${record.repository_path}\0`).join(""), "utf8"),
      };
    } catch {
      return { error: undefined, status: 1, stderr: Buffer.alloc(0), stdout: Buffer.alloc(0) };
    }
  };
}

function runtimeRegistry() {
  return createMaterialOperationRegistry({
    repositoryRoot,
    ...(fs.existsSync(path.join(repositoryRoot, ".git")) ? {} : { gitRunner: packagedInventoryRunner(repositoryRoot) }),
  });
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function assertRegistry(registry) {
  if (!registry || typeof registry.invoke !== "function" || !Array.isArray(registry.operations)) {
    throw new TypeError("material MCP registry must expose invoke and operations");
  }
  const names = registry.operations.map(({ name }) => name).sort();
  if (names.length !== exposedNames.size || names.some((name) => !exposedNames.has(name))) {
    throw new TypeError("material MCP registry must contain exactly four v2 read operations");
  }
  for (const operation of registry.operations) {
    if (operation.read_only !== true || operation.effect_class !== "NONE") {
      throw new TypeError("material MCP operations must be read-only with NONE effects");
    }
  }
}

export function normalizeMaterialMcpInput(input) {
  if (input === undefined) return {};
  if (input === null || typeof input !== "object" || utilTypes.isProxy(input) || Array.isArray(input)) {
    throw new McpError(ErrorCode.InvalidParams, "operation input must contain only own plain data");
  }
  let prototype;
  let keys;
  try {
    prototype = Object.getPrototypeOf(input);
    keys = Reflect.ownKeys(input);
  } catch {
    throw new McpError(ErrorCode.InvalidParams, "operation input must contain only own plain data");
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw new McpError(ErrorCode.InvalidParams, "operation input must contain only own plain data");
  }
  const normalized = {};
  for (const key of keys) {
    if (typeof key !== "string") throw new McpError(ErrorCode.InvalidParams, "operation input must contain only own plain data");
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || descriptor.enumerable !== true || !("value" in descriptor)) {
      throw new McpError(ErrorCode.InvalidParams, "operation input must contain only own plain data");
    }
    const value = descriptor.value;
    if (!["string", "number", "boolean"].includes(typeof value) && value !== null) {
      throw new McpError(ErrorCode.InvalidParams, "operation input must contain only own scalar data");
    }
    normalized[key] = value;
  }
  return normalized;
}

function sanitizedToolCallMessage(message) {
  if (!message || typeof message !== "object" || message.method !== "tools/call" || !message.params || typeof message.params !== "object") return message;
  const descriptor = Object.getOwnPropertyDescriptor(message.params, "arguments");
  let normalized;
  try {
    normalized = descriptor && "value" in descriptor ? normalizeMaterialMcpInput(descriptor.value) : {};
  } catch {
    normalized = unsafeInputMarker;
  }
  const params = Object.create(Object.getPrototypeOf(message.params), Object.getOwnPropertyDescriptors(message.params));
  Object.defineProperty(params, "arguments", { configurable: true, enumerable: true, value: normalized, writable: true });
  const sanitized = Object.create(Object.getPrototypeOf(message), Object.getOwnPropertyDescriptors(message));
  Object.defineProperty(sanitized, "params", { configurable: true, enumerable: true, value: params, writable: true });
  return sanitized;
}

class OwnDataTransport {
  onclose;
  onerror;
  onmessage;

  constructor(transport) { this.transport = transport; }
  get sessionId() { return this.transport.sessionId; }
  async start() {
    this.transport.onmessage = (message, extra) => this.onmessage?.(sanitizedToolCallMessage(message), extra);
    this.transport.onerror = (error) => this.onerror?.(error);
    this.transport.onclose = () => this.onclose?.();
    await this.transport.start();
  }
  close() { return this.transport.close(); }
  send(message, options) { return this.transport.send(message, options); }
  setProtocolVersion(version) { return this.transport.setProtocolVersion?.(version); }
}

function toolResponse(value) {
  return {
    content: [{ type: "text", text: canonicalize(value) }],
    ...(value.ok ? {} : { isError: true }),
    structuredContent: value,
  };
}

function resourceContents(uri, value) {
  return { contents: [{ uri, mimeType: "application/json", text: canonicalize(value) }] };
}

export function materialResourceUri(stableRef) {
  return `sg://v2/material/${encodeURIComponent(parseMaterialStableRef(stableRef).stable_ref)}`;
}

function materialReference(encoded) {
  if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 256) {
    throw new McpError(ErrorCode.InvalidParams, "material resource reference must be one canonical encoded StableRef");
  }
  let decoded;
  try { decoded = decodeURIComponent(encoded); } catch {
    throw new McpError(ErrorCode.InvalidParams, "material resource reference has invalid percent encoding");
  }
  if (encodeURIComponent(decoded) !== encoded) {
    throw new McpError(ErrorCode.InvalidParams, "material resource reference is not canonically encoded once");
  }
  try { return parseMaterialStableRef(decoded).stable_ref; } catch {
    throw new McpError(ErrorCode.InvalidParams, "material resource reference must decode to one canonical v2 StableRef");
  }
}

function resourceEnvelope(registry, encoded) {
  const result = registry.invoke("material-get", { reference: materialReference(encoded) });
  if (result.ok) return result;
  const failure = result.failures?.[0] ?? { code: "material_operation_failed", message: "v2 material operation failed" };
  throw new McpError(ErrorCode.InvalidParams, `${failure.code}: ${failure.message}`);
}

function materialReferenceFromUri(uri) {
  const prefix = "sg://v2/material/";
  if (typeof uri !== "string" || !uri.startsWith(prefix) || uri.length > prefix.length + 256) {
    throw new McpError(ErrorCode.InvalidParams, "material resource URI must use the canonical v2 authority and path");
  }
  const encoded = uri.slice(prefix.length);
  const reference = materialReference(encoded);
  if (materialResourceUri(reference) !== uri) {
    throw new McpError(ErrorCode.InvalidParams, "material resource URI is not canonical");
  }
  return reference;
}

export function createMaterialMcpServer({ registry = runtimeRegistry(), manifest = loadManifest() } = {}) {
  assertRegistry(registry);
  if (!manifest || !Array.isArray(manifest.materials)) throw new TypeError("material MCP manifest is unavailable");
  const server = new McpServer({ name: "StyleGallery Material", version: "2.0.0" });
  const operations = materialOperationSpecs.filter(({ name }) => exposedNames.has(name));
  const operationByName = new Map(operations.map((operation) => [operation.name, operation]));

  for (const operation of operations) {
    server.registerTool(operation.name, {
      description: descriptions[operation.name],
      inputSchema: inputSchemas[operation.name],
      outputSchema,
      annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false, readOnlyHint: true },
      _meta: { effect_class: "NONE" },
    }, async (input) => toolResponse(registry.invoke(operation.name, normalizeMaterialMcpInput(input))));
  }
  server.server.setRequestHandler(safeCallToolRequestSchema, async (request) => {
    const operation = operationByName.get(request.params.name);
    if (!operation) throw new McpError(ErrorCode.InvalidParams, `Tool ${request.params.name} not found`);
    if (request.params.arguments?.__stylegallery_unsafe_material_input__ === true) {
      throw new McpError(ErrorCode.InvalidParams, "operation input must contain only own plain data");
    }
    const normalized = normalizeMaterialMcpInput(request.params.arguments);
    const parsed = await inputSchemas[operation.name].safeParseAsync(normalized);
    if (!parsed.success) throw new McpError(ErrorCode.InvalidParams, `Invalid arguments for tool ${operation.name}`);
    return toolResponse(registry.invoke(operation.name, parsed.data));
  });

  server.registerResource(
    "stylegallery-v2-material",
    new ResourceTemplate("sg://v2/material/{reference}", {
      list: async () => ({
        resources: manifest.materials.map((record) => ({
          name: record.stable_ref,
          description: "Canonical admitted StyleGallery v2 material.",
          mimeType: "application/json",
          uri: materialResourceUri(record.stable_ref),
        })),
      }),
    }),
    { description: "Read one canonically encoded v2 material StableRef.", mimeType: "application/json" },
    async (uri, variables) => resourceContents(uri.toString(), resourceEnvelope(registry, variables.reference)),
  );
  server.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    const reference = materialReferenceFromUri(uri);
    return resourceContents(uri, resourceEnvelope(registry, encodeURIComponent(reference)));
  });
  const connect = server.connect.bind(server);
  server.connect = (transport) => connect(new OwnDataTransport(transport));
  return server;
}

export const createMcpServer = createMaterialMcpServer;
