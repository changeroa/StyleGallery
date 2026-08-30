#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { types as utilTypes } from "node:util";
import Ajv2020 from "ajv/dist/2020.js";
import { addDateTimeFormat, isRfc3339DateTime } from "./json-schema-formats.mjs";
import { parseStrictJson } from "./strict-json.mjs";
import { parseCalibrationRun } from "./calibration-raw-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalFamilies = Object.freeze(["sentinel-calibration", "page-evidence-adoption", "protocol-owner-review"]);
const canonicalRecords = Object.freeze([
  "consumer-reference/policies/lifecycle-sentinel-calibration.json",
  "consumer-reference/policies/lifecycle-page-evidence-adoption.json",
  "consumer-reference/policies/lifecycle-protocol-owner-review.json",
]);
const canonicalManifest = "consumer-reference/policies/lifecycle-dispositions.json";
const schemaRecord = "consumer-reference/schema/lifecycle-disposition.schema.json";
const expectedFields = Object.freeze(["family", "owner_ref", "baseline_recorded_at", "decision_window_days", "due_at", "evidence_refs", "caller_status", "decision", "post_deadline_action", "archive_paths", "decision_receipt", "retirement"]);
const requiredFields = Object.freeze(expectedFields.filter((field) => !["decision_receipt", "retirement"].includes(field)));
const canonicalArchives = Object.freeze({
  "sentinel-calibration": Object.freeze([
    "consumer-reference/baselines/calibration.json", "consumer-reference/baselines/manifest.json",
    "consumer-reference/schema/baseline-manifest.schema.json", "consumer-reference/schema/calibration-record.schema.json",
    "scripts/baseline-contract.mjs", "scripts/baseline-schema-parity.mjs", "scripts/calibration-raw-contract.mjs",
    "scripts/calibration-test-fixture.mjs", "scripts/strict-json.mjs", "scripts/summarize-sentinel-calibration.mjs",
    "scripts/test-calibration-raw-contract.mjs", "scripts/test-consumer-reference-sentinel.mjs",
    "scripts/test-summarize-sentinel-calibration.mjs", "scripts/test-validate-baseline-manifest.mjs", "scripts/validate-baseline-manifest.mjs",
    "tests/consumer-reference-sentinels.spec.mjs", "tests/helpers/render-consumer-reference.mjs",
    "tests/snapshots/consumer-reference-card-grid.png",
  ]),
  "page-evidence-adoption": Object.freeze([
    "consumer-reference/contract.md", "consumer-reference/schema/page-evidence-manifest.schema.json",
    "consumer-reference/schema/page-evidence-session.schema.json", "playwright.config.mjs", "quality/evidence/executable-evidence.md",
    "scripts/create-page-evidence-session.mjs", "scripts/finalize-page-evidence.mjs", "scripts/page-artifact-metadata.mjs",
    "scripts/page-evidence-contract.mjs", "scripts/page-evidence-fixture.mjs", "scripts/run-consumer-page-evidence-ci.mjs",
    "scripts/test-consumer-conformance-sentinel.mjs", "scripts/test-validate-page-evidence.mjs", "scripts/validate-page-evidence.mjs",
    "tests/consumer-conformance.spec.mjs", "tests/fixtures/consumer-conformance-scenarios.mjs", "tests/helpers/render-consumer-conformance.mjs",
  ]),
  "protocol-owner-review": Object.freeze([
    "consumer-reference/agent-native/README.md", "scripts/agent-native/a2a-projection.mjs", "scripts/agent-native/agui-projection.mjs",
    "scripts/agent-native/v2/experimental-extension-registry.mjs", "scripts/agent-native/v2/extensions/a2a-projection.mjs",
    "scripts/agent-native/v2/extensions/agui-projection.mjs", "scripts/agent-native/v2/test-agent-extension-boundary.mjs", "scripts/test-agent-projections.mjs",
  ]),
});
const BASELINE_COMMIT = "f8728fb7cbed152d35a01753d92e2b3f4b295c59";
const BASELINE_TREE = "c42c94e26510589bcd6355a0622dd5bc37f5498a";
const ALLOWED_PATH_LEDGER_SHA256 = "3073cd7ca47858db1a8cbdf3082503ca464c48083928089ddb94ff8d66b0e530";
const OWNER_TRUST_ROOT = Object.freeze({
  owner_ref: "sg:governor/stylegallery-maintainers", reviewer: "@changeroa", codeowners_path: ".github/CODEOWNERS",
  codeowners_blob: "ad867b03e3f0fcdd9f6d3fe775bbaa13aa7dae87", codeowners_sha256: "a5127ae85d4e9ee72593b6089229ddeecaeb6d6fcf10f6ab0d64a45691064c98",
});
const AUTHORIZED_APPROVAL_COMMITS = Object.freeze([]);
const SENTINEL_WORKFLOW_PATH = ".github/workflows/validate.yml";
const SENTINEL_ACTIVE_WORKFLOW_SHA256 = "846417a45a462a51ba28028621ff9fe82cf018be15b8a433a661d7d0d7af3017";
const SENTINEL_RETIRED_WORKFLOW_SHA256 = "421c63222db3dfb5af03630c437a4b8b0f755a6146abec4e5d213eb2b0369620";
const SENTINEL_JOB_SHA256 = "86228e7fb44c2ba5d0abe160d6bd3c4f5228e7c1ec40189b3b4f528acfd45e62";
const SENTINEL_PROTECTED = Object.freeze([
  ["consumer-reference/baselines/calibration.json", "b537b0c3acb3ac55e4b926b1d12b41d2cb8050a85de2410ad4b42e1b7b53f88e", "raw_20_run_aggregate_and_provenance"],
  ["consumer-reference/baselines/manifest.json", "3396593e1486583d55313098ed26c3b2e048c55eb5589d11e7cfbf026709d6d3", "baseline_manifest"],
  ["consumer-reference/schema/baseline-manifest.schema.json", "ad489462abcd705f73b1e686b3aa1f1ebd20e5b12d366ee1971d76bc456f2e17", "baseline_manifest_schema"],
  ["consumer-reference/schema/calibration-record.schema.json", "444517a0c9ce7d176d0a3f22934afed6f4befe941ba4447cff2b9cc72a90997b", "calibration_record_schema"],
  ["scripts/baseline-contract.mjs", "c2a289daabd26074b240efdef4d1ee06e06e0457b060e325be809f8a938202ff", "baseline_runtime_validator"],
  ["scripts/baseline-schema-parity.mjs", "f852b067bb99466f978ebd0b7dbb76587706ba52803745f3849ba9e0cf04987c", "schema_runtime_parity_control"],
  ["scripts/calibration-raw-contract.mjs", "d88c1e36213b4067850806cc9cbf66c3286c37c81e43a395c372d6ec088195e1", "raw_run_parser"],
  ["scripts/calibration-test-fixture.mjs", "cc5c216c68e4d98624116e13909cb6dd55fd23a26d2a9027ed3ebc3ee912aa3b", "raw_mutation_fixture"],
  ["scripts/strict-json.mjs", "d203dab02d4fb74866663bdfd7bc58beb120bd5d0e8e145b3bfe62c1bc5091a3", "duplicate_property_control"],
  ["scripts/summarize-sentinel-calibration.mjs", "32e3e0f6caeaa64f3782d1a8d61b8a142aaaeb0449dad22ed57d93eeeb9b7391", "twenty_run_summarizer"],
  ["scripts/test-calibration-raw-contract.mjs", "4370fc7557cf860d5b2818246441368ddaf4d99829bdc774c20c6c0e328c6172", "raw_parser_mutation_controls"],
  ["scripts/test-consumer-reference-sentinel.mjs", "4eaf9991c5a9b869c237b68b4360d0d7a218babbb2b4171a9f7b8a8c86448b5e", "semantic_sentinel_contract"],
  ["scripts/test-summarize-sentinel-calibration.mjs", "3ab23f8d6b2bde33ea321d6d51c979b1956587143c69d695b4eb65e6a7b017f4", "summarizer_mutation_controls"],
  ["scripts/test-validate-baseline-manifest.mjs", "be771cc0fe892afa3ea66298502f0b555bf6724681591b7af79b070cce00e32d", "baseline_mutation_controls"],
  ["scripts/validate-baseline-manifest.mjs", "a673450e8cd5890d663f7ac2378089aa3c988a431adc24219972f83a4f3854ef", "baseline_validator"],
  ["tests/consumer-reference-sentinels.spec.mjs", "fd1a7bb897a9a93a27aab4931d3d04746ec3d641602226608fd6125632d13d28", "browser_semantic_sentinel"],
  ["tests/helpers/render-consumer-reference.mjs", "88802a948909d5e40470be6b5481766ce2de498e59c053ac68af370b46e72ca9", "sentinel_renderer_source"],
  ["tests/snapshots/consumer-reference-card-grid.png", "5528358e957a6115793155e501f62716f7db31dc1c86856d9e1234868d672837", "historical_baseline_bytes"],
]);const PAGE_WORKFLOW_PATH = ".github/workflows/validate.yml";
const PAGE_ACTIVE_WORKFLOW_SHA256 = "846417a45a462a51ba28028621ff9fe82cf018be15b8a433a661d7d0d7af3017";
const PAGE_RETIRED_WORKFLOW_SHA256 = "e68fe15654d5830d918e8adfda4b8dcedcb0340b286d6e42058831c1d1c44f58";
const PAGE_JOB_SHA256 = "11d0fe7ea2880c5d32d32bb419493600afdfd221aef728f3c0e36e22cf52b116";
const PAGE_SYNTHETIC_REPOSITORIES = Object.freeze(["ark-jo/stylegallery", "changeroa/stylegallery", "example/stylegallery-page-evidence-ci"]);
const PAGE_PROTECTED = Object.freeze([
  ["consumer-reference/contract.md", "b914920989ff2ce08ebc67fa3167d0da766c260c93f03257a9144c6093ff6713", "lifecycle_documentation"],
  ["consumer-reference/schema/page-evidence-manifest.schema.json", "eb856f164bca20e43eff1b705b78407d38443b34695f9686f5a6102cd9213173", "manifest_schema"],
  ["consumer-reference/schema/page-evidence-session.schema.json", "30175d9ba46d2705d72c89b02ceb09c6f0e790f3512bbe0e198a984d64393b32", "session_schema"],
  ["scripts/create-page-evidence-session.mjs", "74ac67c53ab945fd7244c227d5c5b74cb545bfb170af9aadf3ce9decc201332e", "session_creator"],
  ["scripts/finalize-page-evidence.mjs", "141719203511c96c2dc70b8d25721680f027fac2485cc78e67a73638dc0ad54e", "session_finalizer"],
  ["scripts/page-artifact-metadata.mjs", "59c57b0da5b8a503d6f14fb507c57680d5854c59c8bc2838856e50d15eb7260b", "artifact_metadata_validator"],
  ["scripts/page-evidence-contract.mjs", "9ec6b6c5167dae75e5b106cfcbb2078be9f89d0f9e45a640dbc1efda2e47bc9e", "source_and_packet_contract"],
  ["scripts/page-evidence-fixture.mjs", "efa0a17d90d010953c98a0957ab1c6936d2a80a82f2958d6080523298c78eafa", "closed_fixture_provider"],
  ["scripts/run-consumer-page-evidence-ci.mjs", "2a5f58aacd3ebf2985b3115c492f0a9a39e849c0e619fca3464b47b6eaf400e8", "synthetic_ci_adapter"],
  ["scripts/test-consumer-conformance-sentinel.mjs", "9f524b45592c4cd89ffee7cef7b04790f73544dc9dd1f25d8cc1df9504bb5ce5", "state_capture_negative_controls"],
  ["scripts/test-validate-page-evidence.mjs", "2db7bffabf9a92c6f6fccb3fce3f902f219027915a02cb1d710eee169560022a", "page_evidence_negative_controls"],
  ["scripts/validate-page-evidence.mjs", "39be91eeb532a015f54d5a542a2bfe0fc641d79a2e18e7fe88f06800258831f0", "packet_validator"],
  ["tests/consumer-conformance.spec.mjs", "e19df0d1131b7a65fd6e5b7b79c993d05f4a4559b64a18da673e1beede5421a3", "browser_capture_surface"],
  ["tests/fixtures/consumer-conformance-scenarios.mjs", "927d185f523e70e7f2e1fccee0013360d126e02aa532c2367670e64cdef43f12", "state_w1024_focus_contract"],
  ["tests/helpers/render-consumer-conformance.mjs", "6d5db609aaadb2f68fec1a0f1f51af1c17157cf1364631a42b35da2d6c1a0865", "capture_renderer"],
  ["quality/evidence/executable-evidence.md", "fb441412dabc0b57aeac8355f92321a9873aa67612e489e3137953d7680312b1", "archive_and_retrieval_documentation"],
  ["playwright.config.mjs", "7dcc2ae21602ac89af47d2bbf122f5945098f0e8fda9d47db7d33980592e60ae", "pinned_browser_configuration"],
]);
const PAGE_ADOPTER_TRUST_ROOTS = Object.freeze([]);
const PROTOCOL_EXTENSION_RECORDS = Object.freeze([
  "consumer-reference/policies/lifecycle-a2a-extension.json",
  "consumer-reference/policies/lifecycle-ag-ui-extension.json",
]);
const PROTOCOL_EXTENSION_APPROVAL_COMMITS = Object.freeze([]);
const PROTOCOL_EXTERNAL_CALLER_TRUST_ROOTS = Object.freeze([]);
const PROTOCOL_EXTENSION_CONFIG = Object.freeze({
  a2a: Object.freeze({
    implementation: "scripts/agent-native/v2/extensions/a2a-projection.mjs",
    forwarder: "scripts/agent-native/a2a-projection.mjs",
    protocol: "a2a",
    versionPattern: /version:\s*["']([^"']+)["']/u,
  }),
  "ag-ui": Object.freeze({
    implementation: "scripts/agent-native/v2/extensions/agui-projection.mjs",
    forwarder: "scripts/agent-native/agui-projection.mjs",
    protocol: "ag-ui",
    versionPattern: /version:\s*["']([^"']+)["']/u,
  }),
});
const PROTOCOL_EXTENSION_TESTS = Object.freeze([
  "scripts/test-agent-adapter-conformance.mjs",
  "scripts/agent-native/v2/test-agent-extension-boundary.mjs",
  "scripts/test-agent-native-schemas.mjs",
  "scripts/test-agent-projections.mjs",
  "scripts/agent-native/v2/test-agent-v1-compatibility.mjs",
  "scripts/agent-native/v2/test-sg-material-package.mjs",
]);
const PROTOCOL_EXTENSION_DOCS = Object.freeze([
  "consumer-reference/agent-native/README.md",
  "consumer-reference/agent-native/registry.json",
  "scripts/agent-native/self-description.mjs",
]);

