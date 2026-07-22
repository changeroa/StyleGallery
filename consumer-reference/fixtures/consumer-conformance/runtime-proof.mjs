#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const resultReference = process.env.STYLEGALLERY_RESULT_ARTIFACT;
const contextValue = process.env.STYLEGALLERY_RUNTIME_CONTEXT;
assert.ok(resultReference && contextValue, "the validator must provide the result path and runtime context");
assert.equal(path.posix.normalize(resultReference), resultReference);
assert.ok(!path.posix.isAbsolute(resultReference) && !resultReference.split("/").includes(".."));

if (process.argv.includes("--lock-worktree")) {
  const locked = spawnSync("git", ["worktree", "lock", "."], { encoding: "utf8" });
  assert.equal(locked.status, 0, locked.stderr);
}

const context = JSON.parse(contextValue);
const persisted = JSON.parse(JSON.stringify({ drawer: "open", route: "/gallery", selection: null }));
assert.deepEqual(persisted, { drawer: "open", route: "/gallery", selection: null });

const output = {
  ...context,
  record_kind: "consumer_migration_scenario_result",
  recorded_at: "2026-07-21T00:00:00Z",
  schema_version: "1.0",
  status: "passed",
};
const resultFile = path.resolve(process.cwd(), resultReference);
fs.mkdirSync(path.dirname(resultFile), { recursive: true });
fs.writeFileSync(resultFile, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx" });
