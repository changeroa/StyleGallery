export function workflowSafetyCases(workflow) {
  return [
    {
      name: "floating_action_ref",
      mutate: { ".github/workflows/validate.yml": workflow.replace("uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4", "uses: actions/checkout@v4") },
      expect: ".github/workflows/validate.yml: floating or unlabeled action ref uses: actions/checkout@v4",
    },
    {
      name: "checkout_credentials_persisted",
      mutate: { ".github/workflows/validate.yml": workflow.replace("          persist-credentials: false\n", "") },
      expect: ".github/workflows/validate.yml: every actions/checkout step must set persist-credentials: false",
    },
    {
      name: "third_party_floating_action_ref",
      mutate: { ".github/workflows/validate.yml": workflow.replace("uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4", "uses: attacker/action@main") },
      expect: ".github/workflows/validate.yml: floating or unlabeled action ref uses: attacker/action@main",
    },
    {
      name: "checkout_true_with_later_env_false",
      mutate: { ".github/workflows/validate.yml": workflow.replace("          persist-credentials: false\n", "          persist-credentials: true\n        env:\n          persist-credentials: false\n") },
      expect: ".github/workflows/validate.yml: every actions/checkout step must set persist-credentials: false",
    },
    {
      name: "checkout_true_with_block_scalar_false",
      mutate: { ".github/workflows/validate.yml": workflow.replace("          persist-credentials: false\n", "          sparse-checkout: |\n            persist-credentials: false\n          persist-credentials: true\n") },
      expect: ".github/workflows/validate.yml: every actions/checkout step must set persist-credentials: false",
    },
    {
      name: "checkout_duplicate_credentials",
      mutate: { ".github/workflows/validate.yml": workflow.replace("          persist-credentials: false\n", "          persist-credentials: false\n          persist-credentials: false\n") },
      expect: ".github/workflows/validate.yml: every actions/checkout step must set persist-credentials: false",
    },
    {
      name: "extra_top_level_permission",
      mutate: { ".github/workflows/validate.yml": workflow.replace("  contents: read\n", "  contents: read\n  issues: read\n") },
      expect: ".github/workflows/validate.yml: top-level permissions must be exactly contents: read",
    },
    {
      name: "write_top_level_permission",
      mutate: { ".github/workflows/validate.yml": workflow.replace("  contents: read\n", "  contents: write\n") },
      expect: ".github/workflows/validate.yml: top-level permissions must be exactly contents: read",
    },
    {
      name: "job_level_permission_override",
      mutate: { ".github/workflows/validate.yml": workflow.replace("  validate:\n", "  validate:\n    permissions:\n      contents: read\n") },
      expect: ".github/workflows/validate.yml: job-level permissions overrides are forbidden",
    },
    {
      name: "single_quoted_third_party_floating_action_ref",
      mutate: { ".github/workflows/validate.yml": workflow.replace("uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4", "'uses': attacker/action@main") },
      expect: ".github/workflows/validate.yml: floating or unlabeled action ref 'uses': attacker/action@main",
    },
    {
      name: "double_quoted_third_party_floating_action_ref",
      mutate: { ".github/workflows/validate.yml": workflow.replace("uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4", "\"uses\": attacker/action@main") },
      expect: ".github/workflows/validate.yml: floating or unlabeled action ref \"uses\": attacker/action@main",
    },
    {
      name: "single_quoted_checkout_floating_ref",
      mutate: { ".github/workflows/validate.yml": quotedCheckout(workflow, "'") },
      expect: ".github/workflows/validate.yml: floating or unlabeled action ref 'uses': actions/checkout@v4",
    },
    {
      name: "single_quoted_checkout_credentials_persisted",
      mutate: { ".github/workflows/validate.yml": quotedCheckout(workflow, "'") },
      expect: ".github/workflows/validate.yml: every actions/checkout step must set persist-credentials: false",
    },
    {
      name: "double_quoted_checkout_floating_ref",
      mutate: { ".github/workflows/validate.yml": quotedCheckout(workflow, "\"") },
      expect: ".github/workflows/validate.yml: floating or unlabeled action ref \"uses\": actions/checkout@v4",
    },
    {
      name: "double_quoted_checkout_credentials_persisted",
      mutate: { ".github/workflows/validate.yml": quotedCheckout(workflow, "\"") },
      expect: ".github/workflows/validate.yml: every actions/checkout step must set persist-credentials: false",
    },
    {
      name: "single_quoted_job_level_permission_override",
      mutate: { ".github/workflows/validate.yml": workflow.replace("  validate:\n", "  validate:\n    'permissions':\n      contents: read\n") },
      expect: ".github/workflows/validate.yml: job-level permissions overrides are forbidden",
    },
    {
      name: "double_quoted_job_level_permission_override",
      mutate: { ".github/workflows/validate.yml": workflow.replace("  validate:\n", "  validate:\n    \"permissions\":\n      contents: read\n") },
      expect: ".github/workflows/validate.yml: job-level permissions overrides are forbidden",
    },
    {
      name: "flow_sequence_action_mapping",
      mutate: { ".github/workflows/validate.yml": workflow.replace("- uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4", "- { uses: attacker/action@main }") },
      expect: ".github/workflows/validate.yml: flow-style sequence mappings are forbidden",
    },
    {
      name: "flow_sequence_checkout_with_inline_map",
      mutate: { ".github/workflows/validate.yml": flowCheckout(workflow) },
      expect: ".github/workflows/validate.yml: flow-style sequence mappings are forbidden",
    },
    {
      name: "double_quoted_escaped_action_key",
      mutate: { ".github/workflows/validate.yml": workflow.replace("uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4", "\"u\\u0073es\": attacker/action@main") },
      expect: ".github/workflows/validate.yml: escape sequences in double-quoted mapping keys are forbidden",
    },
    {
      name: "double_quoted_escaped_permission_key",
      mutate: { ".github/workflows/validate.yml": workflow.replace("  validate:\n", "  validate:\n    \"permi\\u0073sions\":\n      contents: write\n") },
      expect: ".github/workflows/validate.yml: escape sequences in double-quoted mapping keys are forbidden",
    },
  ];
}

function quotedCheckout(workflow, quote) {
  return workflow
    .replace("uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4", `${quote}uses${quote}: actions/checkout@v4`)
    .replace("        with:\n          persist-credentials: false", `        ${quote}with${quote}:\n          ${quote}persist-credentials${quote}: true`);
}

function flowCheckout(workflow) {
  return workflow.replace(
    "      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4\n        with:\n          persist-credentials: false",
    "      - { uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5, with: { persist-credentials: false } }",
  );
}
