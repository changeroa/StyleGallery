#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter, once } from "node:events";
import { Writable } from "node:stream";
import { writeJsonOutput } from "./json-output.mjs";

class ControlledWritable extends Writable {
  constructor() {
    super({ highWaterMark: 1 });
    this.chunks = [];
    this.writeResult = undefined;
  }

  _write(chunk, _encoding, callback) {
    this.chunks.push(Buffer.from(chunk));
    this.emit("write-received", callback);
  }

  write(...args) {
    this.writeResult = super.write(...args);
    return this.writeResult;
  }
}

class FailingWritable extends Writable {
  _write(_chunk, _encoding, callback) {
    callback(new Error("injected writable failure"));
  }
}

class EventErrorWritable extends EventEmitter {
  write(_chunk, callback) {
    this.emit("write-received", callback);
    return false;
  }
}

class OrderedWritable extends EventEmitter {
  constructor(retainedBytes) {
    super();
    this.retainedBytes = retainedBytes;
    this.retained = Buffer.alloc(0);
  }

  write(chunk, callback) {
    this.retained = Buffer.from(chunk).subarray(0, this.retainedBytes);
    this.emit("write-received", callback);
    return false;
  }
}

class ThrowingWritable extends EventEmitter {
  write() {
    assert.equal(this.listenerCount("close"), 1, "close must be subscribed before write");
    assert.equal(this.listenerCount("error"), 1, "error must be subscribed before write");
    throw new Error("injected synchronous write throw");
  }
}

function listenerCounts(stream) {
  return { close: stream.listenerCount("close"), error: stream.listenerCount("error") };
}

function waitForEvent(stream, event) {
  return once(stream, event, { signal: AbortSignal.timeout(2000) });
}

async function bounded(promise) {
  const timeout = waitForEvent(new EventEmitter(), "timeout")
    .catch((error) => {
      if (error.name === "AbortError") throw new Error("writer settlement timed out");
      throw error;
    });
  return Promise.race([promise, timeout]);
}

async function assertLateSignalsAreHarmless(stream) {
  const lateError = waitForEvent(stream, "error");
  stream.emit("error", new Error("late writable error"));
  assert.match((await lateError)[0].message, /late writable error/);
  stream.emit("close");
}

async function testDelayedCallbackCompleteness() {
  const stream = new ControlledWritable();
  const writeReceived = once(stream, "write-received");
  let settled = false;
  const write = writeJsonOutput({ ok: true, payload: "backpressure" }, stream)
    .finally(() => { settled = true; });
  const [completeWrite] = await writeReceived;

  assert.equal(stream.writeResult, false, "the fixture must exercise backpressure");
  assert.equal(settled, false, "the writer must remain pending until the write callback completes");
  completeWrite();
  await write;

  const expected = `${JSON.stringify({ ok: true, payload: "backpressure" }, null, 2)}\n`;
  assert.equal(Buffer.concat(stream.chunks).toString("utf8"), expected);
}

async function testWritableErrorRejection() {
  const stream = new FailingWritable();
  const before = listenerCounts(stream);
  await assert.rejects(
    bounded(writeJsonOutput({ ok: false }, stream)),
    /injected writable failure/,
  );
  assert.deepEqual(listenerCounts(stream), before);
  await assertLateSignalsAreHarmless(stream);
}

async function testStreamErrorEventIsAuthoritative() {
  const stream = new EventErrorWritable();
  const before = listenerCounts(stream);
  const writeReceived = waitForEvent(stream, "write-received");
  const failure = new Error("injected stream event failure");
  const write = writeJsonOutput({ ok: false }, stream);
  const [completeWrite] = await writeReceived;

  stream.emit("error", failure);
  await assert.rejects(bounded(write), (error) => error === failure);
  assert.deepEqual(listenerCounts(stream), before);
  completeWrite();
  await assertLateSignalsAreHarmless(stream);
}

