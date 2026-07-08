#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const validator = path.join(root, "scripts", "validate-patterns.mjs");
const cases = [
  {
    name: "missing_metadata",
    file: "patterns/stacking/bad.md",
    content: "# Bad\n\n## HTML\n\n```html\n<div></div>\n```\n\n## CSS\n\n```css\n.bad {\n    display: grid;\n}\n```\n\n## Failure Mode\n\nBad.\n\n## Accessibility Notes\n\nBad.\n",
    expect: "missing frontmatter",
  },
  {
    name: "unsorted_css",
    file: "patterns/stacking/bad.md",
    content: pattern("bad", "Stacking", ".bad {\n    width: 100%;\n    display: grid;\n}"),
    expect: "declarations are not alphabetical",
  },
  {
    name: "forbidden_property",
    file: "patterns/stacking/bad.md",
    content: pattern("bad", "Stacking", ".bad {\n    background: red;\n    display: grid;\n}"),
    expect: "forbidden decorative property",
  },
  {
    name: "id_selector",
    file: "patterns/stacking/bad.md",
    content: pattern("bad", "Stacking", "#bad {\n    display: grid;\n}"),
    expect: "selector uses id",
  },
  {
    name: "missing_html_block",
    file: "patterns/stacking/bad.md",
    content: pattern("bad", "Stacking", ".bad {\n    display: grid;\n}", ""),
    expect: "missing html code block",
  },
  {
    name: "missing_css_block",
    file: "patterns/stacking/bad.md",
    content: pattern("bad", "Stacking", "", "<section class=\"bad\"></section>"),
    expect: "missing css code block",
  },
  {
    name: "missing_css_hook_in_html",
    file: "patterns/stacking/bad.md",
    content: pattern("bad", "Stacking", ".bad {\n    display: grid;\n}\n\n.bad_item {\n    display: grid;\n}"),
    expect: "is missing from HTML block",
  },
  {
    name: "missing_contract_section",
    file: "patterns/stacking/bad.md",
    content: legacyPattern("bad", "Stacking", ".bad {\n    display: grid;\n}"),
    expect: "missing Core Properties section",
  },
  {
    name: "missing_accessibility_risk_details",
    file: "patterns/stacking/bad.md",
    content: legacyPattern("bad", "Stacking", ".bad {\n    display: grid;\n}"),
    expect: "missing accessibility risk detail",
  },
  {
    name: "contract_sections_inside_code_block",
    file: "patterns/stacking/bad.md",
    content: legacyPattern(
      "bad",
      "Stacking",
      ".bad {\n    display: grid;\n}\n\n/*\n## Core Properties\n## Properties That Break The Layout If Removed\n## Constraints And Change Points\n## Scroll Ownership\n## Accessibility And Source Order Notes\n## Browser And Fallback Notes\n## Composition Notes\n## Anti-patterns\n*/",
    ),
    expect: "missing Core Properties section",
  },
  {
    name: "reflow_without_reflow_mechanic",
    file: "patterns/split-sidebar/bad.md",
    content: pattern("bad", "Split / Sidebar", ".bad {\n    display: grid;\n    grid-template-columns: 16rem minmax(0, 1fr);\n}", "<section class=\"bad\"><article>Customer queue</article><article>Selected customer</article></section>", "reflow"),
    expect: "responsiveness reflow requires",
  },
  {
    name: "reflow_tokens_inside_css_comment",
    file: "patterns/split-sidebar/bad.md",
    content: pattern("bad", "Split / Sidebar", ".bad {\n    display: grid;\n    grid-template-columns: 24rem 24rem;\n}\n\n/* auto-fit 100% */", "<section class=\"bad\"><article>Customer queue</article><article>Selected customer</article></section>", "reflow"),
    expect: "responsiveness reflow requires",
  },
  {
    name: "unused_html_class",
    file: "patterns/stacking/bad.md",
    content: pattern("bad", "Stacking", ".bad {\n    display: grid;\n}", "<section class=\"bad\"><div class=\"bad_extra\"></div></section>"),
    expect: "has no CSS rule",
  },
  {
    name: "placeholder_html",
    file: "patterns/stacking/bad.md",
    content: pattern("bad", "Stacking", ".bad {\n    display: grid;\n}", "<section class=\"bad\"><article>First item</article></section>"),
    expect: "placeholder sample phrase",
  },
  {
    name: "success_path",
    file: "patterns/stacking/good.md",
    content: pattern("good", "Stacking", ".good {\n    display: grid;\n    gap: 1rem;\n}", "<section class=\"good\"><article>Quarterly review</article></section>"),
    expect: null,
  },
  {
    name: "default_min_count",
    file: "patterns/stacking/good.md",
    content: pattern("good", "Stacking", ".good {\n    display: grid;\n    gap: 1rem;\n}", "<section class=\"good\"><article>Quarterly review</article></section>"),
    expect: null,
    useDefaultMinCount: true,
  },
];

