#!/usr/bin/env node
// Regenerate or check consumer-reference/agent-native/v2/search-embeddings.json.
//   node scripts/agent-native/v2/generate-search-embeddings.mjs           write the file (needs the model)
//   node scripts/agent-native/v2/generate-search-embeddings.mjs --check   fail when any document text changed
//   ... --check --vectors                                                 also re-embed and compare every vector (needs the model)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { materialCorpus } from "./material-queries.mjs";
import { buildSearchIndex } from "./material-search-v3.mjs";
import { EMBEDDINGS_PATH, documentEmbeddingText, documentTextHash, embeddingsFileContent, loadEmbedder, quantize } from "./search-embeddings.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const args = new Set(process.argv.slice(2));
const index = buildSearchIndex(materialCorpus({ repositoryRoot }));

async function computeEntries() {
  const embedder = await loadEmbedder();
  if (embedder.error) throw new Error(`embedding model unavailable: ${embedder.error}`);
  const entries = [];
  for (const document of index.documents) {
    entries.push([document.record.repository_path, { text_sha256: documentTextHash(document), vector: quantize(await embedder.embed(documentEmbeddingText(document))) }]);
  }
  return entries;
}

async function main() {
  if (!args.has("--check")) {
    fs.writeFileSync(EMBEDDINGS_PATH, embeddingsFileContent(await computeEntries()));
    process.stdout.write(`wrote ${path.relative(repositoryRoot, EMBEDDINGS_PATH)} (${index.documents.length} documents)\n`);
    return;
  }
  const failures = [];
  const stored = JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, "utf8")).documents;
  const current = new Map(index.documents.map((document) => [document.record.repository_path, documentTextHash(document)]));
  for (const [key, hash] of current) {
    if (!stored[key]) failures.push(`missing vector for ${key}`);
    else if (stored[key].text_sha256 !== hash) failures.push(`stale vector for ${key}`);
  }
  for (const key of Object.keys(stored)) if (!current.has(key)) failures.push(`vector for removed document ${key}`);
  if (args.has("--vectors") && failures.length === 0) {
    const expected = embeddingsFileContent(await computeEntries());
    if (expected !== fs.readFileSync(EMBEDDINGS_PATH, "utf8")) failures.push("re-embedded vectors differ from the stored file");
  }
  if (failures.length > 0) {
    process.stdout.write(`${failures.join("\n")}\nsearch-embeddings.json is out of date; run node scripts/agent-native/v2/generate-search-embeddings.mjs\n`);
    process.exitCode = 1;
  } else process.stdout.write(`search-embeddings.json is current (${current.size} documents${args.has("--vectors") ? ", vectors re-embedded" : ""})\n`);
}

await main();
