// Semantic half of hybrid search: a small English embedding model run with
// onnxruntime-web (WebAssembly, an optional dependency). The model is never
// packaged: it is downloaded once into a cache directory and checked against
// pinned SHA-256 hashes. Document vectors are precomputed at build time into
// search-embeddings.json. Any failure leaves search on BM25F alone.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const EMBEDDINGS_PATH = path.join(repositoryRoot, "consumer-reference/agent-native/v2/search-embeddings.json");

export const EMBEDDING_MODEL = Object.freeze({
  id: "bge-small-en-v1.5-q8",
  source: "Xenova/bge-small-en-v1.5",
  revision: "ea104dacec62c0de699686887e3f920caeb4f3e3",
  dims: 384,
  pooling: "cls",
  query_prefix: "Represent this sentence for searching relevant passages: ",
  max_tokens: 512,
  files: Object.freeze({
    "model_quantized.onnx": Object.freeze({ remote: "onnx/model_quantized.onnx", sha256: "6c9c6101a956d62dfb5e7190c538226c0c5bb9cb27b651234b6df063ee7dbfe4", bytes: 34014426 }),
    "tokenizer.json": Object.freeze({ remote: "tokenizer.json", sha256: "d241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66", bytes: 711396 }),
  }),
});
export const DOCUMENT_TEXT_CHARS = 1500;
const DOWNLOAD_TIMEOUT_MS = 120_000;

export function cacheDirectory(env = process.env) {
  if (env.STYLEGALLERY_CACHE_DIR) return env.STYLEGALLERY_CACHE_DIR;
  const base = env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
  return path.join(base, "stylegallery");
}

export function modelDirectory(env = process.env) {
  return path.join(cacheDirectory(env), "models", EMBEDDING_MODEL.id);
}

const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

/** The text a document is embedded from: title, description, headings, then prose without code. */
export function documentEmbeddingText(document) {
  const body = document.text.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*`|>-]+/g, " ").replace(/\s+/g, " ").trim();
  return [document.title, document.description, document.sections.map((section) => section.title).join("; "), body]
    .filter(Boolean).join(". ").slice(0, DOCUMENT_TEXT_CHARS);
}

export function documentTextHash(document) {
  return sha256(Buffer.from(documentEmbeddingText(document), "utf8"));
}

// ---- BERT uncased WordPiece tokenizer (matches the model's tokenizer.json) ----

function isPunctuation(code, char) {
  return (code >= 33 && code <= 47) || (code >= 58 && code <= 64) || (code >= 91 && code <= 96) || (code >= 123 && code <= 126) || /\p{P}/u.test(char);
}

function isCjk(code) {
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf) || (code >= 0x20000 && code <= 0x2a6df)
    || (code >= 0x2a700 && code <= 0x2b73f) || (code >= 0x2b740 && code <= 0x2b81f) || (code >= 0x2b820 && code <= 0x2ceaf)
    || (code >= 0xf900 && code <= 0xfaff) || (code >= 0x2f800 && code <= 0x2fa1f);
}

function basicTokens(text) {
  let cleaned = "";
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code === 0 || code === 0xfffd || (/\p{Cc}|\p{Cf}/u.test(char) && !/[\t\n\r]/.test(char))) continue;
    if (/\s/u.test(char)) cleaned += " ";
    else if (isCjk(code)) cleaned += ` ${char} `;
    else cleaned += char;
  }
  cleaned = cleaned.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");
  const tokens = [];
  for (const word of cleaned.split(" ")) {
    let current = "";
    for (const char of word) {
      if (isPunctuation(char.codePointAt(0), char)) {
        if (current) tokens.push(current);
        tokens.push(char);
        current = "";
      } else current += char;
    }
    if (current) tokens.push(current);
  }
  return tokens;
}

export function createTokenizer(tokenizerJson) {
  const vocab = new Map(Object.entries(tokenizerJson.model.vocab));
  const unk = vocab.get("[UNK]");
  const cls = vocab.get("[CLS]");
  const sep = vocab.get("[SEP]");
  const wordPiece = (word) => {
    const chars = [...word];
    if (chars.length > 100) return [unk];
    const pieces = [];
    let start = 0;
    while (start < chars.length) {
      let end = chars.length;
      let found;
      while (start < end) {
        const piece = `${start > 0 ? "##" : ""}${chars.slice(start, end).join("")}`;
        if (vocab.has(piece)) { found = vocab.get(piece); break; }
        end -= 1;
      }
      if (found === undefined) return [unk];
      pieces.push(found);
      start = end;
    }
    return pieces;
  };
  return (text) => {
    const ids = basicTokens(text).flatMap(wordPiece).slice(0, EMBEDDING_MODEL.max_tokens - 2);
    return [cls, ...ids, sep];
  };
}

// ---- model download and loading ----

async function download(url, target, expected, log) {
  log(`stylegallery: downloading ${path.basename(target)} (${Math.round(expected.bytes / 1e6)} MB) for hybrid search into ${path.dirname(target)}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS), redirect: "follow" });
  if (!response.ok) throw new Error(`download failed: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (sha256(buffer) !== expected.sha256) throw new Error(`download of ${path.basename(target)} failed its SHA-256 check`);
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, buffer);
  fs.renameSync(temporary, target);
  return buffer;
}

async function modelFile(name, options) {
  const expected = EMBEDDING_MODEL.files[name];
  const directory = modelDirectory(options.env);
  const target = path.join(directory, name);
  if (fs.existsSync(target)) {
    const buffer = fs.readFileSync(target);
    if (sha256(buffer) === expected.sha256) return buffer;
    fs.rmSync(target, { force: true });
  }
  if (options.env.STYLEGALLERY_OFFLINE === "1") throw new Error("model not cached and STYLEGALLERY_OFFLINE=1");
  fs.mkdirSync(directory, { recursive: true });
  const url = `https://huggingface.co/${EMBEDDING_MODEL.source}/resolve/${EMBEDDING_MODEL.revision}/${expected.remote}`;
  return download(url, target, expected, options.log);
}

