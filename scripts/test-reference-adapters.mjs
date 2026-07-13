#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const builder = path.join(repositoryRoot, "scripts", "build-reference-artifacts.mjs");
const validator = path.join(repositoryRoot, "scripts", "validate-reference-artifacts.mjs");
const schema = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "consumer-reference/schema/portable-tokens.schema.json"), "utf8"));

function parseJson(child) {
  try {
    return JSON.parse(child.stdout);
  } catch (error) {
    return { failures: [{ code: "invalid_json_output", message: error instanceof Error ? error.message : String(error) }], ok: false };
  }
}

function codes(output) {
  return Array.isArray(output.failures)
    ? output.failures.flatMap((failure) => typeof failure?.code === "string" ? [failure.code] : [])
    : [];
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-reference-adapter-"));
const results = [];

function run(command, args) {
  const child = spawnSync(process.execPath, [command, ...args, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  return { child, output: parseJson(child) };
}

function recordAccepted(name, execution, predicate = () => true) {
  const actualCodes = codes(execution.output);
  const accepted = execution.child.status === 0 && execution.output.ok === true && execution.output.scaffold !== true;
  results.push({
    actual: { codes: actualCodes, ok: execution.output.ok, scaffold: execution.output.scaffold === true, status: execution.child.status },
    expected: "ok:true and exit:0",
    name,
    ok: accepted && predicate(),
  });
}

function recordRejected(name, execution, expectedCode) {
  const actualCodes = codes(execution.output);
  results.push({
    actual: { codes: actualCodes, ok: execution.output.ok, scaffold: execution.output.scaffold === true, status: execution.child.status },
    expected: expectedCode,
    name,
    ok: execution.child.status !== 0 && execution.output.ok === false && actualCodes.includes(expectedCode),
  });
}

try {
  const groupPattern = new RegExp(Object.keys(schema.$defs.group.patternProperties)[0]);
  const rootPattern = new RegExp(Object.keys(schema.patternProperties)[0]);
  const unsafeSegments = ["__proto__", "prototype", "constructor"];
  results.push({
    actual: {
      groupDescription: schema.$defs.group.properties.$description.type,
      tokenDescription: schema.$defs.token.properties.$description.type,
      unsafeGroupMatches: unsafeSegments.filter((segment) => groupPattern.test(segment)),
      unsafeRootMatches: unsafeSegments.filter((segment) => rootPattern.test(segment)),
    },
    expected: "string descriptions and no unsafe path segments",
    name: "schema_runtime_boundary_parity",
    ok: schema.$defs.group.properties.$description.type === "string"
      && schema.$defs.token.properties.$description.type === "string"
      && unsafeSegments.every((segment) => !groupPattern.test(segment) && !rootPattern.test(segment)),
  });
  const output = path.join(tempRoot, "tokens.css");
  const manifest = path.join(tempRoot, "manifest.json");
  const validBuild = run(builder, ["--source", "consumer-reference/fixtures/token-portability/valid-reference.json", "--output", output, "--manifest", manifest, "--adapter", "style-dictionary", "--fail-on-warning"]);
  recordAccepted("valid_reference_build", validBuild, () => {
    const css = fs.readFileSync(output, "utf8");
    return css.includes("var(--color-accent)") && css.includes("var(--space-small)") && !css.includes("[object Object]");
  });
  recordAccepted("valid_reference_manifest", run(validator, ["--manifest", manifest]));

  for (const fixture of ["valid-whole-alias.json", "valid-border.json"]) {
    recordAccepted(fixture.replace(".json", ""), run(builder, ["--source", `consumer-reference/fixtures/token-portability/${fixture}`, "--output", output, "--manifest", manifest, "--fail-on-warning"]));
  }
  const invalidFixtures = [
    ["invalid-extends.json", "token_extends_forbidden"],
    ["invalid-json-pointer.json", "token_json_pointer_forbidden"],
    ["invalid-resolver.json", "token_resolver_forbidden"],
    ["invalid-unknown-reserved.json", "token_unknown_reserved"],
    ["invalid-untested-type.json", "token_type_unsupported"],
    ["invalid-dangling-alias.json", "alias_dangling"],
    ["invalid-cycle.json", "alias_cycle"],
    ["invalid-type-mismatch.json", "alias_type_mismatch"],
  ];
  for (const [fixture, expected] of invalidFixtures) {
    recordRejected(fixture.replace(".json", ""), run(builder, ["--source", `consumer-reference/fixtures/token-portability/${fixture}`, "--output", output, "--manifest", manifest, "--fail-on-warning"]), expected);
  }

  const invalidUnit = path.join(tempRoot, "invalid-unit.json");
  fs.writeFileSync(invalidUnit, '{"space":{"$type":"dimension","bad":{"$value":{"value":1,"unit":"vh"}}}}\n');
  recordRejected("invalid_untested_unit", run(builder, ["--source", invalidUnit, "--output", output, "--manifest", manifest, "--fail-on-warning"]), "token_unit_unsupported");
  const partialAlias = path.join(tempRoot, "invalid-partial-alias.json");
  fs.writeFileSync(partialAlias, '{"space":{"$type":"dimension","bad":{"$value":"calc({space.base} * 2)"}}}\n');
  recordRejected("invalid_partial_alias", run(builder, ["--source", partialAlias, "--output", output, "--manifest", manifest, "--fail-on-warning"]), "alias_whole_required");
  const invalidGroupDescription = path.join(tempRoot, "invalid-group-description.json");
  fs.writeFileSync(invalidGroupDescription, '{"space":{"$description":{"unsafe":true},"$type":"dimension","small":{"$value":{"value":1,"unit":"px"}}}}\n');
  recordRejected("invalid_group_description", run(builder, ["--source", invalidGroupDescription, "--output", output, "--manifest", manifest, "--fail-on-warning"]), "token_description_invalid");
  const invalidTokenDescription = path.join(tempRoot, "invalid-token-description.json");
  fs.writeFileSync(invalidTokenDescription, '{"space":{"$type":"dimension","small":{"$description":42,"$value":{"value":1,"unit":"px"}}}}\n');
  recordRejected("invalid_token_description", run(builder, ["--source", invalidTokenDescription, "--output", output, "--manifest", manifest, "--fail-on-warning"]), "token_description_invalid");
  for (const [name, sourceText] of [
    ["constructor", '{"constructor":{"$type":"dimension","small":{"$value":{"value":1,"unit":"px"}}}}\n'],
    ["prototype", '{"prototype":{"$type":"dimension","small":{"$value":{"value":1,"unit":"px"}}}}\n'],
    ["__proto__", '{"__proto__":{"$type":"dimension","small":{"$value":{"value":1,"unit":"px"}}}}\n'],
  ]) {
    const unsafePath = path.join(tempRoot, `invalid-path-${name}.json`);
    fs.writeFileSync(unsafePath, sourceText);
    recordRejected(`invalid_path_${name}`, run(builder, ["--source", unsafePath, "--output", output, "--manifest", manifest, "--fail-on-warning"]), "token_path_segment_unsafe");
  }

  const baselineSource = fs.readFileSync(path.join(repositoryRoot, "consumer-reference/fixtures/token-portability/valid-reference.json"), "utf8");
  fs.writeFileSync(path.join(tempRoot, "source.json"), baselineSource);
  const baselineBuild = run(builder, ["--source", path.join(tempRoot, "source.json"), "--output", output, "--manifest", manifest, "--fail-on-warning"]);
  recordAccepted("artifact_baseline", baselineBuild);
  const baselineCss = fs.readFileSync(output, "utf8");
  const baselineManifest = fs.readFileSync(manifest, "utf8");
  const artifactCases = [
    ["no_output", "artifact_output_missing", () => fs.rmSync(output)],
    ["zero_count", "artifact_zero_count", (item) => { item.sourceCount = 0; item.outputCount = 0; item.declarations = []; }],
    ["warning", "artifact_warning", (item) => { item.warnings = ["synthetic warning"]; }],
    ["missing_declaration", "artifact_declaration_missing", (item) => { item.declarations = item.declarations.slice(1); }],
    ["duplicate_declaration", "artifact_declaration_duplicate", (item) => { item.declarations.push(item.declarations[0]); }],
    ["object_sentinel", "artifact_object_sentinel", () => fs.writeFileSync(output, baselineCss.replace("120ms", "[object Object]"))],
    ["unresolved_alias", "artifact_unresolved_value", () => fs.writeFileSync(output, baselineCss.replace("120ms", "{duration.quick}"))],
    ["count_mismatch", "artifact_count_mismatch", (item) => { item.outputCount += 1; }],
    ["scaffold_manifest", "artifact_scaffold_forbidden", (item) => { item.scaffold = true; }],
    ["forged_value", "artifact_source_output_mismatch", (item) => {
      const changed = baselineCss.replace("120ms", "999999s !important");
      fs.writeFileSync(output, changed);
      item.outputHash = `sha256:${crypto.createHash("sha256").update(changed).digest("hex")}`;
      item.declarations.find((declaration) => declaration.name === "--duration-quick").value = "999999s !important";
    }],
  ];
  for (const [name, expected, mutate] of artifactCases) {
    fs.writeFileSync(output, baselineCss);
    const item = JSON.parse(baselineManifest);
    mutate(item);
    if (fs.existsSync(output)) fs.writeFileSync(manifest, `${JSON.stringify(item, null, 2)}\n`);
    recordRejected(name, run(validator, ["--manifest", manifest]), expected);
  }
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

const failures = results.filter((result) => !result.ok).map((result) => `missing_semantic:${result.name}:${result.expected}`);
const report = { failures, ok: failures.length === 0, results };
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
