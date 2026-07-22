const environmentFields = Object.freeze([
  "browser",
  "browser_revision",
  "container_image",
  "platform",
  "playwright",
  "viewport",
]);

function matchesEnvironment(approved, environment) {
  return environmentFields.every((field) => approved[field] === environment[field]);
}

export function visualExpectationFor(scenario, environment, approvedEnvironments) {
  const environments = approvedEnvironments.filter((approved) => matchesEnvironment(approved, environment));
  if (environments.length !== 1) throw new Error(`capture environment requires exactly one approved visual environment, found ${environments.length}`);
  const matches = scenario.expected.visual_image.filter((expectation) => expectation.environment_id === environments[0].id);
  if (matches.length !== 1) throw new Error(`scenario ${scenario.id} requires exactly one approved visual expectation for ${environments[0].id}, found ${matches.length}`);
  return matches[0];
}
