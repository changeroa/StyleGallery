import { createHash } from "node:crypto";
import { canonicalize, hashCanonical } from "./agent-native/canonical-json.mjs";
import {
  createManifest,
  createStableRef,
  createVersionId,
  parseStableRef,
  parseVersionId,
  verifyManifest,
} from "./agent-native/identity.mjs";
import { createImmutableStore } from "./agent-native/immutable-store.mjs";

class IntegrityAssertionError extends Error {
  constructor(message) {
    super(message);
    this.code = "assertion_failed";
  }
}

function assert(condition, message) {
  if (!condition) throw new IntegrityAssertionError(message);
}

function expectCode(execute, code, message) {
  try {
    execute();
  } catch (error) {
    assert(error?.code === code, `${message}: expected ${code}, got ${error?.code}`);
    return error.code;
  }
  throw new IntegrityAssertionError(`${message}: operation succeeded`);
}

async function runCase(name, expected, execute) {
  try {
    return { actual: await execute(), expected, name, ok: true };
  } catch (error) {
    return {
      actual: {
        code: error?.code ?? "integrity_case_exception",
        message: error instanceof Error ? error.message : String(error),
        ...(error?.path ? { path: error.path } : {}),
      },
      expected,
      name,
      ok: false,
    };
  }
}

function versioned(stable_ref, content) {
  return { ...content, stable_ref, version_id: createVersionId({ stable_ref, payload: content }) };
}

