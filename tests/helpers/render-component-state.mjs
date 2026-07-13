import fs from "node:fs";
import path from "node:path";
import { resolveProfileRecords } from "../../scripts/profile-record-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const governedRoot = path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function tokenValue(tokens, reference) {
  const segments = reference.slice(1, -1).split(".");
  let current = tokens;
  for (const segment of segments) current = current[segment];
  return current.$value;
}

function cssColor(value) {
  const channels = value.components.map((component) => Math.round(component * 255));
  return `rgb(${channels.join(" ")} / ${value.alpha})`;
}

function cssDimension(value) {
  return `${value.value}${value.unit}`;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function componentStateProfiles() {
  return fs.readdirSync(governedRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(governedRoot, entry.name, "profile.json")))
    .map((entry) => entry.name)
    .sort();
}

export function componentStateFixture(profileName) {
  const profileRoot = path.join(governedRoot, profileName);
  const failures = [];
  const resolved = resolveProfileRecords(profileRoot, failures);
  if (!resolved || failures.length > 0) throw new Error(`invalid governed profile ${profileName}: ${JSON.stringify(failures)}`);
  const foundations = readJson(path.join(profileRoot, resolved.profile.local_foundations));
  const tokens = readJson(path.join(profileRoot, resolved.profile.tokens));
  const component = resolved.records.component[0].value;
  const fixture = resolved.records.fixture[0].value;
  const states = resolved.records.states[0].value;
  const modes = new Map(component.semantic_modes.map((mode) => [mode.id, mode]));
  const scenarios = new Map(states.scenarios.map((scenario) => [scenario.id, scenario]));
  return {
    colors: {
      accent: cssColor(tokenValue(tokens, foundations.bindings.accent)),
      canvas: cssColor(tokenValue(tokens, foundations.bindings.canvas)),
      text: cssColor(tokenValue(tokens, foundations.bindings.text)),
    },
    font: foundations.bindings.body_font_family,
    profileId: resolved.profile.id,
    profileName,
    scenarios: fixture.scenarios.map((runtime) => ({
      ...runtime,
      aria: scenarios.get(runtime.id).aria,
      expected: scenarios.get(runtime.id).expected,
      states: scenarios.get(runtime.id).states,
      role: modes.get(runtime.semantic_mode).role,
    })),
    spacing: {
      page: cssDimension(tokens.space.page.$value),
      rhythm: cssDimension(tokenValue(tokens, foundations.bindings.content_rhythm)),
    },
  };
}

export async function renderComponentState(page, fixture, scenarioId, mutation = "none") {
  const scenario = fixture.scenarios.find((candidate) => candidate.id === scenarioId);
  if (!scenario) throw new Error(`unknown canonical scenario ${scenarioId}`);
  const isDisabled = scenario.states.includes("disabled") && mutation !== "runtime-disabled-activation";
  const initialVisual = scenario.expected.visual.filter((state) => !["expanded", "pressed"].includes(state));
  const attributes = Object.entries(scenario.aria)
    .map(([name, value]) => `aria-${name}="${escapeHtml(name === "expanded" || name === "pressed" ? "false" : value)}"`)
    .join(" ");
  const panel = scenario.semantic_mode === "disclosure" ? `<section id="controlled-panel" hidden>Controlled ${escapeHtml(fixture.profileName)} details</section>` : "";
  const unknown = mutation === "runtime-unknown-scenario" ? '<button data-scenario-id="unknown-scenario">Unknown</button>' : "";
  const runtime = JSON.stringify({
    activation: scenario.expected.activation,
    activationKey: scenario.activation_key,
    mode: scenario.semantic_mode,
    mutation,
    visual: scenario.expected.visual,
  }).replaceAll("<", "\\u003c");
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
    *,*::before,*::after{box-sizing:border-box}
    body{background:var(--canvas);color:var(--text);font-family:var(--font);margin:0;padding:var(--page-space)}
    main{display:grid;gap:var(--content-rhythm);inline-size:min(100%,640px)}
    .capture{padding:6px}
    button{background:var(--canvas);border:2px solid var(--accent);color:var(--text);font:inherit;inline-size:100%;min-block-size:44px;padding:8px 16px;text-align:start}
    button:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
    button[data-visual~="pressed"],button[data-visual~="expanded"]{background:var(--accent);color:var(--canvas)}
    button[data-visual~="disabled"]{opacity:.55}
    #controlled-panel{margin-block-start:14px}
    [hidden]{display:none}
  </style></head><body style="--accent:${fixture.colors.accent};--canvas:${fixture.colors.canvas};--text:${fixture.colors.text};--font:${escapeHtml(fixture.font)};--page-space:${fixture.spacing.page};--content-rhythm:${fixture.spacing.rhythm}">
    <main data-profile="${escapeHtml(fixture.profileName)}">
      <div class="capture" data-capture-padding="6">
        <button id="control" data-activations="0" data-mode="${scenario.semantic_mode}" data-scenario-id="${scenario.id}" data-visual="${initialVisual.join(" ")}" ${attributes} ${isDisabled ? "disabled" : ""}>${escapeHtml(scenario.label)}${scenario.states.includes("loading") ? '<span aria-hidden="true"> · Loading</span>' : ""}</button>
        ${panel}
      </div>
      ${unknown}
    </main>
    <script>
      const runtime = ${runtime};
      const control = document.getElementById("control");
      const panel = document.getElementById("controlled-panel");
      const increment = () => control.dataset.activations = String(Number(control.dataset.activations) + 1);
      if (runtime.mutation === "runtime-key-mismatch") control.addEventListener("keydown", (event) => { if (event.key === runtime.activationKey) event.preventDefault(); });
      control.addEventListener("click", () => {
        if (runtime.activation === "suppressed" && runtime.mutation !== "runtime-disabled-activation") return;
        increment();
        if (runtime.mode === "toggle") {
          if (runtime.mutation !== "runtime-pressed-false") control.setAttribute("aria-pressed", "true");
          control.dataset.visual = runtime.mutation === "runtime-visual-ready" ? "ready" : runtime.visual.join(" ");
        }
        if (runtime.mode === "disclosure") {
          if (runtime.mutation !== "runtime-expanded-ax-mismatch") control.setAttribute("aria-expanded", "true");
          control.dataset.visual = runtime.visual.join(" ");
          panel.hidden = false;
        }
      });
    </script>
  </body></html>`);
  return scenario;
}
