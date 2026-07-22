import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const validator = path.join(root, "scripts", "validate-unity-org-wiki.mjs");

function run(cwd) {
  return spawnSync(process.execPath, [validator, "--json"], { cwd, encoding: "utf8" });
}

async function main() {
  const inventoryPath = path.join(root, "game-ui", "unity", "data", "unity-technologies-public-repositories.json");
  const mapPath = path.join(root, "game-ui", "unity", "repository-map.md");
  const wikiPath = path.join(root, "game-ui", "unity", "org-wiki.md");
  const inventoryText = await readFile(inventoryPath, "utf8");
  const inventory = JSON.parse(inventoryText);
  const map = await readFile(mapPath, "utf8");
  const wiki = await readFile(wikiPath, "utf8");
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "unity-org-wiki-validator-"));

  try {
    await writeFile(path.join(tempRoot, "inventory.json"), inventoryText);
    await writeFile(path.join(tempRoot, "map.md"), map);
    await writeFile(path.join(tempRoot, "wiki.md"), wiki);
    const fixtures = [
      ["wrong count", inventory.slice(1), map, wiki, "expected 804 repositories"],
      ["duplicate repository", [...inventory.slice(0, -1), inventory[0]], map, wiki, "duplicate repository identity"],
      ["NGUI inside org", [...inventory.slice(0, -1), { ...inventory.at(-1), id: 999999999, full_name: "tasharen/ngui", html_url: "https://github.com/tasharen/ngui" }], map, wiki, "NGUI must remain external"],
      ["invalid cluster", [{ ...inventory[0], primary_cluster: "unverified" }, ...inventory.slice(1)], map, wiki, "invalid primary_cluster"],
      ["absolute path", inventory, map, `${wiki}\n/Users/example/private\n`, "absolute home path"],
      ["wiki data drift", inventory, map, wiki.replaceAll("**804**", "**803**"), "wiki must state the 804-row boundary"],
      ["repository map count drift", inventory, map.replace("804 classified rows", "803 classified rows"), wiki, "repository map must state the 804-row boundary"],
      ["repository map hash drift", inventory, map.replaceAll("b1438e6e8d438bab3eff2ff02f5a10e9374fdfb89b0581ffb936a42920fa2e05", "0000000000000000000000000000000000000000000000000000000000000000"), wiki, "repository map tracked inventory hash drift"],
      ["tracked inventory hash drift", [{ ...inventory[0], stargazers_count: inventory[0].stargazers_count + 1 }, ...inventory.slice(1)], map, wiki, "tracked inventory SHA-256 mismatch"],
    ];

    for (const [name, candidateInventory, candidateMap, candidateWiki, expected] of fixtures) {
      await writeFile(path.join(tempRoot, "inventory.json"), candidateInventory === inventory ? inventoryText : JSON.stringify(candidateInventory));
      await writeFile(path.join(tempRoot, "map.md"), candidateMap);
      await writeFile(path.join(tempRoot, "wiki.md"), candidateWiki);
      const result = spawnSync(process.execPath, [validator, "--json", "--inventory", path.join(tempRoot, "inventory.json"), "--map", path.join(tempRoot, "map.md"), "--wiki", path.join(tempRoot, "wiki.md")], { cwd: root, encoding: "utf8" });
      assert.notEqual(result.status, 0, `${name} fixture unexpectedly passed`);
      assert.match(`${result.stdout}${result.stderr}`, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${name} fixture failed for the wrong reason`);
    }

    const result = run(root);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    console.log("Unity org wiki validator fixtures passed: 9 negative, 1 positive.");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

await main();
