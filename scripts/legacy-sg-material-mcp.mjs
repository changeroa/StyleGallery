#!/usr/bin/env node
// Old bin name `stylegallery-material-mcp`: notice on stderr, then serve unchanged for 0.1.12 only.
import { main } from "./sg-material-mcp.mjs";

process.stderr.write("stylegallery-material-mcp is renamed: use stylegallery-mcp (tools: search, read). This old name will be removed in the next release.\n");
await main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
