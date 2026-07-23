#!/usr/bin/env node

function emergencyReport(error) {
  return {
    failures: [{
      code: error?.code ?? "cli_failed",
      message: error instanceof Error ? error.message : String(error),
      ...(error?.path ? { path: error.path } : {}),
    }],
    ok: false,
    operation: null,
  };
}

async function main() {
  try {
    const { runCli } = await import("./agent-native/cli-adapter.mjs");
    const result = runCli(process.argv.slice(2));
    process.stdout.write(result.output);
    process.exitCode = result.exitCode;
  } catch (error) {
    process.stdout.write(`${JSON.stringify(emergencyReport(error), null, 2)}\n`);
    process.exitCode = 1;
  }
}

await main();
