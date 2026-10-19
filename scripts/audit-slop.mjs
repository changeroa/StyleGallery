import { openPage, settle, runStage, STAGE_INCOMPLETE } from "./audit-browser.mjs";

const interactive = "a[href],button,summary,[role=button],[role=link],[role=tab],input[type=button],input[type=submit]";

// This function is serialized into Chromium. Rectangles are unioned, not summed:
// nested surfaces and overlapping text must not manufacture a passing screen.
export function measureSlop() {
  const W = innerWidth, H = innerHeight, height = document.documentElement.scrollHeight;
  const findings = {};
  const add = (id, evidence) => (findings[`slop.${id}`] ??= []).push(evidence);
  const visible = (el) => {
    if (!el.getClientRects().length) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || r.right <= 0 || r.left >= W || r.bottom + scrollY <= 0 || r.top + scrollY >= height) return false;
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === "none" || s.visibility !== "visible" || Number(s.opacity) <= 0) return false;
    }
    return true;
  };
  const selector = (el) => {
    if (el === document.documentElement) return "html";
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      parts.unshift(`${n.localName}:nth-of-type(${[...n.parentElement.children].filter((s) => s.localName === n.localName).indexOf(n) + 1})`);
    }
    return `body${parts.length ? " > " + parts.join(" > ") : ""}`;
  };
  const rect = (r) => ({ left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY, bottom: r.bottom + scrollY });
  const union = (boxes, top, bottom) => {
    const clipped = boxes.map((r) => ({ left: Math.max(0, r.left), right: Math.min(W, r.right), top: Math.max(top, r.top), bottom: Math.min(bottom, r.bottom) }))
      .filter((r) => r.right > r.left && r.bottom > r.top);
    const xs = [...new Set(clipped.flatMap((r) => [r.left, r.right]))].sort((a, b) => a - b);
    let area = 0;
    for (let i = 1; i < xs.length; i++) {
      const ys = clipped.filter((r) => r.left < xs[i] && r.right > xs[i - 1]).map((r) => [r.top, r.bottom]).sort((a, b) => a[0] - b[0]);
      let end = -Infinity, span = 0;
      for (const [start, finish] of ys) { span += Math.max(0, finish - Math.max(start, end)); end = Math.max(end, finish); }
      area += (xs[i] - xs[i - 1]) * span;
    }
    return area;
  };
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const color = (css) => {
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = [...ctx.getImageData(0, 0, 1, 1).data].map((n) => n / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
    const hue = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (hue * 60 + 360) % 360, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), a };
  };
  const elements = [...document.querySelectorAll("html, body, body *")].filter(visible);
  const media = [], text = [], headings = [], gradients = [], anchors = [], soft = [], emoji = [], triplets = [];
  const weights = new Map(), textSizes = [], durations = [];
  let masked = 0, hairlines = 0, transitioning = 0;
  const splitLayers = (value) => {
    const parts = [];
    let depth = 0, start = 0;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === "(") depth++;
      else if (value[i] === ")") depth--;
      else if (value[i] === "," && depth === 0) { parts.push(value.slice(start, i)); start = i + 1; }
    }
    parts.push(value.slice(start));
    return parts;
  };
  for (const el of elements) {
    const s = getComputedStyle(el), r = el.getBoundingClientRect(), box = rect(r), name = selector(el);
    if ((el.matches("img,picture,video,canvas,svg,[data-surface]") || /url\(/.test(s.backgroundImage)) && r.width >= 120 && r.height >= 80) media.push(box);
    const ownNodes = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    const own = ownNodes.map((n) => n.textContent).join("").trim();
    if (own) {
      const size = parseFloat(s.fontSize), chars = [...own].length, rounded = Math.round(size);
      weights.set(rounded, (weights.get(rounded) ?? 0) + chars);
      textSizes.push({ size, chars, box });
      for (const node of ownNodes) {
        const range = document.createRange(); range.selectNodeContents(node);
        text.push(...[...range.getClientRects()].map(rect));
      }
      if (el.matches("h1,h2,h3")) headings.push(box);
    }
    if (s.maskImage !== "none" || s.webkitMaskImage && s.webkitMaskImage !== "none" || s.clipPath !== "none") masked++;
    if (["Top", "Right", "Bottom", "Left"].some((side) => s[`border${side}Width`] === "1px" && !["none", "hidden"].includes(s[`border${side}Style`]))) hairlines++;
    const times = s.transitionDuration.split(",").map(parseFloat).filter((d) => d > 0);
    if (times.length) {
      transitioning++;
      if (el.matches("a[href],button")) durations.push(Math.max(...times) * 1000);
    }
    for (const css of [s.color, s.backgroundColor, s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor, s.outlineColor]) {
      const c = color(css);
      if (c.s >= .35 && c.a >= .3) anchors.push(c.h);
    }
    if (/gradient\(/.test(s.backgroundImage)) {
      for (const gradient of splitLayers(s.backgroundImage).filter((layer) => /gradient\(/.test(layer))) {
        const stops = (gradient.match(/(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)|#[a-f0-9]{3,8}\b/gi) ?? []).map(color);
        gradients.push({ box, name, stops, excluded: (s.maskImage !== "none" || s.clipPath !== "none") && r.width * r.height < W * H * .25 });
      }
    }
    if (!el.closest("[role=dialog],[role=menu],[role=listbox],[role=tooltip],[aria-modal=true],dialog[open],[popover]:popover-open")) {
      const layers = splitLayers(s.boxShadow);
      if (layers.some((layer) => {
        if (layer.includes("inset") || layer === "none") return false;
        const c = layer.match(/(?:rgba?|color)\([^)]*\)/)?.[0];
        const lengths = layer.replace(c ?? "", "").match(/-?[\d.]+px/g) ?? [];
        return parseFloat(lengths[2] ?? "0") >= 24 && (!c || color(c).a > 0);
      })) soft.push(name);
    }
    const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => c.tagName === el.tagName) : [];
    const iconScope = el.matches("nav *,button,a,li,h1,h2,h3,h4,h5,h6,[role=tab]") ||
      siblings.length >= 4 && /^(inline-)?(grid|flex)$/.test(getComputedStyle(el.parentElement).display);
    if (own && iconScope) {
      const clusters = [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(own)].map((x) => x.segment);
      const isEmoji = (c) => /\p{Extended_Pictographic}/u.test(c) && !/^[\u00a9\u00ae\u2122\u2190-\u21ff\u2713\u2714]\ufe0f?$/.test(c);
      if (clusters.length <= 2 && clusters.every(isEmoji) || isEmoji(clusters[0]) && /^\s/.test(clusters.slice(1).join(""))) emoji.push(name);
    }
    if (/^(inline-)?(grid|flex)$/.test(s.display)) {
      const children = [...el.children].filter(visible);
      if ([3, 4].includes(children.length)) {
        const boxes = children.map((c) => c.getBoundingClientRect());
        const signature = (node) => [...node.children].flatMap((c) => {
          if (c.localName === "svg") return ["svg"];
          const inlineText = getComputedStyle(c).display === "inline" && !c.children.length;
          return [...(inlineText ? [] : [c.localName]), ...signature(c)];
        });
        const signatures = children.map((c) => signature(c).join(","));
        if (boxes.every((b) => Math.abs(b.top - boxes[0].top) <= 4 && Math.abs(b.width - boxes[0].width) <= 2) &&
            !children.some((c) => c.matches("img,picture,video,canvas") || [...c.querySelectorAll("img,picture,video,canvas")].some(visible)) && new Set(signatures).size === 1) {
          triplets.push({ selector: name, signature: signatures[0] });
        }
      }
    }
  }
  const body = [...weights].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 16;
  headings.push(...textSizes.filter((t) => t.size >= 2.5 * body).map((t) => t.box));
  let gradientArea = 0, screenArea = 0;
  for (let top = 0; top < height; top += H) {
    const bottom = Math.min(top + H, height), area = W * H;
    const mediaShare = union(media, top, bottom) / area, textShare = union(text, top, bottom) / area;
    const ground = gradients.some((g) => union([g.box], top, bottom) >= area * .5 ||
      g.box.left <= W / 2 && g.box.right >= W / 2 && g.box.top <= top + H / 2 && g.box.bottom >= top + H / 2);
    const heading = headings.some((b) => union([b], top, bottom) > 0);
    if (mediaShare < .08 && textShare < .1) {
      if (heading && ground) add("headline-only-gradient-screen", { top, mediaShare, textShare });
      else if (bottom - top >= H / 2) add("empty-screen", { top, mediaShare, textShare });
    }
    gradientArea += union(gradients.filter((g) => !g.excluded).map((g) => g.box), top, bottom);
    screenArea += area;
    const violet = gradients.filter((g) => g.stops.filter((c) => c.h >= 245 && c.h <= 320 && c.s >= .35 && c.a >= .3).length >= 2);
    if (union(violet.map((g) => g.box), top, bottom) / area >= .15) {
      for (const g of violet) {
        const stops = g.stops.filter((c) => c.h >= 245 && c.h <= 320 && c.s >= .35 && c.a >= .3);
        if (union([g.box], top, bottom) > 0 && !stops.some((c) => anchors.some((h) => Math.min(Math.abs(h - c.h), 360 - Math.abs(h - c.h)) <= 20))) {
          add("unanchored-violet-gradient", { selector: g.name, top, violet_hues: stops.map((c) => c.h) });
        }
      }
    }
  }
  if (gradientArea / screenArea > .17) add("gradient-area-excess", { share: gradientArea / screenArea });
  if (soft.length > 1) add("soft-shadow-excess", { selectors: soft });
  if (masked < 2 || hairlines < 3) add("unfinished-surfaces", { masked, hairlines });
  if (emoji.length >= 2) add("emoji-icons", { selectors: emoji });
  if (triplets.length >= 3 || triplets.some((t, i) => triplets.some((o, j) => i !== j && t.signature === o.signature))) add("repeated-card-triplet", { triplets });
  durations.sort((a, b) => a - b);
  const mid = Math.floor(durations.length / 2);
  const median = durations.length ? durations.length % 2 ? durations[mid] : (durations[mid - 1] + durations[mid]) / 2 : null;
  const floor = Math.max(12, 4 * height / H);
  // reasons separate speed from absence: absence is also what slop.static-interactive measures,
  // so checkSlop keeps only the speed reason when both rules would fire.
  const reasons = [...(median !== null && (median < 100 || median > 350) ? ["speed"] : []), ...(transitioning < floor ? ["too_few"] : [])];
  if (reasons.length) add("sluggish-state-change", { median_ms: median, transitioning, floor, reasons });
  const characters = textSizes.reduce((n, t) => n + t.chars, 0);
  const displayShare = textSizes.filter((t) => t.size >= 2.5 * body).reduce((n, t) => n + t.chars, 0) / (characters || 1);
  const ratio = Math.max(0, ...textSizes.map((t) => t.size)) / body;
  if (ratio > 5.5 || displayShare > .082) add("oversized-display", { body_px: body, ratio, display_share: displayShare });
  return { findings, measured: { width: W, height: H, document_height: height, body_px: body, masked, hairlines, transitioning, median_ms: median } };
}

async function finishState(page, capMs = 1000) {
  await page.evaluate(async (capMs) => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const animations = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
    let timer;
    try {
      await Promise.race([
        Promise.all(animations.map((a) => a.finished.catch(() => {}))),
        new Promise((resolve) => { timer = setTimeout(resolve, capMs); }),
      ]);
    } finally { clearTimeout(timer); }
  }, capMs);
}

// Evenly spaced, deterministic sample so long pages are measured across their whole length.
export function sample(list, limit) {
  if (!limit || list.length <= limit) return list;
  return Array.from({ length: limit }, (_, i) => list[Math.floor((i * list.length) / limit)]);
}

// Controls that are not the page's own calls to action: skip links, consent and cookie
// controls, and legal links. They are excluded from the dishonest-CTA rule.
export const nonCtaPatterns = {
  skip: "^\\s*(skip\\s+(to|navigation|nav|links?)\\b|jump to (main|content))|(\uBCF8\uBB38|\uBA54\uC778|\uCF58\uD150\uCE20)\\s*(\uC73C\uB85C\\s*)?\uBC14\uB85C\\s*\uAC00\uAE30",
  consent: "\\bcookies?\\b|\\bconsent\\b|\\bgdpr\\b|\\bmanage (preferences|choices)\\b|\\byour privacy choices\\b|\uCFE0\uD0A4",
  legal: "\\b(privacy|terms|legal|imprint|impressum|accessibility statement|do not sell|sitemap|copyright)\\b|\uAC1C\uC778\uC815\uBCF4|\uC774\uC6A9\\s*\uC57D\uAD00|\uC57D\uAD00",
};
const consentScope = "[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],[aria-label*=cookie i],[aria-label*=consent i],[id*=onetrust i],[class*=onetrust i],[id*=gdpr i],[class*=gdpr i],[id^=cmp i],[class*=cmp-banner i]";

function interactiveSnapshot(element) {
  const properties = ["color", "backgroundColor", "backgroundImage", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "outlineStyle", "outlineColor", "textDecorationLine", "textDecorationColor", "opacity", "transform", "translate", "scale", "boxShadow", "filter", "clipPath"];
  const nodes = [element, ...element.children, ...[...element.children].flatMap((c) => [...c.children])];
  return JSON.stringify(nodes.map((node) => { const s = getComputedStyle(node); return properties.map((p) => s[p]); }));
}

// Stage weights: measure, interactive states, CTA activation.
export const SLOP_WEIGHT = 5;

export async function checkSlop(browser, url, catalog, { budget, fast = false } = {}) {
  const base = url.startsWith("file:") ? "file://" : new URL(url).origin;
  const loadFailures = [];
  // Live pages are sampled: every control of a 300-link page would take minutes to hover and
  // activate. Fixtures and showcase pages stay below the limits and are checked exhaustively.
  const limits = fast ? { hover: 24, cta: 8, tabs: 120, hoverMs: 1500, clickMs: 2500, finishMs: 400 } : { hover: 0, cta: 0, tabs: Infinity, hoverMs: 5000, clickMs: 5000, finishMs: 1000 };
  const incomplete = new Set();
  let opened;
  const measured = await runStage(budget, "slop measure", 1, async () => {
    opened = await openPage(browser, url, { viewport: { width: 1440, height: 900 }, budget, fast }, base, loadFailures, "slop");
    const { page } = opened;
    await page.evaluate(async () => {
      const height = document.documentElement.scrollHeight;
      for (let y = 0; y < height; y += 450) {
        scrollTo(0, y); await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      scrollTo(0, 0);
    });
    await settle(page);
    return page.evaluate(measureSlop);
  });
  const findings = measured === STAGE_INCOMPLETE ? {} : measured.findings;
  const skipped = {};
  let candidates = [];
  if (measured === STAGE_INCOMPLETE) {
    for (const entry of catalog.entries) if (entry.detectable === "machine") incomplete.add(entry.id);
  } else {
    const { page } = opened;
    const controls = page.locator(interactive);
    const listed = await controls.evaluateAll((nodes, { patterns, consentScope }) => nodes.flatMap((el, index) => {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      const name = (el.getAttribute("aria-label") || el.textContent || el.value || "").trim().slice(0, 80);
      // Hidden, off-page, zero-size, clipped, aria-hidden and inert controls cannot be hovered or
      // seen; they are recorded as skipped, never as violations.
      let hidden = !r.width || !r.height || r.width <= 1 || r.height <= 1 || r.right <= 0 || r.left >= innerWidth || r.bottom + scrollY <= 0 || r.top + scrollY >= document.documentElement.scrollHeight ||
        s.position === "fixed" && (r.bottom <= 0 || r.top >= innerHeight) || Boolean(el.closest("[aria-hidden=true],[inert]"));
      for (let n = el; n && !hidden; n = n.parentElement) {
        const style = getComputedStyle(n);
        if (style.visibility !== "visible" || style.display === "none" || Number(style.opacity) <= 0 || style.clip && style.clip !== "auto") hidden = true;
        else if (n !== el && /hidden|clip/.test(style.overflow)) {
          const box = n.getBoundingClientRect();
          if (box.width <= 1 || box.height <= 1 || r.right <= box.left || r.left >= box.right || r.bottom <= box.top || r.top >= box.bottom) hidden = true;
        }
      }
      if (el.disabled || el.getAttribute("aria-disabled") === "true") return [];
      const href = el.getAttribute("href");
      const role = new RegExp(patterns.skip, "i").test(name) ? "skip"
        : el.closest(consentScope) || new RegExp(patterns.consent, "i").test(name) ? "consent"
          : new RegExp(patterns.legal, "i").test(name) ? "legal" : null;
      const cta = !role && (!el.closest("header,footer") || /\b(get started|sign ?up|subscribe|book|buy|order|download|try|start|join|request|contact|get (a|an|the|your)|claim|reserve)\b/i.test(name));
      const invalid = href !== null && (!href || href === "#" || href === "#top" || /^javascript:/i.test(href) || href.startsWith("#") && !document.getElementById(decodeURIComponent(href.slice(1))));
      return [{ index, name, cta, invalid, hidden, role }];
    }), { patterns: nonCtaPatterns, consentScope });
    skipped.hidden_controls = listed.filter((c) => c.hidden).length;
    skipped.non_cta_controls = Object.fromEntries(["skip", "consent", "legal"].map((role) => [role, listed.filter((c) => c.role === role).length]));
    candidates = listed.filter((c) => !c.hidden);

    const interactiveDone = await runStage(budget, "slop interactive states", 2, async () => {
      const staticFindings = [], unreachable = [];
      const hovered = sample(candidates, limits.hover);
      const wanted = new Set(hovered.map(({ index }) => index));
      await page.mouse.move(0, 0);
      await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
      const resting = new Map();
      for (const { index } of hovered) resting.set(index, await controls.nth(index).evaluate(interactiveSnapshot));
      // Use actual keyboard navigation, rather than programmatic focus that can
      // miss :focus-visible.
      const focused = new Map();
      const tabStops = await page.locator("a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex='-1'])").evaluateAll((nodes) =>
        nodes.filter((e) => !e.disabled && !e.closest("[inert]") && e.getClientRects().length && getComputedStyle(e).visibility === "visible").length);
      const walk = Math.min(tabStops, limits.tabs);
      for (let step = 0; step < walk; step++) {
        await page.keyboard.press("Tab");
        const index = await page.evaluate((selector) => [...document.querySelectorAll(selector)].indexOf(document.activeElement), interactive);
        if (index >= 0 && wanted.has(index)) {
          await finishState(page, limits.finishMs);
          focused.set(index, await controls.nth(index).evaluate(interactiveSnapshot));
        }
      }
      const walkComplete = walk === tabStops;
      await page.evaluate(() => document.activeElement?.blur());
      for (const { index } of hovered) {
        const control = controls.nth(index);
        try {
          await control.hover({ timeout: limits.hoverMs });
          await finishState(page, limits.finishMs);
          if (resting.get(index) === await control.evaluate(interactiveSnapshot)) staticFindings.push({ index, reason: "hover_unchanged" });
        } catch (error) { unreachable.push({ index, reason: "hover_unreachable", message: error.message.split("\n")[0] }); }
        if (focused.has(index)) { if (resting.get(index) === focused.get(index)) staticFindings.push({ index, reason: "focus_unchanged" }); }
        else if (walkComplete) staticFindings.push({ index, reason: "focus_unreachable" });
        else unreachable.push({ index, reason: "focus_not_reached" });
        await page.mouse.move(0, 0);
        if (!fast) await finishState(page, limits.finishMs);
      }
      skipped.unreachable_controls = unreachable;
      skipped.sampled_controls = { checked: hovered.length, of: candidates.length };
      if (staticFindings.length) findings["slop.static-interactive"] = staticFindings;
    });
    if (interactiveDone === STAGE_INCOMPLETE) incomplete.add("slop.static-interactive");
    await opened.context.close().catch(() => {});
  }
  // An unresponsive page is one finding: when controls do not respond at all, the
  // "too few transitions" half of sluggish-state-change restates static-interactive.
  if (findings["slop.static-interactive"]?.length && findings["slop.sluggish-state-change"]) {
    findings["slop.sluggish-state-change"] = findings["slop.sluggish-state-change"]
      .map((finding) => ({ ...finding, reasons: finding.reasons.filter((reason) => reason === "speed"), deduplicated_with: "slop.static-interactive" }))
      .filter((finding) => finding.reasons.length);
  }

  if (measured !== STAGE_INCOMPLETE) {
    const ctas = sample(candidates.filter((c) => c.cta), limits.cta);
    skipped.sampled_ctas = { checked: ctas.length, of: candidates.filter((c) => c.cta).length };
    const ctaDone = await runStage(budget, "slop dishonest-cta", 2, async () => {
      const dishonest = [], unreachable = [];
      // One context; a fresh page per activation so navigation and previous live-region
      // messages cannot make a subsequent inert control appear to work.
      const actionContext = await openPage(browser, "about:blank", { viewport: { width: 1440, height: 900 }, budget, fast }, base, [], "cta");
      try {
        for (const cta of ctas) {
          if (cta.invalid) { dishonest.push({ ...cta, reason: "invalid_destination" }); continue; }
          const page = await actionContext.context.newPage();
          page.sgFast = fast;
          try {
            await page.goto(url, { waitUntil: fast ? "domcontentloaded" : "load", timeout: 20000 });
            await settle(page);
            const control = page.locator(interactive).nth(cta.index);
            const href = await control.getAttribute("href");
            await control.scrollIntoViewIfNeeded({ timeout: limits.clickMs });
            const state = () => page.evaluate(() => ({
              url: location.href,
              live: [...document.querySelectorAll("[role=status],[role=alert],[aria-live]")].map((e) => e.textContent.trim()).filter(Boolean).join("\n"),
              open: [...document.querySelectorAll("dialog[open],[popover]:popover-open,[role=dialog]:not([hidden])")].map((e) => e.outerHTML).join("\n"),
              expanded: [...document.querySelectorAll("[aria-expanded],[aria-selected],[aria-pressed]")].map((e) => `${e.getAttribute("aria-expanded")}${e.getAttribute("aria-selected")}${e.getAttribute("aria-pressed")}`).join(""),
              text: document.body.innerText,
              y: Math.round(scrollY),
            }));
            const before = await state();
            let requests = 0;
            const onRequest = () => { requests++; };
            page.on("request", onRequest);
            try {
              await control.click({ timeout: limits.clickMs });
            } catch (error) {
              unreachable.push({ ...cta, reason: "click_unreachable", message: error.message.split("\n")[0] });
              continue;
            }
            await finishState(page, limits.finishMs);
            page.off("request", onRequest);
            const after = await state();
            const hashLanded = await page.evaluate((href) => {
              if (!href?.startsWith("#") || href.length < 2) return false;
              const target = document.getElementById(decodeURIComponent(href.slice(1)));
              const r = target?.getBoundingClientRect();
              return Boolean(r && r.top >= 0 && r.top < innerHeight / 2);
            }, href);
            const changed = before.url !== after.url || requests > 0 || before.live !== after.live || before.open !== after.open ||
              before.expanded !== after.expanded || before.text !== after.text || Math.abs(before.y - after.y) > 40 || hashLanded;
            if (!changed) dishonest.push({ ...cta, reason: "no_observable_effect" });
          } catch (error) { unreachable.push({ ...cta, reason: "activation_failed", message: error.message.split("\n")[0] }); }
          finally { await page.close().catch(() => {}); }
        }
      } finally { await actionContext.context.close().catch(() => {}); }
      skipped.unreachable_ctas = unreachable;
      if (dishonest.length) findings["slop.dishonest-cta"] = dishonest;
    });
    if (ctaDone === STAGE_INCOMPLETE) incomplete.add("slop.dishonest-cta");
  }
  return catalog.entries.filter((e) => e.detectable === "machine").map((entry) => ({
    check_id: entry.id, principle_ids: [], slop_ids: [entry.id],
    pass: !findings[entry.id]?.length,
    incomplete: incomplete.has(entry.id),
    evidence: { measurements: measured === STAGE_INCOMPLETE ? null : measured.measured, violations: findings[entry.id] ?? [],
      ...(["slop.static-interactive", "slop.dishonest-cta"].includes(entry.id) ? { skipped } : {}) },
  }));
}
