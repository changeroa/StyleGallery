#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
let renderer = "tests/helpers/render-consumer-reference.mjs";
let json = false;
const failures = [];
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") json = true;
  else if (argument === "--renderer" && process.argv[index + 1]) {
    renderer = process.argv[index + 1];
    index += 1;
  } else failures.push({ code: "argument_unknown", message: `unsupported argument ${argument}`, path: "<cli>" });
}

function hashProtectedSources() {
  const files = [path.join(repositoryRoot, "CATALOG.md")];
  const queue = [path.join(repositoryRoot, "patterns")];
  while (queue.length > 0) {
    const current = queue.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) queue.push(target);
      else if (entry.isFile()) files.push(target);
    }
  }
  const hash = crypto.createHash("sha256");
  for (const file of files.sort()) hash.update(path.relative(repositoryRoot, file)).update(fs.readFileSync(file));
  return hash.digest("hex");
}

const rendererPath = path.resolve(repositoryRoot, renderer);
if (!fs.existsSync(rendererPath)) failures.push({ code: "renderer_missing", message: "renderer helper does not exist", path: renderer });
else {
  const source = fs.readFileSync(rendererPath, "utf8");
  const imports = [...source.matchAll(/^import\s+[^;]+?\s+from\s+["']([^"']+)["'];?$/gm)].map((match) => match[1]);
  if (imports.length !== 1 || imports[0] !== "../../scripts/pattern-data.mjs") failures.push({ code: "renderer_import_boundary", message: "renderer may import only scripts/pattern-data.mjs", path: renderer });
  if (/generate-patterns|build-reference-artifacts/.test(source)) failures.push({ code: "renderer_generator_dependency", message: "renderer must not import or call generators", path: renderer });
  if (/node:(?:fs|child_process)|\b(?:writeFile|appendFile|rmSync|renameSync|spawnSync|execSync)\b/.test(source)) failures.push({ code: "renderer_side_effect_capability", message: "renderer must not hold filesystem or process mutation capability", path: renderer });
  if (failures.length === 0) {
    const before = hashProtectedSources();
    await import(`${pathToFileURL(rendererPath).href}?purity=${Date.now()}`);
    const after = hashProtectedSources();
    if (after !== before) failures.push({ code: "renderer_protected_source_mutation", message: "renderer import changed patterns or CATALOG.md", path: renderer });
  }
}

const result = { failures, ok: failures.length === 0, warnings: [] };
if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else if (!result.ok) process.stderr.write(`${failures.map((failure) => `${failure.code}: ${failure.message}`).join("\n")}\n`);
if (!result.ok) process.exitCode = 1;
