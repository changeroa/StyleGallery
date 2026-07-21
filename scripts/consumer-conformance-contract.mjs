import { isPlainObject } from "./consumer-reference-schema.mjs";

export const MIGRATION_DIMENSIONS = Object.freeze([
  "behavior_inventory",
  "route_parity",
  "field_parity",
  "action_parity",
  "state_transitions",
  "contract_precedence",
  "direct_mutation",
  "indirect_mutation",
  "persistence_round_trip",
  "reset_boundary",
  "exact_time_boundary",
  "defaults_tri_state_mapping",
  "atomic_batch_behavior",
]);

export const RUNTIME_EVIDENCE_METHODS = Object.freeze(["unit", "integration", "browser"]);

const sentencePattern = /^\S+(?:\s+\S+){2,}\s*[.!?]$/;
const revisionPattern = /^[a-f0-9]{40}$/;
const componentPattern = /^[A-Z][A-Za-z0-9]*(?:[._/-][A-Za-z0-9_-]+)*$/;
const selectorPattern = /^(?:[.#][A-Za-z_][A-Za-z0-9_-]*|\[[A-Za-z_:][-A-Za-z0-9_:.]*(?:=[^\]\r\n]+)?\])$/;

function finding(code, message, recordPath) {
  return { code, message, path: recordPath };
}

function uniqueFindings(findings) {
  return [...new Map(findings.map((entry) => [`${entry.code}:${entry.path}:${entry.message}`, entry])).values()];
}

function sameStringSet(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && new Set(left).size === left.length
    && left.every((entry) => right.includes(entry));
}

export function isNormalizedRepositoryPath(value, { jsonOnly = false } = {}) {
  if (typeof value !== "string" || value.length === 0 || value.startsWith("/") || value.endsWith("/") || value.includes("\\") || value.includes("//") || value.includes("?") || value.includes("#")) return false;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) return false;
  if (value.split("/").some((segment) => segment === "." || segment === ".." || segment.length === 0)) return false;
  return !jsonOnly || value.endsWith(".json");
}

function isSentence(value) {
  return typeof value === "string" && value.length >= 10 && sentencePattern.test(value);
}

function isConsumerTarget(target) {
  if (!isPlainObject(target) || typeof target.identity !== "string") return false;
  if (target.kind === "component") return componentPattern.test(target.identity);
  if (target.kind === "selector") return selectorPattern.test(target.identity);
  if (target.kind === "module") return isNormalizedRepositoryPath(target.identity);
  return false;
}

function schemaCode(error) {
  const pointer = error.instancePath ?? "";
  const missing = error.params?.missingProperty;
  if (pointer === "/migration_dimensions" && MIGRATION_DIMENSIONS.includes(missing)) return "migration_dimension_required";
  if (/^\/migration_dimensions\/[^/]+\/scenario_ids$/.test(pointer) && error.keyword === "minItems") return "migration_dimension_scenario_required";
  if (/^\/scenarios\/\d+\/evidence_method$/.test(pointer)) return "runtime_evidence_method_invalid";
  if (/^\/adoption_mappings\/\d+\/consumer_target/.test(pointer)) return "adoption_consumer_target_invalid";
  if (/^\/adoption_mappings\/\d+\/stylegallery\/revision$/.test(pointer)) return "adoption_stylegallery_revision_unpinned";
  if (/^\/adoption_mappings\/\d+\/debt\/\d+/.test(pointer)) return "adoption_debt_incomplete";
  return "consumer_conformance_schema_invalid";
}

export function consumerConformanceSchemaFindings(errors, recordPath) {
  return uniqueFindings((errors ?? []).map((error) => finding(
    schemaCode(error),
    `${error.instancePath || "/"} ${error.message ?? "does not satisfy the schema"}`,
    recordPath,
  )));
}

export function validateConsumerConformanceSemantics(value, recordPath) {
  const findings = [];
  const add = (code, message) => findings.push(finding(code, message, recordPath));
  if (!isPlainObject(value)) {
    add("consumer_conformance_record_invalid", "consumer conformance record must be a JSON object");
    return findings;
  }

  const scenarios = Array.isArray(value.scenarios) ? value.scenarios.filter(isPlainObject) : [];
  const scenarioIds = scenarios.map((scenario) => scenario.id).filter((id) => typeof id === "string");
  const scenarioSet = new Set(scenarioIds);
  if (scenarioIds.length !== scenarioSet.size) add("runtime_scenario_id_duplicate", "runtime scenario IDs must be unique");
  for (const scenario of scenarios) {
    if (!RUNTIME_EVIDENCE_METHODS.includes(scenario.evidence_method)) add("runtime_evidence_method_invalid", "runtime evidence must use unit, integration, or browser execution");
    if (["unit", "integration"].includes(scenario.evidence_method) && scenario.argv?.[0] !== "node") add("runtime_command_executable_invalid", "unit and integration evidence must use the governed Node runtime");
    if (scenario.exit_code !== 0) add("runtime_evidence_exit_nonzero", `scenario ${scenario.id ?? "<unknown>"} must record exit code zero`);
    if (!isNormalizedRepositoryPath(scenario.result_artifact, { jsonOnly: true })) add("runtime_result_artifact_invalid", `scenario ${scenario.id ?? "<unknown>"} requires a normalized JSON result artifact`);
  }

  const dimensions = isPlainObject(value.migration_dimensions) ? value.migration_dimensions : {};
  for (const dimensionName of MIGRATION_DIMENSIONS) {
    if (!Object.hasOwn(dimensions, dimensionName)) {
      add("migration_dimension_required", `migration dimension ${dimensionName} must be explicitly classified`);
      continue;
    }
    const dimension = dimensions[dimensionName];
    if (!isPlainObject(dimension)) continue;
    if (dimension.status === "applicable") {
      if (!Array.isArray(dimension.scenario_ids) || dimension.scenario_ids.length === 0) {
        add("migration_dimension_scenario_required", `applicable migration dimension ${dimensionName} requires a runtime scenario`);
      } else {
        for (const scenarioId of dimension.scenario_ids) {
          if (!scenarioSet.has(scenarioId)) add("migration_dimension_scenario_unknown", `migration dimension ${dimensionName} references unknown scenario ${scenarioId}`);
        }
      }
    } else if (dimension.status === "not_applicable" && !isSentence(dimension.reason)) {
      add("migration_dimension_reason_invalid", `not-applicable migration dimension ${dimensionName} requires a sentence reason`);
    }
  }

  const mappings = Array.isArray(value.adoption_mappings) ? value.adoption_mappings.filter(isPlainObject) : [];
  for (const [index, mapping] of mappings.entries()) {
    if (!isConsumerTarget(mapping.consumer_target)) add("adoption_consumer_target_invalid", `adoption mapping ${index} requires a normalized local component, selector, or module identity`);
    if (!revisionPattern.test(mapping.stylegallery?.revision ?? "")) add("adoption_stylegallery_revision_unpinned", `adoption mapping ${index} requires a full StyleGallery revision`);
    for (const scenarioId of Array.isArray(mapping.scenario_ids) ? mapping.scenario_ids : []) {
      if (!scenarioSet.has(scenarioId)) add("adoption_scenario_unknown", `adoption mapping ${index} references unknown scenario ${scenarioId}`);
    }
    for (const debt of Array.isArray(mapping.debt) ? mapping.debt : []) {
      if (!isPlainObject(debt) || typeof debt.owner !== "string" || debt.owner.length === 0 || !isSentence(debt.review_trigger) || typeof debt.review_by !== "string") {
        add("adoption_debt_incomplete", `adoption mapping ${index} debt requires owner, review trigger, and review-by date`);
      }
    }
  }

  if (value.page_evidence?.status === "applicable" && !isNormalizedRepositoryPath(value.page_evidence.manifest, { jsonOnly: true })) {
    add("page_evidence_manifest_path_invalid", "applicable page evidence requires a normalized JSON manifest path");
  }
  return uniqueFindings(findings);
}

export function validateConsumerPageIntentSemantics(value, recordPath) {
  if (!isPlainObject(value) || value.page_evidence?.status !== "applicable") return [];
  const findings = [];
  const add = (code, message) => findings.push(finding(code, message, recordPath));
  const scenarios = Array.isArray(value.scenarios) ? value.scenarios.filter(isPlainObject) : [];
  const browserIds = scenarios.filter((scenario) => scenario.evidence_method === "browser").map((scenario) => scenario.id);
  if (browserIds.length === 0) {
    add("page_evidence_runtime_scenario_required", "applicable page evidence requires at least one browser runtime scenario");
    return findings;
  }
  const mappingIds = new Set((Array.isArray(value.adoption_mappings) ? value.adoption_mappings : [])
    .flatMap((mapping) => Array.isArray(mapping?.scenario_ids) ? mapping.scenario_ids : []));
  for (const scenarioId of browserIds) {
    if (!mappingIds.has(scenarioId)) add("page_evidence_adoption_mapping_missing", `browser scenario ${scenarioId} requires an adoption mapping`);
  }
  return uniqueFindings(findings);
}

export function validateConsumerPageEvidenceSemantics(value, manifest, recordPath) {
  if (!isPlainObject(value) || !isPlainObject(manifest) || value.page_evidence?.status !== "applicable") return [];
  const findings = [];
  const add = (code, message) => findings.push(finding(code, message, recordPath));
  const scenarios = Array.isArray(value.scenarios) ? value.scenarios.filter(isPlainObject) : [];
  const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  const browserScenarios = scenarios.filter((scenario) => scenario.evidence_method === "browser");
  const browserIds = browserScenarios.map((scenario) => scenario.id);
  const intendedIds = manifest.session?.intended_scenario_ids;
  if (!sameStringSet(browserIds, intendedIds)) add("page_evidence_intent_scenario_mismatch", "page session intent must exactly match the conformance browser scenario catalog");

  const sourcePaths = manifest.session?.source?.files?.map((entry) => entry.path);
  if (!sameStringSet(value.consumer?.relevant_sources, sourcePaths)) add("page_evidence_source_set_mismatch", "conformance relevant sources must exactly match the page session source set");
  if (value.consumer?.repository !== manifest.repository || value.consumer?.repository !== manifest.session?.repository || value.consumer?.repository !== manifest.run?.repository) {
    add("page_evidence_repository_mismatch", "conformance, page session, manifest, and run repositories must agree");
  }
  if (value.consumer?.revision !== manifest.revision || value.consumer?.revision !== manifest.session?.revision || value.consumer?.revision !== manifest.run?.revision) {
    add("page_evidence_revision_mismatch", "conformance, page session, manifest, and run revisions must agree");
  }
  if (typeof manifest.review_by !== "string" || manifest.review_by.length === 0) add("page_evidence_review_by_required", "page evidence manifest requires review_by");

  const pageScenarioById = new Map((Array.isArray(manifest.scenarios) ? manifest.scenarios : []).map((scenario) => [scenario.id, scenario]));
  const manifestDirectory = value.page_evidence.manifest.split("/").slice(0, -1).join("/");
  for (const scenario of browserScenarios) {
    if (scenario.source_digest !== manifest.session?.source?.sha256) add("page_evidence_source_mismatch", `browser scenario ${scenario.id} source digest must equal the page session source digest`);
    if (scenario.session_id !== manifest.session?.session_id) add("page_evidence_session_mismatch", `browser scenario ${scenario.id} session identity must equal the page session`);
    if (scenario.run_id !== manifest.run?.id) add("page_evidence_run_mismatch", `browser scenario ${scenario.id} run identity must equal the page run`);
    const runnerPath = pageScenarioById.get(scenario.id)?.runner_result?.path;
    if (scenario.result_artifact !== (runnerPath ? `${manifestDirectory}/${runnerPath}` : undefined)) add("page_evidence_result_artifact_mismatch", `browser scenario ${scenario.id} result artifact must equal its page runner result`);
  }

  const dimensions = isPlainObject(value.migration_dimensions) ? Object.values(value.migration_dimensions) : [];
  for (const scenarioId of dimensions.flatMap((dimension) => dimension?.status === "applicable" && Array.isArray(dimension.scenario_ids) ? dimension.scenario_ids : [])) {
    if (scenarioById.get(scenarioId)?.evidence_method === "browser" && !intendedIds?.includes(scenarioId)) add("page_evidence_dimension_scenario_missing", `browser scenario ${scenarioId} used by an applicable dimension is absent from page intent`);
  }
  for (const scenarioId of (Array.isArray(value.adoption_mappings) ? value.adoption_mappings : []).flatMap((mapping) => Array.isArray(mapping?.scenario_ids) ? mapping.scenario_ids : [])) {
    if (scenarioById.get(scenarioId)?.evidence_method === "browser" && !intendedIds?.includes(scenarioId)) add("page_evidence_adoption_scenario_missing", `browser scenario ${scenarioId} used by an adoption mapping is absent from page intent`);
  }
  return uniqueFindings(findings);
}
