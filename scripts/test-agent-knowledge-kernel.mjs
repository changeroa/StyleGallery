#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { runIdentityIntegrityCases } from "./test-agent-identity-integrity-cases.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleFiles = Object.freeze({
  canonical: "scripts/agent-native/canonical-json.mjs",
  identity: "scripts/agent-native/identity.mjs",
  store: "scripts/agent-native/immutable-store.mjs",
  knowledge: "scripts/agent-native/knowledge.mjs",
});

function failure(code, message, recordPath) {
  return { code, message, ...(recordPath ? { path: recordPath } : {}) };
}

function valueAt(record, ...keys) {
  for (const key of keys) {
    if (record && Object.hasOwn(record, key)) return record[key];
  }
  return undefined;
}

class ContractError extends Error {
  constructor(code, message, recordPath) {
    super(message);
    this.code = code;
    this.path = recordPath;
  }
}

function requireExport(modules, moduleName, names) {
  const moduleRecord = modules[moduleName];
  if (!moduleRecord || moduleRecord.error) {
    const detail = moduleRecord?.error?.message ?? "module was not loaded";
    throw new ContractError("kernel_module_missing", `${moduleFiles[moduleName]} is unavailable: ${detail}`, moduleFiles[moduleName]);
  }
  for (const name of names) {
    if (typeof moduleRecord.value?.[name] === "function") return moduleRecord.value[name];
  }
  throw new ContractError("kernel_export_missing", `${moduleFiles[moduleName]} must export one of ${names.join(", ")}`, moduleFiles[moduleName]);
}

function assert(condition, message, recordPath) {
  if (!condition) throw new ContractError("assertion_failed", message, recordPath);
}

function resultState(result) {
  const state = valueAt(result, "state", "evidence_state", "aggregation", "status");
  return typeof state === "string" ? state.toUpperCase() : state;
}

function makeFixture(modules) {
  const claimFactory = requireExport(modules, "knowledge", ["createClaim", "makeClaim"]);
  const evidenceFactory = requireExport(modules, "knowledge", ["createEvidenceLink", "makeEvidenceLink"]);
  const validationFactory = requireExport(modules, "knowledge", ["createValidationReport", "makeValidationReport"]);
  const governanceFactory = requireExport(modules, "knowledge", ["createGovernanceDecision", "makeGovernanceDecision"]);
  const claim = claimFactory({
    stable_ref: "sg:claim/editorial-layout",
    statement: "Editorial layout keeps reading order stable.",
    subject: "sg:profile/editorial-reference-profile",
    actor: "sg:agent/fixture",
  });
  const evidence = (polarity, suffix) => evidenceFactory({
    stable_ref: `sg:evidence/editorial-layout-${suffix}`,
    claim_ref: valueAt(claim, "stable_ref", "stableRef") ?? "sg:claim/editorial-layout",
    claim_version: valueAt(claim, "version_id", "versionId"),
    source_ref: "sg:artifact/editorial-layout-fixture",
    source_version: "sg:artifact/editorial-layout-fixture@sha256:" + "1".repeat(64),
    polarity,
    independence_group: `fixture-${suffix}`,
    actor: `sg:observer/${suffix}`,
  });
  const validation = validationFactory({
    stable_ref: "sg:validation/editorial-layout-pass",
    claim_ref: valueAt(claim, "stable_ref", "stableRef"),
    claim_version: valueAt(claim, "version_id", "versionId"),
    validator: "sg:validator/fixture",
    validator_version: "sg:validator/fixture@sha256:" + "2".repeat(64),
    status: "PASSED",
    inputs: [valueAt(claim, "version_id", "versionId")],
  });
  const governance = governanceFactory({
    stable_ref: "sg:governance/editorial-layout-accept",
    claim_ref: valueAt(claim, "stable_ref", "stableRef"),
    claim_version: valueAt(claim, "version_id", "versionId"),
    actor: "sg:governor/fixture",
    decision: "ACCEPTED",
    scope: "fixture",
    policy_version: "sg:governance-policy/fixture@sha256:" + "3".repeat(64),
  });
  return { claim, evidence, evidence_sample: evidence("SUPPORT", "fixture"), validation, governance };
}

