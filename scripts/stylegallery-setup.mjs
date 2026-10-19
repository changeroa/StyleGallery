// `stylegallery setup`: connect local coding agents to StyleGallery by copying
// the packaged search skill and registering the stylegallery-mcp server.
// Claude Code: ~/.claude/skills/<name>/SKILL.md and the user-scope "mcpServers"
// map in ~/.claude.json. Codex: ~/.agents/skills/<name>/SKILL.md and the
// [mcp_servers.<name>] table in $CODEX_HOME/config.toml (default ~/.codex).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_NAME = "stylegallery-search";
const SERVER_NAME = "stylegallery";
export const MCP_COMMAND = "npx";
export const MCP_ARGS = ["-y", "--package", "stylegallery", "stylegallery-mcp"];
const AGENTS = ["claude", "codex"];
const PARTS = ["skill", "mcp"];

function onPath(binary, env) {
  const extensions = process.platform === "win32" ? (env.PATHEXT ?? ".EXE;.CMD").split(";") : [""];
  return (env.PATH ?? "").split(path.delimiter).filter(Boolean)
    .some((directory) => extensions.some((extension) => fs.existsSync(path.join(directory, binary + extension))));
}

function locations(home, env) {
  const codexHome = env.CODEX_HOME || path.join(home, ".codex");
  return {
    claude: {
      detect: [path.join(home, ".claude"), path.join(home, ".claude.json")],
      skill: path.join(home, ".claude", "skills", SKILL_NAME, "SKILL.md"),
      mcp: path.join(home, ".claude.json"),
    },
    codex: {
      detect: [codexHome],
      skill: path.join(home, ".agents", "skills", SKILL_NAME, "SKILL.md"),
      mcp: path.join(codexHome, "config.toml"),
    },
  };
}

const readText = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null);

// --- Claude Code ~/.claude.json -------------------------------------------
const claudeEntry = () => ({ type: "stdio", command: MCP_COMMAND, args: [...MCP_ARGS], env: {} });
const sameClaudeEntry = (entry) => entry && entry.command === MCP_COMMAND
  && JSON.stringify(entry.args) === JSON.stringify(MCP_ARGS)
  && (entry.type === undefined || entry.type === "stdio")
  && Object.keys(entry.env ?? {}).length === 0;

function planClaudeMcp(text, uninstall, force) {
  let config = {};
  if (text !== null && text.trim() !== "") {
    try { config = JSON.parse(text); } catch { return { status: "error", message: "existing file is not valid JSON; left untouched" }; }
    if (config === null || typeof config !== "object" || Array.isArray(config)) return { status: "error", message: "existing file is not a JSON object; left untouched" };
  }
  const servers = config.mcpServers ?? {};
  const current = servers[SERVER_NAME];
  if (uninstall) {
    if (current === undefined) return { status: "unchanged" };
    if (!sameClaudeEntry(current) && !force) return { status: "conflict", message: `mcpServers.${SERVER_NAME} differs from the setup entry; rerun with --force to remove it` };
    const { [SERVER_NAME]: _removed, ...others } = servers;
    return { status: "removed", content: `${JSON.stringify({ ...config, mcpServers: others }, null, 2)}\n` };
  }
  if (sameClaudeEntry(current)) return { status: "unchanged" };
  if (current !== undefined && !force) return { status: "conflict", message: `mcpServers.${SERVER_NAME} already exists with different settings; rerun with --force to replace it` };
  return { status: current === undefined ? (text === null ? "created" : "updated") : "replaced", content: `${JSON.stringify({ ...config, mcpServers: { ...servers, [SERVER_NAME]: claudeEntry() } }, null, 2)}\n` };
}

