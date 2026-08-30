import path from "node:path";
import { isOmoDependency, markdownLinkDestinations, stripFencedCodeBlocks, structuralMarkdown } from "./markdown-structure.mjs";

export function createDomainValidationChecks({
  domains,
  failures,
  read,
  referenceDocuments,
  repository,
  revision,
  revisionPattern,
  requiredLeafSections,
  sourceOverrides,
}) {
  function parseFrontmatter(relative, content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!match) {
      failures.push(`${relative}: missing frontmatter`);
      return {};
    }
    const metadata = {};
    for (const rawLine of match[1].split("\n")) {
      if (!rawLine.trim()) continue;
      const separator = rawLine.indexOf(":");
      if (separator === -1) {
        failures.push(`${relative}: malformed frontmatter line`);
        continue;
      }
      const key = rawLine.slice(0, separator).trim();
      const value = rawLine.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (Object.hasOwn(metadata, key)) failures.push(`${relative}: duplicate frontmatter key ${key}`);
      metadata[key] = value;
    }
    return metadata;
  }

  function checkIndex(domain) {
    const relative = `${domain.slug}/index.md`;
    const content = structuralMarkdown(read(relative));
    if (!content) return;
    if (!content.includes("## Scope Boundary")) failures.push(`${relative}: missing Scope Boundary section`);
    if (!/^In scope:\s*\S/m.test(content)) failures.push(`${relative}: missing In scope declaration`);
    if (!/^Out of scope:\s*\S/m.test(content)) failures.push(`${relative}: missing Out of scope declaration`);
    if (!/^Parent: \[[^\]]+\]\([^)]+\)/m.test(content)) failures.push(`${relative}: missing Parent navigation link`);
    if (!/^Next: \[[^\]]+\]\([^)]+\)/m.test(content)) failures.push(`${relative}: missing Next navigation link`);
    for (const leaf of domain.leaves) {
      const target = path.posix.relative(domain.slug, leaf.path);
      if (!content.match(new RegExp(`\\[[^\\]]+\\]\\(${target.replaceAll(".", "\\.")}\\)`))) {
        failures.push(`${relative}: missing leaf route ${target}`);
      }
    }
    if (domain.slug === "design-engineering" && domain.referenceDocuments?.length > 0 && !content.includes("[Reference Profiles](reference-profiles/index.md)")) {
      failures.push(`${relative}: missing reference profile route`);
    }
  }

  function checkLeaf(domain, leaf, titles) {
    const { path: relative, provenance, sourcePath: expectedSourcePath } = leaf;
    const content = read(relative);
    if (!content) return;
    const metadata = parseFrontmatter(relative, content);
    const requiredFields = ["type", "title", "description", "domain", "lifecycle"];
    if (provenance === "external") requiredFields.push("source_repository", "source_path", "source_revision");
    if (provenance === "local") requiredFields.push("provenance_kind");
    for (const field of requiredFields) {
      if (!metadata[field]) failures.push(`${relative}: missing ${field}`);
    }
    const knownDomain = domains.some((candidate) => candidate.slug === metadata.domain);
    if (metadata.domain && !knownDomain) failures.push(`${relative}: unknown domain ${metadata.domain}`);
    else if (metadata.domain && metadata.domain !== domain.slug) failures.push(`${relative}: domain ${metadata.domain} does not match ${domain.slug}`);
    if (metadata.lifecycle && metadata.lifecycle !== "experimental") {
      const kind = provenance === "local" ? "local leaf" : provenance === "external" ? "external adaptation" : "domain leaf";
      failures.push(`${relative}: ${kind} lifecycle must be experimental`);
    }
    if (provenance === "external") {
      const expectedSource = sourceOverrides[relative] ?? { repository, revision };
      if (metadata.source_repository && metadata.source_repository !== expectedSource.repository) failures.push(`${relative}: unexpected source_repository ${metadata.source_repository}`);
      if (metadata.source_path && metadata.source_path !== expectedSourcePath) failures.push(`${relative}: unexpected source_path ${metadata.source_path}`);
      if (metadata.source_revision && !revisionPattern.test(metadata.source_revision)) {
        failures.push(`${relative}: source_revision must be a full 40-character lowercase Git SHA`);
      } else if (metadata.source_revision && metadata.source_revision !== expectedSource.revision) {
        failures.push(`${relative}: unexpected source_revision ${metadata.source_revision}`);
      }
    } else if (provenance === "local") {
      if (metadata.provenance_kind && metadata.provenance_kind !== "local") failures.push(`${relative}: local leaf provenance_kind must be local`);
      for (const field of ["source_repository", "source_path", "source_revision"]) {
        if (Object.hasOwn(metadata, field)) failures.push(`${relative}: local leaf must not declare ${field}`);
      }
    } else {
      for (const field of ["source_repository", "source_path", "source_revision"]) {
        if (Object.hasOwn(metadata, field)) failures.push(`${relative}: locally authored leaf must omit ${field}`);
      }
    }
    if (metadata.title) {
      if (titles.has(metadata.title)) failures.push(`${relative}: duplicate title ${metadata.title}`);
      titles.add(metadata.title);
    }
    const body = structuralMarkdown(content);
    for (const section of requiredLeafSections) {
      if (!body.includes(`## ${section}`)) failures.push(`${relative}: missing ${section} section`);
    }
    if (!/^Parent: \[[^\]]+\]\([^)]+\)/m.test(body)) failures.push(`${relative}: missing Parent navigation link`);
    if (!/^Next: \[[^\]]+\]\([^)]+\)/m.test(body)) failures.push(`${relative}: missing Next navigation link`);
    if (markdownLinkDestinations(content).some(isOmoDependency)) failures.push(`${relative}: tracked document must not depend on .omo`);
    if (metadata.lifecycle === "experimental" && /canonical universal policy/i.test(body)) {
      failures.push(`${relative}: experimental document claims canonical authority`);
    }
  }

  function checkReferenceDocuments() {
    const index = stripFencedCodeBlocks(read(referenceDocuments[0]));
    if (!/Domain classification:\s*design-engineering\./i.test(index)) {
      failures.push(`${referenceDocuments[0]}: reference profiles must remain in the Design Engineering domain`);
    }
    if (!index.includes("[Governed Local Profiles](governed-local/index.md)")) {
      failures.push(`${referenceDocuments[0]}: missing governed-local route`);
    }
    const external = stripFencedCodeBlocks(read(referenceDocuments[2]));
    if (!external.includes("Synthetic validator coverage only") || !external.includes("no durable adopter record")) {
      failures.push(`${referenceDocuments[1]}: external adaptation must remain documentation-only`);
    }
  }

  function checkDomainLifecycleBoundary() {
    const relative = "DOMAINS.md";
    const content = stripFencedCodeBlocks(read(relative));
    const required = [
      "## Lifecycle And Staleness",
      "Domain lifecycle changes are repository-owner decisions",
      "machine-checkable contracts have relevant validator coverage",
      "User studies, reader tasks, adoption counts, and attestations are neither required nor sufficient for a domain lifecycle change.",
    ];
    for (const clause of required) if (!content.includes(clause)) failures.push(`${relative}: missing lifecycle boundary ${clause}`);
  }

  function checkPromotionBoundary() {
    const relative = "DOMAINS.md";
    const content = stripFencedCodeBlocks(read(relative));
    const required = [
      "### Consumer Reference Promotion",
      "does not govern domain or page lifecycle",
      "applies only to consumer-local → shared-experimental invariant eligibility",
      "Editorial and terminal are related examples in one fixture set",
      "Shared stable has no numeric adoption threshold",
      "Normative correctness may waive adoption count only",
      "never silently relabeled experimental",
      "Promotion records are JSON-only",
      "zero adopter attestations",
    ];
    for (const clause of required) if (!content.includes(clause)) failures.push(`${relative}: missing promotion boundary ${clause}`);
  }

  return { checkDomainLifecycleBoundary, checkIndex, checkLeaf, checkReferenceDocuments, checkPromotionBoundary };
}
