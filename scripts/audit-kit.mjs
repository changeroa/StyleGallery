import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { checkPage, checkPageWeight, createBudget, openPage, runStage, sharedCheckPrinciples, serveDirectory, STAGE_INCOMPLETE } from "./audit-browser.mjs";
import { validateLedger } from "./stylegallery-audit.mjs";
import { checkSlop, SLOP_WEIGHT } from "./audit-slop.mjs";

export const AUDIT_PROFILES = ["landing", "app", "content"];
export const DEFAULT_TIMEOUT_SECONDS = 120;

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

export function parseProfile(value) {
  if (value === undefined || value === "auto") return "auto";
  if (!AUDIT_PROFILES.includes(value)) throw new Error(`profile must be auto, ${AUDIT_PROFILES.join(", ")} (got ${value})`);
  return value;
}

export function parseTimeout(value) {
  if (value === undefined) return DEFAULT_TIMEOUT_SECONDS;
  const seconds = Number(value);
  if (!Number.isInteger(seconds) || seconds < 10 || seconds > 3600) throw new Error("timeout must be an integer number of seconds between 10 and 3600");
  return seconds;
}

// Runs in the page once content has had a chance to render. Signals feed both the
// blocked_or_empty verdict and the automatic profile.
function pageSignals() {
  const outside = (el) => el.closest("header,footer,nav,[role=banner],[role=contentinfo],[role=navigation]");
  const sized = (el) => { const r = el.getBoundingClientRect(); return r.width >= 120 && r.height >= 80; };
  const shown = (el) => el.getClientRects().length > 0;
  const main = document.querySelector("main,[role=main]");
  const text = document.body?.innerText.trim() ?? "";
  const links = [...document.querySelectorAll("a[href]")].filter(shown);
  const linkChars = links.reduce((n, a) => n + a.innerText.trim().length, 0);
  const media = [...document.querySelectorAll("img,picture,video,canvas,svg,[data-surface]")].filter(sized);
  return {
    title: document.title.trim().slice(0, 120),
    text_chars: text.length,
    text_sample: text.slice(0, 400),
    main_landmark: Boolean(main),
    main_chars: main ? main.innerText.trim().length : null,
    main_media: main ? media.filter((el) => main.contains(el)).length : null,
    content_media: media.filter((el) => !outside(el)).length,
    media: media.length,
    links: links.length,
    link_text_share: Math.round((linkChars / (text.length || 1)) * 100) / 100,
    inputs: [...document.querySelectorAll("input:not([type=hidden]),select,textarea")].filter(shown).length,
    application_role: Boolean(document.querySelector("[role=application]")),
    screens: Math.round((document.documentElement.scrollHeight / innerHeight) * 10) / 10,
  };
}

const challengePattern = /\b(access denied|attention required|just a moment|are you a (human|robot)|verify you are human|captcha|request blocked|bot detection|unusual traffic|forbidden)\b/i;

// A page whose content never rendered (bot wall, challenge, empty shell) is not audited:
// every check would describe the wall, not the site.
export function blockedReason(signals, status) {
  if (status !== null && status >= 400) return `HTTP ${status} for the document`;
  if (challengePattern.test(signals.title) || (signals.text_chars < 3000 && challengePattern.test(signals.text_sample))) return `challenge or block page ("${signals.title || signals.text_sample.slice(0, 60)}")`;
  if (signals.text_chars < 80 && signals.media === 0) return `page rendered ${signals.text_chars} characters of text and no media`;
  if (signals.main_landmark && signals.main_chars === 0 && signals.main_media === 0) return "main landmark rendered no text and no media";
  return null;
}

// Automatic profile from rendered signals; an explicit --profile always wins.
export function estimateProfile(signals) {
  if (signals.application_role || (signals.inputs >= 3 && signals.screens <= 2 && signals.link_text_share < 0.6)) return { profile: "app", reason: "form controls dominate a short page" };
  if (signals.link_text_share >= 0.7 || (signals.link_text_share >= 0.6 && signals.content_media <= 3)) return { profile: "content", reason: `links carry ${Math.round(signals.link_text_share * 100)}% of the text and content media is ${signals.content_media}` };
  if (signals.content_media === 0 && signals.text_chars >= 1500) return { profile: "content", reason: `${signals.text_chars} characters of text and no content media` };
  return { profile: "landing", reason: "default for a marketing or product page with media" };
}

async function preflight(browser, url, base, budget) {
  const failures = [];
  const { context, page } = await openPage(browser, url, { viewport: { width: 1440, height: 900 }, budget, fast: true }, base, failures, "preflight");
  try {
    const response = await page.evaluate(() => performance.getEntriesByType("navigation")[0]?.responseStatus ?? null).catch(() => null);
    // Bounded condition wait: client-rendered pages fill main after load.
    await page.waitForFunction(() => {
      const main = document.querySelector("main,[role=main]");
      const scope = main ?? document.body;
      // Real media, not the logo or an icon: a client-rendered page shows its chrome first.
      const sized = [...scope.querySelectorAll("img,picture,video,canvas,svg")].some((el) => { const r = el.getBoundingClientRect(); return r.width >= 120 && r.height >= 80; });
      return scope && (scope.innerText.trim().length > 200 || sized);
    }, null, { timeout: 8000, polling: 250 }).catch(() => {});
    const signals = await page.evaluate(pageSignals);
    return { signals, status: response || null, failures };
  } finally { await context.close(); }
}

