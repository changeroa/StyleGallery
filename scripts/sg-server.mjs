#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createSgMcpServer } from "./compiler/mcp.mjs";

try {
  const controller = new AbortController();
  const server = createSgMcpServer({ signal: controller.signal });
  const shutdown = () => {
    controller.abort();
    server.close().catch(() => {});
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  process.stdin.once("end", shutdown);
  await server.connect(new StdioServerTransport());
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
