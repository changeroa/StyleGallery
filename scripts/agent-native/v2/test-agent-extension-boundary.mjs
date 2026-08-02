#!/usr/bin/env node

import assert from "node:assert/strict";
import { types as utilTypes } from "node:util";

import { createExperimentalExtensionRegistry, ExperimentalExtensionError } from "./experimental-extension-registry.mjs";
import { registerA2AExtension } from "./extensions/a2a-projection.mjs";
import { registerAgUiExtension } from "./extensions/agui-projection.mjs";
import * as legacyA2A from "../a2a-projection.mjs";
import * as legacyAgUi from "../agui-projection.mjs";
import * as canonicalA2A from "./extensions/a2a-projection.mjs";
import * as canonicalAgUi from "./extensions/agui-projection.mjs";

const rows = [];
function check(name, fn) {
  fn();
  rows.push({ name, ok: true });
}
function rejectsCode(name, fn, code) {
  check(name, () => assert.throws(fn, (error) => error instanceof ExperimentalExtensionError && error.code === code));
}

const task = Object.freeze({ stableRef: "sg:task/extension-fixture", state: "RUNNING", intent: { operation: "resolve" } });
const run = Object.freeze({ runId: "sg:run/extension-fixture", taskId: task.stableRef, state: "RUNNING" });

check("empty_registry_is_opt_in", () => {
  const registry = createExperimentalExtensionRegistry();
  assert.deepEqual(registry.list(), []);
  assert.equal(Object.isFrozen(registry.list()), true);
});

check("registration_order_is_canonical", () => {
  const first = createExperimentalExtensionRegistry();
  registerAgUiExtension(first);
  registerA2AExtension(first);
  const second = createExperimentalExtensionRegistry();
  registerA2AExtension(second);
  registerAgUiExtension(second);
  assert.deepEqual(first.list(), second.list());
  assert.deepEqual(first.list().map(({ protocol, version }) => `${protocol}@${version}`), ["a2a@1.0", "ag-ui@0.0.57"]);
});

check("projection_requires_explicit_registration", () => {
  const registry = createExperimentalExtensionRegistry();
  rejectsCode("unknown_protocol_is_stable", () => registry.project({ protocol: "a2a", version: "1.0", operation: "task.state", input: "RUNNING" }), "experimental_extension_protocol_unknown");
});

check("a2a_and_agui_project_only_through_registry", () => {
  const registry = createExperimentalExtensionRegistry();
  registerA2AExtension(registry);
  registerAgUiExtension(registry);
  assert.equal(registry.project({ protocol: "a2a", version: "1.0", operation: "task.state", input: "RUNNING" }), "working");
  const card = registry.project({ protocol: "a2a", version: "1.0", operation: "agent-card.create", input: {} });
  assert.equal(card.protocolVersion, "1.0");
  const projection = registry.project({
    protocol: "ag-ui", version: "0.0.57", operation: "events.project",
    input: { task, run, text: "resolved", toolCall: { id: "call-1", name: "resolve", args: {} }, state: {}, outcome: "COMPLETED" },
  });
  assert.equal(projection.events.at(0).type, "RUN_STARTED");
  assert.equal(projection.events.at(-1).type, "RUN_FINISHED");
});

const expectedA2AExports = ["A2AProjectionError", "A2A_EXPERIMENTAL_EXTENSION", "agentCard", "buildAgentCard", "cancelTask", "createAgentCard", "getTask", "handleCancelTask", "handleGetTask", "handleSendMessage", "mapTaskState", "projectAgentCard", "projectCancelTask", "projectGetTask", "projectSendMessage", "projectTaskState", "registerA2AExtension", "sendMessage", "toA2ATaskState"];
const expectedAgUiExports = ["AG_UI_EXPERIMENTAL_EXTENSION", "AgUiProjectionError", "assertAgUiTransitions", "createAgUiEvents", "projectAGUIEvents", "projectAgUiEvents", "projectAguiEvents", "registerAgUiExtension", "validateAGUITransitions", "validateAgUiTransitions", "validateEventSequence"];
function legacyPathFailures(legacy, canonical, expected) {
  const legacyExpected = expected.filter((name) => !name.endsWith("_EXPERIMENTAL_EXTENSION") && !name.startsWith("register"));
  const failures = [];
  if (JSON.stringify(Object.keys(legacy).sort()) !== JSON.stringify(legacyExpected)) failures.push("experimental_extension_legacy_exports_changed");
  for (const name of legacyExpected) {
    if (typeof canonical[name] === "function" && legacy[name]?.length !== canonical[name].length) failures.push("experimental_extension_legacy_signature_changed");
  }
  return [...new Set(failures)].sort();
}
check("legacy_paths_preserve_exports_signatures_and_behavior", () => {
  assert.deepEqual(legacyPathFailures(legacyA2A, canonicalA2A, expectedA2AExports), []);
  assert.deepEqual(legacyPathFailures(legacyAgUi, canonicalAgUi, expectedAgUiExports), []);
  assert.deepEqual(legacyA2A.createAgentCard({}), canonicalA2A.createAgentCard({}));
  const eventInput = { task, run, text: "resolved", toolCall: { id: "call-1", name: "resolve", args: {} }, state: {}, outcome: "COMPLETED" };
  assert.deepEqual(legacyAgUi.projectAgUiEvents(eventInput), canonicalAgUi.projectAgUiEvents(eventInput));
  for (const [legacy, canonical, expected] of [[legacyA2A, canonicalA2A, expectedA2AExports], [legacyAgUi, canonicalAgUi, expectedAgUiExports]]) {
    for (const removed of expected.filter((name) => Object.hasOwn(legacy, name))) {
      const mutated = { ...legacy };
      delete mutated[removed];
      assert.ok(legacyPathFailures(mutated, canonical, expected).includes("experimental_extension_legacy_exports_changed"), `missing ${removed} was not detected`);
    }
  }
});

