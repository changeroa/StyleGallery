#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { agentNativeFixture } from "./agent-native/fixture.mjs";
import { createVersionId } from "./agent-native/identity.mjs";
import { createSelfDescription } from "./agent-native/self-description.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const operations = agentNativeFixture.records.filter((record) => record.record_kind === "operation");

function check(name, expected, actual, ok) {
  return { actual, expected, name, ok };
}

function selfDescriptionFor(records) {
  return createSelfDescription({
    fixture: {
      fixture_ref: agentNativeFixture.fixture_ref,
      manifest: agentNativeFixture.manifest,
      records,
    },
    operations,
  });
}

function tamperedRecords(mutator) {
  const records = structuredClone(agentNativeFixture.records);
  mutator(records);
  return records;
}

function expectedFailure(name, code, mutator) {
  try {
    selfDescriptionFor(tamperedRecords(mutator));
    return check(name, code, { code: "no_failure" }, false);
  } catch (error) {
    return check(name, code, { code: error?.code ?? "unknown", message: error?.message }, error?.code === code);
  }
}

function runDiscover() {
  const child = spawnSync(process.execPath, [path.join(repositoryRoot, "scripts", "sg.mjs"), "discover", "--format", "json"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  let report;
  try { report = JSON.parse(child.stdout); } catch { report = null; }
  const claims = report?.result?.conformance?.claims ?? [];
  const receipt = claims[0]?.execution_receipts?.[0];
  return check(
    "discover_exposes_verified_execution_receipt",
    "discover is successful only with fixture_verified status and a bound PASS receipt",
    {
      status: child.status,
      stderr: child.stderr,
      conformance_status: report?.result?.conformance?.status,
      receipt_ref: receipt?.receipt?.stable_ref,
      fixture_version_id: receipt?.receipt?.fixture_version_id,
      verifier_status: receipt?.receipt?.verification?.status,
    },
    child.status === 0
      && child.signal === null
      && child.stderr === ""
      && report?.ok === true
      && report?.result?.conformance?.status === "fixture_verified"
      && receipt?.receipt?.record_kind === "execution_receipt"
      && receipt?.receipt?.verification?.status === "PASS"
      && receipt?.receipt?.fixture_version_id === receipt?.source?.version_id,
  );
}

const results = [
  check(
    "default_fixture_receipt_verifies",
    "the immutable fixture has one content-bound execution receipt",
    {
      status: createSelfDescription({ fixture: agentNativeFixture, operations }).conformance.status,
      receipts: agentNativeFixture.records.filter((record) => record.record_kind === "execution_receipt").length,
    },
    agentNativeFixture.records.filter((record) => record.record_kind === "execution_receipt").length === 1,
  ),
  expectedFailure("missing_receipt_cannot_claim_fixture_verified", "self_description_execution_receipt_missing", (records) => {
    const index = records.findIndex((record) => record.record_kind === "execution_receipt");
    records.splice(index, 1);
  }),
  expectedFailure("wrong_fixture_version_is_rejected", "self_description_receipt_version_mismatch", (records) => {
    records.find((record) => record.record_kind === "execution_receipt").fixture_version_id = "sg:artifact/sg-cli-conformance-test@sha256:0000000000000000000000000000000000000000000000000000000000000000";
  }),
  expectedFailure("tampered_result_digest_is_rejected", "self_description_receipt_result_digest_mismatch", (records) => {
    records.find((record) => record.record_kind === "execution_receipt").result_sha256 = "sha256:0000000000000000000000000000000000000000000000000000000000000000";
  }),
  expectedFailure("unverified_receipt_is_rejected", "self_description_receipt_unverified", (records) => {
    const receipt = records.find((record) => record.record_kind === "execution_receipt");
    receipt.verification.status = "PASS_WITH_WARNINGS";
    const payload = { ...receipt };
    delete payload.version_id;
    receipt.version_id = createVersionId({ stableRef: receipt.stable_ref, payload });
  }),
  runDiscover(),
];

const report = { ok: results.every((result) => result.ok), results };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.ok ? 0 : 1;
