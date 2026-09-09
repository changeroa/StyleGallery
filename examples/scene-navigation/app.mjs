import { createWheelGate, sceneIndex } from './input.mjs';
import { runSceneChecks } from './qa.mjs';

export function mountScenes(root) {
  const panels = [...root.querySelectorAll('[data-scene]')];
  const links = [...root.querySelectorAll('[data-scene-link]')];
  const previous = root.querySelector('[data-previous]');
  const next = root.querySelector('[data-next]');
  const mode = root.querySelector('[data-reading]');
  const status = root.querySelector('[data-status]');
  const stage = root.querySelector('[data-scene-stage]');
  const ids = panels.map(panel => panel.id);
  const gate = createWheelGate();
  const listeners = new AbortController();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let index = sceneIndex(location.hash, ids);
  let reading = new URL(location.href).searchParams.get('reading') === '1';
  let deck = false;
  let touch = null;
  let disposed = false;
  const pointers = new Set();

  function render(announce = false) {
    const old = panels.find(panel => panel.contains(document.activeElement));
    panels.forEach((panel, i) => {
      panel.inert = deck && i !== index;
      if (deck) panel.setAttribute('aria-hidden', String(i !== index));
      else panel.removeAttribute('aria-hidden');
      panel.dataset.active = String(i === index);
    });
    root.dataset.scene = String(index);
    root.dataset.motion = reduced.matches ? 'reduced' : 'full';
    links.forEach((link, i) => {
      if (i === index) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    previous.setAttribute('aria-disabled', String(index === 0));
    next.setAttribute('aria-disabled', String(index === panels.length - 1));
    root.querySelector('[data-count]').textContent = `${String(index + 1).padStart(2, '0')} / ${String(panels.length).padStart(2, '0')}`;
    if (deck && old && old !== panels[index]) panels[index].querySelector('h2').focus({ preventScroll: true });
    if (announce) status.textContent = `Chapter ${index + 1} of ${panels.length}: ${panels[index].dataset.title}`;
  }
  function select(target, { historyMode = 'push', announce = true } = {}) {
    const clamped = Math.max(0, Math.min(panels.length - 1, target));
    if (clamped === index && historyMode === 'push') return;
    index = clamped;
    if (historyMode === 'push') history.pushState(history.state, '', `#${ids[index]}`);
    render(announce);
  }
  function configure() {
    if (disposed) return;
    const before = deck;
    deck = !reading && innerHeight >= 540 && innerWidth >= 320;
    root.dataset.mode = deck ? 'scenes' : 'reading';
    document.documentElement.classList.toggle('scene-document', deck);
    mode.hidden = !deck && !reading;
    mode.setAttribute('aria-pressed', String(reading));
    mode.textContent = reading ? 'Use scene view' : 'Read all chapters';
    previous.hidden = next.hidden = !deck;
    gate.reset(); touch = null; pointers.clear();
    render();
    if (before && !deck) panels[index].scrollIntoView({ block: 'start', behavior: 'instant' });
    if (!before && deck) scrollTo({ top: 0, behavior: 'instant' });
  }
  const interactive = target => target instanceof Element && Boolean(target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[data-native-input]'));
  const nativeScroll = target => {
    for (let node = target instanceof Element ? target : null; node && node !== stage; node = node.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 1) return true;
    }
    return false;
  };
  stage.addEventListener('wheel', event => {
    if (!deck || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !event.cancelable || interactive(event.target) || nativeScroll(event.target) || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    const direction = gate.feed({ deltaY: event.deltaY, deltaX: event.deltaX, deltaMode: event.deltaMode, time: performance.now(), pageSize: innerHeight });
    if (direction) select(index + direction);
  }, { passive: false, signal: listeners.signal });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && deck) { reading = true; configure(); mode.focus({ preventScroll: true }); return; }
    if (!deck || event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || interactive(event.target) || nativeScroll(event.target)) return;
    if (event.key === ' ' && event.target instanceof Element && event.target.closest('button,a')) return;
    const target = ({ ArrowDown: index + 1, ArrowUp: index - 1, PageDown: index + 1, PageUp: index - 1, Home: 0, End: panels.length - 1, ' ': index + (event.shiftKey ? -1 : 1) })[event.key];
    if (target === undefined) return;
    event.preventDefault(); select(target);
  }, { signal: listeners.signal });
  window.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return;
    pointers.add(event.pointerId);
    if (!deck || pointers.size !== 1 || !event.isPrimary || !event.target.closest('[data-swipe]')) { touch = null; return; }
    touch = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }, { signal: listeners.signal });
  window.addEventListener('pointerup', event => {
    pointers.delete(event.pointerId);
    if (!touch || touch.id !== event.pointerId) return;
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
    touch = null;
    if (deck && Math.abs(dy) > 55 && Math.abs(dy) > Math.abs(dx) * 1.2) select(index + (dy < 0 ? 1 : -1));
  }, { signal: listeners.signal });
  window.addEventListener('pointercancel', event => { pointers.delete(event.pointerId); touch = null; }, { signal: listeners.signal });
  links.forEach((link, i) => link.addEventListener('click', event => {
    if (!deck || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); select(i);
  }, { signal: listeners.signal }));
  previous.addEventListener('click', () => select(index - 1), { signal: listeners.signal });
  next.addEventListener('click', () => select(index + 1), { signal: listeners.signal });
  mode.addEventListener('click', () => { reading = !reading; configure(); }, { signal: listeners.signal });
  const restore = () => { index = sceneIndex(location.hash, ids); gate.reset(); render(true); };
  window.addEventListener('popstate', restore, { signal: listeners.signal });
  window.addEventListener('hashchange', restore, { signal: listeners.signal });
  window.addEventListener('resize', configure, { signal: listeners.signal });
  window.addEventListener('pageshow', configure, { signal: listeners.signal });
  reduced.addEventListener('change', configure, { signal: listeners.signal });
  configure();
  return {
    get state() { return { index, deck, reading }; },
    destroy() {
      disposed = true; deck = false; reading = true; touch = null;
      listeners.abort(); gate.reset(); pointers.clear();
      document.documentElement.classList.remove('scene-document');
      root.dataset.mode = 'reading';
      panels.forEach(panel => { panel.inert = false; panel.removeAttribute('aria-hidden'); });
      mode.hidden = previous.hidden = next.hidden = true;
    },
  };
}

const root = document.querySelector('[data-scene-root]');
if (root) {
  const controller = mountScenes(root);
  // Developer diagnostics; no production effects beyond this worked example.
  window.sceneDemo = { get state() { return controller.state; }, destroy: controller.destroy, runChecks: () => runSceneChecks(root, controller) };
  window.addEventListener('pagehide', event => { if (!event.persisted) controller.destroy(); });
}
