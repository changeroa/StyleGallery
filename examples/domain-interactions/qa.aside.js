// Execute inside Aside REPL after opening this example and reading its snapshot.
// This uses the real browser tab. Size/preference overrides are scoped to that tab.
async function runInteractionQA() {
  if (!/\/examples\/domain-interactions\/(?:[?#].*)?$/.test(page.url())) throw Error("Open the interaction lab first.");
  const started = new Date().toISOString();
  const checks = [];
  const errors = [];
  const captures = [];
  const captureMetrics = [];
  const onError = (error) => errors.push(String(error));
  page.on("pageerror", onError);
  const cdp = async (method, params = {}) => page.cdp.send(method, params, await page.resolveSessionId());
  const runtime = await cdp("Browser.getVersion");
  const base = page.url().replace(/[?#].*$/, "");
  const sources = await (await fetch(`${base}evidence/sources.json`)).json();
  const artifactRoot = `artifacts/domain-interactions-${Date.now()}`;
  await fs.mkdir(artifactRoot, { recursive: true });
  const state = () => page.evaluate(() => {
    const e = (id) => document.getElementById(id);
    return {
      draft: e("draft").value, persisted: e("persisted").textContent,
      saveDisabled: e("save").disabled, saveStatus: e("save-status").textContent, saveError: e("save-error").textContent,
      active: document.activeElement.id, activeText: document.activeElement.textContent,
      query: e("query").value, searchStatus: e("search-status").textContent,
      results: [...e("results").querySelectorAll("button")].map((b) => b.textContent),
      detail: e("detail").hidden ? null : e("detail-heading").textContent,
      listVisible: getComputedStyle(e("search-list")).display !== "none",
      openDialogs: [...document.querySelectorAll("dialog[open]")].map((d) => d.id),
      selected: document.querySelector("input[name=item]:checked").value,
      inventoryStatus: e("inventory-status").textContent, equipmentStatus: e("equipment-status").textContent,
      equipDisabled: e("confirm-equip").disabled,
      rewardStatus: e("reward-status").textContent, rewardCount: e("reward-count").textContent,
      claimDisabled: e("claim-reward").disabled, skipDisabled: e("skip-reveal").disabled,
      disclosure: e("delivery").open, position: e("position").value, positionStatus: e("position-status").textContent,
      motion: e("motion-preference").textContent, animations: document.getAnimations().length,
      viewport: innerWidth, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  const check = async (id, action, expected) => {
    await action();
    const view = await snapshot(page);
    console.log(view.diff);
    const actual = await state();
    const mismatches = Object.keys(expected).filter((key) => JSON.stringify(actual[key]) !== JSON.stringify(expected[key]));
    checks.push({ id, at: new Date().toISOString(), expected, actual, snapshot: view.diff, ok: mismatches.length === 0 });
    console.log(JSON.stringify({ id, ok: mismatches.length === 0, mismatches }));
    if (mismatches.length) throw Error(`${id}: ${JSON.stringify({ expected, actual })}`);
  };
  const click = (id, target, expected) => check(id, () => page.locator(target).click(), expected);
  const fill = (id, target, value, expected = {}) => check(id, () => page.locator(target).fill(value), expected);
  const key = (id, target, value, expected) => check(id, () => page.locator(target).press(value), expected);
  const escape = (id, expected) => check(id, () => page.keyboard.press("Escape"), expected);
  const result = (id, name, expected) => check(id, () => page.getByRole("button", { name, exact: true }).click(), expected);
  const size = (width, height = 900) => cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  const preference = async (value) => {
    await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value }] });
    // CDP acknowledges the override before the browser dispatches matchMedia's change.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  };
  const reset = async () => {
    await page.goto(base);
    await page.waitForSelector("#save:disabled");
    console.log((await snapshot(page)).tree);
  };
  const capture = async (name) => {
    // Explicit bounds avoid capturing the native backing surface after a size override.
    const clip = await page.evaluate(() => ({ x: scrollX, y: scrollY, width: innerWidth, height: innerHeight }));
    const bytes = await page.screenshot({ path: `${artifactRoot}/${name}.png`, clip });
    const pixels = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    if (Math.abs(pixels.width / clip.width - pixels.height / clip.height) > .01) throw Error("Screenshot dimensions do not match the observed viewport.");
    captures.push(`${name}.png`);
    captureMetrics.push({ file: `${name}.png`, cssViewport: clip, pixels });
  };
  let failure = null;
  try {
    await preference("no-preference");
    await cdp("Emulation.clearDeviceMetricsOverride");
    await reset();
    await check("native-desktop-start", async () => {}, { persisted: "Original", saveDisabled: true, overflow: false });
    await capture("native-desktop");
    await fill("save-edit-A", "#draft", "A", { saveDisabled: false });
    await click("save-submit-A", "#save", { saveDisabled: true, saveStatus: "Saving “A”." });
    await fill("save-edit-B-during-A", "#draft", "B", { saveStatus: "Saving “A”. Later edits are unsaved." });
    await key("save-ignore-duplicate", "#draft", "Enter", { saveStatus: "Saving “A”. Later edits are unsaved." });
    await click("save-A-preserves-B", "#save-success", { persisted: "A", draft: "B", saveStatus: "Unsaved changes.", saveDisabled: false });
    await click("save-B-submit", "#save", { saveStatus: "Saving “B”." });
    await click("save-failure-retains-draft", "#save-failure", { persisted: "A", draft: "B", saveError: "Save failed. Your draft is retained; try again." });
    await click("save-retry", "#save", { saveStatus: "Saving “B”.", saveError: "" });
    await click("save-retry-success", "#save-success", { persisted: "B", draft: "B", saveDisabled: true });
    await fill("save-empty", "#draft", "");
    await click("save-required-error", "#save", { active: "draft", saveError: "Enter a display name.", persisted: "B" });
    await fill("save-recover-validity", "#draft", "B", { saveError: "", saveDisabled: true });

    await fill("search-query-A", "#query", "A");
    await key("search-submit-A", "#query", "Enter", { searchStatus: "Searching “A”." });
    await fill("search-query-B", "#query", "B");
    await key("search-submit-B", "#query", "Enter", { searchStatus: "Searching “B”." });
    await result("search-B-before-A", "Resolve 2 (B): results", { results: ["B · 1", "B · 2"] });
    await result("search-stale-A-ignored", "Resolve 1 (A): results", { results: ["B · 1", "B · 2"], searchStatus: "Results for “B”." });
    await result("search-select-detail", "B · 2", { detail: "B · 2", active: "detail-heading" });
    for (const width of [320, 375, 768, 1024, 1440]) {
      await check(`selected-detail-${width}`, () => size(width), { viewport: width, query: "B", detail: "B · 2", active: "detail-heading", listVisible: width > 640, overflow: false });
      if (width === 375) await capture("detail-375");
    }
    await click("detail-parent-return", "#back-results", { detail: null, activeText: "B · 2" });
    await check("detail-browser-forward", async () => {
      // Aside's navigation waiter expects a load event, but this is same-document history.
      const history = await cdp("Page.getNavigationHistory");
      const next = history.entries[history.currentIndex + 1];
      if (!next) throw Error("Missing forward history entry.");
      await cdp("Page.navigateToHistoryEntry", { entryId: next.id });
    }, { detail: "B · 2", active: "detail-heading" });
    await fill("search-empty-query", "#query", "empty");
    await key("search-empty-submit", "#query", "Enter", { searchStatus: "Searching “empty”." });
    await result("search-selection-removed", "Resolve 3 (empty): empty", { results: [], detail: null, active: "query", searchStatus: "No results for “empty”. Try another query. Previous selection is unavailable." });
    await key("search-retry-submit", "#query", "Enter", { searchStatus: "Searching “empty”." });
    await result("search-failure", "Resolve 4 (empty): failure", { results: [], searchStatus: "Search “empty” failed. Previous results retained; retry the search." });

    await click("inventory-open", "#open-inventory", { openDialogs: ["inventory-dialog"], selected: "A" });
    await click("decision-open", "#equip-item", { openDialogs: ["inventory-dialog", "equip-dialog"], active: "cancel-equip" });
    await key("decision-tab-wrap", "#cancel-equip", "Tab", { active: "confirm-equip" });
    await key("decision-reverse-wrap", "#confirm-equip", "Shift+Tab", { active: "cancel-equip" });
    await capture("nested-dialogs");
    await escape("cancel-one-layer", { openDialogs: ["inventory-dialog"], selected: "A" });
    await escape("cancel-second-layer", { openDialogs: [], active: "open-inventory" });
    await click("inventory-reopen", "#open-inventory", { openDialogs: ["inventory-dialog"] });
    await click("equipment-A-decision", "#equip-item", { active: "cancel-equip" });
    await click("equipment-A-request", "#confirm-equip", { equipmentStatus: "Equipment request pending: A.", equipDisabled: true });
    await key("pending-dialog-tab", "#cancel-equip", "Tab", { active: "cancel-equip" });
    await escape("equipment-close-decision-pending", { openDialogs: ["inventory-dialog"] });
    await check("select-B-while-A-pending", () => page.getByRole("radio", { name: "Item B", exact: true }).check(), { selected: "B", inventoryStatus: "Selected: B. Equipped: none. Pending: A." });
    await click("close-before-response", "#close-inventory", { openDialogs: [], active: "open-inventory" });
    await click("equipment-A-after-close", "#equip-success", { openDialogs: [], selected: "B", equipmentStatus: "Equipped: A." });
    await click("equipment-reconcile", "#open-inventory", { selected: "B", inventoryStatus: "Selected: B. Equipped: A." });
    await click("equipment-B-decision", "#equip-item", { active: "cancel-equip" });
    await click("equipment-B-request", "#confirm-equip", { equipmentStatus: "Equipment request pending: B." });
    await escape("equipment-B-close-decision", { openDialogs: ["inventory-dialog"] });
    await escape("equipment-B-close-inventory", { openDialogs: [] });
    await click("equipment-failure-retains-A", "#equip-failure", { equipmentStatus: "Equipment request failed. Equipped: A. Reopen inventory to retry." });
    for (let n = 1; n <= 3; n++) {
      await click(`repeated-inventory-open-${n}`, "#open-inventory", { inventoryStatus: "Selected: B. Equipped: A." });
      await escape(`repeated-inventory-close-${n}`, { openDialogs: [], active: "open-inventory" });
    }

    await click("reward-granted-before-reveal", "#claim-reward", { rewardCount: "Rewards granted: 1", claimDisabled: true, skipDisabled: false });
    await click("reward-skip-once", "#skip-reveal", { rewardCount: "Rewards granted: 1", rewardStatus: "Reward received.", skipDisabled: true, active: "reward-status" });
    await key("disclosure-enter", "#delivery summary", "Enter", { disclosure: true });
    // Explicit key code is needed for Space's native default action in Aside.
    await check("disclosure-space", async () => {
      await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " });
      await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
    }, { disclosure: false });
    await key("range-keyboard", "#position", "ArrowRight", { position: "51", positionStatus: "Committed position: 51" });
    const range = await page.locator("#position").boundingBox();
    await check("range-pointer-start", async () => { await page.mouse.move(range.x + range.width * .51, range.y + range.height / 2); await page.mouse.down(); }, { position: "51" });
    await check("range-pointer-preview", () => page.mouse.move(range.x + range.width * .75, range.y + range.height / 2), { position: "75", positionStatus: "Preview position: 75. Committed: 51." });
    await escape("range-cancel-preview", { position: "51", positionStatus: "Committed position: 51" });
    await check("range-release-after-cancel", () => page.mouse.up(), { position: "51", positionStatus: "Committed position: 51" });

    const longLabel = "긴이름".repeat(100);
    await fill("long-draft", "#draft", longLabel);
    await click("long-draft-submit", "#save", { draft: longLabel });
    await click("long-draft-confirm", "#save-success", { persisted: longLabel });
    await fill("long-query", "#query", longLabel);
    await key("long-query-submit", "#query", "Enter", {});
    await check("long-query-results", async () => {
      const response = page.locator("#search-responses > div:last-child > button:first-child");
      if (await response.textContent() !== `Resolve 5 (${longLabel}): results`) throw Error("Unexpected long-query response control.");
      await response.click();
    }, { results: [`${longLabel} · 1`, `${longLabel} · 2`] });
    for (const width of [320, 375, 768, 1024, 1440]) await check(`long-content-${width}`, () => size(width), { viewport: width, overflow: false });
    await check("rtl-320", async () => {
      await size(320);
      // A declared content-fixture mutation, not an interaction shortcut.
      await page.evaluate(() => { document.documentElement.dir = "rtl"; });
    }, { overflow: false });
    await capture("long-rtl-320");

    await reset();
    await click("motion-reveal-start", "#claim-reward", { rewardStatus: "Reward received. Revealing…", skipDisabled: false });
    await check("motion-preference-during-reveal", () => preference("reduce"), { motion: "Motion: reduced. Status changes immediately.", animations: 0, rewardStatus: "Reward received.", rewardCount: "Rewards granted: 1", skipDisabled: true });
    await reset();
    await click("reduced-motion-from-entry", "#claim-reward", { animations: 0, rewardStatus: "Reward received.", rewardCount: "Rewards granted: 1", skipDisabled: true });
    await capture("reduced-motion-320");
    await check("preference-return-to-normal", () => preference("no-preference"), { motion: "Motion: normal. Status changes immediately.", rewardCount: "Rewards granted: 1" });
    await check("no-runtime-errors", async () => { if (errors.length) throw Error(JSON.stringify(errors)); }, { openDialogs: [], overflow: false });
  } catch (error) {
    failure = String(error);
  } finally {
    await cdp("Emulation.clearDeviceMetricsOverride");
    await cdp("Emulation.setEmulatedMedia", { features: [] });
    page.off("pageerror", onError);
    const report = { kind: "local-browser-observation", started, finished: new Date().toISOString(), runtime, sources, inputs: ["automated keyboard events", "automated pointer events"], emulation: "Viewport sizes and media preferences only; no mobile hardware emulation or touch claim.", checks, errors, captures, captureMetrics, failure, ok: !failure && errors.length === 0 && checks.every((entry) => entry.ok) };
    await fs.writeFile(`${artifactRoot}/report.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ artifactRoot, checks: checks.length, ok: report.ok, failure }));
  }
  if (failure) throw Error(failure);
}
await runInteractionQA();
