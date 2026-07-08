#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const minCountArg = process.argv.find((arg) => arg.startsWith("--min-count="));
const minCountIndex = process.argv.indexOf("--min-count");
const minCount = minCountArg ? Number(minCountArg.split("=")[1]) : minCountIndex === -1 ? 1 : Number(process.argv[minCountIndex + 1] || 1);
const json = args.has("--json");
const root = process.cwd();
const patternsDir = path.join(root, "patterns");

const requiredFields = [
  "name",
  "category",
  "primary_spatial_problem",
  "secondary_spatial_problems",
  "layout_axis",
  "content_shape",
  "responsiveness",
  "constraints",
  "scroll_ownership",
  "source_lineage",
];

const requiredSections = [
  "## When To Use",
  "## HTML",
  "## CSS",
  "## Core Properties",
  "## Properties That Break The Layout If Removed",
  "## Constraints And Change Points",
  "## Scroll Ownership",
  "## Accessibility And Source Order Notes",
  "## Browser And Fallback Notes",
  "## Composition Notes",
  "## Anti-patterns",
];

const requiredAccessibilityDetails = [
  "Semantic role expectation:",
  "DOM order expectation:",
  "Focus risk:",
  "Scroll expectation:",
  "Cognitive risk:",
];

const forbiddenProperties = [
  "animation",
  "background",
  "border",
  "border-radius",
  "box-shadow",
  "color",
  "filter",
  "font",
  "font-family",
  "font-size",
  "font-weight",
  "opacity",
  "text-align",
  "text-decoration",
  "transition",
  "transform",
];

const forbiddenHtmlPhrases = [
  "Alpha item",
  "Beta item",
  "Gamma item",
  "First item",
  "Second item",
  "Third item",
  "Item 1",
  "Main content",
  "Main region",
  "Media slot",
  "Primary content",
  "Primary region",
  "Readable content block",
  "Readable content region",
  "Region 1",
  "Region 2",
  "Region 3",
  "Related supporting notes",
  "Responsive media slot",
  "Secondary content",
  "Secondary region",
  "Section actions",
  "Section heading",
  "Scrollable content",
  "Scrollable content region",
  "Supporting aside",
  "Tertiary",
];

const failures = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(next);
    if (!entry.isFile() || !entry.name.endsWith(".md")) return [];
    return entry.name === "index.md" || entry.name === "log.md" ? [] : [next];
  });
}

function frontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  return Object.fromEntries(
    match[1].split("\n").map((line) => {
      const index = line.indexOf(":");
      if (index === -1) return [line.trim(), ""];
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
  );
}

function codeBlock(content, lang) {
  const match = content.match(new RegExp(`\\\`\\\`\\\`${lang}\\n([\\s\\S]*?)\\n\\\`\\\`\\\``));
  return match?.[1] ?? "";
}

function stripFencedCodeBlocks(content) {
  return content.replace(/```[\s\S]*?```/g, "");
}

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function hasHeading(content, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}$`, "m").test(content);
}

function checkCss(file, css) {
  const rulePattern = /([^{}]+)\{([^{}]+)\}/g;
  let match;
  let ruleCount = 0;
  while ((match = rulePattern.exec(css)) !== null) {
    ruleCount += 1;
    const selector = match[1].trim();
    if (selector.includes("#")) failures.push(`${file}: selector uses id: ${selector}`);
    const declarations = match[2].split(";").map((part) => part.trim()).filter(Boolean);
    const properties = declarations.map((declaration) => declaration.split(":")[0].trim());
    const sorted = [...properties].sort((a, b) => a.localeCompare(b));
    if (properties.join("|") !== sorted.join("|")) {
      failures.push(`${file}: declarations are not alphabetical in ${selector}: ${properties.join(", ")}`);
    }
    for (const property of properties) {
      if (forbiddenProperties.includes(property) || forbiddenProperties.some((blocked) => property.startsWith(`${blocked}-`))) {
        failures.push(`${file}: forbidden decorative property ${property} in ${selector}`);
      }
    }
  }
  if (ruleCount === 0) failures.push(`${file}: no CSS rules found`);
}

function checkHtmlCssHooks(file, html, css) {
  const htmlClasses = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((match) => match[1].split(/\s+/)));
  const cssClasses = [...new Set([...css.matchAll(/\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)].map((match) => match[1]))];
  for (const className of cssClasses) {
    if (!htmlClasses.has(className)) failures.push(`${file}: css class .${className} is missing from HTML block`);
  }
  for (const className of htmlClasses) {
    if (!cssClasses.includes(className)) failures.push(`${file}: html class .${className} has no CSS rule`);
  }
}

function checkHtmlSample(file, html) {
  for (const phrase of forbiddenHtmlPhrases) {
    if (html.includes(phrase)) failures.push(`${file}: placeholder sample phrase "${phrase}" in HTML block`);
  }
  if (html.includes("media-placeholder")) failures.push(`${file}: placeholder media reference in HTML block`);
}

function checkReflowClaim(file, meta, css) {
  if (meta.responsiveness !== "reflow") return;
  const inspectableCss = stripCssComments(css);
  const hasReflowMechanic = [
    "@container",
    "@media",
    "auto-fit",
    "auto-fill",
    "flex-wrap",
  ].some((mechanic) => inspectableCss.includes(mechanic));
  const hasNarrowGuard = inspectableCss.includes("min(") || inspectableCss.includes("100%") || inspectableCss.includes("flex-wrap");
  if (!hasReflowMechanic || !hasNarrowGuard) {
    failures.push(`${file}: responsiveness reflow requires a stack, wrap, container query, media query, or intrinsic repeat guard`);
  }
}

const files = walk(patternsDir);
for (const absolute of files) {
  const file = path.relative(root, absolute);
  const content = fs.readFileSync(absolute, "utf8");
  const meta = frontmatter(content);
  if (!meta) {
    failures.push(`${file}: missing frontmatter`);
    continue;
  }
  for (const field of requiredFields) {
    if (!meta[field]) failures.push(`${file}: missing ${field}`);
  }
  const markdown = stripFencedCodeBlocks(content);
  for (const section of requiredSections) {
    if (!hasHeading(markdown, section)) failures.push(`${file}: missing ${section.replace("## ", "")} section`);
  }
  for (const detail of requiredAccessibilityDetails) {
    if (!markdown.includes(detail)) failures.push(`${file}: missing accessibility risk detail ${detail}`);
  }
  const html = codeBlock(content, "html");
  if (!html) failures.push(`${file}: missing html code block`);
  const css = codeBlock(content, "css");
  if (!css) failures.push(`${file}: missing css code block`);
  if (html) checkHtmlSample(file, html);
  if (css) checkCss(file, css);
  if (css) checkReflowClaim(file, meta, css);
  if (html && css) checkHtmlCssHooks(file, html, css);
}

if (files.length < minCount) failures.push(`expected at least ${minCount} pattern files, found ${files.length}`);

const result = {
  ok: failures.length === 0,
  count: files.length,
  minCount,
  failures,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log(`ok: ${files.length} pattern files`);
} else {
  console.error(result.failures.join("\n"));
}

process.exit(result.ok ? 0 : 1);
