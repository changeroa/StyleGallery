import { sampleStory, scrollProgress } from './timeline.mjs';

// A bounded controller for the two worked examples, not a public runtime API.
export function mountStory(root) {
  const stage = root.querySelector('[data-story-stage]');
  const panels = [...root.querySelectorAll('[data-story-panel]')];
  const toggle = root.querySelector('[data-story-toggle]');
  const meter = root.querySelector('[data-story-meter]');
  if (!stage || !panels.length || !toggle) return null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  let reading = false;
  let disposed = false;
  let frame = null;
  let dirty = true;
  let start = 0;
  let distance = 0;
  let enhanced = false;
  let initialized = false;
  let previous = -1;
  let updates = 0;
  let maxUpdateMs = 0;

  function render() {
    frame = null;
    if (disposed) return;
    const began = performance.now();
    if (dirty) {
      dirty = false;
      const offset = Number(root.dataset.storyOffset || 0);
      const height = innerHeight - offset;
      const roomy = root.clientWidth >= 900 && height >= 570;
      const fits = panels.every(panel => panel.scrollHeight <= height - 60);
      const next = !reading && !reduced.matches && roomy && fits;
      const changed = next !== enhanced;
      const priorTop = root.getBoundingClientRect().top;
      enhanced = next;
      root.dataset.storyMode = enhanced ? 'animated' : 'static';
      root.dataset.storyReason = reading ? 'reader' : reduced.matches ? 'reduced-motion' : !roomy ? 'viewport' : !fits ? 'content' : 'ready';
      root.style.setProperty('--story-offset', `${offset}px`);
      root.style.setProperty('--story-height', `${height}px`);
      distance = enhanced ? height * 2.6 : 0;
      root.style.setProperty('--story-track', `${distance + height}px`);
      toggle.hidden = false;
      toggle.setAttribute('aria-pressed', String(reading));
      toggle.textContent = reading ? 'Use scroll animation' : 'Read without animation';
      // Keep the mode control in view when collapsing a long pinned track.
      if (initialized && changed && priorTop < -60 && priorTop > -root.offsetHeight) {
        root.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
      start = root.getBoundingClientRect().top + scrollY
        + root.querySelector('.story-controls').offsetHeight - offset;
      initialized = true;
      previous = -1;
    }
    const progress = enhanced ? scrollProgress(scrollY, start, distance) : 0;
    if (previous === progress) return;
    previous = progress;
    const state = sampleStory(progress, panels.length);
    root.dataset.storyProgress = progress.toFixed(4);
    root.dataset.storyScene = String(state.active);
    panels.forEach((panel, index) => {
      const values = state.panels[index];
      if (enhanced) {
        panel.style.opacity = String(values.opacity);
        panel.style.transform = `translateY(${values.y}px) scale(${values.scale})`;
        panel.inert = state.active !== index;
        panel.setAttribute('aria-hidden', String(state.active !== index));
      } else {
        panel.style.removeProperty('opacity');
        panel.style.removeProperty('transform');
        panel.inert = false;
        panel.removeAttribute('aria-hidden');
      }
    });
    if (meter) meter.style.transform = `scaleX(${progress})`;
    root.dispatchEvent(new CustomEvent('storyprogress', { detail: { ...state, enhanced } }));
    updates += 1;
    maxUpdateMs = Math.max(maxUpdateMs, performance.now() - began);
  }
  function schedule() {
    if (!disposed && frame === null) frame = requestAnimationFrame(render);
  }
  function refresh() { dirty = true; schedule(); }
  toggle.addEventListener('click', () => { reading = !reading; refresh(); }, { signal: listeners.signal });
  window.addEventListener('scroll', schedule, { passive: true, signal: listeners.signal });
  window.addEventListener('resize', refresh, { signal: listeners.signal });
  window.addEventListener('pageshow', refresh, { signal: listeners.signal });
  document.addEventListener('visibilitychange', refresh, { signal: listeners.signal });
  document.addEventListener('load', refresh, { capture: true, signal: listeners.signal });
  reduced.addEventListener('change', refresh, { signal: listeners.signal });
  const resize = new ResizeObserver(refresh);
  resize.observe(document.body);
  panels.forEach(panel => resize.observe(panel));
  document.fonts?.ready.then(refresh);
  render();
  return {
    refresh,
    get metrics() { return { updates, maxUpdateMs, enhanced, start, distance }; },
    destroy() {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      listeners.abort();
      resize.disconnect();
      root.dataset.storyMode = 'static';
      panels.forEach(panel => {
        panel.style.removeProperty('opacity');
        panel.style.removeProperty('transform');
        panel.inert = false;
        panel.removeAttribute('aria-hidden');
      });
      toggle.hidden = true;
    },
  };
}
