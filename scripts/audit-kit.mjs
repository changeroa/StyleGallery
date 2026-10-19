import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { checkPage, sharedCheckPrinciples, serveDirectory } from "./audit-browser.mjs";
import { validateLedger } from "./stylegallery-audit.mjs";
import { checkSlop } from "./audit-slop.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export function auditCatalogs() {
  return {
    hig: JSON.parse(fs.readFileSync(path.join(root, "platform-guides/hig-universal-principles.json"), "utf8")),
    slop: JSON.parse(fs.readFileSync(path.join(root, "expression/anti-patterns.json"), "utf8")),
  };
}

export function initAudit(target, { out = "audit" } = {}) {
  const url = new URL(target);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("audit init requires an HTTP or HTTPS URL");
  const directory = path.resolve(out);
  const files = ["audit.md", "ledger.json"].map((file) => path.join(directory, file));
  for (const file of files) if (fs.existsSync(file)) throw new Error(`refusing to overwrite ${file}`);
  const { hig, slop } = auditCatalogs();
  const principles = hig.principles.filter((p) => ["universal", "adapt"].includes(p.class));
  const ledger = {
    schema_version: "1.0", ledger_kind: "stylegallery_audit_ledger",
    subject: url.href, updated_on: new Date().toISOString().slice(0, 10),
    principles: [...principles, ...slop.entries].map(({ id }) => ({ principle_id: id, violations: [] })),
  };
  const failures = validateLedger(ledger);
  if (failures.length) throw new Error(JSON.stringify(failures));
  const template = (name) => fs.readFileSync(path.join(root, "quality/audit", name), "utf8")
    .replace(/^---\n[\s\S]*?\n---\n/, "").split("## IA Navigation")[0]
    .replace(/^# .+\n/m, "").replace(/^Primary role:.*\n/m, "").trim()
    .replace(/\]\(([^):]+)\)/g, (_, link) => `](https://github.com/changeroa/StyleGallery/blob/main/${path.posix.normalize(`quality/audit/${link}`)})`);
  const mapped = Object.entries(sharedCheckPrinciples);
  const doc = `# Design audit: ${url.href}

Subject: ${url.href}
Created: ${ledger.updated_on}
Status: unreviewed; generated rows are hypotheses, not findings.
consumer_reference: not_applicable - consumer-owned audit output selects no reference profile.

${template("persona-journey.md")}

${template("ideal-state.md")}

## Checks

| Check id | Principle/slop ids | Method |
| --- | --- | --- |
${mapped.map(([id, ids]) => `| ${id} | ${ids.join(", ")} | Automated browser measurement |`).join("\n")}
${slop.entries.map((e) => `| ${e.detectable === "machine" ? e.id : `manual.${e.id}`} | ${e.id} | ${e.detectable === "machine" ? "Automated slop detection" : e.review_question} |`).join("\n")}

## Principle Coverage And Manual Scenarios

For each row, assign persona and journey refs, define the expected result, and attach observation evidence. An empty ledger row means not triaged, not passed. Adapt entries require an explicit web counterpart; Apple-specific entries are excluded.

| Principle id | Class | Automated check or manual check id |
| --- | --- | --- |
${principles.map((p) => `| ${p.id} | ${p.class} | ${mapped.filter(([, ids]) => ids.includes(p.id)).map(([id]) => id).join(", ") || `manual.${p.id}`} |`).join("\n")}

## Findings And Plan

Record observations, affected personas/journeys, severity rationale, screenshot paths, fix PR, and the check that proves recovery in ledger.json. Do not invent violations or mark unrun checks verified.

${template("severity.md")}

## Verification

Run stylegallery audit check against a test instance and retain JSON. Add manual results for every uncovered principle. Verify each automated check against its clean and violation fixtures (I13). Screenshots show rendered change, not usability.
`;
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(files[0], doc, { flag: "wx" });
  fs.writeFileSync(files[1], `${JSON.stringify(ledger, null, 2)}\n`, { flag: "wx" });
  return { ok: true, operation: "audit init", subject: url.href, files, principles: ledger.principles.length };
}

export function parseViewports(value) {
  if (value === undefined) return [320, 768, 1440];
  const values = Array.isArray(value) ? value : value.split(",").map(Number);
  if (!values.length || values.length > 10 || values.some((v) => !Number.isInteger(v) || v < 320 || v > 7680) || new Set(values).size !== values.length) {
    throw new Error("viewports must be 1-10 unique integer widths between 320 and 7680, comma-separated");
  }
  return values;
}

export async function checkAudit(target, { viewports, signal } = {}) {
  signal?.throwIfAborted();
  const widths = parseViewports(viewports);
  let url, server, browser;
  if (/^https?:\/\//i.test(target)) url = new URL(target).href;
  else {
    const file = target.startsWith("file:") ? fileURLToPath(target) : path.resolve(target);
    if (!fs.statSync(file).isFile()) throw new Error("audit check file must be a regular HTML file");
    server = await serveDirectory(path.dirname(file));
    url = `http://127.0.0.1:${server.address().port}/${encodeURIComponent(path.basename(file))}`;
  }
  const base = url.startsWith("file:") ? "file://" : new URL(url).origin;
  const abort = () => { void browser.close(); };
  try {
    browser = await chromium.launch();
    signal?.addEventListener("abort", abort, { once: true });
    signal?.throwIfAborted();
    const shared = await checkPage(browser, { url, base, showcase: false, viewports: widths });
    const { slop } = auditCatalogs();
    const slopChecks = await checkSlop(browser, url, slop);
    const checks = [...shared.checks, ...slopChecks];
    return {
      ok: checks.every((check) => check.pass), operation: "audit check", target, viewports: widths,
      checks, review: slop.entries.filter((e) => e.detectable === "review").map(({ id, review_question }) => ({ slop_id: id, question: review_question })),
      limitations: ["Solid-background text contrast only; imagery requires review.", "Offline blocks third-party requests; it is not a disconnected first visit.", "Automated checks do not establish usability or complete principle coverage."],
    };
  } finally {
    signal?.removeEventListener("abort", abort);
    await browser?.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}
