// Bounded illustrative image sequence: one decode in flight, three cached frames.
export function mountSequence(root, sources) {
  const images = [...root.querySelectorAll('[data-sequence-image]')];
  if (!images.length || !sources.length) return null;
  const posters = images.map(image => image.src);
  const restore = () => images.forEach((image, index) => { if (image.src !== posters[index]) image.src = posters[index]; });
  const cache = new Map();
  const failed = new Set();
  let requested = -1;
  let busy = false;
  let disposed = false;
  let decoding = null;

  async function pump() {
    if (busy || disposed || requested < 0) return;
    busy = true;
    while (!disposed && requested >= 0) {
      const target = requested;
      if (failed.has(target)) { root.dataset.mediaState = 'fallback'; break; }
      if (!cache.has(target)) {
        root.dataset.mediaState = 'loading';
        decoding = new Image();
        decoding.src = sources[target];
        let timeout;
        try {
          await Promise.race([
            decoding.decode(),
            new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('decode timeout')), 8000); }),
          ]);
          if (disposed) break;
          cache.set(target, decoding);
          while (cache.size > 3) cache.delete(cache.keys().next().value);
        } catch {
          if (!disposed) failed.add(target);
        } finally {
          clearTimeout(timeout);
          decoding = null;
        }
      }
      if (disposed || requested < 0) break;
      if (requested !== target) continue; // Never present a stale decoded request.
      if (cache.has(target)) {
        images.forEach(image => { if (image.src !== cache.get(target).src) image.src = cache.get(target).src; });
        root.dataset.mediaFrame = String(target);
        root.dataset.mediaState = 'ready';
      } else root.dataset.mediaState = 'fallback';
      break;
    }
    busy = false;
  }
  function onProgress(event) {
    if (!event.detail.enhanced) {
      requested = -1;
      restore();
      cache.clear();
      delete root.dataset.mediaFrame;
      root.dataset.mediaState = 'poster';
      return;
    }
    requested = Math.round(event.detail.progress * (sources.length - 1));
    void pump();
  }
  root.addEventListener('storyprogress', onProgress);
  return {
    get metrics() { return { cached: cache.size, failed: failed.size, busy }; },
    destroy() {
      disposed = true;
      requested = -1;
      root.removeEventListener('storyprogress', onProgress);
      if (decoding) decoding.src = '';
      cache.clear();
      restore();
    },
  };
}
