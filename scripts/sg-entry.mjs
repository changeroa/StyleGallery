#!/usr/bin/env node

try {
  const { runSgCli } = await import("./compiler/cli.mjs");
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  try {
    const result = await runSgCli(process.argv.slice(2), { signal: controller.signal });
    process.stdout.write(result.output);
    process.exitCode = result.exitCode;
  } finally {
    process.removeListener("SIGINT", cancel);
    process.removeListener("SIGTERM", cancel);
  }
} catch (error) {
  process.stdout.write(`${JSON.stringify({ ok: false, operation: null, failures: [{ code: error.code ?? "cli_failed", message: error.message }] }, null, 2)}\n`);
  process.exitCode = 1;
}
