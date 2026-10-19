// Search v3: readable IDs, BM25F field ranking, section-aware read.
// Offline and deterministic: no model, no network, stable tie-breaks.
import { deepFreeze } from "../canonical-json.mjs";
import { MaterialQueryError, materialCorpus, tokenizeMaterialText } from "./material-queries.mjs";

export const SEARCH_SCHEMA_VERSION = "3.0";
export const SEARCH_DEFAULT_LIMIT = 5;
export const SEARCH_MAX_LIMIT = 50;
export const SEARCH_SNIPPET_CHARS = 500;
export const SEARCH_BUDGET_BYTES = 16 * 1024;
export const READ_MAX_CHARS = 64 * 1024;
const QUERY_MAX_BYTES = 4096;

// Field weight (w) and length normalization (b) for BM25F. `ko` holds Hangul
// 2-grams taken only from Korean aliases, questions, and titles.
export const SEARCH_FIELDS = deepFreeze({
  title: { w: 4, b: 0.3 },
  aliases: { w: 4, b: 0.3 },
  description: { w: 2.5, b: 0.5 },
  questions: { w: 2.5, b: 0.5 },
  path: { w: 2, b: 0.3 },
  headings: { w: 1.5, b: 0.6 },
  body: { w: 1, b: 0.75 },
  ko: { w: 1.5, b: 0.3 },
});
export const SEARCH_K1 = 1.2;

const STOPWORDS = new Set(("a an and are as at be by can do does for from how i in into is it its me my of on or should "
  + "so that the this to use using what when where which with you your").split(" "));
const HANGUL = /^[\p{Script=Hangul}]+$/u;
const KO_PREFIX = "\u0001ko:";

function fail(code, message) { throw new MaterialQueryError(code, message); }
function compare(left, right) { return left < right ? -1 : left > right ? 1 : 0; }

function stem(token) {
  if (!/^[a-z]+$/.test(token) || token.length <= 3) return token;
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (/(?:ss|us|is)$/.test(token)) return token;
  if (/(?:sh|ch|x|z)es$/.test(token)) return token.slice(0, -2);
  if (token.endsWith("s")) return token.slice(0, -1);
  let base = token;
  if (token.length > 5 && token.endsWith("ing")) base = token.slice(0, -3);
  else if (token.length > 4 && token.endsWith("ed") && !token.endsWith("eed")) base = token.slice(0, -2);
  else return token;
  return /([b-df-hj-km-rtv-y])\1$/.test(base) ? base.slice(0, -1) : base;
}

/** Terms for ranking: tokenizer words, stopwords removed, light English plural stemming. */
export function searchTerms(value) {
  return tokenizeMaterialText(value).filter((token) => !STOPWORDS.has(token)).map(stem);
}

function hangulBigrams(value) {
  const grams = [];
  for (const token of tokenizeMaterialText(value)) {
    if (!HANGUL.test(token)) continue;
    const chars = [...token];
    if (chars.length === 1) grams.push(`${KO_PREFIX}${token}`);
    for (let index = 0; index + 1 < chars.length; index += 1) grams.push(`${KO_PREFIX}${chars[index]}${chars[index + 1]}`);
  }
  return grams;
}

