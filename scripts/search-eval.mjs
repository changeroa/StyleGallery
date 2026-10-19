#!/usr/bin/env node
// Retrieval evaluation for stylegallery search.
//   node scripts/search-eval.mjs [--ranker v3|legacy] [--mode hybrid|lexical] [--write <file>] [--gate] [--json]
// --gate re-runs the live v3 ranker and fails when a must-pass question misses
// its top 5 or Hit@5 / nDCG@5 fall more than the tolerance below eval/search/scores.json.
// In hybrid mode it also fails when the embedding model did not load, or when
// held-out or vocabulary-mismatch Hit@5 is below the recorded lexical scores.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { materialCorpus, materialSearch } from "./agent-native/v2/material-queries.mjs";
import { buildSearchIndex, prepareSemantic, rankSearchIndex, semanticQueryText } from "./agent-native/v2/material-search-v3.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUESTIONS = path.join(root, "eval", "search", "questions.json");
const SCORES = path.join(root, "eval", "search", "scores.json");
const TOLERANCE = 0.02;
const DEPTH = 10;

function parseArgs(argv) {
  const options = { ranker: "v3", mode: "hybrid", write: null, gate: false, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--ranker") options.ranker = argv[++index];
    else if (argument === "--mode") options.mode = argv[++index];
    else if (argument === "--write") options.write = argv[++index];
    else if (argument === "--gate") options.gate = true;
    else if (argument === "--json") options.json = true;
    else throw new Error(`unknown argument ${argument}`);
  }
  if (!["v3", "legacy"].includes(options.ranker)) throw new Error("--ranker must be v3 or legacy");
  if (!["hybrid", "lexical"].includes(options.mode)) throw new Error("--mode must be hybrid or lexical");
  return options;
}

function rankerFor(name, mode, fallbacks) {
  if (name === "legacy") {
    return async (question) => {
      const result = materialSearch({ repositoryRoot: root, input: { query: question.query, limit: DEPTH, paths_only: true } });
      return result.paths;
    };
  }
  const index = buildSearchIndex(materialCorpus({ repositoryRoot: root }));
  return async (question) => {
    const prepared = await prepareSemantic(index, question.query, question.query_en, mode);
    // A Korean query without query_en is lexical by design; any other fallback means the model failed.
    if (mode === "hybrid" && prepared.mode !== "hybrid" && semanticQueryText(question.query, question.query_en) !== null) fallbacks.add(prepared.reason);
    return rankSearchIndex(index, question.query, question.query_en, prepared.semantic).ranked.slice(0, DEPTH).map(({ document }) => document.record.repository_path);
  };
}

const round = (value) => Math.round(value * 10000) / 10000;

function scoreQuestion(question, paths) {
  const grade = (entry) => question.qrels[entry] ?? 0;
  const firstRelevant = paths.findIndex((entry) => grade(entry) >= 2);
  const dcg = paths.slice(0, 5).reduce((sum, entry, rank) => sum + (2 ** grade(entry) - 1) / Math.log2(rank + 2), 0);
  const ideal = Object.values(question.qrels).sort((left, right) => right - left).slice(0, 5)
    .reduce((sum, value, rank) => sum + (2 ** value - 1) / Math.log2(rank + 2), 0);
  return {
    hit3: firstRelevant >= 0 && firstRelevant < 3 ? 1 : 0,
    hit5: firstRelevant >= 0 && firstRelevant < 5 ? 1 : 0,
    rr: firstRelevant >= 0 ? 1 / (firstRelevant + 1) : 0,
    ndcg5: ideal > 0 ? dcg / ideal : 0,
  };
}

