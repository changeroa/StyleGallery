import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWheelGate, sceneIndex } from './input.mjs';

test('one wheel gesture cannot skip multiple chapters; silence re-arms it', () => {
  const gate = createWheelGate();
  assert.equal(gate.feed({ deltaY: 30, time: 0 }), 0);
  assert.equal(gate.feed({ deltaY: 35, time: 20 }), 1);
  assert.equal(gate.feed({ deltaY: 900, time: 30 }), 0);
  assert.equal(gate.feed({ deltaY: -900, time: 50 }), 0);
  assert.equal(gate.feed({ deltaY: -65, time: 300 }), -1);
});
test('zoom, horizontal input, invalid values, and subthreshold noise do not navigate', () => {
  const gate = createWheelGate();
  assert.equal(gate.feed({ deltaY: 200, ctrlKey: true, time: 0 }), 0);
  assert.equal(gate.feed({ deltaY: 200, shiftKey: true, time: 0 }), 0);
  assert.equal(gate.feed({ deltaY: 100, deltaX: 200, time: 1 }), 0);
  assert.equal(gate.feed({ deltaY: NaN, time: 2 }), 0);
  assert.equal(gate.feed({ deltaY: 20, time: 3 }), 0);
  assert.equal(gate.feed({ deltaY: -20, time: 4 }), 0);
  assert.equal(gate.feed({ deltaY: -40, time: 5 }), -1);
});
test('line/page delta modes, reset and direct-entry hashes have defined semantics', () => {
  const gate = createWheelGate();
  assert.equal(gate.feed({ deltaY: 4, deltaMode: 1, time: 0 }), 1);
  gate.reset();
  assert.equal(gate.feed({ deltaY: -1, deltaMode: 2, time: 1 }), -1);
  assert.equal(sceneIndex('#b', ['a', 'b', 'c']), 1);
  assert.equal(sceneIndex('#unknown', ['a', 'b', 'c']), 0);
});