export const trustedCallerRegistry = Object.freeze([
  Object.freeze({
    caller_ref: "sg:caller/a2a-extension-v1", family: "protocol-owner-review", protocol: "a2a", version: "1.0",
    repository: "changeroa/StyleGallery", revision: BASELINE_COMMIT,
    source_closure_id: "sha256:1cc2a58af9e7aa0c858def08fd8c65dca2ebf8c7ae7f0d4149f99fc827c5fbc5",
    source_closure: Object.freeze([
      Object.freeze({ path: "scripts/agent-native/v2/experimental-extension-registry.mjs", sha256: "5c5d4e9f94a47fbccabd6f3c64ab2b33a57057218cafefc202a34bb7db38f501" }),
      Object.freeze({ path: "scripts/agent-native/v2/extensions/a2a-projection.mjs", sha256: "bd4257b8f7c2c82343b3c0785fff46f4b445b507efa5d0e1c686e4eeb585b3d2" }),
      Object.freeze({ path: "scripts/agent-native/v2/test-agent-extension-boundary.mjs", sha256: "7f95dac5dba4a3ed40b2d466cf4792b351e644eb2c22e4f9b548ceae1fc2a791" }),
    ]),
  }),
  Object.freeze({
    caller_ref: "sg:caller/ag-ui-extension-v0-0-57", family: "protocol-owner-review", protocol: "ag-ui", version: "0.0.57",
    repository: "changeroa/StyleGallery", revision: BASELINE_COMMIT,
    source_closure_id: "sha256:fc377a0cdaa3eaf7b3e5b9425a5e0133ecb222d59fbdadb313ac6c0ba6d6c20e",
    source_closure: Object.freeze([
      Object.freeze({ path: "scripts/agent-native/v2/experimental-extension-registry.mjs", sha256: "5c5d4e9f94a47fbccabd6f3c64ab2b33a57057218cafefc202a34bb7db38f501" }),
      Object.freeze({ path: "scripts/agent-native/v2/extensions/agui-projection.mjs", sha256: "54cc1eddede4aa344be9cbd978a2a022772d9abdb6f92e1376193d603e26dc3e" }),
      Object.freeze({ path: "scripts/agent-native/v2/test-agent-extension-boundary.mjs", sha256: "7f95dac5dba4a3ed40b2d466cf4792b351e644eb2c22e4f9b548ceae1fc2a791" }),
    ]),
  }),
]);
const sealedSourceBindings = new Map([
  ...trustedCallerRegistry.flatMap((entry) => entry.source_closure.map((source) => [source.path, source.sha256])),
  ["scripts/test-calibration-raw-contract.mjs", "4370fc7557cf860d5b2818246441368ddaf4d99829bdc774c20c6c0e328c6172"],
  ["scripts/calibration-test-fixture.mjs", "cc5c216c68e4d98624116e13909cb6dd55fd23a26d2a9027ed3ebc3ee912aa3b"],
]);
const fixtureRows = Object.freeze([
  ["invalid-unknown-owner.json", "lifecycle_owner_unknown"],
  ["invalid-chronology.json", "lifecycle_chronology_invalid"],
  ["invalid-due-mismatch.json", "lifecycle_due_at_mismatch"],
  ["invalid-caller-none.json", "lifecycle_caller_status_invalid"],
  ["invalid-missing-archive.json", "lifecycle_path_missing"],
  ["invalid-contradictory-transition.json", "lifecycle_transition_invalid"],
  ["invalid-unsupported-decision.json", "lifecycle_decision_invalid"],
  ["invalid-unknown-field.json", "lifecycle_field_unknown"],
]);
const extensionFixtureRows = Object.freeze([
  ["invalid-extension-caller-none.json", "protocol_extension_unknown_to_none_forbidden"],
  ["invalid-extension-verified-without-migration.json", "protocol_extension_caller_provenance_required"],
  ["invalid-extension-immediate-removal.json", "protocol_extension_immediate_removal_forbidden"],
  ["invalid-extension-self-signed-deprecate.json", "protocol_extension_approval_untrusted"],
  ["invalid-extension-caller-omitted.json", "protocol_extension_caller_inventory_mismatch"],
]);
const pathPattern = /^(?!\/)(?!.*\/\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?![A-Za-z][A-Za-z0-9+.-]*:)(?!.*[\\?#])[^/]+(?:\/[^/]+)*$/;

export class LifecycleDispositionError extends Error {
  constructor(code, message, recordPath) { super(message); this.name = "LifecycleDispositionError"; this.code = code; this.path = recordPath; }
}
function contractFail(code, message, recordPath) { throw new LifecycleDispositionError(code, message, recordPath); }
export function compareUtf8(left, right) { return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")); }
function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort(compareUtf8).map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function sameValue(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function gitBlobOid(bytes) { return createHash("sha1").update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex"); }
function nativeRealpath(fileSystem, target) { const fn = fileSystem.realpathSync.native ?? fileSystem.realpathSync; return fn.call(fileSystem.realpathSync, target); }

export function readRepositoryFileSafely({ afterOpen, fileSystem = fs, inventory, inventoryReader, repositoryPath, requireObjectMatch = false, root }) {
  if (typeof repositoryPath !== "string" || !pathPattern.test(repositoryPath)) contractFail("lifecycle_path_invalid", "repository path is not normalized", repositoryPath);
  const resolvedRoot = path.resolve(root);
  let rootStats;
  try { rootStats = fileSystem.lstatSync(resolvedRoot); } catch { contractFail("lifecycle_path_missing", "repository root is unavailable", repositoryPath); }
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) contractFail("lifecycle_path_symlink", "repository root must be a regular directory", repositoryPath);
  const canonicalRoot = nativeRealpath(fileSystem, resolvedRoot);
  const components = [];
  let current = resolvedRoot;
  try {
    for (const segment of repositoryPath.split("/")) {
      current = path.join(current, segment);
      const stats = fileSystem.lstatSync(current);
      if (stats.isSymbolicLink()) contractFail("lifecycle_path_symlink", "path component is a symlink", repositoryPath);
      components.push({ path: current, dev: stats.dev, ino: stats.ino, directory: stats.isDirectory() });
    }
  } catch (error) {
    if (error instanceof LifecycleDispositionError) throw error;
    contractFail("lifecycle_path_missing", "repository file is unavailable", repositoryPath);
  }
  const target = components.at(-1);
  if (!target || target.directory || !fileSystem.lstatSync(target.path).isFile()) contractFail("lifecycle_path_type_invalid", "repository path is not a regular file", repositoryPath);
  const canonicalTarget = nativeRealpath(fileSystem, target.path);
  const expectedTarget = path.resolve(canonicalRoot, ...repositoryPath.split("/"));
  if (canonicalTarget !== expectedTarget || !canonicalTarget.startsWith(`${canonicalRoot}${path.sep}`)) contractFail("lifecycle_path_invalid", "canonical path escapes repository", repositoryPath);
  const beforeInventory = inventoryReader ? inventoryReader() : inventory;
  const entry = beforeInventory?.get(repositoryPath);
  if (!entry) contractFail("lifecycle_path_untracked", "path has no authenticated repository inventory entry", repositoryPath);
  if (!/^(?:100644|100755)$/.test(entry.mode ?? "") || entry.stage !== "0") contractFail("lifecycle_path_git_mode_invalid", "path is not a stage-zero regular Git blob", repositoryPath);
  let descriptor;
  try {
    descriptor = fileSystem.openSync(target.path, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    const opened = fileSystem.fstatSync(descriptor);
    if (!opened.isFile() || opened.dev !== target.dev || opened.ino !== target.ino) contractFail("lifecycle_path_race", "path identity changed before read", repositoryPath);
    afterOpen?.({ descriptor, target: target.path });
    const bytes = fileSystem.readFileSync(descriptor);
    const afterDescriptor = fileSystem.fstatSync(descriptor);
    if (!afterDescriptor.isFile() || afterDescriptor.dev !== target.dev || afterDescriptor.ino !== target.ino) contractFail("lifecycle_path_race", "descriptor identity changed during read", repositoryPath);
    for (const component of components) {
      const stats = fileSystem.lstatSync(component.path);
      if (stats.isSymbolicLink() || stats.dev !== component.dev || stats.ino !== component.ino || stats.isDirectory() !== component.directory) contractFail("lifecycle_path_race", "path component identity changed during read", repositoryPath);
    }
    if (nativeRealpath(fileSystem, target.path) !== canonicalTarget) contractFail("lifecycle_path_race", "canonical path changed during read", repositoryPath);
    const afterInventory = inventoryReader ? inventoryReader() : inventory;
    const afterEntry = afterInventory?.get(repositoryPath);
    if (!afterEntry || afterEntry.mode !== entry.mode || afterEntry.stage !== entry.stage || afterEntry.oid !== entry.oid) contractFail("lifecycle_path_inventory_race", "repository inventory changed during read", repositoryPath);
    if (requireObjectMatch && (entry.oid.startsWith("prospective:") || gitBlobOid(bytes) !== entry.oid)) contractFail("lifecycle_receipt_not_authenticated", "receipt bytes do not equal their stage-zero repository blob", repositoryPath);
    return { bytes, entry };
  } catch (error) {
    if (error instanceof LifecycleDispositionError) throw error;
    const race = ["ELOOP", "ENOENT", "ENOTDIR"].includes(error?.code);
    contractFail(race ? "lifecycle_path_race" : "lifecycle_path_read_failed", race ? "path identity changed during read" : "descriptor-bound read failed", repositoryPath);
  } finally { if (descriptor !== undefined) fileSystem.closeSync(descriptor); }
}

function git(root, args) {
  const child = spawnSync("git", ["-C", root, ...args], { encoding: "buffer", maxBuffer: 16 * 1024 * 1024, timeout: 30_000 });
  if (child.status !== 0) contractFail("lifecycle_git_object_invalid", "immutable repository object is unavailable", "<git-object>");
  return child.stdout;
}
export function readImmutableGitObject({ afterResolve, commit, expectedBlob, expectedMode = "100644", expectedTree, repositoryPath, root }) {
  if (!/^[a-f0-9]{40}$/.test(commit ?? "") || typeof repositoryPath !== "string" || !pathPattern.test(repositoryPath)) contractFail("lifecycle_git_revision_invalid", "immutable revision or path is invalid", repositoryPath ?? "<git-object>");
  const type = git(root, ["cat-file", "-t", commit]).toString("utf8").trim();
  if (type !== "commit") contractFail("lifecycle_git_revision_invalid", "trusted revision is not a commit", repositoryPath);
  const tree = git(root, ["rev-parse", `${commit}^{tree}`]).toString("utf8").trim();
  if (expectedTree && tree !== expectedTree) contractFail("lifecycle_git_tree_mismatch", "trusted revision tree does not match the sealed tree", repositoryPath);
  const row = git(root, ["ls-tree", "-z", commit, "--", repositoryPath]).toString("utf8").replace(/\0$/, "");
  const match = /^(\d{6}) blob ([a-f0-9]{40})\t(.+)$/.exec(row);
  if (!match || match[3] !== repositoryPath) contractFail("lifecycle_git_path_missing", "path is absent from the immutable tree", repositoryPath);
  if (match[1] !== expectedMode) contractFail("lifecycle_git_mode_mismatch", "immutable tree mode is not the expected regular blob mode", repositoryPath);
  if (expectedBlob && match[2] !== expectedBlob) contractFail("lifecycle_git_blob_mismatch", "immutable tree blob does not match the sealed blob", repositoryPath);
  afterResolve?.({ blob: match[2], tree });
  const bytes = git(root, ["cat-file", "blob", match[2]]);
  if (git(root, ["cat-file", "-t", match[2]]).toString("utf8").trim() !== "blob") contractFail("lifecycle_git_blob_mismatch", "resolved object is not a blob", repositoryPath);
  return { blob: match[2], bytes, mode: match[1], tree };
}
export function readSealedSource({ afterOpen, expectedSha256, repositoryPath, root }) {
  const inventory = new Map([[repositoryPath, { mode: "100644", oid: `sealed:${expectedSha256}`, stage: "0" }]]);
  const result = readRepositoryFileSafely({ afterOpen, inventory, repositoryPath, root });
  if (sha256(result.bytes) !== expectedSha256) contractFail("lifecycle_source_content_mismatch", "working source does not match its sealed content identity", repositoryPath);
  return result;
}

export function retireSentinelWorkflow(activeBytes) {
  const bytes = Buffer.isBuffer(activeBytes) ? activeBytes : Buffer.from(activeBytes);
  const text = bytes.toString("utf8");
  const marker = "  chromium-calibration:\n";
  const start = text.indexOf(marker);
  if (start < 0 || text.indexOf(marker, start + marker.length) >= 0) contractFail("sentinel_workflow_identity_invalid", "workflow must contain exactly one canonical calibration job", SENTINEL_WORKFLOW_PATH);
  const job = bytes.subarray(Buffer.byteLength(text.slice(0, start)));
  const jobText = job.toString("utf8");
  const identities = [
    "    name: Chromium 20-run calibration (nonblocking)\n",
    "    if: github.event_name == 'pull_request' || github.event_name == 'workflow_dispatch'\n",
    "          for run in $(seq 1 20); do\n",
    "      - name: Upload raw Chromium calibration evidence\n",
  ];
  if (sha256(bytes) !== SENTINEL_ACTIVE_WORKFLOW_SHA256 || sha256(job) !== SENTINEL_JOB_SHA256 || identities.some((identity) => !jobText.includes(identity))) {
    contractFail("sentinel_workflow_content_mismatch", "workflow schedule, job identity, or bytes differ from the sealed recurring calibration", SENTINEL_WORKFLOW_PATH);
  }
  return Buffer.from(text.slice(0, start).replace(/\n\n$/, "\n"));
}

function closedDataObject(value, expectedKeys) {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return undefined;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string") || JSON.stringify(keys) !== JSON.stringify(expectedKeys)) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (expectedKeys.some((key) => !descriptors[key]?.enumerable || !("value" in descriptors[key]) || descriptors[key].get || descriptors[key].set)) return undefined;
    return Object.fromEntries(expectedKeys.map((key) => [key, descriptors[key].value]));
  } catch { return undefined; }
}

function deepPlainData(value, active = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return { ok: true, value };
  if (typeof value === "number") return Number.isFinite(value) ? { ok: true, value } : { ok: false };
  if (typeof value !== "object" || utilTypes.isProxy(value) || active.has(value)) return { ok: false };
  let prototype; let keys; let descriptors;
  try {
    prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null && prototype !== Array.prototype) return { ok: false };
    keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string" || key === "__proto__" || key === "prototype" || key === "constructor")) return { ok: false };
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch { return { ok: false }; }
  const array = Array.isArray(value);
  if (prototype === Array.prototype !== array) return { ok: false };
  const dataKeys = keys.filter((key) => !(array && key === "length"));
  if (array && (descriptors.length?.value !== value.length || descriptors.length?.enumerable !== false)) return { ok: false };
  if (array && dataKeys.some((key, index) => key !== String(index))) return { ok: false };
  if (dataKeys.some((key) => !descriptors[key]?.enumerable || !("value" in descriptors[key]) || descriptors[key].get || descriptors[key].set)) return { ok: false };
  active.add(value);
  const copy = array ? [] : {};
  for (const key of dataKeys) {
    const child = deepPlainData(descriptors[key].value, active);
    if (!child.ok) { active.delete(value); return { ok: false }; }
    copy[key] = child.value;
  }
  active.delete(value);
  return { ok: true, value: copy };
}

function rfc3339Nanoseconds(value) {
  if (!isRfc3339DateTime(value)) return undefined;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || (match[2]?.length ?? 0) > 9) return undefined;
  const seconds = Date.parse(`${match[1]}${match[3]}`);
  if (!Number.isFinite(seconds)) return undefined;
  return BigInt(seconds) * 1_000_000n + BigInt((match[2] ?? "").padEnd(9, "0"));
}

function archiveTreeSnapshot({ commit, root, tree }) {
  if (!/^[a-f0-9]{40}$/.test(commit ?? "") || !/^[a-f0-9]{40}$/.test(tree ?? "")) contractFail("sentinel_archive_object_invalid", "archive commit and tree must be full immutable object IDs", "<sentinel-archive>");
  if (git(root, ["cat-file", "-t", commit]).toString("utf8").trim() !== "commit") contractFail("sentinel_archive_object_invalid", "archive commit object is unavailable", "<sentinel-archive>");
  const resolvedTree = git(root, ["rev-parse", `${commit}^{tree}`]).toString("utf8").trim();
  if (resolvedTree !== tree) contractFail("sentinel_archive_tree_mismatch", "archive commit does not resolve to the declared tree", "<sentinel-archive>");
  const raw = git(root, ["ls-tree", "-r", "-z", commit]).toString("utf8").split("\0").filter(Boolean);
  const entries = new Map();
  for (const row of raw) {
    const match = /^(\d{6}) blob ([a-f0-9]{40})\t(.+)$/.exec(row);
    if (!match || !pathPattern.test(match[3]) || entries.has(match[3])) contractFail("sentinel_archive_tree_invalid", "archive tree contains an unsupported object or path", "<sentinel-archive>");
    entries.set(match[3], { blob: match[2], mode: match[1] });
  }
  const bytes = new Map();
  for (const [repositoryPath, entry] of entries) {
    if (entry.mode !== "100644") continue;
    if (git(root, ["cat-file", "-t", entry.blob]).toString("utf8").trim() !== "blob") contractFail("sentinel_archive_blob_invalid", "archive path does not resolve to a blob", `archive/${repositoryPath}`);
    bytes.set(repositoryPath, git(root, ["cat-file", "blob", entry.blob]));
  }
  return { bytes, entries };
}

function archiveDigest(snapshot) {
  const lines = [...snapshot.bytes].filter(([repositoryPath]) => /^run-\d{2}\//.test(repositoryPath)).sort(([left], [right]) => compareUtf8(left, right)).map(([repositoryPath, bytes]) => `${repositoryPath}:${sha256(bytes)}`);
  return sha256(Buffer.from(lines.join("\n"), "utf8"));
}

export function sentinelRawEvidenceDigest(options) {
  const input = closedDataObject(options, ["root", "commit", "tree"]);
  if (!input) contractFail("sentinel_archive_api_invalid", "archive API requires only root, commit, and tree data properties", "<sentinel-archive>");
  return archiveDigest(archiveTreeSnapshot(input));
}

function stableArchiveFinding(failure, materializedRoot) {
  let stablePath = "<sentinel-archive>";
  if (typeof failure?.path === "string") {
    const relative = path.relative(materializedRoot, failure.path);
    if (relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) stablePath = `archive/${relative.split(path.sep).join("/")}`;
    else if (/^run-\d{2}(?:\/|$)/.test(failure.path)) stablePath = `archive/${failure.path}`;
  }
  const message = typeof failure?.message === "string" && !failure.message.includes(materializedRoot) && !path.isAbsolute(failure.message) ? failure.message : "archive validation failed at the declared boundary";
  return { code: typeof failure?.code === "string" ? failure.code : "sentinel_archive_invalid", message, path: stablePath };
}

export function validateSentinelArchive(options) {
  const failures = [];
  const add = (code, message, recordPath = "<sentinel-archive>") => failures.push({ code, message, path: recordPath });
  const input = closedDataObject(options, ["root", "commit", "tree"]);
  if (!input) return { computedRawDigest: null, failures: [{ code: "sentinel_archive_api_invalid", message: "archive API requires only root, commit, and tree data properties", path: "<sentinel-archive>" }], ok: false, runs: 0 };
  let materializedRoot;
  let parsedRuns = 0;
  let computedRawDigest = null;
  try {
    const snapshot = archiveTreeSnapshot(input);
    const allowedExtras = new Set(["calibration.json", "calibration-validation.json", "workflow-metadata.json"]);
    for (const [repositoryPath, entry] of snapshot.entries) {
      if (entry.mode !== "100644") add("sentinel_archive_mode_invalid", "archive entries must be regular 100644 blobs", `archive/${repositoryPath}`);
      if (!/^run-(?:0[1-9]|1\d|20)\/(?:actual\.png|ax\.txt|comparison\.json|dom\.html|exit\.json|metadata\.json|playwright\.json|playwright\.stderr)$/.test(repositoryPath) && !allowedExtras.has(repositoryPath)) add("sentinel_archive_path_unknown", "archive contains a path outside the exact upload closure", `archive/${repositoryPath}`);
    }
    materializedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stylegallery-sentinel-immutable-"));
    for (let run = 1; run <= 20; run += 1) {
      const runName = `run-${String(run).padStart(2, "0")}`;
      const runRoot = path.join(materializedRoot, runName);
      fs.mkdirSync(runRoot);
      const members = [...snapshot.bytes].filter(([repositoryPath]) => repositoryPath.startsWith(`${runName}/`));
      if (members.length === 0) { add("sentinel_archive_run_missing", `${runName} is absent from the immutable tree`, `archive/${runName}`); continue; }
      for (const [repositoryPath, bytes] of members) fs.writeFileSync(path.join(materializedRoot, repositoryPath), bytes, { flag: "wx", mode: 0o600 });
      const runFailures = [];
      if (parseCalibrationRun(runRoot, run, runFailures)) parsedRuns += 1;
      failures.push(...runFailures.map((failure) => stableArchiveFinding(failure, materializedRoot)));
    }
    computedRawDigest = archiveDigest(snapshot);
    if (parsedRuns === 20 && computedRawDigest !== "1f125d5b321063b364e19283897c78c126d73eb1b3368d14686c494b1296dfab") add("sentinel_archive_raw_digest_mismatch", "20-run raw evidence does not match the source-bound aggregate digest");
  } catch (error) {
    const code = error instanceof LifecycleDispositionError && error.code.startsWith("sentinel_archive_") ? error.code : "sentinel_archive_invalid";
    add(code, error instanceof LifecycleDispositionError ? error.message : "archive validation failed at the immutable object boundary", error instanceof LifecycleDispositionError && String(error.path).startsWith("archive/") ? error.path : "<sentinel-archive>");
  } finally { if (materializedRoot) fs.rmSync(materializedRoot, { recursive: true, force: true }); }
  const unique = [...new Map(failures.map((failure) => [`${failure.code}:${failure.path}:${failure.message}`, failure])).values()];
  return { computedRawDigest, failures: unique, ok: unique.length === 0, runs: parsedRuns };
}

function sentinelBundleDiff(root, baseCommit, candidateCommit) {
  const child = spawnSync("git", ["-C", root, "diff-tree", "--no-commit-id", "--raw", "-r", "-z", baseCommit, candidateCommit], { encoding: "buffer", timeout: 30_000 });
  if (child.status !== 0) contractFail("sentinel_bundle_git_invalid", "candidate diff objects are unavailable", "<sentinel-bundle>");
  const fields = child.stdout.toString("utf8").split("\0").filter(Boolean);
  const rows = [];
  for (let index = 0; index < fields.length;) {
    const header = fields[index++];
    const match = /^:(\d{6}) (\d{6}) ([a-f0-9]{40}) ([a-f0-9]{40}) ([A-Z])(\d+)?$/.exec(header);
    if (!match || index >= fields.length) contractFail("sentinel_bundle_diff_invalid", "candidate diff is not a closed ordinary Git path change", "<sentinel-bundle>");
    const row = { oldMode: match[1], newMode: match[2], oldBlob: match[3], newBlob: match[4], status: match[5], path: fields[index++] };
    if (["R", "C"].includes(row.status)) row.destination = fields[index++];
    rows.push(row);
  }
  return rows;
}

export function retirePageEvidenceWorkflow(activeBytes) {
  const bytes = Buffer.isBuffer(activeBytes) ? activeBytes : Buffer.from(activeBytes);
  const text = bytes.toString("utf8");
  const marker = "  consumer-page-evidence:\n";
  const nextMarker = "\n  chromium-sentinel:\n";
  const start = text.indexOf(marker);
  const end = text.indexOf(nextMarker, start);
  if (start < 0 || end < 0 || text.indexOf(marker, start + marker.length) >= 0) contractFail("page_evidence_workflow_identity_invalid", "workflow must contain exactly one canonical synthetic page-evidence job", PAGE_WORKFLOW_PATH);
  const job = Buffer.from(text.slice(start, end + 1));
  const jobText = job.toString("utf8");
  const identities = [
    "    name: Consumer page-evidence raster capture (nonblocking)\n",
    "    if: github.event_name == 'pull_request' || github.event_name == 'workflow_dispatch'\n",
    "      PAGE_EVIDENCE_CASE_ID: state-w1024-focus\n",
    "GITHUB_SHA=\"$consumer_sha\" node scripts/create-page-evidence-session.mjs",
    "            node scripts/finalize-page-evidence.mjs",
    "            node scripts/validate-page-evidence.mjs",
  ];
  if (sha256(bytes) !== PAGE_ACTIVE_WORKFLOW_SHA256 || sha256(job) !== PAGE_JOB_SHA256 || identities.some((identity) => !jobText.includes(identity))) {
    contractFail("page_evidence_workflow_content_mismatch", "workflow schedule, job identity, state contract, or bytes differ from the sealed synthetic job", PAGE_WORKFLOW_PATH);
  }
  return Buffer.from(text.slice(0, start) + text.slice(end + 1));
}

export function normalizedRepositoryIdentity(value) {
  if (typeof value !== "string" || value.length === 0 || value !== value.normalize("NFKC") || /[\\\u0000-\u001f\u007f]/u.test(value)) return undefined;
  let candidate = value.trim().replace(/\.git$/iu, "");
  const scp = /^[^@]+@[^:]+:(.+)$/u.exec(candidate);
  if (scp) candidate = scp[1];
  else if (/^[a-z][a-z0-9+.-]*:\/\//iu.test(candidate)) {
    try { candidate = decodeURIComponent(new URL(candidate).pathname).replace(/^\/+/, ""); } catch { return undefined; }
  }
  candidate = candidate.replace(/^\/+|\/+$/gu, "").toLowerCase();
  return /^[a-z0-9._-]+\/[a-z0-9._-]+$/u.test(candidate) ? candidate : undefined;
}

function gitText(root, args, code = "page_evidence_adopter_lineage_invalid") {
  const child = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", timeout: 30_000 });
  if (child.status !== 0) contractFail(code, "authenticated repository lineage check failed", "<page-evidence-adopter>");
  return child.stdout.trim();
}

function pageEvidenceObject(root, commit, tree, binding) {
  const closed = closedDataObject(binding, ["path", "blob_oid", "sha256"]);
  if (!closed || !pathPattern.test(closed.path ?? "") || !/^[a-f0-9]{40}$/.test(closed.blob_oid ?? "") || !/^[a-f0-9]{64}$/.test(closed.sha256 ?? "")) contractFail("page_evidence_adopter_evidence_invalid", "evidence object binding is not closed", "<page-evidence-adopter>");
  const object = readImmutableGitObject({ root, commit, expectedTree: tree, expectedBlob: closed.blob_oid, expectedMode: "100644", repositoryPath: closed.path });
  if (sha256(object.bytes) !== closed.sha256) contractFail("page_evidence_adopter_evidence_mismatch", "evidence object bytes differ from immutable trust", closed.path);
  return object.bytes;
}

function stablePagePacketFailures(report) {
  return (report?.failures ?? []).map((failure) => ({ code: failure.code ?? "page_evidence_adopter_packet_invalid", message: "receipt-bound page-evidence validation failed", path: typeof failure.path === "string" && !path.isAbsolute(failure.path) ? failure.path : "<page-evidence-packet>" }));
}

function validateTrustedPagePacket({ evidence, evidenceCommit, evidenceTree, root, sourceClosure, validatorRoot }) {
  const materialized = fs.mkdtempSync(path.join(repositoryRoot, ".tmp-page-adopter-packet-"));
  try {
    spawnSync("git", ["init", "-q"], { cwd: materialized });
    spawnSync("git", ["remote", "add", "origin", gitText(root, ["config", "--get", "remote.origin.url"])], { cwd: materialized });
    for (const source of sourceClosure) {
      const item = readImmutableGitObject({ root, commit: source.commit, expectedTree: source.tree, expectedBlob: source.blob, expectedMode: "100644", repositoryPath: source.path });
      if (sha256(item.bytes) !== source.sha256) contractFail("page_evidence_adopter_closure_mismatch", "consumer source closure bytes differ from configured identities", source.path);
      const target = path.join(materialized, source.path); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, item.bytes);
    }
    spawnSync("git", ["add", "--", ...sourceClosure.map(({ path: sourcePath }) => sourcePath)], { cwd: materialized });
    const tree = gitText(materialized, ["write-tree"]);
    if (tree !== sourceClosure[0]?.tree) contractFail("page_evidence_adopter_closure_mismatch", "materialized source tree differs from authenticated consumer tree", "<page-evidence-adopter>");
    const commitBytes = git(root, ["cat-file", "commit", sourceClosure[0].commit]);
    const materializedCommit = spawnSync("git", ["hash-object", "-w", "-t", "commit", "--stdin"], { cwd: materialized, input: commitBytes, encoding: "utf8" }).stdout.trim();
    if (materializedCommit !== sourceClosure[0].commit) contractFail("page_evidence_adopter_lineage_invalid", "consumer commit bytes are not reproducible", "<page-evidence-adopter>");
    gitText(materialized, ["update-ref", "refs/heads/main", materializedCommit]);
    gitText(materialized, ["symbolic-ref", "HEAD", "refs/heads/main"]);
    const bindings = [evidence.packet, evidence.session, evidence.runner, evidence.capture, evidence.conformance];
    for (const binding of bindings) {
      const bytes = pageEvidenceObject(root, evidenceCommit, evidenceTree, binding);
      const target = path.join(materialized, binding.path); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes);
    }
    const artifactRoot = path.dirname(path.join(materialized, evidence.packet.path));
    const child = spawnSync(process.execPath, [path.join(validatorRoot, "scripts/validate-page-evidence.mjs"), "--root", materialized, "--artifact-root", artifactRoot, "--json"], { cwd: validatorRoot, encoding: "utf8", timeout: 30_000 });
    let report; try { report = JSON.parse(child.stdout); } catch { report = { failures: [{ code: "page_evidence_adopter_packet_invalid" }] }; }
    return { failures: stablePagePacketFailures(report), ok: child.status === 0 && report.ok === true };
  } finally { fs.rmSync(materialized, { recursive: true, force: true }); }
}

export function pageEvidenceChronologyCode(options) {
  const input = closedDataObject(options, ["consumerCommittedAt", "sessionStartedAt", "captureRecordedAt", "sessionCompletedAt", "validatedAt", "recordedAt", "asOf"]);
  if (!input) return "page_evidence_adopter_chronology_invalid";
  const chronology = [rfc3339Nanoseconds("2026-07-30T08:52:29Z"), ...Object.values(input).map(rfc3339Nanoseconds)];
  return chronology.some((instant) => instant === undefined) || chronology.slice(1).some((instant, index) => instant < chronology[index]) ? "page_evidence_adopter_chronology_invalid" : undefined;
}

export function validatePageEvidenceAdopterReceipt(options) {
  const failures = [];
  const add = (code, message, recordPath = "<page-evidence-adopter>") => failures.push({ code, message, path: recordPath });
  const input = closedDataObject(options, ["asOf", "reference"]);
  if (!input) return { failures: [{ code: "page_evidence_adopter_api_invalid", message: "adopter API requires only asOf and reference data properties", path: "<page-evidence-adopter>" }], ok: false };
  const reference = closedDataObject(input.reference, ["commit", "path", "blob_oid", "sha256"]);
  if (!reference || !/^[a-f0-9]{40}$/.test(reference.commit ?? "") || !/^[a-f0-9]{40}$/.test(reference.blob_oid ?? "") || !/^[a-f0-9]{64}$/.test(reference.sha256 ?? "") || !pathPattern.test(reference.path ?? "")) {
    add("page_evidence_adopter_reference_invalid", "adopter reference must bind one immutable commit, path, blob, and SHA-256"); return { failures, ok: false };
  }
  const trust = PAGE_ADOPTER_TRUST_ROOTS.find((entry) => entry.receipt_commit === reference.commit);
  if (!trust) { add("page_evidence_adopter_commit_untrusted", "adopter commit is absent from the immutable consumer trust configuration", reference.path); return { failures, ok: false }; }
  try {
    const root = trust.repository_root;
    const stats = fs.lstatSync(root); const canonicalRoot = fs.realpathSync(root);
    if (!stats.isDirectory() || stats.isSymbolicLink() || sha256(Buffer.from(canonicalRoot)) !== trust.repository_root_sha256 || stats.dev !== trust.repository_root_dev || stats.ino !== trust.repository_root_ino) contractFail("page_evidence_adopter_repository_untrusted", "repository boundary differs from immutable trust", reference.path);
    if (gitText(root, ["config", "--get", "remote.origin.url"]) !== trust.remote_url || normalizedRepositoryIdentity(trust.remote_url) !== trust.repository) contractFail("page_evidence_adopter_repository_untrusted", "remote identity differs from immutable trust", reference.path);
    if (gitText(root, ["rev-parse", trust.authenticated_ref]) !== trust.lineage_root_commit) contractFail("page_evidence_adopter_lineage_invalid", "authenticated immutable ref differs from trust root", reference.path);
    for (const [ancestor, descendant] of [[trust.lineage_root_commit, trust.consumer_commit], [trust.consumer_commit, trust.evidence_commit], [trust.evidence_commit, trust.receipt_commit]]) gitText(root, ["merge-base", "--is-ancestor", ancestor, descendant]);
    if (reference.path !== trust.receipt_path || reference.blob_oid !== trust.receipt_blob || reference.sha256 !== trust.receipt_sha256) contractFail("page_evidence_adopter_reference_mismatch", "receipt reference differs from configured consumer closure", reference.path);
    const object = readImmutableGitObject({ root, commit: reference.commit, expectedTree: trust.receipt_tree, expectedBlob: trust.receipt_blob, expectedMode: "100644", repositoryPath: reference.path });
    if (sha256(object.bytes) !== trust.receipt_sha256) contractFail("page_evidence_adopter_receipt_hash_mismatch", "receipt bytes differ from configured digest", reference.path);
    const receipt = parseStrictJson(object.bytes.toString("utf8"));
    const keys = ["schema_version", "receipt_kind", "family", "caller_owner", "consumer", "adapter_version", "consumed", "evidence", "validation", "recorded_at", "migration"];
    if (!sameValue(Object.keys(receipt), keys)) contractFail("page_evidence_adopter_receipt_invalid", "receipt fields are not the closed adopter contract", reference.path);
    const repository = normalizedRepositoryIdentity(receipt.consumer?.repository);
    if (!repository) contractFail("page_evidence_adopter_repository_invalid", "consumer repository identity is not canonical", reference.path);
    if (PAGE_SYNTHETIC_REPOSITORIES.includes(repository)) contractFail("page_evidence_adopter_self_consumption", "StyleGallery and synthetic repositories cannot establish adoption", reference.path);
    if (repository !== trust.repository || receipt.consumer?.commit !== trust.consumer_commit || receipt.consumer?.tree !== trust.consumer_tree || receipt.caller_owner !== trust.caller_owner) contractFail("page_evidence_adopter_identity_mismatch", "consumer owner, repository, commit, or tree differs from immutable trust", reference.path);
    if (receipt.schema_version !== "1.0" || receipt.receipt_kind !== "page-evidence-real-consumer-adoption" || receipt.family !== "page-evidence-adoption" || receipt.adapter_version !== trust.adapter_version) contractFail("page_evidence_adopter_version_mismatch", "receipt family or adapter version differs from configured adoption", reference.path);
    if (!Array.isArray(receipt.consumed?.stable_refs) || !Array.isArray(receipt.consumed?.version_ids) || !sameValue(receipt.consumed, trust.consumed)) contractFail("page_evidence_adopter_consumption_mismatch", "consumed StableRefs and VersionIDs differ from immutable trust", reference.path);
    if (!sameValue(receipt.evidence, trust.evidence)) contractFail("page_evidence_adopter_evidence_mismatch", "packet, capture, source, schema, or object identity differs from immutable trust", reference.path);
    if (receipt.validation?.result !== "passed" || receipt.validation?.validator_version !== trust.validator_version || !sameValue(receipt.migration, trust.migration)) contractFail("page_evidence_adopter_validation_failed", "receipt validation or migration binding is invalid", reference.path);
    const packet = validateTrustedPagePacket({ evidence: trust.evidence, evidenceCommit: trust.evidence_commit, evidenceTree: trust.evidence_tree, root, sourceClosure: trust.source_closure, validatorRoot: repositoryRoot });
    if (!packet.ok) { failures.push(...packet.failures); return { failures, ok: false }; }
    const session = parseStrictJson(pageEvidenceObject(root, trust.evidence_commit, trust.evidence_tree, trust.evidence.session).toString("utf8"));
    const manifest = parseStrictJson(pageEvidenceObject(root, trust.evidence_commit, trust.evidence_tree, trust.evidence.packet).toString("utf8"));
    const runner = parseStrictJson(pageEvidenceObject(root, trust.evidence_commit, trust.evidence_tree, trust.evidence.runner).toString("utf8"));
    const chronologyCode = pageEvidenceChronologyCode({
      consumerCommittedAt: gitText(root, ["show", "-s", "--format=%cI", trust.consumer_commit]), sessionStartedAt: session.started_at,
      captureRecordedAt: runner.recorded_at, sessionCompletedAt: manifest.completed_at, validatedAt: receipt.validation.validated_at,
      recordedAt: receipt.recorded_at, asOf: input.asOf,
    });
    if (chronologyCode) contractFail(chronologyCode, "consumer, session, capture, validation, recording, and decision times must be causal and not future", reference.path);
    return { failures: [], ok: true, receipt };
  } catch (error) {
    add(error instanceof LifecycleDispositionError ? error.code : "page_evidence_adopter_receipt_invalid", error instanceof LifecycleDispositionError ? error.message : "immutable adopter inspection failed", error instanceof LifecycleDispositionError ? error.path : reference.path);
    return { failures, ok: false };
  }
}

const PAGE_ARCHIVE_PACKET = Object.freeze([
  "packet/page-evidence-manifest.json", "packet/page-evidence-session.json",
  "packet/runner/responsive-layout.json", "packet/captures/responsive-layout-state-w1024-focus.png",
  "records/consumer-conformance.json", "provenance/source-commit.txt",
]);
const PAGE_ARCHIVE_PROTECTED = Object.freeze(PAGE_PROTECTED.map(([repositoryPath, expectedSha, role]) => {
  if (repositoryPath === "tests/consumer-conformance.spec.mjs") return [repositoryPath, "a7b7e117fff636830029e9923fc828ed92d1d22ac91f3efde338eb154b0101e7", role];
  if (repositoryPath === "tests/fixtures/consumer-conformance-scenarios.mjs") return [repositoryPath, "67aa1931764237ee9485d0e81606c2721297e2c3517a321be4c4e945149fbe58", role];
  return [repositoryPath, expectedSha, role];
}));
const PAGE_ARCHIVE_PATHS = Object.freeze([...PAGE_ARCHIVE_PROTECTED.map(([repositoryPath]) => repositoryPath), ...PAGE_ARCHIVE_PACKET].sort(compareUtf8));

function stablePageArchiveFailure(error) {
  const code = error instanceof LifecycleDispositionError && error.code.startsWith("page_evidence_archive_") ? error.code : "page_evidence_archive_invalid";
  return { code, message: error instanceof LifecycleDispositionError ? error.message : "archive validation failed at the immutable object boundary", path: "<page-evidence-archive>" };
}

export function validatePageEvidenceArchive(options) {
  const input = closedDataObject(options, ["root", "commit", "tree"]);
  if (!input) return { failures: [{ code: "page_evidence_archive_api_invalid", message: "archive API requires only root, commit, and tree data properties", path: "<page-evidence-archive>" }], ok: false };
  const failures = [];
  let materialized;
  try {
    if (!/^[a-f0-9]{40}$/.test(input.commit ?? "") || !/^[a-f0-9]{40}$/.test(input.tree ?? "")) contractFail("page_evidence_archive_object_invalid", "archive commit and tree must be immutable object IDs", "<page-evidence-archive>");
    if (git(input.root, ["cat-file", "-t", input.commit]).toString("utf8").trim() !== "commit") contractFail("page_evidence_archive_object_invalid", "archive commit is unavailable", "<page-evidence-archive>");
    if (git(input.root, ["rev-parse", `${input.commit}^{tree}`]).toString("utf8").trim() !== input.tree) contractFail("page_evidence_archive_tree_mismatch", "archive commit does not resolve to the declared tree", "<page-evidence-archive>");
    const rows = git(input.root, ["ls-tree", "-r", "-z", input.commit]).toString("utf8").split("\0").filter(Boolean);
    const entries = new Map();
    for (const row of rows) {
      const match = /^(\d{6}) blob ([a-f0-9]{40})\t(.+)$/.exec(row);
      if (!match || !pathPattern.test(match[3]) || entries.has(match[3])) contractFail("page_evidence_archive_inventory_invalid", "archive contains an unsupported or duplicate path", "<page-evidence-archive>");
      if (match[1] !== "100644") contractFail("page_evidence_archive_mode_invalid", "archive entries must be ordinary 100644 blobs", `archive/${match[3]}`);
      entries.set(match[3], { blob: match[2], bytes: git(input.root, ["cat-file", "blob", match[2]]) });
    }
    const actualPaths = [...entries.keys()].sort(compareUtf8);
    if (!sameValue(actualPaths, PAGE_ARCHIVE_PATHS)) contractFail("page_evidence_archive_inventory_invalid", "archive path inventory differs from the exact retained closure", "<page-evidence-archive>");
    for (const [repositoryPath, expectedSha] of PAGE_ARCHIVE_PROTECTED) if (sha256(entries.get(repositoryPath).bytes) !== expectedSha) contractFail("page_evidence_archive_protected_mismatch", "retained schema, validator, source, fixture, documentation, or state contract differs", `archive/${repositoryPath}`);
    if (sha256(entries.get("packet/page-evidence-manifest.json").bytes) !== "ae15a272a6f952db2f0090e07e0d07d47d352b138ba97aa29dbfbec451f23cbe" || sha256(entries.get("packet/captures/responsive-layout-state-w1024-focus.png").bytes) !== "2496b1cf9d3ac6dcda8d255ed7c606f8994836892614c9f8eccdd3206a8f933b") contractFail("page_evidence_archive_packet_mismatch", "packet or capture bytes differ from the sealed retrieval identity", "<page-evidence-archive>");
    materialized = fs.mkdtempSync(path.join(repositoryRoot, ".tmp-page-archive-"));
    for (const [repositoryPath, entry] of entries) { const target = path.join(materialized, repositoryPath); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, entry.bytes); }
    spawnSync("git", ["init", "-q"], { cwd: materialized });
    spawnSync("git", ["remote", "add", "origin", "https://github.com/example/stylegallery-page-evidence-ci.git"], { cwd: materialized });
    const session = parseStrictJson(entries.get("packet/page-evidence-session.json").bytes.toString("utf8"));
    const manifest = parseStrictJson(entries.get("packet/page-evidence-manifest.json").bytes.toString("utf8"));
    const sourcePaths = session.source?.files?.map(({ path: sourcePath }) => sourcePath);
    if (!Array.isArray(sourcePaths) || !sameValue(sourcePaths, [...sourcePaths].sort(compareUtf8)) || new Set(sourcePaths).size !== sourcePaths.length || session.source?.sha256 !== "bb6c565e287908dfa0966870535fc0ba7cdba0cd55852aaad45b90d00b6003dd") contractFail("page_evidence_archive_source_invalid", "archive session source inventory or digest is not the sealed unique order", "archive/packet/page-evidence-session.json");
    const conformancePath = session.conformance_record?.path;
    if (conformancePath !== "records/consumer-conformance.json") contractFail("page_evidence_archive_source_invalid", "archive conformance identity differs from the session", "archive/packet/page-evidence-session.json");
    spawnSync("git", ["add", "--", ...sourcePaths], { cwd: materialized });
    const sourceTree = gitText(materialized, ["write-tree"], "page_evidence_archive_source_invalid");
    const rawCommit = entries.get("provenance/source-commit.txt").bytes;
    const declaredTree = /^tree ([a-f0-9]{40})$/m.exec(rawCommit.toString("utf8"))?.[1];
    if (declaredTree !== sourceTree) contractFail("page_evidence_archive_source_invalid", "source commit tree differs from retained source bytes", "archive/provenance/source-commit.txt");
    const sourceCommit = spawnSync("git", ["hash-object", "-w", "-t", "commit", "--stdin"], { cwd: materialized, input: rawCommit, encoding: "utf8" }).stdout.trim();
    if (sourceCommit !== session.revision || manifest.revision !== sourceCommit) contractFail("page_evidence_archive_source_invalid", "packet revision differs from retained source commit", "archive/provenance/source-commit.txt");
    gitText(materialized, ["update-ref", "refs/heads/main", sourceCommit], "page_evidence_archive_source_invalid"); gitText(materialized, ["symbolic-ref", "HEAD", "refs/heads/main"], "page_evidence_archive_source_invalid");
    const child = spawnSync(process.execPath, [path.join(repositoryRoot, "scripts/validate-page-evidence.mjs"), "--root", materialized, "--artifact-root", path.join(materialized, "packet"), "--json"], { cwd: repositoryRoot, encoding: "utf8", timeout: 30_000 });
    let report; try { report = JSON.parse(child.stdout); } catch { report = { failures: [{ code: "page_evidence_archive_packet_invalid" }] }; }
    if (child.status !== 0 || report.ok !== true || report.scenarioCount !== 1 || report.artifactCount !== 1 || report.sessionId !== session.session_id || manifest.scenarios?.[0]?.id !== "responsive-layout" || manifest.scenarios?.[0]?.evidence?.artifacts?.[0]?.path !== "captures/responsive-layout-state-w1024-focus.png") contractFail("page_evidence_archive_packet_invalid", "retained packet fails schema, source, session, finalization, capture, or state-w1024-focus validation", "<page-evidence-archive>");
    return { artifactCount: 1, failures: [], ok: true, pathCount: actualPaths.length, scenarioCount: 1, sessionId: session.session_id };
  } catch (error) { failures.push(stablePageArchiveFailure(error)); return { failures, ok: false }; }
  finally { if (materialized) fs.rmSync(materialized, { recursive: true, force: true }); }
}

export function validatePageEvidenceRetirementBundle(options) {
  const failures = [];
  const add = (code, message, recordPath = "<page-evidence-bundle>") => failures.push({ code, message, path: recordPath });
  const input = closedDataObject(options, ["asOf", "bundle", "root"]);
  if (!input) return { failures: [{ code: "page_evidence_api_options_invalid", message: "page-evidence API requires only asOf, bundle, and root data properties", path: "<page-evidence-bundle>" }], ok: false, state: "invalid" };
  const expectedKeys = ["schema_version", "family", "evaluated_at", "lifecycle_record_sha256", "workflow_active_sha256", "base_commit", "base_tree", "candidate_commit", "candidate_tree", "adopter_receipt"];
  const bundle = closedDataObject(input.bundle, expectedKeys);
  if (!bundle || bundle.schema_version !== "1.0" || bundle.family !== "page-evidence-adoption") return { failures: [{ code: "page_evidence_bundle_binding_invalid", message: "bundle must use the exact page-evidence contract", path: "<page-evidence-bundle>" }], ok: false };
  const asOfNs = rfc3339Nanoseconds(input.asOf); const evaluatedNs = rfc3339Nanoseconds(bundle.evaluated_at);
  if (asOfNs === undefined || evaluatedNs === undefined) add("page_evidence_clock_invalid", "an injected RFC3339 clock with at most nanosecond precision is required");
  else if (asOfNs !== evaluatedNs) add("page_evidence_clock_mismatch", "bundle clock must equal the injected instant");
  const recordBytes = fs.readFileSync(path.join(repositoryRoot, "consumer-reference/policies/lifecycle-page-evidence-adoption.json"));
  const record = parseStrictJson(recordBytes.toString("utf8"));
  if (bundle.lifecycle_record_sha256 !== sha256(recordBytes) || bundle.workflow_active_sha256 !== PAGE_ACTIVE_WORKFLOW_SHA256) add("page_evidence_bundle_binding_invalid", "bundle must bind the exact lifecycle record and active workflow");
  let baseWorkflow; let candidateWorkflow; let diff = [];
  try { baseWorkflow = readImmutableGitObject({ root: input.root, commit: bundle.base_commit, expectedTree: bundle.base_tree, expectedMode: "100644", repositoryPath: PAGE_WORKFLOW_PATH }); }
  catch (error) { add("page_evidence_base_tree_mismatch", error instanceof Error ? error.message : String(error), PAGE_WORKFLOW_PATH); }
  try { candidateWorkflow = readImmutableGitObject({ root: input.root, commit: bundle.candidate_commit, expectedTree: bundle.candidate_tree, expectedMode: "100644", repositoryPath: PAGE_WORKFLOW_PATH }); }
  catch (error) { add("page_evidence_candidate_tree_mismatch", error instanceof Error ? error.message : String(error), PAGE_WORKFLOW_PATH); }
  try { diff = sentinelBundleDiff(input.root, bundle.base_commit, bundle.candidate_commit); }
  catch { add("page_evidence_bundle_diff_invalid", "candidate diff objects are unavailable"); }
  if (baseWorkflow && sha256(baseWorkflow.bytes) !== PAGE_ACTIVE_WORKFLOW_SHA256) add("page_evidence_workflow_content_mismatch", "base workflow differs from sealed active bytes", PAGE_WORKFLOW_PATH);
  for (const [repositoryPath, expectedSha] of PAGE_PROTECTED) try {
    const base = readImmutableGitObject({ root: input.root, commit: bundle.base_commit, expectedTree: bundle.base_tree, expectedMode: "100644", repositoryPath });
    const candidate = readImmutableGitObject({ root: input.root, commit: bundle.candidate_commit, expectedTree: bundle.candidate_tree, expectedMode: "100644", repositoryPath });
    if (base.blob !== candidate.blob || sha256(base.bytes) !== expectedSha || sha256(candidate.bytes) !== expectedSha) add("page_evidence_protected_content_mismatch", "protected page-evidence content differs from sealed bytes", repositoryPath);
  } catch (error) { add("page_evidence_protected_content_mismatch", error instanceof Error ? error.message : String(error), repositoryPath); }
  let adopted = false;
  if (bundle.adopter_receipt !== null) {
    const result = validatePageEvidenceAdopterReceipt({ asOf: input.asOf, reference: bundle.adopter_receipt });
    failures.push(...result.failures); adopted = result.ok;
  }
  const active = candidateWorkflow && sha256(candidateWorkflow.bytes) === PAGE_ACTIVE_WORKFLOW_SHA256;
  const retired = candidateWorkflow && sha256(candidateWorkflow.bytes) === PAGE_RETIRED_WORKFLOW_SHA256;
  const exactActive = active && diff.length === 0 && bundle.base_commit === bundle.candidate_commit && bundle.base_tree === bundle.candidate_tree;
  const exactRetired = retired && diff.length === 1 && diff[0].path === PAGE_WORKFLOW_PATH && diff[0].status === "M" && diff[0].oldMode === "100644" && diff[0].newMode === "100644" && diff[0].oldBlob === baseWorkflow?.blob && diff[0].newBlob === candidateWorkflow?.blob;
  if (!exactActive && !exactRetired) add("page_evidence_bundle_diff_invalid", "candidate must be unchanged active bytes or the exact one-job retirement", PAGE_WORKFLOW_PATH);
  if (!active && !retired) add("page_evidence_workflow_content_mismatch", "candidate workflow is neither sealed active nor exact retired bytes", PAGE_WORKFLOW_PATH);
  const dueNs = rfc3339Nanoseconds(record.due_at); const expired = asOfNs !== undefined && dueNs !== undefined && asOfNs >= dueNs;
  if (adopted && !active) add("page_evidence_adopter_requires_active", "authenticated adoption requires synthetic CI to remain active", PAGE_WORKFLOW_PATH);
  else if (!adopted && !expired && !active) add("page_evidence_retirement_before_due", "synthetic CI cannot retire before due_at", PAGE_WORKFLOW_PATH);
  else if (!adopted && expired && !retired) add("page_evidence_retirement_bundle_required", "expired no-adopter state requires exact atomic retirement", PAGE_WORKFLOW_PATH);
  const unique = [...new Map(failures.map((failure) => [`${failure.code}:${failure.path}:${failure.message}`, failure])).values()];
  return { failures: unique, ok: unique.length === 0, state: adopted ? "adopted_active" : expired ? "expired_retired" : "pending_active" };
}

export function validateSentinelRetirementBundle(options) {
  const failures = [];
  const add = (code, message, recordPath = "<sentinel-bundle>") => failures.push({ code, message, path: recordPath });
  const input = closedDataObject(options, ["asOf", "bundle", "root"]);
  if (!input) return { failures: [{ code: "sentinel_api_options_invalid", message: "sentinel API requires only asOf, bundle, and root data properties", path: "<sentinel-bundle>" }], ok: false, state: "invalid" };
  const { asOf, bundle: suppliedBundle, root } = input;
  const expectedKeys = ["schema_version", "family", "evaluated_at", "lifecycle_record_sha256", "baseline_manifest_sha256", "workflow_active_sha256", "raw_evidence_sha256", "base_commit", "base_tree", "candidate_commit", "candidate_tree", "approval_receipt"];
  const bundle = closedDataObject(suppliedBundle, expectedKeys);
  if (!bundle || bundle.schema_version !== "1.0" || bundle.family !== "sentinel-calibration") {
    add("sentinel_bundle_binding_invalid", "bundle must use the exact sentinel-calibration contract");
    return { failures, ok: false };
  }
  const asOfNanoseconds = rfc3339Nanoseconds(asOf);
  const bundleNanoseconds = rfc3339Nanoseconds(bundle.evaluated_at);
  const baselineNanoseconds = rfc3339Nanoseconds("2026-07-30T08:52:29Z");
  if (asOfNanoseconds === undefined || bundleNanoseconds === undefined) add("sentinel_clock_invalid", "an injected RFC3339 clock with at most nanosecond precision is required");
  else {
    if (asOfNanoseconds !== bundleNanoseconds) add("sentinel_clock_mismatch", "bundle clock must equal the normalized injected instant");
    if (asOfNanoseconds < baselineNanoseconds) add("sentinel_clock_rollback", "clock precedes the sealed lifecycle baseline");
  }
  const canonicalRecordPath = path.join(repositoryRoot, "consumer-reference/policies/lifecycle-sentinel-calibration.json");
  const canonicalRecordBytes = fs.readFileSync(canonicalRecordPath);
  const record = parseStrictJson(canonicalRecordBytes.toString("utf8"));
  const retirement = record.retirement;
  if (!retirement || retirement.workflow?.active_sha256 !== SENTINEL_ACTIVE_WORKFLOW_SHA256) add("sentinel_record_binding_invalid", "canonical lifecycle retirement binding is unavailable");
  if (bundle.lifecycle_record_sha256 !== sha256(canonicalRecordBytes)
    || bundle.baseline_manifest_sha256 !== retirement?.baseline_manifest?.sha256
    || bundle.workflow_active_sha256 !== SENTINEL_ACTIVE_WORKFLOW_SHA256
    || bundle.raw_evidence_sha256 !== retirement?.raw_evidence?.raw_evidence_sha256) {
    add("sentinel_bundle_binding_invalid", "bundle must bind the exact lifecycle record, baseline manifest, active workflow, and raw 20-run evidence");
  }
  const shaPattern = /^[a-f0-9]{40}$/;
  if (![bundle.base_commit, bundle.base_tree, bundle.candidate_commit, bundle.candidate_tree].every((value) => shaPattern.test(value ?? ""))) add("sentinel_bundle_object_invalid", "bundle commit and tree identities must be full object IDs");
  let baseWorkflow; let candidateWorkflow; let diff = [];
  try {
    baseWorkflow = readImmutableGitObject({ root, commit: bundle.base_commit, expectedTree: bundle.base_tree, expectedMode: "100644", repositoryPath: SENTINEL_WORKFLOW_PATH });
  } catch (error) { add("sentinel_base_tree_mismatch", error instanceof Error ? error.message : String(error), SENTINEL_WORKFLOW_PATH); }
  try {
    candidateWorkflow = readImmutableGitObject({ root, commit: bundle.candidate_commit, expectedTree: bundle.candidate_tree, repositoryPath: SENTINEL_WORKFLOW_PATH });
  } catch (error) { add("sentinel_candidate_tree_mismatch", error instanceof Error ? error.message : String(error), SENTINEL_WORKFLOW_PATH); }
  try { diff = sentinelBundleDiff(root, bundle.base_commit, bundle.candidate_commit); }
  catch (error) { add(error instanceof LifecycleDispositionError ? error.code : "sentinel_bundle_diff_invalid", error instanceof Error ? error.message : String(error)); }
  if (baseWorkflow && sha256(baseWorkflow.bytes) !== SENTINEL_ACTIVE_WORKFLOW_SHA256) add("sentinel_workflow_content_mismatch", "base workflow does not equal the sealed active workflow", SENTINEL_WORKFLOW_PATH);
  for (const [repositoryPath, expectedSha] of SENTINEL_PROTECTED) {
    try {
      const base = readImmutableGitObject({ root, commit: bundle.base_commit, expectedTree: bundle.base_tree, expectedMode: "100644", repositoryPath });
      const candidate = readImmutableGitObject({ root, commit: bundle.candidate_commit, expectedTree: bundle.candidate_tree, expectedMode: "100644", repositoryPath });
      if (sha256(base.bytes) !== expectedSha || sha256(candidate.bytes) !== expectedSha || base.blob !== candidate.blob) add("sentinel_protected_content_mismatch", "protected archive content differs from its sealed identity", repositoryPath);
    } catch (error) { add("sentinel_protected_content_mismatch", error instanceof Error ? error.message : String(error), repositoryPath); }
  }
  let approved = false;
  if (bundle.approval_receipt !== null) {
    const reference = closedDataObject(bundle.approval_receipt, ["commit", "path", "blob_oid", "sha256"]);
    const validReference = reference && shaPattern.test(reference.commit ?? "") && shaPattern.test(reference.blob_oid ?? "") && /^[a-f0-9]{64}$/.test(reference.sha256 ?? "") && pathPattern.test(reference.path ?? "");
    if (!validReference) add("sentinel_approval_invalid", "approval must bind one immutable commit/path/blob/content receipt");
    else if (!AUTHORIZED_APPROVAL_COMMITS.includes(reference.commit)) add("sentinel_approval_commit_untrusted", "approval commit is absent from the canonical owner allowlist", reference.path);
    else try {
      const object = readImmutableGitObject({ root, commit: reference.commit, expectedBlob: reference.blob_oid, expectedMode: "100644", repositoryPath: reference.path });
      const receipt = parseStrictJson(object.bytes.toString("utf8"));
      const expectedReceiptKeys = ["schema_version", "receipt_kind", "owner_ref", "family", "decision", "issued_at", "lifecycle_record_sha256", "workflow_sha256", "baseline_manifest_sha256", "raw_evidence_sha256"];
      const valid = sha256(object.bytes) === reference.sha256 && JSON.stringify(Object.keys(receipt)) === JSON.stringify(expectedReceiptKeys)
        && receipt.schema_version === "1.0" && receipt.receipt_kind === "sentinel-calibration-retention"
        && receipt.owner_ref === record.owner_ref && receipt.family === record.family && receipt.decision === "approved"
        && isRfc3339DateTime(receipt.issued_at) && Date.parse(receipt.issued_at) >= Date.parse(record.baseline_recorded_at) && Date.parse(receipt.issued_at) <= Date.parse(record.due_at)
        && receipt.lifecycle_record_sha256 === sha256(canonicalRecordBytes) && receipt.workflow_sha256 === SENTINEL_ACTIVE_WORKFLOW_SHA256
        && receipt.baseline_manifest_sha256 === retirement.baseline_manifest.sha256 && receipt.raw_evidence_sha256 === retirement.raw_evidence.sha256;
      if (!valid) add("sentinel_approval_binding_invalid", "owner approval does not bind this exact family, record, workflow, baseline, and raw evidence", reference.path);
      else approved = true;
    } catch (error) { add("sentinel_approval_invalid", error instanceof Error ? error.message : String(error), reference.path); }
  }
  const active = candidateWorkflow && candidateWorkflow.mode === "100644" && sha256(candidateWorkflow.bytes) === SENTINEL_ACTIVE_WORKFLOW_SHA256;
  const retired = candidateWorkflow && candidateWorkflow.mode === "100644" && sha256(candidateWorkflow.bytes) === SENTINEL_RETIRED_WORKFLOW_SHA256;
  const expectedRetiredBlob = candidateWorkflow && retired ? gitBlobOid(candidateWorkflow.bytes) : undefined;
  const exactActiveDiff = diff.length === 0 && bundle.base_commit === bundle.candidate_commit && bundle.base_tree === bundle.candidate_tree;
  const exactRetirementDiff = diff.length === 1 && diff[0].path === SENTINEL_WORKFLOW_PATH && diff[0].status === "M"
    && diff[0].oldMode === "100644" && diff[0].newMode === "100644" && diff[0].oldBlob === baseWorkflow?.blob && diff[0].newBlob === expectedRetiredBlob;
  if ((active && !exactActiveDiff) || (retired && !exactRetirementDiff) || (!active && !retired && diff.length !== 0)) add("sentinel_bundle_diff_invalid", "candidate must be either an unchanged active tree or the one-path exact workflow retirement", SENTINEL_WORKFLOW_PATH);
  if (!active && !retired) add("sentinel_workflow_content_mismatch", "candidate workflow is neither the sealed active nor exact retired bytes", SENTINEL_WORKFLOW_PATH);
  const dueNanoseconds = rfc3339Nanoseconds(record.due_at);
  const expired = asOfNanoseconds !== undefined && dueNanoseconds !== undefined && asOfNanoseconds >= dueNanoseconds;
  if (approved && !active) add("sentinel_approved_workflow_changed", "authenticated approval requires recurring calibration to remain exact and active", SENTINEL_WORKFLOW_PATH);
  else if (!approved && !expired && !active) add("sentinel_retirement_before_expiry", "recurring calibration cannot retire until the injected clock is strictly after due_at", SENTINEL_WORKFLOW_PATH);
  else if (!approved && expired && !retired) add("sentinel_retirement_bundle_required", "strictly expired unapproved state requires the complete atomic retirement bundle", SENTINEL_WORKFLOW_PATH);
  const unique = [...new Map(failures.map((failure) => [`${failure.code}:${failure.path}:${failure.message}`, failure])).values()];
  return { failures: unique, ok: unique.length === 0, state: approved ? "approved_active" : expired ? "expired_retired" : "pending_active" };
}

function extensionSourceBytes(root, repositoryPath) {
  if (typeof repositoryPath !== "string" || !pathPattern.test(repositoryPath)) contractFail("protocol_extension_path_invalid", "extension inventory path is not normalized", "<protocol-extension>");
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, ...repositoryPath.split("/"));
  if (!target.startsWith(`${resolvedRoot}${path.sep}`)) contractFail("protocol_extension_path_invalid", "extension inventory path escapes its root", "<protocol-extension>");
  try {
    let current = resolvedRoot;
    for (const segment of repositoryPath.split("/")) {
      current = path.join(current, segment);
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink()) contractFail("protocol_extension_path_symlink", "extension inventory paths cannot traverse symlinks", repositoryPath);
    }
    if (!fs.lstatSync(target).isFile()) contractFail("protocol_extension_path_type_invalid", "extension inventory path is not a regular file", repositoryPath);
    return fs.readFileSync(target);
  } catch (error) {
    if (error instanceof LifecycleDispositionError) throw error;
    contractFail("protocol_extension_path_missing", "extension inventory member is unavailable", repositoryPath);
  }
}
function extensionBinding(root, repositoryPath, role) {
  const bytes = extensionSourceBytes(root, repositoryPath);
  const text = bytes.toString("utf8");
  const lines = text.length === 0 ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
  const digest = sha256(bytes);
  return { path: repositoryPath, role, lines: { start: 1, end: lines }, file_sha256: digest, content_id: `sha256:${digest}` };
}
const PROTOCOL_EXTENSION_ELIGIBLE_EXTENSIONS = Object.freeze([".cjs", ".js", ".json", ".md", ".mjs", ".yaml", ".yml"]);
const PROTOCOL_EXTENSION_EXCLUDED_PREFIXES = Object.freeze([
  ".omo/", ".tmp", "blob-report/", "consumer-reference/fixtures/lifecycle-disposition/",
  "consumer-reference/generated/", "consumer-reference/policies/lifecycle-",
  "design-engineering/reference-profiles/governed-local/captures/",
  "design-engineering/reference-profiles/governed-local/editorial/evidence/",
  "design-engineering/reference-profiles/governed-local/editorial/generated/",
  "design-engineering/reference-profiles/governed-local/terminal/evidence/",
  "design-engineering/reference-profiles/governed-local/terminal/generated/",
  "node_modules/", "playwright-report/", "test-results/",
]);
const PROTOCOL_EXTENSION_EXCLUDED_PATHS = Object.freeze([
  "consumer-reference/schema/lifecycle-disposition.schema.json",
  "scripts/test-lifecycle-disposition.mjs",
  "scripts/validate-lifecycle-disposition.mjs",
]);
function authoritativeExtensionFiles(root) {
  const child = spawnSync("git", ["-C", root, "ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "buffer", maxBuffer: 16 * 1024 * 1024, timeout: 30_000 });
  if (child.status !== 0) contractFail("protocol_extension_inventory_unavailable", "Todo8-bound repository inventory is unavailable", "<protocol-extension>");
  const files = child.stdout.toString("utf8").split("\0").filter(Boolean)
    .filter((entry) => PROTOCOL_EXTENSION_ELIGIBLE_EXTENSIONS.includes(path.posix.extname(entry)))
    .filter((entry) => !PROTOCOL_EXTENSION_EXCLUDED_PREFIXES.some((prefix) => entry.startsWith(prefix)) && !PROTOCOL_EXTENSION_EXCLUDED_PATHS.includes(entry))
    .sort(compareUtf8);
  if (new Set(files).size !== files.length) contractFail("protocol_extension_inventory_duplicate", "authoritative repository inventory contains duplicate paths", "<protocol-extension>");
  for (const repositoryPath of files) extensionSourceBytes(root, repositoryPath);
  return files;
}
function referencePatterns(config) {
  const a2a = config.protocol === "a2a";
  return [
    [path.posix.basename(config.implementation), "projection_path"],
    [path.posix.basename(config.forwarder), "forwarder_path"],
    [a2a ? "A2A_EXPERIMENTAL_EXTENSION" : "AG_UI_EXPERIMENTAL_EXTENSION", "extension_descriptor"],
    [a2a ? "registerA2AExtension" : "registerAgUiExtension", "registration_call"],
    [a2a ? "a2a@1.0" : "ag-ui@0.0.57", "version_reference"],
    [a2a ? 'protocol: "a2a"' : 'protocol: "ag-ui"', "protocol_request"],
    [a2a ? '"a2a": "task_projection"' : '"ag_ui": "event_projection"', "registry_surface"],
    [a2a ? "A2A v1" : "AG-UI", "documentation_reference"],
  ];
}
function extensionCallers(root, config, files) {
  const rows = [];
  const patterns = referencePatterns(config);
  for (const repositoryPath of files) {
    if (repositoryPath === config.implementation) continue;
    const lines = extensionSourceBytes(root, repositoryPath).toString("utf8").split("\n");
    const references = new Map();
    for (let index = 0; index < lines.length; index += 1) {
      const kinds = patterns.filter(([needle]) => lines[index].includes(needle)).map(([, kind]) => kind);
      if (kinds.length > 0) references.set(index + 1, [...new Set(kinds)].sort(compareUtf8));
    }
    if (references.size === 0) continue;
    rows.push({
      ...extensionBinding(root, repositoryPath, "repository_reference"),
      reference_lines: [...references.keys()],
      reference_kinds: [...new Set([...references.values()].flat())].sort(compareUtf8),
    });
  }
  return rows.sort((left, right) => compareUtf8(left.path, right.path));
}
function exportedNames(source) {
  const names = [];
  for (const match of source.matchAll(/export\s+(?:class|const|function)\s+([A-Za-z_$][\w$]*)/gu)) names.push(match[1]);
  return [...new Set(names)].sort(compareUtf8);
}
export function generateProtocolExtensionInventory(protocol, options) {
  const snapshot = deepPlainData(options);
  const input = snapshot.ok ? closedDataObject(snapshot.value, ["root"]) : undefined;
  const config = PROTOCOL_EXTENSION_CONFIG[protocol];
  if (!config || !input || typeof input.root !== "string") contractFail("protocol_extension_api_invalid", "inventory generation requires one known protocol and a root data property", "<protocol-extension>");
  const root = path.resolve(input.root);
  const implementationBytes = extensionSourceBytes(root, config.implementation);
  const version = config.versionPattern.exec(implementationBytes.toString("utf8"))?.[1];
  if (!version) contractFail("protocol_extension_version_missing", "canonical extension version is unavailable", config.implementation);
  const forwarderBytes = extensionSourceBytes(root, config.forwarder);
  const legacyExports = exportedNames(forwarderBytes.toString("utf8"));
  if (legacyExports.length === 0) contractFail("protocol_extension_forwarder_invalid", "v1 compatibility path has no public exports", config.forwarder);
  const bind = (repositoryPath, role) => extensionBinding(root, repositoryPath, role);
  const files = authoritativeExtensionFiles(root);
  return {
    source_revision: BASELINE_COMMIT,
    discovery: {
      authority: "todo8-git-index-and-approved-worktree-inventory",
      contract: bind("scripts/repository-source-inventory.mjs", "todo8_tracked_source_inventory_contract"),
      eligible_extensions: PROTOCOL_EXTENSION_ELIGIBLE_EXTENSIONS,
      excluded_prefixes: PROTOCOL_EXTENSION_EXCLUDED_PREFIXES,
      excluded_paths: PROTOCOL_EXTENSION_EXCLUDED_PATHS,
      scanned_file_count: files.length,
      scanned_paths_content_id: `sha256:${sha256(Buffer.from(canonicalize(files), "utf8"))}`,
    },
    implementation: bind(config.implementation, "canonical_implementation"),
    callers: extensionCallers(root, config, files),
    projection_adapter_conformance_tests: PROTOCOL_EXTENSION_TESTS.map((entry) => bind(entry, "projection_adapter_conformance_test")),
    docs_and_registry: PROTOCOL_EXTENSION_DOCS.map((entry) => bind(entry, entry.endsWith("registry.json") ? "v1_registry_entry" : "documentation")),
    package_exposure: bind("package.json", "installed_package_exposure"),
    forwarding: {
      ...bind(config.forwarder, "v1_compatibility_path"),
      target: config.implementation,
      expected_exports: legacyExports,
      behavior_golden: bind("scripts/agent-native/v2/test-agent-extension-boundary.mjs", "forwarder_behavior_golden"),
    },
    protocol_version: version,
  };
}
function extensionFinding(code, message, recordPath = "<protocol-extension>") { return { code, message, path: recordPath }; }
function exactDataKeys(value, expected) { return value && typeof value === "object" && !Array.isArray(value) && sameValue(Object.keys(value).sort(compareUtf8), [...expected].sort(compareUtf8)); }
function protocolExtensionShapeCode(record) {
  const top = ["schema_version", "record_kind", "extension_id", "protocol", "current_version", "owner_ref", "review", "external_callers", "lifecycle", "replacement", "migration", "approval", "inventory"];
  if (!exactDataKeys(record, top)) return "protocol_extension_field_unknown";
  const shapes = [
    [record.review, ["baseline_recorded_at", "decision_window_days", "due_at", "next_review_at", "deadline_effect", "automatic_removal"]],
    [record.external_callers, ["status", "provenance", "migration_instructions"]],
    [record.lifecycle, ["state", "current_action", "deadline_effect", "automatic_removal"]],
    [record.replacement, ["status", "protocol", "version", "path", "compatibility"]],
    [record.migration, ["status", "current_path", "replacement_path", "instructions"]],
    [record.approval, ["required_for", "immutable_receipt_trust", "approved_major_version_receipt"]],
    [record.inventory, ["source_revision", "discovery", "implementation", "callers", "projection_adapter_conformance_tests", "docs_and_registry", "package_exposure", "forwarding", "protocol_version"]],
  ];
  if (shapes.some(([value, keys]) => !exactDataKeys(value, keys))) return "protocol_extension_field_unknown";
  const bindingKeys = ["path", "role", "lines", "file_sha256", "content_id"];
  const callerKeys = [...bindingKeys, "reference_lines", "reference_kinds"];
  const bindings = [record.inventory.discovery.contract, record.inventory.implementation, ...record.inventory.projection_adapter_conformance_tests, ...record.inventory.docs_and_registry, record.inventory.package_exposure, record.inventory.forwarding.behavior_golden];
  if (!exactDataKeys(record.inventory.discovery, ["authority", "contract", "eligible_extensions", "excluded_prefixes", "excluded_paths", "scanned_file_count", "scanned_paths_content_id"])) return "protocol_extension_field_unknown";
  if (!Array.isArray(record.inventory.callers) || record.inventory.callers.some((value) => !exactDataKeys(value, callerKeys))) return "protocol_extension_field_unknown";
  if (!exactDataKeys(record.inventory.forwarding, [...bindingKeys, "target", "expected_exports", "behavior_golden"]) || bindings.some((value) => !exactDataKeys(value, bindingKeys))) return "protocol_extension_field_unknown";
  if (!exactDataKeys(record.inventory.forwarding.lines, ["start", "end"]) || bindings.some((value) => !exactDataKeys(value.lines, ["start", "end"])) || record.inventory.callers.some((value) => !exactDataKeys(value.lines, ["start", "end"]))) return "protocol_extension_field_unknown";
  if (record.external_callers.provenance !== null) {
    const provenanceKeys = ["authenticated_by", "caller_ref", "repository", "revision", "protocol", "version", "source_closure_id", "receipt", "result", "migration"];
    if (!exactDataKeys(record.external_callers.provenance, provenanceKeys)
      || !exactDataKeys(record.external_callers.provenance.receipt, ["commit", "path", "blob_oid", "sha256"])
      || !exactDataKeys(record.external_callers.provenance.result, ["path", "blob_oid", "sha256"])
      || !exactDataKeys(record.external_callers.provenance.migration, ["path", "blob_oid", "sha256"])) return "protocol_extension_field_unknown";
  }
  if (record.approval.approved_major_version_receipt !== null && !exactDataKeys(record.approval.approved_major_version_receipt, ["commit", "path", "blob_oid", "sha256", "approved_major_version", "protocol"])) return "protocol_extension_field_unknown";
  const stateActions = { retain: "retain", review: "owner_review", deprecate: "publish_deprecation", "migration-ready": "migration_ready", "removal-authorized": "authorize_removal" };
  if (!Object.hasOwn(stateActions, record.lifecycle.state)) return "protocol_extension_state_invalid";
  if (["remove", "remove_immediately", "auto_remove"].includes(record.lifecycle.current_action)) return "protocol_extension_immediate_removal_forbidden";
  if (!Object.values(stateActions).includes(record.lifecycle.current_action)) return "protocol_extension_action_invalid";
  if (record.lifecycle.current_action !== stateActions[record.lifecycle.state]) return "protocol_extension_transition_invalid";
  if (!["unknown", "none", "verified"].includes(record.external_callers.status)) return "protocol_extension_caller_status_invalid";
  if (!["retained-current-implementation", "approved-replacement"].includes(record.replacement.status)) return "protocol_extension_replacement_status_invalid";
  if (!["not-required-retained", "migration-ready"].includes(record.migration.status)) return "protocol_extension_migration_status_invalid";
  return undefined;
}
function protocolCallerSubject(record) {
  const subject = structuredClone(record);
  subject.external_callers.provenance = null;
  return subject;
}
function validateExternalCallerProvenance(record, provenance) {
  if (provenance.protocol !== record.protocol || provenance.version !== record.current_version) return "protocol_extension_caller_provenance_binding_invalid";
  const trust = PROTOCOL_EXTERNAL_CALLER_TRUST_ROOTS.find((entry) => entry.receipt_commit === provenance.receipt.commit && entry.caller_ref === provenance.caller_ref);
  if (!trust) return "protocol_extension_caller_provenance_untrusted";
  const identityMatches = trust.repository === normalizedRepositoryIdentity(provenance.repository) && trust.revision === provenance.revision
    && trust.protocol === provenance.protocol && trust.version === provenance.version && trust.source_closure_id === provenance.source_closure_id
    && trust.receipt_path === provenance.receipt.path && trust.receipt_blob === provenance.receipt.blob_oid && trust.receipt_sha256 === provenance.receipt.sha256
    && sameValue(trust.result, provenance.result) && sameValue(trust.migration, provenance.migration);
  if (!identityMatches) return "protocol_extension_caller_provenance_binding_invalid";
  try {
    const root = trust.repository_root;
    const stat = fs.lstatSync(root);
    const canonicalRoot = fs.realpathSync(root);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.dev !== trust.repository_root_dev || stat.ino !== trust.repository_root_ino || sha256(Buffer.from(canonicalRoot)) !== trust.repository_root_sha256) return "protocol_extension_caller_repository_untrusted";
    const remote = git(root, ["config", "--get", "remote.origin.url"]).toString("utf8").trim();
    if (remote !== trust.remote_url || normalizedRepositoryIdentity(remote) !== trust.repository) return "protocol_extension_caller_repository_untrusted";
    if (git(root, ["rev-parse", trust.authenticated_ref]).toString("utf8").trim() !== trust.lineage_root_commit) return "protocol_extension_caller_lineage_invalid";
    git(root, ["merge-base", "--is-ancestor", trust.lineage_root_commit, trust.revision]);
    git(root, ["merge-base", "--is-ancestor", trust.revision, trust.receipt_commit]);
    const receiptObject = readImmutableGitObject({ root, commit: trust.receipt_commit, expectedBlob: trust.receipt_blob, expectedMode: "100644", repositoryPath: trust.receipt_path });
    if (sha256(receiptObject.bytes) !== trust.receipt_sha256) return "protocol_extension_caller_receipt_hash_mismatch";
    const resultObject = readImmutableGitObject({ root, commit: trust.receipt_commit, expectedBlob: trust.result.blob_oid, expectedMode: "100644", repositoryPath: trust.result.path });
    const migrationObject = readImmutableGitObject({ root, commit: trust.receipt_commit, expectedBlob: trust.migration.blob_oid, expectedMode: "100644", repositoryPath: trust.migration.path });
    if (sha256(resultObject.bytes) !== trust.result.sha256 || sha256(migrationObject.bytes) !== trust.migration.sha256) return "protocol_extension_caller_result_binding_invalid";
    const receipt = parseStrictJson(receiptObject.bytes.toString("utf8"));
    const result = parseStrictJson(resultObject.bytes.toString("utf8"));
    const migration = parseStrictJson(migrationObject.bytes.toString("utf8"));
    const receiptKeys = ["schema_version", "receipt_kind", "caller_ref", "repository", "revision", "protocol", "version", "source_closure_id", "subject_sha256", "result_sha256", "migration_sha256", "issued_at"];
    const resultKeys = ["schema_version", "receipt_kind", "caller_ref", "protocol", "version", "source_closure_id", "status"];
    const migrationKeys = ["schema_version", "receipt_kind", "caller_ref", "protocol", "from_version", "instructions"];
    const valid = sameValue(Object.keys(receipt), receiptKeys) && sameValue(Object.keys(result), resultKeys) && sameValue(Object.keys(migration), migrationKeys)
      && receipt.schema_version === "1.0" && receipt.receipt_kind === "protocol-extension-external-caller"
      && receipt.caller_ref === provenance.caller_ref && normalizedRepositoryIdentity(receipt.repository) === trust.repository
      && receipt.revision === provenance.revision && receipt.protocol === record.protocol && receipt.version === record.current_version
      && receipt.source_closure_id === provenance.source_closure_id && isRfc3339DateTime(receipt.issued_at)
      && receipt.subject_sha256 === sha256(Buffer.from(canonicalize(protocolCallerSubject(record)), "utf8"))
      && receipt.result_sha256 === provenance.result.sha256 && receipt.migration_sha256 === provenance.migration.sha256
      && result.schema_version === "1.0" && result.receipt_kind === "protocol-extension-caller-validation" && result.caller_ref === provenance.caller_ref
      && result.protocol === record.protocol && result.version === record.current_version && result.source_closure_id === provenance.source_closure_id && result.status === "PASS"
      && migration.schema_version === "1.0" && migration.receipt_kind === "protocol-extension-caller-migration" && migration.caller_ref === provenance.caller_ref
      && migration.protocol === record.protocol && migration.from_version === record.current_version
      && sameValue(migration.instructions, record.external_callers.migration_instructions);
    return valid ? undefined : "protocol_extension_caller_provenance_binding_invalid";
  } catch { return "protocol_extension_caller_provenance_untrusted"; }
}
function extensionMajor(value) { const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?$/u.exec(value ?? ""); return match ? Number(match[1]) : undefined; }
export function validateProtocolExtensionDisposition(options) {
  const failures = [];
  const snapshot = deepPlainData(options);
  const input = snapshot.ok ? closedDataObject(snapshot.value, ["asOf", "record", "root"]) : undefined;
  if (!input) return { action: "none", failures: [extensionFinding("protocol_extension_api_invalid", "validator requires only asOf, record, and root data properties")], ok: false, state: "invalid" };
  const { asOf, record } = input;
  if (typeof input.root !== "string") return { action: "none", failures: [extensionFinding("protocol_extension_api_invalid", "root must be a string")], ok: false, state: "invalid" };
  const root = path.resolve(input.root);
  const add = (code, message, recordPath) => failures.push(extensionFinding(code, message, recordPath));
  const shapeCode = protocolExtensionShapeCode(record);
  if (shapeCode) return { action: "none", failures: [extensionFinding(shapeCode, "extension record contains an unknown field, value, action, status, or incoherent transition")], ok: false, state: "invalid" };
  const expectedKeys = ["schema_version", "record_kind", "extension_id", "protocol", "current_version", "owner_ref", "review", "external_callers", "lifecycle", "replacement", "migration", "approval", "inventory"];
  if (!record || typeof record !== "object" || Array.isArray(record) || !sameValue(Object.keys(record), expectedKeys)) {
    return { action: "none", failures: [extensionFinding("protocol_extension_record_invalid", "extension record is not the closed disposition contract")], ok: false, state: "invalid" };
  }
  const config = PROTOCOL_EXTENSION_CONFIG[record.protocol];
  if (!config || record.extension_id !== record.protocol || record.schema_version !== "1.0" || record.record_kind !== "protocol-extension-disposition") add("protocol_extension_identity_invalid", "extension identity is unsupported");
  if (record.owner_ref !== "sg:governor/stylegallery-maintainers") add("protocol_extension_owner_invalid", "extension owner must equal the governed maintainer owner");
  let generated;
  try { generated = generateProtocolExtensionInventory(record.protocol, { root }); }
  catch (error) { add(error instanceof LifecycleDispositionError ? error.code : "protocol_extension_source_stale", "source-bound extension inventory cannot be reproduced", error instanceof LifecycleDispositionError ? error.path : undefined); }
  if (generated) {
    if (record.current_version !== generated.protocol_version) add("protocol_extension_version_stale", "record version differs from canonical projection source");
    if (!sameValue(record.inventory?.callers, generated.callers)) add("protocol_extension_caller_inventory_mismatch", "repository caller inventory is missing, extra, duplicated, or stale");
    if (!sameValue(record.inventory?.projection_adapter_conformance_tests, generated.projection_adapter_conformance_tests)) add("protocol_extension_test_inventory_mismatch", "projection, adapter, or conformance test inventory is stale");
    if (!sameValue(record.inventory?.docs_and_registry, generated.docs_and_registry)) add("protocol_extension_doc_inventory_mismatch", "documentation or registry inventory is stale");
    if (!sameValue(record.inventory?.forwarding, generated.forwarding)) add("protocol_extension_forwarder_mismatch", "forwarding path, exports, ordering, identity, or behavior golden is stale");
    if (!sameValue(record.inventory, generated) && !failures.some(({ code }) => code.endsWith("_mismatch") || code === "protocol_extension_version_stale")) add("protocol_extension_source_stale", "source path, LOC, hash, range, content ID, package exposure, or implementation binding is stale");
  }
  const exactReview = record.review?.baseline_recorded_at === "2026-07-30T08:52:29Z" && record.review?.decision_window_days === 60
    && record.review?.due_at === "2026-09-28T08:52:29Z" && record.review?.next_review_at === "2026-09-28T08:52:29Z"
    && record.review?.deadline_effect === "owner_review_only" && record.review?.automatic_removal === false;
  if (!exactReview) add("protocol_extension_review_invalid", "60-day deadline and next review must trigger owner review only");
  if (!isRfc3339DateTime(asOf)) add("protocol_extension_clock_invalid", "asOf must be RFC3339");
  const allowedStates = ["retain", "review", "deprecate", "migration-ready", "removal-authorized"];
  if (!allowedStates.includes(record.lifecycle?.state)) add("protocol_extension_state_invalid", "lifecycle state is unsupported");
  if (record.lifecycle?.automatic_removal !== false || record.lifecycle?.deadline_effect !== "owner_review_only") add("protocol_extension_automatic_removal_forbidden", "review deadlines never authorize removal");
  if (["remove", "remove_immediately", "auto_remove"].includes(record.lifecycle?.current_action)) add("protocol_extension_immediate_removal_forbidden", "immediate and automatic removal are forbidden");
  const callerStatus = record.external_callers?.status;
  if (!['unknown', 'none', 'verified'].includes(callerStatus)) add("protocol_extension_caller_status_invalid", "external caller status is invalid");
  if (callerStatus === "unknown" && record.external_callers?.provenance !== null) add("protocol_extension_unknown_provenance_invalid", "unknown caller status cannot claim provenance");
  if (callerStatus === "none") add("protocol_extension_unknown_to_none_forbidden", "unknown cannot become none without Todo27-authenticated external provenance");
  if (callerStatus === "verified") {
    if (!record.external_callers?.provenance || !Array.isArray(record.external_callers?.migration_instructions) || record.external_callers.migration_instructions.length === 0) add("protocol_extension_caller_provenance_required", "verified callers require authenticated provenance and migration instructions");
    else if (record.external_callers.provenance.authenticated_by !== "todo27-immutable-receipt") add("protocol_extension_caller_provenance_required", "verified caller provenance is not Todo27-authenticated");
    else {
      const provenanceCode = validateExternalCallerProvenance(record, record.external_callers.provenance);
      if (provenanceCode) add(provenanceCode, "verified caller provenance does not match immutable Todo27 caller, repository, source, result, and migration trust");
    }
  }
  if (record.replacement?.protocol !== record.protocol || record.replacement?.version !== record.current_version || record.replacement?.path !== config?.implementation || record.replacement?.compatibility !== "behavior-preserving") add("protocol_extension_replacement_incompatible", "replacement must preserve protocol, version, and behavior");
  if (!Array.isArray(record.migration?.instructions) || record.migration.instructions.length === 0 || record.migration?.current_path !== config?.forwarder || record.migration?.replacement_path !== config?.implementation) add("protocol_extension_migration_missing", "current forwarding and replacement migration instructions are required");
  if (record.approval?.immutable_receipt_trust !== "commit-tree-blob-sha256-codeowners-allowlist" || !sameValue(record.approval?.required_for, ["deprecate", "migration-ready", "removal-authorized"])) add("protocol_extension_approval_policy_invalid", "major-version approval policy must use immutable receipt trust");
  const approval = record.approval?.approved_major_version_receipt;
  if (["deprecate", "migration-ready", "removal-authorized"].includes(record.lifecycle?.state)) {
    if (!approval) add("protocol_extension_major_version_approval_required", "deprecation or removal requires explicit major-version approval");
    else {
      const expectedApprovalKeys = ["commit", "path", "blob_oid", "sha256", "approved_major_version", "protocol"];
      if (!sameValue(Object.keys(approval), expectedApprovalKeys) || approval.protocol !== record.protocol) add("protocol_extension_approval_binding_invalid", "approval cannot be replayed across extensions");
      const currentMajor = extensionMajor(record.current_version);
      if (!Number.isInteger(approval.approved_major_version) || currentMajor === undefined || approval.approved_major_version <= currentMajor) add("protocol_extension_major_version_invalid", "approval must name a strictly greater major version");
      if (!PROTOCOL_EXTENSION_APPROVAL_COMMITS.includes(approval.commit)) add("protocol_extension_approval_untrusted", "approval is staged, self-signed, replayed, or absent from immutable trust");
      else try {
        const object = readImmutableGitObject({ root, commit: approval.commit, expectedBlob: approval.blob_oid, expectedMode: "100644", repositoryPath: approval.path });
        if (sha256(object.bytes) !== approval.sha256) add("protocol_extension_approval_hash_mismatch", "approval bytes differ from the immutable commit/blob/SHA-256 binding", approval.path);
        const receipt = parseStrictJson(object.bytes.toString("utf8"));
        const receiptKeys = ["schema_version", "receipt_kind", "owner_ref", "protocol", "current_version", "approved_major_version", "issued_at", "subject_sha256", "migration"];
        const subject = structuredClone(record); subject.approval.approved_major_version_receipt = null;
        const validReceipt = sameValue(Object.keys(receipt), receiptKeys) && receipt.schema_version === "1.0"
          && receipt.receipt_kind === "protocol-extension-major-version-approval" && receipt.owner_ref === record.owner_ref
          && receipt.protocol === record.protocol && receipt.current_version === record.current_version
          && receipt.approved_major_version === approval.approved_major_version && isRfc3339DateTime(receipt.issued_at)
          && Date.parse(receipt.issued_at) >= Date.parse(record.review.baseline_recorded_at)
          && receipt.subject_sha256 === sha256(Buffer.from(canonicalize(subject), "utf8"))
          && sameValue(receipt.migration, { current_path: record.migration.current_path, replacement_path: record.migration.replacement_path, instructions: record.migration.instructions });
        if (!validReceipt) add("protocol_extension_approval_binding_invalid", "immutable approval does not bind this exact extension, version, disposition, and migration", approval.path);
      } catch (error) { add(error instanceof LifecycleDispositionError ? error.code : "protocol_extension_approval_invalid", "immutable approval receipt inspection failed", approval.path); }
    }
  } else if (approval !== null) add("protocol_extension_approval_forbidden", "retain/review records cannot carry an unused approval");
  if (record.lifecycle?.state === "removal-authorized" && callerStatus === "unknown") add("protocol_extension_unknown_callers_block_removal", "unknown external callers prevent removal authorization");
  if (["deprecate", "migration-ready", "removal-authorized"].includes(record.lifecycle?.state) && record.migration?.status === "not-required-retained") add("protocol_extension_migration_missing", "deprecation requires migration readiness");
  const due = isRfc3339DateTime(asOf) && Date.parse(asOf) >= Date.parse("2026-09-28T08:52:29Z");
  const requested = record.lifecycle?.state;
  const state = requested === "retain" && due ? "review" : requested;
  const action = requested === "retain" && due ? "owner_review" : requested === "retain" ? "retain" : requested;
  const unique = [...new Map(failures.map((failure) => [`${failure.code}:${failure.path}:${failure.message}`, failure])).values()];
  return { action, failures: unique, ok: unique.length === 0, state: unique.length === 0 ? state : "invalid" };
}

function readTrustedReference(repositoryPath) {
  const sealed = sealedSourceBindings.get(repositoryPath);
  if (sealed) return readSealedSource({ expectedSha256: sealed, repositoryPath, root: repositoryRoot });
  return readImmutableGitObject({ commit: BASELINE_COMMIT, expectedTree: BASELINE_TREE, repositoryPath, root: repositoryRoot });
}

export function lifecycleSubject(record) { const { decision_receipt: ignored, ...subject } = record; return subject; }
export function validateDecisionReceipt({ record, receipt, receiptBytes }) {
  const keys = ["schema_version", "receipt_kind", "owner_ref", "family", "decision", "caller_status", "issued_at", "provenance", "subject_sha256", "evidence_sha256"];
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt) || JSON.stringify(Object.keys(receipt)) !== JSON.stringify(keys)) return "lifecycle_receipt_invalid";
  if (receipt.schema_version !== "1.0" || receipt.receipt_kind !== "lifecycle-decision" || receipt.owner_ref !== record.owner_ref || receipt.family !== record.family || receipt.decision !== record.decision || receipt.caller_status !== record.caller_status) return "lifecycle_receipt_binding_invalid";
  if (!receipt.provenance || typeof receipt.provenance !== "object" || Array.isArray(receipt.provenance)) return "lifecycle_receipt_invalid";
  if (record.caller_status === "unknown") {
    const expectedKeys = ["kind", "caller_ref", "protocol", "version", "source_closure_id", "revision"];
    if (JSON.stringify(Object.keys(receipt.provenance)) !== JSON.stringify(expectedKeys) || receipt.provenance.kind !== "owner_decision" || expectedKeys.slice(1).some((key) => receipt.provenance[key] !== null)) return "lifecycle_receipt_provenance_invalid";
  }
  if (record.caller_status === "verified") {
    const expectedKeys = ["kind", "caller_ref", "protocol", "version", "source_closure_id", "revision"];
    if (JSON.stringify(Object.keys(receipt.provenance)) !== JSON.stringify(expectedKeys) || receipt.provenance.kind !== "registered_caller") return "lifecycle_caller_registry_unknown";
    const caller = trustedCallerRegistry.find((entry) => entry.caller_ref === receipt.provenance.caller_ref);
    if (!caller) return "lifecycle_caller_registry_unknown";
    if (caller.family !== record.family || caller.protocol !== receipt.provenance.protocol || caller.version !== receipt.provenance.version || caller.source_closure_id !== receipt.provenance.source_closure_id || caller.revision !== receipt.provenance.revision) return "lifecycle_caller_registry_mismatch";
  }
  if (!isRfc3339DateTime(receipt.issued_at) || Date.parse(receipt.issued_at) < Date.parse(record.baseline_recorded_at) || Date.parse(receipt.issued_at) > Date.parse(record.due_at)) return "lifecycle_receipt_timestamp_invalid";
  if (receipt.subject_sha256 !== sha256(Buffer.from(canonicalize(lifecycleSubject(record)), "utf8"))) return "lifecycle_receipt_subject_mismatch";
  if (receipt.evidence_sha256 !== sha256(Buffer.from(canonicalize(record.evidence_refs), "utf8"))) return "lifecycle_receipt_evidence_mismatch";
  if (receiptBytes && record.decision_receipt?.sha256 !== sha256(receiptBytes)) return "lifecycle_receipt_hash_mismatch";
  return undefined;
}

