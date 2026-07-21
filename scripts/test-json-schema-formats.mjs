#!/usr/bin/env node

import assert from "node:assert/strict";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { addDateTimeFormat, isRfc3339DateTime } from "./json-schema-formats.mjs";

test("rejects RFC3339 values whose calendar date would normalize", () => {
  for (const value of [
    "2023-02-29T12:00:00Z",
    "2023-02-30T12:00:00Z",
    "2024-04-31T12:00:00+05:30",
  ]) {
    assert.equal(isRfc3339DateTime(value), false, value);
  }
});

test("preserves valid RFC3339 offsets and fractional seconds", () => {
  for (const value of [
    "2024-02-29T23:59:59Z",
    "2024-02-29T23:59:59.123456789+05:30",
    "2024-02-29T00:00:00-04:00",
  ]) {
    assert.equal(isRfc3339DateTime(value), true, value);
  }
});

test("uses the strict validator for the AJV date-time format", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addDateTimeFormat(ajv);
  const validate = ajv.compile({
    additionalProperties: false,
    properties: { at: { format: "date-time", type: "string" } },
    required: ["at"],
    type: "object",
  });

  assert.equal(validate({ at: "2024-02-29T23:59:59.123Z" }), true);
  assert.equal(validate({ at: "2023-02-29T23:59:59.123Z" }), false);
});
