import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sampleStory, scrollProgress } from '../toss-homepage-clone/story/timeline.mjs';
import { mountSequence } from './sequence.mjs';

test('scene landmarks, overscroll and zero-distance have defined outcomes', () => {
  assert.equal(sampleStory(0).active, 0);
  assert.equal(sampleStory(0.5).active, 1);
  assert.equal(sampleStory(1).active, 2);
  assert.equal(scrollProgress(-200, 100, 500), 0);
  assert.equal(scrollProgress(900, 100, 500), 1);
  assert.equal(scrollProgress(400, 100, 0), 0);
  assert.throws(() => sampleStory(NaN), TypeError);
  assert.throws(() => sampleStory(0, 0), TypeError);
});

test('large jumps and reversal yield the same presented state without event history', () => {
  const forward = Array.from({ length: 101 }, (_, index) => sampleStory(index / 100));
  for (let i = 100; i >= 0; i--) {
    assert.deepEqual(sampleStory(i / 100), forward[i]);
    assert.ok(forward[i].panels.some(panel => panel.opacity >= 0.49), 'no blank transition');
    assert.ok(forward[i].panels.every(panel => panel.opacity >= 0 && panel.opacity <= 1));
  }
  assert.deepEqual(sampleStory(0.5), forward[50]);
});

test('late decodes never replace newer requests; failure, cache and disposal are bounded', async () => {
  const originalImage = globalThis.Image;
  const pending = new Map();
  globalThis.Image = class {
    src = '';
    decode() { return new Promise((resolve, reject) => pending.set(this.src, { resolve, reject })); }
  };
  const root = new EventTarget();
  root.dataset = {};
  const image = { src: 'poster' };
  root.querySelectorAll = () => [image];
  const sequence = mountSequence(root, ['a', 'b', 'c', 'd', 'e']);
  const progress = (value, enhanced = true) => root.dispatchEvent(new CustomEvent('storyprogress', { detail: { progress: value, enhanced } }));
  const tick = () => new Promise(resolve => setImmediate(resolve));
  try {
    progress(0);
    progress(0.5);
    pending.get('a').resolve(); await tick();
    assert.equal(image.src, 'poster', 'stale a must not be presented');
    pending.get('c').resolve(); await tick();
    assert.equal(image.src, 'c');
    progress(0.75); pending.get('d').reject(new Error('missing frame')); await tick();
    assert.equal(image.src, 'c');
    assert.equal(root.dataset.mediaState, 'fallback');
    progress(1); pending.get('e').resolve(); await tick();
    progress(0.25); pending.get('b').resolve(); await tick();
    assert.ok(sequence.metrics.cached <= 3);
    assert.equal(image.src, 'b');
    progress(0, false);
    assert.equal(image.src, 'poster');
    progress(0); sequence.destroy(); pending.get('a').resolve(); await tick();
    assert.equal(image.src, 'poster', 'disposal ignores late decode');
    assert.equal(sequence.metrics.cached, 0);
  } finally { sequence.destroy(); globalThis.Image = originalImage; }
});