// --- Codex config.toml ----------------------------------------------------
const tomlString = (value) => JSON.stringify(value);
const codexBlock = () => `[mcp_servers.${SERVER_NAME}]\ncommand = ${tomlString(MCP_COMMAND)}\nargs = [${MCP_ARGS.map(tomlString).join(", ")}]\n`;
const ownHeader = new RegExp(`^\\s*\\[\\s*mcp_servers\\s*\\.\\s*(?:"${SERVER_NAME}"|${SERVER_NAME})\\s*(?:\\.[^\\]]*)?\\]\\s*(?:#.*)?$`);
const anyHeader = /^\s*\[/;

// Splits the file into the lines of our [mcp_servers.stylegallery] table (and
// its subtables) and every other line, so other content is preserved verbatim.
function splitCodex(text) {
  const lines = text.split("\n");
  const kept = [];
  const own = [];
  let inOwn = false;
  let firstOwn = -1;
  let inline = false;
  let section = "";
  for (const line of lines) {
    if (anyHeader.test(line)) {
      inOwn = ownHeader.test(line);
      section = line.trim();
      if (inOwn && firstOwn === -1) firstOwn = kept.length;
    } else if (!inOwn && /^\[\s*mcp_servers\s*\]/.test(section) && new RegExp(`^\\s*"?${SERVER_NAME}"?\\s*=`).test(line)) inline = true;
    else if (!inOwn && new RegExp(`^\\s*mcp_servers\\s*\\.\\s*"?${SERVER_NAME}"?\\s*[.=]`).test(line) && section === "") inline = true;
    (inOwn ? own : kept).push(line);
  }
  return { kept, own, firstOwn, inline };
}

const normalizeToml = (lines) => lines.map((line) => line.replace(/\s+#.*$/, "").trim()).filter((line) => line && !line.startsWith("#")).join("\n");

function planCodexMcp(text, uninstall, force) {
  const source = text ?? "";
  const { kept, own, firstOwn, inline } = splitCodex(source);
  if (inline) return { status: "conflict", message: `mcp_servers.${SERVER_NAME} is defined with dotted or inline keys; edit it by hand` };
  const ours = normalizeToml(codexBlock().split("\n"));
  const exists = own.length > 0;
  const matches = exists && normalizeToml(own) === ours;
  const join = (lines) => { const out = lines.join("\n").replace(/\n{3,}/g, "\n\n"); return out.trim() === "" ? "" : `${out.replace(/\n*$/, "")}\n`; };
  if (uninstall) {
    if (!exists) return { status: "unchanged" };
    if (!matches && !force) return { status: "conflict", message: `[mcp_servers.${SERVER_NAME}] differs from the setup entry; rerun with --force to remove it` };
    return { status: "removed", content: join(kept) };
  }
  if (matches) return { status: "unchanged" };
  if (exists && !force) return { status: "conflict", message: `[mcp_servers.${SERVER_NAME}] already exists with different settings; rerun with --force to replace it` };
  const block = codexBlock().replace(/\n$/, "").split("\n");
  if (exists) {
    const next = [...kept];
    next.splice(firstOwn, 0, ...block, "");
    return { status: "replaced", content: join(next) };
  }
  const prefix = join(kept);
  return { status: text === null ? "created" : "updated", content: `${prefix}${prefix ? "\n" : ""}${codexBlock()}` };
}

// --- skills ---------------------------------------------------------------
function planSkill(target, skillText, uninstall, force) {
  const current = readText(target);
  if (uninstall) {
    if (current === null) return { status: "unchanged" };
    if (current !== skillText && !force) return { status: "conflict", message: "installed SKILL.md differs from the packaged skill; rerun with --force to remove it" };
    return { status: "removed", remove: true };
  }
  if (current === skillText) return { status: "unchanged" };
  if (current !== null && !force) return { status: "conflict", message: "a different SKILL.md is already installed; rerun with --force to replace it" };
  return { status: current === null ? "created" : "replaced", content: skillText };
}

function backup(file, stamp) {
  const target = `${file}.bak-stylegallery-${stamp}`;
  fs.copyFileSync(file, target);
  return target;
}

function apply(kind, file, plan, stamp) {
  const result = {};
  if (kind === "mcp" && fs.existsSync(file)) result.backup = backup(file, stamp);
  if (plan.remove) {
    fs.rmSync(file);
    const directory = path.dirname(file);
    if (fs.readdirSync(directory).length === 0) fs.rmdirSync(directory);
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, plan.content);
  }
  return result;
}

function parse(args) {
  const options = { dryRun: false, force: false, uninstall: false, agent: null, only: null };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--force") options.force = true;
    else if (argument === "--uninstall") options.uninstall = true;
    else if (argument === "--agent" || argument === "--only") {
      const value = args[index + 1];
      const allowed = argument === "--agent" ? [...AGENTS, "all"] : PARTS;
      if (value === undefined || !allowed.includes(value)) return { error: ["argument_value_invalid", `${argument} must be one of ${allowed.join(", ")}`] };
      options[argument.slice(2)] = value;
      index += 1;
    } else return { error: ["argument_unknown", `unknown option ${argument}; run stylegallery help`] };
  }
  return { options };
}

export function runSetup(args, { env = process.env, home = env.HOME || os.homedir(), now = new Date() } = {}) {
  const parsed = parse(args);
  if (parsed.error) return { ok: false, operation: "setup", failures: [{ code: parsed.error[0], message: parsed.error[1] }] };
  const { options } = parsed;
  const where = locations(home, env);
  const detected = AGENTS.filter((agent) => where[agent].detect.some((file) => fs.existsSync(file)) || onPath(agent, env));
  const agents = options.agent === null ? detected : options.agent === "all" ? AGENTS : [options.agent];
  const parts = options.only === null ? PARTS : [options.only];
  const skillText = fs.readFileSync(path.join(packageRoot, "skills", SKILL_NAME, "SKILL.md"), "utf8");
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const changes = [];
  const failures = [];
  for (const agent of agents) {
    for (const kind of parts) {
      const file = where[agent][kind];
      const plan = kind === "skill" ? planSkill(file, skillText, options.uninstall, options.force)
        : agent === "claude" ? planClaudeMcp(readText(file), options.uninstall, options.force)
          : planCodexMcp(readText(file), options.uninstall, options.force);
      const change = { agent, kind, path: file, action: plan.status };
      if (plan.message) change.message = plan.message;
      if (plan.status === "conflict" || plan.status === "error") failures.push({ code: `setup_${plan.status}`, message: `${file}: ${plan.message}` });
      else if (plan.status !== "unchanged" && !options.dryRun) Object.assign(change, apply(kind, file, plan, stamp));
      changes.push(change);
    }
  }
  const next = options.uninstall ? [] : [
    ...(agents.includes("claude") && parts.includes("mcp") ? ["claude mcp list"] : []),
    ...(agents.includes("codex") && parts.includes("mcp") ? ["codex mcp list"] : []),
  ];
  return {
    ok: failures.length === 0,
    operation: options.uninstall ? "setup.uninstall" : "setup",
    dry_run: options.dryRun,
    detected,
    agents,
    mcp: { name: SERVER_NAME, command: MCP_COMMAND, args: MCP_ARGS },
    changes,
    ...(agents.length === 0 ? { hint: "No Claude Code or Codex installation detected; pass --agent claude, codex, or all." } : {}),
    ...(next.length && !options.dryRun && failures.length === 0 ? { next } : {}),
    failures,
  };
}