let embedderPromise = null;

/**
 * Load the query embedder once per process. Resolves to { embed } or to
 * { error } with a one-line reason; never rejects.
 */
export function loadEmbedder(options = {}) {
  const resolved = { env: options.env ?? process.env, log: options.log ?? ((line) => process.stderr.write(`${line}\n`)) };
  embedderPromise ??= (async () => {
    let ort;
    try { ort = await import("onnxruntime-web"); } catch { throw new Error("optional dependency onnxruntime-web is not installed"); }
    const tokenizerBuffer = await modelFile("tokenizer.json", resolved);
    const modelBuffer = await modelFile("model_quantized.onnx", resolved);
    ort.env.logLevel = "error";
    ort.env.wasm.numThreads = 1;
    const session = await ort.InferenceSession.create(modelBuffer);
    const tokenize = createTokenizer(JSON.parse(tokenizerBuffer.toString("utf8")));
    const embed = async (text) => {
      const ids = tokenize(text);
      const shape = [1, ids.length];
      const output = await session.run({
        input_ids: new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), shape),
        attention_mask: new ort.Tensor("int64", new BigInt64Array(ids.length).fill(1n), shape),
        token_type_ids: new ort.Tensor("int64", new BigInt64Array(ids.length), shape),
      });
      const vector = Array.from(output.last_hidden_state.data.subarray(0, EMBEDDING_MODEL.dims));
      const norm = Math.hypot(...vector) || 1;
      return vector.map((value) => value / norm);
    };
    return { embed };
  })().catch((error) => ({ error: error.message }));
  return embedderPromise;
}

// ---- stored document vectors ----

/** int8 quantization keeps the file small and makes stored vectors byte-stable across platforms. */
export function quantize(vector) {
  return Buffer.from(Int8Array.from(vector, (value) => Math.max(-127, Math.min(127, Math.round(value * 127)))).buffer).toString("base64");
}

export function dequantize(encoded) {
  const bytes = Buffer.from(encoded, "base64");
  return Float32Array.from(new Int8Array(bytes.buffer, bytes.byteOffset, bytes.length), (value) => value / 127);
}

let storedCache = null;

/** Stored document vectors keyed by repository path, or null when the file is missing or for another model. */
export function loadStoredEmbeddings(file = EMBEDDINGS_PATH) {
  if (storedCache?.file === file) return storedCache.value;
  let value = null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (parsed.model?.id === EMBEDDING_MODEL.id && parsed.model?.revision === EMBEDDING_MODEL.revision) {
      value = new Map(Object.entries(parsed.documents).map(([key, entry]) => [key, { textHash: entry.text_sha256, vector: dequantize(entry.vector) }]));
    }
  } catch { value = null; }
  storedCache = { file, value };
  return value;
}

export function embeddingsFileContent(entries) {
  const documents = Object.fromEntries([...entries].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)));
  const { files, ...model } = EMBEDDING_MODEL;
  return `${JSON.stringify({
    schema_version: "1.0",
    description: "Precomputed document vectors for hybrid search. Regenerate with node scripts/agent-native/v2/generate-search-embeddings.mjs.",
    model: { ...model, files: Object.fromEntries(Object.entries(files).map(([name, { sha256: hash }]) => [name, hash])) },
    document_text_chars: DOCUMENT_TEXT_CHARS,
    quantization: "int8, value = byte / 127",
    documents,
  }, null, 1)}\n`;
}
