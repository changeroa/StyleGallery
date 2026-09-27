#!/usr/bin/env node
// Serves showcase/ on localhost and prints the URLs to open, including the SSH forward for remote sessions.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serveDirectory } from "./check-showcase.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const showcaseRoot = path.join(repositoryRoot, "showcase");
const argv = process.argv.slice(2);
const portIndex = argv.indexOf("--port");
const port = portIndex === -1 ? 4180 : Number(argv[portIndex + 1]);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`invalid --port ${argv[portIndex + 1]}`);
  process.exit(1);
}

const works = fs.readdirSync(showcaseRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(showcaseRoot, entry.name, "index.html")))
  .map((entry) => entry.name)
  .sort();

try {
  await serveDirectory(showcaseRoot, { port });
} catch (error) {
  console.error(error.code === "EADDRINUSE" ? `port ${port} is already in use; pass --port <other>` : error.message);
  process.exit(1);
}

const base = `http://localhost:${port}`;
if (works.length === 0) console.log(`Serving ${base}/: no showcase works yet. Add showcase/<slug>/index.html and a hub at showcase/index.html.`);
else {
  console.log(`Showcase hub: ${base}/`);
  for (const slug of works) console.log(`  ${slug}: ${base}/${slug}/`);
}
console.log("");
console.log("Working over SSH? On your own machine run:");
console.log(`  ssh -N -L ${port}:127.0.0.1:${port} ${os.userInfo().username}@${os.hostname()}`);
console.log(`then open ${base}/ in your local browser. Press Ctrl+C here to stop.`);
