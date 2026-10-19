#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { materialCorpus } from "./agent-native/v2/material-queries.mjs";
import {
  SEARCH_BUDGET_BYTES, buildSearchIndex, frontmatterList, parseSections, readIndex, readableIds, searchIndex, searchTerms, semanticQueryText,
} from "./agent-native/v2/material-search-v3.mjs";
import { createTokenizer, dequantize, quantize } from "./agent-native/v2/search-embeddings.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const index = buildSearchIndex(materialCorpus({ repositoryRoot: root }));
const cli = (...args) => spawnSync(process.execPath, [path.join(root, "scripts", "sg-entry.mjs"), ...args], { cwd: root, encoding: "utf8" });

test("readable ids are unique, readable, and fall back to the path on name collisions", () => {
  const ids = readableIds(index.documents.map(({ record }) => record));
  assert.equal(new Set(ids.values()).size, index.documents.length);
  assert.equal(ids.get("patterns/viewport-shell/sticky-header.md"), "sg:layout/sticky-header");
  assert.equal(ids.get("recipes/list-detail.md"), "sg:layout/recipes-list-detail");
  assert.equal(ids.get("patterns/split-sidebar/list-detail.md"), "sg:layout/patterns-split-sidebar-list-detail");
  for (const id of ids.values()) assert.match(id, /^sg:[a-z-]+\/[a-z0-9-]+$/);
});

test("terms drop stopwords and stem plurals and -ing", () => {
  assert.deepEqual(searchTerms("How do I keep the Headers scrolling"), ["keep", "header", "scroll"]);
  assert.deepEqual(frontmatterList('["a", "헤더 고정"]'), ["a", "헤더 고정"]);
  assert.deepEqual(frontmatterList("not a list"), []);
});

test("English and Korean queries rank sticky-header first", () => {
  for (const query of ["sticky header", "헤더 고정"]) {
    const result = searchIndex(index, { query });
    assert.equal(result.schema_version, "3.0");
    assert.equal(result.results[0].id, "sg:layout/sticky-header", query);
    assert.ok(result.results[0].snippets[0].text.length <= 500);
    assert.match(result.results[0].next.read, /^stylegallery read sg:layout\/sticky-header/);
  }
});

test("search is deterministic, bounded, and concise by default", () => {
  const first = searchIndex(index, { query: "responsive card grid", limit: 50 });
  assert.deepEqual(searchIndex(index, { query: "responsive card grid", limit: 50 }), first);
  assert.ok(Buffer.byteLength(JSON.stringify(first)) <= SEARCH_BUDGET_BYTES);
  assert.equal(first.results[0].score, undefined);
  assert.equal(typeof searchIndex(index, { query: "card grid", response_format: "detailed" }).results[0].score, "number");
  assert.deepEqual(searchIndex(index, { query: "sticky header", paths_only: true, limit: 1 }).paths, ["patterns/viewport-shell/sticky-header.md"]);
});

test("no match is ok with a query_en hint for Korean", () => {
  const result = searchIndex(index, { query: "존재하지않는낱말" });
  assert.deepEqual(result.results, []);
  assert.match(result.hint, /query_en/);
});

test("hybrid input falls back to lexical with a reason, and mode is validated", () => {
  const lexical = searchIndex(index, { query: "sticky header", mode: "lexical" });
  assert.equal(lexical.mode, "lexical");
  assert.equal(lexical.mode_reason, undefined);
  const fallback = searchIndex(index, { query: "sticky header" }, { mode: "lexical", semantic: null, reason: "test reason" });
  assert.equal(fallback.mode, "lexical");
  assert.equal(fallback.mode_reason, "test reason");
  assert.deepEqual(fallback.results, lexical.results);
  assert.throws(() => searchIndex(index, { query: "x", mode: "vector" }), { code: "search_mode_invalid" });
  assert.equal(semanticQueryText("헤더 고정"), null);
  assert.equal(semanticQueryText("헤더 고정", "sticky header"), "sticky header");
});

