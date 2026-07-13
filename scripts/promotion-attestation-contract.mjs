import fs from "node:fs";
import path from "node:path";
import { isPlainObject } from "./consumer-reference-schema.mjs";
import { canonicalGovernedProfilePaths, isIndependentPromotionProfile } from "./governed-profile-registry.mjs";

function finding(code, message, recordPath) {
  return { code, message, path: recordPath };
}

function safeProfilePath(relative, profileRoot, recordPath, failures) {
  if (typeof relative !== "string" || !/^(?!\/)(?!.*\/\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?![A-Za-z][A-Za-z0-9+.-]*:)[^\\?#]+\.json$/.test(relative)) {
    failures.push(finding("promotion_profile_path_invalid", "profile_record must be a normalized repository-relative JSON path", recordPath));
    return undefined;
  }
  const target = path.resolve(profileRoot, relative);
  if (target === profileRoot || !target.startsWith(`${profileRoot}${path.sep}`)) {
    failures.push(finding("promotion_profile_path_invalid", "profile_record escapes the repository", recordPath));
    return undefined;
  }
  let current = profileRoot;
  for (const segment of path.relative(profileRoot, target).split(path.sep)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) {
      failures.push(finding("promotion_profile_missing", `${relative} does not exist`, recordPath));
      return undefined;
    }
    if (fs.lstatSync(current).isSymbolicLink()) {
      failures.push(finding("promotion_profile_path_symlink", `${relative} traverses a symlink`, recordPath));
      return undefined;
    }
  }
  if (!fs.lstatSync(target).isFile()) {
    failures.push(finding("promotion_profile_invalid", `${relative} must be a regular JSON file`, recordPath));
    return undefined;
  }
  const realRoot = fs.realpathSync(profileRoot);
  const real = fs.realpathSync(target);
  if (!real.startsWith(`${realRoot}${path.sep}`) || real !== path.join(realRoot, relative)) {
    failures.push(finding("promotion_profile_path_invalid", `${relative} resolves outside the repository`, recordPath));
    return undefined;
  }
  return relative;
}

export function validatePromotionAttestations({ inventory, profileRoot, recordPath, value }) {
  const attestations = Array.isArray(value.attestations) ? value.attestations : [];
  const consumers = new Set();
  const countedContexts = new Set();
  const countedOrganizations = new Set();
  const failures = [];
  const identities = new Set();
  let eligibleCount = 0;
  for (const attestation of attestations) {
    if (!isPlainObject(attestation)) continue;
    const identity = `${attestation.consumer_id ?? ""}:${attestation.context_id ?? ""}:${attestation.organization_id ?? ""}`;
    if (identities.has(identity) || consumers.has(attestation.consumer_id)) failures.push(finding("promotion_attestation_duplicate", `duplicate consumer or attestation identity ${identity}`, recordPath));
    identities.add(identity);
    consumers.add(attestation.consumer_id);
    const counted = attestation.count_toward_gate === true;
    if (attestation.profile_record === undefined) {
      failures.push(finding("promotion_attestation_profile_required", `${identity} has no canonical repository-local profile record`, recordPath));
      if (counted) failures.push(finding("promotion_independence_unproven", `${identity} cannot establish counted independence without a profile record`, recordPath));
      continue;
    }
    const registeredPath = safeProfilePath(attestation.profile_record, profileRoot, recordPath, failures);
    if (!registeredPath) continue;
    const registered = inventory.records.get(registeredPath);
    if (!canonicalGovernedProfilePaths.includes(registeredPath) || !registered || registered.failures.length > 0 || inventory.failures.length > 0) {
      failures.push(finding("promotion_independence_unproven", `${attestation.consumer_id} is not a fully validated registered governed profile`, recordPath));
      continue;
    }
    const profile = registered.profile;
    if (!isPlainObject(profile)) continue;
    const identityMatches = profile.id === attestation.consumer_id;
    if (!identityMatches) failures.push(finding("promotion_profile_identity_mismatch", `${attestation.profile_record} does not match ${attestation.consumer_id}`, recordPath));
    if (!counted) continue;
    if (attestation.relationship !== "independent") failures.push(finding("promotion_related_consumer_counted", `${identity} is related and cannot count toward the independent gateway`, recordPath));
    if (countedOrganizations.has(attestation.organization_id) || countedContexts.has(attestation.context_id)) {
      failures.push(finding("promotion_independence_unproven", `${identity} does not establish a distinct organization and context`, recordPath));
    }
    countedOrganizations.add(attestation.organization_id);
    countedContexts.add(attestation.context_id);
    const canonicalIndependent = profile.fixture_independence === "independent" && typeof profile.related_fixture_set_id !== "string";
    if (!canonicalIndependent) failures.push(finding("promotion_related_consumer_counted", `${attestation.consumer_id} is a canonical related fixture and cannot count`, recordPath));
    if (identityMatches && attestation.relationship === "independent" && canonicalIndependent && isIndependentPromotionProfile(profile)) eligibleCount += 1;
    else if (identityMatches && canonicalIndependent && !isIndependentPromotionProfile(profile)) {
      failures.push(finding("promotion_independence_unproven", `${attestation.consumer_id} is not lifecycle- and scope-eligible independent adoption evidence`, recordPath));
    }
  }
  return { eligibleCount, failures };
}
