import fs from "node:fs";
import path from "node:path";
import { isOmoDependency, markdownLinkDestinations } from "./markdown-structure.mjs";

const generatedReference = /^design-engineering\/reference-profiles\/governed-local\/(?:editorial|terminal)\/generated\/(?:state-matrix|keyboard-matrix|evidence-coverage)\.md$/;
const ignoredDirectories = new Set([".git", ".omo", "node_modules"]);

function walkMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirectories.has(entry.name)) return [];
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdown(target);
    return entry.isFile() && entry.name.endsWith(".md") ? [target] : [];
  });
}

function undeclaredDomainDocumentFailures(root, domains) {
  return domains.flatMap((domain) => {
    const declared = new Set([`${domain.slug}/index.md`, ...domain.leaves.map(([leaf]) => leaf), ...(domain.referenceDocuments ?? [])]);
    return walkMarkdown(path.join(root, domain.slug)).flatMap((absolute) => {
      const relative = path.relative(root, absolute);
      if (generatedReference.test(relative) || declared.has(relative)) return [];
      return [`${relative}: undeclared governed domain document`];
    });
  });
}

function omoDependencyFailures(root) {
  return walkMarkdown(root).flatMap((absolute) => {
    const relative = path.relative(root, absolute);
    const content = fs.readFileSync(absolute, "utf8");
    if (markdownLinkDestinations(content).some(isOmoDependency)) return [`${relative}: tracked document must not depend on .omo`];
    return [];
  });
}

export function collectDomainBoundaryFailures(root, domains) {
  return [...undeclaredDomainDocumentFailures(root, domains), ...omoDependencyFailures(root)];
}
