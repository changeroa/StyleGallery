import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_EVIDENCE_CASE = "state-w1024-focus";
const identityPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const scenarioPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function commonStyles(mutation) {
  const text = mutation === "low-contrast" ? "rgb(156 163 175)" : "rgb(31 41 55)";
  const overflow = mutation === "overflow" ? "body::after{content:'';display:block;inline-size:200vw;block-size:1px}" : "";
  const clippedFocus = mutation === "clipped-focus" ? ".focus-frame{overflow:hidden;padding:0}" : "";
  return `
    :root{
      --canvas:rgb(255 255 255);
      --error-canvas:rgb(254 242 242);
      --error-text:rgb(153 27 27);
      --focus:rgb(180 83 9);
      --muted:rgb(75 85 99);
      --primary:rgb(29 78 216);
      --primary-active:rgb(30 58 138);
      --primary-hover:rgb(30 64 175);
      --surface:rgb(248 250 252);
      --text:${text};
    }
    *,*::before,*::after{box-sizing:border-box}
    html,body{margin:0;min-block-size:100%}
    body{background:var(--canvas);color:var(--text);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5;padding:16px}
    button,a{font:inherit}
    button{background:var(--primary);border:2px solid var(--primary);color:rgb(255 255 255);cursor:pointer;min-block-size:44px;padding:8px 16px}
    button:hover{background:var(--primary-hover)}
    button:active{background:var(--primary-active)}
    button:disabled{background:rgb(71 85 105);border-color:rgb(71 85 105);cursor:not-allowed}
    button:focus-visible,a:focus-visible{outline:3px solid var(--focus);outline-offset:3px}
    h1,h2,p{margin-block:0}
    h1{font-size:clamp(1.5rem,4vw,2rem);line-height:1.2}
    main{display:grid;gap:16px;inline-size:100%;margin-inline:auto;max-inline-size:72rem;min-inline-size:0}
    .probe-container{background:var(--surface);display:grid;gap:12px;inline-size:min(100%,var(--container-inline-size));max-block-size:calc(100vh - 96px);min-inline-size:0;overflow:auto;padding:16px}
    .probe-content{min-inline-size:0;overflow-wrap:anywhere;word-break:normal}
    .probe-content[data-content-kind="cjk"]{word-break:keep-all}
    .focus-frame{inline-size:min(100%,32rem);padding:8px}
    .focus-frame>button{inline-size:100%}
    .state-error{background:var(--error-canvas);color:var(--error-text);padding:8px}
    .state-status{color:var(--muted);padding:8px}
    .overlay-backdrop{background:rgb(15 23 42 / .35);inset:0;position:fixed;z-index:1}
    .overlay-shell{background:var(--surface);display:grid;gap:12px;inset:16px;max-block-size:calc(100vh - 32px);overflow:auto;padding:24px;position:fixed;z-index:2}
    .overlay-shell[data-kind="drawer"]{inset-inline-start:auto;inline-size:min(22rem,calc(100vw - 32px))}
    .overlay-shell[data-kind="dialog"]{inset:50% auto auto 50%;inline-size:min(32rem,calc(100vw - 32px));transform:translate(-50%,-50%)}
    .overlay-actions{display:grid;gap:12px}
    .overlay-actions>a{color:rgb(29 78 216);padding:8px}
    [hidden]{display:none!important}
    ${overflow}
    ${clippedFocus}
  `;
}

function layoutMarkup(options) {
  const content = options.content;
  return `
    <main id="consumer-main">
      <h1 data-essential="heading">Consumer conformance probe</h1>
      <section class="probe-container" data-scroll-owner="content" id="content-scroll-owner" style="--container-inline-size:${escapeHtml(options.container.inlineSize)}" aria-labelledby="container-probe-title">
        <h2 id="container-probe-title">Container probe</h2>
        <p class="probe-content" data-content-kind="${escapeHtml(content.id)}">${escapeHtml(content.body)}</p>
        <button data-essential="content-action" type="button">${escapeHtml(content.label)}</button>
      </section>
    </main>
  `;
}

