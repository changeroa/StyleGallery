#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const validator = path.join(root, "scripts", "validate-unity-source-contracts.mjs");
const documents = [
  "game-ui/unity/architecture.md",
  "game-ui/unity/cli-loop.md",
  "game-ui/unity/org-wiki.md",
  "game-ui/unity/repository-map.md",
  "game-ui/unity/ui-systems.md",
];
const originals = Object.fromEntries(documents.map((relative) => [relative, fs.readFileSync(path.join(root, relative), "utf8")]));
const fixtures = [
  {
    name: "missing CLI license attribution",
    relative: "game-ui/unity/cli-loop.md",
    mutate: (content) => content.replace(/- Source license:.*\n/, ""),
    expected: "game-ui/unity/cli-loop.md: missing pinned source license",
  },
  {
    name: "mutable CLI body citation",
    relative: "game-ui/unity/cli-loop.md",
    mutate: (content) => content.replace("https://github.com/hatayama/unity-cli-loop/blob/61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0/README.md", "https://github.com/hatayama/unity-cli-loop/blob/main/README.md"),
    expected: "game-ui/unity/cli-loop.md: GitHub body citation must use a non-zero 40-character revision: hatayama/unity-cli-loop",
  },
  {
    name: "zeroed uGUI body revisions",
    relative: "game-ui/unity/ui-systems.md",
    mutate: (content) => content.replaceAll("9edb4420267b6652090ece4c28c38bd98746a68e", "0000000000000000000000000000000000000000"),
    expected: "game-ui/unity/ui-systems.md: GitHub body citation must use a non-zero 40-character revision: Unity-Technologies/uGUI",
  },
  {
    name: "invalid reviewed date",
    relative: "game-ui/unity/architecture.md",
    mutate: (content) => content.replace("reviewed_on: 2026-07-14", "reviewed_on: never"),
    expected: "game-ui/unity/architecture.md: reviewed_on must be an ISO calendar date",
  },
];

function writeFixture(fixture) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "unity-source-contracts-"));
  for (const [relative, content] of Object.entries(originals)) {
    const target = path.join(directory, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, relative === fixture.relative ? fixture.mutate(content) : content);
  }
  return directory;
}

for (const fixture of fixtures) {
  const directory = writeFixture(fixture);
  const result = spawnSync(process.execPath, [validator, "--json", "--root", directory], { encoding: "utf8" });
  fs.rmSync(directory, { force: true, recursive: true });
  assert.notEqual(result.status, 0, `${fixture.name} unexpectedly passed`);
  const output = JSON.parse(result.stdout);
  assert(output.failures.includes(fixture.expected), `${fixture.name} failed for the wrong reason: ${result.stdout}`);
}

const positive = spawnSync(process.execPath, [validator, "--json"], { cwd: root, encoding: "utf8" });
assert.equal(positive.status, 0, positive.stderr || positive.stdout);
console.log("Unity source contract fixtures passed: 4 negative, 1 positive.");
