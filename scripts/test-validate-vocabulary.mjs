#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(root, "scripts", "validate-vocabulary.mjs");

const glossary = [
  "# Controlled Vocabulary",
  "",
  "## Canonical Terms",
  "",
  "- Canonical: `domain`",
  "  - Concept: top-level knowledge ownership",
  "- Canonical: `category`",
  "  - Concept: domain-local browse placement",
  "- Canonical: `pattern`",
  "  - Concept: reusable spatial primitive",
  "- Canonical: `recipe`",
  "  - Concept: screen composition",
  "- Canonical: `gate`",
  "  - Concept: quality decision contract",
  "- Canonical: `claim`",
  "  - Concept: review assertion",
  "- Canonical: `evidence family`",
  "  - Concept: evidence class",
  "- Canonical: `scroll ownership`",
  "  - Concept: scroll responsibility",
  "- Canonical: `harmony`",
  "  - Concept: content layout fit",
  "- Canonical: `debt`",
  "  - Concept: accepted unresolved risk",
  "- Canonical: `consumer reference`",
  "  - Concept: optional consumer record handoff",
  "- Canonical: `maturity`",
  "  - Concept: consumer reference lifecycle",
  "- Canonical: `artifact mode`",
  "  - Concept: consumer reference storage role",
  "",
  "## Aliases",
  "",
  "- Alias: `primitive` -> `pattern`",
  "",
  "## Deprecated Terms",
  "",
  "- Deprecated: `component` -> `pattern`",
  "  - Reason: In Layout, component implies visual or framework ownership.",
  "",
  "## Local-Only Terms",
  "",
  "- Local-only: `OKF`",
  "- Local-only: `consumer component`",
  "",
  "## Scannability Checklist",
  "",
  "- Use headings for decision boundaries.",
  "",
  "## Vale Proposal",
  "",
  "Prose linting should wait until the vocabulary is stable.",
  "",
].join("\n");

const files = {
  "README.md": "# layout-gallery\n\n[Controlled vocabulary](guides/vocabulary.md)\n",
  "GUIDE.md": "# Guide\n\n[Controlled vocabulary](guides/vocabulary.md)\n",
  "index.md": "# Index\n\n[Controlled vocabulary](guides/vocabulary.md)\n",
  "quality/index.md": "# Quality\n\n[Controlled vocabulary](../guides/vocabulary.md)\n",
  "guides/vocabulary.md": glossary,
};

const cases = [
  {
    name: "missing_domain_term",
    mutate: {
      "guides/vocabulary.md": glossary.replace("- Canonical: `domain`\n  - Concept: top-level knowledge ownership\n", ""),
    },
    expect: "guides/vocabulary.md: missing canonical term domain",
  },
  {
    name: "missing_category_term",
    mutate: {
      "guides/vocabulary.md": glossary.replace("- Canonical: `category`\n  - Concept: domain-local browse placement\n", ""),
    },
    expect: "guides/vocabulary.md: missing canonical term category",
  },
  {
    name: "missing_required_term",
    mutate: {
      "guides/vocabulary.md": glossary.replace("- Canonical: `debt`\n  - Concept: accepted unresolved risk\n", ""),
    },
    expect: "guides/vocabulary.md: missing canonical term debt",
  },
  {
    name: "missing_consumer_reference_term",
    mutate: {
      "guides/vocabulary.md": glossary.replace("- Canonical: `consumer reference`\n  - Concept: optional consumer record handoff\n", ""),
    },
    expect: "guides/vocabulary.md: missing canonical term consumer reference",
  },
  {
    name: "duplicate_concept",
    mutate: {
      "guides/vocabulary.md": glossary.replace(
        "- Canonical: `pattern`\n  - Concept: reusable spatial primitive",
        "- Canonical: `pattern`\n  - Concept: reusable spatial primitive\n- Canonical: `layout primitive`\n  - Concept: reusable spatial primitive",
      ),
    },
    expect: "guides/vocabulary.md: concept \"reusable spatial primitive\" has multiple canonical terms: pattern, layout primitive",
  },
  {
    name: "missing_vale_boundary",
    mutate: {
      "guides/vocabulary.md": glossary.replace("Prose linting should wait until the vocabulary is stable.", "Enable Vale immediately."),
    },
    expect: "guides/vocabulary.md: missing Prose linting should wait until the vocabulary is stable.",
  },
  {
    name: "paraphrased_navigation_label",
    mutate: {
      "README.md": files["README.md"].replace("[Controlled vocabulary]", "[Vocabulary guide]"),
    },
    expectWarning: "README.md: recommended link label missing [Controlled vocabulary](guides/vocabulary.md)",
  },
  {
    name: "success_path",
    expect: null,
  },
];

function writeFixture(testCase) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `layout-gallery-vocabulary-${testCase.name}-`));
  const entries = { ...files, ...(testCase.mutate ?? {}) };
  for (const [relative, content] of Object.entries(entries)) {
    const target = path.join(dir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return dir;
}

function runCase(testCase) {
  const dir = writeFixture(testCase);
  const result = spawnSync(process.execPath, [validator, "--json"], {
    cwd: dir,
    encoding: "utf8",
  });
  fs.rmSync(dir, { force: true, recursive: true });
  const output = JSON.parse(result.stdout);
  const passed = testCase.expectWarning
    ? output.ok && output.warnings?.includes(testCase.expectWarning)
    : testCase.expect
      ? !output.ok && output.failures.includes(testCase.expect)
      : output.ok;
  return {
    name: testCase.name,
    ok: passed,
    expected: testCase.expectWarning ?? testCase.expect ?? "ok:true",
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
