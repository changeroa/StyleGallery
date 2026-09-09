import { mountStory } from './controller.mjs';
import { mountPersistentDevice } from './persistent-device.mjs';
const treatments = [...document.querySelectorAll('[data-story]')].map(mountPersistentDevice).filter(Boolean);
export const controllers = [...document.querySelectorAll('[data-story]')].map(mountStory).filter(Boolean);
window.addEventListener('pagehide', event => {
  if (!event.persisted) { treatments.forEach(treatment => treatment.destroy()); controllers.forEach(controller => controller.destroy()); }
});
