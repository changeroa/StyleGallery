function finding(code, file, message) {
  return { code, message, path: file };
}

function duplicateValues(values, normalize = (value) => value) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    const key = normalize(value);
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  return [...duplicates];
}

function sameSet(left, right) {
  return JSON.stringify([...(left ?? [])].sort()) === JSON.stringify([...(right ?? [])].sort());
}

function validateApplicability(component, file, failures) {
  for (const id of duplicateValues((component.semantic_modes ?? []).map((mode) => mode.id))) failures.push(finding("semantic_mode_duplicate", file, `semantic mode ${id} is duplicated`));
  for (const mode of component.semantic_modes ?? []) {
    for (const name of duplicateValues((mode.aria_states ?? []).map((state) => state.name))) failures.push(finding("aria_state_duplicate", file, `${mode.id} repeats ${name}`));
    for (const state of mode.aria_states ?? []) {
      if (["not_applicable", "prohibited"].includes(state.status) && !state.reason) failures.push(finding("applicability_reason_required", file, `${mode.id}.${state.name} requires a reason`));
      if (state.status === "conditional" && (!state.condition || !state.resolution)) failures.push(finding("conditional_unresolved", file, `${mode.id}.${state.name} requires condition and resolution`));
      if (state.status === "conditional" && ["not_applicable", "prohibited"].includes(state.resolution) && !state.reason) failures.push(finding("applicability_reason_required", file, `${mode.id}.${state.name} requires a resolution reason`));
    }
    const required = mode.id === "toggle" ? "pressed" : mode.id === "disclosure" ? "expanded" : mode.id === "switch" ? "checked" : undefined;
    const state = (mode.aria_states ?? []).find((candidate) => candidate.name === required);
    if (required && (!state || !["required", "conditional"].includes(state.status) || (state.status === "conditional" && state.resolution !== "required"))) {
      failures.push(finding("role_required_aria_state", file, `${mode.id} requires applicable aria-${required}`));
    }
    if (mode.id === "switch" && (mode.aria_states ?? []).find((state) => state.name === "checked")?.values?.includes("mixed")) {
      failures.push(finding("switch_mixed_prohibited", file, "switch aria-checked must not include mixed"));
    }
  }
}

function validateSurface(scenario, state, visual, aria, dom, ax, code, failures, file) {
  const present = new Set(scenario.states ?? []).has(state);
  const surfaces = [
    (scenario.expected?.visual ?? []).includes(visual),
    aria ? scenario.aria?.[aria] === "true" : present,
    dom ? scenario.expected?.dom?.[dom] === "true" : present,
    ax ? scenario.expected?.ax?.[ax] === true : present,
  ];
  if (surfaces.some((value) => value !== present)) failures.push(finding(code, file, `${scenario.id} ${state} surfaces disagree`));
}

export function validateComponentSemantics(component, file, failures) {
  validateApplicability(component, file, failures);
  if (component.versions?.delivery_channel === "stable" && component.versions.lifecycle !== "stable") failures.push(finding("preview_rolled_stable", file, "preview components cannot be relabeled stable"));
}

