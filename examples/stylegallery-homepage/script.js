const navToggle = document.querySelector('.nav-toggle');
const navigation = document.querySelector('.site-navigation');

navToggle?.addEventListener('click', () => {
  const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!isOpen));
  navigation.dataset.open = String(!isOpen);
  navToggle.querySelector('.sr-only').textContent = isOpen ? '메뉴 열기' : '메뉴 닫기';
});

navigation?.addEventListener('click', (event) => {
  if (!event.target.closest('a')) return;
  navToggle?.setAttribute('aria-expanded', 'false');
  navigation.dataset.open = 'false';
});

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const originalLabel = button.textContent;

    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = 'COPIED';
    } catch {
      button.textContent = 'SELECT';
    }

    window.setTimeout(() => {
      button.textContent = originalLabel;
    }, 1600);
  });
});

const tabs = [...document.querySelectorAll('[role="tab"]')];

function selectTab(nextTab) {
  tabs.forEach((tab) => {
    const selected = tab === nextTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.querySelector(`[data-panel="${tab.dataset.tab}"]`).hidden = !selected;
  });
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    selectTab(tabs[nextIndex]);
    tabs[nextIndex].focus();
  });
});
