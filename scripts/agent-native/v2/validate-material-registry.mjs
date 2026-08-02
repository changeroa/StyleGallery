#!/usr/bin/env node

import path from "node:path";
import { canonicalize } from "../canonical-json.mjs";
import { loadMaterialRegistry, MaterialRegistryError } from "./material-registry.mjs";

function emit(value) { process.stdout.write(`${canonicalize(value)}\n`); }

try {
  if (process.argv.length !== 2) throw new MaterialRegistryError("material_validator_argument_invalid", "validator accepts no arguments");
  const repositoryRoot = path.resolve(process.cwd());
  const manifest = loadMaterialRegistry({ repositoryRoot });
  emit({ ok: true, material_count: manifest.materials.length, version_id: manifest.version_id });
} catch (error) {
  emit({ ok: false, failures: [{ code: error.code ?? "material_validator_failed", message: error.message, ...(error.path === undefined ? {} : { path: error.path }) }] });
  process.exitCode = 1;
}