export async function runIdentityIntegrityCases() {
  const results = [];
  results.push(await runCase("canonical_json_is_recursive_and_deterministic", "keys sorted recursively", () => {
    const bytes = canonicalize({ z: 2, a: { z: false, b: 1 }, m: [3, { y: 1, x: 0 }] });
    assert(bytes === '{"a":{"b":1,"z":false},"m":[3,{"x":0,"y":1}],"z":2}', `unexpected canonical bytes: ${bytes}`);
    const hashBytes = canonicalize({ b: 2, a: 1 });
    const digest = hashCanonical({ b: 2, a: 1 }).slice("sha256:".length);
    assert(digest === createHash("sha256").update(hashBytes).digest("hex"), "canonical hash does not match canonical UTF-8 bytes");
    return { bytes, digest };
  }));
  results.push(await runCase("stable_ref_grammar_and_round_trip", "governed StableRef round-trips", () => {
    const stable_ref = createStableRef({ kind: "claim", id: "editorial-layout" });
    assert(parseStableRef(stable_ref).id === "editorial-layout", "opaque id was not parsed");
    expectCode(() => parseStableRef("claim/editorial layout"), "stable_ref_invalid", "malformed StableRef accepted");
    return { stable_ref };
  }));
  results.push(await runCase("version_id_binds_domain_identity_and_all_content", "StableRef and domain id alter digest", () => {
    const first = createVersionId({ stable_ref: "sg:claim/shared", id: "alpha", statement: "same" });
    const reordered = createVersionId({ statement: "same", id: "alpha", stable_ref: "sg:claim/shared" });
    const second = createVersionId({ stable_ref: "sg:claim/shared", id: "beta", statement: "same" });
    const otherRef = createVersionId({ stable_ref: "sg:claim/other", id: "alpha", statement: "same" });
    assert(first === reordered, "VersionID depends on object key order");
    assert(first !== second, "records differing only by domain id collided");
    assert(first.split("@sha256:")[1] !== otherRef.split("@sha256:")[1], "StableRef was absent from digest input");
    const parsed = parseVersionId({ version_id: first, stable_ref: "sg:claim/shared", payload: { id: "alpha", statement: "same" } });
    assert(parsed.stable_ref === "sg:claim/shared", "VersionID lost its StableRef");
    const parsedString = parseVersionId(first);
    assert(parsedString.version_id === first && parsedString.stable_ref === "sg:claim/shared", "raw VersionID string did not round-trip");
    expectCode(
      () => parseVersionId({ version_id: first, payload: { id: "beta", statement: "same" } }),
      "version_digest_mismatch",
      "changed domain id verified",
    );
    return { first, second, other_ref: otherRef };
  }));
  results.push(await runCase("immutable_store_rehashes_every_append", "forged and altered records are rejected", () => {
    const store = createImmutableStore();
    const valid = versioned("sg:claim/store-fixture", { id: "alpha", nested: { value: "original" } });
    const inserted = store.append(valid);
    assert(Object.isFrozen(inserted) && Object.isFrozen(inserted.nested), "stored record is not deeply frozen");
    try { inserted.nested.value = "tampered"; } catch { /* frozen ESM records throw */ }
    assert(inserted.nested.value === "original", "stored nested bytes were mutable");
    expectCode(
      () => store.append({ ...valid, stable_ref: "sg:claim/forged", version_id: `sg:claim/forged@sha256:${"0".repeat(64)}` }),
      "version_digest_mismatch",
      "forged VersionID accepted",
    );
    expectCode(
      () => store.append({ ...valid, nested: { value: "tampered" } }),
      "version_digest_mismatch",
      "altered bytes accepted under an existing VersionID",
    );
    return { size: store.size, version_id: valid.version_id };
  }));
  results.push(await runCase("manifest_binds_version_digest_content_digest_and_content", "inline content is checked three ways", () => {
    const alphaContent = { id: "alpha", statement: "A" };
    const zetaContent = { id: "zeta", statement: "Z" };
    const entry = (stable_ref, content) => ({
      stable_ref,
      content,
      content_sha256: hashCanonical(content).slice("sha256:".length),
      version_id: createVersionId({ stable_ref, payload: content }),
    });
    const manifest = createManifest({
      manifest_ref: "sg:manifest/identity-fixture",
      entries: [entry("sg:claim/zeta", zetaContent), entry("sg:claim/alpha", alphaContent)],
    });
    assert(manifest.entries[0].stable_ref === "sg:claim/alpha", "entries were not sorted");
    assert(new Set(manifest.entries.map(({ stable_ref }) => stable_ref)).size === manifest.entries.length, "entries were not unique");
    assert(verifyManifest(manifest).ok, "fresh content-backed manifest failed verification");
    expectCode(
      () => createManifest({ manifest_ref: "sg:manifest/identity-fixture", entries: [entry("sg:claim/alpha", alphaContent), entry("sg:claim/alpha", alphaContent)] }),
      "manifest_entry_duplicate",
      "duplicate StableRefs accepted",
    );
    expectCode(
      () => createManifest({ manifest_ref: "sg:manifest/identity-fixture", entries: [{ ...entry("sg:claim/alpha", alphaContent), content: { id: "beta", statement: "A" } }] }),
      "version_digest_mismatch",
      "VersionID unrelated to inline content accepted",
    );
    expectCode(
      () => createManifest({ manifest_ref: "sg:manifest/identity-fixture", entries: [{ ...entry("sg:claim/alpha", alphaContent), content_sha256: "1".repeat(64) }] }),
      "manifest_content_digest_mismatch",
      "content digest unrelated to inline content accepted",
    );
    expectCode(
      () => createManifest({ manifest_ref: "sg:manifest/identity-fixture", entries: [{ ...entry("sg:claim/alpha", alphaContent), content: { ...alphaContent, stable_ref: "sg:claim/zeta" } }] }),
      "manifest_content_ref_mismatch",
      "content carrying a different StableRef accepted",
    );
    expectCode(
      () => createManifest({ manifest_ref: "sg:manifest/identity-fixture", entries: [{ ...entry("sg:claim/alpha", alphaContent), content: { ...alphaContent, version_id: `sg:claim/alpha@sha256:${"0".repeat(64)}` } }] }),
      "manifest_content_version_mismatch",
      "content carrying a different VersionID accepted",
    );
    const tampered = structuredClone(manifest);
    tampered.entries[0].content.statement = "tampered";
    const verification = verifyManifest(tampered);
    assert(!verification.ok && verification.failures.some(({ code }) => code === "version_digest_mismatch"), "tampered inline content verified");
    const digestTampered = structuredClone(manifest);
    digestTampered.sha256 = "0".repeat(64);
    assert(!verifyManifest(digestTampered).ok, "tampered manifest digest verified");
    return { entries: manifest.entries.length, version_id: manifest.version_id };
  }));
  return results;
}
