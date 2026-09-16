import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, "design-engineering/state-management/patterns");
const patterns = fs.readdirSync(directory).filter((name) => name.endsWith(".md")).sort();

test("state pattern inventory contains twelve executable contracts", () => {
  assert.equal(patterns.length, 12);
});

for (const name of patterns) {
  test(`state model: ${name}`, () => {
    const markdown = fs.readFileSync(path.join(directory, name), "utf8");
    const blocks = [...markdown.matchAll(/^```js\n([\s\S]*?)^```\s*$/gm)];
    assert.equal(blocks.length, 1, "each pattern must have one standalone example");
    const result = spawnSync(process.execPath, ["--input-type=module"], {
      input: blocks[0][1],
      encoding: "utf8",
      cwd: root,
      timeout: 5_000,
      maxBuffer: 1024 * 1024,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  });
}
