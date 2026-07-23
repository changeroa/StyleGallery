#!/usr/bin/env node

import { appendEvent, eventHeads } from "./agent-native/events.mjs";

const cases = [];

function test(name, scenario) {
  try {
    scenario();
    cases.push({ name, ok: true });
  } catch (error) {
    cases.push({
      error: error instanceof Error ? error.message : String(error),
      name,
      ok: false,
    });
  }
}

function equal(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
}

function rejectsCycle(events, event) {
  try {
    appendEvent({ event, events });
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("cycle")) return;
    throw error;
  }
  throw new Error("expected appendEvent to reject a causal cycle");
}

test("append_rejects_two_node_cycle_completed_by_new_event", () => {
  // Given A references a parent B that is not present yet.
  const events = [{ event_id: "sg:event/a", parents: ["sg:event/b"], type: "a" }];
  // When B is appended with A as its parent.
  // Then combined-graph validation rejects the newly completed cycle.
  rejectsCycle(events, { event_id: "sg:event/b", parents: ["sg:event/a"], type: "b" });
});

test("append_rejects_long_cycle_completed_by_new_event", () => {
  // Given A -> B -> C with C unresolved.
  const events = [
    { event_id: "sg:event/a", parents: ["sg:event/b"], type: "a" },
    { event_id: "sg:event/b", parents: ["sg:event/c"], type: "b" },
  ];
  // When C is appended pointing back to A.
  // Then combined-graph validation rejects the three-node cycle.
  rejectsCycle(events, { event_id: "sg:event/c", parents: ["sg:event/a"], type: "c" });
});

test("append_allows_unresolved_parent_to_close_acyclically", () => {
  // Given a child references a future parent.
  const events = [{ event_id: "sg:event/child", parents: ["sg:event/parent"], type: "child" }];
  // When the future parent is appended as a root.
  const combined = appendEvent({
    event: { event_id: "sg:event/parent", parents: [], type: "parent" },
    events,
  });
  // Then both immutable events remain and the child is the sole head.
  equal(combined.length, 2, "event count");
  equal(eventHeads({ events: combined }).join(","), "sg:event/child", "heads");
});

test("append_of_identical_event_is_idempotent", () => {
  // Given one immutable event already exists.
  const event = { event_id: "sg:event/root", parents: [], type: "root" };
  // When the same canonical event is appended again.
  const combined = appendEvent({ event, events: [event] });
  // Then no duplicate is created.
  equal(combined.length, 1, "event count");
});

const report = {
  contract: "agent-native-causal-events",
  ok: cases.every((item) => item.ok),
  results: cases,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.ok ? 0 : 1;
