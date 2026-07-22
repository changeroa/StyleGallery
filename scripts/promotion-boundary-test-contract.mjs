import fs from "node:fs";
import path from "node:path";

export function copyTreeNoSymlinks(source, target) {
  fs.cpSync(source, target, { recursive: true, filter: (candidate) => {
    if (fs.lstatSync(candidate).isSymbolicLink()) throw new Error(`refusing to copy symlink ${candidate}`);
    return true;
  } });
}

function copyFixtureRoot(fixtureRoot, tempRoot, name) {
  const root = path.join(tempRoot, name);
  copyTreeNoSymlinks(fixtureRoot, root);
  return root;
}

function editJson(file, mutate) {
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  mutate(value);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function result(runArguments, name, args, expected) {
  const child = runArguments(args);
  const codes = child.report.failures.map((failure) => failure.code);
  return { actual: { codes, status: child.status }, expected, name, ok: child.status > 0 && codes.includes(expected) };
}

export function testPromotionBoundaries({ fixtureRoot, repositoryRoot, runArguments, tempRoot }) {
  const results = [];
  for (const [name, args] of [["file_option_value", ["--file", "--json"]], ["policy_option_value", ["--policy", "--json"]], ["profile_root_option_value", ["--profile-repository-root", "--json"]]]) {
    results.push(result(runArguments, name, args, "argument_value_required"));
  }
  const yamlRfc = path.join(tempRoot, "promotion.yaml");
  const yamlPolicy = path.join(tempRoot, "policy.yaml");
  fs.copyFileSync(path.join(fixtureRoot, "valid-deferred-example.json"), yamlRfc);
  fs.copyFileSync(path.join(repositoryRoot, "consumer-reference/policies/shared-experimental.json"), yamlPolicy);
  results.push(result(runArguments, "rfc_yaml_extension", ["--file", yamlRfc, "--json"], "promotion_json_path_required"));
  results.push(result(runArguments, "policy_yaml_extension", ["--policy", yamlPolicy, "--json"], "promotion_json_path_required"));

  const linkedRfc = path.join(tempRoot, "linked-rfc.json");
  const linkedPolicy = path.join(tempRoot, "linked-policy.json");
  fs.symlinkSync(path.join(fixtureRoot, "valid-deferred-example.json"), linkedRfc);
  fs.symlinkSync(path.join(repositoryRoot, "consumer-reference/policies/shared-experimental.json"), linkedPolicy);
  results.push(result(runArguments, "rfc_symlink", ["--file", linkedRfc, "--json"], "promotion_input_path_invalid"));
  results.push(result(runArguments, "policy_symlink", ["--policy", linkedPolicy, "--json"], "promotion_input_path_invalid"));

  for (const [name, mutate] of [
    ["inventory_extra_json", (root) => fs.copyFileSync(path.join(fixtureRoot, "valid-deferred-example.json"), path.join(root, "extra.json"))],
    ["inventory_extra_yaml", (root) => fs.copyFileSync(path.join(fixtureRoot, "valid-deferred-example.json"), path.join(root, "extra.yaml"))],
    ["inventory_missing", (root) => fs.rmSync(path.join(root, "invalid-count-only.json"))],
    ["inventory_duplicate", (root) => editJson(path.join(root, "manifest.json"), (value) => value.valid_records.push(value.valid_records[0]))],
  ]) {
    const root = copyFixtureRoot(fixtureRoot, tempRoot, name);
    mutate(root);
    results.push(result(runArguments, name, ["--promotion-fixture-root", root, "--json"], "promotion_fixture_inventory_invalid"));
  }

  const rejectedRoot = copyFixtureRoot(fixtureRoot, tempRoot, "canonical-rejected");
  editJson(path.join(rejectedRoot, "valid-deferred-example.json"), (value) => { value.decision = "rejected"; });
  results.push(result(runArguments, "canonical_rejected", ["--promotion-fixture-root", rejectedRoot, "--json"], "promotion_canonical_example_invalid"));
  const attestedRoot = copyFixtureRoot(fixtureRoot, tempRoot, "canonical-attested");
  editJson(path.join(attestedRoot, "valid-deferred-example.json"), (value) => { value.attestations = [{ attested_by: "Synthetic", context_id: "test", consumer_id: "fake", count_toward_gate: false, organization_id: "test", relationship: "related" }]; });
  results.push(result(runArguments, "canonical_attested", ["--promotion-fixture-root", attestedRoot, "--json"], "promotion_canonical_example_invalid"));

  const unbound = path.join(tempRoot, "unbound.json");
  const duplicateEvidence = path.join(tempRoot, "duplicate-evidence.json");
  fs.copyFileSync(path.join(fixtureRoot, "valid-deferred-example.json"), unbound);
  editJson(unbound, (value) => { value.attestations = [{ attested_by: "Synthetic", context_id: "test", consumer_id: "fake", count_toward_gate: false, organization_id: "test", relationship: "related" }]; });
  fs.copyFileSync(path.join(fixtureRoot, "valid-deferred-example.json"), duplicateEvidence);
  editJson(duplicateEvidence, (value) => { value.evidence.push(structuredClone(value.evidence[0])); });
  results.push(result(runArguments, "unbound_uncounted", ["--file", unbound, "--json"], "promotion_attestation_profile_required"));
  results.push(result(runArguments, "duplicate_evidence_id", ["--file", duplicateEvidence, "--json"], "promotion_evidence_duplicate"));
  results.push(result(runArguments, "missing_profile_root", ["--file", path.join(fixtureRoot, "valid-deferred-example.json"), "--profile-repository-root", path.join(tempRoot, "missing-root"), "--json"], "promotion_profile_registry_invalid"));
  const linkedProfileRoot = path.join(tempRoot, "linked-profile-root");
  fs.symlinkSync(repositoryRoot, linkedProfileRoot);
  results.push(result(runArguments, "symlink_profile_root", ["--file", path.join(fixtureRoot, "valid-deferred-example.json"), "--profile-repository-root", linkedProfileRoot, "--json"], "promotion_profile_registry_invalid"));
  const linkedManifestRoot = copyFixtureRoot(fixtureRoot, tempRoot, "linked-manifest-root");
  fs.rmSync(path.join(linkedManifestRoot, "manifest.json"));
  fs.symlinkSync(path.join(fixtureRoot, "manifest.json"), path.join(linkedManifestRoot, "manifest.json"));
  results.push(result(runArguments, "symlink_manifest", ["--promotion-fixture-root", linkedManifestRoot, "--json"], "promotion_fixture_inventory_invalid"));

  const strictRoot = path.join(tempRoot, "strict-profile-root");
  copyTreeNoSymlinks(path.join(repositoryRoot, "design-engineering/reference-profiles/governed-local"), path.join(strictRoot, "design-engineering/reference-profiles/governed-local"));
  const foundations = path.join(strictRoot, "design-engineering/reference-profiles/governed-local/editorial/local-foundations.json");
  fs.writeFileSync(foundations, fs.readFileSync(foundations, "utf8").replace('"identity":', '"identity":"Duplicate",\n  "identity":'));
  const counted = path.join(tempRoot, "strict-counted.json");
  fs.copyFileSync(path.join(fixtureRoot, "valid-deferred-example.json"), counted);
  editJson(counted, (value) => { value.attestations = [{ attested_by: "Synthetic", context_id: "editorial", consumer_id: "editorial-reference-profile", count_toward_gate: true, organization_id: "test", profile_record: "design-engineering/reference-profiles/governed-local/editorial/profile.json", relationship: "independent" }]; });
  results.push(result(runArguments, "duplicate_foundation_identity", ["--file", counted, "--profile-repository-root", strictRoot, "--json"], "promotion_independence_unproven"));
  return results;
}
