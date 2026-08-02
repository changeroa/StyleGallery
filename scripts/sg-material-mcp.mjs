#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { Transform } from "node:stream";
import { fileURLToPath } from "node:url";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createMaterialMcpServer } from "./agent-native/v2/material-mcp-adapter.mjs";

// Maximum raw bytes in one newline-delimited JSON-RPC payload, excluding the LF delimiter.
export const MATERIAL_MCP_MAX_FRAME_BYTES = 1024 * 1024;
export const MATERIAL_MCP_FRAME_LIMIT_MESSAGE = `material MCP input frame exceeds ${MATERIAL_MCP_MAX_FRAME_BYTES}-byte limit`;

export class MaterialMcpStdin extends Transform {
  constructor(maxFrameBytes = MATERIAL_MCP_MAX_FRAME_BYTES) {
    super();
    this.maxFrameBytes = maxFrameBytes;
    this.frame = Buffer.allocUnsafe(maxFrameBytes + 1);
    this.frameBytes = 0;
  }

  _transform(chunk, encoding, callback) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const newline = bytes.indexOf(0x0a, offset);
      const end = newline === -1 ? bytes.byteLength : newline;
      const segmentBytes = end - offset;
      if (this.frameBytes + segmentBytes > this.maxFrameBytes) {
        this.frameBytes = 0;
        const error = new Error(MATERIAL_MCP_FRAME_LIMIT_MESSAGE);
        error.code = "ERR_MATERIAL_MCP_FRAME_TOO_LARGE";
        callback(error);
        return;
      }
      if (segmentBytes > 0) {
        bytes.copy(this.frame, this.frameBytes, offset, end);
        this.frameBytes += segmentBytes;
      }
      if (newline === -1) break;
      this.frame[this.frameBytes] = 0x0a;
      this.push(Buffer.from(this.frame.subarray(0, this.frameBytes + 1)));
      this.frameBytes = 0;
      offset = newline + 1;
    }
    callback();
  }

  _destroy(error, callback) {
    this.frame = Buffer.alloc(0);
    this.frameBytes = 0;
    callback(error);
  }
}

async function main() {
  const server = createMaterialMcpServer();
  const input = new MaterialMcpStdin();
  const transport = new StdioServerTransport(input);
  let failed = false;
  const failOversizedFrame = (error) => {
    if (failed || error?.code !== "ERR_MATERIAL_MCP_FRAME_TOO_LARGE") return;
    failed = true;
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
    process.stdin.destroy();
    void transport.close();
  };
  input.on("error", failOversizedFrame);
  transport.onerror = failOversizedFrame;
  process.stdout.on("error", (error) => {
    if (error?.code !== "EPIPE") throw error;
    process.stderr.write("material MCP output closed\n");
    process.exitCode = 1;
    process.stdin.destroy();
    void transport.close();
  });
  await server.connect(transport);
  process.stdin.pipe(input);
}

function isDirectRun(entryPath) {
  if (!entryPath) return false;
  try {
    return realpathSync(entryPath) === realpathSync(fileURLToPath(import.meta.url));
  } catch (error) {
    if (["ENOENT", "ENOTDIR"].includes(error?.code)) return false;
    throw error;
  }
}

if (isDirectRun(process.argv[1])) {
  await main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