function stateMarkup(options) {
  const state = options.state;
  const attributes = [
    state === "disabled" ? "disabled" : "",
    state === "error" ? 'aria-describedby="migration-error" aria-invalid="true"' : "",
    state === "loading" ? 'aria-busy="true" aria-describedby="migration-status"' : "",
  ].filter(Boolean).join(" ");
  const message = state === "error"
    ? '<p class="state-error" id="migration-error" role="alert">Migration could not be saved.</p>'
    : state === "loading"
      ? '<p class="state-status" id="migration-status" role="status">Saving migration</p>'
      : "";
  return `
    <main id="consumer-main">
      <h1 data-essential="heading">Consumer conformance probe</h1>
      <section class="probe-container" data-scroll-owner="state" id="state-scroll-owner" style="--container-inline-size:32rem" aria-label="Interaction state probe">
        <div class="focus-frame">
          <button data-essential="state-control" data-intended-state="${escapeHtml(state)}" data-observed-state="default" id="state-control" type="button" ${attributes}>Submit migration</button>
        </div>
        ${message}
      </section>
    </main>
  `;
}

function overlayMarkup(options) {
  const overlay = options.overlay;
  return `
    <main id="consumer-main">
      <h1 data-essential="heading">Consumer conformance probe</h1>
      <button data-essential="overlay-opener" id="overlay-opener" type="button">Open ${escapeHtml(overlay.label)}</button>
      <div class="overlay-backdrop" hidden id="overlay-backdrop"></div>
      <section aria-labelledby="overlay-title" aria-modal="true" class="overlay-shell" data-kind="${escapeHtml(overlay.id)}" data-overlay data-scroll-owner="overlay" hidden id="consumer-overlay" role="dialog">
        <h2 id="overlay-title">${escapeHtml(overlay.label)}</h2>
        <div class="overlay-actions">
          <button id="overlay-first" type="button">First ${escapeHtml(overlay.id)} action</button>
          <a href="#overlay-details">${escapeHtml(overlay.label)} details</a>
          <button id="overlay-close" type="button">Close ${escapeHtml(overlay.label)}</button>
        </div>
        <p id="overlay-details">Overlay content remains inside the declared scroll owner.</p>
      </section>
      <button id="outside-control" type="button">Outside control</button>
    </main>
  `;
}

function runtimeScript(options) {
  const runtime = JSON.stringify({ kind: options.kind, mutation: options.mutation }).replaceAll("<", "\\u003c");
  return `
    const runtime = ${runtime};
    const stateControl = document.getElementById("state-control");
    if (stateControl) {
      const intended = stateControl.dataset.intendedState;
      if (intended === "hover") stateControl.addEventListener("pointerenter", () => { stateControl.dataset.observedState = "hover"; });
      if (intended === "focus") stateControl.addEventListener("focus", () => { stateControl.dataset.observedState = "focus"; });
      if (intended === "active") {
        stateControl.addEventListener("pointerdown", () => { stateControl.dataset.observedState = "active"; });
        stateControl.addEventListener("pointerup", () => { stateControl.dataset.observedState = "default"; });
      }
    }
    const opener = document.getElementById("overlay-opener");
    const overlay = document.getElementById("consumer-overlay");
    const backdrop = document.getElementById("overlay-backdrop");
    const first = document.getElementById("overlay-first");
    const close = document.getElementById("overlay-close");
    if (opener && overlay && backdrop && first && close) {
      const background = [...document.querySelectorAll("#consumer-main > :not(#consumer-overlay):not(#overlay-backdrop)")];
      const containFocus = runtime.mutation !== "dialog-focus-leak";
      const closeOverlay = () => {
        overlay.hidden = true;
        backdrop.hidden = true;
        for (const element of background) element.inert = false;
        opener.setAttribute("aria-expanded", "false");
        opener.focus();
      };
      opener.setAttribute("aria-controls", "consumer-overlay");
      opener.setAttribute("aria-expanded", "false");
      opener.addEventListener("click", () => {
        overlay.hidden = false;
        if (containFocus) {
          backdrop.hidden = false;
          for (const element of background) element.inert = true;
        }
        opener.setAttribute("aria-expanded", "true");
        first.focus();
      });
      close.addEventListener("click", closeOverlay);
      document.addEventListener("pointerdown", (event) => {
        if (!containFocus || overlay.hidden) return;
        const interactive = event.target.closest('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!overlay.contains(event.target) || !interactive) event.preventDefault();
      }, true);
      document.addEventListener("focusin", (event) => {
        if (containFocus && !overlay.hidden && !overlay.contains(event.target)) first.focus();
      });
      document.addEventListener("keydown", (event) => {
        if (overlay.hidden) return;
        if (event.key === "Escape") { event.preventDefault(); closeOverlay(); return; }
        if (event.key !== "Tab" || !containFocus) return;
        const focusable = [...overlay.querySelectorAll('button:not([disabled]),a[href]')];
        if (event.shiftKey && document.activeElement === focusable[0]) {
          event.preventDefault();
          focusable.at(-1).focus();
        } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
          event.preventDefault();
          focusable[0].focus();
        }
      });
    }
    if (runtime.mutation === "console-error") console.error("deliberate consumer conformance mutation");
  `;
}