async function testCloseBeforeCallbackRejectsWithPartialBytes() {
  const stream = new OrderedWritable(17);
  const before = listenerCounts(stream);
  const writeReceived = waitForEvent(stream, "write-received");
  const report = { ok: true, payload: "close-before-callback" };
  const expected = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
  const write = writeJsonOutput(report, stream);
  const [completeWrite] = await writeReceived;

  stream.emit("close");
  completeWrite();
  await assert.rejects(bounded(write), /closed before the write callback completed/);
  assert.equal(stream.retained.compare(expected.subarray(0, 17)), 0);
  assert.deepEqual(listenerCounts(stream), before);
  await assertLateSignalsAreHarmless(stream);
}

async function testCallbackErrorBeforeCloseRemainsAuthoritative() {
  const stream = new OrderedWritable(19);
  const before = listenerCounts(stream);
  const writeReceived = waitForEvent(stream, "write-received");
  const write = writeJsonOutput({ ok: false, payload: "callback-error-before-close" }, stream);
  const [completeWrite] = await writeReceived;

  completeWrite(new Error("callback-error-was-first"));
  stream.emit("close");
  await assert.rejects(bounded(write), (error) => {
    assert.equal(error.message, "callback-error-was-first");
    assert.equal(error.code, undefined);
    return true;
  });
  assert.deepEqual(listenerCounts(stream), before);
  await assertLateSignalsAreHarmless(stream);
  completeWrite(new Error("late callback error"));
  assert.deepEqual(listenerCounts(stream), before);
}

async function testCallbackBeforeCloseResolvesOnce() {
  const stream = new OrderedWritable(Number.POSITIVE_INFINITY);
  const before = listenerCounts(stream);
  const writeReceived = waitForEvent(stream, "write-received");
  const write = writeJsonOutput({ ok: true, payload: "callback-before-close" }, stream);
  const [completeWrite] = await writeReceived;

  completeWrite();
  stream.emit("close");
  await bounded(write);
  assert.deepEqual(listenerCounts(stream), before);
  await assertLateSignalsAreHarmless(stream);
}

async function testSynchronousThrowCleansListeners() {
  const stream = new ThrowingWritable();
  const before = listenerCounts(stream);
  await assert.rejects(
    bounded(writeJsonOutput({ ok: false }, stream)),
    /injected synchronous write throw/,
  );
  assert.deepEqual(listenerCounts(stream), before);
  await assertLateSignalsAreHarmless(stream);
}

async function testLargePayloadByteAndDigestEquality() {
  const stream = new ControlledWritable();
  const writeReceived = once(stream, "write-received");
  const report = {
    ok: true,
    records: Array.from({ length: 4096 }, (_, index) => ({
      id: `record-${String(index).padStart(4, "0")}`,
      value: "0123456789abcdef".repeat(8),
    })),
  };
  const expected = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
  const write = writeJsonOutput(report, stream);
  const [completeWrite] = await writeReceived;
  completeWrite();
  await write;
  const actual = Buffer.concat(stream.chunks);

  assert.equal(actual.byteLength, expected.byteLength);
  assert.equal(actual.compare(expected), 0);
  assert.equal(
    createHash("sha256").update(actual).digest("hex"),
    createHash("sha256").update(expected).digest("hex"),
  );
}

const tests = [
  ["delayed_callback_completeness", testDelayedCallbackCompleteness],
  ["writable_error_rejection", testWritableErrorRejection],
  ["stream_error_event_is_authoritative", testStreamErrorEventIsAuthoritative],
  ["close_before_callback_rejects_with_partial_bytes", testCloseBeforeCallbackRejectsWithPartialBytes],
  ["callback_error_before_close_remains_authoritative", testCallbackErrorBeforeCloseRemainsAuthoritative],
  ["callback_before_close_resolves_once", testCallbackBeforeCloseResolvesOnce],
  ["synchronous_throw_cleans_listeners", testSynchronousThrowCleansListeners],
  ["large_payload_byte_and_digest_equality", testLargePayloadByteAndDigestEquality],
];
const results = [];
for (const [name, test] of tests) {
  try {
    await test();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ error: error instanceof Error ? error.message : String(error), name, ok: false });
  }
}
const report = { ok: results.every((result) => result.ok), results };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.ok ? 0 : 1;
