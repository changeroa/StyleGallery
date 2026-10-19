#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skill = fs.readFileSync(path.join(root, "skills", "stylegallery-search", "SKILL.md"), "utf8");

function tempHome(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "sg-setup-"));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  return home;
}
function setup(home, ...args) {
  const run = spawnSync(process.execPath, [path.join(root, "scripts", "sg-entry.mjs"), "setup", ...args], {
    cwd: root, encoding: "utf8", env: { HOME: home, PATH: "" },
  });
  return { status: run.status, report: JSON.parse(run.stdout) };
}
const paths = (home) => ({
  claudeJson: path.join(home, ".claude.json"),
  claudeSkill: path.join(home, ".claude", "skills", "stylegallery-search", "SKILL.md"),
  codexToml: path.join(home, ".codex", "config.toml"),
  codexSkill: path.join(home, ".agents", "skills", "stylegallery-search", "SKILL.md"),
});
// Every file under home except setup backups, as { relativePath: content }.
function snapshot(home) {
  const out = {};
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (!entry.name.includes(".bak-stylegallery-")) out[path.relative(home, full)] = fs.readFileSync(full, "utf8");
    }
  };
  walk(home);
  return out;
}
const backups = (directory) => fs.readdirSync(directory).filter((name) => name.includes(".bak-stylegallery-"));

const CLAUDE_BEFORE = { numStartups: 3, mcpServers: { other: { type: "stdio", command: "other-mcp", args: [] } } };
const CODEX_BEFORE = 'model = "gpt-5"\n\n# keep me\n[mcp_servers.other]\ncommand = "other"\n\n[profiles.fast]\nmodel = "o4"\n';

function seed(home) {
  const p = paths(home);
  fs.writeFileSync(p.claudeJson, `${JSON.stringify(CLAUDE_BEFORE, null, 2)}\n`);
  fs.mkdirSync(path.dirname(p.codexToml), { recursive: true });
  fs.writeFileSync(p.codexToml, CODEX_BEFORE);
  return p;
}

test("setup installs skills and MCP entries for detected agents, preserving other content", (t) => {
  const home = tempHome(t);
  const p = seed(home);
  const first = setup(home);
  assert.equal(first.status, 0, JSON.stringify(first.report));
  assert.deepEqual(first.report.detected, ["claude", "codex"]);
  assert.equal(fs.readFileSync(p.claudeSkill, "utf8"), skill);
  assert.equal(fs.readFileSync(p.codexSkill, "utf8"), skill);
  const claude = JSON.parse(fs.readFileSync(p.claudeJson, "utf8"));
  assert.equal(claude.numStartups, 3);
  assert.deepEqual(claude.mcpServers.other, CLAUDE_BEFORE.mcpServers.other);
  assert.deepEqual(claude.mcpServers.stylegallery.args, ["-y", "--package", "stylegallery", "stylegallery-mcp"]);
  const toml = fs.readFileSync(p.codexToml, "utf8");
  assert.ok(toml.startsWith(CODEX_BEFORE), toml);
  assert.match(toml, /\[mcp_servers\.stylegallery\]\ncommand = "npx"\nargs = \["-y", "--package", "stylegallery", "stylegallery-mcp"\]\n$/);
  assert.equal(backups(home).length, 1);
  assert.equal(backups(path.dirname(p.codexToml)).length, 1);

  const after = snapshot(home);
  const second = setup(home);
  assert.equal(second.status, 0);
  assert.ok(second.report.changes.every(({ action }) => action === "unchanged"));
  assert.deepEqual(snapshot(home), after);
  assert.equal(backups(home).length, 1, "an unchanged run writes no backup");
});

test("dry-run reports the plan and writes nothing", (t) => {
  const home = tempHome(t);
  seed(home);
  const before = snapshot(home);
  const run = setup(home, "--dry-run");
  assert.equal(run.status, 0);
  assert.equal(run.report.dry_run, true);
  assert.deepEqual(run.report.changes.map(({ action }) => action), ["created", "updated", "created", "updated"]);
  assert.deepEqual(snapshot(home), before);
  assert.equal(backups(home).length, 0);
});

