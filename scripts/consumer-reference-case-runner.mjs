import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateItemSchema } from "./consumer-reference-schema.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(repositoryRoot, "scripts", "validate-consumer-reference.mjs");
const itemPath = "consumer-reference/fixtures/item.json";

function findingCodes(output) {
  if (!Array.isArray(output.failures)) return [];
  return output.failures.flatMap((failure) => {
    if (typeof failure === "string") return [failure];
    return typeof failure?.code === "string" ? [failure.code] : [];
  });
}

function writeFixture(testCase, baseItem) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `stylegallery-consumer-reference-${testCase.name}-`));
  let externalRoot;
  const item = Object.hasOwn(testCase, "value") ? structuredClone(testCase.value) : structuredClone(baseItem);
  testCase.mutate?.(item);
  const files = {
    "CATALOG.md": "# Catalog\n",
    [itemPath]: `${JSON.stringify(item, null, 2)}\n`,
    "layout/index.md": testCase.layout ?? "# Layout\n",
    "patterns/index.md": "# Patterns\n",
    "quality/handoff.md": "Implementation handoff:\nConsumer reference: not_applicable\nConsumer reference reason: This fixture has no consumer-specific reference record.\n",
    "scripts/pattern-data.mjs": testCase.patternData ?? "export const patterns = [];\n",
    ...(testCase.extraFiles ?? {}),
  };
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  if (testCase.link) {
    const link = path.join(root, "consumer-reference", "fixtures", "redirect.json");
    if (testCase.link === "inside") {
      fs.symlinkSync(path.join(root, itemPath), link);
    } else {
      externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-consumer-reference-outside-"));
      const external = path.join(externalRoot, "record.json");
      fs.writeFileSync(external, "{}\n");
      fs.symlinkSync(external, link);
    }
  }
  if (testCase.itemLink) {
    const itemTarget = path.join(root, itemPath);
    fs.rmSync(itemTarget);
    if (testCase.itemLink === "inside") {
      const actual = path.join(root, "consumer-reference", "fixtures", "actual-item.json");
      fs.writeFileSync(actual, `${JSON.stringify(item, null, 2)}\n`);
      fs.symlinkSync(actual, itemTarget);
    } else {
      externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-consumer-reference-item-outside-"));
      const external = path.join(externalRoot, "item.json");
      fs.writeFileSync(external, `${JSON.stringify(item, null, 2)}\n`);
      fs.symlinkSync(external, itemTarget);
    }
  }
  return { externalRoot, item, root };
}

export function makeConsumerReferenceCaseRunner({ baseItem, schema }) {
  return function runCase(testCase) {
    const fixture = writeFixture(testCase, baseItem);
    try {
      const child = spawnSync(process.execPath, [validator, "--item", itemPath, "--json"], {
        cwd: fixture.root,
        encoding: "utf8",
      });
      const output = JSON.parse(child.stdout);
      const codes = findingCodes(output);
      const accepted = child.status === 0 && output.ok && output.scaffold !== true;
      const rejected = child.status !== 0 && !output.ok && codes.includes(testCase.expect);
      const schemaCodes = validateItemSchema(fixture.item, schema).map((finding) => finding.code);
      const schemaParity = testCase.schemaValid === undefined || (schemaCodes.length === 0) === testCase.schemaValid;
      return {
        actual: { codes, ok: output.ok, scaffold: output.scaffold === true, schemaCodes, status: child.status },
        expected: testCase.expect ?? "ok:true and exit:0",
        name: testCase.name,
        ok: (testCase.expect === null ? accepted : rejected) && schemaParity,
        rules: testCase.rules ?? [],
      };
    } finally {
      fs.rmSync(fixture.root, { force: true, recursive: true });
      if (fixture.externalRoot) fs.rmSync(fixture.externalRoot, { force: true, recursive: true });
    }
  };
}
