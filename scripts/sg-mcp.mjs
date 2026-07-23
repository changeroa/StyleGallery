#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createStyleGalleryMcpServer } from "./agent-native/mcp-adapter.mjs";

async function main() {
  const server = createStyleGalleryMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

await main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
