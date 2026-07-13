import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { readCaptureSession } from "../scripts/capture-session-contract.mjs";
import { compileSchemas } from "../scripts/component-state-contract.mjs";
import { componentStateFixture, componentStateProfiles, renderComponentState } from "./helpers/render-component-state.mjs";

const mutation = process.env.STATE_MUTATION ?? "none";
const artifactRoot = process.env.STATE_ARTIFACT_DIR;
const sessionFile = process.env.STATE_SESSION_RECEIPT;
const playwrightVersion = JSON.parse(fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), "../package.json"), "utf8")).devDependencies["@playwright/test"];
const sessionFailures = [];
const schemas = compileSchemas(path.resolve(path.dirname(new URL(import.meta.url).pathname), "../consumer-reference/schema"));
const captureSession = sessionFile ? readCaptureSession(path.resolve(sessionFile), schemas.capture, sessionFailures) : undefined;
if (artifactRoot && (!captureSession || sessionFailures.length > 0)) throw new Error(`valid STATE_SESSION_RECEIPT is required for capture: ${JSON.stringify(sessionFailures)}`);

function normalizeBoolean(value) {
  return value === true || value === 1 || value === "true" || value === "1";
}

async function axObservation(session, fixture, scenario, capturedAt, captureLink) {
  const tree = await session.send("Accessibility.getFullAXTree");
  const node = tree.nodes.find((candidate) => candidate.role?.value === scenario.role && candidate.name?.value === scenario.label);
  expect(node, `ax_${scenario.id}`).toBeTruthy();
  const raw = Object.fromEntries(node.properties.map((property) => [property.name, property.value.value]));
  const properties = {};
  for (const [key, expected] of Object.entries(scenario.expected.ax)) {
    if (key !== "role") properties[key] = typeof expected === "boolean" ? normalizeBoolean(raw[key]) : raw[key];
  }
  return { capture_session: captureLink, captured_at: capturedAt, channel: "ax", name: node.name.value, profile_id: fixture.profileId, properties, role: node.role.value, scenario_id: scenario.id, schema_version: "1.0", semantic_mode: scenario.semantic_mode };
}

async function domObservation(control, fixture, scenario, capturedAt, captureLink) {
  const observation = await control.evaluate((element, expected) => {
    const attributes = {};
    for (const key of Object.keys(expected.dom)) {
      if (key.startsWith("aria-") || key === "disabled") attributes[key] = key === "disabled" ? String(element.disabled) : element.getAttribute(key);
    }
    return {
      activation_count: Number(element.dataset.activations),
      activation_key: expected.activationKey,
      active: document.activeElement === element,
      attributes,
      channel: "dom",
      profile_id: expected.profileId,
      role: element.tagName === "BUTTON" ? "button" : element.getAttribute("role"),
      scenario_id: expected.scenarioId,
      schema_version: "1.0",
      semantic_mode: expected.mode,
      visual_states: element.dataset.visual.split(/\s+/).filter(Boolean),
    };
  }, { activationKey: scenario.activation_key, dom: scenario.expected.dom, mode: scenario.semantic_mode, profileId: fixture.profileId, scenarioId: scenario.id });
  return { ...observation, capture_session: captureLink, captured_at: capturedAt };
}

