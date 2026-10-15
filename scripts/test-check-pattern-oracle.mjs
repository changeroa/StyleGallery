#!/usr/bin/env node
// Self-test for scripts/check-pattern-oracle.mjs: the committed scroll-body-shell fixture must pass,
// and each mutated copy must fail with only the targeted check's failures.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkPatternOracle } from "./check-pattern-oracle.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(repositoryRoot, "tests/fixtures/pattern-oracle/scroll-body-shell/index.html"), "utf8");
const change = (before, after) => (content) => {
  assert.ok(content.includes(before), `fixture mutation target missing: ${before}`);
  return content.replace(before, after);
};
const shellRule = ".scroll_body_shell {\n    block-size: 100dvh;\n    display: grid;\n    grid-template-rows: auto minmax(0, 1fr) auto;\n    max-block-size: 100dvh;\n}";

const cases = [
  { name: "valid", mutate: null, expected: null },
  { name: "root-scrolls", mutate: change(shellRule, ".scroll_body_shell {\n    display: grid;\n}"), expected: /scroll owner does not scroll|document root overflows/ },
  { name: "focus-order", mutate: change('<button type="button">Load older messages</button>', '<button type="button" tabindex="1">Load older messages</button>'), expected: /out of DOM order|axe serious tabindex/ },
  // The body is a scroll container and absorbs wide content by design; the footer is not, so a
  // wide footer child forces the document root to overflow horizontally.
  { name: "horizontal-overflow", mutate: change('<footer class="scroll_body_shell_footer">', '<footer class="scroll_body_shell_footer"><div style="inline-size:2000px;block-size:1px"></div>'), expected: /horizontal overflow/ },
];

const root = fs.mkdtempSync(path.join(os.tmpdir(), "pattern-oracle-selftest-"));
const results = [];
try {
  for (const testCase of cases) {
    const dir = path.join(root, testCase.name);
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "index.html"), testCase.mutate ? testCase.mutate(source) : source);
    const result = await checkPatternOracle({ root, pattern: testCase.name });
    try {
      if (testCase.expected === null) assert.deepEqual(result.failures, [], `${testCase.name}: expected no failures`);
      else {
        assert.ok(result.failures.length > 0, `${testCase.name}: expected failures matching ${testCase.expected}`);
        const stray = result.failures.filter((failure) => !testCase.expected.test(failure));
        assert.deepEqual(stray, [], `${testCase.name}: failures outside the targeted check`);
      }
      results.push({ name: testCase.name, ok: true });
    } catch (error) {
      results.push({ name: testCase.name, ok: false, message: error.message, failures: result.failures });
    }
  }
  const missing = await checkPatternOracle({ root, pattern: "absent" });
  results.push({ name: "missing-fixture", ok: !missing.ok && missing.failures.some((failure) => failure.includes("missing fixture")) });
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
const report = { ok: results.every(({ ok }) => ok), cases: results.length, failures: results.filter(({ ok }) => !ok) };
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;
