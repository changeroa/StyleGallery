import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = process.cwd();
const trackedInventorySha256 = "b1438e6e8d438bab3eff2ff02f5a10e9374fdfb89b0581ffb936a42920fa2e05";
const sourceInventorySha256 = "8291b471251053a8921651eb7c791d13a4794984b73670a51cdb1116deb49657";
const snapshotTimestamp = "2026-07-14T12:59:16Z";
const expectedCounts = new Map([
  ["meta-forks-mirrors", 356],
  ["meta-archived-historical", 32],
  ["game-ui-primary", 9],
  ["graphics-rendering", 38],
  ["ecs-dots", 22],
  ["networking", 21],
  ["xr-ar", 25],
  ["ml-ai", 23],
  ["robotics", 6],
  ["2d", 7],
  ["animation", 10],
  ["audio", 3],
  ["physics", 1],
  ["editor-tooling", 29],
  ["ci-infra", 2],
  ["language-runtime", 3],
  ["services-cloud", 3],
  ["platform-mobile", 9],
  ["samples-templates", 30],
  ["other-mixed-or-insufficient-metadata", 175],
]);

function parseArguments(arguments_) {
  const options = {
    inventory: path.join(root, "game-ui", "unity", "data", "unity-technologies-public-repositories.json"),
    map: path.join(root, "game-ui", "unity", "repository-map.md"),
    wiki: path.join(root, "game-ui", "unity", "org-wiki.md"),
  };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--json") continue;
    if (argument === "--inventory" || argument === "--map" || argument === "--wiki") {
      const value = arguments_[index + 1];
      if (!value) throw new Error(`${argument} requires a path`);
      options[argument.slice(2)] = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${argument}`);
  }
  return options;
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function validateInventory(inventory) {
  requireCondition(Array.isArray(inventory), "inventory must be a JSON array");
  requireCondition(inventory.length === 804, `expected 804 repositories, got ${inventory.length}`);
  const ids = new Set();
  const names = new Set();
  const counts = new Map([...expectedCounts.keys()].map((cluster) => [cluster, 0]));
  let archivedCount = 0;
  let forkCount = 0;
  let templateCount = 0;

  for (const repository of inventory) {
    requireCondition(repository && typeof repository === "object", "repository row must be an object");
    requireCondition(Number.isSafeInteger(repository.id), "repository id must be an integer");
    requireCondition(typeof repository.full_name === "string", "repository full_name must be a string");
    requireCondition(!ids.has(repository.id) && !names.has(repository.full_name), `duplicate repository identity: ${repository.full_name}`);
    requireCondition(repository.full_name !== "tasharen/ngui", "NGUI must remain external to the Unity-Technologies inventory");
    requireCondition(repository.full_name.startsWith("Unity-Technologies/"), `repository outside Unity-Technologies: ${repository.full_name}`);
    requireCondition(repository.html_url === `https://github.com/${repository.full_name}`, `repository URL mismatch: ${repository.full_name}`);
    requireCondition(repository.capture_timestamp === snapshotTimestamp, `snapshot timestamp mismatch: ${repository.full_name}`);
    requireCondition(expectedCounts.has(repository.primary_cluster), `invalid primary_cluster: ${repository.primary_cluster}`);
    requireCondition(typeof repository.ui_relevance === "string" && repository.ui_relevance.length > 0, `UI relevance missing: ${repository.full_name}`);
    requireCondition(typeof repository.ui_disposition_reason === "string" && repository.ui_disposition_reason.length > 0, `UI disposition reason missing: ${repository.full_name}`);
    requireCondition(Array.isArray(repository.representative_ui_paths), `representative UI paths must be an array: ${repository.full_name}`);
    ids.add(repository.id);
    names.add(repository.full_name);
    counts.set(repository.primary_cluster, counts.get(repository.primary_cluster) + 1);
    if (repository.archived) archivedCount += 1;
    if (repository.fork) forkCount += 1;
    if (repository.is_template) templateCount += 1;
  }

  for (const [cluster, expected] of expectedCounts) {
    requireCondition(counts.get(cluster) === expected, `cluster count mismatch for ${cluster}: expected ${expected}, got ${counts.get(cluster)}`);
  }
  requireCondition(archivedCount === 59, `archived repository count mismatch: expected 59, got ${archivedCount}`);
  requireCondition(forkCount === 356, `fork repository count mismatch: expected 356, got ${forkCount}`);
  requireCondition(templateCount === 4, `template repository count mismatch: expected 4, got ${templateCount}`);
  return { archivedCount, counts: Object.fromEntries(counts), forkCount, templateCount };
}

