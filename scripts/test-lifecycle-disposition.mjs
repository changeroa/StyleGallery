#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createCalibrationBase } from "./calibration-test-fixture.mjs";
import { cleanupFixture, completeSession, createConformance, initializeConsumer } from "./page-evidence-fixture.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(repositoryRoot, "scripts/validate-lifecycle-disposition.mjs");
const fixtureRoot = path.join(repositoryRoot, "consumer-reference/fixtures/lifecycle-disposition");
const canonicalRoot = path.join(repositoryRoot, "consumer-reference/policies");
const tempRoot = fs.mkdtempSync(path.join(repositoryRoot, ".tmp-lifecycle-test-"));
const rows = [];

function run(args) {
  const child = spawnSync(process.execPath, [validator, ...args, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  let report;
  try { report = JSON.parse(child.stdout); } catch { report = { failures: [{ code: "output_invalid" }], ok: false }; }
  return { codes: report.failures?.map(({ code }) => code) ?? [], report, status: child.status };
}
function expectFailure(name, args, code) {
  const result = run(args);
  const ok = result.status !== 0 && result.codes.includes(code);
  rows.push({ actual: { codes: result.codes, status: result.status }, expected: code, name, ok });
}
function expectSuccess(name, args) {
  const result = run(args);
  const ok = result.status === 0 && result.report.ok === true;
  rows.push({ actual: { codes: result.codes, status: result.status }, expected: "ok:true", name, ok });
}
function base() {
  return {
    family: "sentinel-calibration",
    owner_ref: "sg:governor/stylegallery-maintainers",
    baseline_recorded_at: "2026-07-30T08:52:29Z",
    decision_window_days: 60,
    due_at: "2026-09-28T08:52:29Z",
    evidence_refs: ["consumer-reference/baselines/calibration.json"],
    caller_status: "unknown",
    decision: "pending_owner",
    post_deadline_action: "retire_recurring",
    archive_paths: ["consumer-reference/baselines/calibration.json"],
  };
}
function write(name, value) {
  const file = path.join(tempRoot, `${name}.json`);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  return file;
}
function mutate(name, change) {
  const value = base();
  change(value);
  return write(name, value);
}

try {
  const fixtureManifest = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "manifest.json"), "utf8"));
  for (const entry of fixtureManifest.invalid_records) {
    expectFailure(entry.file.replace(/\.json$/, ""), ["--record", path.join(fixtureRoot, entry.file), "--as-of", "2026-08-01T00:00:00Z"], entry.expected_code);
  }

  for (const [name, change, code] of [
    ["unknown_family", (v) => { v.family = "invented-family"; }, "lifecycle_family_unknown"],
    ["missing_required", (v) => { delete v.evidence_refs; }, "lifecycle_field_missing"],
    ["invalid_calendar", (v) => { v.baseline_recorded_at = "2026-02-30T00:00:00Z"; }, "lifecycle_rfc3339_invalid"],
    ["invalid_leap", (v) => { v.due_at = "2025-02-29T08:52:29Z"; }, "lifecycle_rfc3339_invalid"],
    ["baseline_drift", (v) => { v.baseline_recorded_at = "2026-07-31T08:52:29Z"; v.due_at = "2026-09-29T08:52:29Z"; }, "lifecycle_baseline_mismatch"],
    ["wrong_window", (v) => { v.decision_window_days = 90; v.due_at = "2026-10-28T08:52:29Z"; }, "lifecycle_window_invalid"],
    ["empty_evidence", (v) => { v.evidence_refs = []; }, "lifecycle_path_list_empty"],
    ["duplicate_evidence", (v) => { v.evidence_refs.push(v.evidence_refs[0]); }, "lifecycle_path_duplicate"],
    ["missing_evidence", (v) => { v.evidence_refs = ["consumer-reference/missing.json"]; }, "lifecycle_path_missing"],
    ["path_escape", (v) => { v.evidence_refs = ["../outside.json"]; }, "lifecycle_path_invalid"],
    ["absolute_path", (v) => { v.archive_paths = ["/tmp/archive.json"]; }, "lifecycle_path_invalid"],
    ["unsupported_action", (v) => { v.post_deadline_action = "delete_all"; }, "lifecycle_action_invalid"],
    ["false_certainty", (v) => { v.caller_status = "verified"; }, "lifecycle_caller_evidence_missing"],
  ]) expectFailure(name, ["--record", mutate(name, change), "--as-of", "2026-08-01T00:00:00Z"], code);

  const untracked = write("untracked-evidence", { evidence: true });
  expectFailure("untracked_evidence", ["--record", mutate("untracked-ref", (v) => { v.evidence_refs = [path.relative(repositoryRoot, untracked)]; }), "--as-of", "2026-08-01T00:00:00Z"], "lifecycle_path_untracked");
  const directory = path.join(tempRoot, "archive-directory");
  fs.mkdirSync(directory);
  expectFailure("archive_not_file", ["--record", mutate("archive-dir-ref", (v) => { v.archive_paths = [path.relative(repositoryRoot, directory)]; }), "--as-of", "2026-08-01T00:00:00Z"], "lifecycle_path_type_invalid");
  const linked = path.join(tempRoot, "linked.json");
  fs.symlinkSync(path.join(repositoryRoot, "consumer-reference/baselines/calibration.json"), linked);
  expectFailure("symlink_evidence", ["--record", mutate("symlink-ref", (v) => { v.evidence_refs = [path.relative(repositoryRoot, linked)]; }), "--as-of", "2026-08-01T00:00:00Z"], "lifecycle_path_symlink");

  const duplicateA = write("duplicate-a", base());
  const duplicateB = write("duplicate-b", base());
  expectFailure("duplicate_families", ["--record", duplicateA, "--record", duplicateB, "--as-of", "2026-08-01T00:00:00Z"], "lifecycle_family_duplicate");
  expectFailure("expired_without_disposition", ["--record", mutate("expired", (v) => { v.post_deadline_action = "retain_archive"; }), "--as-of", "2026-10-01T00:00:00Z"], "lifecycle_expired_undisposed");

  const canonicalSentinel = JSON.parse(fs.readFileSync(path.join(canonicalRoot, "lifecycle-sentinel-calibration.json"), "utf8"));
  const canonicalPage = JSON.parse(fs.readFileSync(path.join(canonicalRoot, "lifecycle-page-evidence-adoption.json"), "utf8"));
  const canonicalProtocol = JSON.parse(fs.readFileSync(path.join(canonicalRoot, "lifecycle-protocol-owner-review.json"), "utf8"));
  for (const [family, source] of [["sentinel", canonicalSentinel], ["page", canonicalPage], ["protocol", canonicalProtocol]]) {
    for (const removed of source.archive_paths) {
      const value = structuredClone(source);
      value.archive_paths = value.archive_paths.filter((entry) => entry !== removed);
      const caseId = removed.replaceAll("/", "__").replaceAll(".", "_");
      expectFailure(`archive_omission_${family}_${caseId}`, ["--record", write(`archive-omission-${family}-${caseId}`, value), "--as-of", "2026-08-01T00:00:00Z"], "lifecycle_archive_set_invalid");
    }
  }
  for (const [name, source, change] of [
    ["archive_extra", canonicalPage, (v) => { v.archive_paths.push("scripts/validate-consumer-reference.mjs"); v.archive_paths.sort(); }],
    ["archive_duplicate", canonicalSentinel, (v) => { v.archive_paths.push(v.archive_paths[0]); }],
    ["archive_path_swap", canonicalProtocol, (v) => { v.archive_paths[0] = "consumer-reference/agent-native/registry.json"; v.archive_paths.sort(); }],
  ]) {
    const value = structuredClone(source); change(value);
    expectFailure(name, ["--record", write(name, value), "--as-of", "2026-08-01T00:00:00Z"], "lifecycle_archive_set_invalid");
  }
  const emptyReceipt = structuredClone(canonicalSentinel);
  emptyReceipt.decision = "approved";
  emptyReceipt.post_deadline_action = "retain_archive";
  emptyReceipt.decision_receipt = { path: "consumer-reference/generated/manifest.json", sha256: "0".repeat(64) };
  expectFailure("tracked_arbitrary_json_is_not_a_receipt", ["--record", write("empty-receipt", emptyReceipt), "--as-of", "2026-08-01T00:00:00Z"], "lifecycle_receipt_invalid");

  const approved = structuredClone(canonicalSentinel);
  approved.decision = "approved";
  approved.post_deadline_action = "retain_archive";
  expectFailure("approved_requires_authenticated_receipt", ["--record", write("approved", approved), "--as-of", "2026-10-01T00:00:00Z"], "lifecycle_receipt_required");
  expectSuccess("unknown_protocol_callers_retain_archive", ["--record", write("protocol", canonicalProtocol), "--as-of", "2026-10-01T00:00:00Z"]);

  const copiedFixtures = path.join(tempRoot, "fixture-copy");
  fs.cpSync(fixtureRoot, copiedFixtures, { recursive: true });
  const driftedManifest = JSON.parse(fs.readFileSync(path.join(copiedFixtures, "manifest.json"), "utf8"));
  driftedManifest.invalid_records.reverse();
  fs.writeFileSync(path.join(copiedFixtures, "manifest.json"), `${JSON.stringify(driftedManifest, null, 2)}\n`);
  expectFailure("fixture_manifest_order_drift", ["--fixture-root", copiedFixtures, "--as-of", "2026-08-01T00:00:00Z"], "lifecycle_fixture_manifest_drift");

  expectSuccess("canonical_three_family_inventory", ["--as-of", "2026-08-01T00:00:00Z"]);
  const savedArgv = process.argv;
  process.argv = [process.execPath, validator];
  const contract = await import(`${new URL("./validate-lifecycle-disposition.mjs", import.meta.url).href}?contract-test`);
  process.argv = savedArgv;
  rows.push({ name: "bytewise_utf8_order_ignores_locale_and_normalization", expected: "Buffer.compare UTF-8", actual: typeof contract.compareUtf8, ok: typeof contract.compareUtf8 === "function" && contract.compareUtf8("é", "中") < 0 && contract.compareUtf8("e\u0301", "é") < 0 && contract.compareUtf8("中", "あ") > 0 });
  rows.push({ name: "descriptor_bound_reader_exported", expected: "safe no-follow reader", actual: typeof contract.readRepositoryFileSafely, ok: typeof contract.readRepositoryFileSafely === "function" });
  rows.push({ name: "closed_receipt_validator_exported", expected: "authenticated receipt content validator", actual: typeof contract.validateDecisionReceipt, ok: typeof contract.validateDecisionReceipt === "function" });
  rows.push({ name: "immutable_git_object_reader_exported", expected: "immutable commit/tree/blob reader", actual: typeof contract.readImmutableGitObject, ok: typeof contract.readImmutableGitObject === "function" });
  rows.push({ name: "sealed_source_reader_exported", expected: "content-addressed closure reader", actual: typeof contract.readSealedSource, ok: typeof contract.readSealedSource === "function" });
  rows.push({ name: "closed_caller_registry_exported", expected: "two exact Todo24 caller identities", actual: contract.trustedCallerRegistry, ok: Array.isArray(contract.trustedCallerRegistry) && contract.trustedCallerRegistry.length === 2 });

  const canonicalize = (value) => Array.isArray(value) ? `[${value.map(canonicalize).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort(contract.compareUtf8).map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}` : JSON.stringify(value);
  const digest = (value) => createHash("sha256").update(typeof value === "string" ? value : canonicalize(value)).digest("hex");
  const receiptRecord = structuredClone(canonicalSentinel);
  receiptRecord.decision = "approved";
  receiptRecord.post_deadline_action = "retain_archive";
  receiptRecord.decision_receipt = { commit: "a".repeat(40), path: "consumer-reference/policies/lifecycle-owner-receipt.json", blob_oid: "b".repeat(40), sha256: "a".repeat(64) };
  receiptRecord.evidence_refs = [...receiptRecord.evidence_refs, receiptRecord.decision_receipt.path].sort(contract.compareUtf8);
  const receipt = {
    schema_version: "1.0", receipt_kind: "lifecycle-decision", owner_ref: receiptRecord.owner_ref, family: receiptRecord.family,
    decision: receiptRecord.decision, caller_status: receiptRecord.caller_status, issued_at: "2026-08-01T00:00:00Z",
    provenance: { kind: "owner_decision", caller_ref: null, protocol: null, version: null, source_closure_id: null, revision: null },
    subject_sha256: digest(contract.lifecycleSubject(receiptRecord)), evidence_sha256: digest(receiptRecord.evidence_refs),
  };
  rows.push({ name: "approved_is_distinct_with_bound_receipt", expected: undefined, actual: contract.validateDecisionReceipt({ record: receiptRecord, receipt }), ok: contract.validateDecisionReceipt({ record: receiptRecord, receipt }) === undefined });
  for (const [name, change, expected] of [
    ["receipt_wrong_family", (v) => { v.family = "page-evidence-adoption"; }, "lifecycle_receipt_binding_invalid"],
    ["receipt_cross_family_replay", (_v, r) => { r.family = "page-evidence-adoption"; }, "lifecycle_receipt_binding_invalid"],
    ["receipt_subject_mutation", (_v, r) => { r.due_at = "2026-09-29T08:52:29Z"; }, "lifecycle_receipt_subject_mismatch"],
    ["receipt_evidence_mutation", (_v, r) => { r.evidence_refs = [...r.evidence_refs, "README.md"].sort(contract.compareUtf8); }, "lifecycle_receipt_subject_mismatch"],
    ["receipt_bad_timestamp", (v) => { v.issued_at = "2026-10-01T00:00:00Z"; }, "lifecycle_receipt_timestamp_invalid"],
    ["receipt_synthetic_self", (v, r) => { r.caller_status = "verified"; v.caller_status = "verified"; v.provenance = { kind: "external_caller", repository: "example/stylegallery-page-evidence-ci", revision: "a".repeat(40) }; }, "lifecycle_caller_registry_unknown"],
    ["receipt_malformed_provenance", (v) => { v.provenance = {}; }, "lifecycle_receipt_provenance_invalid"],
  ]) {
    const mutatedReceipt = structuredClone(receipt); const mutatedRecord = structuredClone(receiptRecord); change(mutatedReceipt, mutatedRecord);
    const actual = contract.validateDecisionReceipt({ record: mutatedRecord, receipt: mutatedReceipt });
    rows.push({ name, expected, actual, ok: actual === expected });
  }
  const emptyActual = contract.validateDecisionReceipt({ record: receiptRecord, receipt: {} });
  rows.push({ name: "receipt_empty_json_rejected", expected: "lifecycle_receipt_invalid", actual: emptyActual, ok: emptyActual === "lifecycle_receipt_invalid" });
  const attackerRecord = structuredClone(receiptRecord); attackerRecord.caller_status = "verified";
  const attackerReceipt = structuredClone(receipt); attackerReceipt.caller_status = "verified"; attackerReceipt.provenance = { kind: "external_caller", repository: "attacker/fabricated-caller", revision: "b".repeat(40) }; attackerReceipt.subject_sha256 = digest(contract.lifecycleSubject(attackerRecord));
  const attackerActual = contract.validateDecisionReceipt({ record: attackerRecord, receipt: attackerReceipt });
  rows.push({ name: "fabricated_external_caller_positive_registry_rejection", expected: "lifecycle_caller_registry_unknown", actual: attackerActual, ok: attackerActual === "lifecycle_caller_registry_unknown" });
  const inventedRevisionReceipt = structuredClone(attackerReceipt); inventedRevisionReceipt.provenance = { kind: "registered_caller", caller_ref: "sg:caller/a2a-extension-v1", protocol: "a2a", version: "1.0", source_closure_id: "sha256:" + "c".repeat(64), revision: "b".repeat(40) };
  const inventedActual = contract.validateDecisionReceipt({ record: attackerRecord, receipt: inventedRevisionReceipt });
  rows.push({ name: "invented_caller_revision_rejected", expected: "lifecycle_caller_registry_mismatch", actual: inventedActual, ok: inventedActual === "lifecycle_caller_registry_mismatch" });
  const registeredRecord = structuredClone(attackerRecord); registeredRecord.family = "protocol-owner-review";
  const registeredReceipt = structuredClone(attackerReceipt); registeredReceipt.family = registeredRecord.family; registeredReceipt.provenance = { kind: "registered_caller", caller_ref: "sg:caller/a2a-extension-v1", protocol: "a2a", version: "1.0", source_closure_id: "sha256:1cc2a58af9e7aa0c858def08fd8c65dca2ebf8c7ae7f0d4149f99fc827c5fbc5", revision: "f8728fb7cbed152d35a01753d92e2b3f4b295c59" }; registeredReceipt.subject_sha256 = digest(contract.lifecycleSubject(registeredRecord));
  const registeredActual = contract.validateDecisionReceipt({ record: registeredRecord, receipt: registeredReceipt });
  rows.push({ name: "exact_registered_a2a_caller_content", expected: undefined, actual: registeredActual, ok: registeredActual === undefined });
  const callerReplayActual = contract.validateDecisionReceipt({ record: attackerRecord, receipt: { ...registeredReceipt, family: attackerRecord.family, subject_sha256: digest(contract.lifecycleSubject(attackerRecord)) } });
  rows.push({ name: "registered_caller_cross_family_replay", expected: "lifecycle_caller_registry_mismatch", actual: callerReplayActual, ok: callerReplayActual === "lifecycle_caller_registry_mismatch" });

  const authenticatedRoot = path.join(tempRoot, "authenticated-repository");
  const copyIntoAuthenticated = (relative) => { const target = path.join(authenticatedRoot, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(repositoryRoot, relative), target); };
  for (const relative of [
    "scripts/validate-lifecycle-disposition.mjs", "scripts/json-schema-formats.mjs", "scripts/strict-json.mjs",
    "consumer-reference/schema/lifecycle-disposition.schema.json",
    ...fs.readdirSync(fixtureRoot).map((name) => `consumer-reference/fixtures/lifecycle-disposition/${name}`),
    ...new Set([...receiptRecord.evidence_refs.filter((entry) => entry !== receiptRecord.decision_receipt.path), ...receiptRecord.archive_paths]),
  ]) copyIntoAuthenticated(relative);
  const receiptPath = path.join(authenticatedRoot, receiptRecord.decision_receipt.path); fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`); fs.writeFileSync(receiptPath, receiptBytes);
  receiptRecord.decision_receipt.sha256 = createHash("sha256").update(receiptBytes).digest("hex");
  const authenticatedRecord = path.join(authenticatedRoot, "approved.json"); fs.writeFileSync(authenticatedRecord, `${JSON.stringify(receiptRecord, null, 2)}\n`);
  spawnSync("git", ["init", "-q"], { cwd: authenticatedRoot });
  spawnSync("git", ["add", "--", "."], { cwd: authenticatedRoot });
  const authenticatedValidator = path.join(authenticatedRoot, "scripts/validate-lifecycle-disposition.mjs");
  const authenticatedRun = spawnSync(process.execPath, [authenticatedValidator, "--record", authenticatedRecord, "--as-of", "2026-08-01T00:00:00Z", "--json"], { cwd: authenticatedRoot, encoding: "utf8" });
  const authenticatedReport = JSON.parse(authenticatedRun.stdout);
  rows.push({ name: "staged_unsigned_owner_receipt_rejected", expected: "lifecycle_receipt_commit_untrusted", actual: { status: authenticatedRun.status, codes: authenticatedReport.failures.map(({ code }) => code) }, ok: authenticatedRun.status !== 0 && authenticatedReport.failures.some(({ code }) => code === "lifecycle_receipt_commit_untrusted") });
  for (const [name, stagedProvenance] of [
    ["staged_fabricated_external_caller_rejected", { kind: "external_caller", repository: "attacker/fabricated-caller", revision: "b".repeat(40) }],
    ["staged_invented_registered_revision_rejected", { kind: "registered_caller", caller_ref: "sg:caller/a2a-extension-v1", protocol: "a2a", version: "1.0", source_closure_id: "sha256:" + "c".repeat(64), revision: "b".repeat(40) }],
  ]) {
    const stagedRecord = structuredClone(receiptRecord); stagedRecord.caller_status = "verified"; stagedRecord.post_deadline_action = "retain_archive";
    const stagedReceipt = structuredClone(receipt); stagedReceipt.caller_status = "verified"; stagedReceipt.provenance = stagedProvenance; stagedReceipt.subject_sha256 = digest(contract.lifecycleSubject(stagedRecord));
    const stagedBytes = Buffer.from(`${JSON.stringify(stagedReceipt, null, 2)}\n`); fs.writeFileSync(receiptPath, stagedBytes); spawnSync("git", ["add", "--", stagedRecord.decision_receipt.path], { cwd: authenticatedRoot });
    stagedRecord.decision_receipt.sha256 = createHash("sha256").update(stagedBytes).digest("hex"); stagedRecord.decision_receipt.blob_oid = spawnSync("git", ["rev-parse", `:${stagedRecord.decision_receipt.path}`], { cwd: authenticatedRoot, encoding: "utf8" }).stdout.trim(); fs.writeFileSync(authenticatedRecord, `${JSON.stringify(stagedRecord, null, 2)}\n`);
    const stagedRun = spawnSync(process.execPath, [authenticatedValidator, "--record", authenticatedRecord, "--as-of", "2026-08-01T00:00:00Z", "--json"], { cwd: authenticatedRoot, encoding: "utf8" }); const stagedReport = JSON.parse(stagedRun.stdout);
    rows.push({ name, expected: "lifecycle_receipt_commit_untrusted", actual: stagedReport.failures.map(({ code }) => code), ok: stagedRun.status !== 0 && stagedReport.failures.some(({ code }) => code === "lifecycle_receipt_commit_untrusted") });
  }
  fs.writeFileSync(receiptPath, "{}\n");
  const mutatedReceiptRun = spawnSync(process.execPath, [authenticatedValidator, "--record", authenticatedRecord, "--as-of", "2026-08-01T00:00:00Z", "--json"], { cwd: authenticatedRoot, encoding: "utf8" });
  const mutatedReceiptReport = JSON.parse(mutatedReceiptRun.stdout);
  rows.push({ name: "tracked_receipt_worktree_mutation_rejected", expected: "lifecycle_receipt_commit_untrusted", actual: mutatedReceiptReport.failures.map(({ code }) => code), ok: mutatedReceiptRun.status !== 0 && mutatedReceiptReport.failures.some(({ code }) => code === "lifecycle_receipt_commit_untrusted") });

  function raceCase(name, setup, expected) {
    const raceRoot = path.join(tempRoot, `race-${name}`); fs.mkdirSync(raceRoot, { recursive: true });
    const relative = setup(raceRoot); const target = path.join(raceRoot, relative); const stat = fs.lstatSync(target);
    const inventory = new Map([[relative, { mode: "100644", oid: "fixture", stage: "0" }]]);
    let actual;
    try { contract.readRepositoryFileSafely({ root: raceRoot, repositoryPath: relative, inventory, afterOpen: ({ target: opened }) => {
      if (name === "post_open_replace") { fs.renameSync(opened, `${opened}.old`); fs.writeFileSync(opened, "replacement"); }
      if (name === "parent_swap") { const parent = path.dirname(opened); fs.renameSync(parent, `${parent}.old`); fs.mkdirSync(parent); fs.writeFileSync(opened, "replacement"); }
    } }); } catch (error) { actual = error.code; }
    rows.push({ name, expected, actual, inode: stat.ino, ok: actual === expected });
  }
  raceCase("post_open_replace", (root) => { fs.writeFileSync(path.join(root, "file.txt"), "original"); return "file.txt"; }, "lifecycle_path_race");
  raceCase("parent_swap", (root) => { fs.mkdirSync(path.join(root, "parent")); fs.writeFileSync(path.join(root, "parent/file.txt"), "original"); return "parent/file.txt"; }, "lifecycle_path_race");
  const inventoryRoot = path.join(tempRoot, "race-inventory"); fs.mkdirSync(inventoryRoot); fs.writeFileSync(path.join(inventoryRoot, "file.txt"), "original");
  let inventoryReads = 0; let inventoryActual;
  try { contract.readRepositoryFileSafely({ root: inventoryRoot, repositoryPath: "file.txt", inventoryReader: () => new Map([["file.txt", { mode: "100644", oid: inventoryReads++ === 0 ? "before" : "after", stage: "0" }]]) }); } catch (error) { inventoryActual = error.code; }
  rows.push({ name: "index_object_identity_swap", expected: "lifecycle_path_inventory_race", actual: inventoryActual, ok: inventoryActual === "lifecycle_path_inventory_race" });

  const objectRoot = path.join(tempRoot, "immutable-object-repository"); fs.mkdirSync(path.join(objectRoot, ".github"), { recursive: true }); fs.mkdirSync(path.join(objectRoot, "trusted"));
  fs.writeFileSync(path.join(objectRoot, ".github/CODEOWNERS"), "* @changeroa\n/consumer-reference/policies/ @changeroa\n"); fs.writeFileSync(path.join(objectRoot, "trusted/file.txt"), "immutable bytes\n");
  spawnSync("git", ["init", "-q"], { cwd: objectRoot }); spawnSync("git", ["add", "."], { cwd: objectRoot });
  const commitEnv = { ...process.env, GIT_AUTHOR_NAME: "fixture", GIT_AUTHOR_EMAIL: "fixture@example.invalid", GIT_COMMITTER_NAME: "fixture", GIT_COMMITTER_EMAIL: "fixture@example.invalid", GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z", GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z" };
  spawnSync("git", ["commit", "-q", "-m", "immutable fixture"], { cwd: objectRoot, env: commitEnv });
  const objectCommit = spawnSync("git", ["rev-parse", "HEAD"], { cwd: objectRoot, encoding: "utf8" }).stdout.trim();
  const objectTree = spawnSync("git", ["rev-parse", "HEAD^{tree}"], { cwd: objectRoot, encoding: "utf8" }).stdout.trim();
  const objectBlob = spawnSync("git", ["rev-parse", "HEAD:trusted/file.txt"], { cwd: objectRoot, encoding: "utf8" }).stdout.trim();
  const immutableResult = contract.readImmutableGitObject({ root: objectRoot, commit: objectCommit, expectedTree: objectTree, expectedBlob: objectBlob, repositoryPath: "trusted/file.txt" });
  rows.push({ name: "immutable_commit_tree_blob_resolution", expected: "immutable bytes", actual: immutableResult.bytes.toString("utf8").trim(), ok: immutableResult.bytes.toString("utf8") === "immutable bytes\n" });
  for (const [name, args, expected] of [
    ["immutable_wrong_blob", { expectedBlob: "f".repeat(40) }, "lifecycle_git_blob_mismatch"],
    ["immutable_wrong_mode", { expectedMode: "100755" }, "lifecycle_git_mode_mismatch"],
    ["immutable_wrong_tree", { expectedTree: "f".repeat(40) }, "lifecycle_git_tree_mismatch"],
    ["immutable_invented_revision", { commit: "b".repeat(40) }, "lifecycle_git_object_invalid"],
  ]) {
    let actual; try { contract.readImmutableGitObject({ root: objectRoot, commit: objectCommit, expectedTree: objectTree, expectedBlob: objectBlob, expectedMode: "100644", repositoryPath: "trusted/file.txt", ...args }); } catch (error) { actual = error.code; }
    rows.push({ name, expected, actual, ok: actual === expected });
  }
  fs.writeFileSync(path.join(objectRoot, "trusted/extra.txt"), "different tree\n"); spawnSync("git", ["add", "trusted/extra.txt"], { cwd: objectRoot }); spawnSync("git", ["commit", "-q", "-m", "same blob different tree"], { cwd: objectRoot, env: { ...commitEnv, GIT_AUTHOR_DATE: "2026-01-02T00:00:00Z", GIT_COMMITTER_DATE: "2026-01-02T00:00:00Z" } });
  const substitutedCommit = spawnSync("git", ["rev-parse", "HEAD"], { cwd: objectRoot, encoding: "utf8" }).stdout.trim(); let substitutedTreeCode;
  try { contract.readImmutableGitObject({ root: objectRoot, commit: substitutedCommit, expectedTree: objectTree, expectedBlob: objectBlob, repositoryPath: "trusted/file.txt" }); } catch (error) { substitutedTreeCode = error.code; }
  rows.push({ name: "same_blob_different_tree_substitution", expected: "lifecycle_git_tree_mismatch", actual: substitutedTreeCode, ok: substitutedTreeCode === "lifecycle_git_tree_mismatch" });
  const parentPath = path.join(objectRoot, "trusted");
  const parentAba = contract.readImmutableGitObject({ root: objectRoot, commit: objectCommit, expectedTree: objectTree, expectedBlob: objectBlob, repositoryPath: "trusted/file.txt", afterResolve: () => { fs.renameSync(parentPath, `${parentPath}.swap`); fs.mkdirSync(parentPath); fs.writeFileSync(path.join(parentPath, "file.txt"), "attacker bytes!\n"); fs.rmSync(parentPath, { recursive: true }); fs.renameSync(`${parentPath}.swap`, parentPath); } });
  rows.push({ name: "immutable_parent_swap_restore_aba", expected: "immutable bytes", actual: parentAba.bytes.toString("utf8").trim(), ok: parentAba.bytes.toString("utf8") === "immutable bytes\n" });
  const indexBefore = fs.readFileSync(path.join(objectRoot, ".git/index"));
  const indexAba = contract.readImmutableGitObject({ root: objectRoot, commit: objectCommit, expectedTree: objectTree, expectedBlob: objectBlob, repositoryPath: "trusted/file.txt", afterResolve: () => { fs.writeFileSync(path.join(objectRoot, ".git/index"), Buffer.alloc(indexBefore.length, 0x41)); fs.writeFileSync(path.join(objectRoot, ".git/index"), indexBefore); } });
  rows.push({ name: "immutable_index_swap_restore_aba", expected: "immutable bytes", actual: indexAba.bytes.toString("utf8").trim(), ok: indexAba.bytes.toString("utf8") === "immutable bytes\n" });

  const sealedRoot = path.join(tempRoot, "sealed-source-repository"); fs.mkdirSync(path.join(sealedRoot, "parent"), { recursive: true }); const sealedFile = path.join(sealedRoot, "parent/source.txt"); fs.writeFileSync(sealedFile, "trusted"); const sealedHash = createHash("sha256").update("trusted").digest("hex");
  let substitutionCode; const originalTimes = fs.statSync(sealedFile);
  try { contract.readSealedSource({ root: sealedRoot, repositoryPath: "parent/source.txt", expectedSha256: sealedHash, afterOpen: () => { fs.writeFileSync(sealedFile, "hostile"); fs.utimesSync(sealedFile, originalTimes.atime, originalTimes.mtime); } }); } catch (error) { substitutionCode = error.code; }
  rows.push({ name: "sealed_same_size_same_mtime_substitution", expected: "lifecycle_source_content_mismatch", actual: substitutionCode, ok: substitutionCode === "lifecycle_source_content_mismatch" });
  fs.writeFileSync(sealedFile, "trusted");
  const sealedAba = contract.readSealedSource({ root: sealedRoot, repositoryPath: "parent/source.txt", expectedSha256: sealedHash, afterOpen: () => { const parent = path.dirname(sealedFile); fs.renameSync(parent, `${parent}.swap`); fs.mkdirSync(parent); fs.writeFileSync(sealedFile, "hostile"); fs.rmSync(parent, { recursive: true }); fs.renameSync(`${parent}.swap`, parent); } });
  rows.push({ name: "sealed_parent_aba_zero_false_content", expected: "trusted", actual: sealedAba.bytes.toString("utf8"), ok: sealedAba.bytes.toString("utf8") === "trusted" });
  const sealedLinkRoot = path.join(tempRoot, "sealed-link-repository"); fs.mkdirSync(sealedLinkRoot); fs.symlinkSync(sealedFile, path.join(sealedLinkRoot, "source.txt")); let sealedLinkCode;
  try { contract.readSealedSource({ root: sealedLinkRoot, repositoryPath: "source.txt", expectedSha256: sealedHash }); } catch (error) { sealedLinkCode = error.code; }
  rows.push({ name: "sealed_source_symlink_rejected", expected: "lifecycle_path_symlink", actual: sealedLinkCode, ok: sealedLinkCode === "lifecycle_path_symlink" });

  const localeProgram = `import {compareUtf8} from ${JSON.stringify(new URL("./validate-lifecycle-disposition.mjs", import.meta.url).href)}; console.log(JSON.stringify(["中","é","e\\u0301","あ"].sort(compareUtf8)))`;
  const localeOutputs = ["C", "en_US.UTF-8", "zh_CN.UTF-8"].map((locale) => spawnSync(process.execPath, ["--input-type=module", "-e", localeProgram], { encoding: "utf8", env: { ...process.env, LANG: locale, LC_ALL: locale } }).stdout.trim());
  rows.push({ name: "locale_cjk_normalization_order_stable", expected: localeOutputs[0], actual: localeOutputs, ok: localeOutputs.every((output) => output === localeOutputs[0]) });

  const sentinelRecord = JSON.parse(fs.readFileSync(path.join(canonicalRoot, "lifecycle-sentinel-calibration.json"), "utf8"));
  const pageRecord = JSON.parse(fs.readFileSync(path.join(canonicalRoot, "lifecycle-page-evidence-adoption.json"), "utf8"));
  const pageExports = ["retirePageEvidenceWorkflow", "validatePageEvidenceAdopterReceipt", "validatePageEvidenceArchive", "validatePageEvidenceRetirementBundle"];
  rows.push({
    name: "page_evidence_retirement_contract_exports",
    expected: pageExports,
    actual: pageExports.filter((name) => typeof contract[name] === "function"),
    ok: pageExports.every((name) => typeof contract[name] === "function"),
  });
  const chronology = { consumerCommittedAt: "2028-02-29T21:59:59.999999999Z", sessionStartedAt: "2028-02-29T23:59:59.999999999+02:00", captureRecordedAt: "2028-02-29T21:59:59.999999999Z", sessionCompletedAt: "2028-02-29T21:59:59.999999999Z", validatedAt: "2028-02-29T21:59:59.999999999Z", recordedAt: "2028-02-29T21:59:59.999999999Z", asOf: "2028-02-29T21:59:59.999999999Z" };
  rows.push({ name: "page_evidence_chronology_equal_timezone_leap_accepted", expected: undefined, actual: contract.pageEvidenceChronologyCode(chronology), ok: contract.pageEvidenceChronologyCode(chronology) === undefined });
  for (const [name, field, value] of [
    ["consumer_commit_future", "consumerCommittedAt", "2028-02-29T22:00:00Z"],
    ["session_before_commit", "sessionStartedAt", "2028-02-29T21:59:59.999999998Z"],
    ["capture_before_session", "captureRecordedAt", "2028-02-29T21:59:59.999999998Z"],
    ["completion_before_capture", "sessionCompletedAt", "2028-02-29T21:59:59.999999998Z"],
    ["validation_before_completion", "validatedAt", "2028-02-29T21:59:59.999999998Z"],
    ["record_before_validation", "recordedAt", "2028-02-29T21:59:59.999999998Z"],
    ["record_future_from_asof", "asOf", "2028-02-29T21:59:59.999999998Z"],
    ["invalid_non_leap_date", "asOf", "2027-02-29T21:59:59Z"],
  ]) {
    const actual = contract.pageEvidenceChronologyCode({ ...chronology, [field]: value });
    rows.push({ name: `page_evidence_chronology_${name}_rejected`, expected: "page_evidence_adopter_chronology_invalid", actual, ok: actual === "page_evidence_adopter_chronology_invalid" });
  }
  rows.push({
    name: "page_evidence_record_has_closed_retirement_contract",
    expected: "workflow, source/session/finalization, state-w1024-focus, archive, and empty adopter trust",
    actual: pageRecord.retirement,
    ok: pageRecord.retirement?.schema_version === "1.0"
      && pageRecord.retirement?.workflow?.job_id === "consumer-page-evidence"
      && pageRecord.retirement?.workflow?.scenario_id === "state-w1024-focus"
      && Array.isArray(pageRecord.retirement?.protected_paths)
      && pageRecord.retirement?.adoption?.authorized_receipt_commits?.length === 0,
  });
  const sentinelExports = ["retireSentinelWorkflow", "sentinelRawEvidenceDigest", "validateSentinelArchive", "validateSentinelRetirementBundle"];
  rows.push({
    name: "sentinel_retirement_contract_exports",
    expected: sentinelExports,
    actual: sentinelExports.filter((name) => typeof contract[name] === "function"),
    ok: sentinelExports.every((name) => typeof contract[name] === "function"),
  });
  rows.push({
    name: "sentinel_record_has_closed_retirement_contract",
    expected: "source-bound workflow, evidence, controls, sentinels, approval, and archive retrieval closure",
    actual: sentinelRecord.retirement,
    ok: sentinelRecord.retirement?.schema_version === "1.0"
      && sentinelRecord.retirement?.workflow?.job_id === "chromium-calibration"
      && sentinelRecord.retirement?.raw_evidence?.required_runs === 20
      && sentinelRecord.retirement?.archive_retrieval?.verify_command?.includes("--sentinel-archive-repository")
      && sentinelRecord.retirement?.archive_retrieval?.artifact_status === "expired_upstream"
      && sentinelRecord.retirement?.archive_retrieval?.archive_status === "recovered_immutable_local"
      && sentinelRecord.retirement?.archive_retrieval?.recovery_receipt_sha256 === "ae5e576d708fcb51e474de7485454717d13c89f163f41f96bf7435facb8113e3"
      && sentinelRecord.retirement?.archive_retrieval?.immutable_archive_commit === "5b5a5b6656c32b73411e902c760bbbea9e669126"
      && sentinelRecord.retirement?.archive_retrieval?.immutable_archive_tree === "5c3a67f88ac3a51537c137e58a04cc7bfa752621"
      && Array.isArray(sentinelRecord.retirement?.protected_paths),
  });

  if (sentinelExports.every((name) => typeof contract[name] === "function") && sentinelRecord.retirement) {
    const gitText = (root, args) => spawnSync("git", ["-C", root, ...args], { encoding: "utf8" }).stdout.trim();
    const commitEnv = {
      ...process.env,
      GIT_AUTHOR_NAME: "fixture", GIT_AUTHOR_EMAIL: "fixture@example.invalid",
      GIT_COMMITTER_NAME: "fixture", GIT_COMMITTER_EMAIL: "fixture@example.invalid",
      GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z", GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z",
    };
    const workflowPath = sentinelRecord.retirement.workflow.path;
    function makeSentinelBundle(name, { approval = false, approvalMutation, mutate, retire = false } = {}) {
      const root = path.join(tempRoot, `sentinel-${name}`);
      fs.mkdirSync(root, { recursive: true });
      const closure = [workflowPath, ...sentinelRecord.retirement.protected_paths.map(({ path: relative }) => relative)];
      for (const relative of closure) {
        const target = path.join(root, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(path.join(repositoryRoot, relative), target);
      }
      let receiptPath;
      if (approval) {
        receiptPath = "consumer-reference/policies/synthetic-sentinel-owner-approval.json";
        const receipt = {
          schema_version: "1.0", receipt_kind: "sentinel-calibration-retention", owner_ref: sentinelRecord.owner_ref,
          family: sentinelRecord.family, decision: "approved", issued_at: "2026-08-01T00:00:00Z",
          lifecycle_record_sha256: createHash("sha256").update(`${JSON.stringify(sentinelRecord, null, 2)}\n`).digest("hex"),
          workflow_sha256: sentinelRecord.retirement.workflow.active_sha256,
          baseline_manifest_sha256: sentinelRecord.retirement.baseline_manifest.sha256,
          raw_evidence_sha256: sentinelRecord.retirement.raw_evidence.sha256,
        };
        approvalMutation?.(receipt);
        const target = path.join(root, receiptPath); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, `${JSON.stringify(receipt, null, 2)}\n`);
      }
      spawnSync("git", ["init", "-q"], { cwd: root }); spawnSync("git", ["add", "--", "."], { cwd: root });
      spawnSync("git", ["commit", "-q", "-m", "sentinel base"], { cwd: root, env: commitEnv });
      const baseCommit = gitText(root, ["rev-parse", "HEAD"]); const baseTree = gitText(root, ["rev-parse", "HEAD^{tree}"]);
      if (retire) fs.writeFileSync(path.join(root, workflowPath), contract.retireSentinelWorkflow(fs.readFileSync(path.join(root, workflowPath))));
      mutate?.({ root, workflow: path.join(root, workflowPath) });
      if (gitText(root, ["status", "--porcelain"])) {
        spawnSync("git", ["add", "--all"], { cwd: root });
        spawnSync("git", ["commit", "-q", "-m", "sentinel candidate"], { cwd: root, env: { ...commitEnv, GIT_AUTHOR_DATE: "2026-01-02T00:00:00Z", GIT_COMMITTER_DATE: "2026-01-02T00:00:00Z" } });
      }
      const candidateCommit = gitText(root, ["rev-parse", "HEAD"]); const candidateTree = gitText(root, ["rev-parse", "HEAD^{tree}"]);
      const approvalRef = approval ? {
        commit: baseCommit, path: receiptPath, blob_oid: gitText(root, ["rev-parse", `${baseCommit}:${receiptPath}`]),
        sha256: createHash("sha256").update(fs.readFileSync(path.join(root, receiptPath))).digest("hex"),
      } : null;
      return {
        root,
        bundle: {
          schema_version: "1.0", family: "sentinel-calibration", evaluated_at: "2026-08-01T00:00:00Z",
          lifecycle_record_sha256: createHash("sha256").update(`${JSON.stringify(sentinelRecord, null, 2)}\n`).digest("hex"),
          baseline_manifest_sha256: sentinelRecord.retirement.baseline_manifest.sha256,
          workflow_active_sha256: sentinelRecord.retirement.workflow.active_sha256,
          raw_evidence_sha256: sentinelRecord.retirement.raw_evidence.raw_evidence_sha256,
          base_commit: baseCommit, base_tree: baseTree, candidate_commit: candidateCommit, candidate_tree: candidateTree, approval_receipt: approvalRef,
        },
      };
    }
    function sentinelCase(name, fixture, asOf, expected, setBundleClock = true) {
      if (setBundleClock) fixture.bundle.evaluated_at = asOf;
      const result = contract.validateSentinelRetirementBundle({ asOf, bundle: fixture.bundle, root: fixture.root });
      const codes = result.failures.map(({ code }) => code);
      rows.push({ name, expected, actual: codes, ok: expected === "ok:true" ? result.ok : !result.ok && codes.includes(expected) });
    }
    const active = makeSentinelBundle("active");
    sentinelCase("sentinel_pre_due_active", active, "2026-08-01T00:00:00Z", "ok:true");
    sentinelCase("sentinel_one_nanosecond_before_due_active", active, "2026-09-28T08:52:28.999999999Z", "ok:true");
    sentinelCase("sentinel_due_equality_active_rejected", active, sentinelRecord.due_at, "sentinel_retirement_bundle_required");
    sentinelCase("sentinel_expired_unapproved_requires_atomic_removal", active, "2026-09-28T08:52:30Z", "sentinel_retirement_bundle_required");
    sentinelCase("sentinel_pre_due_removal_rejected", makeSentinelBundle("pre-due-retired", { retire: true }), "2026-08-01T00:00:00Z", "sentinel_retirement_before_expiry");
    sentinelCase("sentinel_one_nanosecond_before_due_removal_rejected", makeSentinelBundle("nanosecond-before-retired", { retire: true }), "2026-09-28T08:52:28.999999999Z", "sentinel_retirement_before_expiry");
    sentinelCase("sentinel_due_equality_atomic_removal", makeSentinelBundle("due-retired", { retire: true }), sentinelRecord.due_at, "ok:true");
    sentinelCase("sentinel_one_nanosecond_after_due_atomic_removal", makeSentinelBundle("nanosecond-after-retired", { retire: true }), "2026-09-28T08:52:29.000000001Z", "ok:true");
    sentinelCase("sentinel_timezone_normalized_due_equality", makeSentinelBundle("timezone-due-retired", { retire: true }), "2026-09-28T10:52:29+02:00", "ok:true");
    sentinelCase("sentinel_expired_unapproved_atomic_removal", makeSentinelBundle("expired-retired", { retire: true }), "2026-09-28T08:52:30Z", "ok:true");
    const approvedActive = makeSentinelBundle("approved-active", { approval: true });
    sentinelCase("sentinel_self_authored_approval_rejected", approvedActive, "2026-09-28T08:52:30Z", "sentinel_approval_commit_untrusted");
    const approvedRetired = makeSentinelBundle("approved-retired", { approval: true, retire: true });
    sentinelCase("sentinel_self_authorized_retirement_rejected", approvedRetired, "2026-09-28T08:52:30Z", "sentinel_approval_commit_untrusted");
    const injected = contract.validateSentinelRetirementBundle({ asOf: "2026-08-01T00:00:00Z", bundle: approvedActive.bundle, root: approvedActive.root, authorizedApprovalCommits: [approvedActive.bundle.approval_receipt.commit] });
    rows.push({ name: "sentinel_approval_option_injection_rejected", expected: "sentinel_api_options_invalid", actual: injected.failures.map(({ code }) => code), ok: !injected.ok && injected.failures.some(({ code }) => code === "sentinel_api_options_invalid") });
    let getterInvoked = false;
    const getterOptions = Object.create(Object.prototype, { asOf: { enumerable: true, get() { getterInvoked = true; throw new Error("host path /tmp/getter-secret"); } }, bundle: { enumerable: true, value: active.bundle }, root: { enumerable: true, value: active.root } });
    const getterResult = contract.validateSentinelRetirementBundle(getterOptions);
    rows.push({ name: "sentinel_approval_getter_options_rejected_without_evaluation", expected: "sentinel_api_options_invalid", actual: { codes: getterResult.failures.map(({ code }) => code), getterInvoked }, ok: !getterInvoked && getterResult.failures.some(({ code }) => code === "sentinel_api_options_invalid") });
    const proxyResult = contract.validateSentinelRetirementBundle(new Proxy({}, { ownKeys() { throw new Error("/Users/attacker/proxy-secret"); } }));
    rows.push({ name: "sentinel_proxy_options_rejected_without_leak", expected: "sentinel_api_options_invalid", actual: proxyResult, ok: !proxyResult.ok && proxyResult.failures.some(({ code, message, path: failurePath }) => code === "sentinel_api_options_invalid" && !`${message}${failurePath}`.includes("attacker")) });
    async function configuredValidator(approvalCommit, name) {
      const root = path.join(tempRoot, `sentinel-config-${name}`);
      for (const relative of [
        "scripts/validate-lifecycle-disposition.mjs", "scripts/json-schema-formats.mjs", "scripts/strict-json.mjs",
        "scripts/calibration-raw-contract.mjs", "scripts/baseline-contract.mjs",
        "consumer-reference/policies/lifecycle-sentinel-calibration.json",
      ]) {
        const target = path.join(root, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(repositoryRoot, relative), target);
      }
      const sourcePath = path.join(root, "scripts/validate-lifecycle-disposition.mjs");
      fs.writeFileSync(sourcePath, fs.readFileSync(sourcePath, "utf8").replace("const AUTHORIZED_APPROVAL_COMMITS = Object.freeze([]);", `const AUTHORIZED_APPROVAL_COMMITS = Object.freeze([${JSON.stringify(approvalCommit)}]);`));
      spawnSync("git", ["init", "-q"], { cwd: root }); spawnSync("git", ["add", "."], { cwd: root }); spawnSync("git", ["commit", "-q", "-m", "immutable owner trust configuration"], { cwd: root, env: commitEnv });
      const configuredCommit = gitText(root, ["rev-parse", "HEAD"]); const configuredBlob = gitText(root, ["rev-parse", "HEAD:scripts/validate-lifecycle-disposition.mjs"]);
      const module = await import(`${pathToFileURL(sourcePath).href}?configured=${name}`);
      return { configuredBlob, configuredCommit, module, root, sourceHash: gitText(root, ["hash-object", "scripts/validate-lifecycle-disposition.mjs"]) };
    }
    const configured = await configuredValidator(approvedActive.bundle.approval_receipt.commit, "approved-active");
    approvedActive.bundle.evaluated_at = "2026-08-01T00:00:00Z";
    const configuredPreDue = configured.module.validateSentinelRetirementBundle({ asOf: "2026-08-01T00:00:00Z", bundle: approvedActive.bundle, root: approvedActive.root });
    approvedActive.bundle.evaluated_at = "2026-09-28T08:52:30Z";
    const configuredAfterDue = configured.module.validateSentinelRetirementBundle({ asOf: approvedActive.bundle.evaluated_at, bundle: approvedActive.bundle, root: approvedActive.root });
    rows.push({ name: "sentinel_immutable_preconfigured_owner_trust_keeps_active", expected: "two approved active states", actual: { pre: configuredPreDue.failures, after: configuredAfterDue.failures, configCommit: configured.configuredCommit }, ok: configuredPreDue.ok && configuredAfterDue.ok && configured.configuredBlob === configured.sourceHash });
    const crossFamilyApproval = makeSentinelBundle("cross-family-approval", { approval: true, approvalMutation: (receipt) => { receipt.family = "page-evidence-adoption"; } });
    const crossConfigured = await configuredValidator(crossFamilyApproval.bundle.approval_receipt.commit, "cross-family");
    const crossResult = crossConfigured.module.validateSentinelRetirementBundle({ asOf: "2026-08-01T00:00:00Z", bundle: crossFamilyApproval.bundle, root: crossFamilyApproval.root });
    rows.push({ name: "sentinel_allowlisted_cross_family_receipt_rejected", expected: "sentinel_approval_binding_invalid", actual: crossResult.failures, ok: crossResult.failures.some(({ code }) => code === "sentinel_approval_binding_invalid") });
    const stagedPath = "consumer-reference/policies/staged-owner-approval.json"; const stagedTarget = path.join(approvedActive.root, stagedPath); fs.writeFileSync(stagedTarget, "{}\n"); spawnSync("git", ["add", stagedPath], { cwd: approvedActive.root });
    const stagedBundle = structuredClone(approvedActive.bundle); stagedBundle.approval_receipt = { commit: approvedActive.bundle.approval_receipt.commit, path: stagedPath, blob_oid: gitText(approvedActive.root, ["rev-parse", `:${stagedPath}`]), sha256: createHash("sha256").update("{}\n").digest("hex") };
    const stagedResult = configured.module.validateSentinelRetirementBundle({ asOf: stagedBundle.evaluated_at, bundle: stagedBundle, root: approvedActive.root });
    rows.push({ name: "sentinel_staged_allowlisted_receipt_rejected", expected: "sentinel_approval_invalid", actual: stagedResult.failures, ok: stagedResult.failures.some(({ code }) => code === "sentinel_approval_invalid") });
    const foreignBundle = structuredClone(active.bundle); foreignBundle.approval_receipt = approvedActive.bundle.approval_receipt;
    const foreignResult = configured.module.validateSentinelRetirementBundle({ asOf: foreignBundle.evaluated_at, bundle: foreignBundle, root: active.root });
    rows.push({ name: "sentinel_foreign_repository_receipt_rejected", expected: "sentinel_approval_invalid", actual: foreignResult.failures, ok: foreignResult.failures.some(({ code }) => code === "sentinel_approval_invalid") });
    sentinelCase("sentinel_clock_rollback_rejected", active, "2026-07-30T08:52:28Z", "sentinel_clock_rollback");
    const wrongClock = structuredClone(active); wrongClock.bundle = structuredClone(active.bundle); wrongClock.bundle.evaluated_at = "2026-08-02T00:00:00Z";
    sentinelCase("sentinel_bundle_clock_mismatch", wrongClock, "2026-08-01T00:00:00Z", "sentinel_clock_mismatch", false);
    for (const [name, mutate, code] of [
      ["parser_deleted", ({ root }) => fs.rmSync(path.join(root, "scripts/calibration-raw-contract.mjs")), "sentinel_bundle_diff_invalid"],
      ["raw_validator_deleted", ({ root }) => fs.rmSync(path.join(root, "scripts/test-calibration-raw-contract.mjs")), "sentinel_bundle_diff_invalid"],
      ["historical_evidence_deleted", ({ root }) => fs.rmSync(path.join(root, "consumer-reference/baselines/calibration.json")), "sentinel_bundle_diff_invalid"],
      ["mutation_control_deleted", ({ root }) => fs.rmSync(path.join(root, "scripts/test-summarize-sentinel-calibration.mjs")), "sentinel_bundle_diff_invalid"],
      ["semantic_sentinel_deleted", ({ root }) => fs.rmSync(path.join(root, "tests/consumer-reference-sentinels.spec.mjs")), "sentinel_bundle_diff_invalid"],
      ["extra_path_added", ({ root }) => fs.writeFileSync(path.join(root, "extra.txt"), "extra\n"), "sentinel_bundle_diff_invalid"],
      ["workflow_comment_trick", ({ workflow }) => fs.appendFileSync(workflow, "# chromium-calibration retained\n"), "sentinel_workflow_content_mismatch"],
      ["workflow_duplicate_job_trick", ({ workflow }) => fs.appendFileSync(workflow, "  chromium-calibration-copy: *chromium-calibration\n"), "sentinel_workflow_content_mismatch"],
      ["workflow_mode_substitution", ({ workflow }) => fs.chmodSync(workflow, 0o755), "sentinel_bundle_diff_invalid"],
      ["workflow_symlink_substitution", ({ workflow }) => { fs.rmSync(workflow); fs.symlinkSync("../../README.md", workflow); }, "sentinel_bundle_diff_invalid"],
    ]) sentinelCase(`sentinel_${name}`, makeSentinelBundle(name, { mutate, retire: !name.startsWith("workflow_") }), "2026-09-28T08:52:30Z", code);
    const wrongTree = makeSentinelBundle("wrong-tree", { retire: true }); wrongTree.bundle.candidate_tree = "f".repeat(40);
    sentinelCase("sentinel_tree_substitution", wrongTree, "2026-09-28T08:52:30Z", "sentinel_candidate_tree_mismatch");
    const wrongRecord = makeSentinelBundle("wrong-record"); wrongRecord.bundle.lifecycle_record_sha256 = "f".repeat(64);
    sentinelCase("sentinel_wrong_record_binding", wrongRecord, "2026-08-01T00:00:00Z", "sentinel_bundle_binding_invalid");
    const wrongFamily = makeSentinelBundle("wrong-family"); wrongFamily.bundle.family = "page-evidence-adoption";
    sentinelCase("sentinel_cross_family_bundle_replay", wrongFamily, "2026-08-01T00:00:00Z", "sentinel_bundle_binding_invalid");
    const wrongBaseline = makeSentinelBundle("wrong-baseline"); wrongBaseline.bundle.baseline_manifest_sha256 = "f".repeat(64);
    sentinelCase("sentinel_wrong_baseline_binding", wrongBaseline, "2026-08-01T00:00:00Z", "sentinel_bundle_binding_invalid");
    const wrongWorkflow = makeSentinelBundle("wrong-workflow-binding"); wrongWorkflow.bundle.workflow_active_sha256 = "f".repeat(64);
    sentinelCase("sentinel_wrong_workflow_binding", wrongWorkflow, "2026-08-01T00:00:00Z", "sentinel_bundle_binding_invalid");
    const wrongRaw = makeSentinelBundle("wrong-raw-binding"); wrongRaw.bundle.raw_evidence_sha256 = "f".repeat(64);
    sentinelCase("sentinel_wrong_raw_evidence_binding", wrongRaw, "2026-08-01T00:00:00Z", "sentinel_bundle_binding_invalid");
    const missingBundleField = makeSentinelBundle("missing-field"); delete missingBundleField.bundle.base_tree;
    sentinelCase("sentinel_missing_bundle_field", missingBundleField, "2026-08-01T00:00:00Z", "sentinel_bundle_binding_invalid");
    const extraBundleField = makeSentinelBundle("extra-field"); extraBundleField.bundle.extra = true;
    sentinelCase("sentinel_extra_bundle_field", extraBundleField, "2026-08-01T00:00:00Z", "sentinel_bundle_binding_invalid");

    const archiveRoot = createCalibrationBase(path.join(tempRoot, "sentinel-archive"), repositoryRoot);
    spawnSync("git", ["init", "-q"], { cwd: archiveRoot }); spawnSync("git", ["add", "--", "."], { cwd: archiveRoot });
    spawnSync("git", ["commit", "-q", "-m", "immutable synthetic archive"], { cwd: archiveRoot, env: commitEnv });
    const archiveCommit = gitText(archiveRoot, ["rev-parse", "HEAD"]); const archiveTree = gitText(archiveRoot, ["rev-parse", "HEAD^{tree}"]);
    const archiveOptions = { root: archiveRoot, commit: archiveCommit, tree: archiveTree };
    const archiveDigest = contract.sentinelRawEvidenceDigest(archiveOptions);
    const syntheticArchive = contract.validateSentinelArchive(archiveOptions);
    rows.push({ name: "sentinel_archive_immutable_tree_parses_20_runs_pending_exact_recovery", expected: "sentinel_archive_raw_digest_mismatch", actual: syntheticArchive, ok: !syntheticArchive.ok && syntheticArchive.runs === 20 && syntheticArchive.computedRawDigest === archiveDigest && syntheticArchive.failures.some(({ code }) => code === "sentinel_archive_raw_digest_mismatch") });
    const originalRun = path.join(archiveRoot, "run-01"); fs.renameSync(originalRun, `${originalRun}.swap`); fs.cpSync(path.join(archiveRoot, "run-02"), originalRun, { recursive: true }); fs.rmSync(originalRun, { recursive: true }); fs.renameSync(`${originalRun}.swap`, originalRun);
    const runAba = contract.validateSentinelArchive(archiveOptions);
    rows.push({ name: "sentinel_archive_run_directory_swap_restore_aba_uses_immutable_tree", expected: archiveDigest, actual: runAba.computedRawDigest, ok: runAba.computedRawDigest === archiveDigest && runAba.runs === 20 });
    const archiveParent = path.dirname(archiveRoot); const archiveName = path.basename(archiveRoot); fs.renameSync(archiveRoot, `${archiveRoot}.swap`); fs.mkdirSync(archiveRoot); fs.renameSync(archiveRoot, path.join(archiveParent, `${archiveName}.attacker`)); fs.renameSync(`${archiveRoot}.swap`, archiveRoot); fs.rmSync(path.join(archiveParent, `${archiveName}.attacker`), { recursive: true });
    const parentAba = contract.validateSentinelArchive(archiveOptions);
    rows.push({ name: "sentinel_archive_parent_swap_restore_aba_uses_immutable_tree", expected: archiveDigest, actual: parentAba.computedRawDigest, ok: parentAba.computedRawDigest === archiveDigest && parentAba.runs === 20 });
    const sameSizeFile = path.join(archiveRoot, "run-01/actual.png"); const sameSizeStat = fs.statSync(sameSizeFile); const sameSizeBytes = fs.readFileSync(sameSizeFile); fs.writeFileSync(sameSizeFile, Buffer.alloc(sameSizeBytes.length, 0x41)); fs.utimesSync(sameSizeFile, sameSizeStat.atime, sameSizeStat.mtime);
    const sameSize = contract.validateSentinelArchive(archiveOptions); fs.writeFileSync(sameSizeFile, sameSizeBytes);
    rows.push({ name: "sentinel_archive_same_size_mtime_worktree_substitution_ignored", expected: archiveDigest, actual: sameSize.computedRawDigest, ok: sameSize.computedRawDigest === archiveDigest && sameSize.runs === 20 });
    fs.appendFileSync(sameSizeFile, "corrupt"); spawnSync("git", ["add", "--", "run-01/actual.png"], { cwd: archiveRoot }); spawnSync("git", ["commit", "-q", "-m", "corrupt blob"], { cwd: archiveRoot, env: { ...commitEnv, GIT_AUTHOR_DATE: "2026-01-03T00:00:00Z", GIT_COMMITTER_DATE: "2026-01-03T00:00:00Z" } });
    const corruptCommit = gitText(archiveRoot, ["rev-parse", "HEAD"]); const corruptTree = gitText(archiveRoot, ["rev-parse", "HEAD^{tree}"]); const corruptArchive = contract.validateSentinelArchive({ root: archiveRoot, commit: corruptCommit, tree: corruptTree });
    rows.push({ name: "sentinel_archive_blob_substitution_rejected", expected: "calibration_artifact_hash_mismatch", actual: corruptArchive.failures.map(({ code }) => code), ok: corruptArchive.failures.some(({ code }) => code === "calibration_artifact_hash_mismatch") });
    spawnSync("git", ["reset", "--hard", "-q", archiveCommit], { cwd: archiveRoot }); fs.chmodSync(path.join(archiveRoot, "run-01/metadata.json"), 0o755); spawnSync("git", ["add", "run-01/metadata.json"], { cwd: archiveRoot }); spawnSync("git", ["commit", "-q", "-m", "mode substitution"], { cwd: archiveRoot, env: { ...commitEnv, GIT_AUTHOR_DATE: "2026-01-04T00:00:00Z", GIT_COMMITTER_DATE: "2026-01-04T00:00:00Z" } });
    const modeResult = contract.validateSentinelArchive({ root: archiveRoot, commit: gitText(archiveRoot, ["rev-parse", "HEAD"]), tree: gitText(archiveRoot, ["rev-parse", "HEAD^{tree}"]) });
    rows.push({ name: "sentinel_archive_mode_substitution_rejected", expected: "sentinel_archive_mode_invalid", actual: modeResult.failures, ok: modeResult.failures.some(({ code }) => code === "sentinel_archive_mode_invalid") });
    spawnSync("git", ["reset", "--hard", "-q", archiveCommit], { cwd: archiveRoot }); const linkedArchiveFile = path.join(archiveRoot, "run-01/metadata.json"); fs.rmSync(linkedArchiveFile); fs.symlinkSync("../run-02/metadata.json", linkedArchiveFile); spawnSync("git", ["add", "run-01/metadata.json"], { cwd: archiveRoot }); spawnSync("git", ["commit", "-q", "-m", "symlink substitution"], { cwd: archiveRoot, env: { ...commitEnv, GIT_AUTHOR_DATE: "2026-01-05T00:00:00Z", GIT_COMMITTER_DATE: "2026-01-05T00:00:00Z" } });
    const linkResult = contract.validateSentinelArchive({ root: archiveRoot, commit: gitText(archiveRoot, ["rev-parse", "HEAD"]), tree: gitText(archiveRoot, ["rev-parse", "HEAD^{tree}"]) });
    rows.push({ name: "sentinel_archive_symlink_substitution_rejected", expected: "sentinel_archive_mode_invalid", actual: linkResult.failures, ok: linkResult.failures.some(({ code }) => code === "sentinel_archive_mode_invalid") });
    const wrongArchiveTree = contract.validateSentinelArchive({ root: archiveRoot, commit: archiveCommit, tree: "f".repeat(40) });
    rows.push({ name: "sentinel_archive_tree_substitution_rejected", expected: "sentinel_archive_tree_mismatch", actual: wrongArchiveTree.failures, ok: wrongArchiveTree.failures.some(({ code }) => code === "sentinel_archive_tree_mismatch") });
    const emptyArchive = path.join(tempRoot, "empty-archive"); fs.mkdirSync(emptyArchive); spawnSync("git", ["init", "-q"], { cwd: emptyArchive }); fs.writeFileSync(path.join(emptyArchive, ".keep"), "empty\n"); spawnSync("git", ["add", "."], { cwd: emptyArchive }); spawnSync("git", ["commit", "-q", "-m", "empty"], { cwd: emptyArchive, env: commitEnv });
    const emptyResult = contract.validateSentinelArchive({ root: emptyArchive, commit: gitText(emptyArchive, ["rev-parse", "HEAD"]), tree: gitText(emptyArchive, ["rev-parse", "HEAD^{tree}"]) }); const serializedEmpty = JSON.stringify(emptyResult);
    rows.push({ name: "sentinel_archive_errors_are_stable_and_host_path_free", expected: "no absolute path leakage", actual: emptyResult, ok: !serializedEmpty.includes(tempRoot) && !serializedEmpty.includes(repositoryRoot) && !serializedEmpty.includes(os.homedir()) && !serializedEmpty.includes("/tmp/") && emptyResult.failures.every(({ path: failurePath }) => failurePath === "<sentinel-archive>" || failurePath.startsWith("archive/")) });
  }

  if (pageExports.every((name) => typeof contract[name] === "function") && pageRecord.retirement) {
    const gitText = (root, args) => spawnSync("git", ["-C", root, ...args], { encoding: "utf8" }).stdout.trim();
    const commitEnv = { ...process.env, GIT_AUTHOR_NAME: "fixture", GIT_AUTHOR_EMAIL: "fixture@example.invalid", GIT_COMMITTER_NAME: "fixture", GIT_COMMITTER_EMAIL: "fixture@example.invalid", GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z", GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z" };
    function makePageBundle(name, { mutate, retire = false } = {}) {
      const root = path.join(tempRoot, `page-${name}`); fs.mkdirSync(root, { recursive: true });
      for (const relative of [pageRecord.retirement.workflow.path, ...pageRecord.retirement.protected_paths.map(({ path: relative }) => relative)]) {
        const target = path.join(root, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(repositoryRoot, relative), target);
      }
      spawnSync("git", ["init", "-q"], { cwd: root }); spawnSync("git", ["add", "--", "."], { cwd: root }); spawnSync("git", ["commit", "-q", "-m", "page evidence base"], { cwd: root, env: commitEnv });
      const baseCommit = gitText(root, ["rev-parse", "HEAD"]); const baseTree = gitText(root, ["rev-parse", "HEAD^{tree}"]);
      if (retire) fs.writeFileSync(path.join(root, pageRecord.retirement.workflow.path), contract.retirePageEvidenceWorkflow(fs.readFileSync(path.join(root, pageRecord.retirement.workflow.path))));
      mutate?.({ root, workflow: path.join(root, pageRecord.retirement.workflow.path) });
      if (gitText(root, ["status", "--porcelain"])) { spawnSync("git", ["add", "--all"], { cwd: root }); spawnSync("git", ["commit", "-q", "-m", "page evidence candidate"], { cwd: root, env: { ...commitEnv, GIT_AUTHOR_DATE: "2026-01-02T00:00:00Z", GIT_COMMITTER_DATE: "2026-01-02T00:00:00Z" } }); }
      const candidateCommit = gitText(root, ["rev-parse", "HEAD"]); const candidateTree = gitText(root, ["rev-parse", "HEAD^{tree}"]);
      return { root, bundle: { schema_version: "1.0", family: "page-evidence-adoption", evaluated_at: "2026-08-01T00:00:00Z", lifecycle_record_sha256: createHash("sha256").update(fs.readFileSync(path.join(canonicalRoot, "lifecycle-page-evidence-adoption.json"))).digest("hex"), workflow_active_sha256: pageRecord.retirement.workflow.active_sha256, base_commit: baseCommit, base_tree: baseTree, candidate_commit: candidateCommit, candidate_tree: candidateTree, adopter_receipt: null } };
    }
    function pageCase(name, fixture, asOf, expected) {
      fixture.bundle.evaluated_at = asOf; const result = contract.validatePageEvidenceRetirementBundle({ asOf, bundle: fixture.bundle, root: fixture.root }); const codes = result.failures.map(({ code }) => code);
      rows.push({ name, expected, actual: codes, ok: expected === "ok:true" ? result.ok : !result.ok && codes.includes(expected) });
    }
    const pageActive = makePageBundle("active");
    pageCase("page_evidence_current_synthetic_pre_due_active", pageActive, "2026-08-01T00:00:00Z", "ok:true");
    pageCase("page_evidence_one_nanosecond_before_due_active", pageActive, "2026-10-28T08:52:28.999999999Z", "ok:true");
    pageCase("page_evidence_due_equality_requires_retirement", pageActive, pageRecord.due_at, "page_evidence_retirement_bundle_required");
    pageCase("page_evidence_pre_due_retirement_rejected", makePageBundle("pre-due-retired", { retire: true }), "2026-08-01T00:00:00Z", "page_evidence_retirement_before_due");
    pageCase("page_evidence_due_equality_exact_retirement", makePageBundle("due-retired", { retire: true }), pageRecord.due_at, "ok:true");
    pageCase("page_evidence_expired_no_adopter_exact_retirement", makePageBundle("expired-retired", { retire: true }), "2026-10-28T08:52:29.000000001Z", "ok:true");
    for (const [name, mutate, code] of [
      ["protected_schema_deleted", ({ root }) => fs.rmSync(path.join(root, "consumer-reference/schema/page-evidence-session.schema.json")), "page_evidence_protected_content_mismatch"],
      ["protected_finalizer_deleted", ({ root }) => fs.rmSync(path.join(root, "scripts/finalize-page-evidence.mjs")), "page_evidence_protected_content_mismatch"],
      ["protected_state_contract_deleted", ({ root }) => fs.rmSync(path.join(root, "tests/fixtures/consumer-conformance-scenarios.mjs")), "page_evidence_protected_content_mismatch"],
      ["extra_path", ({ root }) => fs.writeFileSync(path.join(root, "extra.txt"), "extra\n"), "page_evidence_bundle_diff_invalid"],
      ["workflow_duplicate_anchor", ({ workflow }) => fs.appendFileSync(workflow, "  consumer-page-evidence-copy: *consumer-page-evidence\n"), "page_evidence_workflow_content_mismatch"],
      ["workflow_mode", ({ workflow }) => fs.chmodSync(workflow, 0o755), "page_evidence_bundle_diff_invalid"],
      ["workflow_symlink", ({ workflow }) => { fs.rmSync(workflow); fs.symlinkSync("../../README.md", workflow); }, "page_evidence_bundle_diff_invalid"],
    ]) pageCase(`page_evidence_${name}`, makePageBundle(name, { mutate, retire: name.startsWith("protected_") || name === "extra_path" }), "2026-10-28T08:52:30Z", code);
    const injected = contract.validatePageEvidenceRetirementBundle({ asOf: "2026-08-01T00:00:00Z", bundle: pageActive.bundle, root: pageActive.root, trustRoots: [] });
    rows.push({ name: "page_evidence_caller_trust_injection_rejected", expected: "page_evidence_api_options_invalid", actual: injected.failures, ok: injected.failures.some(({ code }) => code === "page_evidence_api_options_invalid") });
    const forged = structuredClone(pageActive); forged.bundle = structuredClone(pageActive.bundle); forged.bundle.adopter_receipt = { commit: "a".repeat(40), path: "adoption/receipt.json", blob_oid: "b".repeat(40), sha256: "c".repeat(64) };
    pageCase("page_evidence_forged_adopter_rejected", forged, "2026-08-01T00:00:00Z", "page_evidence_adopter_commit_untrusted");

    const archiveConfig = pageRecord.retirement.archive_retrieval;
    const archiveGit = path.resolve(repositoryRoot, archiveConfig.evidence_root, "immutable-page-evidence.git");
    if (!fs.existsSync(archiveGit)) {
      const unavailableArchive = contract.validatePageEvidenceArchive({ root: archiveGit, commit: archiveConfig.immutable_archive_commit, tree: archiveConfig.immutable_archive_tree });
      const serializedUnavailable = JSON.stringify(unavailableArchive);
      rows.push({
        name: "page_evidence_archive_unavailable_fails_closed",
        expected: "page_evidence_archive_invalid",
        actual: unavailableArchive.failures,
        ok: !unavailableArchive.ok
          && unavailableArchive.failures.some(({ code }) => code === "page_evidence_archive_invalid")
          && !serializedUnavailable.includes(tempRoot)
          && !serializedUnavailable.includes(repositoryRoot)
          && !serializedUnavailable.includes(os.homedir()),
      });
    } else {
      const pageArchive = contract.validatePageEvidenceArchive({ root: archiveGit, commit: archiveConfig.immutable_archive_commit, tree: archiveConfig.immutable_archive_tree });
      rows.push({ name: "page_evidence_archive_exact_semantic_closure_valid", expected: "ok:true", actual: pageArchive, ok: pageArchive.ok && pageArchive.pathCount === archiveConfig.artifact_files });
      const wrongPageArchiveTree = contract.validatePageEvidenceArchive({ root: archiveGit, commit: archiveConfig.immutable_archive_commit, tree: "f".repeat(40) });
      rows.push({ name: "page_evidence_archive_tree_substitution_rejected", expected: "page_evidence_archive_tree_mismatch", actual: wrongPageArchiveTree.failures, ok: wrongPageArchiveTree.failures.some(({ code }) => code === "page_evidence_archive_tree_mismatch") });
      function mutatedPageArchive(name, mutate) {
        const root = path.join(tempRoot, `page-archive-${name}`);
        fs.mkdirSync(root);
        for (const [command, args] of [
          ["init", ["init", "-q"]],
          ["fetch", ["fetch", "-q", archiveGit, archiveConfig.immutable_archive_commit]],
          ["checkout", ["checkout", "-q", "--detach", "FETCH_HEAD"]],
        ]) {
          const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
          assert.equal(result.status, 0, `page archive ${command} failed: ${result.stderr}`);
        }
        mutate(root);
        spawnSync("git", ["add", "--all"], { cwd: root });
        spawnSync("git", ["commit", "-q", "-m", name], { cwd: root, env: commitEnv });
        const commit = gitText(root, ["rev-parse", "HEAD"]);
        return { root, commit, tree: gitText(root, ["rev-parse", "HEAD^{tree}"]) };
      }
      for (const [name, mutate, expected] of [
        ["extra", (root) => fs.writeFileSync(path.join(root, "extra.txt"), "extra\n"), "page_evidence_archive_inventory_invalid"],
        ["omission", (root) => fs.rmSync(path.join(root, "packet/page-evidence-session.json")), "page_evidence_archive_inventory_invalid"],
        ["protected_blob", (root) => fs.appendFileSync(path.join(root, "scripts/validate-page-evidence.mjs"), "// drift\n"), "page_evidence_archive_protected_mismatch"],
        ["packet_swap", (root) => { const a = path.join(root, "packet/page-evidence-session.json"), b = path.join(root, "packet/runner/responsive-layout.json"), bytes = fs.readFileSync(a); fs.writeFileSync(a, fs.readFileSync(b)); fs.writeFileSync(b, bytes); }, "page_evidence_archive_source_invalid"],
        ["hash_correct_semantically_invalid", (root) => { const file = path.join(root, "packet/page-evidence-manifest.json"), value = JSON.parse(fs.readFileSync(file)); value.untrusted = true; fs.writeFileSync(file, `${JSON.stringify(value)}\n`); }, "page_evidence_archive_packet_mismatch"],
        ["source_commit_swap", (root) => fs.writeFileSync(path.join(root, "provenance/source-commit.txt"), "tree " + "f".repeat(40) + "\n"), "page_evidence_archive_source_invalid"],
        ["mode", (root) => fs.chmodSync(path.join(root, "packet/page-evidence-session.json"), 0o755), "page_evidence_archive_mode_invalid"],
        ["symlink", (root) => { const file = path.join(root, "packet/page-evidence-session.json"); fs.rmSync(file); fs.symlinkSync("page-evidence-manifest.json", file); }, "page_evidence_archive_mode_invalid"],
      ]) {
        const fixtureArchive = mutatedPageArchive(name, mutate); const result = contract.validatePageEvidenceArchive(fixtureArchive); rows.push({ name: `page_evidence_archive_${name}_rejected`, expected, actual: result.failures, ok: !result.ok && result.failures.some(({ code }) => code === expected) });
      }
      const worktreeArchive = mutatedPageArchive("worktree-substitution", () => {}); const manifestFile = path.join(worktreeArchive.root, "packet/page-evidence-manifest.json"); const originalManifest = fs.readFileSync(manifestFile); fs.writeFileSync(manifestFile, "{}\n"); const immutableWorktree = contract.validatePageEvidenceArchive(worktreeArchive); fs.writeFileSync(manifestFile, originalManifest); rows.push({ name: "page_evidence_archive_worktree_substitution_ignored", expected: "ok:true", actual: immutableWorktree.failures, ok: immutableWorktree.ok });
      const serializedArchiveFailure = JSON.stringify(contract.validatePageEvidenceArchive({ root: archiveGit, commit: archiveConfig.immutable_archive_commit, tree: "f".repeat(40) })); rows.push({ name: "page_evidence_archive_errors_host_path_free", expected: "stable host-path-free", actual: serializedArchiveFailure, ok: !serializedArchiveFailure.includes(tempRoot) && !serializedArchiveFailure.includes(repositoryRoot) && !serializedArchiveFailure.includes(os.homedir()) });
    }

    const fixture = initializeConsumer();
    try {
      const consumerCommit = fixture.revision; const consumerTree = gitText(fixture.root, ["rev-parse", `${consumerCommit}^{tree}`]);
      spawnSync("git", ["tag", "stylegallery-adopter-v1", consumerCommit], { cwd: fixture.root });
      const completed = completeSession(fixture, createConformance(fixture));
      assert.equal(completed.validate?.status, 0, JSON.stringify(completed.validate?.report));
      spawnSync("git", ["add", "--", "evidence", "records"], { cwd: fixture.root }); spawnSync("git", ["commit", "-q", "-m", "immutable validated page evidence"], { cwd: fixture.root });
      const evidenceCommit = gitText(fixture.root, ["rev-parse", "HEAD"]); const evidenceTree = gitText(fixture.root, ["rev-parse", "HEAD^{tree}"]);
      const manifest = JSON.parse(fs.readFileSync(path.join(completed.session.artifactRoot, "page-evidence-manifest.json")));
      const packetPath = path.relative(fixture.root, path.join(completed.session.artifactRoot, "page-evidence-manifest.json"));
      const sessionPath = path.relative(fixture.root, path.join(completed.session.artifactRoot, "page-evidence-session.json"));
      const runnerPath = path.relative(fixture.root, completed.runner.runnerFile); const capturePath = path.relative(fixture.root, path.join(completed.session.artifactRoot, completed.runner.artifactReference));
      const conformancePath = path.relative(fixture.root, completed.session.recordFile);
      const binding = (relative) => ({ path: relative, blob_oid: gitText(fixture.root, ["rev-parse", `${evidenceCommit}:${relative}`]), sha256: createHash("sha256").update(fs.readFileSync(path.join(fixture.root, relative))).digest("hex") });
      const evidence = { packet: binding(packetPath), session: binding(sessionPath), runner: binding(runnerPath), capture: binding(capturePath), conformance: binding(conformancePath), source_sha256: manifest.session.source.sha256, session_schema_sha256: pageRecord.retirement.protected_paths.find(({ path }) => path.endsWith("page-evidence-session.schema.json")).sha256, manifest_schema_sha256: pageRecord.retirement.protected_paths.find(({ path }) => path.endsWith("page-evidence-manifest.schema.json")).sha256 };
      const validatedAt = manifest.completed_at; const recordedAt = manifest.completed_at; const adopter = { schema_version: "1.0", receipt_kind: "page-evidence-real-consumer-adoption", family: "page-evidence-adoption", caller_owner: "consumer-platform@example.invalid", consumer: { repository: "example/consumer", commit: consumerCommit, tree: consumerTree }, adapter_version: "1.0", consumed: { stable_refs: ["sg:page/layout"], version_ids: ["sg:page/layout@sha256:" + "1".repeat(64)] }, evidence, validation: { validator_version: "stylegallery-page-evidence/1.0", result: "passed", validated_at: validatedAt }, recorded_at: recordedAt, migration: { contact: "consumer-platform@example.invalid", instructions: "Migrate with the versioned adapter.", target_version: "1.0" } };
      const receiptPath = "adoption/receipt.json"; fs.mkdirSync(path.join(fixture.root, "adoption")); fs.writeFileSync(path.join(fixture.root, receiptPath), `${JSON.stringify(adopter, null, 2)}\n`); spawnSync("git", ["add", receiptPath], { cwd: fixture.root }); spawnSync("git", ["commit", "-q", "-m", "immutable adoption receipt"], { cwd: fixture.root });
      const receiptCommit = gitText(fixture.root, ["rev-parse", "HEAD"]); const receiptTree = gitText(fixture.root, ["rev-parse", "HEAD^{tree}"]); const receiptBlob = gitText(fixture.root, ["rev-parse", `${receiptCommit}:${receiptPath}`]); const receiptSha = createHash("sha256").update(fs.readFileSync(path.join(fixture.root, receiptPath))).digest("hex"); const rootStats = fs.lstatSync(fixture.root);
      const sourceClosure = manifest.session.source.files.map((source) => ({ ...source, commit: consumerCommit, tree: consumerTree, blob: gitText(fixture.root, ["rev-parse", `${consumerCommit}:${source.path}`]) }));
      const trust = { repository_root: fixture.root, repository_root_sha256: createHash("sha256").update(fs.realpathSync(fixture.root)).digest("hex"), repository_root_dev: rootStats.dev, repository_root_ino: rootStats.ino, remote_url: "https://github.com/example/consumer.git", authenticated_ref: "refs/tags/stylegallery-adopter-v1", lineage_root_commit: consumerCommit, receipt_commit: receiptCommit, receipt_tree: receiptTree, receipt_path: receiptPath, receipt_blob: receiptBlob, receipt_sha256: receiptSha, repository: "example/consumer", caller_owner: adopter.caller_owner, consumer_commit: consumerCommit, consumer_tree: consumerTree, evidence_commit: evidenceCommit, evidence_tree: evidenceTree, adapter_version: adopter.adapter_version, consumed: adopter.consumed, evidence: adopter.evidence, validator_version: adopter.validation.validator_version, migration: adopter.migration, source_closure: sourceClosure };
      const configuredRoot = path.join(tempRoot, "page-configured"); for (const relative of ["scripts/validate-lifecycle-disposition.mjs", "scripts/json-schema-formats.mjs", "scripts/strict-json.mjs", "scripts/calibration-raw-contract.mjs", "scripts/baseline-contract.mjs", "scripts/validate-page-evidence.mjs", "scripts/page-evidence-contract.mjs", "scripts/page-artifact-metadata.mjs", "consumer-reference/schema/page-evidence-session.schema.json", "consumer-reference/schema/page-evidence-manifest.schema.json", "consumer-reference/policies/lifecycle-page-evidence-adoption.json"]) { const target = path.join(configuredRoot, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(repositoryRoot, relative), target); }
      const configuredSource = path.join(configuredRoot, "scripts/validate-lifecycle-disposition.mjs"); fs.writeFileSync(configuredSource, fs.readFileSync(configuredSource, "utf8").replace("const PAGE_ADOPTER_TRUST_ROOTS = Object.freeze([]);", `const PAGE_ADOPTER_TRUST_ROOTS = Object.freeze([${JSON.stringify(trust)}]);`));
      const configured = await import(`${pathToFileURL(configuredSource).href}?page-adopter`); const reference = { commit: receiptCommit, path: receiptPath, blob_oid: receiptBlob, sha256: receiptSha };
      const decisionAt = recordedAt; const directAdopter = configured.validatePageEvidenceAdopterReceipt({ asOf: decisionAt, reference }); rows.push({ name: "page_evidence_isolated_real_adopter_valid", expected: "ok:true", actual: directAdopter.failures, ok: directAdopter.ok });
      const beforeInstant = new Date(Date.parse(recordedAt) - 1).toISOString();
      const before = configured.validatePageEvidenceAdopterReceipt({ asOf: beforeInstant, reference }); rows.push({ name: "page_evidence_future_receipt_before_asof_rejected", expected: "page_evidence_adopter_chronology_invalid", actual: before.failures, ok: before.failures.some(({ code }) => code === "page_evidence_adopter_chronology_invalid") });
      const equal = configured.validatePageEvidenceAdopterReceipt({ asOf: decisionAt, reference }); rows.push({ name: "page_evidence_receipt_equal_asof_accepted", expected: "ok:true", actual: equal.failures, ok: equal.ok });
      const after = configured.validatePageEvidenceAdopterReceipt({ asOf: new Date(Date.parse(recordedAt) + 1).toISOString(), reference }); rows.push({ name: "page_evidence_receipt_after_asof_accepted", expected: "ok:true", actual: after.failures, ok: after.ok });
      const timezone = configured.validatePageEvidenceAdopterReceipt({ asOf: new Date(recordedAt).toISOString().replace("Z", "+00:00"), reference }); rows.push({ name: "page_evidence_receipt_timezone_equivalent_accepted", expected: "ok:true", actual: timezone.failures, ok: timezone.ok });
      const leap = configured.validatePageEvidenceAdopterReceipt({ asOf: "2028-02-29T23:59:59.999999999Z", reference }); rows.push({ name: "page_evidence_receipt_leap_instant_accepted", expected: "ok:true", actual: leap.failures, ok: leap.ok });
      const transplant = path.join(tempRoot, "transplanted-adopter"); fs.mkdirSync(transplant); spawnSync("git", ["init", "-q"], { cwd: transplant }); const injectedRoot = configured.validatePageEvidenceAdopterReceipt({ asOf: decisionAt, reference, root: transplant }); rows.push({ name: "page_evidence_same_objects_unrelated_repository_rejected", expected: "page_evidence_adopter_api_invalid", actual: injectedRoot.failures, ok: injectedRoot.failures.some(({ code }) => code === "page_evidence_adopter_api_invalid") });
      spawnSync("git", ["remote", "set-url", "origin", "git@github.com:example/consumer.git"], { cwd: fixture.root }); const aliasRemote = configured.validatePageEvidenceAdopterReceipt({ asOf: decisionAt, reference }); rows.push({ name: "page_evidence_remote_alias_substitution_rejected", expected: "page_evidence_adopter_repository_untrusted", actual: aliasRemote.failures, ok: aliasRemote.failures.some(({ code }) => code === "page_evidence_adopter_repository_untrusted") }); spawnSync("git", ["remote", "set-url", "origin", trust.remote_url], { cwd: fixture.root });
      spawnSync("git", ["tag", "-f", "stylegallery-adopter-v1", evidenceCommit], { cwd: fixture.root }); const movedRef = configured.validatePageEvidenceAdopterReceipt({ asOf: decisionAt, reference }); rows.push({ name: "page_evidence_authenticated_ref_substitution_rejected", expected: "page_evidence_adopter_lineage_invalid", actual: movedRef.failures, ok: movedRef.failures.some(({ code }) => code === "page_evidence_adopter_lineage_invalid") }); spawnSync("git", ["tag", "-f", "stylegallery-adopter-v1", consumerCommit], { cwd: fixture.root });
      const adoptedBundle = makePageBundle("adopted-active"); adoptedBundle.bundle.adopter_receipt = reference;
      for (const asOf of [new Date(Date.parse(recordedAt) + 1).toISOString(), "2026-10-28T08:52:30Z"]) { adoptedBundle.bundle.evaluated_at = asOf; const result = configured.validatePageEvidenceRetirementBundle({ asOf, bundle: adoptedBundle.bundle, root: adoptedBundle.root }); rows.push({ name: `page_evidence_valid_adopter_active_${asOf < pageRecord.due_at ? "before" : "after"}_due`, expected: "ok:true", actual: result.failures, ok: result.ok }); }
      const adoptedRetired = makePageBundle("adopted-retired", { retire: true }); adoptedRetired.bundle.adopter_receipt = reference; adoptedRetired.bundle.evaluated_at = "2026-10-28T08:52:30Z"; const adoptedRemoval = configured.validatePageEvidenceRetirementBundle({ asOf: adoptedRetired.bundle.evaluated_at, bundle: adoptedRetired.bundle, root: adoptedRetired.root }); rows.push({ name: "page_evidence_valid_adopter_retirement_rejected", expected: "page_evidence_adopter_requires_active", actual: adoptedRemoval.failures, ok: adoptedRemoval.failures.some(({ code }) => code === "page_evidence_adopter_requires_active") });
    } finally { cleanupFixture(fixture); }
    for (const [name, repository, expected] of [
      ["synthetic_self", "example/stylegallery-page-evidence-ci", "example/stylegallery-page-evidence-ci"],
      ["stylegallery_case_remote_alias", "HTTPS://GITHUB.COM/CHANGEroa/STYLEGALLERY.git", "changeroa/stylegallery"],
      ["stylegallery_ssh_alias", "git@github.com:changeroa/StyleGallery.git", "changeroa/stylegallery"],
      ["unicode_alias", "changeroa/StyleGallery\uff0e", undefined],
      ["path_alias", "../changeroa/StyleGallery", undefined],
    ]) {
      const actual = contract.normalizedRepositoryIdentity(repository);
      rows.push({ name: `page_evidence_${name}_normalization`, expected, actual, ok: actual === expected });
    }
  }

  const extensionExports = ["generateProtocolExtensionInventory", "validateProtocolExtensionDisposition"];
  rows.push({
    name: "protocol_extension_disposition_contract_exports",
    expected: extensionExports,
    actual: extensionExports.filter((name) => typeof contract[name] === "function"),
    ok: extensionExports.every((name) => typeof contract[name] === "function"),
  });
  if (extensionExports.every((name) => typeof contract[name] === "function")) {
    const extensionRecords = ["lifecycle-a2a-extension.json", "lifecycle-ag-ui-extension.json"].map((name) => JSON.parse(fs.readFileSync(path.join(canonicalRoot, name), "utf8")));
    for (const entry of fixtureManifest.extension_invalid_records) {
      const fixture = JSON.parse(fs.readFileSync(path.join(fixtureRoot, entry.file), "utf8"));
      const result = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: fixture, root: repositoryRoot });
      rows.push({ name: entry.file.replace(/\.json$/, ""), expected: entry.expected_code, actual: result.failures, ok: !result.ok && result.failures.some(({ code }) => code === entry.expected_code) });
    }
    for (const record of extensionRecords) {
      const generated = contract.generateProtocolExtensionInventory(record.protocol, { root: repositoryRoot });
      rows.push({ name: `${record.protocol}_inventory_is_source_generated`, expected: generated, actual: record.inventory, ok: JSON.stringify(record.inventory) === JSON.stringify(generated) });
      const current = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record, root: repositoryRoot });
      rows.push({ name: `${record.protocol}_retain_is_valid`, expected: "retain", actual: current, ok: current.ok && current.state === "retain" && record.external_callers.status === "unknown" });
      const afterDue = contract.validateProtocolExtensionDisposition({ asOf: "2026-09-28T08:52:29Z", record, root: repositoryRoot });
      rows.push({ name: `${record.protocol}_deadline_triggers_review_only`, expected: "review", actual: afterDue, ok: afterDue.ok && afterDue.state === "review" && afterDue.action === "owner_review" });
      const stale = structuredClone(record); stale.inventory.implementation.file_sha256 = "0".repeat(64);
      const staleResult = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: stale, root: repositoryRoot });
      rows.push({ name: `${record.protocol}_stale_source_hash_rejected`, expected: "protocol_extension_source_stale", actual: staleResult.failures, ok: staleResult.failures.some(({ code }) => code === "protocol_extension_source_stale") });
      const omitted = structuredClone(record); omitted.inventory.callers.pop();
      const omittedResult = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: omitted, root: repositoryRoot });
      rows.push({ name: `${record.protocol}_missing_caller_rejected`, expected: "protocol_extension_caller_inventory_mismatch", actual: omittedResult.failures, ok: omittedResult.failures.some(({ code }) => code === "protocol_extension_caller_inventory_mismatch") });
      const duplicate = structuredClone(record); duplicate.inventory.callers.push(structuredClone(duplicate.inventory.callers[0]));
      const duplicateResult = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: duplicate, root: repositoryRoot });
      rows.push({ name: `${record.protocol}_duplicate_caller_rejected`, expected: "protocol_extension_caller_inventory_mismatch", actual: duplicateResult.failures, ok: duplicateResult.failures.some(({ code }) => code === "protocol_extension_caller_inventory_mismatch") });
      const invented = structuredClone(record); invented.external_callers = { status: "verified", provenance: null, migration_instructions: null };
      const inventedResult = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: invented, root: repositoryRoot });
      rows.push({ name: `${record.protocol}_invented_external_caller_rejected`, expected: "protocol_extension_caller_provenance_required", actual: inventedResult.failures, ok: inventedResult.failures.some(({ code }) => code === "protocol_extension_caller_provenance_required") });
      const immediate = structuredClone(record); immediate.lifecycle.state = "removal-authorized"; immediate.lifecycle.current_action = "remove_immediately";
      const immediateResult = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: immediate, root: repositoryRoot });
      rows.push({ name: `${record.protocol}_immediate_removal_rejected`, expected: "protocol_extension_immediate_removal_forbidden", actual: immediateResult.failures, ok: immediateResult.failures.some(({ code }) => code === "protocol_extension_immediate_removal_forbidden") });
      const sameMajor = structuredClone(record); sameMajor.lifecycle.state = "deprecate"; sameMajor.lifecycle.current_action = "publish_deprecation"; sameMajor.migration.status = "migration-ready"; sameMajor.approval.approved_major_version_receipt = { commit: "a".repeat(40), path: "consumer-reference/policies/fake.json", blob_oid: "b".repeat(40), sha256: "c".repeat(64), approved_major_version: Number(record.current_version.split(".")[0]), protocol: record.protocol };
      const sameMajorResult = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: sameMajor, root: repositoryRoot });
      rows.push({ name: `${record.protocol}_same_major_deprecation_rejected`, expected: "protocol_extension_major_version_invalid", actual: sameMajorResult.failures, ok: sameMajorResult.failures.some(({ code }) => code === "protocol_extension_major_version_invalid") });
    }
    const replay = structuredClone(extensionRecords[0]); replay.approval.approved_major_version_receipt = { commit: "a".repeat(40), path: "consumer-reference/policies/fake.json", blob_oid: "b".repeat(40), sha256: "c".repeat(64), approved_major_version: 2, protocol: "ag-ui" };
    replay.lifecycle.state = "deprecate"; replay.lifecycle.current_action = "publish_deprecation"; replay.migration.status = "migration-ready";
    const replayResult = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: replay, root: repositoryRoot });
    rows.push({ name: "cross_extension_approval_replay_rejected", expected: "protocol_extension_approval_binding_invalid", actual: replayResult.failures, ok: replayResult.failures.some(({ code }) => code === "protocol_extension_approval_binding_invalid") });

    const unknownAction = structuredClone(extensionRecords[0]); unknownAction.lifecycle.current_action = "delete_extension";
    const unknownActionResult = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: unknownAction, root: repositoryRoot });
    rows.push({ name: "unknown_delete_extension_action_rejected_before_semantics", expected: "protocol_extension_action_invalid", actual: unknownActionResult, ok: !unknownActionResult.ok && unknownActionResult.action === "none" && unknownActionResult.failures.some(({ code }) => code === "protocol_extension_action_invalid") });
    const unknownField = structuredClone(extensionRecords[0]); unknownField.lifecycle.decision = "delete";
    const unknownFieldResult = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: unknownField, root: repositoryRoot });
    rows.push({ name: "unknown_nested_decision_field_rejected_before_semantics", expected: "protocol_extension_field_unknown", actual: unknownFieldResult, ok: !unknownFieldResult.ok && unknownFieldResult.action === "none" && unknownFieldResult.failures.some(({ code }) => code === "protocol_extension_field_unknown") });

    const fabricated = structuredClone(extensionRecords[0]);
    fabricated.external_callers = {
      status: "verified",
      migration_instructions: ["fabricated migration"],
      provenance: {
        authenticated_by: "todo27-immutable-receipt", caller_ref: "sg:caller/fabricated", repository: "attacker/fabricated", revision: "a".repeat(40),
        protocol: "a2a", version: "1.0", source_closure_id: `sha256:${"b".repeat(64)}`,
        receipt: { commit: "c".repeat(40), path: "consumer-reference/policies/fabricated.json", blob_oid: "d".repeat(40), sha256: "e".repeat(64) },
        result: { path: "evidence/result.json", blob_oid: "f".repeat(40), sha256: "a".repeat(64) },
        migration: { path: "evidence/migration.json", blob_oid: "b".repeat(40), sha256: "c".repeat(64) },
      },
    };
    const fabricatedResult = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: fabricated, root: repositoryRoot });
    rows.push({ name: "structurally_valid_fabricated_verified_caller_rejected", expected: "protocol_extension_caller_provenance_untrusted", actual: fabricatedResult.failures, ok: fabricatedResult.failures.some(({ code }) => code === "protocol_extension_caller_provenance_untrusted") });
    const crossCaller = structuredClone(fabricated); crossCaller.external_callers.provenance.protocol = "ag-ui";
    const crossCallerResult = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: crossCaller, root: repositoryRoot });
    rows.push({ name: "cross_extension_verified_caller_receipt_rejected", expected: "protocol_extension_caller_provenance_binding_invalid", actual: crossCallerResult.failures, ok: crossCallerResult.failures.some(({ code }) => code === "protocol_extension_caller_provenance_binding_invalid") });

    const callerRoot = path.join(tempRoot, "immutable-caller-repository"); fs.mkdirSync(callerRoot);
    const gitCaller = (...args) => spawnSync("git", args, { cwd: callerRoot, encoding: "utf8" });
    gitCaller("init", "-q"); gitCaller("config", "user.name", "Todo27 Test"); gitCaller("config", "user.email", "todo27@example.invalid"); gitCaller("remote", "add", "origin", "https://github.com/acme/stylegallery-caller.git");
    fs.writeFileSync(path.join(callerRoot, "caller.mjs"), "export const caller = true;\n"); gitCaller("add", "caller.mjs"); gitCaller("commit", "-qm", "caller revision");
    const callerRevision = gitCaller("rev-parse", "HEAD").stdout.trim(); gitCaller("tag", "todo27-authenticated", callerRevision);
    const sourceClosureId = `sha256:${"7".repeat(64)}`; const callerRef = "sg:caller/acme-stylegallery";
    const verified = structuredClone(extensionRecords[0]); verified.external_callers = { status: "verified", provenance: null, migration_instructions: ["Migrate through the retained A2A 1.0 forwarding surface."] };
    const canonicalJson = (value) => { if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`; return JSON.stringify(value); };
    const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
    const resultReceipt = { schema_version: "1.0", receipt_kind: "protocol-extension-caller-validation", caller_ref: callerRef, protocol: "a2a", version: "1.0", source_closure_id: sourceClosureId, status: "PASS" };
    const migrationReceipt = { schema_version: "1.0", receipt_kind: "protocol-extension-caller-migration", caller_ref: callerRef, protocol: "a2a", from_version: "1.0", instructions: verified.external_callers.migration_instructions };
    const resultBytes = `${JSON.stringify(resultReceipt, null, 2)}\n`; const migrationBytes = `${JSON.stringify(migrationReceipt, null, 2)}\n`;
    const callerReceipt = { schema_version: "1.0", receipt_kind: "protocol-extension-external-caller", caller_ref: callerRef, repository: "acme/stylegallery-caller", revision: callerRevision, protocol: "a2a", version: "1.0", source_closure_id: sourceClosureId, subject_sha256: digest(Buffer.from(canonicalJson(verified))), result_sha256: digest(resultBytes), migration_sha256: digest(migrationBytes), issued_at: "2026-07-31T00:00:00Z" };
    fs.mkdirSync(path.join(callerRoot, "evidence")); fs.writeFileSync(path.join(callerRoot, "evidence/result.json"), resultBytes); fs.writeFileSync(path.join(callerRoot, "evidence/migration.json"), migrationBytes); fs.writeFileSync(path.join(callerRoot, "evidence/receipt.json"), `${JSON.stringify(callerReceipt, null, 2)}\n`);
    gitCaller("add", "evidence"); gitCaller("commit", "-qm", "immutable Todo27 caller receipt"); const receiptCommit = gitCaller("rev-parse", "HEAD").stdout.trim();
    const objectBinding = (repositoryPath) => { const bytes = fs.readFileSync(path.join(callerRoot, repositoryPath)); return { path: repositoryPath, blob_oid: gitCaller("rev-parse", `${receiptCommit}:${repositoryPath}`).stdout.trim(), sha256: digest(bytes) }; };
    const receiptBinding = objectBinding("evidence/receipt.json"), resultBinding = objectBinding("evidence/result.json"), migrationBinding = objectBinding("evidence/migration.json");
    verified.external_callers.provenance = { authenticated_by: "todo27-immutable-receipt", caller_ref: callerRef, repository: "acme/stylegallery-caller", revision: callerRevision, protocol: "a2a", version: "1.0", source_closure_id: sourceClosureId, receipt: { commit: receiptCommit, ...receiptBinding }, result: resultBinding, migration: migrationBinding };
    const callerStat = fs.lstatSync(callerRoot); const trust = { caller_ref: callerRef, repository: "acme/stylegallery-caller", revision: callerRevision, protocol: "a2a", version: "1.0", source_closure_id: sourceClosureId, receipt_commit: receiptCommit, receipt_path: receiptBinding.path, receipt_blob: receiptBinding.blob_oid, receipt_sha256: receiptBinding.sha256, result: resultBinding, migration: migrationBinding, repository_root: callerRoot, repository_root_dev: callerStat.dev, repository_root_ino: callerStat.ino, repository_root_sha256: digest(Buffer.from(fs.realpathSync(callerRoot))), remote_url: "https://github.com/acme/stylegallery-caller.git", authenticated_ref: "refs/tags/todo27-authenticated", lineage_root_commit: callerRevision };
    const trustedContractPath = path.join(tempRoot, "trusted-lifecycle-contract.mjs");
    const trustedSource = fs.readFileSync(validator, "utf8")
      .replace('"./json-schema-formats.mjs"', JSON.stringify(pathToFileURL(path.join(repositoryRoot, "scripts/json-schema-formats.mjs")).href))
      .replace('"./strict-json.mjs"', JSON.stringify(pathToFileURL(path.join(repositoryRoot, "scripts/strict-json.mjs")).href))
      .replace('"./calibration-raw-contract.mjs"', JSON.stringify(pathToFileURL(path.join(repositoryRoot, "scripts/calibration-raw-contract.mjs")).href))
      .replace("const PROTOCOL_EXTERNAL_CALLER_TRUST_ROOTS = Object.freeze([]);", `const PROTOCOL_EXTERNAL_CALLER_TRUST_ROOTS = ${JSON.stringify([trust])};`);
    fs.writeFileSync(trustedContractPath, trustedSource);
    const trustedContract = await import(`${pathToFileURL(trustedContractPath).href}?trusted-caller`);
    const validCallerResult = trustedContract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: verified, root: repositoryRoot });
    rows.push({ name: "immutable_todo27_caller_provenance_accepted", expected: "ok", actual: validCallerResult, ok: validCallerResult.ok });
    for (const [name, mutate, expected] of [
      ["immutable_caller_source_binding_mutation_rejected", (r) => { r.external_callers.provenance.source_closure_id = `sha256:${"8".repeat(64)}`; }, "protocol_extension_caller_provenance_binding_invalid"],
      ["immutable_caller_result_binding_mutation_rejected", (r) => { r.external_callers.provenance.result.sha256 = "8".repeat(64); }, "protocol_extension_caller_provenance_binding_invalid"],
      ["immutable_caller_migration_binding_mutation_rejected", (r) => { r.external_callers.provenance.migration.sha256 = "8".repeat(64); }, "protocol_extension_caller_provenance_binding_invalid"],
      ["immutable_caller_cross_extension_replay_rejected", (r) => { r.external_callers.provenance.protocol = "ag-ui"; }, "protocol_extension_caller_provenance_binding_invalid"],
    ]) { const mutated = structuredClone(verified); mutate(mutated); const result = trustedContract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: mutated, root: repositoryRoot }); rows.push({ name, expected, actual: result.failures, ok: !result.ok && result.failures.some(({ code }) => code === expected) }); }

    function hostileNested(name, makeRecord) {
      let invoked = 0;
      const hostileRecord = makeRecord(structuredClone(extensionRecords[0]), () => { invoked += 1; });
      let result;
      try { result = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: hostileRecord, root: repositoryRoot }); }
      catch (error) { result = { failures: [{ code: "threw", message: error?.message, stack: error?.stack }], ok: false }; }
      const serialized = JSON.stringify(result);
      rows.push({ name, expected: "protocol_extension_api_invalid without evaluation or host leak", actual: { invoked, result }, ok: invoked === 0 && result.failures?.some(({ code }) => code === "protocol_extension_api_invalid") && !serialized.includes("/Users/") && !serialized.includes("proxy-secret") });
    }
    hostileNested("nested_getter_rejected_trap_free", (record, invoke) => { Object.defineProperty(record.review, "due_at", { enumerable: true, get() { invoke(); throw new Error("/Users/attacker/getter-secret"); } }); return record; });
    hostileNested("nested_proxy_rejected_trap_free", (record, invoke) => { record.review = new Proxy({}, { get() { invoke(); throw new Error("/Users/attacker/proxy-secret"); }, ownKeys() { invoke(); throw new Error("/Users/attacker/proxy-secret"); } }); return record; });
    hostileNested("nested_revoked_proxy_rejected_trap_free", (record, invoke) => { const pair = Proxy.revocable({}, { get() { invoke(); return null; } }); pair.revoke(); record.review = pair.proxy; return record; });
    hostileNested("nested_symbol_key_rejected", (record) => { record.review[Symbol("hostile")] = true; return record; });
    hostileNested("nested_cycle_rejected", (record) => { record.review.loop = record; return record; });
    hostileNested("nested_prototype_pollution_rejected", (record) => { Object.defineProperty(record.review, "__proto__", { enumerable: true, value: { polluted: true } }); return record; });

    const inventoryRoot = path.join(tempRoot, "repository-wide-caller-inventory");
    fs.mkdirSync(inventoryRoot);
    const inventoryOutput = spawnSync("git", ["-C", repositoryRoot, "ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "buffer" }).stdout.toString("utf8").split("\0").filter(Boolean);
    for (const relative of inventoryOutput) {
      const source = path.join(repositoryRoot, relative);
      if (!fs.existsSync(source) || !fs.lstatSync(source).isFile()) continue;
      const target = path.join(inventoryRoot, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target);
    }
    spawnSync("git", ["init", "-q"], { cwd: inventoryRoot }); spawnSync("git", ["add", "--all"], { cwd: inventoryRoot });
    const outsidePath = "tests/outside-a2a-extension-caller.mjs"; const outsideTarget = path.join(inventoryRoot, outsidePath); fs.mkdirSync(path.dirname(outsideTarget), { recursive: true });
    fs.writeFileSync(outsideTarget, 'import { registerA2AExtension } from "../scripts/agent-native/v2/extensions/a2a-projection.mjs";\nexport { registerA2AExtension };\n'); spawnSync("git", ["add", "--", outsidePath], { cwd: inventoryRoot });
    const outsideResult = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: extensionRecords[0], root: inventoryRoot });
    rows.push({ name: "caller_outside_scripts_is_discovered", expected: "protocol_extension_caller_inventory_mismatch", actual: outsideResult.failures, ok: outsideResult.failures.some(({ code }) => code === "protocol_extension_caller_inventory_mismatch") });
    fs.writeFileSync(outsideTarget, 'import value from "../scripts/agent-native/extensions/renamed-projection.mjs";\nexport default value;\n'); spawnSync("git", ["add", "--", outsidePath], { cwd: inventoryRoot });
    const renamedResult = contract.validateProtocolExtensionDisposition({ asOf: "2026-08-01T00:00:00Z", record: extensionRecords[0], root: inventoryRoot });
    rows.push({ name: "outside_caller_reference_rename_invalidates_authoritative_inventory", expected: "protocol_extension_source_stale", actual: renamedResult.failures, ok: renamedResult.failures.some(({ code }) => code === "protocol_extension_source_stale") });
  }

  const first = run(["--as-of", "2026-08-01T00:00:00Z"]);
  const second = run(["--as-of", "2026-08-01T00:00:00Z"]);
  rows.push({ actual: first.report.records, expected: "stable canonical order and serialization", name: "canonical_order_deterministic", ok: first.status === 0 && JSON.stringify(first.report.records) === JSON.stringify(second.report.records) && JSON.stringify(first.report.records?.map(({ family }) => family)) === JSON.stringify(["sentinel-calibration", "page-evidence-adoption", "protocol-owner-review"]) });
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

const failures = rows.filter(({ ok }) => !ok).map(({ name, expected }) => `missing_semantic:${name}:${expected}`);
const report = { failures, ok: failures.length === 0, results: rows };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
