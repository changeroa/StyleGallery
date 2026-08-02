export const VIEWPORTS = Object.freeze([
  Object.freeze({ height: 720, width: 320 }),
  Object.freeze({ height: 812, width: 375 }),
  Object.freeze({ height: 768, width: 768 }),
  Object.freeze({ height: 768, width: 1024 }),
  Object.freeze({ height: 900, width: 1440 }),
]);

export const CONTAINERS = Object.freeze([
  Object.freeze({ id: "tight", inlineSize: "240px" }),
  Object.freeze({ id: "medium", inlineSize: "32rem" }),
  Object.freeze({ id: "roomy", inlineSize: "54rem" }),
  Object.freeze({ id: "full", inlineSize: "100%" }),
]);

export const CONTENTS = Object.freeze([
  Object.freeze({ body: "", id: "empty", label: "Empty content probe" }),
  Object.freeze({ body: "A deliberately long navigation label that must wrap without widening its container", id: "long-label", label: "Long label probe" }),
  Object.freeze({
    body: "Migration evidence remains consumer-owned. This intentionally long paragraph exercises line wrapping, intrinsic sizing, and stable reading order without claiming that a synthetic fixture certifies a product.",
    id: "long-paragraph",
    label: "Long paragraph probe",
  }),
  Object.freeze({
    body: "소비자가\u00a0증거를\u00a0실행합니다. 소비자가\u00a0결과를\u00a0검증합니다. 긴\u00a0문장도\u00a0잘\u00a0줄바꿈됩니다. 의미도\u00a0온전히\u00a0유지됩니다.",
    id: "cjk",
    label: "CJK content probe",
    protectedPhrases: Object.freeze([
      "소비자가\u00a0증거를\u00a0실행합니다.",
      "소비자가\u00a0결과를\u00a0검증합니다.",
      "긴\u00a0문장도\u00a0잘\u00a0줄바꿈됩니다.",
      "의미도\u00a0온전히\u00a0유지됩니다.",
    ]),
  }),
  Object.freeze({ body: `unbroken-${"consumerconformance".repeat(12)}`, id: "unbroken", label: "Unbroken content probe" }),
]);

export const STATES = Object.freeze(["default", "hover", "focus", "active", "disabled", "error", "loading"]);

export const OVERLAYS = Object.freeze([
  Object.freeze({ id: "drawer", label: "Navigation drawer" }),
  Object.freeze({ id: "dialog", label: "Migration confirmation" }),
]);

export const ZOOM_CASES = Object.freeze([
  Object.freeze({ height: 768, pageScaleFactor: 2, width: 1024 }),
  Object.freeze({ height: 900, pageScaleFactor: 2, width: 1440 }),
]);

export function layoutCases() {
  return VIEWPORTS.flatMap((viewport) => CONTAINERS.flatMap((container) => CONTENTS.map((content) => ({
    caseId: `layout-w${viewport.width}-${container.id}-${content.id}`,
    container,
    content,
    viewport,
  }))));
}

export function stateCases() {
  return VIEWPORTS.flatMap((viewport) => STATES.map((state) => ({
    caseId: `state-w${viewport.width}-${state}`,
    state,
    viewport,
  })));
}

export function overlayCases() {
  return VIEWPORTS.flatMap((viewport) => OVERLAYS.map((overlay) => ({
    caseId: `${overlay.id}-w${viewport.width}`,
    overlay,
    viewport,
  })));
}

export function zoomCases() {
  return ZOOM_CASES.map((viewport) => ({
    caseId: `zoom-w${viewport.width}-scale${viewport.pageScaleFactor}`,
    viewport,
  }));
}

const REQUIRED_SENTINELS = Object.freeze([
  "ci-cleanup-symlink",
  "clipped-focus",
  "console-error",
  "dialog-focus-leak",
  "low-contrast",
  "overflow",
  "page-evidence-existing-output",
  "page-evidence-symlink",
]);

function withKind(kind, scenarios) {
  return scenarios.map((scenario) => Object.freeze({ kind, ...scenario }));
}

function immutableMatrix(scenarios) {
  return Object.freeze(scenarios);
}

export function fullScenarioMatrix() {
  return immutableMatrix([
    ...withKind("layout", layoutCases()),
    ...withKind("state", stateCases()),
    ...withKind("overlay", overlayCases()),
    ...withKind("zoom", zoomCases()),
  ]);
}

export function scenarioMatrix(name = "full") {
  if (name === "full") return fullScenarioMatrix();
  if (name === "candidate") return candidateScenarioMatrix();
  throw new Error(`unsupported consumer conformance matrix: ${name}`);
}

function addUnique(target, seen, scenario) {
  if (seen.has(scenario.caseId)) return;
  seen.add(scenario.caseId);
  target.push(Object.freeze(scenario));
}

export function candidateScenarioMatrix() {
  const selected = [];
  const seen = new Set();

  // A deterministic cyclic covering array covers every viewport/content pair,
  // every viewport/container pair, and every container/content pair.
  VIEWPORTS.forEach((viewport, viewportIndex) => {
    CONTENTS.forEach((content, contentIndex) => {
      const container = CONTAINERS[(viewportIndex + contentIndex) % CONTAINERS.length];
      addUnique(selected, seen, { caseId: `layout-w${viewport.width}-${container.id}-${content.id}`, container, content, kind: "layout", viewport });
    });
  });

  const layouts = layoutCases();
  for (const caseId of [
    "layout-w320-tight-empty",
    "layout-w1440-full-unbroken",
    "layout-w320-full-unbroken",
  ]) addUnique(selected, seen, { kind: "layout", ...layouts.find((scenario) => scenario.caseId === caseId) });

  for (const scenario of stateCases()) addUnique(selected, seen, { kind: "state", ...scenario });
  const overlays = overlayCases();
  for (const caseId of ["drawer-w320", "dialog-w375", "dialog-w1440"]) {
    addUnique(selected, seen, { kind: "overlay", ...overlays.find((scenario) => scenario.caseId === caseId) });
  }
  for (const scenario of zoomCases()) addUnique(selected, seen, { kind: "zoom", ...scenario });
  return immutableMatrix(selected);
}

export function assertionPolicyCounters(matrix) {
  const caseIds = matrix.map(({ caseId }) => caseId);
  const byKind = Object.fromEntries(["layout", "state", "overlay", "zoom"].map((kind) => [kind, matrix.filter((scenario) => scenario.kind === kind).length]));
  const overlayCount = byKind.overlay;
  return Object.freeze({
    axe_calls: matrix.length + overlayCount,
    case_ids: Object.freeze(caseIds),
    contrast_calls: matrix.length + overlayCount,
    evidence_write_calls: matrix.length,
    named_mutation_assertions: Object.freeze([
      "color-contrast",
      "console_error_free",
      "dialog_focus_trap",
      "document_no_horizontal_overflow",
      "focus_geometry_visible",
    ]),
    required_evidence_ids: Object.freeze(["state-w1024-focus"]),
    required_sentinel_ids: REQUIRED_SENTINELS,
    screenshot_calls: matrix.length,
    test_count: matrix.length,
    tests_by_kind: Object.freeze(byKind),
  });
}