export async function evaluate(rankerName, mode = "hybrid") {
  const { questions } = JSON.parse(fs.readFileSync(QUESTIONS, "utf8"));
  const fallbacks = new Set();
  const rank = rankerFor(rankerName, mode, fallbacks);
  const rows = [];
  for (const question of questions) {
    let paths;
    try { paths = await rank(question); } catch { paths = []; }
    rows.push({ question, paths, ...scoreQuestion(question, paths) });
  }
  const mean = (subset, key) => round(subset.reduce((sum, row) => sum + row[key], 0) / Math.max(1, subset.length));
  const summarize = (subset) => ({ n: subset.length, hit3: mean(subset, "hit3"), hit5: mean(subset, "hit5"), mrr: mean(subset, "rr"), ndcg5: mean(subset, "ndcg5") });
  const mustPass = rows.filter((row) => row.question.must_pass);
  return {
    ranker: rankerName,
    ...(rankerName === "v3" ? { mode, ...(fallbacks.size ? { fallbacks: [...fallbacks].sort() } : {}) } : {}),
    overall: summarize(rows),
    english: summarize(rows.filter((row) => row.question.lang === "en")),
    korean: summarize(rows.filter((row) => row.question.lang !== "en")),
    heldout: summarize(rows.filter((row) => row.question.kind === "heldout")),
    mismatch: summarize(rows.filter((row) => row.question.kind === "mismatch")),
    must_pass: { n: mustPass.length, passed: mustPass.filter((row) => row.hit5 === 1).length },
    misses: rows.filter((row) => row.hit5 === 0).map((row) => ({ id: row.question.id, query: row.question.query, top3: row.paths.slice(0, 3), must_pass: row.question.must_pass === true })),
  };
}

function gateFailures(report) {
  const failures = [];
  for (const miss of report.misses) if (miss.must_pass) failures.push(`must-pass ${miss.id} "${miss.query}" missed the top 5 (got ${miss.top3.join(", ") || "nothing"})`);
  if (!fs.existsSync(SCORES)) {
    failures.push("eval/search/scores.json is missing; record scores with --write eval/search/scores.json");
    return failures;
  }
  const scores = JSON.parse(fs.readFileSync(SCORES, "utf8"));
  const recorded = scores[slotFor(report)]?.overall;
  if (!recorded) failures.push(`eval/search/scores.json has no ${slotFor(report)}.overall scores`);
  else {
    for (const key of ["hit5", "ndcg5"]) {
      if (report.overall[key] < recorded[key] - TOLERANCE) failures.push(`${key} ${report.overall[key]} fell below recorded ${recorded[key]} - ${TOLERANCE}`);
    }
  }
  if (report.mode === "hybrid") {
    for (const reason of report.fallbacks ?? []) failures.push(`hybrid search fell back to lexical: ${reason}`);
    for (const subset of ["heldout", "mismatch"]) {
      const lexical = scores.lexical?.[subset]?.hit5;
      if (lexical === undefined) failures.push(`eval/search/scores.json has no lexical.${subset} scores`);
      else if (report[subset].hit5 < lexical) failures.push(`hybrid ${subset} Hit@5 ${report[subset].hit5} is below lexical ${lexical}`);
    }
  }
  return failures;
}

function slotFor(report) {
  if (report.ranker === "legacy") return "before";
  return report.mode === "lexical" ? "lexical" : "after";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await evaluate(options.ranker, options.mode);
  if (options.write) {
    const target = path.resolve(root, options.write);
    const existing = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8")) : {};
    fs.writeFileSync(target, `${JSON.stringify({ ...existing, [slotFor(report)]: report }, null, 2)}\n`);
  }
  const failures = options.gate ? gateFailures(report) : [];
  if (options.json) process.stdout.write(`${JSON.stringify({ ...report, gate_failures: failures }, null, 2)}\n`);
  else {
    const line = (label, value) => `${label.padEnd(8)} n=${value.n} Hit@3=${value.hit3} Hit@5=${value.hit5} MRR=${value.mrr} nDCG@5=${value.ndcg5}`;
    process.stdout.write(`${[`ranker ${report.ranker}${report.mode ? ` mode ${report.mode}` : ""}`, line("overall", report.overall), line("english", report.english), line("korean", report.korean), line("heldout", report.heldout), line("mismatch", report.mismatch),
      `must-pass ${report.must_pass.passed}/${report.must_pass.n}`, `misses ${report.misses.map((miss) => miss.id).join(" ") || "none"}`,
      ...failures.map((failure) => `GATE FAIL: ${failure}`)].join("\n")}\n`);
  }
  if (failures.length > 0) process.exitCode = 1;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