async function captureEvidence(page, fixture, scenario, session) {
  if (!artifactRoot) return;
  fs.mkdirSync(artifactRoot, { recursive: true });
  const viewport = page.viewportSize();
  const intendedProfile = captureSession.receipt.intended.find((profile) => profile.profile_id === fixture.profileId && profile.profile_name === fixture.profileName);
  const intendedScenario = intendedProfile?.scenarios.find((entry) => entry.id === scenario.id);
  expect(intendedScenario?.channels, "capture_session_intent_mismatch").toEqual(["ax", "dom", "visual"]);
  expect(captureSession.receipt.environment.browser, "capture_session_browser_mismatch").toContain(page.context().browser().version());
  expect(captureSession.receipt.environment.playwright, "capture_session_playwright_mismatch").toBe(playwrightVersion);
  expect(captureSession.receipt.environment.viewport, "capture_session_viewport_mismatch").toBe(`${viewport.width}x${viewport.height}`);
  const capturedAt = new Date().toISOString();
  const control = page.locator("#control");
  const stem = `${fixture.profileName}-${scenario.id}`;
  const png = await page.locator(".capture").screenshot({ animations: "disabled", caret: "hide" });
  const dom = await domObservation(control, fixture, scenario, capturedAt, captureSession.link);
  const ax = await axObservation(session, fixture, scenario, capturedAt, captureSession.link);
  fs.writeFileSync(path.join(artifactRoot, `${stem}.png`), png);
  fs.writeFileSync(path.join(artifactRoot, `${stem}.dom.json`), `${JSON.stringify(dom, null, 2)}\n`);
  fs.writeFileSync(path.join(artifactRoot, `${stem}.ax.json`), `${JSON.stringify(ax, null, 2)}\n`);
}

for (const profile of componentStateProfiles()) {
  const fixture = componentStateFixture(profile);
  for (const canonical of fixture.scenarios) {
    test(`${profile} ${canonical.id} follows canonical keyboard, visual, DOM, and AX state`, async ({ page }) => {
      const scenario = await renderComponentState(page, fixture, canonical.id, mutation);
      const control = page.locator("#control");
      const session = await page.context().newCDPSession(page);
      await expect(page.locator("[data-scenario-id]"), "state_runtime_unknown_scenario").toHaveCount(1);
      await expect(page.locator(".capture"), "state_capture_wrapper").toHaveCSS("padding", "6px");

      if (scenario.states.includes("disabled")) {
        await expect(control, "disabled_surface_mismatch").toBeDisabled();
        await control.click({ force: true });
      } else {
        await page.keyboard.press("Tab");
        await expect(control, "focus_surface_mismatch").toBeFocused();
        if (scenario.states.includes("focus")) {
          await expect(control, "focus_outline_visible").toHaveCSS("outline-width", "3px");
          await expect(control, "focus_outline_offset_visible").toHaveCSS("outline-offset", "3px");
        }
        await page.keyboard.press(scenario.activation_key);
      }

      const expectedActivations = scenario.expected.activation === "allowed" ? "1" : "0";
      await expect(control, "state_activation_key_parity").toHaveAttribute("data-activations", expectedActivations);
      await expect(control, "visual_surface_parity").toHaveAttribute("data-visual", scenario.expected.visual.join(" "));
      for (const [name, value] of Object.entries(scenario.aria)) await expect(control, `${name}_surface_mismatch`).toHaveAttribute(`aria-${name}`, value);
      if (scenario.states.includes("expanded")) {
        const panel = page.locator("#controlled-panel");
        await expect(panel, "expanded_surface_mismatch").toBeVisible();
        const clearance = await control.evaluate((element) => {
          const controlled = document.getElementById("controlled-panel");
          const style = getComputedStyle(element);
          const outlineEdge = element.getBoundingClientRect().bottom
            + Number.parseFloat(style.outlineWidth)
            + Math.max(0, Number.parseFloat(style.outlineOffset));
          return controlled.getBoundingClientRect().top - outlineEdge;
        });
        expect(clearance, "focus_ring_clearance").toBeGreaterThanOrEqual(8);
      }

      const dom = await domObservation(control, fixture, scenario);
      for (const [name, expected] of Object.entries(scenario.expected.dom)) {
        const actual = name === "active" ? String(dom.active) : name === "role" ? dom.role : dom.attributes[name];
        expect(actual, `${name}_surface_mismatch`).toBe(expected);
      }
      const ax = await axObservation(session, fixture, scenario);
      expect(ax.role, "role_surface_mismatch").toBe(scenario.expected.ax.role);
      for (const [name, expected] of Object.entries(scenario.expected.ax)) if (name !== "role") expect(ax.properties[name], `${name}_surface_mismatch`).toBe(expected);
      await captureEvidence(page, fixture, scenario, session);
    });
  }
}