function main() {
const options = { asOf: undefined, bundleRepository: undefined, fixtureRoot: path.join(repositoryRoot, "consumer-reference/fixtures/lifecycle-disposition"), json: false, pageArchiveCommit: undefined, pageArchiveRepository: undefined, pageArchiveTree: undefined, records: [], sentinelArchiveCommit: undefined, sentinelArchiveRepository: undefined, sentinelArchiveTree: undefined, sentinelBundle: undefined };
const failures = [];

function finding(code, message, recordPath) { return { code, message, path: recordPath }; }
function add(code, message, recordPath) { failures.push(finding(code, message, recordPath)); }
function valueAfter(argument, index) {
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) { add("argument_value_required", `${argument} requires a value`, "<cli>"); return undefined; }
  return value;
}
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--json") options.json = true;
  else if (["--record", "--as-of", "--fixture-root", "--bundle-repository", "--page-archive-commit", "--page-archive-repository", "--page-archive-tree", "--sentinel-archive-commit", "--sentinel-archive-repository", "--sentinel-archive-tree", "--sentinel-bundle"].includes(argument)) {
    const value = valueAfter(argument, index);
    if (value !== undefined) {
      if (argument === "--record") options.records.push(path.resolve(process.cwd(), value));
      if (argument === "--as-of") options.asOf = value;
      if (argument === "--fixture-root") options.fixtureRoot = path.resolve(process.cwd(), value);
      if (argument === "--bundle-repository") options.bundleRepository = path.resolve(process.cwd(), value);
      if (argument === "--page-archive-commit") options.pageArchiveCommit = value;
      if (argument === "--page-archive-repository") options.pageArchiveRepository = path.resolve(process.cwd(), value);
      if (argument === "--page-archive-tree") options.pageArchiveTree = value;
      if (argument === "--sentinel-archive-commit") options.sentinelArchiveCommit = value;
      if (argument === "--sentinel-archive-repository") options.sentinelArchiveRepository = path.resolve(process.cwd(), value);
      if (argument === "--sentinel-archive-tree") options.sentinelArchiveTree = value;
      if (argument === "--sentinel-bundle") options.sentinelBundle = path.resolve(process.cwd(), value);
      index += 1;
    }
  } else add("argument_unknown", `unsupported argument ${argument}`, "<cli>");
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}
function safeInput(target, expectedType, code, label) {
  const resolved = path.resolve(target);
  const display = inside(repositoryRoot, resolved) ? path.relative(repositoryRoot, resolved) : label;
  if (!inside(repositoryRoot, resolved) || !fs.existsSync(resolved)) { add(code, `${label} must exist inside the repository`, display); return undefined; }
  let current = repositoryRoot;
  for (const segment of path.relative(repositoryRoot, resolved).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (fs.lstatSync(current).isSymbolicLink()) { add(code, `${label} must not traverse a symlink`, display); return undefined; }
  }
  const stat = fs.lstatSync(resolved);
  if ((expectedType === "file" && !stat.isFile()) || (expectedType === "directory" && !stat.isDirectory())) { add(code, `${label} has the wrong filesystem type`, display); return undefined; }
  return resolved;
}
function readStrict(file, code) {
  try { return parseStrictJson(fs.readFileSync(file, "utf8")); }
  catch (error) { add(code, error instanceof Error ? error.message : String(error), path.relative(repositoryRoot, file)); return undefined; }
}
function sameJson(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function canonicalBytes(value) { return `${JSON.stringify(value, null, 2)}\n`; }

let validateSchema = () => false;
let validateExtensionSchema = () => false;
const schemaFile = safeInput(path.join(repositoryRoot, schemaRecord), "file", "lifecycle_schema_unavailable", "lifecycle schema");
if (schemaFile) {
  const schema = readStrict(schemaFile, "lifecycle_schema_unavailable");
  try {
    if (schema) {
      const ajv = addDateTimeFormat(new Ajv2020({ allErrors: true, strict: true }));
      validateSchema = ajv.compile(schema);
      validateExtensionSchema = ajv.getSchema(`${schema.$id}#/$defs/protocolExtensionDisposition`) ?? (() => false);
    }
  }
  catch (error) { add("lifecycle_schema_unavailable", error instanceof Error ? error.message : String(error), schemaRecord); }
}

function expectedFixtureManifest() {
  return {
    id: "lifecycle-disposition-fixture-inventory",
    invalid_records: fixtureRows.map(([file, expected_code]) => ({ expected_code, file })),
    schema_record: schemaRecord,
    schema_version: "1.0",
    extension_invalid_records: extensionFixtureRows.map(([file, expected_code]) => ({ expected_code, file })),
    extension_schema_ref: "#/$defs/protocolExtensionDisposition",
    extension_schema_version: "1.0",
  };
}
function validateFixtureInventory() {
  const root = safeInput(options.fixtureRoot, "directory", "lifecycle_fixture_manifest_drift", "fixture root");
  if (!root) return;
  const manifestFile = safeInput(path.join(root, "manifest.json"), "file", "lifecycle_fixture_manifest_drift", "fixture manifest");
  const manifest = manifestFile && readStrict(manifestFile, "lifecycle_fixture_manifest_drift");
  if (!sameJson(manifest, expectedFixtureManifest())) add("lifecycle_fixture_manifest_drift", "fixture manifest identity, membership, and order are canonical", path.relative(repositoryRoot, manifestFile ?? root));
  const expected = ["manifest.json", ...fixtureRows.map(([file]) => file), ...extensionFixtureRows.map(([file]) => file)].sort(compareUtf8);
  const actual = fs.readdirSync(root).sort(compareUtf8);
  if (!sameJson(actual, expected)) add("lifecycle_fixture_manifest_drift", "fixture directory must equal the closed manifest inventory", path.relative(repositoryRoot, root));
}
validateFixtureInventory();

function loadCanonicalInventory() {
  const manifestFile = safeInput(path.join(repositoryRoot, canonicalManifest), "file", "lifecycle_manifest_drift", "lifecycle manifest");
  const value = manifestFile && readStrict(manifestFile, "lifecycle_manifest_drift");
  const expected = {
    schema_version: "1.0", schema_record: schemaRecord, baseline_commit: BASELINE_COMMIT, baseline_tree: BASELINE_TREE,
    allowed_path_ledger_sha256: ALLOWED_PATH_LEDGER_SHA256, owner_trust_root: OWNER_TRUST_ROOT,
    authorized_approval_commits: AUTHORIZED_APPROVAL_COMMITS, caller_registry: trustedCallerRegistry,
    protocol_extension_approval_commits: PROTOCOL_EXTENSION_APPROVAL_COMMITS,
    records: canonicalRecords, extension_records: PROTOCOL_EXTENSION_RECORDS,
  };
  if (!sameJson(value, expected) || (manifestFile && fs.readFileSync(manifestFile, "utf8") !== canonicalBytes(expected))) add("lifecycle_manifest_drift", "canonical manifest identity, serialization, and record order must not drift", canonicalManifest);
  const policyRoot = path.join(repositoryRoot, "consumer-reference/policies");
  const actual = fs.readdirSync(policyRoot).filter((name) => name.startsWith("lifecycle-") && name !== "lifecycle-dispositions.json").sort(compareUtf8);
  const expectedNames = [...canonicalRecords, ...PROTOCOL_EXTENSION_RECORDS].map((entry) => path.basename(entry)).sort(compareUtf8);
  if (!sameJson(actual, expectedNames)) add("lifecycle_manifest_drift", "exactly the three family and two protocol-extension records are allowed", "consumer-reference/policies");
  return canonicalRecords.map((relative) => path.join(repositoryRoot, relative));
}
const recordFiles = options.records.length > 0 ? options.records : loadCanonicalInventory();

function validateTrustConfiguration() {
  try {
    const codeowners = readImmutableGitObject({ commit: BASELINE_COMMIT, expectedBlob: OWNER_TRUST_ROOT.codeowners_blob, expectedMode: "100644", expectedTree: BASELINE_TREE, repositoryPath: OWNER_TRUST_ROOT.codeowners_path, root: repositoryRoot });
    const text = codeowners.bytes.toString("utf8");
    if (sha256(codeowners.bytes) !== OWNER_TRUST_ROOT.codeowners_sha256 || !text.includes("* @changeroa") || !text.includes("/consumer-reference/policies/ @changeroa")) add("lifecycle_owner_trust_invalid", "sealed CODEOWNERS bytes do not authorize the declared maintainer trust root", canonicalManifest);
  } catch (error) { add(error instanceof LifecycleDispositionError ? error.code : "lifecycle_owner_trust_invalid", "sealed CODEOWNERS trust root is unavailable", canonicalManifest); }
  for (const caller of trustedCallerRegistry) {
    const closureId = `sha256:${sha256(Buffer.from(canonicalize(caller.source_closure), "utf8"))}`;
    if (closureId !== caller.source_closure_id) add("lifecycle_caller_registry_mismatch", "caller source closure identifier does not match its canonical members", canonicalManifest);
    for (const source of caller.source_closure) try { readSealedSource({ expectedSha256: source.sha256, repositoryPath: source.path, root: repositoryRoot }); }
    catch (error) { add(error instanceof LifecycleDispositionError ? error.code : "lifecycle_caller_registry_mismatch", "caller source does not match its sealed content identity", canonicalManifest); }
  }
}
validateTrustConfiguration();

function checkPathList(value, field, recordPath) {
  if (!Array.isArray(value) || value.length === 0) { add("lifecycle_path_list_empty", `${field} must contain at least one path`, recordPath); return; }
  if (new Set(value).size !== value.length) add("lifecycle_path_duplicate", `${field} paths must be unique`, recordPath);
  if (value.some((entry, index) => index > 0 && compareUtf8(String(value[index - 1]), String(entry)) >= 0)) add("lifecycle_serialization_drift", `${field} must be sorted by canonical UTF-8 bytes`, recordPath);
  for (const relative of value) {
    if (typeof relative !== "string" || !pathPattern.test(relative)) { add("lifecycle_path_invalid", `${field} must use normalized repository-relative paths`, recordPath); continue; }
    try { readTrustedReference(relative); }
    catch (error) {
      let code = error instanceof LifecycleDispositionError ? error.code : "lifecycle_path_read_failed";
      if (code === "lifecycle_git_path_missing") {
        const candidate = path.join(repositoryRoot, relative);
        if (!fs.existsSync(candidate)) code = "lifecycle_path_missing";
        else { const stat = fs.lstatSync(candidate); code = stat.isSymbolicLink() ? "lifecycle_path_symlink" : stat.isFile() ? "lifecycle_path_untracked" : "lifecycle_path_type_invalid"; }
      }
      add(code, error instanceof LifecycleDispositionError ? error.message : "content-addressed reference inspection failed", recordPath);
    }
  }
}
function validateSentinelRetirementRecord(value, recordPath) {
  const retirement = value.retirement;
  if (!retirement || typeof retirement !== "object" || Array.isArray(retirement)) { add("sentinel_retirement_record_missing", "sentinel lifecycle requires its closed retirement preparation", recordPath); return; }
  const expectedProtected = SENTINEL_PROTECTED.map(([repositoryPath, expectedSha, role]) => ({ path: repositoryPath, mode: "100644", sha256: expectedSha, role }));
  const calibration = readStrict(path.join(repositoryRoot, "consumer-reference/baselines/calibration.json"), "sentinel_raw_evidence_invalid");
  const expectedWorkflow = {
    path: SENTINEL_WORKFLOW_PATH, mode: "100644", active_sha256: SENTINEL_ACTIVE_WORKFLOW_SHA256,
    retired_sha256: SENTINEL_RETIRED_WORKFLOW_SHA256, job_id: "chromium-calibration",
    job_name: "Chromium 20-run calibration (nonblocking)", job_sha256: SENTINEL_JOB_SHA256,
    triggers: ["pull_request", "workflow_dispatch"], required_runs: 20,
  };
  if (!sameJson(retirement.workflow, expectedWorkflow)) add("sentinel_workflow_binding_invalid", "workflow path, mode, schedule, job identity, and active/retired bytes are sealed", recordPath);
  if (!sameJson(retirement.protected_paths, expectedProtected)) add("sentinel_protected_set_invalid", "protected parser, validators, controls, sentinels, evidence, and provenance must equal the closed set", recordPath);
  if (!sameJson(retirement.approval, { authorized_commits: AUTHORIZED_APPROVAL_COMMITS, owner_ref: value.owner_ref, decision: value.decision })) add("sentinel_approval_state_invalid", "owner decision state must equal the immutable approval allowlist", recordPath);
  if (calibration) {
    const committed = calibration.committed_ci;
    const expectedRaw = {
      record: "consumer-reference/baselines/calibration.json", sha256: SENTINEL_PROTECTED[0][1],
      raw_evidence_sha256: committed?.raw_evidence_sha256, required_runs: 20,
      artifact_api_digest: committed?.external_verification?.artifact?.api_digest,
    };
    const expectedBaseline = { path: "consumer-reference/baselines/manifest.json", sha256: SENTINEL_PROTECTED[1][1] };
    const expectedRetrieval = {
      source: committed?.external_verification?.source, repository: committed?.execution_repository, run_id: committed?.run_id,
      artifact_id: committed?.external_verification?.artifact?.id, artifact_name: committed?.artifact_name,
      artifact_expires_at: committed?.external_verification?.artifact?.expires_at, artifact_status: "expired_upstream",
      archive_status: "recovered_immutable_local", recovery_receipt_sha256: "ae5e576d708fcb51e474de7485454717d13c89f163f41f96bf7435facb8113e3",
      immutable_archive_commit: "5b5a5b6656c32b73411e902c760bbbea9e669126", immutable_archive_tree: "5c3a67f88ac3a51537c137e58a04cc7bfa752621",
      artifact_files: 163, raw_files: 160,
      artifact_api_digest: committed?.external_verification?.artifact?.api_digest, raw_evidence_sha256: committed?.raw_evidence_sha256,
      download_command: ["gh", "run", "download", committed?.run_id, "--repo", committed?.execution_repository, "--name", committed?.artifact_name, "--dir", "calibration-artifacts"],
      verify_command: ["node", "scripts/validate-lifecycle-disposition.mjs", "--sentinel-archive-repository", ".omo/evidence/stylegallery-ai-slop-removal/task-28-stylegallery-ai-slop-removal/recovered-raw-20-run/immutable-archive.git", "--sentinel-archive-commit", "5b5a5b6656c32b73411e902c760bbbea9e669126", "--sentinel-archive-tree", "5c3a67f88ac3a51537c137e58a04cc7bfa752621", "--json"],
    };
    if (!sameJson(retirement.raw_evidence, expectedRaw)) add("sentinel_raw_evidence_binding_invalid", "raw 20-run aggregate must bind the exact source artifact and digest", recordPath);
    if (!sameJson(retirement.baseline_manifest, expectedBaseline)) add("sentinel_baseline_binding_invalid", "baseline manifest must bind exact bytes", recordPath);
    if (!sameJson(retirement.archive_retrieval, expectedRetrieval)) add("sentinel_archive_retrieval_invalid", "archive retrieval must be executable and source-bound to the externally verified run and artifact", recordPath);
  }
  try {
    const active = readSealedSource({ expectedSha256: SENTINEL_ACTIVE_WORKFLOW_SHA256, repositoryPath: SENTINEL_WORKFLOW_PATH, root: repositoryRoot });
    const retired = retireSentinelWorkflow(active.bytes);
    if (sha256(retired) !== SENTINEL_RETIRED_WORKFLOW_SHA256) add("sentinel_retired_workflow_mismatch", "exact retirement bytes do not match the sealed one-job removal", recordPath);
  } catch (error) { add(error instanceof LifecycleDispositionError ? error.code : "sentinel_workflow_binding_invalid", error instanceof Error ? error.message : String(error), SENTINEL_WORKFLOW_PATH); }
  for (const [repositoryPath, expectedSha] of SENTINEL_PROTECTED) try { readSealedSource({ expectedSha256: expectedSha, repositoryPath, root: repositoryRoot }); }
  catch (error) { add(error instanceof LifecycleDispositionError ? error.code : "sentinel_protected_content_mismatch", error instanceof Error ? error.message : String(error), repositoryPath); }
}

function validatePageEvidenceRetirementRecord(value, recordPath) {
  const retirement = value.retirement;
  if (!retirement || typeof retirement !== "object" || Array.isArray(retirement)) { add("page_evidence_retirement_record_missing", "page-evidence lifecycle requires its closed retirement preparation", recordPath); return; }
  const expectedWorkflow = {
    path: PAGE_WORKFLOW_PATH, mode: "100644", active_sha256: PAGE_ACTIVE_WORKFLOW_SHA256,
    retired_sha256: PAGE_RETIRED_WORKFLOW_SHA256, job_id: "consumer-page-evidence",
    job_name: "Consumer page-evidence raster capture (nonblocking)", job_sha256: PAGE_JOB_SHA256,
    triggers: ["pull_request", "workflow_dispatch"], scenario_id: "state-w1024-focus",
    synthetic_repository: "example/stylegallery-page-evidence-ci", adapter_version: "1.0",
  };
  const expectedAdoption = {
    authorized_receipt_commits: PAGE_ADOPTER_TRUST_ROOTS.map(({ receipt_commit }) => receipt_commit), status: PAGE_ADOPTER_TRUST_ROOTS.length === 0 ? "unknown" : "verified",
    synthetic_identities: ["ark-jo/StyleGallery", "changeroa/StyleGallery", "example/stylegallery-page-evidence-ci"], receipt_schema: "#/$defs/pageEvidenceAdopterReceipt",
    trust_root_contract: { configuration: "validator_source_only", repository_boundary: "canonical_realpath_device_inode", remote_identity: "exact_origin_url_and_normalized_owner_repo", lineage: "authenticated_ref_to_consumer_to_evidence_to_receipt", packet_validation: "actual_schema_source_session_finalization_capture" },
  };
  const expectedProtected = PAGE_PROTECTED.map(([repositoryPath, expectedSha, role]) => ({ path: repositoryPath, mode: "100644", sha256: expectedSha, role }));
  const expectedArchive = {
    status: "prepared_evidence_only", packet_kind: "page_evidence_manifest", capture_scenario_id: "state-w1024-focus",
    evidence_root: ".omo/evidence/stylegallery-ai-slop-removal/task-29-stylegallery-ai-slop-removal/",
    immutable_archive_commit: "634414a591fbfd35c99d90710c7a2c23ef2d0677", immutable_archive_tree: "09b89d4609bc3f5514941877950f72934e054f2c",
    artifact_files: 23, packet_sha256: "ae15a272a6f952db2f0090e07e0d07d47d352b138ba97aa29dbfbec451f23cbe",
    capture_sha256: "2496b1cf9d3ac6dcda8d255ed7c606f8994836892614c9f8eccdd3206a8f933b", source_sha256: "bb6c565e287908dfa0966870535fc0ba7cdba0cd55852aaad45b90d00b6003dd",
    verify_command: ["node", "scripts/validate-lifecycle-disposition.mjs", "--page-archive-repository", ".omo/evidence/stylegallery-ai-slop-removal/task-29-stylegallery-ai-slop-removal/immutable-page-evidence.git", "--page-archive-commit", "634414a591fbfd35c99d90710c7a2c23ef2d0677", "--page-archive-tree", "09b89d4609bc3f5514941877950f72934e054f2c", "--json"],
  };
  if (!sameJson(retirement.workflow, expectedWorkflow)) add("page_evidence_workflow_binding_invalid", "workflow schedule, job, bytes, synthetic identity, and state contract are sealed", recordPath);
  if (!sameJson(retirement.adoption, expectedAdoption)) add("page_evidence_adopter_state_invalid", "adopter trust roots and current unknown state are immutable configuration", recordPath);
  if (!sameJson(retirement.protected_paths, expectedProtected)) add("page_evidence_protected_set_invalid", "schemas, validators, source/session/finalization, fixtures, docs, and state contract must equal the closed set", recordPath);
  if (!sameJson(retirement.archive_retrieval, expectedArchive)) add("page_evidence_archive_retrieval_invalid", "packet and capture retrieval must remain bound to task-29 evidence", recordPath);
  try {
    const active = readSealedSource({ expectedSha256: PAGE_ACTIVE_WORKFLOW_SHA256, repositoryPath: PAGE_WORKFLOW_PATH, root: repositoryRoot });
    if (sha256(retirePageEvidenceWorkflow(active.bytes)) !== PAGE_RETIRED_WORKFLOW_SHA256) add("page_evidence_retired_workflow_mismatch", "exact one-job retirement bytes differ from the sealed candidate", recordPath);
  } catch (error) { add(error instanceof LifecycleDispositionError ? error.code : "page_evidence_workflow_binding_invalid", error instanceof Error ? error.message : String(error), PAGE_WORKFLOW_PATH); }
  for (const [repositoryPath, expectedSha] of PAGE_PROTECTED) try { readSealedSource({ expectedSha256: expectedSha, repositoryPath, root: repositoryRoot }); }
  catch (error) { add(error instanceof LifecycleDispositionError ? error.code : "page_evidence_protected_content_mismatch", error instanceof Error ? error.message : String(error), repositoryPath); }
}

function validateRecord(value, file) {
  const recordPath = path.relative(repositoryRoot, file);
  if (!value || typeof value !== "object" || Array.isArray(value)) { add("lifecycle_record_invalid", "record must be a JSON object", recordPath); return; }
  const keys = Object.keys(value);
  for (const key of keys.filter((key) => !expectedFields.includes(key))) add("lifecycle_field_unknown", `unknown field ${key}`, recordPath);
  for (const field of requiredFields.filter((field) => !Object.hasOwn(value, field))) add("lifecycle_field_missing", `missing required field ${field}`, recordPath);
  if (!canonicalFamilies.includes(value.family)) add("lifecycle_family_unknown", "family is not one of the three canonical families", recordPath);
  if (value.owner_ref !== "sg:governor/stylegallery-maintainers") add("lifecycle_owner_unknown", "owner_ref must identify the exact governed maintainer owner", recordPath);
  if (!isRfc3339DateTime(value.baseline_recorded_at) || !isRfc3339DateTime(value.due_at)) add("lifecycle_rfc3339_invalid", "baseline_recorded_at and due_at must be valid RFC3339 calendar timestamps", recordPath);
  if (isRfc3339DateTime(value.baseline_recorded_at) && value.baseline_recorded_at !== "2026-07-30T08:52:29Z") add("lifecycle_baseline_mismatch", "baseline_recorded_at must equal the sealed Todo1 baseline timestamp", recordPath);
  const expectedWindow = value.family === "page-evidence-adoption" ? 90 : 60;
  if (value.decision_window_days !== expectedWindow) add("lifecycle_window_invalid", `${value.family} requires a ${expectedWindow}-day decision window`, recordPath);
  if (isRfc3339DateTime(value.baseline_recorded_at) && isRfc3339DateTime(value.due_at)) {
    const baseline = Date.parse(value.baseline_recorded_at);
    const due = Date.parse(value.due_at);
    if (due <= baseline) add("lifecycle_chronology_invalid", "due_at must be later than baseline_recorded_at", recordPath);
    const computed = new Date(baseline + expectedWindow * 86_400_000).toISOString().replace(".000Z", "Z");
    if (value.due_at !== computed) add("lifecycle_due_at_mismatch", `due_at must equal ${computed}`, recordPath);
  }
  if (!["unknown", "verified"].includes(value.caller_status)) add("lifecycle_caller_status_invalid", "caller_status must be unknown or verified; none is forbidden", recordPath);
  if (!["pending_owner", "approved"].includes(value.decision)) add("lifecycle_decision_invalid", "decision must be pending_owner or approved", recordPath);
  if (!["retire_recurring", "retain_archive"].includes(value.post_deadline_action)) add("lifecycle_action_invalid", "post_deadline_action must be retire_recurring or retain_archive", recordPath);
  checkPathList(value.evidence_refs, "evidence_refs", recordPath);
  checkPathList(value.archive_paths, "archive_paths", recordPath);
  if (canonicalArchives[value.family] && !sameJson(value.archive_paths, canonicalArchives[value.family])) add("lifecycle_archive_set_invalid", "archive_paths must equal the complete successor-required canonical set", recordPath);
  if (value.family === "sentinel-calibration") validateSentinelRetirementRecord(value, recordPath);
  else if (value.family === "page-evidence-adoption") validatePageEvidenceRetirementRecord(value, recordPath);
  else if (value.retirement !== undefined) add("lifecycle_retirement_family_invalid", "retirement closure is exclusive to recurring lifecycle families", recordPath);
  const receiptRequired = value.decision === "approved" || value.caller_status === "verified";
  if (receiptRequired && (!value.decision_receipt || typeof value.decision_receipt !== "object" || Array.isArray(value.decision_receipt))) add("lifecycle_receipt_required", "approved or caller-verified records require an authenticated decision receipt", recordPath);
  if (!receiptRequired && value.decision_receipt !== undefined) add("lifecycle_receipt_forbidden", "pending unknown records cannot carry a decision receipt", recordPath);
  if (value.decision_receipt && typeof value.decision_receipt === "object" && !Array.isArray(value.decision_receipt)) {
    const receiptKeys = Object.keys(value.decision_receipt);
    const referenceValid = sameJson(receiptKeys, ["commit", "path", "blob_oid", "sha256"]) && /^[a-f0-9]{40}$/.test(value.decision_receipt.commit ?? "") && typeof value.decision_receipt.path === "string" && /^[a-f0-9]{40}$/.test(value.decision_receipt.blob_oid ?? "") && /^[a-f0-9]{64}$/.test(value.decision_receipt.sha256 ?? "");
    if (!referenceValid) add("lifecycle_receipt_invalid", "decision_receipt must bind an immutable commit path, blob object, and SHA-256", recordPath);
    if (!value.evidence_refs?.includes(value.decision_receipt.path)) add("lifecycle_receipt_binding_invalid", "decision receipt path must be included in evidence_refs", recordPath);
    if (!AUTHORIZED_APPROVAL_COMMITS.includes(value.decision_receipt.commit)) add("lifecycle_receipt_commit_untrusted", "decision receipt commit is not in the CODEOWNERS-governed approval trust root", recordPath);
    if (referenceValid && AUTHORIZED_APPROVAL_COMMITS.includes(value.decision_receipt.commit)) try {
      const codeowners = readImmutableGitObject({ commit: value.decision_receipt.commit, expectedBlob: OWNER_TRUST_ROOT.codeowners_blob, expectedMode: "100644", repositoryPath: OWNER_TRUST_ROOT.codeowners_path, root: repositoryRoot });
      if (sha256(codeowners.bytes) !== OWNER_TRUST_ROOT.codeowners_sha256 || !codeowners.bytes.toString("utf8").includes("/consumer-reference/policies/ @changeroa")) add("lifecycle_owner_trust_invalid", "approval commit does not preserve the exact CODEOWNERS trust root", recordPath);
      const { bytes } = readImmutableGitObject({ commit: value.decision_receipt.commit, expectedBlob: value.decision_receipt.blob_oid, expectedMode: "100644", repositoryPath: value.decision_receipt.path, root: repositoryRoot });
      if (sha256(bytes) !== value.decision_receipt.sha256) add("lifecycle_receipt_hash_mismatch", "decision receipt SHA-256 does not match its immutable blob bytes", recordPath);
      let receipt;
      try { receipt = parseStrictJson(bytes.toString("utf8")); } catch { add("lifecycle_receipt_invalid", "decision receipt is not strict JSON", recordPath); }
      if (receipt) {
        const receiptCode = validateDecisionReceipt({ record: value, receipt, receiptBytes: bytes });
        if (receiptCode) add(receiptCode, "decision receipt content is not bound to this exact lifecycle record", recordPath);
      }
    } catch (error) { add(error instanceof LifecycleDispositionError ? error.code : "lifecycle_receipt_invalid", error instanceof LifecycleDispositionError ? error.message : "immutable decision receipt inspection failed", recordPath); }
  }
  if (value.caller_status === "verified" && !value.decision_receipt) add("lifecycle_caller_evidence_missing", "verified caller status requires an authenticated decision receipt", recordPath);
  if (value.decision === "approved" && value.post_deadline_action !== "retain_archive") add("lifecycle_transition_invalid", "approved records retain their archive and recurring surface", recordPath);
  if (value.family === "protocol-owner-review" && value.post_deadline_action !== "retain_archive") add("lifecycle_transition_invalid", "unknown external protocol callers forbid automatic retirement", recordPath);
  if (value.caller_status === "verified" && value.post_deadline_action === "retire_recurring") add("lifecycle_transition_invalid", "verified callers forbid recurring retirement without migration", recordPath);
  if (options.asOf && isRfc3339DateTime(options.asOf) && isRfc3339DateTime(value.due_at) && Date.parse(options.asOf) >= Date.parse(value.due_at) && value.decision === "pending_owner") {
    const expectedAction = value.family === "protocol-owner-review" ? "retain_archive" : "retire_recurring";
    if (value.post_deadline_action !== expectedAction) add("lifecycle_expired_undisposed", `expired pending record requires ${expectedAction}`, recordPath);
  }
  if (!validateSchema(value)) add("lifecycle_schema_invalid", (validateSchema.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message}`).join("; "), recordPath);
  if (options.records.length === 0 && fs.readFileSync(file, "utf8") !== canonicalBytes(value)) add("lifecycle_serialization_drift", "canonical records use deterministic two-space JSON with one trailing newline", recordPath);
}
if (options.asOf !== undefined && !isRfc3339DateTime(options.asOf)) add("lifecycle_clock_invalid", "--as-of must be a valid RFC3339 timestamp", "<cli>");
const extensionResults = [];
if (options.records.length === 0) {
  for (const relative of PROTOCOL_EXTENSION_RECORDS) {
    const file = safeInput(path.join(repositoryRoot, relative), "file", "protocol_extension_input_invalid", "protocol extension record");
    const record = file && readStrict(file, "protocol_extension_json_invalid");
    if (!record) continue;
    if (!validateExtensionSchema(record)) add("protocol_extension_schema_invalid", (validateExtensionSchema.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message}`).join("; "), relative);
    if (fs.readFileSync(file, "utf8") !== canonicalBytes(record)) add("protocol_extension_serialization_drift", "extension records use deterministic two-space JSON with one trailing newline", relative);
    const result = validateProtocolExtensionDisposition({ asOf: options.asOf ?? "2026-08-01T00:00:00Z", record, root: repositoryRoot });
    failures.push(...result.failures.map((failure) => ({ ...failure, path: failure.path === "<protocol-extension>" ? relative : failure.path })));
    extensionResults.push({ protocol: record.protocol, version: record.current_version, external_caller_status: record.external_callers?.status, state: result.state, action: result.action });
  }
}
const records = [];
for (const candidate of recordFiles) {
  const file = safeInput(candidate, "file", "lifecycle_input_path_invalid", "lifecycle record");
  if (!file || path.extname(file) !== ".json") continue;
  const value = readStrict(file, "lifecycle_json_invalid");
  if (value !== undefined) { records.push(value); validateRecord(value, file); }
}
const families = records.map(({ family }) => family);
if (new Set(families).size !== families.length) add("lifecycle_family_duplicate", "each lifecycle family may appear exactly once", "<records>");
if (options.records.length === 0 && !sameJson(families, canonicalFamilies)) add("lifecycle_manifest_order_drift", "canonical records must occur in family order", canonicalManifest);
if (options.pageArchiveRepository || options.pageArchiveCommit || options.pageArchiveTree) {
  if (!options.pageArchiveRepository || !options.pageArchiveCommit || !options.pageArchiveTree) failures.push({ code: "page_evidence_archive_arguments_required", message: "page archive repository, commit, and tree arguments are required together", path: "<cli>" });
  else failures.push(...validatePageEvidenceArchive({ root: options.pageArchiveRepository, commit: options.pageArchiveCommit, tree: options.pageArchiveTree }).failures);
}
if (options.sentinelArchiveRepository || options.sentinelArchiveCommit || options.sentinelArchiveTree) {
  if (!options.sentinelArchiveRepository || !options.sentinelArchiveCommit || !options.sentinelArchiveTree) failures.push({ code: "sentinel_archive_arguments_required", message: "archive repository, commit, and tree arguments are required together", path: "<cli>" });
  else failures.push(...validateSentinelArchive({ root: options.sentinelArchiveRepository, commit: options.sentinelArchiveCommit, tree: options.sentinelArchiveTree }).failures);
}
if (options.sentinelBundle || options.bundleRepository) {
  if (!options.sentinelBundle || !options.bundleRepository || !options.asOf) add("sentinel_bundle_arguments_required", "--sentinel-bundle, --bundle-repository, and --as-of are required together", "<cli>");
  else {
    let bundle;
    try { bundle = parseStrictJson(fs.readFileSync(options.sentinelBundle, "utf8")); }
    catch (error) { add("sentinel_bundle_json_invalid", error instanceof Error ? error.message : String(error), options.sentinelBundle); }
    if (bundle) failures.push(...validateSentinelRetirementBundle({ asOf: options.asOf, bundle, root: options.bundleRepository }).failures);
  }
}

const uniqueFailures = [...new Map(failures.map((entry) => [`${entry.code}:${entry.path}:${entry.message}`, entry])).values()];
const result = { checked: records.length + extensionResults.length, failures: uniqueFailures, ok: uniqueFailures.length === 0, records: records.map(({ family, due_at, decision, post_deadline_action }) => ({ family, due_at, decision, post_deadline_action })), extensions: extensionResults };
if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else if (result.ok) process.stdout.write(`ok: ${records.length} lifecycle disposition records\n`);
else process.stderr.write(`${uniqueFailures.map(({ code, path: recordPath, message }) => `${code}: ${recordPath}: ${message}`).join("\n")}\n`);
if (!result.ok) process.exitCode = 1;
return result;
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? "")).href) main();
