import { z } from "zod";

export const upstream = Object.freeze({
  repository: "https://github.com/changeroa/site-compiler",
  verified_revision: "371849141ba68d12d578c804cc53fe7267c899b0",
  verified_at: "2026-09-22",
});

const text = z.string().min(1).refine((value) => !value.includes("\0"), "must not contain NUL");
const file = text.describe("Filesystem path; relative paths resolve from the SG caller's working directory.");
const positive = z.number().int().positive();
const url = z.url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "use an HTTP or HTTPS URL");
const optional = (shape) => Object.fromEntries(Object.entries(shape).map(([key, value]) => [key, value.optional()]));
const viewport = { width: positive.max(16384), height: positive.max(16384), wait: z.number().int().min(0).max(60000) };
const capture = { ...viewport, step: positive, quality: positive.max(100), grow: z.boolean() };
const batch = { only: text, force: z.boolean(), parallel: positive.max(32), timeout_ms: positive };
const model = { ...batch, model: text, timeout_ms: positive, stylegallery: file };
const operation = (script, description, required, options = {}, paths = [], extra = {}) => ({
  script, description, paths,
  schema: z.strictObject({ ...required, ...optional(options), runner_timeout_ms: positive.max(21600000).optional() }),
  ...extra,
});

// This registry owns both public transports. Upstream scripts remain in the
// separately installed checkout and are never admitted as gallery material.
export const compilerOperations = Object.freeze({
  compile: operation("compile.mjs", "Capture a live website as scenes.json, scene frames, and mounted text. Writes to out; does not transcribe the frames.",
    { url, out: file }, { ...viewport, substep: positive }, ["out"]),
  timeline: operation("timeline.mjs", "Capture dense scroll frames and a pixel-difference curve. Writes timeline-curve.json and dense/ to out.",
    { url, out: file }, { ...capture, max_height: positive }, ["out"]),
  transcribe: operation("transcribe.mjs", "Transcribe captured packs into SceneBook and Timeline documents using the installed Claude CLI. May incur model usage. Inspect transcribe.json for per-pack outcomes.",
    { in: file }, { ...model, image_budget: positive, phase: z.enum(["both", "scenebook", "timeline"]) }, ["in", "stylegallery"], { ledger: "transcribe.json" }),
  sale: operation("sale-edition.mjs", "Generate a sale edition and a private copy audit from transcribed documents. Does not publish or establish rights clearance.",
    { in: file, out: file }, { audit: file }, ["in", "out", "audit"]),
  gate: operation("qa-gate.mjs", "Check capture/transcription consistency and optionally a sale edition. A failed gate returns a nonzero exit code; json optionally writes the report.",
    { in: file }, { sale: file, json: file, max_gap_ratio: z.number().min(0).max(1), max_gaps_per_scene: z.number().int().min(0), static_score: z.number().min(0), high_score: z.number().min(0) }, ["in", "sale", "json"]),
  build: operation("build.mjs", "Build package previews from sale editions with original-page and external-media access restricted. Not the faithful-reconstruction route. Uses the installed Claude CLI and may incur model usage. Inspect build.json for per-pack outcomes.",
    { packs: file, out: file }, model, ["packs", "out", "stylegallery"], { ledger: "build.json" }),
  shots: operation("shots.mjs", "Render built sites into desktop/mobile screenshots and a reduced-motion report under each build's shots/ directory.",
    { slug: text, builds: file }, { steps: positive.max(1000) }, ["builds"]),
  probe: operation("probe-scroll.mjs", "Inspect website scroll geometry with Chromium; chrome selects installed Chrome. Returns the upstream diagnostic log.",
    { url }, { chrome: z.boolean() }, [], { positional: ["url"] }),
  "batch-triage": operation("batch-triage.mjs", "Capture candidate sites for triage. Inspect runs.json for individual failures even when the process exits successfully.",
    { candidates: file, out: file }, { ...batch, step: positive, wait: viewport.wait, quality: capture.quality, grow: z.boolean() }, ["candidates", "out"], { ledger: "runs.json" }),
  triage: operation("triage.mjs", "Rank captured scroll curves and write a triage report. This is heuristic ranking, not product verification.",
    { in: file }, { json: file, md: file, min_height: positive, pin_score: z.number().min(0), spike_score: z.number().min(0) }, ["in", "json", "md"]),
  "batch-capture": operation("batch-capture.mjs", "Capture scenes and timelines for candidate sites. Inspect capture.json for per-pack outcomes.",
    { candidates: file, out: file }, { ...batch, step: positive, quality: capture.quality }, ["candidates", "out"], { ledger: "capture.json" }),
  "pack-status": operation("pack-status.mjs", "Update pack status, generating sale editions and running gates as needed. Writes status reports into in.",
    { candidates: file, in: file }, { force: z.boolean() }, ["candidates", "in"]),
  "pack-release": operation("pack-release.mjs", "Package products from the compiler checkout's out/packs and out/builds into out/release. Replaces matching release folders and ZIP files locally; does not upload or publish.",
    { products: file }, { only: text }, ["products"]),
});

export const workflowSchema = z.strictObject({ document: z.enum(["workflow", "readme"]).default("workflow") });

export function compilerToolDefinitions() {
  return Object.entries(compilerOperations).map(([name, operation]) => {
    const { $schema, ...inputSchema } = z.toJSONSchema(operation.schema);
    return {
      name, description: operation.description, inputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    };
  }).concat({
    name: "workflow",
    description: "Read the installed compiler's current workflow or README with revision and content hash, plus the SG component and motion contract routes.",
    inputSchema: { type: "object", properties: { document: { type: "string", enum: ["workflow", "readme"], default: "workflow" } }, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  });
}