function profileRules(catalog) {
  return Object.fromEntries(AUDIT_PROFILES.map((name) => [name, new Set(catalog.profiles?.[name]?.relaxed ?? [])]));
}

export async function checkAudit(target, { viewports, signal, profile, timeout } = {}) {
  signal?.throwIfAborted();
  const widths = parseViewports(viewports);
  const requestedProfile = parseProfile(profile);
  const timeoutSeconds = parseTimeout(timeout);
  let url, server, browser;
  if (/^https?:\/\//i.test(target)) url = new URL(target).href;
  else {
    const file = target.startsWith("file:") ? fileURLToPath(target) : path.resolve(target);
    if (!fs.statSync(file).isFile()) throw new Error("audit check file must be a regular HTML file");
    server = await serveDirectory(path.dirname(file));
    url = `http://127.0.0.1:${server.address().port}/${encodeURIComponent(path.basename(file))}`;
  }
  const base = url.startsWith("file:") ? "file://" : new URL(url).origin;
  const started = Date.now();
  const abort = () => { void browser.close(); };
  let hardStop;
  const { slop } = auditCatalogs();
  const machineIds = slop.entries.filter((e) => e.detectable === "machine").map((e) => e.id);
  const allIds = [...Object.keys(sharedCheckPrinciples), ...machineIds];
  const common = {
    operation: "audit check", target, viewports: widths, timeout_seconds: timeoutSeconds,
    review: slop.entries.filter((e) => e.detectable === "review").map(({ id, review_question }) => ({ slop_id: id, question: review_question })),
    limitations: ["Solid-background text contrast only; imagery requires review.", "Offline blocks third-party requests; it is not a disconnected first visit.", "Automated checks do not establish usability or complete principle coverage.", "Live pages are sampled: at most 24 controls are hovered and 8 calls to action activated (see evidence.skipped)."],
  };
  const placeholder = (status) => allIds.map((check_id) => ({ check_id, principle_ids: sharedCheckPrinciples[check_id] ?? [], slop_ids: check_id.startsWith("slop.") ? [check_id] : (sharedCheckPrinciples[check_id] ?? []).filter((id) => id.startsWith("slop.")), pass: null, status, severity: null, evidence: [] }));
  try {
    browser = await chromium.launch();
    signal?.addEventListener("abort", abort, { once: true });
    signal?.throwIfAborted();
    const budget = createBudget(timeoutSeconds * 1000, 1 + checkPageWeight(widths.length) + SLOP_WEIGHT);
    // Last resort if a browser call ignores its stage limit: close the browser so every
    // pending call rejects and the run returns what it has.
    hardStop = setTimeout(() => { void browser.close().catch(() => {}); }, timeoutSeconds * 1000 + 15000);
    const pre = await runStage(budget, "preflight", 1, () => preflight(browser, url, base, budget));
    if (pre === STAGE_INCOMPLETE) {
      return { ok: false, verdict: "partial", timed_out: true, ...common, profile: { value: requestedProfile === "auto" ? null : requestedProfile, source: requestedProfile === "auto" ? "unresolved" : "explicit" }, elapsed_ms: Date.now() - started, stages: budget.stages, checks: placeholder("timed_out") };
    }
    const blocked = blockedReason(pre.signals, pre.status);
    if (blocked) {
      return { ok: false, verdict: "blocked_or_empty", timed_out: false, ...common, blocked: { reason: blocked, signals: pre.signals, http_status: pre.status }, elapsed_ms: Date.now() - started, stages: budget.stages, checks: placeholder("skipped") };
    }
    const estimate = estimateProfile(pre.signals);
    const resolved = requestedProfile === "auto" ? estimate.profile : requestedProfile;
    const relaxed = profileRules(slop)[resolved];
    const shared = await checkPage(browser, { url, base, showcase: false, viewports: widths, budget, fast: true });
    const slopChecks = await checkSlop(browser, url, slop, { budget, fast: true });
    const incomplete = new Set([...shared.incomplete, ...slopChecks.filter((c) => c.incomplete).map((c) => c.check_id)]);
    const checks = [...shared.checks, ...slopChecks.map(({ incomplete: _, ...check }) => check)].map((check) => {
      const severity = relaxed.has(check.check_id) ? "warning" : "error";
      // A violation found before the budget ran out still counts; a clean but unfinished check is not a pass.
      if (!check.pass) return { ...check, severity, status: severity === "error" ? "fail" : "warn" };
      if (incomplete.has(check.check_id)) return { ...check, pass: null, severity, status: "timed_out" };
      return { ...check, severity, status: "pass" };
    });
    const timedOut = incomplete.size > 0;
    const errorsPass = checks.every((check) => check.severity !== "error" || check.pass !== false);
    return {
      ok: errorsPass && !timedOut, verdict: timedOut ? "partial" : errorsPass ? "pass" : "fail", timed_out: timedOut, ...common,
      profile: { value: resolved, source: requestedProfile === "auto" ? "auto" : "explicit", estimate: estimate.profile, reason: estimate.reason, signals: pre.signals },
      warnings: checks.filter((check) => check.status === "warn").map((check) => check.check_id),
      elapsed_ms: Date.now() - started, stages: budget.stages, checks,
    };
  } finally {
    clearTimeout(hardStop);
    signal?.removeEventListener("abort", abort);
    await browser?.close().catch(() => {});
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}