test("semantic fusion adds documents BM25F missed, deterministically", () => {
  const target = index.documents.find((document) => document.record.repository_path === "patterns/split-sidebar/sidebar.md");
  const vectors = new Map(index.documents.map((document) => [document.id, Float32Array.from({ length: 4 }, (_, position) => (document === target ? Number(position === 0) : Number(position === 1)))]));
  const prepared = { mode: "hybrid", semantic: { queryVector: [1, 0, 0, 0], vectors } };
  const result = searchIndex(index, { query: "zzzzqx", response_format: "detailed" }, prepared);
  assert.equal(result.mode, "hybrid");
  assert.equal(result.results[0].path, "patterns/split-sidebar/sidebar.md");
  assert.deepEqual(result.results[0].matched_fields, ["semantic"]);
  assert.equal(result.ranking.fusion.method, "RRF");
  assert.deepEqual(searchIndex(index, { query: "zzzzqx", response_format: "detailed" }, prepared), result);
});

test("WordPiece tokenizer and int8 vectors round-trip", () => {
  const vocab = { "[PAD]": 0, "[UNK]": 1, "[CLS]": 2, "[SEP]": 3, side: 4, "##bar": 5, ",": 6, cafe: 7 };
  const tokenize = createTokenizer({ model: { vocab } });
  assert.deepEqual(tokenize("Sidebar, CAFÉ zzz"), [2, 4, 5, 6, 7, 1, 3]);
  const vector = [0.5, -0.25, 1, -1];
  assert.deepEqual(Array.from(dequantize(quantize(vector)), (value) => Math.round(value * 100) / 100), [0.5, -0.25, 1, -1]);
});

test("the CLI warns and searches lexically when the model cannot be loaded offline", () => {
  const cache = fs.mkdtempSync(path.join(os.tmpdir(), "sg-search-cache-"));
  try {
    const env = { ...process.env, STYLEGALLERY_CACHE_DIR: cache, STYLEGALLERY_OFFLINE: "1" };
    const run = spawnSync(process.execPath, [path.join(root, "scripts", "sg-entry.mjs"), "search", "sticky header", "--paths-only"], { cwd: root, encoding: "utf8", env });
    assert.equal(run.status, 0, run.stdout);
    const result = JSON.parse(run.stdout).result;
    assert.equal(result.mode, "lexical");
    assert.match(result.mode_reason, /STYLEGALLERY_OFFLINE|onnxruntime-web/);
    assert.match(run.stderr, /hybrid search unavailable/);
    assert.equal(result.paths[0], "patterns/viewport-shell/sticky-header.md");
  } finally { fs.rmSync(cache, { recursive: true, force: true }); }
});

test("read resolves ids, paths, and StableRefs and reads one section", () => {
  const byPath = readIndex(index, { reference: "patterns/viewport-shell/sticky-header.md", outline: true });
  assert.equal(byPath.id, "sg:layout/sticky-header");
  assert.ok(byPath.outline.some(({ slug }) => slug === "css"));
  const section = readIndex(index, { reference: "sg:layout/sticky-header", section: "css" });
  assert.match(section.content, /^## CSS\n/);
  assert.match(section.content, /position: sticky/);
  assert.throws(() => readIndex(index, { reference: "sg:layout/sticky-header", section: "nope" }), { code: "read_section_not_found" });
  assert.throws(() => readIndex(index, { reference: "sg:layout/missing" }), { code: "read_reference_not_found" });
});

test("sections ignore headings inside fenced code", () => {
  const sections = parseSections("# A\n```md\n# not a heading\n```\n## B\ntext\n## B\n");
  assert.deepEqual(sections.map(({ slug }) => slug), ["a", "b", "b-2"]);
});

test("the stylegallery CLI prints help, version, search, and read", () => {
  const help = cli("--help");
  assert.equal(help.status, 0);
  assert.match(help.stdout, /^stylegallery - /);
  const version = cli("--version");
  assert.equal(version.status, 0);
  assert.match(version.stdout, /^\d+\.\d+\.\d+\n$/);
  const search = cli("search", "헤더", "고정", "--limit", "1");
  assert.equal(search.status, 0, search.stdout);
  assert.equal(JSON.parse(search.stdout).result.results[0].id, "sg:layout/sticky-header");
  const read = cli("read", "sg:layout/sticky-header", "--section", "css");
  assert.equal(JSON.parse(read.stdout).result.section.slug, "css");
  const bad = cli("search", "x", "--bogus");
  assert.equal(bad.status, 1);
  assert.equal(JSON.parse(bad.stdout).failures[0].code, "argument_unknown");
});