export async function renderConsumerConformance(page, options) {
  const markup = options.kind === "layout"
    ? layoutMarkup(options)
    : options.kind === "state"
      ? stateMarkup(options)
      : overlayMarkup(options);
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Consumer conformance probe</title><style>${commonStyles(options.mutation)}</style></head><body>${markup}<script>${runtimeScript(options)}</script></body></html>`);
}

export function observeRuntimeErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page:${error.message}`));
  return errors;
}

export async function pageGeometry(page) {
  return page.evaluate(() => {
    const viewport = { height: window.innerHeight, width: window.innerWidth };
    const observation = (element) => {
      const rect = element.getBoundingClientRect();
      const scrollOwner = element.closest("[data-scroll-owner]");
      const ownerRect = scrollOwner?.getBoundingClientRect();
      return {
        fullyVisibleInScrollOwner: !ownerRect || (rect.left >= ownerRect.left && rect.right <= ownerRect.right && rect.top >= ownerRect.top && rect.bottom <= ownerRect.bottom),
        fullyVisibleInViewport: rect.left >= 0 && rect.right <= viewport.width && rect.top >= 0 && rect.bottom <= viewport.height,
        height: rect.height,
        id: element.id || element.dataset.essential || element.dataset.scrollOwner || element.tagName.toLowerCase(),
        intersectsViewport: rect.bottom > 0 && rect.right > 0 && rect.top < viewport.height && rect.left < viewport.width,
        width: rect.width,
      };
    };
    return {
      document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
      essentials: [...document.querySelectorAll("[data-essential]")].map(observation),
      scrollOwners: [...document.querySelectorAll("[data-scroll-owner]")].map((element) => ({
        clientWidth: element.clientWidth,
        id: element.dataset.scrollOwner,
        overflowY: getComputedStyle(element).overflowY,
        scrollWidth: element.scrollWidth,
      })),
    };
  });
}

export async function focusGeometry(locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const outlineWidth = Number.parseFloat(style.outlineWidth) || 0;
    const outlineOffset = Number.parseFloat(style.outlineOffset) || 0;
    const extent = outlineWidth + Math.max(0, outlineOffset);
    const ring = { bottom: rect.bottom + extent, left: rect.left - extent, right: rect.right + extent, top: rect.top - extent };
    let clippedBy = null;
    for (let ancestor = element.parentElement; ancestor && !clippedBy; ancestor = ancestor.parentElement) {
      const ancestorStyle = getComputedStyle(ancestor);
      if (![ancestorStyle.overflow, ancestorStyle.overflowX, ancestorStyle.overflowY].some((value) => value === "hidden" || value === "clip")) continue;
      const bounds = ancestor.getBoundingClientRect();
      if (ring.left < bounds.left || ring.right > bounds.right || ring.top < bounds.top || ring.bottom > bounds.bottom) clippedBy = ancestor.id || ancestor.className || ancestor.tagName.toLowerCase();
    }
    const visible = document.activeElement === element
      && outlineWidth >= 2
      && style.outlineStyle !== "none"
      && ring.left >= 0
      && ring.top >= 0
      && ring.right <= window.innerWidth
      && ring.bottom <= window.innerHeight;
    return { clippedBy, outlineOffset, outlineWidth, ring, visible };
  });
}