async function loadModules() {
  const modules = {};
  for (const [name, relative] of Object.entries(moduleFiles)) {
    try {
      modules[name] = { value: await import(path.join(root, relative)) };
    } catch (error) {
      modules[name] = { error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
  return modules;
}

async function runCase(name, expected, execute) {
  try {
    const actual = await execute();
    return { actual, expected, name, ok: true };
  } catch (error) {
    return {
      actual: {
        code: error instanceof ContractError ? error.code : "kernel_case_exception",
        message: error instanceof Error ? error.message : String(error),
        ...(error?.path ? { path: error.path } : {}),
      },
      expected,
      name,
      ok: false,
    };
  }
}

async function main() {
  const unsupported = process.argv.slice(2).filter((argument) => argument !== "--json");
  if (unsupported.length > 0) {
    const report = { ok: false, status: "RED", failures: [failure("argument_unknown", `unknown argument ${unsupported[0]}`)], results: [] };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const modules = await loadModules();
  const aggregate = () => requireExport(modules, "knowledge", ["aggregateEvidence", "aggregateEvidenceState"]);

  const results = await runIdentityIntegrityCases();
  results.push(await runCase("claim_evidence_validation_governance_are_distinct_frozen_objects", "each epistemic object has its own immutable identity and lifecycle", () => {
    const fixture = makeFixture(modules);
    for (const [name, value] of Object.entries(fixture)) {
      if (name === "evidence") continue;
      assert(value && typeof value === "object" && Object.isFrozen(value), `${name} is not deeply frozen`);
      assert(typeof valueAt(value, "stable_ref", "stableRef") === "string", `${name} has no StableRef`);
      assert(typeof valueAt(value, "version_id", "versionId") === "string", `${name} has no VersionID`);
    }
    assert(fixture.claim !== fixture.validation && fixture.claim !== fixture.governance, "knowledge layers were conflated");
    return { refs: Object.fromEntries(Object.entries(fixture).map(([name, value]) => [name, valueAt(value, "stable_ref", "stableRef")])) };
  }));
  for (const [name, expectedState, links] of [["supported", "SUPPORTED", ["SUPPORT"]], ["refuted", "REFUTED", ["REFUTE"]], ["both", "BOTH", ["SUPPORT", "REFUTE"]], ["neither", "NEITHER", []]]) {
    results.push(await runCase(`evidence_aggregation_${name}`, `aggregation is ${expectedState}`, () => {
      const fixture = makeFixture(modules);
      const evidence = links.map((polarity, index) => fixture.evidence(polarity, `${name}-${index}`));
      const value = aggregate()({ claim: fixture.claim, evidence_links: evidence, evidenceLinks: evidence });
      assert(resultState(value) === expectedState, `expected ${expectedState}, got ${resultState(value)}`);
      return { state: resultState(value) };
    }));
  }
  results.push(await runCase("validation_and_governance_do_not_erase_contradiction", "validation approval and governance acceptance remain separate from BOTH evidence", () => {
    const fixture = makeFixture(modules);
    const evidence = [fixture.evidence("SUPPORT", "contradiction-support"), fixture.evidence("REFUTE", "contradiction-refute")];
    const before = resultState(aggregate()({ claim: fixture.claim, evidence_links: evidence, evidenceLinks: evidence }));
    assert(before === "BOTH", `contradiction fixture did not aggregate BOTH: ${before}`);
    assert(valueAt(fixture.validation, "status") === "PASSED", "validation fixture is not passed");
    assert(valueAt(fixture.governance, "decision", "status") === "ACCEPTED", "governance fixture is not accepted");
    const after = resultState(aggregate()({ claim: fixture.claim, evidence_links: evidence, evidenceLinks: evidence }));
    assert(after === "BOTH", `validation/governance erased contradiction: ${after}`);
    return { before, after, validation: valueAt(fixture.validation, "status"), governance: valueAt(fixture.governance, "decision", "status") };
  }));

  const ok = results.every((result) => result.ok);
  const report = {
    ok,
    status: ok ? "GREEN" : "RED",
    modules: Object.fromEntries(Object.entries(modules).map(([name, loaded]) => [name, loaded.error ? { ok: false, error: loaded.error.message } : { ok: true }])),
    results,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = ok ? 0 : 1;
}

await main();
