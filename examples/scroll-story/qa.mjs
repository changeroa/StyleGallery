// Run only by an explicit developer action in the lab; no startup QA side effects.
export async function runStoryChecks(root, controller) {
  const rows = [];
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const check = (name, pass, detail) => rows.push({ name, pass: Boolean(pass), detail });
  const stage = root.querySelector('[data-story-stage]');
  const panels = [...root.querySelectorAll('[data-story-panel]')];
  const originalY = scrollY;
  const anchor = () => root.getBoundingClientRect().top + scrollY + root.querySelector('.story-controls').offsetHeight - Number(root.dataset.storyOffset || 0);
  const distance = () => (innerHeight - Number(root.dataset.storyOffset || 0)) * 2.6;
  if (root.dataset.storyMode !== 'animated') return { ok: false, reason: 'Run at a roomy viewport with motion enabled.' };
  for (const p of [0, .249, .251, .5, .749, .751, 1, .5, 0]) {
    scrollTo({ top: anchor() + distance() * p, behavior: 'instant' });
    await settle();
    const actual = Number(root.dataset.storyProgress);
    const offset = Number(root.dataset.storyOffset || 0);
    check(`progress ${p}`, Math.abs(actual - p) < .002, actual);
    check(`pinned ${p}`, Math.abs(stage.getBoundingClientRect().top - offset) < 2, stage.getBoundingClientRect().top);
    check(`visible ${p}`, panels.some(panel => Number(getComputedStyle(panel).opacity) >= .49));
    check(`semantic ${p}`, panels.filter(panel => panel.getAttribute('aria-hidden') === 'false').length === 1);
  }
  const before = controller.metrics.updates;
  await new Promise(resolve => setTimeout(resolve, 200));
  check('idle does not continuously render', controller.metrics.updates - before <= 1, controller.metrics.updates - before);
  const copy = panels[1].querySelector('p');
  const originalCopy = copy.textContent;
  copy.textContent = 'A long explanation must remain readable. '.repeat(160);
  controller.refresh(); await settle(); await settle();
  check('long copy chooses static reading', root.dataset.storyMode === 'static', root.dataset.storyReason);
  check('static chapters accessible', panels.every(panel => !panel.inert && !panel.hasAttribute('aria-hidden')));
  copy.textContent = originalCopy;
  controller.refresh(); await settle(); await settle();
  const originalDirection = root.dir;
  root.dir = 'rtl'; controller.refresh(); await settle();
  check('rtl contains document width', document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  root.dir = originalDirection; controller.refresh(); await settle();
  check('document width contained', document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  scrollTo({ top: originalY, behavior: 'instant' });
  await settle();
  return { ok: rows.every(row => row.pass), viewport: [innerWidth, innerHeight], userAgent: navigator.userAgent, rows, metrics: controller.metrics };
}
