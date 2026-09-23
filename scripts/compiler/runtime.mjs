import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compilerOperations, compilerToolDefinitions, upstream, workflowSchema } from "./operations.mjs";

const galleryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const logLimit = 65536;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const handoff = { consumer_reference: "consumer-reference/agent-native/registry.json" };

export function failure(operation, code, message) {
  return { ok: false, operation, failures: [{ code, message }] };
}

function compilerLocation(config) {
  const configured = config.compilerRoot ?? process.env.SG_COMPILER_ROOT;
  if (!configured) throw Object.assign(new Error("Set SG_COMPILER_ROOT to your site-compiler checkout, or pass --compiler-root to the CLI."), { code: "compiler_not_configured" });
  const root = fs.realpathSync(path.resolve(config.cwd ?? process.cwd(), configured));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  if (manifest.name !== "site-compiler") throw Object.assign(new Error("SG_COMPILER_ROOT must contain the site-compiler package."), { code: "compiler_invalid" });
  const revision = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8", timeout: 5000 });
  const gitRoot = spawnSync("git", ["-C", root, "rev-parse", "--show-toplevel"], { encoding: "utf8", timeout: 5000 });
  const isCheckout = gitRoot.status === 0 && fs.realpathSync(gitRoot.stdout.trim()) === root;
  const status = isCheckout ? spawnSync("git", ["-C", root, "status", "--porcelain", "--untracked-files=no"], { encoding: "utf8", timeout: 5000 }) : null;
  const actualRevision = isCheckout && revision.status === 0 ? revision.stdout.trim() : null;
  return {
    root, package_version: manifest.version, revision: actualRevision,
    tracked_changes: status?.status === 0 ? status.stdout.length > 0 : null,
    matches_verified_revision: actualRevision === upstream.verified_revision && status?.status === 0 && status.stdout.length === 0,
  };
}

export function compilerDiscovery(config = {}) {
  let installation;
  try { installation = { configured: true, ...compilerLocation(config) }; }
  catch (error) { installation = { configured: false, code: error.code ?? "compiler_unavailable", message: error.message }; }
  return {
    ...upstream, installation,
    operations: compilerToolDefinitions(),
    contracts: ["design-engineering/component-contract.md", "motion/observed-choreography.md"],
    ...handoff,
  };
}

function checkedFile(root, name) {
  const target = path.join(root, name);
  if (fs.realpathSync(target) !== target || !fs.statSync(target).isFile()) {
    throw Object.assign(new Error(`Compiler entry must be a regular file within its checkout: ${name}`), { code: "compiler_entry_invalid" });
  }
  return target;
}

function runProcess(script, args, { cwd, timeout, signal }) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve({ exit_code: null, signal: null, cancelled: true, timed_out: false, stdout: "", stderr: "" });
    const child = spawn(process.execPath, [script, ...args], {
      cwd, shell: false, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"],
    });
    const logs = { stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
    const truncated = { stdout: false, stderr: false };
    let timedOut = false;
    let cancelled = false;
    let spawnError;
    let forceTimer;
    const kill = (signalName) => {
      try {
        if (process.platform === "win32" && child.pid) {
          spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true, timeout: 5000 });
        }
        else if (child.pid) process.kill(-child.pid, signalName);
      } catch (error) { if (error.code !== "ESRCH") spawnError ??= error.message; }
    };
    const stop = () => {
      kill("SIGTERM");
      forceTimer ??= setTimeout(() => kill("SIGKILL"), 1000);
      forceTimer.unref();
    };
    const abort = () => { cancelled = true; stop(); };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeout);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    for (const channel of ["stdout", "stderr"]) child[channel].on("data", (chunk) => {
      const combined = Buffer.concat([logs[channel], chunk]);
      truncated[channel] ||= combined.length > logLimit;
      logs[channel] = combined.subarray(Math.max(0, combined.length - logLimit));
    });
    child.on("error", (error) => { spawnError = error.message; });
    child.on("close", (exitCode, exitSignal) => {
      clearTimeout(timer);
      if (forceTimer) { kill("SIGKILL"); clearTimeout(forceTimer); }
      signal?.removeEventListener("abort", abort);
      resolve({
        exit_code: exitCode, signal: exitSignal, timed_out: timedOut, cancelled,
        stdout: logs.stdout.toString("utf8"), stderr: logs.stderr.toString("utf8"),
        stdout_truncated: truncated.stdout, stderr_truncated: truncated.stderr,
        ...(spawnError ? { spawn_error: spawnError } : {}),
      });
    });
  });
}

