import {
  bytes,
  callExport,
  failFromCall,
  fixedNow,
  idOf,
  isObject,
  payload,
  pick,
  result,
} from "./test-agent-execution-fixtures.mjs";

export async function exerciseEvents(modules, state) {
  const rows = [];
  let events = [];
  const entries = [
    { eventId: "sg:event/task-created", parents: [], payload: { taskId: idOf(state.task, "sg:task/execution-fixture") }, type: "task.created" },
    { eventId: "sg:event/run-started", parents: ["sg:event/task-created"], payload: { runId: idOf(state.run, "sg:run/execution-fixture-1") }, type: "run.started" },
    { eventId: "sg:event/effect-reconciled", parents: ["sg:event/task-created"], payload: { effectState: "COMMITTED" }, type: "effect.reconciled" },
  ];
  for (const event of entries) {
    const call = await callExport(modules.events, "events", "appendEvent", { event, events });
    if (!call.ok) {
      rows.push(failFromCall("event_dag_append_is_immutable", "appendEvent returns an append-only event collection", call));
      return rows;
    }
    const value = payload(call.value);
    if (Array.isArray(value)) events = value;
    else if (Array.isArray(value?.events)) events = value.events;
    else if (isObject(value?.event)) events = [...events, value.event];
    else if (isObject(value)) events = [...events, value];
    else events = [...events, event];
  }
  const appendResult = events.map((event) => ({ id: pick(event, ["eventId", "event_id", "id", "stableRef", "stable_ref"]), parents: pick(event, ["parents", "parentIds", "parent_ids"]) }));
  rows.push(result(
    "event_dag_append_is_immutable",
    "three immutable events preserve explicit parent links and event IDs",
    appendResult,
    events.length === 3
      && appendResult.every((event) => typeof event.id === "string" && Array.isArray(event.parents))
      && appendResult[1].parents.includes("sg:event/task-created")
      && appendResult[2].parents.includes("sg:event/task-created"),
  ));

  const headsCall = await callExport(modules.events, "events", "eventHeads", { events });
  if (!headsCall.ok) {
    rows.push(failFromCall("event_dag_heads_are_deterministic", "eventHeads returns the two concurrent heads in stable order", headsCall));
    return rows;
  }
  const heads = payload(headsCall.value);
  const headValues = Array.isArray(heads) ? heads : pick(heads, ["heads", "eventHeads", "event_heads"]);
  rows.push(result(
    "event_dag_heads_are_deterministic",
    "eventHeads returns the two concurrent heads in stable order",
    headValues,
    Array.isArray(headValues)
      && headValues.length === 2
      && headValues.map(String).sort().join(",") === "sg:event/effect-reconciled,sg:event/run-started",
  ));
  return rows;
}

export async function exerciseRetrieval(modules) {
  const rows = [];
  const members = [
    { content: "Editorial profile uses constrained columns.", stableRef: "sg:profile/editorial-reference-profile", versionId: "sg:profile/editorial-reference-profile@sha256:1111111111111111111111111111111111111111111111111111111111111111" },
    { content: "Resolve returns governed profile metadata.", stableRef: "sg:claim/resolve-profile", versionId: "sg:claim/resolve-profile@sha256:2222222222222222222222222222222222222222222222222222222222222222" },
  ];
  const snapshotInput = {
    asOf: fixedNow,
    builderVersion: "retriever-fixture@1",
    heads: ["sg:event/effect-reconciled", "sg:event/run-started"],
    members,
    policy: "sg:governance/read-policy@sha256:3333333333333333333333333333333333333333333333333333333333333333",
    viewSpec: { queryClass: "exact", stableRef: "sg:view/profile-context", version: "v1" },
  };
  const snapshotCallA = await callExport(modules.retrieval, "retrieval", "buildViewSnapshot", snapshotInput);
  const snapshotCallB = await callExport(modules.retrieval, "retrieval", "buildViewSnapshot", { ...snapshotInput, members: [...members].reverse(), heads: [...snapshotInput.heads].reverse() });
  const snapshotA = snapshotCallA.ok ? payload(snapshotCallA.value) : null;
  const snapshotB = snapshotCallB.ok ? payload(snapshotCallB.value) : null;
  if (!snapshotCallA.ok) rows.push(failFromCall("retrieval_snapshot_is_deterministic", "same inputs produce byte-identical snapshot", snapshotCallA));
  else if (!snapshotCallB.ok) rows.push(failFromCall("retrieval_snapshot_is_deterministic", "same inputs produce byte-identical snapshot", snapshotCallB));
  else rows.push(result(
    "retrieval_snapshot_is_deterministic",
    "same logical inputs produce byte-identical immutable snapshot with provenance",
    { first: snapshotA, second: snapshotB, equal: bytes(snapshotA) === bytes(snapshotB) },
    bytes(snapshotA) === bytes(snapshotB)
      && isObject(snapshotA)
      && typeof pick(snapshotA, ["versionId", "version_id", "snapshotRef", "snapshot_ref", "digest", "sha256"]) === "string"
      && Array.isArray(pick(snapshotA, ["members", "entries", "items"])),
  ));

  const contextCall = await callExport(modules.retrieval, "retrieval", "buildContextPackage", {
    budget: { tokens: 240 },
    members,
    policy: snapshotInput.policy,
    queryClass: "exact",
    query: "Which profile is editorial?",
    retriever: "retriever:fixture@v1",
    snapshot: snapshotA,
  });
  const context = contextCall.ok ? payload(contextCall.value) : null;
  rows.push(contextCall.ok
    ? result(
      "context_package_is_bounded_and_provenance_linked",
      "context package preserves snapshot/policy/member manifest and token budget",
      context,
      isObject(context)
        && isObject(pick(context, ["budget"]))
        && Number.isInteger(pick(pick(context, ["budget"]), ["tokens", "tokenBudget", "token_budget"]))
        && Array.isArray(pick(context, ["members", "entries", "items"]))
        && pick(context, ["snapshot", "snapshotRef", "snapshot_ref"]) !== undefined
        && pick(context, ["policy", "policyRef", "policy_ref"]) !== undefined,
    )
    : failFromCall("context_package_is_bounded_and_provenance_linked", "context package preserves snapshot/policy/member manifest and token budget", contextCall));
  return { rows, snapshot: snapshotA, context };
}
