// Explicit developer checks only. This run changes chapters/history and destroys
// the controller at the end; reload the example after collecting the result.
export async function runSceneChecks(root, controller) {
  if (!controller.state.deck) return { ok: false, reason: 'Run in scene mode at height >= 540.' };
  const rows = [];
  const check = (name, pass, detail) => rows.push({ name, pass: Boolean(pass), detail });
  const panels = [...root.querySelectorAll('section[data-scene]')];
  const links = [...root.querySelectorAll('[data-scene-link]')];
  const stage = root.querySelector('[data-scene-stage]');
  const art = root.querySelector('[data-swipe]');
  const device = root.querySelector('.scene-device');
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const key = (target, value, extra = {}) => {
    const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...extra });
    target.dispatchEvent(event); return event.defaultPrevented;
  };
  const wheel = (target, extra = {}) => {
    const event = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true, ...extra });
    target.dispatchEvent(event); return event.defaultPrevented;
  };
  for (const i of [0, 1, 2, 1, 0]) {
    links[i].click(); await settle();
    check(`chapter ${i} selected`, controller.state.index === i && location.hash === `#${panels[i].id}`);
    check(`chapter ${i} fixed document`, scrollY === 0 && document.documentElement.scrollHeight <= innerHeight + 1);
    check(`chapter ${i} semantics`, panels.every((panel, j) => panel.inert === (j !== i)));
    check(`chapter ${i} device identity`, root.querySelector('.scene-device') === device);
  }
  key(stage, 'End'); key(document.body, 'Home'); key(document.body, 'ArrowUp');
  check('unfocused page accepts keys and first boundary does not wrap', controller.state.index === 0);
  key(stage, 'End'); key(stage, 'ArrowDown');
  check('last boundary does not wrap', controller.state.index === 2);
  check('Tab remains native', !key(stage, 'Tab'));
  check('modifier shortcut remains native', !key(stage, 'ArrowUp', { metaKey: true }) && controller.state.index === 2);
  check('button Space remains native', !key(root.querySelector('[data-next]'), ' '));
  key(stage, 'Home');
  panels[0].querySelector('a').focus(); links[1].click();
  check('outgoing focus moves to incoming heading', document.activeElement === panels[1].querySelector('h2'));
  links[0].focus(); links[0].click();
  check('chapter control retains focus', document.activeElement === links[0]);
  dispatchEvent(new Event('resize'));
  wheel(art); wheel(art); wheel(art);
  check('wheel burst selects one chapter', controller.state.index === 1);
  check('horizontal input remains native', !wheel(art, { deltaX: 200 }));
  check('pinch and horizontal modifiers remain native', !wheel(art, { ctrlKey: true }) && !wheel(art, { shiftKey: true }));
  const copy = panels[1].querySelector('.scene-copy');
  const stress = document.createElement('p'); stress.textContent = 'Long copy remains readable. '.repeat(300); copy.append(stress);
  await settle();
  check('long copy owns real overflow', copy.scrollHeight > copy.clientHeight);
  check('copy wheel remains native', !wheel(copy) && controller.state.index === 1);
  copy.scrollTop = copy.scrollHeight;
  check('copy edge does not navigate', !wheel(copy) && controller.state.index === 1);
  check('copy keys remain native', !key(copy, 'PageDown'));
  stress.remove(); copy.scrollTop = 0;
  const input = document.createElement('input'); copy.append(input);
  check('editing keys remain native', !key(input, 'Home') && controller.state.index === 1);
  check('editing wheel remains native', !wheel(input)); input.remove();
  const pointer = (target, type, id, x, y, primary = true) => target.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', pointerId: id, isPrimary: primary, clientX: x, clientY: y, bubbles: true }));
  pointer(art, 'pointerdown', 1, 100, 200); pointer(window, 'pointercancel', 1, 100, 100); pointer(window, 'pointerup', 1, 100, 100);
  check('cancelled swipe does not navigate', controller.state.index === 1);
  pointer(art, 'pointerdown', 1, 100, 200); pointer(root.querySelector('header'), 'pointerdown', 2, 150, 200, false);
  pointer(window, 'pointerup', 1, 100, 100); pointer(window, 'pointerup', 2, 150, 100, false);
  check('second pointer outside stage cancels chapter gesture', controller.state.index === 1);
  pointer(copy, 'pointerdown', 1, 100, 200); pointer(window, 'pointerup', 1, 100, 100);
  check('swipe outside art remains native', controller.state.index === 1);
  pointer(art, 'pointerdown', 1, 100, 200); pointer(window, 'pointerup', 1, 100, 100);
  check('swipe release outside stage is handled', controller.state.index === 2);
  key(stage, 'Escape'); await settle();
  check('Escape restores ordinary reading', !controller.state.deck && !document.documentElement.classList.contains('scene-document'));
  check('reading exposes all chapters', panels.every(panel => !panel.inert && !panel.hasAttribute('aria-hidden')));
  check('Escape focuses mode control', document.activeElement === root.querySelector('[data-reading]'));
  root.querySelector('[data-reading]').click(); await settle();
  check('scene view can be restored', controller.state.deck && scrollY === 0);
  controller.destroy();
  check('teardown restores accessible document', !controller.state.deck && !document.documentElement.classList.contains('scene-document') && panels.every(panel => !panel.inert));
  const before = controller.state.index; key(stage, 'Home'); wheel(art);
  check('teardown removes input handlers', controller.state.index === before);
  return { ok: rows.every(row => row.pass), viewport: [innerWidth, innerHeight], userAgent: navigator.userAgent, rows };
}