export async function executeCompiler(operation, input = {}, config = {}) {
  const spec = Object.hasOwn(compilerOperations, operation) ? compilerOperations[operation] : null;
  if (!spec && operation !== "workflow") return failure(operation, "command_unknown", `Unknown compiler command: ${operation}`);
  const parsed = (operation === "workflow" ? workflowSchema : spec.schema).safeParse(input);
  if (!parsed.success) return failure(operation, "input_invalid", parsed.error.message);
  try {
    const compiler = compilerLocation(config);
    if (operation === "workflow") {
      const name = parsed.data.document === "readme" ? "README.md" : "SKILL.md";
      const bytes = fs.readFileSync(checkedFile(compiler.root, name));
      return { ok: true, operation, result: { compiler, source: name, sha256: hash(bytes), text: bytes.toString("utf8"), contracts: compilerDiscovery(config).contracts, ...handoff } };
    }
    const script = checkedFile(compiler.root, spec.script);
    const scriptHash = hash(fs.readFileSync(script));
    const values = { ...parsed.data };
    const timeout = values.runner_timeout_ms ?? 1800000;
    delete values.runner_timeout_ms;
    if (operation === "transcribe" || operation === "build") values.stylegallery ??= galleryRoot;
    for (const key of spec.paths) if (values[key] !== undefined) values[key] = path.resolve(config.cwd ?? process.cwd(), values[key]);
    if (operation === "sale") {
      if (values.in === values.out) return failure(operation, "input_invalid", "sale requires a separate output directory.");
      values.audit ??= path.join(path.dirname(values.out), "copy-audit.private.json");
      const relative = path.relative(values.out, values.audit);
      if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
        return failure(operation, "input_invalid", "The private copy audit must be outside the sale directory.");
      }
    }
    const args = [];
    for (const key of spec.positional ?? []) args.push(values[key]);
    for (const [key, value] of Object.entries(values)) {
      if (spec.positional?.includes(key) || value === false) continue;
      args.push(`--${key.replaceAll("_", "-")}`);
      if (value !== true) args.push(String(value));
    }
    const execution = await runProcess(script, args, { cwd: compiler.root, timeout, signal: config.signal });
    const ok = execution.exit_code === 0 && !execution.timed_out && !execution.cancelled && !execution.spawn_error;
    const result = {
      compiler, script: spec.script, script_sha256: scriptHash,
      arguments: args, paths: Object.fromEntries(spec.paths.filter((key) => values[key] !== undefined).map((key) => [key, values[key]])),
      ...execution, ...handoff,
      ...(spec.ledger ? { ledger: path.join(values.out ?? values.in, spec.ledger), success_scope: "process_exit_only; inspect ledger for each pack" } : {}),
      ...(operation === "pack-release" ? { output: path.join(compiler.root, "out/release") } : {}),
    };
    return {
      ok, operation, result,
      ...(!ok ? { failures: [{
        code: execution.cancelled ? "compiler_cancelled" : execution.timed_out ? "compiler_timeout" : "compiler_failed",
        message: execution.spawn_error ?? (execution.cancelled ? "Compiler execution cancelled." : execution.timed_out ? `Compiler exceeded ${timeout}ms.` : `Compiler exited with ${execution.exit_code ?? execution.signal}.`),
      }] } : {}),
    };
  } catch (error) { return failure(operation, error.code ?? "compiler_unavailable", error.message); }
}