rejectsCode("duplicate_registration_is_denied", () => {
  const registry = createExperimentalExtensionRegistry();
  registerA2AExtension(registry);
  registerA2AExtension(registry);
}, "experimental_extension_duplicate");
rejectsCode("unknown_version_is_stable", () => {
  const registry = createExperimentalExtensionRegistry();
  registerA2AExtension(registry);
  registry.project({ protocol: "a2a", version: "2.0", operation: "task.state", input: "RUNNING" });
}, "experimental_extension_version_unknown");
rejectsCode("unknown_operation_is_stable", () => {
  const registry = createExperimentalExtensionRegistry();
  registerA2AExtension(registry);
  registry.project({ protocol: "a2a", version: "1.0", operation: "material-search", input: {} });
}, "experimental_extension_operation_unknown");

check("registration_snapshot_resists_mutation", () => {
  const registry = createExperimentalExtensionRegistry();
  const descriptor = { protocol: "a2a", version: "1.0", operations: { ...canonicalA2A.A2A_EXPERIMENTAL_EXTENSION.operations } };
  registry.register(descriptor);
  descriptor.protocol = "ag-ui";
  descriptor.operations["task.state"] = () => "mutated";
  assert.equal(registry.project({ protocol: "a2a", version: "1.0", operation: "task.state", input: "RUNNING" }), "working");
});

rejectsCode("arbitrary_operation_catalog_is_denied", () => createExperimentalExtensionRegistry().register({
  protocol: "a2a", version: "1.0", operations: { "material-search": (input) => input },
}), "experimental_extension_catalog_invalid");
rejectsCode("implementation_substitution_is_denied", () => createExperimentalExtensionRegistry().register({
  protocol: "a2a", version: "1.0", operations: { ...canonicalA2A.A2A_EXPERIMENTAL_EXTENSION.operations, "task.state": () => "working" },
}), "experimental_extension_implementation_invalid");

check("canonical_projection_results_are_deep_frozen", () => {
  const registry = createExperimentalExtensionRegistry();
  registerAgUiExtension(registry);
  const result = registry.project({ protocol: "ag-ui", version: "0.0.57", operation: "events.validate", input: { events: [] } });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.failures), true);
  assert.equal(Object.isFrozen(result.failures[0]), true);
});

for (const field of ["repository_path", "path", "source", "source_body", "body", "prose"]) {
  rejectsCode(`${field}_projection_input_is_denied_without_leak`, () => {
    const registry = createExperimentalExtensionRegistry();
    registerAgUiExtension(registry);
    registry.project({ protocol: "ag-ui", version: "0.0.57", operation: "events.project", input: {
      task: { ...task, intent: { operation: "resolve", nested: { [field]: "/private/body" } } }, run,
      text: "resolved", toolCall: { id: "call-1", name: "resolve", args: {} }, state: {}, outcome: "COMPLETED",
    } });
  }, "experimental_extension_sensitive_field_forbidden");
}

for (const [name, make] of [
  ["inherited", () => Object.create({ protocol: "a2a" })],
  ["accessor", () => Object.defineProperty({}, "protocol", { enumerable: true, get() { throw new Error("getter executed"); } })],
  ["symbol", () => ({ protocol: "a2a", version: "1.0", operations: {}, [Symbol("hidden")]: true })],
  ["proxy", () => new Proxy({}, { ownKeys() { throw new Error("trap executed"); } })],
]) {
  rejectsCode(`${name}_registration_is_denied`, () => createExperimentalExtensionRegistry().register(make()), "experimental_extension_input_unsafe");
}

check("proxy_and_accessor_projection_inputs_are_denied_without_execution", () => {
  const registry = createExperimentalExtensionRegistry();
  registerA2AExtension(registry);
  let invoked = 0;
  const accessor = Object.defineProperty({}, "state", { enumerable: true, get() { invoked += 1; return "RUNNING"; } });
  assert.throws(() => registry.project({ protocol: "a2a", version: "1.0", operation: "task.state", input: accessor }), (error) => error.code === "experimental_extension_input_unsafe");
  const proxy = new Proxy({}, { ownKeys() { invoked += 1; return []; } });
  assert.equal(utilTypes.isProxy(proxy), true);
  assert.throws(() => registry.project({ protocol: "a2a", version: "1.0", operation: "task.state", input: proxy }), (error) => error.code === "experimental_extension_input_unsafe");
  assert.throws(() => registry.project({ protocol: "a2a", version: "1.0", operation: "task.state", input: { nested: accessor } }), (error) => error.code === "experimental_extension_input_unsafe");
  assert.throws(() => registry.project({ protocol: "a2a", version: "1.0", operation: "task.state", input: { nested: proxy } }), (error) => error.code === "experimental_extension_input_unsafe");
  assert.equal(invoked, 0);
});

process.stdout.write(`${JSON.stringify({ ok: true, tests: rows.length, rows }, null, 2)}\n`);