function legacyPattern(name, category, css, html = `<section class="${name}"></section>`, responsiveness = "fluid") {
  const cssBlock = css ? `\n\`\`\`css\n${css}\n\`\`\`\n` : "\n";
  return `---\nname: ${name}\ncategory: ${category}\nprimary_spatial_problem: Test spatial problem.\nsecondary_spatial_problems: none\nlayout_axis: block\ncontent_shape: mixed\nresponsiveness: ${responsiveness}\nconstraints: Test constraints.\nscroll_ownership: No internal scroll container.\nsource_lineage: test\n---\n\n# ${name}\n\n## When To Use\n\nUse for validation tests.\n\n## HTML\n\n\`\`\`html\n${html}\n\`\`\`\n\n## CSS\n${cssBlock}\n## Failure Mode\n\nBad layout.\n\n## Accessibility Notes\n\nKeep semantic order.\n`;
}

function pattern(name, category, css, html = `<section class="${name}"></section>`, responsiveness = "fluid") {
  const cssBlock = css ? `\n\`\`\`css\n${css}\n\`\`\`\n` : "\n";
  return `---\nname: ${name}\ncategory: ${category}\nprimary_spatial_problem: Test spatial problem.\nsecondary_spatial_problems: none\nlayout_axis: block\ncontent_shape: mixed\nresponsiveness: ${responsiveness}\nconstraints: Test constraints.\nscroll_ownership: No internal scroll container.\nsource_lineage: test\n---\n\n# ${name}\n\n## When To Use\n\nUse for validation tests.\n\n## HTML\n\n\`\`\`html\n${html}\n\`\`\`\n\n## CSS\n${cssBlock}\n## Core Properties\n\n- \`display\` establishes the layout context.\n\n## Properties That Break The Layout If Removed\n\n- Removing \`display\` removes the layout behavior.\n\n## Constraints And Change Points\n\nTest constraints.\n\n## Scroll Ownership\n\nNo internal scroll container.\n\n## Accessibility And Source Order Notes\n\n- Semantic role expectation: Preserve the element roles already present in the HTML sample.\n- DOM order expectation: Keep semantic order.\n- Focus risk: Keep focus order aligned with DOM order.\n- Scroll expectation: No internal scroll container.\n- Cognitive risk: Low when the pattern does not reorder meaning or hide controls.\n\n## Browser And Fallback Notes\n\nUse a simpler block fallback when needed.\n\n## Composition Notes\n\nCompose with semantic regions.\n\n## Anti-patterns\n\nDo not use for unrelated visual styling.\n`;
}

function runCase(testCase) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `layout-gallery-${testCase.name}-`));
  const absolute = path.join(dir, testCase.file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, testCase.content);
  const args = testCase.useDefaultMinCount ? [validator, "--json"] : [validator, "--min-count", "1", "--json"];
  const result = spawnSync(process.execPath, args, {
    cwd: dir,
    encoding: "utf8",
  });
  fs.rmSync(dir, { force: true, recursive: true });
  const output = JSON.parse(result.stdout);
  const passed = testCase.expect
    ? !output.ok && output.failures.some((failure) => failure.includes(testCase.expect))
    : output.ok && (!testCase.useDefaultMinCount || output.minCount === 1);
  return {
    name: testCase.name,
    ok: passed,
    expected: testCase.expect ?? "ok:true",
    actual: output,
  };
}

const results = cases.map(runCase);
const report = {
  ok: results.every((result) => result.ok),
  results,
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