export async function collectContrastViolations(page, rootSelectors) {
  return page.evaluate((selectors) => {
    function parseColor(value) {
      const match = value.match(/^rgba?\((.*)\)$/);
      if (!match) return null;
      const parts = match[1].trim().split(/[\s,\/]+/).filter(Boolean).map(Number);
      if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;
      return { alpha: Number.isFinite(parts[3]) ? parts[3] : 1, channels: parts.slice(0, 3) };
    }
    function composite(foreground, background) {
      const alpha = foreground.alpha;
      return foreground.channels.map((channel, index) => channel * alpha + background[index] * (1 - alpha));
    }
    function backgroundFor(element) {
      const ancestors = [];
      for (let current = element; current; current = current.parentElement) ancestors.push(current);
      let background = [255, 255, 255];
      for (const ancestor of ancestors.reverse()) {
        const parsed = parseColor(getComputedStyle(ancestor).backgroundColor);
        if (parsed && parsed.alpha > 0) background = composite(parsed, background);
      }
      return background;
    }
    function luminance(channels) {
      const linear = channels.map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    }
    function ratio(foreground, background) {
      const foregroundLuminance = luminance(foreground);
      const backgroundLuminance = luminance(background);
      return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
    }

    const roots = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
    const elements = new Set(roots.flatMap((root) => [root, ...root.querySelectorAll("*")]));
    const violations = [];
    for (const element of elements) {
      const hasDirectText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0);
      if (!hasDirectText) continue;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || rect.width === 0 || rect.height === 0) continue;
      const foreground = parseColor(style.color);
      if (!foreground) continue;
      const background = backgroundFor(element);
      const actualForeground = composite(foreground, background);
      const actualRatio = ratio(actualForeground, background);
      if (actualRatio < 4.5) violations.push({
        actual: Number(actualRatio.toFixed(2)),
        element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}`,
        required: 4.5,
        text: element.textContent.trim().slice(0, 80),
      });
    }
    return violations;
  }, rootSelectors);
}

export async function setChromiumPageScale(page, pageScaleFactor) {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Emulation.setPageScaleFactor", { pageScaleFactor });
  } finally {
    await session.detach();
  }
}

export async function captureVisualQa(page, { caseId, suffix = "rendered" } = {}) {
  const configuredRoot = process.env.CONSUMER_CONFORMANCE_CAPTURE_DIR;
  if (!configuredRoot) return;
  const root = path.resolve(configuredRoot);
  const safeCase = String(caseId).replaceAll(/[^a-z0-9-]/g, "-");
  const safeSuffix = String(suffix).replaceAll(/[^a-z0-9-]/g, "-");
  if (!safeCase || !safeSuffix) throw new Error("consumer conformance capture requires a safe case and suffix");
  const file = path.join(root, `${safeCase}-${safeSuffix}.png`);
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error("consumer conformance capture escaped its root");
  fs.mkdirSync(root, { recursive: true });
  if (fs.existsSync(file)) throw new Error(`consumer conformance capture already exists: ${file}`);
  await page.screenshot({ animations: "disabled", caret: "hide", path: file });
}

function resolveEvidencePath(root, reference) {
  if (typeof reference !== "string" || reference.length === 0 || path.isAbsolute(reference) || reference.includes("\\") || reference.split("/").some((segment) => segment === ".." || segment === "." || segment.length === 0)) {
    throw new Error(`invalid PAGE_EVIDENCE path: ${reference}`);
  }
  const resolved = path.resolve(root, reference);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error(`PAGE_EVIDENCE path escapes artifact root: ${reference}`);
  return resolved;
}

function pathEntry(file) {
  try {
    return fs.lstatSync(file);
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

function prepareEvidenceOutput(root, reference) {
  const resolved = resolveEvidencePath(root, reference);
  const rootEntry = pathEntry(root);
  if (!rootEntry?.isDirectory() || rootEntry.isSymbolicLink()) throw new Error("page_evidence_artifact_root_invalid: artifact root must be a real directory");
  const canonicalRoot = fs.realpathSync(root);
  const parentReference = path.posix.dirname(reference);
  let directory = root;

  for (const segment of parentReference === "." ? [] : parentReference.split("/")) {
    directory = path.join(directory, segment);
    let entry = pathEntry(directory);
    if (!entry) {
      fs.mkdirSync(directory);
      entry = pathEntry(directory);
    }
    if (entry.isSymbolicLink()) throw new Error(`page_evidence_output_symlink: ${reference}`);
    if (!entry.isDirectory()) throw new Error(`page_evidence_output_parent_invalid: ${reference}`);
    const canonicalDirectory = fs.realpathSync(directory);
    if (canonicalDirectory !== canonicalRoot && !canonicalDirectory.startsWith(`${canonicalRoot}${path.sep}`)) throw new Error(`page_evidence_output_escape: ${reference}`);
  }

  if (pathEntry(resolved)) throw new Error(`page_evidence_output_exists: ${reference}`);
  return resolved;
}

export async function capturePageEvidence(page, { caseId, pageScaleFactor, probe } = {}) {
  const configuredRoot = process.env.PAGE_EVIDENCE_ARTIFACT_ROOT ?? process.env.PAGE_EVIDENCE_ARTIFACT_DIR;
  if (!configuredRoot) return;
  const selectedCase = process.env.PAGE_EVIDENCE_CASE_ID ?? DEFAULT_EVIDENCE_CASE;
  if (caseId !== selectedCase) return;

  const root = path.resolve(configuredRoot);
  const receiptFile = path.resolve(process.env.PAGE_EVIDENCE_SESSION_RECEIPT ?? path.join(root, "page-evidence-session.json"));
  const receiptBytes = fs.readFileSync(receiptFile);
  const receipt = JSON.parse(receiptBytes);
  const intended = receipt.intended_scenario_ids;
  const scenarioId = process.env.PAGE_EVIDENCE_SCENARIO_ID ?? (intended?.length === 1 ? intended[0] : undefined);
  if (!scenarioPattern.test(scenarioId ?? "") || !intended?.includes(scenarioId)) throw new Error("PAGE_EVIDENCE_SCENARIO_ID must select one intended receipt scenario");
  if (!identityPattern.test(receipt.run_id ?? "") || !identityPattern.test(receipt.session_id ?? "")) throw new Error("PAGE_EVIDENCE receipt identities are invalid");

  const safeCase = caseId.replaceAll(/[^a-z0-9-]/g, "-");
  const probeSlug = probe ? `-${probe.replaceAll(/[^a-z0-9-]/gi, "-").toLowerCase()}` : "";
  const screenshotReference = `captures/${scenarioId}-${safeCase}${probeSlug}.png`;
  const runnerReference = process.env.PAGE_EVIDENCE_RUNNER_RESULT ?? `runner/${scenarioId}.json`;
  fs.mkdirSync(root, { recursive: true });
  const screenshotFile = prepareEvidenceOutput(root, screenshotReference);
  const runnerFile = prepareEvidenceOutput(root, runnerReference);
  if (screenshotFile === runnerFile) throw new Error("page_evidence_output_collision: screenshot and runner paths must differ");
  await page.screenshot({ animations: "disabled", caret: "hide", path: screenshotFile });

  const semanticEnvironment = await page.evaluate(({ scale }) => ({
    color_scheme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    locale: navigator.language,
    page_scale_factor: scale,
    reduced_motion: matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduce" : "no-preference",
    viewport: { height: window.innerHeight, width: window.innerWidth },
  }), { scale: pageScaleFactor });
  const browserVersion = page.context().browser()?.version() ?? "unknown";
  const runner = {
    evidence: { artifacts: [{ media_type: "image/png", path: screenshotReference }], kind: "captured" },
    nonce: receipt.nonce,
    receipt_sha256: crypto.createHash("sha256").update(receiptBytes).digest("hex"),
    recorded_at: new Date().toISOString(),
    record_kind: "page_evidence_runner_result",
    repository: receipt.repository,
    revision: receipt.revision,
    run: {
      attempt: receipt.attempt,
      id: receipt.run_id,
      repository: receipt.repository,
      revision: receipt.revision,
      source: process.env.GITHUB_ACTIONS === "true" ? "github_actions" : "local",
    },
    scenario_id: scenarioId,
    schema_version: "1.0",
    semantic_environment: {
      browser: `Chromium ${browserVersion}`,
      browser_revision: process.env.PAGE_EVIDENCE_BROWSER_REVISION ?? browserVersion,
      platform: `${process.platform}/${process.arch}`,
      ...semanticEnvironment,
    },
    session_id: receipt.session_id,
    source_sha256: receipt.source.sha256,
    status: "passed",
  };
  fs.writeFileSync(runnerFile, `${JSON.stringify(runner, null, 2)}\n`, { flag: "wx" });
}