export function validateStateSemantics(states, component, file, failures) {
  const scenarios = states.scenarios ?? [];
  const visualEnvironments = states.visual_environments ?? [];
  const visualEnvironmentIds = new Set(visualEnvironments.map((environment) => environment.id));
  for (const id of duplicateValues(visualEnvironments.map((environment) => environment.id))) failures.push(finding("visual_environment_duplicate", file, `visual environment ${id} is duplicated`));
  for (const selector of duplicateValues(visualEnvironments, (environment) => JSON.stringify(Object.entries(environment).filter(([key]) => key !== "id").sort()))) failures.push(finding("visual_environment_selector_duplicate", file, `visual environment selector ${selector} is duplicated`));
  for (const id of duplicateValues(scenarios.map((scenario) => scenario.id))) failures.push(finding("scenario_duplicate", file, `scenario ${id} is duplicated`));
  for (const key of duplicateValues(scenarios, (scenario) => [...(scenario.states ?? [])].sort().join("\u0000"))) failures.push(finding("state_set_duplicate", file, `state set ${key} is duplicated`));
  const modes = new Map((component.semantic_modes ?? []).map((mode) => [mode.id, mode]));
  for (const scenario of scenarios) {
    const visualImages = scenario.expected?.visual_image ?? [];
    for (const id of duplicateValues(visualImages.map((image) => image.environment_id))) failures.push(finding("visual_expectation_duplicate", file, `${scenario.id} repeats visual expectation ${id}`));
    for (const image of visualImages) if (!visualEnvironmentIds.has(image.environment_id)) failures.push(finding("visual_environment_unknown", file, `${scenario.id} references unknown visual environment ${image.environment_id}`));
    for (const id of visualEnvironmentIds) if (!visualImages.some((image) => image.environment_id === id)) failures.push(finding("visual_expectation_missing", file, `${scenario.id} lacks visual expectation ${id}`));
    const stateSet = new Set(scenario.states ?? []);
    const mode = modes.get(scenario.semantic_mode);
    if (!mode) failures.push(finding("scenario_mode_unknown", file, `${scenario.id} references an unknown semantic mode`));
    if (scenario.expected?.dom?.role !== mode?.role || scenario.expected?.ax?.role !== mode?.role) failures.push(finding("role_surface_mismatch", file, `${scenario.id} role surfaces disagree with its semantic mode`));
    validateSurface(scenario, "focus", "focus", undefined, "active", "focused", "focus_surface_mismatch", failures, file);
    validateSurface(scenario, "pressed", "pressed", "pressed", "aria-pressed", "pressed", "pressed_surface_mismatch", failures, file);
    validateSurface(scenario, "expanded", "expanded", "expanded", "aria-expanded", "expanded", "expanded_surface_mismatch", failures, file);
    validateSurface(scenario, "busy", "busy", "busy", "aria-busy", "busy", "busy_surface_mismatch", failures, file);
    validateSurface(scenario, "disabled", "disabled", "disabled", "disabled", "disabled", "disabled_surface_mismatch", failures, file);
    if (stateSet.has("loading") && (!stateSet.has("busy") || !(scenario.expected?.visual ?? []).includes("loading"))) failures.push(finding("loading_busy_state_required", file, `${scenario.id} loading requires distinct visible busy state`));
    if (stateSet.has("loading") && (scenario.expected?.visual ?? []).includes("disabled") && !stateSet.has("disabled")) failures.push(finding("loading_disabled_conflated", file, `${scenario.id} renders loading as disabled`));
    if (stateSet.has("disabled") && scenario.expected?.activation !== "suppressed") failures.push(finding("disabled_activation", file, `${scenario.id} disabled activation must be suppressed`));
    if (!stateSet.has("disabled") && !stateSet.has("loading") && scenario.expected?.activation === "suppressed") failures.push(finding("normative_activation_conflict", file, `${scenario.id} suppresses activation without a suppressing state`));
  }
}

export function validateFixtureSemantics(fixture, states, component, file, failures) {
  const canonical = new Map((states.scenarios ?? []).map((scenario) => [scenario.id, scenario]));
  const modes = new Map((component.semantic_modes ?? []).map((mode) => [mode.id, mode]));
  for (const id of duplicateValues((fixture.scenarios ?? []).map((scenario) => scenario.id))) failures.push(finding("fixture_scenario_duplicate", file, `fixture scenario ${id} is duplicated`));
  for (const scenario of fixture.scenarios ?? []) {
    const source = canonical.get(scenario.id);
    if (!source) failures.push(finding("fixture_scenario_missing", file, `${scenario.id} has no canonical state scenario`));
    else if (source.semantic_mode !== scenario.semantic_mode) failures.push(finding("normative_mode_conflict", file, `${scenario.id} semantic modes disagree`));
    if (!modes.get(scenario.semantic_mode)?.keys?.includes(scenario.activation_key)) failures.push(finding("fixture_activation_key_invalid", file, `${scenario.id} activation key is not declared by its mode`));
  }
  for (const id of canonical.keys()) if (!(fixture.scenarios ?? []).some((scenario) => scenario.id === id)) failures.push(finding("fixture_scenario_unexercised", file, `${id} lacks a runtime fixture`));
}

