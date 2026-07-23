#!/usr/bin/env node

import {
  loadKernelModule,
  modulePaths,
  result,
} from "./test-agent-execution-fixtures.mjs";
import { exerciseExecutionEffects } from "./test-agent-execution-effects.mjs";
import { exerciseLearning } from "./test-agent-execution-learning.mjs";
import { exerciseExecutionLifecycle } from "./test-agent-execution-lifecycle.mjs";
import { exerciseEvents, exerciseRetrieval } from "./test-agent-execution-views.mjs";

async function main() {
  const unknownArgs = process.argv.slice(2).filter((arg) => arg !== "--json");
  if (unknownArgs.length > 0) {
    const report = { ok: false, results: [result("argument_contract", "only --json is accepted", { unknownArgs }, false)] };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const modules = Object.fromEntries(await Promise.all(Object.keys(modulePaths).map(async (name) => [name, await loadKernelModule(name)])));
  const lifecycle = await exerciseExecutionLifecycle(modules);
  const effects = await exerciseExecutionEffects(modules, lifecycle);
  const state = { ...lifecycle, ...effects };
  const eventRows = await exerciseEvents(modules, state);
  const retrieval = await exerciseRetrieval(modules);
  const learningRows = await exerciseLearning(modules, { ...state, ...retrieval });
  const results = [...lifecycle.rows, ...effects.rows, ...eventRows, ...retrieval.rows, ...learningRows];
  const report = {
    contract: "agent-native-execution-kernel",
    ok: results.length > 0 && results.every((row) => row.ok),
    results,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.ok ? 0 : 1;
}

await main();
