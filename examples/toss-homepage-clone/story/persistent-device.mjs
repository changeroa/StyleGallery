// Product treatment: one device shell persists while its screen and camera change.
export function mountPersistentDevice(root) {
  const sources = [...root.querySelectorAll('[data-story-panel] .story-device')];
  if (sources.length !== 3) return null;
  const stage = root.querySelector('[data-story-stage]');
  const art = document.createElement('div');
  art.className = 'persistent-art';
  art.setAttribute('aria-hidden', 'true');
  const shell = document.createElement('div');
  shell.className = 'story-device persistent-device';
  const screens = sources.map(source => {
    const screen = document.createElement('div');
    screen.className = 'persistent-screen';
    screen.innerHTML = source.innerHTML;
    shell.append(screen);
    return screen;
  });
  art.append(shell); stage.append(art); root.dataset.persistentDevice = 'true';
  function present(event) {
    const { progress: p, panels, enhanced } = event.detail;
    if (!enhanced) { root.style.removeProperty('background-color'); root.style.removeProperty('color'); return; }
    const t = Math.max(0, (p - .5) * 2);
    const from = [237, 244, 255], to = [20, 41, 71];
    const channels = from.map((value, i) => Math.round(value + (to[i] - value) * t));
    root.style.backgroundColor = `rgb(${channels.join(',')})`;
    const luminance = channels.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
    root.style.color = luminance > .179 ? '#000' : '#fff';
    const angle = -12 + p * 18;
    const zoom = 1 + Math.sin(p * Math.PI) * .15;
    shell.style.transform = `perspective(1000px) rotateY(${angle * 1.6}deg) rotateZ(${angle}deg) scale(${zoom})`;
    screens.forEach((screen, i) => { screen.style.opacity = String(panels[i].opacity); });
  }
  root.addEventListener('storyprogress', present);
  return { destroy() { root.removeEventListener('storyprogress', present); art.remove(); delete root.dataset.persistentDevice; root.style.removeProperty('background-color'); root.style.removeProperty('color'); } };
}