export function validateEvidenceSemantics(evidence, fixture, states, file, failures) {
  if (Object.hasOwn(evidence, "aggregate_pass") || Object.hasOwn(evidence, "certification")) failures.push(finding("aggregate_pass_forbidden", file, "aggregate pass and certification claims are forbidden"));
  const canonical = new Map((states.scenarios ?? []).map((scenario) => [scenario.id, scenario]));
  const fixtures = new Map((fixture.scenarios ?? []).map((scenario) => [scenario.id, scenario]));
  const passes = evidence.passes ?? [];
  for (const id of duplicateValues(passes.map((pass) => pass.id))) failures.push(finding("evidence_pass_duplicate", file, `evidence pass ${id} is duplicated`));
  for (const key of duplicateValues(passes, (pass) => `${pass.scenario_id}\u0000${pass.channel}`)) failures.push(finding("evidence_channel_duplicate", file, `scenario channel ${key} is duplicated`));
  for (const artifact of duplicateValues(passes.map((pass) => pass.artifact?.path).filter(Boolean))) failures.push(finding("evidence_artifact_reused", file, `artifact ${artifact} is reused`));
  for (const digest of duplicateValues(passes.map((pass) => pass.artifact?.sha256).filter(Boolean))) failures.push(finding("evidence_artifact_content_reused", file, `artifact content ${digest} is reused`));
  const runIdentities = new Set(passes.map((pass) => JSON.stringify(pass.run)));
  const environments = new Set(passes.map((pass) => JSON.stringify(pass.environment)));
  if (runIdentities.size > 1 || environments.size > 1) failures.push(finding("evidence_runtime_identity_mismatch", file, "passes must share one actual run and environment"));
  const sessions = new Set(passes.map((pass) => JSON.stringify(pass.session)));
  if (sessions.size > 1) failures.push(finding("capture_session_mismatch", file, "passes must share one capture session"));
  for (const pass of passes) {
    const source = canonical.get(pass.scenario_id);
    const scenario = fixtures.get(pass.scenario_id);
    if (!source || !scenario) failures.push(finding("evidence_scenario_unknown", file, `${pass.id} references unknown scenario ${pass.scenario_id}`));
    if (pass.channel === "at" || pass.environment?.kind === "assistive_technology") failures.push(finding("at_evidence_unverified", file, `${pass.id} self-asserts an AT run without external attestation`));
    if (pass.session && (pass.run?.id !== pass.session.session_id || pass.run?.revision !== pass.session.revision || pass.run?.attempt !== pass.session.attempt || !sameSet([JSON.stringify(pass.environment)], [JSON.stringify(pass.session.environment)]))) failures.push(finding("capture_session_mismatch", file, `${pass.id} run or environment differs from its capture session`));
    if (scenario && !(scenario.required_channels ?? []).includes(pass.channel)) failures.push(finding("evidence_channel_mismatch", file, `${pass.id} channel is not required for its scenario`));
    if (source && (!sameSet(pass.scope?.state_set, source.states) || pass.scope?.semantic_mode !== source.semantic_mode)) failures.push(finding("evidence_scope_mismatch", file, `${pass.id} scope differs from canonical state JSON`));
    const expectedMedia = pass.channel === "visual" ? "image/png" : ["dom", "ax"].includes(pass.channel) ? "application/json" : undefined;
    if (expectedMedia && pass.artifact?.media_type !== expectedMedia) failures.push(finding("evidence_media_type_mismatch", file, `${pass.id} media type does not match its channel`));
  }
  for (const scenario of fixture.scenarios ?? []) {
    const channels = new Set(passes.filter((pass) => pass.scenario_id === scenario.id).map((pass) => pass.channel));
    for (const channel of scenario.required_channels ?? []) if (!channels.has(channel)) failures.push(finding("required_channel_missing", file, `${scenario.id} lacks ${channel} evidence`));
  }
}
