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
