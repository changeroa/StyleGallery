#!/usr/bin/env node

import path from "node:path";
import { canonicalize } from "../canonical-json.mjs";
import { MaterialRegistryError, writeMaterialRegistry } from "./material-registry.mjs";

function emit(value) { process.stdout.write(`${canonicalize(value)}\n`); }

try {
  if (process.argv.length !== 2) throw new MaterialRegistryError("material_generator_argument_invalid", "generator accepts no arguments");
  const result = writeMaterialRegistry({ repositoryRoot: path.resolve(process.cwd()) });
  emit({ ok: true, ...result });
} catch (error) {
  emit({ ok: false, failures: [{ code: error.code ?? "material_generator_failed", message: error.message, ...(error.path === undefined ? {} : { path: error.path }) }] });
  process.exitCode = 1;
}
