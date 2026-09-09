// Example-local gesture policy: one scene per wheel burst, independent of animations.
export function createWheelGate({ threshold = 60, silence = 180 } = {}) {
  let last = -Infinity;
  let total = 0;
  let fired = false;
  return {
    reset() { last = -Infinity; total = 0; fired = false; },
    feed({ deltaY, deltaX = 0, deltaMode = 0, ctrlKey = false, metaKey = false, altKey = false, shiftKey = false, time, pageSize = 800 }) {
      if (ctrlKey || metaKey || altKey || shiftKey || !Number.isFinite(deltaY) || !Number.isFinite(time) || Math.abs(deltaX) > Math.abs(deltaY)) return 0;
      if (time - last > silence) { total = 0; fired = false; }
      last = time;
      if (fired) return 0;
      const delta = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? pageSize : 1);
      if (Math.sign(total) !== Math.sign(delta)) total = 0;
      total += delta;
      if (Math.abs(total) < threshold) return 0;
      fired = true;
      return Math.sign(total);
    },
  };
}

export function sceneIndex(hash, ids) {
  return Math.max(0, ids.indexOf(hash.replace(/^#/, '')));
}
