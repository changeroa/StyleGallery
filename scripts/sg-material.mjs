#!/usr/bin/env node

function emergencyReport() {
  return {
    failures: [{ code: "material_cli_failed", message: "material CLI failed" }],
    ok: false,
    operation: null,
  };
}

function writeProtocol(output, exitCode) {
  process.stdout.on("error", () => { process.exitCode = 1; });
  process.stdout.write(output);
  process.exitCode = exitCode;
}

async function main() {
  try {
    const { runMaterialCli } = await import("./agent-native/v2/material-cli-adapter.mjs");
    const result = runMaterialCli(process.argv.slice(2));
    writeProtocol(result.output, result.exitCode);
  } catch {
    writeProtocol(`${JSON.stringify(emergencyReport(), null, 2)}\n`, 1);
  }
}

await main();
