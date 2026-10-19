#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateRepositorySkills, validateSkillFrontmatter } from "./validate-skill-frontmatter.mjs";

const document = (header) => `---\n${header}\n---\n# Body\n`;
const valid = "name: example\ndescription: Find the right guidance.";
const fixtures = [
  ["no frontmatter", "# Body", "frontmatter_missing"],
  ["unclosed frontmatter", "---\n" + valid, "frontmatter_unclosed"],
  ["missing name", document("description: Guidance"), "frontmatter_required"],
  ["missing description", document("name: example"), "frontmatter_required"],
  ["empty required string", document('name: ""\ndescription: Guidance'), "frontmatter_required"],
  ["non-string name", document("name: true\ndescription: Guidance"), "frontmatter_required"],
  ["numeric exponent name", document("name: 1e2\ndescription: Guidance"), "frontmatter_syntax"],
  ["numeric hex name", document("name: 0xff\ndescription: Guidance"), "frontmatter_syntax"],
  ["duplicate key", document(valid + "\nname: another"), "frontmatter_duplicate_key"],
  ["duplicate optional key", document(valid + "\ntype: Skill\ntype: Agent"), "frontmatter_duplicate_key"],
  ["ambiguous colon", document("name: example\ndescription: Guidance: use it"), "frontmatter_syntax"],
  ["tab indentation", document("name: example\n\tdescription: Guidance"), "frontmatter_tab"],
  ["tab in quoted value", document('name: example\ndescription: "Use\tguidance"'), "frontmatter_tab"],
  ["tab in block", document("name: example\ndescription: |\n  Use\tguidance"), "frontmatter_syntax"],
  ["unknown top-level syntax", document(valid + "\nthis is not YAML"), "frontmatter_syntax"],
  ["top-level sequence", document(valid + "\n- extra"), "frontmatter_syntax"],
  ["nested map", document(valid + "\noptions:\n  enabled: true"), "frontmatter_syntax"],
  ["flow map", document("name: example\ndescription: { nested: value }"), "frontmatter_syntax"],
  ["flow sequence", document(valid + "\ntools: [read, edit]"), "frontmatter_syntax"],
  ["anchor", document("name: example\ndescription: &text Guidance"), "frontmatter_syntax"],
  ["alias", document("name: example\ndescription: *text"), "frontmatter_syntax"],
  ["tag", document("name: example\ndescription: !!str Guidance"), "frontmatter_syntax"],
  ["directive", document(valid + "\n%YAML 1.2"), "frontmatter_syntax"],
  ["unterminated quote", document('name: example\ndescription: "Guidance'), "frontmatter_syntax"],
  ["trailing quoted syntax", document('name: example\ndescription: "Guidance" invalid'), "frontmatter_syntax"],
  ["inconsistent block", document("name: example\ndescription: |\n    first\n  second"), "frontmatter_syntax"],
];

for (const [name, text, code] of fixtures) {
  test(`rejects ${name}`, () => {
    const result = validateSkillFrontmatter(text);
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((failure) => failure.code === code), JSON.stringify(result));
  });
}

test("accepts supported scalar YAML without interpreting the Markdown body", () => {
  for (const header of [
    valid,
    'name: example\ndescription: "Guidance: use it" # comment',
    "name: example\ndescription: 'Guidance: it''s useful'",
    "name: example\ndescription: >-\n  Find guidance:\n  then inspect it.",
    "name: example\ndescription: |\n  First line\n  Second line",
    valid + "\ndisable-model-invocation: true\npriority: 2\n# comment",
  ]) assert.deepEqual(validateSkillFrontmatter(document(header)), { ok: true, failures: [] });
  assert.equal(validateSkillFrontmatter(document(valid).replaceAll("\n", "\r\n")).ok, true);
  assert.equal(validateSkillFrontmatter(document(valid) + "\tMarkdown code\n").ok, true);
});

test("discovers root, nested, and outside-skills files and fails the CLI", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sg-skill-yaml-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", timeout: 30_000 });
    assert.equal(result.status, 0, result.stderr);
  };
  git("init", "-q");
  const paths = ["SKILL.md", "other/deep/SKILL.md", "skills/example/SKILL.md"];
  for (const file of paths) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), document(valid));
  }
  git("add", "SKILL.md");
  fs.writeFileSync(path.join(root, ".gitignore"), "node_modules/\n");
  fs.mkdirSync(path.join(root, "node_modules/ignored"), { recursive: true });
  fs.writeFileSync(path.join(root, "node_modules/ignored/SKILL.md"), "not a repository skill");
  assert.deepEqual(validateRepositorySkills(root), { ok: true, files: paths, failures: [] });
  const script = fileURLToPath(new URL("./validate-skill-frontmatter.mjs", import.meta.url));
  const run = () => spawnSync(process.execPath, [script, "--root", root, "--json"], { encoding: "utf8", timeout: 30_000 });
  const passing = run();
  assert.equal(passing.status, 0, passing.stderr);
  fs.writeFileSync(path.join(root, paths[1]), document("name: example\ndescription: Invalid: mapping"));
  const failing = run();
  assert.equal(failing.status, 1, failing.stderr);
  assert.equal(JSON.parse(failing.stdout).failures[0].path, paths[1]);
});
