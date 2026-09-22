---
type: Interface Guide
title: SG Website Compilation
description: Run a separately installed website compiler through the SG CLI and MCP server.
---

# SG Website Compilation

Primary role: compiler setup and execution reference.

Use `sg compile`, `sg timeline`, and the other commands below directly. The `stylegallery-mcp` server exposes the same names alongside `discover`, `resolve`, `claims`, `context`, `ops`, and `retrieve`. Compiler operations can write files, open websites, and invoke a model; each tool declares those effects. The original [v1 knowledge interface](../../consumer-reference/agent-native/README.md) remains available separately.

## Setup

Install StyleGallery with Node.js 22 or newer using `npm install --global stylegallery`. For an unreleased StyleGallery checkout, run commands from that checkout as `npm run sg -- <command>` instead. If another program already owns the `sg` command, use the equivalent `stylegallery` executable or the npm script. The compiler is a [separate private repository](https://github.com/changeroa/site-compiler); an account with access must install it once:

```sh
gh repo clone changeroa/site-compiler /absolute/path/to/site-compiler
cd /absolute/path/to/site-compiler
npm ci --ignore-scripts --no-audit --no-fund
npx playwright install chromium
export SG_COMPILER_ROOT=/absolute/path/to/site-compiler
sg discover --format json
```

Set `SG_COMPILER_ROOT` in your shell profile for CLI use and in your MCP server environment for MCP use. A CLI invocation can override it with `--compiler-root /absolute/path/to/site-compiler`. `discover` preserves the knowledge response and adds a top-level `compiler` object containing installation status, the actual Git revision, tracked changes, and available operations. Missing compiler setup leaves knowledge queries usable.

The verified upstream revision is declared in [scripts/compiler/operations.mjs](operations.mjs). `matches_verified_revision` is true only for that revision without tracked modifications; a mismatch is reported but does not block execution. Use that revision when reproducing the verified workflow. To use a newer upstream version, update your compiler checkout with `git pull --ff-only` and `npm ci`, then inspect `sg discover` and `sg workflow`; SG does not fetch or upgrade code during a tool call. The compiler source, browser binaries, captured frames, and private pack data are not included in the StyleGallery npm package.

## CLI

Run these from the consumer project's working directory:

```sh
sg workflow
sg workflow --document readme
sg compile --url https://example.com --out ./captures/example
sg timeline --url https://example.com --out ./captures/example --step 500 --grow
sg transcribe --in ./captures --only example
sg sale --in ./captures/example --out ./captures/example/sale
sg gate --in ./captures/example --sale ./captures/example/sale --json ./captures/example/qa-report.json
sg build --packs ./captures --out ./builds --only example
sg shots --builds ./builds --slug example
```

`compile` captures scenes and frames; it does not produce a SceneBook by itself. A SceneBook describes scene geometry and content; its Timeline companion describes observed scroll behavior. `transcribe` produces these documents. Transcription and the optional sale-preview builder require an installed, authenticated `claude` CLI and can incur model usage. Their input roots contain one subdirectory per pack. Supply `--stylegallery` only when a different SG corpus should be used; the installed StyleGallery package is the default.

Read `sg workflow` before selecting stages. Its installed compiler document owns the task policy: faithful reconstruction, adaptation for a new design, or sale-package production. These are task purposes, not CLI flags. Reconstruction uses available source media and direct observation to fill document gaps; the current implementation agent remains the builder. A media record carries source URLs, responsive variants, reuse or replacement decisions, and playback checks separately from the observation document.

`sale` replaces observed copy with structural descriptors. `build` consumes only those sale editions and intentionally restricts original-page and external-media access. It is a package preview, not the faithful-reconstruction route. Use sale, build, and release operations when that package purpose is requested. A document-only evaluation is an explicit experiment, not the default website workflow. The SG skill only retrieves this workflow; it does not duplicate these policies.

By default, `sale` writes its private audit to `copy-audit.private.json` in the parent of `--out`. Override this with `--audit`; it must remain outside the sale directory. The resolved destination is returned in `result.paths.audit`.

| Command | Input and output |
| --- | --- |
| `compile` | `--url`, `--out`; writes `scenes.json` and `frames/` |
| `timeline` | `--url`, `--out`; writes `timeline-curve.json` and `dense/` |
| `transcribe` | `--in` pack root; writes documents and `transcribe.json` |
| `sale` | `--in`, `--out`; writes sale documents and a private audit outside `out` |
| `gate` | `--in`; optionally `--sale`, `--json`; returns failure when the upstream gate fails |
| `build` | `--packs`, `--out`; writes sale-edition previews and `build.json` |
| `shots` | `--builds`, `--slug`; writes screenshots and a report under each build |
| `probe` | `--url`; logs scroll geometry; optional `--chrome` |
| `batch-triage` | `--candidates`, `--out`; captures candidate curves and writes `runs.json` |
| `triage` | `--in`; writes heuristic rankings |
| `batch-capture` | `--candidates`, `--out`; captures scenes/timelines and writes `capture.json` |
| `pack-status` | `--candidates`, `--in`; generates sale editions, runs gates, and updates status |
| `pack-release` | `--products`; uses the compiler checkout's `out/packs` and `out/builds`, replacing matching files in `out/release` |
| `workflow` | Reads the installed `SKILL.md`, or `README.md` with `--document readme` |

All CLI results are one JSON envelope on stdout, including failures. Child logs are returned in `result.stdout` and `result.stderr`, with a 64 KiB tail per stream and truncation flags. Relative path options resolve from the caller's working directory; upstream scripts execute from the compiler checkout. `pack-release` is the upstream exception with fixed checkout-relative directories, and produces local archives without publishing them.

Use `sg discover` or `sg ops` for the full input schemas. CLI options use hyphens (`--max-height`); MCP inputs use underscores (`max_height`). Unknown options, repeated CLI options, missing required paths, and invalid numeric values fail before execution. `--format json` is optional. `--runner-timeout-ms` bounds the entire process tree, defaults to 30 minutes, and accepts up to six hours; `--timeout-ms` on model operations instead controls upstream per-job timeouts. Interrupting the CLI or cancelling an MCP request terminates its running process tree.

`ok` reports process success. Batch scripts can exit zero with failed individual jobs: use the returned ledger path to inspect each pack. A gate pass is an upstream consistency check, not SG conformance, accessibility proof, or rights clearance. Each result records the compiler revision, tracked-change status, executed script hash, and normalized arguments. Captures and generated documents remain consumer-owned outputs and are not admitted to the governed material registry.

## MCP

```json
{
  "mcpServers": {
    "stylegallery": {
      "command": "npx",
      "args": ["--yes", "--package", "stylegallery", "stylegallery-mcp"],
      "env": { "SG_COMPILER_ROOT": "/absolute/path/to/site-compiler" }
    }
  }
}
```

Call `compile` with `{"url":"https://example.com","out":"/absolute/path/to/captures/example"}` or `gate` with `{"in":"/absolute/path/to/captures/example"}`. Prefer absolute paths because the MCP client's launch directory may differ from your terminal. Long captures require a client request timeout longer than the capture; the runner's timeout does not change client settings. `workflow` and the knowledge tools are read-only; execution tools are marked as potentially destructive and non-idempotent because existing artifacts may be replaced.

From the StyleGallery checkout, use `npm run sg -- compile ...` and `npm run sg:mcp` for local development. To connect an MCP client to that unreleased checkout, use `"command": "node"` and `"args": ["/absolute/path/to/StyleGallery/scripts/sg-server.mjs"]` with the same environment settings. The frozen six-tool v1 server is `npm run sg:mcp:v1`, and its CLI is `npm run sg:v1 -- ...`.

## Contracts And Verification

The adapter follows the handoff fields in [Component Contract](../../design-engineering/component-contract.md): explicit inputs, outputs, process ownership, cancellation, and observable failure. Motion transcription remains governed by [Observed Choreography](../../motion/observed-choreography.md). These are routes into the existing domains; the transport creates no new domain or reusable Layout styling.

From the StyleGallery checkout, run `npm run test:compiler` for subprocess, argument, cancellation, JSON, and MCP transport checks. With a compiler installation and Chromium available, run `SG_COMPILER_INTEGRATION_ROOT=/absolute/path/to/site-compiler npm run test:compiler` to also capture a local fixture with the real upstream scripts. Model transcription, model builds, and product release packaging are separate upstream operations and are not exercised by that smoke test.

Implementation handoff:

```text
Consumer reference: declared
Consumer reference record: consumer-reference/agent-native/registry.json
consumer_reference: consumer-reference/agent-native/registry.json
```

## Navigation

Parent: [StyleGallery](../../README.md).
Next: [Component Contract](../../design-engineering/component-contract.md).
