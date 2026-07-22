#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const cases = [
  { kind: "validator", script: "validate-consumer-reference.mjs" },
  { kind: "harness", script: "test-validate-consumer-reference.mjs" },
];

function reportIsComplete(kind, report) {
  if (!report || typeof report !== "object" || report.ok !== true) return false;
  if (kind === "validator") {
    return Number.isInteger(report.checkedItems)
      && report.checkedItems > 0
      && Array.isArray(report.profiles);
  }
  return kind === "harness" && Array.isArray(report.results) && report.results.length > 30;
}

function readStream(stream) {
  return new Promise((resolve, reject) => {
    stream.setEncoding("utf8");
    let output = "";
    stream.on("data", (chunk) => { output += chunk; });
    stream.once("end", () => resolve(output));
    stream.once("error", reject);
  });
}

function waitForClose(child, label) {
  return new Promise((resolve, reject) => {
    child.once("error", (error) => reject(new Error(`${label} failed to start: ${error.message}`, { cause: error })));
    child.once("close", (status, signal) => resolve({ signal, status }));
  });
}

async function parsePipe(kind) {
  try {
    const output = await readStream(process.stdin);
    const report = JSON.parse(output);
    const complete = reportIsComplete(kind, report);
    const summary = {
      bytes: Buffer.byteLength(output),
      complete,
      digest: createHash("sha256").update(output).digest("hex"),
    };
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    process.exitCode = complete ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

async function runPipeCase(testCase, run) {
  const producer = spawn(process.execPath, [path.join(root, "scripts", testCase.script), "--json"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const parser = spawn(process.execPath, [scriptPath, "--pipe-parser", testCase.kind], {
    cwd: root,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const directOutputPromise = readStream(producer.stdout);
  const producerStderrPromise = readStream(producer.stderr);
  const parserOutputPromise = readStream(parser.stdout);
  const parserStderrPromise = readStream(parser.stderr);
  let pipeError = null;
  parser.stdin.once("error", (error) => { pipeError = error; });
  producer.stdout.pipe(parser.stdin);

  const [producerClose, parserClose, directOutput, producerStderr, parserOutput, parserStderr] = await Promise.all([
    waitForClose(producer, `${testCase.kind} producer`),
    waitForClose(parser, `${testCase.kind} parser`),
    directOutputPromise,
    producerStderrPromise,
    parserOutputPromise,
    parserStderrPromise,
  ]);

  let directReport;
  let pipeReport;
  try {
    directReport = JSON.parse(directOutput);
    pipeReport = JSON.parse(parserOutput);
  } catch (error) {
    return {
      actual: {
        parserStatus: parserClose.status,
        parserStderr: parserStderr.trim(),
        pipeError: pipeError?.message ?? "",
        producerStatus: producerClose.status,
        producerStderr: producerStderr.trim(),
      },
      expected: "complete parseable JSON through a real Node stream pipe",
      name: `${testCase.kind}_pipe_run_${run}`,
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  const directBytes = Buffer.byteLength(directOutput);
  const directDigest = createHash("sha256").update(directOutput).digest("hex");
  const equivalent = pipeReport.bytes === directBytes && pipeReport.digest === directDigest;
  const complete = reportIsComplete(testCase.kind, directReport) && pipeReport.complete === true;
  return {
    actual: {
      complete,
      directBytes,
      equivalent,
      parserSignal: parserClose.signal,
      parserStatus: parserClose.status,
      parserStderr: parserStderr.trim(),
      pipeBytes: pipeReport.bytes,
      pipeError: pipeError?.message ?? "",
      producerSignal: producerClose.signal,
      producerStatus: producerClose.status,
      producerStderr: producerStderr.trim(),
    },
    expected: "complete parseable JSON through a real Node stream pipe",
    name: `${testCase.kind}_pipe_run_${run}`,
    ok: producerClose.status === 0
      && producerClose.signal === null
      && parserClose.status === 0
      && parserClose.signal === null
      && producerStderr.length === 0
      && parserStderr.length === 0
      && pipeError === null
      && directBytes > 512
      && complete
      && equivalent,
  };
}

async function main() {
  const results = [];
  for (const testCase of cases) {
    for (const run of [1, 2]) results.push(await runPipeCase(testCase, run));
  }
  const report = { ok: results.every((result) => result.ok), results };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.ok ? 0 : 1;
}

if (process.argv[2] === "--pipe-parser") await parsePipe(process.argv[3]);
else await main();
