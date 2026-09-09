import { mountStory } from './controller.mjs';
export const controllers = [...document.querySelectorAll('[data-story]')].map(mountStory).filter(Boolean);
window.addEventListener('pagehide', event => {
  if (!event.persisted) controllers.forEach(controller => controller.destroy());
});