function validatePublication(content, label) {
  requireCondition(content.includes("804"), `${label} must state the 804-row boundary`);
  const sourceHashes = [...content.matchAll(/(?:pre-projection|before tracked projection)[^`\n]*SHA-256(?: was)? `([0-9a-f]{64})`/g)].map((match) => match[1]);
  const trackedHashes = [...content.matchAll(/tracked JSON[^`\n]*SHA-256(?: is)? `([0-9a-f]{64})`/g)].map((match) => match[1]);
  requireCondition(sourceHashes.length > 0 && sourceHashes.every((hash) => hash === sourceInventorySha256), `${label} source inventory hash drift`);
  requireCondition(trackedHashes.length > 0 && trackedHashes.every((hash) => hash === trackedInventorySha256), `${label} tracked inventory hash drift`);
  requireCondition(content.includes(snapshotTimestamp), `${label} snapshot timestamp drift`);
  requireCondition(content.includes("59 archived") && content.includes("356 forks") && content.includes("4 templates"), `${label} lifecycle totals drift`);
}

function validateWiki(wiki) {
  requireCondition(wiki.includes("**804**"), "wiki must state the 804-row boundary");
  requireCondition(wiki.includes("Independent research — not affiliated with or endorsed by Unity Technologies"), "wiki must state the non-affiliation boundary");
  requireCondition(wiki.includes("tasharen/ngui") && wiki.includes("outside the Unity-Technologies 804-repository inventory"), "wiki must keep NGUI external");
  requireCondition(wiki.includes("data/unity-technologies-public-repositories.json"), "wiki must link the tracked inventory");
  requireCondition(!wiki.includes(".omo/"), "tracked wiki must not depend on .omo research paths");
  requireCondition(!/(?:\/Users\/|\/home\/|[A-Za-z]:\\Users\\)/.test(wiki), "absolute home path found in wiki");
  for (const [cluster, count] of expectedCounts) {
    requireCondition(wiki.includes(`| \`${cluster}\` | ${count} |`), `wiki cluster table drift: ${cluster}`);
  }
  validatePublication(wiki, "wiki");
}

function validateMap(map) {
  requireCondition(map.includes("data/unity-technologies-public-repositories.json"), "repository map must link the tracked inventory");
  requireCondition(map.includes("804 classified rows"), "repository map must state the 804-row boundary");
  validatePublication(map, "repository map");
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    const [inventoryText, map, wiki] = await Promise.all([
      readFile(options.inventory, "utf8"),
      readFile(options.map, "utf8"),
      readFile(options.wiki, "utf8"),
    ]);
    const stats = validateInventory(JSON.parse(inventoryText));
    const inventorySha256 = createHash("sha256").update(inventoryText).digest("hex");
    requireCondition(inventorySha256 === trackedInventorySha256, `tracked inventory SHA-256 mismatch: expected ${trackedInventorySha256}, got ${inventorySha256}`);
    validateMap(map);
    validateWiki(wiki);
    console.log(JSON.stringify({ ok: true, repositories: 804, uniqueIds: 804, uniqueNames: 804, inventorySha256, clusterTotal: Object.values(stats.counts).reduce((sum, value) => sum + value, 0), ...stats }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  }
}

await main();