test("uninstall restores the original configuration", (t) => {
  const home = tempHome(t);
  const p = seed(home);
  const before = snapshot(home);
  setup(home);
  const run = setup(home, "--uninstall");
  assert.equal(run.status, 0, JSON.stringify(run.report));
  assert.deepEqual(JSON.parse(fs.readFileSync(p.claudeJson, "utf8")), CLAUDE_BEFORE);
  assert.equal(fs.readFileSync(p.codexToml, "utf8"), CODEX_BEFORE);
  assert.ok(!fs.existsSync(path.dirname(p.claudeSkill)));
  assert.ok(!fs.existsSync(path.dirname(p.codexSkill)));
  const remaining = snapshot(home);
  for (const file of Object.keys(before)) assert.equal(remaining[file], before[file]);
});

test("a different existing entry needs --force", (t) => {
  const home = tempHome(t);
  const p = seed(home);
  fs.writeFileSync(p.claudeJson, JSON.stringify({ mcpServers: { stylegallery: { command: "node", args: ["mine.mjs"] } } }));
  fs.appendFileSync(p.codexToml, '\n[mcp_servers.stylegallery]\ncommand = "node"\n');
  fs.mkdirSync(path.dirname(p.codexSkill), { recursive: true });
  fs.writeFileSync(p.codexSkill, "custom skill\n");
  const before = snapshot(home);
  const refused = setup(home);
  assert.equal(refused.status, 1);
  assert.deepEqual(refused.report.failures.map(({ code }) => code), ["setup_conflict", "setup_conflict", "setup_conflict"]);
  assert.equal(fs.readFileSync(p.claudeJson, "utf8"), before[".claude.json"]);
  assert.equal(fs.readFileSync(p.codexToml, "utf8"), before[".codex/config.toml"]);
  assert.equal(fs.readFileSync(p.codexSkill, "utf8"), "custom skill\n");

  const forced = setup(home, "--force");
  assert.equal(forced.status, 0, JSON.stringify(forced.report));
  assert.equal(JSON.parse(fs.readFileSync(p.claudeJson, "utf8")).mcpServers.stylegallery.command, "npx");
  const toml = fs.readFileSync(p.codexToml, "utf8");
  assert.equal(toml.match(/\[mcp_servers\.stylegallery\]/g).length, 1);
  assert.match(toml, /\[profiles\.fast\]\nmodel = "o4"/);
  assert.doesNotMatch(toml, /command = "node"/);
  assert.equal(fs.readFileSync(p.codexSkill, "utf8"), skill);
});

test("--agent and --only narrow the work; nothing detected gives a hint", (t) => {
  const home = tempHome(t);
  const empty = setup(home);
  assert.equal(empty.status, 0);
  assert.deepEqual(empty.report.agents, []);
  assert.match(empty.report.hint, /--agent/);
  const codexSkill = setup(home, "--agent", "codex", "--only", "skill");
  assert.equal(codexSkill.status, 0);
  assert.deepEqual(Object.keys(snapshot(home)), [path.join(".agents", "skills", "stylegallery-search", "SKILL.md")]);
  const bad = setup(home, "--agent", "cursor");
  assert.equal(bad.status, 1);
  assert.equal(bad.report.failures[0].code, "argument_value_invalid");
});

test("invalid JSON in ~/.claude.json is reported and left untouched", (t) => {
  const home = tempHome(t);
  const p = paths(home);
  fs.writeFileSync(p.claudeJson, "{ broken");
  const run = setup(home, "--agent", "claude", "--only", "mcp");
  assert.equal(run.status, 1);
  assert.equal(run.report.failures[0].code, "setup_error");
  assert.equal(fs.readFileSync(p.claudeJson, "utf8"), "{ broken");
});
