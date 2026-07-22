export function componentStateWorkflowCases(workflow) {
  return [
    {
      name: "browser_artifact_harness_in_static_job",
      mutate: { ".github/workflows/validate.yml": workflow.replace("  validate:\n", "  validate:\nnode scripts/test-validate-component-state-artifacts.mjs\n") },
      expect: ".github/workflows/validate.yml: browser-dependent artifact/session harness must not run in validate job",
    },
    {
      name: "browser_artifact_harness_missing_container_job",
      mutate: { ".github/workflows/validate.yml": workflow.replace("        run: node scripts/test-validate-component-state-artifacts.mjs\n", "") },
      expect: ".github/workflows/validate.yml: component-state artifact/session harness must run in Playwright container job",
    },
    {
      name: "duplicate_artifact_harness_in_chromium_sentinel",
      mutate: { ".github/workflows/validate.yml": workflow.replace("      - run: node scripts/test-consumer-reference-sentinel.mjs\n", "      - run: node scripts/test-consumer-reference-sentinel.mjs\n      - run: node scripts/test-validate-component-state-artifacts.mjs\n") },
      expect: ".github/workflows/validate.yml: artifact/session harness must run exactly once and only in component-state-evidence job",
    },
    {
      name: "unpinned_component_container_with_pinned_env",
      mutate: { ".github/workflows/validate.yml": workflow.replace("      image: mcr.microsoft.com/playwright:v1.61.0-noble@sha256:57b65fdc9ceabe0ef613124c7bbe2babcf9362c4d85e382fe3b03604e84b428a", "      image: mcr.microsoft.com/playwright:v1.61.0-noble") },
      expect: ".github/workflows/validate.yml: component-state container.image must equal pinned Playwright digest",
    },
    {
      name: "session_receipt_outside_shared_root",
      mutate: { ".github/workflows/validate.yml": workflow.replace("            STATE_SESSION_RECEIPT=\"$STATE_EVIDENCE_ROOT/capture-session.json\" \\\n", "            STATE_SESSION_RECEIPT=\"/tmp/capture-session.json\" \\\n") },
      expect: ".github/workflows/validate.yml: component-state runtime must bind receipt under shared root",
    },
    {
      name: "finalizer_output_outside_shared_root",
      mutate: { ".github/workflows/validate.yml": workflow.replace("            --output \"$STATE_EVIDENCE_ROOT/runtime-manifest.json\" \\\n", "            --output \"/tmp/runtime-manifest.json\" \\\n") },
      expect: ".github/workflows/validate.yml: component-state finalizer must write manifest under shared root",
    },
    {
      name: "validator_manifest_outside_shared_root",
      mutate: { ".github/workflows/validate.yml": workflow.replace("            --runtime-manifest \"$STATE_EVIDENCE_ROOT/runtime-manifest.json\" \\\n", "            --runtime-manifest \"/tmp/runtime-manifest.json\" \\\n") },
      expect: ".github/workflows/validate.yml: component-state validator must read manifest under shared root",
    },
    {
      name: "finalizer_artifact_root_outside_shared_root",
      mutate: { ".github/workflows/validate.yml": workflow.replace("          node scripts/finalize-component-state-evidence.mjs \\\n            --artifact-root \"$STATE_EVIDENCE_ROOT\" \\\n", "          node scripts/finalize-component-state-evidence.mjs \\\n            --artifact-root \"/tmp/consumer-reference-state\" \\\n") },
      expect: ".github/workflows/validate.yml: component-state finalizer must use shared artifact root",
    },
    {
      name: "validator_artifact_root_outside_shared_root",
      mutate: { ".github/workflows/validate.yml": workflow.replace("          node scripts/validate-component-state.mjs \\\n            --artifact-root \"$STATE_EVIDENCE_ROOT\" \\\n", "          node scripts/validate-component-state.mjs \\\n            --artifact-root \"/tmp/consumer-reference-state\" \\\n") },
      expect: ".github/workflows/validate.yml: component-state validator must use shared artifact root",
    },
    {
      name: "runner_temp_in_component_job",
      mutate: { ".github/workflows/validate.yml": workflow.replace("STATE_EVIDENCE_ROOT: .tmp/consumer-reference-state", "STATE_EVIDENCE_ROOT: ${{ runner.temp }}/consumer-reference-state") },
      expect: ".github/workflows/validate.yml: component-state Playwright container job must not use runner temp paths",
    },
    {
      name: "component_state_workspace_root_drift",
      mutate: { ".github/workflows/validate.yml": workflow.replaceAll(".tmp/consumer-reference-state", "state-output") },
      expect: ".github/workflows/validate.yml: missing shared component-state workspace path STATE_EVIDENCE_ROOT: .tmp/consumer-reference-state",
    },
    {
      name: "missing_component_state_image_identity",
      mutate: { ".github/workflows/validate.yml": workflow.replace("      SENTINEL_CONTAINER_IMAGE: mcr.microsoft.com/playwright:v1.61.0-noble@sha256:57b65fdc9ceabe0ef613124c7bbe2babcf9362c4d85e382fe3b03604e84b428a\n", "") },
      expect: ".github/workflows/validate.yml: component-state job must export the pinned Playwright image identity",
    },
  ];
}
