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
      name: "mixed_case_checkout_credentials_missing",
      mutate: { ".github/workflows/validate.yml": workflow.replace("      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4", "      - uses: Actions/Checkout@34e114876b0b11c390a56381ad16ebd13914f8d5\n      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4") },
      expect: ".github/workflows/validate.yml: every actions/checkout step must set persist-credentials: false",
    },
    {
      name: "mixed_case_checkout_credentials_true",
      mutate: { ".github/workflows/validate.yml": workflow.replace("      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4", "      - uses: Actions/Checkout@34e114876b0b11c390a56381ad16ebd13914f8d5\n        with:\n          persist-credentials: true\n      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4") },
      expect: ".github/workflows/validate.yml: every actions/checkout step must set persist-credentials: false",
    },
    {
      name: "mixed_case_checkout_credentials_false",
      mutate: { ".github/workflows/validate.yml": workflow.replace("      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4", "      - uses: Actions/Checkout@34e114876b0b11c390a56381ad16ebd13914f8d5\n        with:\n          persist-credentials: false\n      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4") },
    },
    {
      name: "third_party_floating_action_ref",
      mutate: { ".github/workflows/validate.yml": workflow.replace("uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4", "uses: attacker/action@main") },
      expect: ".github/workflows/validate.yml: floating or unlabeled action ref uses: attacker/action@main",
    },
    {
      name: "docker_action_ref",
      mutate: { ".github/workflows/validate.yml": workflow.replace("      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4", "      - uses: docker://alpine:latest\n      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4") },
      expect: ".github/workflows/validate.yml: docker action refs are forbidden uses: docker://alpine:latest",
    },
    {
      name: "repository_local_action_ref",
      mutate: { ".github/workflows/validate.yml": workflow.replace("      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4", "      - uses: ./.github/actions/local\n      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4") },
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
      name: "flow_collection_mapping_value",
      mutate: { ".github/workflows/validate.yml": workflow.replace("    steps:\n", "    steps: [{ uses: attacker/action@main }]\n") },
      expect: ".github/workflows/validate.yml: flow-style collection values are forbidden",
    },
    {
      name: "flow_collection_continuation_value",
      mutate: { ".github/workflows/validate.yml": workflow.replace("    steps:\n", "    steps:\n      [{ uses: attacker/action@main }]\n") },
      expect: ".github/workflows/validate.yml: flow-style collection values are forbidden",
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
    {
      name: "explicit_action_mapping_key",
      mutate: { ".github/workflows/validate.yml": replaceSetupNode(workflow, "        ? uses\n        : attacker/action@main") },
      expect: ".github/workflows/validate.yml: explicit mapping keys are forbidden",
    },
    {
      name: "explicit_checkout_mapping_key",
      mutate: { ".github/workflows/validate.yml": replaceCheckout(workflow, "      - ? uses\n        : actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5\n        with:\n          persist-credentials: true") },
      expect: ".github/workflows/validate.yml: explicit mapping keys are forbidden",
    },
    {
      name: "explicit_permissions_mapping_key",
      mutate: { ".github/workflows/validate.yml": workflow.replace("permissions:\n  contents: read", "? permissions\n:\n  contents: write") },
      expect: ".github/workflows/validate.yml: explicit mapping keys are forbidden",
    },
    {
      name: "explicit_duplicate_checkout_credentials_key",
      mutate: { ".github/workflows/validate.yml": workflow.replace("          persist-credentials: false\n", "          ? persist-credentials\n          : false\n          persist-credentials: true\n") },
      expect: ".github/workflows/validate.yml: explicit mapping keys are forbidden",
    },
    {
      name: "tagged_action_key",
      mutate: { ".github/workflows/validate.yml": replaceCheckout(workflow, "      - name: Checkout\n        !!str uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5") },
      expect: ".github/workflows/validate.yml: YAML tags are forbidden",
    },
    {
      name: "anchored_action_key",
      mutate: { ".github/workflows/validate.yml": workflow.replace("uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4", "&name uses: attacker/action@main") },
      expect: ".github/workflows/validate.yml: YAML anchors and aliases are forbidden",
    },
    {
      name: "aliased_action_value",
      mutate: { ".github/workflows/validate.yml": workflow.replace("name: Validate StyleGallery", "x-action: &action attacker/action@main\nname: Validate StyleGallery").replace("uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4", "uses: *action") },
      expect: ".github/workflows/validate.yml: YAML anchors and aliases are forbidden",
    },
    {
      name: "merged_checkout_step",
      mutate: { ".github/workflows/validate.yml": workflow.replace("name: Validate StyleGallery", "x-checkout: &checkout\n  uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5\n  with:\n    persist-credentials: false\nname: Validate StyleGallery").replace("        with:\n          persist-credentials: false", "        <<: *checkout\n        with:\n          persist-credentials: true") },
      expect: ".github/workflows/validate.yml: YAML merge keys are forbidden",
    },
    {
      name: "literal_block_scalar_action_ref",
      mutate: { ".github/workflows/validate.yml": workflow.replace("uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4", "uses: |-\n          attacker/action@main") },
      expect: ".github/workflows/validate.yml: block scalar action refs are forbidden",
    },
    {
      name: "folded_block_scalar_checkout_ref",
      mutate: { ".github/workflows/validate.yml": replaceCheckout(workflow, "      - name: Checkout\n        uses: >-\n          actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5\n        with:\n          persist-credentials: true") },
      expect: ".github/workflows/validate.yml: block scalar action refs are forbidden",
    },
    {
      name: "yaml_directive",
      mutate: { ".github/workflows/validate.yml": `%YAML 1.2\n---\n${workflow}` },
      expect: ".github/workflows/validate.yml: YAML directives are forbidden",
    },
    {
      name: "yaml_tag_directive",
      mutate: { ".github/workflows/validate.yml": `%TAG !e! tag:example.com,2026:\n---\n${workflow}` },
      expect: ".github/workflows/validate.yml: YAML directives are forbidden",
    },
    {
      name: "yaml_document_start_marker",
      mutate: { ".github/workflows/validate.yml": `---\n${workflow}` },
      expect: ".github/workflows/validate.yml: YAML document markers are forbidden",
    },
    {
      name: "yaml_document_end_marker",
      mutate: { ".github/workflows/validate.yml": `${workflow}\n...\n` },
      expect: ".github/workflows/validate.yml: YAML document markers are forbidden",
    },
    {
      name: "block_scalar_body_structural_notation_ignored",
      mutate: { ".github/workflows/validate.yml": workflow.replace("        run: |\n          node scripts/create-component-state-session.mjs", "        run: |\n          ? uses\n          : attacker/action@main\n          !!str uses: attacker/action@main\n          &action uses: attacker/action@main\n          <<: *action\n          uses: |\n            attacker/action@main\n          steps: [{ uses: attacker/action@main }]\n          ---\n          node scripts/create-component-state-session.mjs") },
    },
  ];
}

function quotedCheckout(workflow, quote) {
  return workflow
    .replace("uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4", `${quote}uses${quote}: actions/checkout@v4`)
    .replace("        with:\n          persist-credentials: false", `        ${quote}with${quote}:\n          ${quote}persist-credentials${quote}: true`);
}

function flowCheckout(workflow) {
  return replaceCheckout(
    workflow,
    "      - { uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5, with: { persist-credentials: false } }",
  );
}

function replaceCheckout(workflow, replacement) {
  const named = "      - name: Checkout\n        uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4\n        with:\n          persist-credentials: false";
  const unnamed = "      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4\n        with:\n          persist-credentials: false";
  return workflow.includes(named) ? workflow.replace(named, replacement) : workflow.replace(unnamed, replacement);
}

function replaceSetupNode(workflow, replacement) {
  const named = "      - name: Setup Node\n        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4";
  const unnamed = "      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4";
  return workflow.includes(named) ? workflow.replace(named, `      - name: Setup Node\n${replacement}`) : workflow.replace(unnamed, `      - ${replacement.trimStart()}`);
}
