import { BASELINE_METADATA_SHA256, BASELINE_REFERENCE } from "./baseline-contract.mjs";

const executionRepositories = ["ark-jo/StyleGallery", "changeroa/StyleGallery"];

export function baselineSchemaParity(schema, canonical, completedEvidence) {
  const committedSchema = schema.properties.committed_ci.oneOf.find((entry) => entry.type === "object");
  const externalSchema = committedSchema.properties.external_verification?.oneOf?.find((entry) => entry.type === "object") ?? {};
  const artifactSchema = externalSchema.properties?.artifact ?? {};
  const relationshipSchema = externalSchema.properties?.repository_relationship ?? {};
  const runSchema = schema.properties.runs.items;
  const runContains = schema.allOf[0].else.properties.runs.allOf;
  return schema.additionalProperties === false
    && committedSchema.additionalProperties === false
    && schema.properties.environment.additionalProperties === false
    && Object.entries(canonical.environment).every(([key, value]) => key === "viewport"
      ? JSON.stringify(schema.properties.environment.properties.viewport.properties) === JSON.stringify({ width: { const: value.width }, height: { const: value.height } })
      : schema.properties.environment.properties[key].const === value)
    && schema.properties.reference.additionalProperties === false
    && schema.properties.reference.properties.source.additionalProperties === false
    && schema.properties.reference.properties.source.properties.sha256.const === BASELINE_REFERENCE.source.sha256
    && schema.properties.reference.properties.baseline.properties.sha256.const === BASELINE_REFERENCE.baseline.sha256
    && runSchema.additionalProperties === false
    && runSchema.properties.png_sha256.const === BASELINE_REFERENCE.baseline.sha256
    && runSchema.properties.metadata_sha256.const === BASELINE_METADATA_SHA256
    && committedSchema.properties.repository.const === "changeroa/StyleGallery"
    && JSON.stringify(committedSchema.properties.execution_repository?.enum ?? []) === JSON.stringify(executionRepositories)
    && externalSchema.additionalProperties === false
    && artifactSchema.additionalProperties === false
    && relationshipSchema.additionalProperties === false
    && artifactSchema.properties?.api_digest?.const === completedEvidence.artifactApiDigest
    && artifactSchema.properties?.id?.const === completedEvidence.artifactId
    && artifactSchema.properties?.name?.const === completedEvidence.artifactName
    && artifactSchema.properties?.size_in_bytes?.const === completedEvidence.artifactSize
    && artifactSchema.properties?.expires_at?.const === completedEvidence.artifactExpiresAt
    && externalSchema.properties?.source?.const === completedEvidence.source
    && externalSchema.properties?.verified_at?.const === completedEvidence.verifiedAt
    && JSON.stringify(runContains.map((entry) => entry.contains.properties.run.const).sort((left, right) => left - right)) === JSON.stringify(Array.from({ length: 20 }, (_, index) => index + 1))
    && runContains.every((entry) => entry.minContains === 1 && entry.maxContains === 1)
    && JSON.stringify([...committedSchema.required].sort()) === JSON.stringify(["artifact_name", "checkout_sha", "execution_repository", "external_verification", "head_sha", "raw_evidence_sha256", "repository", "run_attempt", "run_id", "sha", "workflow"].sort());
}
