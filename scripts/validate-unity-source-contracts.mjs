#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { markdownLinkDestinations, structuralMarkdown } from "./markdown-structure.mjs";

const arguments_ = process.argv.slice(2);
const json = arguments_.includes("--json");
const rootIndex = arguments_.indexOf("--root");
const root = rootIndex === -1 ? process.cwd() : path.resolve(arguments_[rootIndex + 1] ?? "");
const failures = [];
const documents = [
  "game-ui/unity/architecture.md",
  "game-ui/unity/cli-loop.md",
  "game-ui/unity/org-wiki.md",
  "game-ui/unity/repository-map.md",
  "game-ui/unity/ui-systems.md",
];
const expectedRevisions = new Map([
  ["Unity-Technologies/BagelGame", "5d0348bfa013f3c76299dd582c90a7549f66abce"],
  ["Unity-Technologies/EntityComponentSystemSamples", "6786a741ee1f118ed14cecfa02beae8e926937b0"],
  ["Unity-Technologies/InputSystem", "8a57d62081cf3546b46444e17223e0121a3568b2"],
  ["Unity-Technologies/SimpleUIDemo", "c33907f1ffa0f8a30b46f958d3cf45e5da08b01c"],
  ["Unity-Technologies/UIElementsExamples", "e940d1c9dddfe99fd500c9f34f4801856ad37f18"],
  ["Unity-Technologies/UIElementsUniteCPH2019RuntimeDemo", "fa4f2c70cf2d6127ab624cc11a2742260ca6ff20"],
  ["Unity-Technologies/UIElementsUniteLATurretDemo", "1fce133fe3a3473d418066d8005c64340e9985d5"],
  ["Unity-Technologies/UIToolkitUnityRoyaleRuntimeDemo", "9b5006d2580101b4d08d59d03d7dadc697d75311"],
  ["Unity-Technologies/UnityCsReference", "79f16640303119112ca5caed4d71c607d0dff6fb"],
  ["Unity-Technologies/XR-Interaction-Toolkit-Examples", "881f7e197c7b0958621ebd1a05f249bbe254d36f"],
  ["Unity-Technologies/a11y-public-sample", "ec14cfcb8c10bafab83ea02cd17759d77b225fae"],
  ["Unity-Technologies/com.unity.uiwidgets", "0310984e947881eca6c2657f1a2fcaaa19329c22"],
  ["Unity-Technologies/uGUI", "9edb4420267b6652090ece4c28c38bd98746a68e"],
  ["Unity-Technologies/ui-toolkit-manual-code-examples", "7ed6e7af9fc8a8f83facea818f47928d2e03a30f"],
  ["Unity-Technologies/unity-industry-viewer-template", "5d50da18f68b14c4dc15bcf3d535878cc2254497"],
  ["annulusgames/UGUIAnimationSamples", "343c8110e5683be209cc01ccb4cb986175e61643"],
  ["hatayama/unity-cli-loop", "61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0"],
  ["tasharen/ngui", "9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2"],
]);

function read(relative) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) {
    failures.push(`${relative}: missing file`);
    return "";
  }
  return fs.readFileSync(target, "utf8");
}

function frontmatterValue(content, key) {
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
  return frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
}

function validateReviewedOn(relative, content) {
  const value = frontmatterValue(content, "reviewed_on");
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  if (!valid) failures.push(`${relative}: reviewed_on must be an ISO calendar date`);
}

function validatePinnedLinks(relative, content) {
  for (const destination of markdownLinkDestinations(content)) {
    const match = destination.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/(?:blob|tree)\/([^/]+)(?:\/|$)/);
    if (!match) continue;
    const [, repository, revision] = match;
    if (!/^[0-9a-f]{40}$/.test(revision) || /^0{40}$/.test(revision)) {
      failures.push(`${relative}: GitHub body citation must use a non-zero 40-character revision: ${repository}`);
      continue;
    }
    const expected = expectedRevisions.get(repository);
    if (expected && revision !== expected) failures.push(`${relative}: unexpected pinned revision for ${repository}: ${revision}`);
  }
}

function requireIncludes(relative, content, expected, label) {
  if (!content.includes(expected)) failures.push(`${relative}: missing ${label}`);
}

for (const relative of documents) {
  const content = read(relative);
  if (!content) continue;
  const body = structuralMarkdown(content);
  validateReviewedOn(relative, content);
  validatePinnedLinks(relative, body);
  requireIncludes(relative, body, "## Source, License, And Attribution", "source attribution section");
}

const architecture = structuralMarkdown(read("game-ui/unity/architecture.md"));
requireIncludes("game-ui/unity/architecture.md", architecture, "https://github.com/annulusgames/UGUIAnimationSamples/blob/343c8110e5683be209cc01ccb4cb986175e61643/LICENSE", "pinned sample license");

const cliLoop = structuralMarkdown(read("game-ui/unity/cli-loop.md"));
requireIncludes("game-ui/unity/cli-loop.md", cliLoop, "https://github.com/hatayama/unity-cli-loop/blob/61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0/README.md", "pinned adapted source");
requireIncludes("game-ui/unity/cli-loop.md", cliLoop, "https://github.com/hatayama/unity-cli-loop/blob/61a0fe6d7da0aa9d0bcbc6d95944dd069c483ff0/LICENSE.md", "pinned source license");

const uiSystems = structuralMarkdown(read("game-ui/unity/ui-systems.md"));
for (const [repository, revision, license] of [
  ["Unity-Technologies/uGUI", "9edb4420267b6652090ece4c28c38bd98746a68e", "com.unity.ugui/LICENSE.md"],
  ["Unity-Technologies/UnityCsReference", "79f16640303119112ca5caed4d71c607d0dff6fb", "LICENSE.md"],
  ["tasharen/ngui", "9bbc56f11e0e25b89fd55b9b9bc67ddf1f182fe2", "License.txt"],
]) {
  requireIncludes("game-ui/unity/ui-systems.md", uiSystems, `https://github.com/${repository}/blob/${revision}/${license}`, `pinned license for ${repository}`);
}

const result = { ok: failures.length === 0, checkedDocuments: documents.length, failures: [...new Set(failures)] };
if (json) console.log(JSON.stringify(result, null, 2));
else if (result.ok) console.log(`ok: ${result.checkedDocuments} Unity source contracts`);
else console.error(result.failures.join("\n"));
process.exit(result.ok ? 0 : 1);
