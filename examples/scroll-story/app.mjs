import { mountStory } from '../toss-homepage-clone/story/controller.mjs';
import { mountSequence } from './sequence.mjs';
const root = document.querySelector('[data-story]');
const sources = Array.from({ length: 12 }, (_, index) => new URL(`assets/headphones-${String(index).padStart(2, '0')}.svg`, import.meta.url).href);
const sequence = mountSequence(root, sources);
const story = mountStory(root);
// Inspection hook only on the developer-facing lab; no metrics in product copy.
window.storyLab = { story, sequence };
window.addEventListener('pagehide', event => {
  if (!event.persisted) { story?.destroy(); sequence?.destroy(); }
});
import { runStoryChecks } from './qa.mjs';
window.storyLab.runChecks = () => runStoryChecks(root, story);
