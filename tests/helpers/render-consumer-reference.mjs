import { patterns, samples } from "../../scripts/pattern-data.mjs";

const CANONICAL_PATTERN = "card-grid";

function declarationsToCss(declarations) {
  return declarations
    .map(([selector, properties]) => `${selector}{${Object.entries(properties).map(([name, value]) => `${name}:${value}`).join(";")}}`)
    .join("\n");
}

export function canonicalConsumerReference() {
  const pattern = patterns.find(([name]) => name === CANONICAL_PATTERN);
  if (!pattern) throw new Error(`canonical pattern ${CANONICAL_PATTERN} is unavailable`);
  return {
    css: declarationsToCss(pattern[6]),
    html: samples[CANONICAL_PATTERN],
    pattern: CANONICAL_PATTERN,
  };
}

export async function renderConsumerReference(page, mutation = "none") {
  const fixture = canonicalConsumerReference();
  const mutationCss = mutation === "hidden-layout" ? ".card_grid{display:none;gap:99999rem}" : "";
  const mutationHtml = mutation === "long-content-reflow"
    ? fixture.html.replace("Design audit", `Design audit ${"unbroken".repeat(256)}`)
    : fixture.html;
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *,*::before,*::after{box-sizing:border-box}
    html,body{margin:0;min-block-size:100%}
    body{padding:24px}
    .card_grid>article{min-block-size:120px;padding:16px}
    ${fixture.css}
    ${mutationCss}
  </style></head><body>${mutationHtml}</body></html>`);
  return fixture;
}