export function parseFrontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text);
  const fields = {};
  if (!match) return { fields, bodyStart: 0, bodyLine: 1 };
  for (const line of match[1].split("\n")) {
    const index = line.indexOf(":");
    if (index <= 0 || /^\s/.test(line)) continue;
    fields[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return { fields, bodyStart: match[0].length, bodyLine: match[0].split("\n").length - (match[0].endsWith("\n") ? 1 : 0) + 1 };
}

function unquote(value = "") { return value.replace(/^(["'])(.*)\1$/, "$2"); }

/** Parse a JSON flow list such as ["sticky header", "헤더 고정"]; anything else yields []. */
export function frontmatterList(value) {
  if (typeof value !== "string" || !value.startsWith("[")) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.trim().length > 0) : [];
  } catch { return []; }
}

export function headingSlug(text) {
  return text.normalize("NFKC").toLowerCase().replace(/[`*_~[\]()]/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");
}

/** Headings outside fenced code, with stable unique slugs and 1-based line ranges. */
export function parseSections(text) {
  const lines = text.split("\n");
  const { bodyLine } = parseFrontmatter(text);
  const sections = [];
  const seen = new Map();
  let fence = null;
  for (let index = bodyLine - 1; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = /^\s*(```|~~~)/.exec(line);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1];
      else if (fence === fenceMatch[1]) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!heading) continue;
    const base = headingSlug(heading[2]) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    sections.push({ level: heading[1].length, title: heading[2], slug: count === 0 ? base : `${base}-${count + 1}`, line_start: index + 1 });
  }
  for (let index = 0; index < sections.length; index += 1) {
    const next = sections.slice(index + 1).find((candidate) => candidate.level <= sections[index].level);
    sections[index].line_end = next ? next.line_start - 1 : lines.length;
  }
  return sections;
}

const DOMAIN_ROOTS = ["layout", "motion", "design-engineering", "platform-guides", "design-terminology", "expression"];
function slugPart(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }

function longSlug(repositoryPath, domain) {
  let rest = repositoryPath.replace(/\.md$/, "");
  if (rest.startsWith(`${domain}/`)) rest = rest.slice(domain.length + 1);
  rest = rest.replace(/(^|\/)index$/, "") || "index";
  return slugPart(rest.replaceAll("/", "-"));
}

function shortSlug(repositoryPath, domain) {
  const parts = repositoryPath.replace(/\.md$/, "").split("/");
  let base = parts.at(-1);
  if (base === "index") base = parts.length > 1 ? parts.at(-2) : "index";
  if (base === domain && DOMAIN_ROOTS.includes(domain) && parts.length === 2) base = "index";
  return slugPart(base);
}

/** Readable IDs `sg:<domain>/<slug>`: file basename, or the path-derived slug when basenames collide. */
export function readableIds(records) {
  const groups = new Map();
  for (const record of records) {
    const key = `${record.domain}/${shortSlug(record.repository_path, record.domain)}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  const ids = new Map();
  for (const [key, members] of groups) {
    for (const record of members) ids.set(record.repository_path, members.length === 1 ? `sg:${key}` : `sg:${record.domain}/${longSlug(record.repository_path, record.domain)}`);
  }
  const unique = new Set(ids.values());
  if (unique.size !== ids.size) fail("search_id_collision", "readable search IDs are not unique");
  return ids;
}

function counts(terms) {
  const map = new Map();
  for (const term of terms) map.set(term, (map.get(term) ?? 0) + 1);
  return map;
}

function buildDocument(entry, id) {
  const { record, identity, text } = entry;
  const { fields: meta, bodyStart } = parseFrontmatter(text);
  const body = text.slice(bodyStart);
  const sections = parseSections(text);
  const title = unquote(meta.title) || sections[0]?.title || record.repository_path;
  const description = unquote(meta.description);
  const aliases = frontmatterList(meta.aliases);
  const questions = frontmatterList(meta.questions);
  const fieldText = {
    title, description, aliases: aliases.join("\n"), questions: questions.join("\n"),
    path: record.repository_path.replace(/[/.\-_]/g, " "), headings: sections.map((section) => section.title).join("\n"), body,
  };
  const fields = {};
  for (const [name, value] of Object.entries(fieldText)) {
    const terms = searchTerms(value);
    fields[name] = { tf: counts(terms), length: terms.length };
  }
  const ko = hangulBigrams([...aliases, ...questions, title].join("\n"));
  fields.ko = { tf: counts(ko), length: ko.length };
  return { id, record, identity, text, title, description, aliases, questions, sections, fields };
}

/** Build the ranked index once per corpus read. */
export function buildSearchIndex(corpus) {
  const ids = readableIds(corpus.documents.map(({ record }) => record));
  const documents = corpus.documents.map((entry) => buildDocument(entry, ids.get(entry.record.repository_path)))
    .sort((left, right) => compare(left.id, right.id));
  const averages = {};
  for (const name of Object.keys(SEARCH_FIELDS)) {
    averages[name] = documents.reduce((sum, document) => sum + document.fields[name].length, 0) / Math.max(1, documents.length) || 1;
  }
  return { manifestVersionId: corpus.manifestVersionId, documents, averages, byId: new Map(documents.map((document) => [document.id, document])) };
}

function queryTerms(query, queryEn) {
  const text = [query, queryEn].filter(Boolean).join("\n");
  return [...new Set([...searchTerms(text), ...hangulBigrams(query)])].sort();
}

function scoreDocument(index, document, terms, idf) {
  let score = 0;
  const matched = new Set();
  let koTotal = 0;
  let koHits = 0;
  for (const term of terms) {
    if (term.startsWith(KO_PREFIX)) {
      koTotal += 1;
      if (document.fields.ko.tf.has(term)) koHits += 1;
    }
    let weighted = 0;
    for (const [name, { w, b }] of Object.entries(SEARCH_FIELDS)) {
      const isKo = term.startsWith(KO_PREFIX);
      if (isKo !== (name === "ko")) continue;
      const field = document.fields[name];
      const tf = field.tf.get(term) ?? 0;
      if (tf === 0) continue;
      matched.add(name);
      weighted += (w * tf) / (1 - b + (b * field.length) / index.averages[name]);
    }
    if (weighted > 0) score += idf.get(term) * (weighted / (SEARCH_K1 + weighted));
  }
  // A stray shared syllable pair is not a match: 2-gram-only hits need half the query's 2-grams.
  if (matched.size === 1 && matched.has("ko") && koHits * 2 < koTotal) return { score: 0, matched };
  return { score: Math.round(score * 1e6) / 1e6, matched };
}

function inverseDocumentFrequency(index, terms) {
  const total = index.documents.length;
  return new Map(terms.map((term) => {
    const df = index.documents.reduce((count, document) => count + Number(Object.values(document.fields).some((field) => field.tf.has(term))), 0);
    return [term, Math.log(1 + (total - df + 0.5) / (df + 0.5))];
  }));
}

function bestSnippet(document, terms) {
  const lines = document.text.split("\n");
  const termSet = new Set(terms.filter((term) => !term.startsWith(KO_PREFIX)));
  const lineHits = (line) => searchTerms(line).filter((term) => termSet.has(term)).length;
  // A section's own text stops at the next heading of any level.
  const ownEnd = (section) => {
    const next = document.sections.find((candidate) => candidate.line_start > section.line_start);
    return next ? next.line_start - 1 : section.line_end;
  };
  let best = null;
  for (const section of document.sections) {
    const own = lines.slice(section.line_start, ownEnd(section));
    const hits = lineHits(section.title) * 2 + own.reduce((sum, line) => sum + lineHits(line), 0);
    if (hits > 0 && (!best || hits > best.hits)) best = { section, hits };
  }
  const section = best?.section ?? document.sections.find((candidate) => candidate.level > 1) ?? document.sections[0];
  if (!section) return null;
  const start = section.line_start + 1;
  const end = ownEnd(section);
  let first = start;
  for (let line = start; line <= end; line += 1) if (lineHits(lines[line - 1]) > 0) { first = line; break; }
  while (first <= end && lines[first - 1].trim() === "") first += 1;
  let text = "";
  let last = first - 1;
  for (let line = first; line <= end && text.length < SEARCH_SNIPPET_CHARS; line += 1) {
    text += `${text ? "\n" : ""}${lines[line - 1]}`;
    last = line;
  }
  text = text.trimEnd();
  if (text.length > SEARCH_SNIPPET_CHARS) text = `${[...text].slice(0, SEARCH_SNIPPET_CHARS - 1).join("")}…`;
  const headingPath = [];
  for (const candidate of document.sections) {
    if (candidate.line_start > section.line_start) break;
    while (headingPath.length && headingPath.at(-1).level >= candidate.level) headingPath.pop();
    headingPath.push(candidate);
  }
  return { section, snippet: { heading_path: headingPath.map((item) => item.title), line_start: first, line_end: Math.max(first, last), text } };
}

function validateSearchInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("material_input_invalid", "input must be an object");
  const allowed = new Set(["query", "query_en", "limit", "paths_only", "response_format"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) fail("material_input_unknown", "input contains an unsupported field");
  for (const key of ["query", "query_en"]) {
    const value = input[key];
    if (value === undefined && key === "query_en") continue;
    if (typeof value !== "string") fail("material_query_invalid", `${key} must be a string`);
    if (Buffer.byteLength(value, "utf8") > QUERY_MAX_BYTES) fail("material_query_oversized", `${key} exceeds 4096 UTF-8 bytes`);
  }
  if (tokenizeMaterialText(input.query, { query: true }).length === 0) fail("material_query_empty", "query must contain a Unicode word token");
  const limit = input.limit ?? SEARCH_DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > SEARCH_MAX_LIMIT) fail("search_limit_invalid", `limit must be an integer from 1 to ${SEARCH_MAX_LIMIT}`);
  if (input.paths_only !== undefined && typeof input.paths_only !== "boolean") fail("material_paths_only_invalid", "paths_only must be a boolean");
  const format = input.response_format ?? "concise";
  if (!["concise", "detailed"].includes(format)) fail("search_response_format_invalid", "response_format must be concise or detailed");
  return { query: input.query, queryEn: input.query_en, limit, pathsOnly: input.paths_only === true, detailed: format === "detailed" };
}

/** Rank documents for a query. Pure over an index; exported for evaluation. */
export function rankSearchIndex(index, query, queryEn) {
  const terms = queryTerms(query, queryEn);
  const idf = inverseDocumentFrequency(index, terms);
  const ranked = [];
  for (const document of index.documents) {
    const { score, matched } = scoreDocument(index, document, terms, idf);
    if (score > 0) ranked.push({ document, score, matched });
  }
  ranked.sort((left, right) => right.score - left.score || compare(left.document.id, right.document.id));
  return { terms, ranked };
}

function readCommand(document, section) {
  return `stylegallery read ${document.id}${section && section.level > 1 ? ` --section ${section.slug}` : ""}`;
}

export function searchIndex(index, input) {
  const normalized = validateSearchInput(input);
  const { terms, ranked } = rankSearchIndex(index, normalized.query, normalized.queryEn);
  const selected = ranked.slice(0, normalized.limit);
  const query = { text: normalized.query, ...(normalized.queryEn ? { query_en: normalized.queryEn } : {}) };
  const page = { returned: selected.length, total: ranked.length, next_cursor: null };
  if (normalized.pathsOnly) {
    return deepFreeze({ schema_version: SEARCH_SCHEMA_VERSION, query, snapshot: index.manifestVersionId, paths: selected.map(({ document }) => document.record.repository_path), page });
  }
  const results = selected.map(({ document, score, matched }) => {
    const best = bestSnippet(document, terms);
    return {
      id: document.id,
      path: document.record.repository_path,
      title: document.title,
      ...(document.description ? { description: document.description } : {}),
      domain: document.record.domain,
      matched_fields: [...matched].sort(),
      snippets: best ? [best.snippet] : [],
      next: { read: readCommand(document, best?.section) },
      ...(normalized.detailed ? { score, source_ref: document.record.stable_ref, version_id: document.record.version_id, material_ref: document.identity.stable_ref } : {}),
    };
  });
  const envelope = { schema_version: SEARCH_SCHEMA_VERSION, query, snapshot: index.manifestVersionId, results, page, coverage: { truncated: false } };
  if (normalized.detailed) envelope.ranking = { method: "BM25F", k1: SEARCH_K1, fields: SEARCH_FIELDS, terms };
  while (Buffer.byteLength(JSON.stringify(envelope), "utf8") > SEARCH_BUDGET_BYTES && envelope.results.length > 1) {
    envelope.results.pop();
    envelope.page.returned = envelope.results.length;
    envelope.coverage.truncated = true;
  }
  if (results.length === 0) {
    envelope.hint = /[\p{Script=Hangul}]/u.test(normalized.query) && !normalized.queryEn
      ? "No match. Retry with query_en: an English rewrite of the question (e.g. --query-en \"sticky header\")."
      : "No match. Try fewer or broader words, or browse a domain with stylegallery discover.";
  }
  return deepFreeze(envelope);
}

function resolveDocument(index, reference) {
  if (typeof reference !== "string" || reference.length === 0) fail("read_reference_required", "reference is required");
  const direct = index.byId.get(reference);
  if (direct) return direct;
  const clean = reference.replace(/^\.\//, "");
  const found = index.documents.find((document) => document.record.repository_path === clean
    || document.record.stable_ref === reference || document.identity.stable_ref === reference);
  if (!found) fail("read_reference_not_found", "no admitted document has this id, path, or StableRef; run stylegallery search first");
  return found;
}

function validateReadInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("material_input_invalid", "input must be an object");
  const allowed = new Set(["reference", "section", "outline"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) fail("material_input_unknown", "input contains an unsupported field");
  if (input.section !== undefined && (typeof input.section !== "string" || input.section.length === 0)) fail("read_section_invalid", "section must be a heading slug");
  if (input.outline !== undefined && typeof input.outline !== "boolean") fail("read_outline_invalid", "outline must be a boolean");
  if (input.section !== undefined && input.outline === true) fail("read_mode_conflict", "use either section or outline");
  return input;
}

export function readIndex(index, input) {
  const normalized = validateReadInput(input);
  const document = resolveDocument(index, normalized.reference);
  const head = { schema_version: SEARCH_SCHEMA_VERSION, id: document.id, path: document.record.repository_path, title: document.title, snapshot: index.manifestVersionId, version_id: document.record.version_id };
  const outline = document.sections.map(({ level, title, slug, line_start, line_end }) => ({ level, title, slug, line_start, line_end }));
  if (normalized.outline) return deepFreeze({ ...head, outline, next: { read: outline[1] ? `stylegallery read ${document.id} --section ${outline[1].slug}` : `stylegallery read ${document.id}` } });
  const lines = document.text.split("\n");
  if (normalized.section !== undefined) {
    const section = document.sections.find((candidate) => candidate.slug === normalized.section);
    if (!section) fail("read_section_not_found", `section not found; valid slugs: ${document.sections.map((item) => item.slug).join(", ")}`);
    return deepFreeze({ ...head, section: { title: section.title, slug: section.slug, line_start: section.line_start, line_end: section.line_end }, content: lines.slice(section.line_start - 1, section.line_end).join("\n") });
  }
  const truncated = document.text.length > READ_MAX_CHARS;
  return deepFreeze({
    ...head, content: truncated ? document.text.slice(0, READ_MAX_CHARS) : document.text, truncated,
    ...(truncated ? { hint: `content truncated at ${READ_MAX_CHARS} characters; read one part with --section (see --outline)` } : {}),
  });
}

/** Load the admitted corpus with source checks and build the index. */
export function loadSearchIndex(options) {
  return buildSearchIndex(materialCorpus(options));
}

const PUBLIC_CODES = new Set(["material_input_invalid", "material_input_unknown", "material_query_invalid", "material_query_oversized",
  "material_query_empty", "search_limit_invalid", "material_paths_only_invalid", "search_response_format_invalid", "read_reference_required",
  "read_reference_not_found", "read_section_invalid", "read_outline_invalid", "read_mode_conflict", "read_section_not_found", "search_id_collision"]);

/** Run `search` or `read` and wrap it in the ok/failures envelope shared by CLI and MCP. */
export function invokeSearchOperation(operation, input, options) {
  try {
    const index = loadSearchIndex(options);
    const result = operation === "search" ? searchIndex(index, input) : readIndex(index, input);
    return deepFreeze({ ok: true, operation, result });
  } catch (error) {
    const known = typeof error?.code === "string" && (PUBLIC_CODES.has(error.code) || error.code.startsWith("material_"));
    return deepFreeze({ ok: false, operation, failures: [{ code: known ? error.code : `${operation}_failed`, message: known ? error.message : `${operation} failed` }] });
  }
}
